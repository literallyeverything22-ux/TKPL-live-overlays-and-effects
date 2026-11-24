import { useEffect, useState } from "react";
import {
  Check,
  Clapperboard,
  Film,
  Pause,
  Play,
  Plug,
  Radio,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type {
  BroadcastState,
  ObsStatus,
  ReplayClip,
} from "@/modules/core/types";
import {
  autoSetupObsSources,
  connectObs,
  controlReplay,
  deleteReplayClip,
  disconnectObs,
  fetchObsStatus,
  playReplayClip,
  saveAndPlayReplay,
  saveReplayClip,
  setThirdUmpireDecision,
  toggleObsReplayBuffer,
  triggerStingerWipe,
} from "@/modules/replays/lib/replay-api";

interface ReplayStudioPanelProps {
  state: BroadcastState;
}

const SPEED_OPTIONS = [
  { pct: 35, label: "0.35×" },
  { pct: 50, label: "0.5×" },
  { pct: 75, label: "0.75×" },
  { pct: 100, label: "1.0×" },
];

export function ReplayStudioPanel({ state }: ReplayStudioPanelProps) {
  const replays = state.replays;
  const [obsStatus, setObsStatus] = useState<ObsStatus | null>(null);
  const [speedPct, setSpeedPct] = useState(replays?.speedPercent || 50);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(
    null,
  );

  // OBS Connect / Auto-Setup Modal
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsUrl, setObsUrl] = useState("ws://127.0.0.1:4455");
  const [obsPassword, setObsPassword] = useState("");
  const [previewClip, setPreviewClip] = useState<ReplayClip | null>(null);

  const refreshStatus = () => {
    fetchObsStatus()
      .then((s) => setObsStatus(s))
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
    const t = window.setInterval(refreshStatus, 6000);
    return () => window.clearInterval(t);
  }, []);

  const flashMsg = (tone: "ok" | "err", text: string) => {
    setFeedback({ tone, text });
    window.setTimeout(() => {
      setFeedback((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  const runAction = async (fn: () => Promise<unknown>, okText?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okText) flashMsg("ok", okText);
    } catch (err) {
      flashMsg("err", err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
      refreshStatus();
    }
  };

  const isPlaying = replays?.mode === "playing";
  const isPaused = replays?.mode === "paused";
  const isReplayActive = isPlaying || isPaused;
  const thirdUmp = replays?.thirdUmpire?.status || "idle";
  const clips = replays?.clips || [];

  return (
    <div className="bezel-shell">
      <div className="bezel-core p-4">
        {/* Header + OBS Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-hud flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-orange-300 uppercase">
            <Clapperboard size={14} /> INSTANT SLOW-MO REPLAYS
          </span>
          <button
            type="button"
            onClick={() => setObsModalOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
              obsStatus?.connected
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                : "border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
            }`}
          >
            <Plug size={12} />
            {obsStatus?.connected ? "OBS Connected" : "Connect OBS"}
          </button>
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div
            className={`mt-2.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
              feedback.tone === "ok"
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                : "border-red-400/40 bg-red-500/15 text-red-200"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Speed Selector Chips */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-hud text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            REPLAY SPEED
          </span>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map((sp) => (
              <button
                key={sp.pct}
                type="button"
                onClick={() => {
                  setSpeedPct(sp.pct);
                  if (isReplayActive) {
                    runAction(() => controlReplay("speed", sp.pct));
                  }
                }}
                className={`font-telemetry rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                  speedPct === sp.pct
                    ? "bg-[#E5B85C] text-[#08101E]"
                    : "bg-white/6 text-slate-300 hover:bg-white/12"
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE REPLAY TRANSPORT BAR OR TRIGGER BUTTONS */}
        {isReplayActive ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-[#E03340]/50 bg-[#E03340]/15 p-3">
            <div className="flex items-center justify-between">
              <span className="font-hud flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-red-200 uppercase">
                <span className="anim-pulse-dot h-2 w-2 rounded-full bg-red-400" />
                {isPaused ? "REPLAY PAUSED" : "REPLAY ON AIR"}
              </span>
              <span className="font-telemetry text-[11px] font-bold text-[#F7D58B]">
                {(speedPct / 100).toFixed(2).replace(/0$/, "")}×
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(() =>
                    controlReplay(isPaused ? "resume" : "pause"),
                  )
                }
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-xs font-extrabold text-[#08101E]"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => controlReplay("restart"))}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/20"
              >
                <RotateCcw size={13} /> Restart
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(() => controlReplay("stop"), "Wiped back to LIVE!")
                }
                className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-xs font-extrabold text-white hover:bg-red-500"
              >
                <Square size={12} fill="currentColor" /> Live
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {obsStatus?.connected ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction(
                      () => saveAndPlayReplay(speedPct),
                      `Saved & playing at ${(speedPct / 100).toFixed(2).replace(/0$/, "")}×!`,
                    )
                  }
                  className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E03340] via-[#F24B3E] to-[#E5B85C] px-3 py-3 text-xs font-extrabold text-white shadow-[0_8px_24px_rgba(224,51,64,0.35)] transition-all hover:brightness-110 disabled:opacity-45"
                >
                  <Play size={14} fill="currentColor" />
                  SAVE &amp; PLAY {(speedPct / 100).toFixed(2).replace(/0$/, "")}×
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction(
                      () => saveReplayClip(),
                      "Saved clip to Highlights Shelf!",
                    )
                  }
                  title="Save last 12s to Highlights without interrupting live video"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-2.5 py-3 text-xs font-bold text-slate-200 hover:bg-white/15 disabled:opacity-45"
                >
                  <Save size={13} /> Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(
                    () => playReplayClip({ speedPercent: speedPct, simulate: true }),
                    "Playing Stinger + Slow-Mo Replay preview!",
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E03340] via-[#F24B3E] to-[#E5B85C] px-4 py-3 text-xs font-extrabold text-white shadow-[0_8px_24px_rgba(224,51,64,0.32)] transition-all hover:brightness-110"
              >
                <Sparkles size={14} /> TEST STINGER + REPLAY PREVIEW
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(() => triggerStingerWipe("TKPL 2026 REPLAY"))
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5B85C]/35 bg-[#E5B85C]/12 py-2 text-xs font-extrabold text-[#F7D58B] hover:bg-[#E5B85C]/22"
            >
              <Wand2 size={13} /> Fire TKPL Stinger Wipe Transition
            </button>
          </div>
        )}

        {/* THIRD UMPIRE DECISION STRIP */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-hud flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-amber-300 uppercase">
              <ShieldAlert size={13} /> THIRD UMPIRE REVIEW
            </span>
            {thirdUmp !== "idle" && (
              <button
                type="button"
                onClick={() =>
                  runAction(() => setThirdUmpireDecision("idle"))
                }
                className="text-[10px] font-bold text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() =>
                runAction(() =>
                  setThirdUmpireDecision(
                    thirdUmp === "pending" ? "idle" : "pending",
                  ),
                )
              }
              className={`font-hud rounded-xl border py-2 text-[11px] font-extrabold uppercase transition-all ${
                thirdUmp === "pending"
                  ? "border-amber-300 bg-amber-400 text-[#08101E]"
                  : "border-amber-400/30 bg-amber-500/12 text-amber-200 hover:bg-amber-500/22"
              }`}
            >
              PENDING
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(() =>
                  setThirdUmpireDecision(thirdUmp === "out" ? "idle" : "out"),
                )
              }
              className={`font-hud rounded-xl border py-2 text-[11px] font-extrabold uppercase transition-all ${
                thirdUmp === "out"
                  ? "border-red-300 bg-red-600 text-white"
                  : "border-red-400/35 bg-red-500/15 text-red-200 hover:bg-red-500/30"
              }`}
            >
              OUT
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(() =>
                  setThirdUmpireDecision(
                    thirdUmp === "not-out" ? "idle" : "not-out",
                  ),
                )
              }
              className={`font-hud rounded-xl border py-2 text-[11px] font-extrabold uppercase transition-all ${
                thirdUmp === "not-out"
                  ? "border-emerald-300 bg-emerald-500 text-[#04140B]"
                  : "border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/30"
              }`}
            >
              NOT OUT
            </button>
          </div>
        </div>

        {/* SAVED MATCH HIGHLIGHTS SHELF */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-hud flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-slate-300 uppercase">
              <Film size={13} /> SAVED HIGHLIGHTS ({clips.length})
            </span>
          </div>

          {clips.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11px] text-slate-400">
              Saved OBS replay clips appear here automatically with the exact ball
              label (e.g. <em>92m SIX · Ov 4.3</em>) so you can replay them anytime!
            </p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold text-white">
                      {clip.title}
                    </div>
                    <div className="truncate text-[10px] text-slate-400">
                      {clip.subtitle}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title="Play on Live Stream in Slow Motion"
                      onClick={() =>
                        runAction(
                          () =>
                            playReplayClip({
                              clipId: clip.id,
                              speedPercent: speedPct,
                            }),
                          `Playing "${clip.title}" on air!`,
                        )
                      }
                      className="rounded-lg bg-[#E5B85C] px-2.5 py-1.5 text-[10px] font-extrabold text-[#08101E] hover:brightness-110"
                    >
                      Play
                    </button>
                    {clip.filePath && (
                      <button
                        type="button"
                        title="Preview clip locally"
                        onClick={() => setPreviewClip(clip)}
                        className="rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-white/12"
                      >
                        View
                      </button>
                    )}
                    <button
                      type="button"
                      title="Remove from list"
                      onClick={() => runAction(() => deleteReplayClip(clip.id))}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 30-SECOND OBS STUDIO REPLAY CONNECTION & AUTO-SETUP MODAL */}
      {obsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-xl">
            <div className="bezel-core p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-orange-300 uppercase">
                    BUILT-IN OBS REMOTE CONTROL (ZERO PLUGINS NEEDED)
                  </span>
                  <h3 className="font-display text-3xl font-extrabold text-white">
                    CONNECT OBS FOR 1-CLICK REPLAYS
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setObsModalOpen(false)}
                  className="rounded-full bg-white/10 p-1.5 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Simple 2-Step OBS Prep */}
                <div className="rounded-2xl border border-white/10 bg-[#07111F] p-4 space-y-2 text-slate-300">
                  <div className="font-hud text-xs font-extrabold tracking-wider text-[#F7D58B] uppercase">
                    30-SECOND ONE-TIME SETUP INSIDE OBS STUDIO:
                  </div>
                  <p>
                    <strong className="text-white">Step A (Dashcam Buffer):</strong>{" "}
                    In OBS → <strong>Settings → Output</strong> → check{" "}
                    <strong>Enable Replay Buffer</strong> → set{" "}
                    <strong>Maximum Replay Time</strong> to{" "}
                    <strong className="text-[#F7D58B]">12 seconds</strong> → OK.
                  </p>
                  <p>
                    <strong className="text-white">Step B (Remote Control):</strong>{" "}
                    In OBS → <strong>Tools → WebSocket Server Settings</strong> →
                    check <strong>Enable WebSocket server</strong> (port{" "}
                    <code>4455</code>). Copy the password (or uncheck{" "}
                    <em>Enable Authentication</em> for local Wi-Fi use).
                  </p>
                </div>

                {/* Connection Form */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="font-hud block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      OBS WebSocket URL
                    </label>
                    <input
                      type="text"
                      value={obsUrl}
                      onChange={(e) => setObsUrl(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white"
                      placeholder="ws://127.0.0.1:4455"
                    />
                  </div>
                  <div>
                    <label className="font-hud block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      OBS Password (If Enabled)
                    </label>
                    <input
                      type="password"
                      value={obsPassword}
                      onChange={(e) => setObsPassword(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white"
                      placeholder="Leave blank if Auth disabled"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!obsStatus?.connected ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => connectObs(obsUrl, obsPassword),
                          "Connected to OBS Studio!",
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#E5B85C] px-5 py-2.5 text-xs font-extrabold text-[#08101E]"
                    >
                      <Plug size={14} /> Connect to OBS Studio
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            () => autoSetupObsSources(),
                            "Created TKPL Replay Video & TKPL Match Overlay in OBS!",
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs font-extrabold text-[#04140B]"
                      >
                        <Wand2 size={14} /> 1-Click Auto-Setup OBS Sources
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          runAction(() =>
                            toggleObsReplayBuffer(
                              obsStatus.replayBufferActive ? "stop" : "start",
                            ),
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2.5 text-xs font-bold text-sky-200"
                      >
                        <Radio size={13} />
                        {obsStatus.replayBufferActive
                          ? "Stop Replay Buffer"
                          : "Start Replay Buffer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(() => disconnectObs())}
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>

                {/* Live Diagnostics */}
                {obsStatus && (
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Connection:</span>
                      <span
                        className={
                          obsStatus.connected
                            ? "font-bold text-emerald-300"
                            : "font-bold text-amber-300"
                        }
                      >
                        {obsStatus.connected
                          ? `Connected (Scene: ${obsStatus.currentScene || "Active"})`
                          : "Not Connected"}
                      </span>
                    </div>
                    {obsStatus.connected && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Replay Buffer:</span>
                          <span
                            className={
                              obsStatus.replayBufferActive
                                ? "font-bold text-emerald-300"
                                : "font-bold text-amber-300"
                            }
                          >
                            {obsStatus.replayBufferActive
                              ? "RUNNING (Ready to Save Clips!)"
                              : "Stopped — click Start Replay Buffer"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">
                            OBS Sources ({obsStatus.replayInputName} &amp;{" "}
                            {obsStatus.overlayInputName}):
                          </span>
                          <span className="font-bold text-slate-200">
                            {obsStatus.hasReplaySource && obsStatus.hasOverlaySource ? (
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <Check size={12} /> Ready!
                              </span>
                            ) : (
                              "Click 1-Click Auto-Setup above"
                            )}
                          </span>
                        </div>
                      </>
                    )}
                    {obsStatus.lastError && (
                      <div className="pt-1 text-red-300">{obsStatus.lastError}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOCAL CLIP PREVIEW MODAL */}
      {previewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-2xl">
            <div className="bezel-core p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-display text-2xl font-extrabold text-white">
                    {previewClip.title}
                  </div>
                  <div className="text-xs text-slate-400">
                    {previewClip.subtitle} · {previewClip.fileName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewClip(null)}
                  className="rounded-full bg-white/10 p-1.5 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
              <video
                src={`/api/replays/video/${encodeURIComponent(previewClip.id)}`}
                controls
                autoPlay
                className="aspect-video w-full rounded-xl bg-black"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
