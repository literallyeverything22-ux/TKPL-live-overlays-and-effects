import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  BroadcastEffectTrigger,
  MatchState,
  Team,
} from "@/modules/core/types";
import { findPlayerInTeams } from "@/modules/scoring/lib/cricket-engine";
import { playBroadcastSfx } from "@/modules/core/sound-fx";
import {
  PlayerAvatar,
  TeamCrest,
} from "@/modules/core/components/BrandMedia";
import { SixDistanceMeter } from "@/modules/effects/components/SixDistanceMeter";

interface BroadcastEffectsLayerProps {
  effect: BroadcastEffectTrigger | null;
  teams: Team[];
  match: MatchState | null;
  soundEnabled: boolean;
}

const SPARKS = [
  { id: 1, tx: "-320px", ty: "-140px", rot: "-140deg", delay: "40ms", color: "#F7D58B" },
  { id: 2, tx: "-220px", ty: "-190px", rot: "160deg", delay: "70ms", color: "#E03340" },
  { id: 3, tx: "-110px", ty: "-210px", rot: "-110deg", delay: "50ms", color: "#FFFFFF" },
  { id: 4, tx: "15px", ty: "-220px", rot: "190deg", delay: "85ms", color: "#F7D58B" },
  { id: 5, tx: "125px", ty: "-195px", rot: "-170deg", delay: "60ms", color: "#E03340" },
  { id: 6, tx: "245px", ty: "-165px", rot: "145deg", delay: "95ms", color: "#F7D58B" },
  { id: 7, tx: "330px", ty: "-110px", rot: "-185deg", delay: "110ms", color: "#FFFFFF" },
  { id: 8, tx: "-350px", ty: "-45px", rot: "130deg", delay: "100ms", color: "#E03340" },
  { id: 9, tx: "355px", ty: "-35px", rot: "-150deg", delay: "120ms", color: "#F7D58B" },
  { id: 10, tx: "-160px", ty: "-120px", rot: "205deg", delay: "130ms", color: "#F7D58B" },
  { id: 11, tx: "175px", ty: "-115px", rot: "-195deg", delay: "125ms", color: "#FFFFFF" },
  { id: 12, tx: "0px", ty: "-165px", rot: "170deg", delay: "75ms", color: "#E03340" },
];

export function BroadcastEffectsLayer({
  effect,
  teams,
  match,
  soundEnabled,
}: BroadcastEffectsLayerProps) {
  const [visibleEffect, setVisibleEffect] =
    useState<BroadcastEffectTrigger | null>(null);
  const lastPlayedIdRef = useRef<number>(0);

  useEffect(() => {
    if (!effect) {
      setVisibleEffect(null);
      return;
    }

    // Do not replay stale effects older than durationMs + 1.5s on initial page load
    const age = Date.now() - effect.triggeredAt;
    const remaining = effect.durationMs - Math.max(0, age);
    if (remaining <= 250) {
      setVisibleEffect(null);
      return;
    }

    setVisibleEffect(effect);

    if (soundEnabled && lastPlayedIdRef.current !== effect.id) {
      lastPlayedIdRef.current = effect.id;
      playBroadcastSfx(effect.type);
    }

    const timer = window.setTimeout(() => {
      setVisibleEffect((curr) => (curr?.id === effect.id ? null : curr));
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [effect, soundEnabled]);

  if (!visibleEffect) return null;

  const found = findPlayerInTeams(teams, visibleEffect.playerId);
  const player = found?.player;
  const team =
    teams.find((t) => t.id === visibleEffect.teamId) || found?.team;

  return (
    <div
      key={`fx-${visibleEffect.id}`}
      className="pointer-events-none absolute inset-x-0 bottom-[210px] z-40 flex flex-col items-center justify-center px-10"
    >
      {/* Celebratory Sparks Origin */}
      {(visibleEffect.type === "six" ||
        visibleEffect.type === "four" ||
        visibleEffect.type === "milestone" ||
        visibleEffect.type === "hat-trick" ||
        visibleEffect.type === "match-win") && (
        <div className="relative h-0 w-0" aria-hidden="true">
          {SPARKS.map((s) => (
            <span
              key={s.id}
              className="anim-spark absolute top-0 left-0 h-3 w-3 rounded-sm"
              style={
                {
                  backgroundColor: s.color,
                  boxShadow: `0 0 12px ${s.color}`,
                  "--tx": s.tx,
                  "--ty": s.ty,
                  "--rot": s.rot,
                  "--delay": s.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* 1. SIX + SIX DISTANCE METER */}
      {visibleEffect.type === "six" && (
        <SixDistanceMeter
          effect={visibleEffect}
          player={player}
          team={team}
          boundaryMeters={match?.boundaryDistanceMeters || 58}
        />
      )}

      {/* 2. FOUR BOUNDARY EXPLOSION */}
      {visibleEffect.type === "four" && (
        <div className="anim-pop-in w-[820px]">
          <div className="broadcast-bezel !rounded-[26px] !p-[3px] shadow-[0_26px_70px_rgba(229,184,92,0.42)]">
            <div
              className="relative flex items-center justify-between gap-6 overflow-hidden rounded-[23px] px-8 py-5"
              style={{
                background:
                  "radial-gradient(circle at 15% 50%, rgba(229,184,92,0.34), transparent 55%), linear-gradient(135deg, rgba(13,25,48,0.97) 0%, rgba(7,14,27,0.99) 100%)",
              }}
            >
              <div className="anim-sheen absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-transparent via-[#F7D58B]/30 to-transparent" />
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F7D58B] via-[#E5B85C] to-[#B77D1A] shadow-[0_0_40px_rgba(229,184,92,0.55)]">
                  <span className="font-display text-7xl font-extrabold text-[#07101E]">
                    4
                  </span>
                </div>
                <div>
                  <span className="font-hud rounded-full border border-[#F7D58B]/45 bg-[#E5B85C]/20 px-3 py-0.5 text-xs font-extrabold tracking-[0.22em] text-[#F7D58B] uppercase">
                    {visibleEffect.badge || "BOUNDARY FOUR"}
                  </span>
                  <div className="font-display mt-1 text-5xl leading-none font-extrabold tracking-wide text-white">
                    {visibleEffect.title}
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-[#F7D58B] uppercase">
                    {player?.name || visibleEffect.subtitle}
                  </div>
                  {visibleEffect.statLine && (
                    <div className="font-telemetry text-xs font-bold text-slate-300">
                      {visibleEffect.statLine}
                    </div>
                  )}
                </div>
              </div>

              {player && (
                <PlayerAvatar
                  photo={player.photo}
                  name={player.name}
                  accentColor="#E5B85C"
                  size={86}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. WICKET / OUT SHATTER BANNER */}
      {visibleEffect.type === "wicket" && (
        <div className="anim-pop-in w-[880px]">
          <div className="rounded-[26px] bg-gradient-to-r from-red-500 via-[#E03340] to-amber-400 p-[3px] shadow-[0_28px_80px_rgba(220,38,38,0.58)]">
            <div
              className="relative flex items-center justify-between gap-6 overflow-hidden rounded-[23px] px-8 py-5"
              style={{
                background:
                  "radial-gradient(circle at 20% 50%, rgba(224,51,64,0.42), transparent 56%), linear-gradient(135deg, #1A0810 0%, #091224 100%)",
              }}
            >
              <div className="anim-sheen absolute inset-y-0 left-0 w-44 bg-gradient-to-r from-transparent via-red-400/25 to-transparent" />
              <div className="flex items-center gap-5">
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-2xl border border-red-300/50 bg-gradient-to-br from-red-600 to-rose-900 shadow-[0_0_40px_rgba(220,38,38,0.65)]">
                  <span className="font-display text-5xl leading-none font-extrabold text-white">
                    OUT
                  </span>
                  <span className="font-hud text-[10px] font-extrabold tracking-[0.2em] text-red-100 uppercase">
                    {visibleEffect.badge || "WICKET"}
                  </span>
                </div>

                <div>
                  <span className="font-hud text-xs font-extrabold tracking-[0.24em] text-red-300 uppercase">
                    TKPL BREAKTHROUGH
                  </span>
                  <div className="font-display mt-0.5 text-5xl leading-none font-extrabold tracking-wide text-white uppercase">
                    {player?.name || visibleEffect.subtitle || "WICKET!"}
                  </div>
                  {visibleEffect.statLine && (
                    <div className="font-telemetry mt-2 inline-block rounded-lg border border-white/15 bg-black/40 px-3 py-1 text-sm font-bold text-amber-200">
                      {visibleEffect.statLine}
                    </div>
                  )}
                </div>
              </div>

              {player && (
                <PlayerAvatar
                  photo={player.photo}
                  name={player.name}
                  accentColor="#E03340"
                  size={90}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. FREE HIT HIGH-VOLTAGE BANNER */}
      {visibleEffect.type === "free-hit" && (
        <div className="anim-pop-in w-[640px]">
          <div className="rounded-3xl bg-gradient-to-r from-sky-400 via-[#F7D58B] to-[#E03340] p-[3px] shadow-[0_24px_70px_rgba(56,189,248,0.45)]">
            <div className="rounded-[21px] bg-[#071225]/96 px-8 py-5 text-center">
              <div className="font-hud text-xs font-extrabold tracking-[0.28em] text-sky-300 uppercase">
                {visibleEffect.badge || "NO BALL DELIVERED"}
              </div>
              <div className="font-display mt-1 text-6xl leading-none font-extrabold tracking-wider text-white">
                {visibleEffect.title}
              </div>
              <div className="font-hud mt-1 text-sm font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                {visibleEffect.subtitle || "NEXT BALL IS A FREE HIT"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MILESTONE / HAT-TRICK / MATCH VICTORY CELEBRATION */}
      {(visibleEffect.type === "milestone" ||
        visibleEffect.type === "hat-trick" ||
        visibleEffect.type === "match-win" ||
        visibleEffect.type === "custom" ||
        visibleEffect.type === "powerplay") && (
        <div className="anim-pop-in w-[900px]">
          <div className="rounded-[28px] bg-gradient-to-r from-[#E5B85C] via-[#FFF1C4] to-[#E03340] p-[3px] shadow-[0_32px_90px_rgba(229,184,92,0.52)]">
            <div
              className="relative flex items-center justify-between gap-6 overflow-hidden rounded-[25px] px-9 py-6"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(229,184,92,0.32), transparent 55%), linear-gradient(155deg, #10203B 0%, #07101E 100%)",
              }}
            >
              <div className="anim-sheen absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <div className="flex items-center gap-5">
                {team && (
                  <TeamCrest
                    logo={team.logo}
                    name={team.name}
                    shortName={team.shortName}
                    color={team.primaryColor}
                    size={82}
                  />
                )}
                <div>
                  <span className="font-hud rounded-full border border-[#F7D58B]/50 bg-[#E5B85C]/20 px-3 py-0.5 text-xs font-extrabold tracking-[0.24em] text-[#F7D58B] uppercase">
                    {visibleEffect.badge || "TKPL 2026 CHAMPIONSHIP"}
                  </span>
                  <div className="font-display mt-1 text-6xl leading-none font-extrabold tracking-wide text-white">
                    {visibleEffect.title}
                  </div>
                  {visibleEffect.subtitle && (
                    <div className="mt-1.5 text-xl font-extrabold text-[#F7D58B] uppercase">
                      {visibleEffect.subtitle}
                    </div>
                  )}
                  {visibleEffect.statLine && (
                    <div className="font-telemetry mt-1 text-sm font-bold text-slate-200">
                      {visibleEffect.statLine}
                    </div>
                  )}
                </div>
              </div>

              {player && (
                <PlayerAvatar
                  photo={player.photo}
                  name={player.name}
                  accentColor="#F7D58B"
                  size={104}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
