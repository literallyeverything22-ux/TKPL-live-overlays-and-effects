import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Eye,
  Flame,
  Layers,
  ListOrdered,
  QrCode,
  Sparkles,
  Trophy,
  Tv,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import type {
  BroadcastEffectTrigger,
  BroadcastState,
  MatchState,
  NetworkInfo,
  OverlayActiveCard,
} from "@/modules/core/types";
import { fetchNetworkInfo } from "@/modules/core/realtime";
import { ReplayStudioPanel } from "@/modules/replays/components/ReplayStudioPanel";

interface BroadcastDirectorProps {
  state: BroadcastState;
  activeMatch: MatchState | null;
  onPatchOverlay: (patch: Partial<BroadcastState["overlay"]>) => void;
  onTriggerEffect: (effect: Omit<BroadcastEffectTrigger, "id" | "triggeredAt">) => void;
}

export function BroadcastDirector({
  state,
  activeMatch,
  onPatchOverlay,
  onTriggerEffect,
}: BroadcastDirectorProps) {
  const { overlay, teams } = state;
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [netInfo, setNetInfo] = useState<NetworkInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState("");
  const [customAlertInput, setCustomAlertInput] = useState(
    overlay.customTickerAlert || "",
  );

  useEffect(() => {
    if (!obsModalOpen) return;
    fetchNetworkInfo()
      .then((info) => {
        setNetInfo(info);
        const target = info.scorerUrls[0] || info.localhostUrl;
        QRCode.toDataURL(target, {
          width: 220,
          margin: 1,
          color: { dark: "#071120", light: "#FFFFFF" },
        })
          .then(setQrDataUrl)
          .catch(() => {});
      })
      .catch(() => {});
  }, [obsModalOpen]);

  const copyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1800);
  };

  const teamA = teams.find((t) => t.id === activeMatch?.teamAId);
  const teamB = teams.find((t) => t.id === activeMatch?.teamBId);

  const setCard = (
    card: OverlayActiveCard,
    extra?: Partial<BroadcastState["overlay"]>,
  ) => {
    onPatchOverlay({
      activeCard: overlay.activeCard === card && !extra ? "none" : card,
      ...extra,
    });
  };

  const toggleFlags: {
    key: keyof BroadcastState["overlay"];
    label: string;
  }[] = [
    { key: "showScorebar", label: "Bottom Pro Scorebar" },
    { key: "showCornerBug", label: "Top-Left TKPL Logo Bug" },
    { key: "showSponsorTicker", label: "Sponsor & Stats Ticker" },
    { key: "showWinPredictor", label: "2nd Inn Win Predictor" },
    { key: "showTournamentSixesCounter", label: "Tournament 6s Counter" },
  ];

  return (
    <div className="space-y-4">
      {/* LIVE OBS LAUNCH & PREVIEW DOCK */}
      <div className="bezel-shell">
        <div className="bezel-core p-4">
          <div className="flex items-center justify-between">
            <span className="font-hud flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
              <Tv size={14} /> OBS BROADCAST DIRECTOR
            </span>
            <button
              type="button"
              onClick={() =>
                onPatchOverlay({ soundEnabled: !overlay.soundEnabled })
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
                overlay.soundEnabled
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                  : "border-white/15 bg-white/5 text-slate-400"
              }`}
            >
              {overlay.soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {overlay.soundEnabled ? "Sound FX ON" : "Sound FX OFF"}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href="/overlay?bg=preview"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5B85C] to-[#F7D58B] px-3 py-2.5 text-xs font-extrabold text-[#08101E] transition-all hover:brightness-105"
            >
              <Eye size={14} /> Live Preview Tab
            </a>
            <button
              type="button"
              onClick={() => setObsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500/25"
            >
              <QrCode size={14} /> OBS URL &amp; Phone QR
            </button>
          </div>

          {/* Visibility Switches */}
          <div className="mt-4 space-y-1.5">
            {toggleFlags.map((flag) => {
              const isOn = Boolean(overlay[flag.key]);
              return (
                <button
                  key={flag.key}
                  type="button"
                  onClick={() => onPatchOverlay({ [flag.key]: !isOn })}
                  className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-white/[0.06]"
                >
                  <span>{flag.label}</span>
                  <span
                    className={`font-hud rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      isOn
                        ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {isOn ? "ON" : "OFF"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* INSTANT SLOW-MO REPLAYS, STINGER WIPE & THIRD UMPIRE */}
      <ReplayStudioPanel state={state} />

      {/* 1-CLICK TV GRAPHICS CARDS */}
      <div className="bezel-shell">
        <div className="bezel-core p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-hud flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-sky-300 uppercase">
              <Layers size={14} /> TV GRAPHICS DECK
            </span>
            {overlay.activeCard !== "none" && (
              <button
                type="button"
                onClick={() => onPatchOverlay({ activeCard: "none" })}
                className="rounded-full bg-red-500/20 px-3 py-1 text-[10px] font-extrabold text-red-300 border border-red-400/40 hover:bg-red-500/35"
              >
                HIDE POPUP CARD
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCard("vs-banner")}
              disabled={!activeMatch}
              className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all disabled:opacity-35 ${
                overlay.activeCard === "vs-banner"
                  ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              Match Intro (VS)
            </button>

            <button
              type="button"
              onClick={() => setCard("over-graph")}
              disabled={!activeMatch}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all disabled:opacity-35 ${
                overlay.activeCard === "over-graph"
                  ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              <BarChart3 size={13} /> Over Graph
            </button>

            {teamA && (
              <button
                type="button"
                onClick={() =>
                  onPatchOverlay({
                    activeCard:
                      overlay.activeCard === "playing-xi" &&
                      overlay.cardTeamId === teamA.id
                        ? "none"
                        : "playing-xi",
                    cardTeamId: teamA.id,
                  })
                }
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                  overlay.activeCard === "playing-xi" &&
                  overlay.cardTeamId === teamA.id
                    ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
                }`}
              >
                <Users size={13} /> {teamA.shortName} XI
              </button>
            )}

            {teamB && (
              <button
                type="button"
                onClick={() =>
                  onPatchOverlay({
                    activeCard:
                      overlay.activeCard === "playing-xi" &&
                      overlay.cardTeamId === teamB.id
                        ? "none"
                        : "playing-xi",
                    cardTeamId: teamB.id,
                  })
                }
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                  overlay.activeCard === "playing-xi" &&
                  overlay.cardTeamId === teamB.id
                    ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
                }`}
              >
                <Users size={13} /> {teamB.shortName} XI
              </button>
            )}

            <button
              type="button"
              disabled={!activeMatch?.innings[0]}
              onClick={() =>
                onPatchOverlay({
                  activeCard:
                    overlay.activeCard === "scorecard" &&
                    (overlay.cardInningsIndex ?? 0) === 0
                      ? "none"
                      : "scorecard",
                  cardInningsIndex: 0,
                })
              }
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all disabled:opacity-35 ${
                overlay.activeCard === "scorecard" &&
                (overlay.cardInningsIndex ?? 0) === 0
                  ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              <ListOrdered size={13} /> 1st Inn Card
            </button>

            <button
              type="button"
              disabled={!activeMatch?.innings[1]}
              onClick={() =>
                onPatchOverlay({
                  activeCard:
                    overlay.activeCard === "scorecard" &&
                    overlay.cardInningsIndex === 1
                      ? "none"
                      : "scorecard",
                  cardInningsIndex: 1,
                })
              }
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all disabled:opacity-35 ${
                overlay.activeCard === "scorecard" &&
                overlay.cardInningsIndex === 1
                  ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              <ListOrdered size={13} /> 2nd Inn Card
            </button>

            <button
              type="button"
              onClick={() => setCard("points-table")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                overlay.activeCard === "points-table"
                  ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              <Trophy size={13} /> Points Table
            </button>

            <button
              type="button"
              onClick={() => setCard("tournament-leaders")}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                overlay.activeCard === "tournament-leaders"
                  ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                  : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              <Flame size={13} /> Most 6s / 4s
            </button>
          </div>
        </div>
      </div>

      {/* MANUAL EFFECTS TRIGGER & REPLAY PAD */}
      <div className="bezel-shell">
        <div className="bezel-core p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-hud flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-red-300 uppercase">
              <Sparkles size={14} /> LIVE FX TEST / REPLAY PAD
            </span>
            <button
              type="button"
              onClick={() => onPatchOverlay({ activeEffect: null })}
              className="text-[11px] font-bold text-slate-400 hover:text-white"
            >
              Clear FX
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onTriggerEffect({
                  type: "four",
                  title: "CRACKING FOUR!",
                  subtitle: "TKPL BOUNDARY",
                  badge: "GLORIOUS SHOT",
                  teamId: activeMatch?.innings[activeMatch.currentInningsIndex]?.battingTeamId,
                  durationMs: 4200,
                })
              }
              className="rounded-xl border border-[#E5B85C]/40 bg-[#E5B85C]/15 py-2 text-xs font-extrabold text-[#F7D58B] hover:bg-[#E5B85C]/25"
            >
              Trigger FOUR
            </button>
            <button
              type="button"
              onClick={() =>
                onTriggerEffect({
                  type: "six",
                  title: "MAXIMUM SIX!",
                  subtitle: "MONSTER HIT!",
                  badge: "TKPL SIX TRACKER",
                  meters: 88,
                  zoneLabel: "DEEP MID-WICKET",
                  shotAngleDeg: 68,
                  teamId: activeMatch?.innings[activeMatch.currentInningsIndex]?.battingTeamId,
                  durationMs: 5800,
                })
              }
              className="rounded-xl border border-red-400/50 bg-red-600/25 py-2 text-xs font-extrabold text-red-200 hover:bg-red-600/40"
            >
              Trigger 6 (88m)
            </button>
            <button
              type="button"
              onClick={() =>
                onTriggerEffect({
                  type: "wicket",
                  title: "WICKET!",
                  subtitle: "BIG BREAKTHROUGH",
                  badge: "OUT!",
                  teamId: activeMatch?.innings[activeMatch.currentInningsIndex]?.battingTeamId,
                  durationMs: 5200,
                })
              }
              className="rounded-xl border border-rose-400/40 bg-rose-500/15 py-2 text-xs font-extrabold text-rose-200 hover:bg-rose-500/25"
            >
              Trigger WICKET
            </button>
            <button
              type="button"
              onClick={() =>
                onTriggerEffect({
                  type: "free-hit",
                  title: "FREE HIT!",
                  subtitle: "NEXT DELIVERY IS A FREE HIT",
                  badge: "NO BALL",
                  durationMs: 3800,
                })
              }
              className="rounded-xl border border-sky-400/40 bg-sky-500/15 py-2 text-xs font-extrabold text-sky-200 hover:bg-sky-500/25"
            >
              Trigger FREE HIT
            </button>
          </div>

          {/* Instant Breaking Ticker Message */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={customAlertInput}
              onChange={(e) => setCustomAlertInput(e.target.value)}
              placeholder="Custom ticker message (e.g. Drinks Break / Sponsor)"
              className="flex-1 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() =>
                onPatchOverlay({
                  customTickerAlert: customAlertInput.trim() || undefined,
                })
              }
              className="rounded-xl bg-white/12 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              Set
            </button>
          </div>
        </div>
      </div>

      {/* OBS & PHONE WI-FI QR MODAL */}
      {obsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-xl">
            <div className="bezel-core p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                    YOUTUBE LIVE / OBS STUDIO SETUP
                  </span>
                  <h3 className="font-display text-3xl font-extrabold text-white">
                    CONNECT OBS &amp; PHONE SCORER
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

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-[#E5B85C]/30 bg-[#07111F] p-4">
                  <div className="font-hud text-xs font-bold tracking-wider text-[#F7D58B] uppercase">
                    1. OBS Studio Browser Source (1920 × 1080 Transparent)
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    In OBS Studio → Sources → <strong>+</strong> → <strong>Browser</strong> → paste this link with Width <strong>1920</strong>, Height <strong>1080</strong>, and place it <strong>ABOVE</strong> your Camera:
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-emerald-300">
                      {netInfo?.overlayUrl || "http://127.0.0.1:4280/overlay"}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          "obs",
                          netInfo?.overlayUrl || "http://127.0.0.1:4280/overlay",
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5B85C] px-3.5 py-2 text-xs font-extrabold text-[#08101E]"
                    >
                      {copiedKey === "obs" ? <Check size={14} /> : <Copy size={14} />}
                      {copiedKey === "obs" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-sky-400/25 bg-[#07111F] p-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <div className="font-hud text-xs font-bold tracking-wider text-sky-300 uppercase">
                      2. Score From Your Phone / Tablet (Same Wi-Fi)
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Connect your phone to the same Wi-Fi/hotspot as this streaming laptop and scan the QR code to score right from the boundary rope!
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-sky-300">
                        {netInfo?.scorerUrls[0] || "http://127.0.0.1:4280/scorer"}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            "phone",
                            netInfo?.scorerUrls[0] || "http://127.0.0.1:4280/scorer",
                          )
                        }
                        className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-xs font-bold text-sky-200"
                      >
                        {copiedKey === "phone" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Green-screen fallback URL:{" "}
                      <span className="text-emerald-400">
                        {netInfo?.greenOverlayUrl || "http://127.0.0.1:4280/overlay?bg=green"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="Phone Scorer QR Code"
                        className="h-32 w-32 rounded-xl border-4 border-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
