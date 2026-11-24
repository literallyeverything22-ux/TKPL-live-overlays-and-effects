import { Flame } from "lucide-react";
import type {
  InningsComputedSummary,
  MatchState,
} from "@/modules/core/types";
import type { TournamentStatsReport } from "@/modules/tournament/lib/stats-engine";
import { RedTennisBallIcon } from "@/modules/core/components/BrandMedia";

interface TopCornerBugProps {
  showBug: boolean;
  showTournamentSixes: boolean;
  tournamentName: string;
  match: MatchState | null;
  summary: InningsComputedSummary | null;
  report: TournamentStatsReport;
}

export function TopCornerBug({
  showBug,
  showTournamentSixes,
  tournamentName,
  match,
  summary,
  report,
}: TopCornerBugProps) {
  return (
    <>
      {/* TOP-LEFT OFFICIAL TKPL 2026 BROADCAST BUG */}
      {showBug && (
        <div className="anim-slide-down absolute top-7 left-9 z-30 flex items-center gap-3">
          <div className="broadcast-bezel !rounded-2xl">
            <div className="broadcast-surface flex items-center gap-3.5 !rounded-[14px] px-4 py-2.5">
              <img
                src="/media/tkpl/brand/tkpl-official-logo-dark.png"
                alt="TKPL Official Logo"
                className="h-11 w-auto object-contain drop-shadow-[0_2px_10px_rgba(229,184,92,0.35)]"
              />
              <div className="h-8 w-[1px] bg-white/15" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="anim-pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-[#E03340] shadow-[0_0_12px_#E03340]" />
                  <span className="font-display text-xl font-extrabold tracking-wider text-white">
                    {tournamentName} · LIVE
                  </span>
                </div>
                <div className="font-hud text-[11px] font-bold tracking-[0.22em] text-[#F7D58B] uppercase">
                  {match
                    ? `MATCH #${match.matchNumber} · ${match.stage.toUpperCase()} · T${match.oversPerInnings}`
                    : "RED HARD TENNIS BALL PREMIER LEAGUE · TKPL.CO.IN"}
                </div>
              </div>
            </div>
          </div>

          {/* Live Dynamic Match Situation Pills */}
          {summary?.isFreeHitNext && (
            <div className="anim-pop-in rounded-xl border border-red-300/70 bg-gradient-to-r from-[#E03340] to-orange-500 px-4 py-2 shadow-[0_0_28px_rgba(224,51,64,0.65)]">
              <div className="font-display text-2xl font-extrabold tracking-wider text-white">
                FREE HIT
              </div>
            </div>
          )}

          {summary?.isHatTrickBall && (
            <div className="anim-pop-in rounded-xl border border-fuchsia-300/70 bg-gradient-to-r from-fuchsia-600 to-purple-700 px-4 py-2 shadow-[0_0_28px_rgba(192,38,211,0.6)]">
              <div className="font-display text-2xl font-extrabold tracking-wider text-white">
                HAT-TRICK BALL
              </div>
            </div>
          )}

          {summary?.chase?.isLastOverThriller && (
            <div className="anim-pop-in rounded-xl border border-[#F7D58B]/70 bg-gradient-to-r from-amber-500 to-red-600 px-4 py-2 shadow-[0_0_28px_rgba(245,158,11,0.55)]">
              <div className="font-display text-xl font-extrabold tracking-wider text-white">
                FINAL OVER THRILLER
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOP-RIGHT LIVE TOURNAMENT SIXES & FOURS COUNTER */}
      {showTournamentSixes && (
        <div className="anim-slide-down absolute top-7 right-9 z-30">
          <div className="broadcast-bezel !rounded-2xl">
            <div className="broadcast-surface flex items-center gap-4 !rounded-[14px] px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <RedTennisBallIcon size={30} />
                <div>
                  <div className="font-hud flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] text-red-300 uppercase">
                    <Flame size={11} /> TKPL SIXES
                  </div>
                  <div className="font-display text-3xl leading-none font-extrabold text-white">
                    {report.totalSixes}
                  </div>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-white/15" />
              <div>
                <div className="font-hud text-[10px] font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                  FOURS
                </div>
                <div className="font-display text-3xl leading-none font-extrabold text-[#F7D58B]">
                  {report.totalFours}
                </div>
              </div>
              {report.biggestSixes[0] && (
                <>
                  <div className="h-8 w-[1px] bg-white/15" />
                  <div>
                    <div className="font-hud text-[10px] font-bold tracking-[0.2em] text-orange-300 uppercase">
                      LONGEST 6
                    </div>
                    <div className="font-display text-3xl leading-none font-extrabold text-orange-200">
                      {report.biggestSixes[0].meters}m
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
