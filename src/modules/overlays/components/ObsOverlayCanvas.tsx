import { useEffect, useMemo, useState } from "react";
import type { BroadcastState } from "@/modules/core/types";
import { subscribeBroadcastState } from "@/modules/core/realtime";
import { computeInningsSummary } from "@/modules/scoring/lib/cricket-engine";
import { computeTournamentStats } from "@/modules/tournament/lib/stats-engine";
import { TopCornerBug } from "@/modules/overlays/components/TopCornerBug";
import { ProScorebar } from "@/modules/overlays/components/ProScorebar";
import { MatchGraphicsDeck } from "@/modules/overlays/components/MatchGraphicsDeck";
import { BroadcastEffectsLayer } from "@/modules/effects/components/BroadcastEffectsLayer";
import { StingerWipeOverlay } from "@/modules/replays/components/StingerWipeOverlay";
import { ReplayBroadcastHud } from "@/modules/replays/components/ReplayBroadcastHud";
import { ThirdUmpireOverlay } from "@/modules/replays/components/ThirdUmpireOverlay";

type BgMode = "transparent" | "green" | "preview";

export function ObsOverlayCanvas() {
  const params = new URLSearchParams(window.location.search);
  const rawBg = (params.get("bg") || "transparent").toLowerCase();
  const bgMode: BgMode =
    rawBg === "green" || rawBg === "chroma"
      ? "green"
      : rawBg === "preview"
        ? "preview"
        : "transparent";
  const hideBugParam = params.get("bug") === "0";
  const forceSoundParam = params.get("sfx") === "1";

  const [state, setState] = useState<BroadcastState | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    document.documentElement.dataset.overlayMode = bgMode;
    return () => {
      delete document.documentElement.dataset.overlayMode;
    };
  }, [bgMode]);

  useEffect(() => {
    const updateScale = () => {
      const sx = window.innerWidth / 1920;
      const sy = window.innerHeight / 1080;
      setScale(Math.min(sx, sy));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    return subscribeBroadcastState(setState);
  }, []);

  const activeMatch = useMemo(() => {
    if (!state) return null;
    return (
      state.matches.find((m) => m.id === state.activeMatchId) ||
      state.matches[state.matches.length - 1] ||
      null
    );
  }, [state]);

  const activeInnings = activeMatch
    ? activeMatch.innings[activeMatch.currentInningsIndex]
    : null;

  const activeSummary = useMemo(() => {
    if (!state || !activeMatch || !activeInnings) return null;
    return computeInningsSummary(
      activeInnings,
      activeMatch.oversPerInnings,
      activeMatch.powerplayOvers,
      state.teams,
    );
  }, [state, activeMatch, activeInnings]);

  const report = useMemo(() => {
    if (!state) return null;
    return computeTournamentStats(state.teams, state.matches);
  }, [state]);

  const battingTeam = state?.teams.find(
    (t) => t.id === activeInnings?.battingTeamId,
  );
  const bowlingTeam = state?.teams.find(
    (t) => t.id === activeInnings?.bowlingTeamId,
  );

  const isReplayActive = Boolean(
    state?.replays && state.replays.mode !== "idle",
  );
  const soundOn = Boolean(state?.overlay.soundEnabled || forceSoundParam);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden">
      {bgMode === "preview" && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 20%, rgba(28,82,56,0.52) 0%, rgba(11,30,43,0.92) 55%, #040913 100%)",
          }}
        >
          <div className="absolute top-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/15 bg-black/65 px-4 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md">
            BROWSER PREVIEW MODE · In OBS Studio use{" "}
            <code className="text-emerald-300">http://127.0.0.1:4280/overlay</code>{" "}
            (1920×1080 Transparent)
          </div>
        </div>
      )}

      <div
        className="relative h-[1080px] w-[1920px] shrink-0 overflow-hidden"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {state && report && (
          <>
            {/* Normal Live Broadcast Layers (yield cleanly during active Instant Replay) */}
            {!isReplayActive && (
              <>
                <TopCornerBug
                  showBug={state.overlay.showCornerBug && !hideBugParam}
                  showTournamentSixes={state.overlay.showTournamentSixesCounter}
                  tournamentName={state.tournamentName}
                  match={activeMatch}
                  summary={activeSummary}
                  report={report}
                />

                <MatchGraphicsDeck
                  state={state}
                  match={activeMatch}
                  activeSummary={activeSummary}
                  report={report}
                />

                <BroadcastEffectsLayer
                  effect={state.overlay.activeEffect}
                  teams={state.teams}
                  match={activeMatch}
                  soundEnabled={soundOn}
                />

                {state.overlay.showScorebar &&
                  activeMatch &&
                  activeSummary &&
                  battingTeam &&
                  bowlingTeam && (
                    <ProScorebar
                      match={activeMatch}
                      summary={activeSummary}
                      battingTeam={battingTeam}
                      bowlingTeam={bowlingTeam}
                      overlay={state.overlay}
                    />
                  )}
              </>
            )}

            {/* Instant Slow-Motion Replay HUD Layer */}
            {state.replays && isReplayActive && (
              <ReplayBroadcastHud
                replays={state.replays}
                teams={state.teams}
                match={activeMatch}
                summary={activeSummary}
                battingTeam={battingTeam}
                isPreviewBg={bgMode === "preview"}
              />
            )}

            {/* Third Umpire Review Layer (works over Live OR paused Replay!) */}
            {state.replays?.thirdUmpire && (
              <ThirdUmpireOverlay
                thirdUmpire={state.replays.thirdUmpire}
                soundEnabled={soundOn}
              />
            )}

            {/* Full-Screen TKPL Stinger Wipe Transition (ALWAYS Topmost Z-50) */}
            <StingerWipeOverlay
              stinger={state.replays?.stinger || null}
              soundEnabled={soundOn}
            />

            {/* Standby Helper Card ONLY in ?bg=preview when no match exists */}
            {bgMode === "preview" && !activeMatch && !isReplayActive && (
              <div className="absolute top-1/2 left-1/2 w-[780px] -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="broadcast-bezel !rounded-3xl">
                  <div className="broadcast-surface !rounded-[22px] p-10">
                    <h2 className="font-display text-5xl font-extrabold text-[#F7D58B]">
                      TKPL 2026 OVERLAY CONNECTED &amp; READY
                    </h2>
                    <p className="mt-3 text-lg text-slate-300">
                      Start a new match (or click <strong>Load Demo Match</strong>) in
                      the Scorer Studio tab — your live scorebar, 4s/6s counters, Six
                      Distance Meter, and Instant Replays will appear right here!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
