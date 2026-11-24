import { useEffect, useState } from "react";
import type { BroadcastEffectTrigger, Player, Team } from "@/modules/core/types";
import {
  PlayerAvatar,
  RedTennisBallIcon,
  TeamCrest,
} from "@/modules/core/components/BrandMedia";

interface SixDistanceMeterProps {
  effect: BroadcastEffectTrigger;
  player?: Player;
  team?: Team;
  boundaryMeters: number;
}

export function SixDistanceMeter({
  effect,
  player,
  team,
  boundaryMeters,
}: SixDistanceMeterProps) {
  const targetMeters = effect.meters || boundaryMeters + 20;
  const [displayMeters, setDisplayMeters] = useState(0);

  // Smooth odometer roll-up from 0 -> targetMeters over 950ms
  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const duration = 950;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutExpo curve
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayMeters(Math.round(eased * targetMeters));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [effect.id, targetMeters]);

  const overRope = Math.max(2, targetMeters - boundaryMeters);
  const powerPct = Math.min(100, Math.max(45, Math.round((targetMeters / 115) * 100)));
  const accent = team?.primaryColor || "#E03340";

  return (
    <div className="anim-pop-in pointer-events-none relative mx-auto w-[1080px]">
      {/* Expanding Shockwave Halo */}
      <div
        className="anim-shockwave absolute top-1/2 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#E03340]/70"
        aria-hidden="true"
      />

      <div className="broadcast-bezel !rounded-[28px] !p-[3px] shadow-[0_32px_90px_rgba(224,51,64,0.48)]">
        <div
          className="relative overflow-hidden rounded-[25px] p-6"
          style={{
            background: `radial-gradient(circle at 22% 20%, rgba(224,51,64,0.34), transparent 52%), radial-gradient(circle at 82% 80%, ${accent}30, transparent 50%), linear-gradient(165deg, rgba(13,24,44,0.97) 0%, rgba(6,12,24,0.99) 100%)`,
          }}
        >
          {/* Metallic Sweep Sheen */}
          <div
            className="anim-sheen pointer-events-none absolute inset-y-0 left-0 w-44 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            aria-hidden="true"
          />

          <div className="grid grid-cols-12 items-center gap-6">
            {/* LEFT: BATTER PORTRAIT + TEAM + SIX CALLOUT */}
            <div className="col-span-4 flex items-center gap-4">
              <div className="relative">
                <PlayerAvatar
                  photo={player?.photo}
                  name={player?.name || effect.subtitle || "TKPL"}
                  accentColor="#F7D58B"
                  size={104}
                  className="shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
                />
                {team && (
                  <div className="absolute -right-2 -bottom-2">
                    <TeamCrest
                      logo={team.logo}
                      name={team.name}
                      shortName={team.shortName}
                      color={team.primaryColor}
                      size={38}
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <span className="font-hud inline-block rounded-full bg-gradient-to-r from-[#E03340] to-orange-500 px-3 py-0.5 text-xs font-extrabold tracking-[0.2em] text-white uppercase">
                  {effect.badge || "MAXIMUM SIX"}
                </span>
                <div className="font-display mt-1 text-5xl leading-[0.9] font-extrabold tracking-wide text-white">
                  SIX!
                </div>
                <div className="mt-1 truncate text-lg font-extrabold text-[#F7D58B] uppercase">
                  {player?.name || effect.subtitle}
                </div>
                {effect.statLine && (
                  <div className="font-telemetry mt-0.5 text-xs font-bold text-slate-300">
                    {effect.statLine}
                  </div>
                )}
              </div>
            </div>

            {/* CENTER: ANIMATED RED TENNIS BALL TRAJECTORY ARC SVG */}
            <div className="col-span-5">
              <div className="relative rounded-2xl border border-white/10 bg-[#050C18]/85 px-4 pt-3 pb-2">
                <div className="font-hud mb-1 flex items-center justify-between text-[11px] font-bold tracking-[0.18em] uppercase">
                  <span className="text-red-300">GURU LAZER BALL TRACKER</span>
                  <span className="text-[#F7D58B]">
                    {effect.zoneLabel || "MASSIVE HIT"}
                  </span>
                </div>

                <svg
                  viewBox="0 0 380 125"
                  className="h-[116px] w-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="sixArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F7D58B" />
                      <stop offset="55%" stopColor="#FF5F40" />
                      <stop offset="100%" stopColor="#E03340" />
                    </linearGradient>
                    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Stadium Ground Horizon Grid */}
                  <line
                    x1="12"
                    y1="106"
                    x2="368"
                    y2="106"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2"
                  />
                  {/* Boundary Rope Marker */}
                  <line
                    x1="230"
                    y1="94"
                    x2="230"
                    y2="112"
                    stroke="#F7D58B"
                    strokeWidth="3"
                  />
                  <text
                    x="230"
                    y="122"
                    textAnchor="middle"
                    fill="#F7D58B"
                    fontSize="10"
                    fontWeight="700"
                  >
                    ROPE ({boundaryMeters}m)
                  </text>
                  <text
                    x="28"
                    y="122"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="10"
                    fontWeight="700"
                  >
                    BAT
                  </text>

                  {/* Parabolic Flight Trail */}
                  <path
                    d="M 28 104 Q 185 -18 352 96"
                    fill="none"
                    stroke="url(#sixArcGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    filter="url(#arcGlow)"
                    strokeDasharray="900"
                    style={{
                      animation:
                        "tkpl-draw-path 950ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    }}
                  />

                  {/* Impact Ring at Landing Point */}
                  <circle
                    cx="352"
                    cy="96"
                    r="11"
                    fill="rgba(224,51,64,0.35)"
                    stroke="#F7D58B"
                    strokeWidth="2"
                  />

                  {/* Animated Red Tennis Ball flying along the exact parabolic path */}
                  <g
                    style={{
                      offsetPath: "path('M 28 104 Q 185 -18 352 96')",
                      animation:
                        "tkpl-ball-arc 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    }}
                  >
                    <g transform="translate(-14, -14)">
                      <RedTennisBallIcon size={28} />
                    </g>
                  </g>
                </svg>

                {/* Power Distance Meter Bar */}
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#F7D58B] via-orange-500 to-[#E03340] transition-all duration-700"
                      style={{ width: `${powerPct}%` }}
                    />
                  </div>
                  <span className="font-hud text-[11px] font-extrabold text-emerald-300">
                    +{overRope}m OVER ROPE
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: GIANT METERS ODOMETER */}
            <div className="col-span-3 text-center">
              <div className="rounded-2xl border border-[#F7D58B]/40 bg-gradient-to-b from-[#E03340]/25 to-[#081224] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                <div className="font-hud text-xs font-extrabold tracking-[0.24em] text-[#F7D58B] uppercase">
                  SIX DISTANCE
                </div>
                <div className="font-display mt-1 text-[82px] leading-[0.85] font-extrabold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(224,51,64,0.65)]">
                  {displayMeters}
                  <span className="ml-0.5 text-4xl text-[#F7D58B]">m</span>
                </div>
                <div className="font-hud mt-2 inline-block rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-extrabold tracking-widest text-amber-200 uppercase">
                  {targetMeters >= 95
                    ? "MONSTER HIT!"
                    : targetMeters >= 82
                      ? "HUGE MAXIMUM!"
                      : "CLEAN STRIKE!"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
