import type {
  BroadcastEffectTrigger,
  BroadcastState,
  NetworkInfo,
} from "@/modules/core/types";

export const BROADCAST_CHANNEL_NAME = "tkpl-2026-match-broadcast-v1";

export async function fetchBroadcastState(): Promise<BroadcastState> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch state (${res.status})`);
  return (await res.json()) as BroadcastState;
}

export async function saveBroadcastState(
  state: BroadcastState,
): Promise<BroadcastState> {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`Failed to save state (${res.status})`);
  const saved = (await res.json()) as BroadcastState;
  try {
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      ch.postMessage({ type: "state", state: saved });
      ch.close();
    }
  } catch {
    // ignore BroadcastChannel failures in restricted contexts
  }
  return saved;
}

export async function triggerOneShotEffect(
  effect: Omit<BroadcastEffectTrigger, "id" | "triggeredAt">,
): Promise<BroadcastState> {
  const res = await fetch("/api/effect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(effect),
  });
  if (!res.ok) throw new Error(`Failed to trigger effect (${res.status})`);
  return (await res.json()) as BroadcastState;
}

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
  const res = await fetch("/api/network", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load network info (${res.status})`);
  return (await res.json()) as NetworkInfo;
}

export async function createServerBackup(): Promise<{ fileName: string }> {
  const res = await fetch("/api/backup", { method: "POST" });
  if (!res.ok) throw new Error(`Backup failed (${res.status})`);
  return (await res.json()) as { fileName: string };
}

export function subscribeBroadcastState(
  onUpdate: (state: BroadcastState) => void,
): () => void {
  let closed = false;
  let es: EventSource | null = null;
  let reconnectTimer: number | null = null;
  let lastRevision = -1;

  const deliver = (next: BroadcastState) => {
    if (closed) return;
    if (typeof next.revision === "number" && next.revision >= lastRevision) {
      lastRevision = next.revision;
      onUpdate(next);
    }
  };

  const connect = () => {
    if (closed) return;
    fetchBroadcastState()
      .then((initial) => {
        deliver(initial);
        if (closed) return;
        es = new EventSource("/api/stream");
        es.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data) as BroadcastState;
            deliver(parsed);
          } catch {
            // ignore malformed frame
          }
        };
        es.onerror = () => {
          if (closed) return;
          es?.close();
          es = null;
          reconnectTimer = window.setTimeout(connect, 1800);
        };
      })
      .catch(() => {
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 2200);
        }
      });
  };

  connect();

  // Instant same-PC cross-tab acceleration
  let bc: BroadcastChannel | null = null;
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (evt) => {
        if (evt.data?.type === "state" && evt.data.state) {
          deliver(evt.data.state as BroadcastState);
        }
      };
    } catch {
      bc = null;
    }
  }

  // Gentle fallback poll in case SSE drops on flaky ground Wi-Fi
  const poll = window.setInterval(() => {
    if (!closed && (!es || es.readyState !== EventSource.OPEN)) {
      fetchBroadcastState().then(deliver).catch(() => {});
    }
  }, 3500);

  return () => {
    closed = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    window.clearInterval(poll);
    es?.close();
    bc?.close();
  };
}
