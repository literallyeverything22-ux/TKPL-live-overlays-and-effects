import type {
  BroadcastState,
  ObsStatus,
  ReplayClip,
  ThirdUmpireStatus,
} from "@/modules/core/types";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function fetchObsStatus(): Promise<ObsStatus> {
  return jsonRequest<ObsStatus>("/api/obs/status");
}

export function connectObs(url: string, password: string): Promise<ObsStatus> {
  return jsonRequest<ObsStatus>("/api/obs/connect", {
    method: "POST",
    body: JSON.stringify({ url, password }),
  });
}

export function disconnectObs(): Promise<ObsStatus> {
  return jsonRequest<ObsStatus>("/api/obs/disconnect", { method: "POST" });
}

export function autoSetupObsSources(): Promise<ObsStatus> {
  return jsonRequest<ObsStatus>("/api/obs/setup-sources", { method: "POST" });
}

export function toggleObsReplayBuffer(
  action: "start" | "stop",
): Promise<ObsStatus> {
  return jsonRequest<ObsStatus>("/api/obs/replay-buffer", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function saveReplayClip(
  label?: string,
): Promise<{ clip: ReplayClip; state: BroadcastState }> {
  return jsonRequest("/api/replays/save", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

export function saveAndPlayReplay(
  speedPercent = 50,
  label?: string,
): Promise<{ ok: boolean; clip: ReplayClip }> {
  return jsonRequest("/api/replays/save-and-play", {
    method: "POST",
    body: JSON.stringify({ speedPercent, label }),
  });
}

export function playReplayClip(params: {
  clipId?: string;
  speedPercent?: number;
  simulate?: boolean;
  label?: string;
}): Promise<{ ok: boolean; clip: ReplayClip }> {
  return jsonRequest("/api/replays/play", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function controlReplay(
  action: "pause" | "resume" | "restart" | "stop" | "speed",
  speedPercent?: number,
): Promise<BroadcastState> {
  return jsonRequest<BroadcastState>("/api/replays/control", {
    method: "POST",
    body: JSON.stringify({ action, speedPercent }),
  });
}

export function triggerStingerWipe(label?: string): Promise<BroadcastState> {
  return jsonRequest<BroadcastState>("/api/replays/stinger", {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

export function setThirdUmpireDecision(
  status: ThirdUmpireStatus,
  note = "",
): Promise<BroadcastState> {
  return jsonRequest<BroadcastState>("/api/replays/third-umpire", {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });
}

export function deleteReplayClip(clipId: string): Promise<BroadcastState> {
  return jsonRequest<BroadcastState>(
    `/api/replays/clip/${encodeURIComponent(clipId)}`,
    { method: "DELETE" },
  );
}
