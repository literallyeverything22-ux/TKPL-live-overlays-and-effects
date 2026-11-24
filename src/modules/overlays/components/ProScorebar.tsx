import { useEffect, useMemo, useState } from "react";
import type {
  InningsComputedSummary,
  MatchState,
  OverlayControlState,
  Team,
} from "@/modules/core/types";
import {
  formatBallBadge,
  formatRate,
} from "@/modules/scoring/lib/cricket-engine";
import { TeamCrest } from "@/modules/core/components/BrandMedia";

interface ProScorebarProps {
  match: MatchState;
  summary: InningsComputedSummary;
  battingTeam: Team;
  bowlingTeam: Team;
  overlay: OverlayControlState;
}

export function ProScorebar({
  match,
  summary,
  battingTeam,
  bowlingTeam,
  overlay,
}: ProScorebarProps) {
  const striker = summary.battingCard.find((b) => b.isStriker);
  const nonStriker = summary.battingCard.find((b) => b.isNonStriker);
  const bowler = summary.bowlingCard.find((b) => b.isCurrent);

  // Rotating broadcast ticker slides
  const tickerItems = useMemo(() => {
    const items: { tag: string; text: string; tone: "gold" | "red" | "sky" }[] =
      [];

    if (overlay.customTickerAlert) {
      items.push({
        tag: "LIVE UPDATE",
        text: overlay.customTickerAlert.toUpperCase(),
        tone: "red",
      });
    }

    items.push({
      tag: "MATCH BOUNDARIES",
      text: `INNINGS FOURS: ${summary.fours}  ·  INNINGS SIXES: ${summary.sixes}${
        summary.biggestSixMeters > 0
          ? `  ·  BIGGEST SIX: ${summary.biggestSixMeters} METERS`
          : ""
      }`,
      tone: "gold",
    });

    items.push({
      tag: "PARTNERSHIP",
      text: `${summary.partnership.runs} RUNS OFF ${summary.partnership.balls} BALLS (${summary.partnership.fours}×4 · ${summary.partnership.sixes}×6)  ·  LAST 12 BALLS: ${summary.last12Balls.runs}/${summary.last12Balls.wickets}`,
      tone: "sky",
    });

    if (!summary.chase) {
      items.push({
        tag: "PROJECTION",
        text: `CURRENT RUN RATE ${formatRate(summary.crr)}  ·  PROJECTED ${match.oversPerInnings}-OVER TOTAL: ${summary.projectedScore}  ·  EXTRAS: ${summary.extrasTotal}`,
        tone: "gold",
      });
    }

    for (const msg of overlay.sponsorMessages) {
      items.push({
        tag: "TKPL 2026",
        text: msg.toUpperCase(),
        tone: "gold",
      });
    }
    return items;
  }, [overlay.customTickerAlert, overlay.sponsorMessages, summary, match.oversPerInnings]);

  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTickerIdx((prev) => (prev + 1) % Math.max(1, tickerItems.length));
    }, 5200);
    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  const activeTicker = tickerItems[tickerIdx % tickerItems.length];

  return (
    <div className="anim-slide-up absolute bottom-7 left-1/2 z-30 w-[1804px] -translate-x-1/2">
      {/* Main Broadcast Scorebug Shell */}
      <div className="broadcast-bezel">
        <div className="broadcast-surface relative overflow-hidden">
          {/* Top thin team-accent rim light */}
          <div
            className="h-[3px] w-full"
            style={{
              background: `linear-gradient(90deg, ${battingTeam.primaryColor} 0%, #F7D58B 45%, #E03340 75%, ${bowlingTeam.primaryColor} 100%)`,
            }}
          />

          <div className="grid grid-cols-12 items-stretch divide-x divide-white/10">
            {/* BLOCK 1: TEAM CREST + SCORE + OVERS (Col 1-3) */}
            <div
              className="col-span-3 flex items-center justify-between gap-3 px-5 py-3"
              style={{
                background: `linear-gradient(115deg, ${battingTeam.primaryColor}38 0%, rgba(12,23,41,0.92) 72%)`,
              }}
            >
              <div className="flex items-center gap-3.5">
                <TeamCrest
                  logo={battingTeam.logo}
                  name={battingTeam.name}
                  shortName={battingTeam.shortName}
                  color={battingTeam.primaryColor}
                  size={58}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-3xl leading-none font-extrabold tracking-wide text-white">
                      {battingTeam.shortName}
                    </span>
                    <span className="font-hud rounded bg-white/12 px-1.5 py-0.5 text-[11px] font-bold text-slate-300">
                      v {bowlingTeam.shortName}
                    </span>
                    {summary.isPowerplay && (
                      <span className="font-hud rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold text-[#07101E]">
                        PP
                      </span>
                    )}
                  </div>
                  <div className="font-hud mt-1 text-xs font-bold tracking-[0.18em] text-[#F7D58B] uppercase">
                    OVERS {summary.oversText} / {match.oversPerInnings}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  key={`score-${summary.runs}-${summary.wickets}`}
                  className="anim-score-bump font-display text-[56px] leading-[0.9] font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
                >
                  {summary.runs}
                  <span className="text-[#F7D58B]">/</span>
                  {summary.wickets}
                </div>
              </div>
            </div>

            {/* BLOCK 2: STRIKER & NON-STRIKER WITH 4s / 6s PILLS (Col 4-6) */}
            <div className="col-span-3 flex flex-col justify-center gap-1.5 px-5 py-2.5">
              {[striker, nonStriker].map(
                (b, idx) =>
                  b && (
                    <div
                      key={b.playerId}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                            idx === 0
                              ? "bg-[#F7D58B] shadow-[0_0_10px_#F7D58B]"
                              : "bg-white/20"
                          }`}
                        />
                        <span
                          className={`truncate text-[16px] font-extrabold tracking-wide uppercase ${
                            idx === 0 ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {b.name}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {/* Mini 4s / 6s badges right inside scorebar */}
                        {(b.fours > 0 || b.sixes > 0) && (
                          <div className="font-telemetry flex items-center gap-1 text-[11px] font-bold">
                            {b.fours > 0 && (
                              <span className="rounded bg-[#E5B85C]/20 px-1.5 py-0.5 text-[#F7D58B]">
                                {b.fours}×4
                              </span>
                            )}
                            {b.sixes > 0 && (
                              <span className="rounded bg-[#E03340]/30 px-1.5 py-0.5 text-red-200">
                                {b.sixes}×6
                              </span>
                            )}
                          </div>
                        )}
                        <div className="font-display min-w-[66px] text-right text-2xl leading-none font-extrabold text-white">
                          {b.runs}
                          <span className="font-telemetry ml-1 text-xs font-semibold text-slate-400">
                            ({b.balls})
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
              )}
            </div>

            {/* BLOCK 3: CHASE ENGINE / BOUNDARIES & RUN RATE (Col 7-9) */}
            <div className="col-span-3 flex flex-col justify-center px-5 py-2.5">
              {summary.chase ? (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-hud text-xs font-extrabold tracking-[0.16em] text-emerald-300 uppercase">
                      TARGET {summary.chase.target}
                    </span>
                    <span className="font-telemetry text-xs font-bold text-slate-300">
                      CRR <strong className="text-white">{formatRate(summary.crr)}</strong> · RRR{" "}
                      <strong className="text-[#F7D58B]">
                        {formatRate(summary.chase.rrr)}
                      </strong>
                    </span>
                  </div>
                  <div className="font-display text-[26px] leading-none font-extrabold tracking-wide text-white">
                    NEED{" "}
                    <span className="text-[#F7D58B]">
                      {summary.chase.runsNeeded}
                    </span>{" "}
                    IN{" "}
                    <span className="text-sky-300">
                      {summary.chase.ballsRemaining}
                    </span>{" "}
                    BALLS
                  </div>

                  {overlay.showWinPredictor && (
                    <div className="pt-0.5">
                      <div className="font-hud mb-0.5 flex justify-between text-[10px] font-bold tracking-wider uppercase">
                        <span style={{ color: battingTeam.primaryColor }}>
                          {battingTeam.shortName} {summary.chase.battingWinPct}%
                        </span>
                        <span className="text-slate-400">WIN PREDICTOR</span>
                        <span style={{ color: bowlingTeam.primaryColor }}>
                          {bowlingTeam.shortName} {summary.chase.bowlingWinPct}%
                        </span>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full transition-all duration-700"
                          style={{
                            width: `${summary.chase.battingWinPct}%`,
                            backgroundColor: battingTeam.primaryColor,
                          }}
                        />
                        <div
                          className="h-full transition-all duration-700"
                          style={{
                            width: `${summary.chase.bowlingWinPct}%`,
                            backgroundColor: bowlingTeam.primaryColor,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-hud text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                      RUN RATE · PROJECTED
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-3">
                      <span className="font-display text-3xl leading-none font-extrabold text-white">
                        {formatRate(summary.crr)}
                      </span>
                      <span className="font-hud text-sm font-bold text-[#F7D58B]">
                        PROJ {summary.projectedScore}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-[#E5B85C]/35 bg-[#E5B85C]/12 px-3 py-1.5 text-center">
                      <div className="font-hud text-[10px] font-extrabold tracking-widest text-[#F7D58B]">
                        4s
                      </div>
                      <div className="font-display text-2xl leading-none font-extrabold text-white">
                        {summary.fours}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#E03340]/45 bg-[#E03340]/20 px-3 py-1.5 text-center">
                      <div className="font-hud text-[10px] font-extrabold tracking-widest text-red-200">
                        6s
                      </div>
                      <div className="font-display text-2xl leading-none font-extrabold text-white">
                        {summary.sixes}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BLOCK 4: CURRENT BOWLER + THIS OVER BALL-BY-BALL (Col 10-12) */}
            <div
              className="col-span-3 flex flex-col justify-center gap-1.5 px-5 py-2.5"
              style={{
                background: `linear-gradient(245deg, ${bowlingTeam.primaryColor}28 0%, rgba(10,19,35,0.94) 70%)`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <TeamCrest
                    logo={bowlingTeam.logo}
                    name={bowlingTeam.name}
                    shortName={bowlingTeam.shortName}
                    color={bowlingTeam.primaryColor}
                    size={26}
                  />
                  <span className="truncate text-[15px] font-extrabold tracking-wide text-white uppercase">
                    {bowler?.name || "Bowler"}
                  </span>
                </div>
                {bowler && (
                  <div className="font-display shrink-0 text-2xl leading-none font-extrabold text-sky-300">
                    {bowler.wickets}-{bowler.runsConceded}
                    <span className="font-telemetry ml-1.5 text-xs font-semibold text-slate-300">
                      ({bowler.oversText})
                    </span>
                  </div>
                )}
              </div>

              {/* This Over Ball Chips */}
              <div className="flex items-center gap-1.5">
                <span className="font-hud mr-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  OVER
                </span>
                {summary.currentOverBalls.length === 0 ? (
                  <span className="font-hud text-xs font-semibold text-slate-400">
                    NEW OVER STARTING
                  </span>
                ) : (
                  summary.currentOverBalls.slice(-8).map((b) => (
                    <span
                      key={b.id}
                      className={`anim-pop-in font-telemetry inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-extrabold ${
                        b.wicket
                          ? "bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.7)]"
                          : b.isBoundarySix
                            ? "bg-gradient-to-br from-[#E03340] to-orange-500 text-white shadow-[0_0_12px_rgba(224,51,64,0.65)]"
                            : b.isBoundaryFour
                              ? "bg-[#E5B85C] text-[#07111F] shadow-[0_0_10px_rgba(229,184,92,0.55)]"
                              : b.extraType !== "none"
                                ? "border border-sky-400/50 bg-sky-500/25 text-sky-200"
                                : b.runsOffBat === 0
                                  ? "bg-white/10 text-slate-400"
                                  : "bg-white/18 text-white"
                      }`}
                    >
                      {formatBallBadge(b)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM ROTATING STATS & SPONSOR TICKER STRIP */}
          {overlay.showSponsorTicker && activeTicker && (
            <div className="flex items-center justify-between border-t border-white/10 bg-[#050B16]/95 px-5 py-1.5">
              <div
                key={`tick-${tickerIdx}-${activeTicker.text}`}
                className="anim-slide-up flex items-center gap-3 overflow-hidden"
              >
                <span
                  className={`font-hud shrink-0 rounded px-2 py-0.5 text-[11px] font-extrabold tracking-[0.18em] uppercase ${
                    activeTicker.tone === "red"
                      ? "bg-[#E03340] text-white"
                      : activeTicker.tone === "sky"
                        ? "bg-sky-500/25 text-sky-200 border border-sky-400/40"
                        : "bg-[#E5B85C]/20 text-[#F7D58B] border border-[#E5B85C]/35"
                  }`}
                >
                  {activeTicker.tag}
                </span>
                <span className="font-hud truncate text-sm font-bold tracking-[0.12em] text-slate-200 uppercase">
                  {activeTicker.text}
                </span>
              </div>
              <span className="font-hud shrink-0 pl-4 text-xs font-extrabold tracking-[0.24em] text-[#E5B85C]">
                TKPL.CO.IN
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
