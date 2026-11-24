import { Award, Flame, Trophy } from "lucide-react";
import type {
  BroadcastState,
  InningsComputedSummary,
  MatchState,
  Team,
} from "@/modules/core/types";
import {
  computeInningsSummary,
  findPlayerInTeams,
  formatRate,
} from "@/modules/scoring/lib/cricket-engine";
import type { TournamentStatsReport } from "@/modules/tournament/lib/stats-engine";
import {
  PlayerAvatar,
  RedTennisBallIcon,
  TeamCrest,
} from "@/modules/core/components/BrandMedia";

interface MatchGraphicsDeckProps {
  state: BroadcastState;
  match: MatchState | null;
  activeSummary: InningsComputedSummary | null;
  report: TournamentStatsReport;
}

export function MatchGraphicsDeck({
  state,
  match,
  activeSummary,
  report,
}: MatchGraphicsDeckProps) {
  const { overlay, teams } = state;
  const card = overlay.activeCard;

  if (card === "none") return null;

  // 1. MATCH INTRO / VS BANNER
  if (card === "vs-banner" && match) {
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);
    const tossTeam = teams.find((t) => t.id === match.tossWinnerId);
    if (!teamA || !teamB) return null;

    return (
      <div className="anim-pop-in absolute top-1/2 left-1/2 z-30 w-[1320px] -translate-x-1/2 -translate-y-1/2">
        <div className="broadcast-bezel !rounded-[32px] !p-[3px]">
          <div
            className="relative overflow-hidden rounded-[29px] px-12 py-10 text-center"
            style={{
              background: `linear-gradient(125deg, ${teamA.primaryColor}35 0%, rgba(10,19,35,0.97) 42%, rgba(10,19,35,0.97) 58%, ${teamB.primaryColor}35 100%)`,
            }}
          >
            <div className="font-hud inline-flex items-center gap-3 rounded-full border border-[#F7D58B]/40 bg-[#E5B85C]/15 px-5 py-1.5 text-sm font-extrabold tracking-[0.26em] text-[#F7D58B] uppercase">
              TKPL 2026 · MATCH #{match.matchNumber} · {match.stage.toUpperCase()}
            </div>

            <div className="mt-8 grid grid-cols-11 items-center gap-4">
              <div className="col-span-5 flex flex-col items-center">
                <TeamCrest
                  logo={teamA.logo}
                  name={teamA.name}
                  shortName={teamA.shortName}
                  color={teamA.primaryColor}
                  size={148}
                />
                <div className="font-display mt-4 text-5xl font-extrabold tracking-wide text-white uppercase">
                  {teamA.name}
                </div>
                <div className="font-hud text-sm font-bold tracking-[0.2em] text-slate-300 uppercase">
                  OWNER: {teamA.ownerName || "TKPL FRANCHISE"}
                </div>
              </div>

              <div className="col-span-1 flex flex-col items-center">
                <RedTennisBallIcon size={58} />
                <div className="font-display mt-2 text-5xl font-extrabold text-[#F7D58B]">
                  VS
                </div>
              </div>

              <div className="col-span-5 flex flex-col items-center">
                <TeamCrest
                  logo={teamB.logo}
                  name={teamB.name}
                  shortName={teamB.shortName}
                  color={teamB.primaryColor}
                  size={148}
                />
                <div className="font-display mt-4 text-5xl font-extrabold tracking-wide text-white uppercase">
                  {teamB.name}
                </div>
                <div className="font-hud text-sm font-bold tracking-[0.2em] text-slate-300 uppercase">
                  OWNER: {teamB.ownerName || "TKPL FRANCHISE"}
                </div>
              </div>
            </div>

            <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-white/15 bg-black/45 px-7 py-3 text-base font-bold text-slate-200">
              <span>
                TOSS:{" "}
                <strong className="text-[#F7D58B]">
                  {tossTeam?.name.toUpperCase()} WON &amp; OPTED TO{" "}
                  {match.tossDecision.toUpperCase()}
                </strong>
              </span>
              <span className="text-white/25">|</span>
              <span>{match.oversPerInnings} OVERS PER SIDE</span>
              <span className="text-white/25">|</span>
              <span>{match.venue.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PLAYING XI WITH REAL PLAYER PHOTOS
  if (card === "playing-xi" && match) {
    const team =
      teams.find((t) => t.id === overlay.cardTeamId) ||
      teams.find((t) => t.id === match.teamAId);
    if (!team) return null;
    const xiIds = team.id === match.teamAId ? match.teamAXI : match.teamBXI;
    const xiPlayers = team.players.filter((p) => xiIds.includes(p.id));
    const list = xiPlayers.length > 0 ? xiPlayers : team.players.slice(0, 11);

    return (
      <div className="anim-pop-in absolute top-[128px] left-1/2 z-30 w-[1440px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[28px] !p-[3px]">
          <div
            className="rounded-[25px] p-7"
            style={{
              background: `radial-gradient(circle at 12% 10%, ${team.primaryColor}35, transparent 48%), linear-gradient(175deg, rgba(11,22,40,0.97) 0%, rgba(6,12,23,0.99) 100%)`,
            }}
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/12 pb-4">
              <div className="flex items-center gap-4">
                <TeamCrest
                  logo={team.logo}
                  name={team.name}
                  shortName={team.shortName}
                  color={team.primaryColor}
                  size={68}
                />
                <div>
                  <span className="font-hud text-xs font-extrabold tracking-[0.26em] text-[#F7D58B] uppercase">
                    TKPL 2026 · MATCH #{match.matchNumber} OFFICIAL LINEUP
                  </span>
                  <h2 className="font-display text-5xl leading-none font-extrabold tracking-wide text-white uppercase">
                    {team.name} — PLAYING XI
                  </h2>
                </div>
              </div>
              <span className="font-hud rounded-full border border-[#F7D58B]/40 bg-[#E5B85C]/15 px-4 py-1.5 text-sm font-extrabold tracking-[0.2em] text-[#F7D58B]">
                11 STARTERS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              {list.slice(0, 11).map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <span className="font-display w-7 text-center text-2xl font-extrabold text-[#F7D58B]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <PlayerAvatar
                    photo={p.photo}
                    name={p.name}
                    accentColor={team.primaryColor}
                    size={58}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold text-white uppercase">
                      {p.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.tag && (
                        <span className="font-hud rounded bg-[#E5B85C] px-1.5 py-0.5 text-[10px] font-extrabold text-[#07101E] uppercase">
                          {p.tag}
                        </span>
                      )}
                      <span className="font-hud text-xs font-bold text-slate-300 uppercase">
                        {p.role} · {p.battingStyle}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. PLAYER LOWER-THIRD SPOTLIGHT (NEW BATTER / BOWLER INTRO / BATTER & BOWLER SPOTLIGHT)
  if (
    card === "new-batter" ||
    card === "bowler-intro" ||
    card === "batter-spotlight" ||
    card === "bowler-spotlight"
  ) {
    const found = findPlayerInTeams(teams, overlay.spotlightPlayerId);
    if (!found) return null;
    const { player, team } = found;
    const matchBatStat = activeSummary?.battingCard.find(
      (b) => b.playerId === player.id,
    );
    const matchBowlStat = activeSummary?.bowlingCard.find(
      (b) => b.playerId === player.id,
    );
    const tourneyBat =
      report.topRuns.find((p) => p.playerId === player.id) ||
      report.mostSixes.find((p) => p.playerId === player.id);

    const badgeTitle =
      card === "new-batter"
        ? "NEW BATTER AT THE CREASE"
        : card === "bowler-intro"
          ? "INTO THE ATTACK"
          : card === "bowler-spotlight"
            ? "BOWLER SPOTLIGHT"
            : "BATTER SPOTLIGHT";

    return (
      <div className="anim-slide-up absolute bottom-[205px] left-12 z-30 w-[760px]">
        <div className="broadcast-bezel !rounded-[24px] !p-[3px]">
          <div
            className="flex items-center gap-5 rounded-[21px] p-5"
            style={{
              background: `linear-gradient(120deg, ${team.primaryColor}38 0%, rgba(10,19,35,0.97) 52%, rgba(6,12,24,0.99) 100%)`,
            }}
          >
            <div className="relative">
              <PlayerAvatar
                photo={player.photo}
                name={player.name}
                accentColor={team.primaryColor}
                size={112}
              />
              <div className="absolute -right-2 -bottom-2">
                <TeamCrest
                  logo={team.logo}
                  name={team.name}
                  shortName={team.shortName}
                  color={team.primaryColor}
                  size={40}
                />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-hud rounded-full bg-[#E5B85C] px-3 py-0.5 text-xs font-extrabold tracking-[0.2em] text-[#07101E] uppercase">
                  {badgeTitle}
                </span>
                {player.tag && (
                  <span className="font-hud rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white uppercase">
                    {player.tag}
                  </span>
                )}
              </div>

              <div className="font-display mt-1 truncate text-5xl leading-none font-extrabold tracking-wide text-white uppercase">
                {player.name}
              </div>
              <div className="font-hud mt-1 text-sm font-bold tracking-[0.15em] text-slate-300 uppercase">
                {team.name} · {player.role} · {player.battingStyle}
                {player.bowlingStyle ? ` · ${player.bowlingStyle}` : ""}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {card === "batter-spotlight" && matchBatStat && (
                  <>
                    <StatChip label="THIS MATCH" value={`${matchBatStat.runs} (${matchBatStat.balls})`} highlight />
                    <StatChip label="FOURS" value={String(matchBatStat.fours)} />
                    <StatChip label="SIXES" value={String(matchBatStat.sixes)} />
                    <StatChip label="STRIKE RATE" value={matchBatStat.strikeRate.toFixed(1)} />
                  </>
                )}
                {(card === "bowler-spotlight" || card === "bowler-intro") &&
                  matchBowlStat && (
                    <>
                      <StatChip
                        label="FIGURES"
                        value={`${matchBowlStat.wickets}-${matchBowlStat.runsConceded}`}
                        highlight
                      />
                      <StatChip label="OVERS" value={matchBowlStat.oversText} />
                      <StatChip label="ECON" value={formatRate(matchBowlStat.economy)} />
                      <StatChip label="DOTS" value={String(matchBowlStat.dots)} />
                    </>
                  )}
                {card === "new-batter" && (
                  <>
                    <StatChip
                      label="TKPL RUNS"
                      value={String(tourneyBat?.runs ?? 0)}
                      highlight
                    />
                    <StatChip label="TKPL 6s" value={String(tourneyBat?.sixes ?? 0)} />
                    <StatChip label="TKPL 4s" value={String(tourneyBat?.fours ?? 0)} />
                    {player.city && <StatChip label="FROM" value={player.city} />}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. FULL INNINGS SCORECARD
  if (card === "scorecard" && match) {
    const idx = overlay.cardInningsIndex ?? match.currentInningsIndex;
    const inn = match.innings[idx];
    const sum = computeInningsSummary(
      inn,
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    );
    const batTeam = teams.find((t) => t.id === inn?.battingTeamId);
    const bowlTeam = teams.find((t) => t.id === inn?.bowlingTeamId);
    if (!inn || !sum || !batTeam || !bowlTeam) return null;

    return (
      <div className="anim-pop-in absolute top-[118px] left-1/2 z-30 w-[1540px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[28px] !p-[3px]">
          <div className="rounded-[25px] bg-[#081224]/98 p-7">
            <div className="mb-5 flex items-center justify-between border-b border-white/12 pb-4">
              <div className="flex items-center gap-4">
                <TeamCrest
                  logo={batTeam.logo}
                  name={batTeam.name}
                  shortName={batTeam.shortName}
                  color={batTeam.primaryColor}
                  size={64}
                />
                <div>
                  <span className="font-hud text-xs font-extrabold tracking-[0.24em] text-[#F7D58B] uppercase">
                    {idx === 0 ? "1ST INNINGS" : "2ND INNINGS"} BATTING SCORECARD · MATCH #{match.matchNumber}
                  </span>
                  <h2 className="font-display text-5xl leading-none font-extrabold text-white uppercase">
                    {batTeam.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex gap-3">
                  <StatChip label="FOURS" value={String(sum.fours)} />
                  <StatChip label="SIXES" value={String(sum.sixes)} highlight />
                  <StatChip label="EXTRAS" value={String(sum.extrasTotal)} />
                </div>
                <div className="text-right">
                  <div className="font-display text-6xl leading-none font-extrabold text-white">
                    {sum.runs}
                    <span className="text-[#F7D58B]">/</span>
                    {sum.wickets}
                  </div>
                  <div className="font-telemetry text-sm font-bold text-slate-300">
                    OVERS {sum.oversText} · CRR {formatRate(sum.crr)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Batting Table */}
              <div className="col-span-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="font-hud border-b border-white/12 text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">
                      <th className="py-2">BATTER</th>
                      <th className="py-2">STATUS</th>
                      <th className="py-2 text-right">R</th>
                      <th className="py-2 text-right">B</th>
                      <th className="py-2 text-right text-[#F7D58B]">4s</th>
                      <th className="py-2 text-right text-red-300">6s</th>
                      <th className="py-2 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 text-sm">
                    {sum.battingCard.slice(0, 9).map((b) => (
                      <tr
                        key={b.playerId}
                        className={!b.isOut ? "bg-[#E5B85C]/[0.07]" : ""}
                      >
                        <td className="py-2 font-extrabold text-white uppercase">
                          {b.name}
                          {!b.isOut ? " *" : ""}
                        </td>
                        <td className="py-2 text-xs text-slate-400">
                          {b.dismissalText}
                        </td>
                        <td className="font-display py-2 text-right text-2xl font-extrabold text-white">
                          {b.runs}
                        </td>
                        <td className="font-telemetry py-2 text-right text-slate-300">
                          {b.balls}
                        </td>
                        <td className="font-telemetry py-2 text-right font-bold text-[#F7D58B]">
                          {b.fours}
                        </td>
                        <td className="font-telemetry py-2 text-right font-bold text-red-300">
                          {b.sixes}
                        </td>
                        <td className="font-telemetry py-2 text-right text-slate-300">
                          {b.strikeRate.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bowling Figures */}
              <div className="col-span-4 rounded-2xl border border-white/10 bg-[#050C18] p-4">
                <div className="font-hud mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] text-sky-300 uppercase">
                  <TeamCrest
                    logo={bowlTeam.logo}
                    name={bowlTeam.name}
                    shortName={bowlTeam.shortName}
                    color={bowlTeam.primaryColor}
                    size={26}
                  />
                  {bowlTeam.shortName} BOWLING
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="font-hud border-b border-white/10 text-[11px] text-slate-400 uppercase">
                      <th className="py-1.5">BOWLER</th>
                      <th className="py-1.5 text-right">OV</th>
                      <th className="py-1.5 text-right">R</th>
                      <th className="py-1.5 text-right">W</th>
                      <th className="py-1.5 text-right">EC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {sum.bowlingCard.slice(0, 7).map((bw) => (
                      <tr key={bw.playerId}>
                        <td className="py-2 font-bold text-white uppercase">
                          {bw.name}
                        </td>
                        <td className="font-telemetry py-2 text-right text-slate-300">
                          {bw.oversText}
                        </td>
                        <td className="font-telemetry py-2 text-right text-slate-300">
                          {bw.runsConceded}
                        </td>
                        <td className="font-display py-2 text-right text-xl font-extrabold text-[#F7D58B]">
                          {bw.wickets}
                        </td>
                        <td className="font-telemetry py-2 text-right text-slate-300">
                          {formatRate(bw.economy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. OVER-BY-OVER MANHATTAN + WORM RUN GRAPH
  if (card === "over-graph" && match) {
    const inn0 = computeInningsSummary(
      match.innings[0],
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    );
    const inn1 = computeInningsSummary(
      match.innings[1],
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    );
    const t0 = teams.find((t) => t.id === match.innings[0]?.battingTeamId);
    const t1 = teams.find((t) => t.id === match.innings[1]?.battingTeamId);
    const overs = match.oversPerInnings;
    const maxOverRuns = Math.max(
      18,
      ...(inn0?.overByOver.map((o) => o.runs) || [0]),
      ...(inn1?.overByOver.map((o) => o.runs) || [0]),
    );
    const maxCumRuns = Math.max(
      60,
      inn0?.runs || 0,
      inn1?.runs || 0,
    );

    const chartW = 1280;
    const chartH = 310;
    const padL = 54;
    const padR = 30;
    const padT = 26;
    const padB = 42;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    const buildWormPath = (sum: InningsComputedSummary | null) => {
      if (!sum || sum.overByOver.length === 0) return "";
      const pts = [`M ${padL} ${padT + plotH}`];
      for (const ov of sum.overByOver) {
        const x = padL + (ov.overNumber / overs) * plotW;
        const y = padT + plotH - (ov.cumulativeRuns / maxCumRuns) * plotH;
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return pts.join(" ");
    };

    return (
      <div className="anim-pop-in absolute top-[125px] left-1/2 z-30 w-[1440px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[28px] !p-[3px]">
          <div className="rounded-[25px] bg-[#081224]/98 p-7">
            <div className="mb-4 flex items-center justify-between border-b border-white/12 pb-4">
              <div>
                <span className="font-hud text-xs font-extrabold tracking-[0.24em] text-[#F7D58B] uppercase">
                  MATCH #{match.matchNumber} · OVER-BY-OVER COMPARISON
                </span>
                <h2 className="font-display text-5xl leading-none font-extrabold text-white">
                  MANHATTAN &amp; RUN WORM GRAPH
                </h2>
              </div>

              <div className="flex items-center gap-5">
                {t0 && inn0 && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: t0.primaryColor }}
                    />
                    <span className="font-display text-2xl font-extrabold text-white">
                      {t0.shortName}: {inn0.runs}/{inn0.wickets}
                    </span>
                  </div>
                )}
                {t1 && inn1 && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/5 px-4 py-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: t1.primaryColor }}
                    />
                    <span className="font-display text-2xl font-extrabold text-white">
                      {t1.shortName}: {inn1.runs}/{inn1.wickets}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const y = padT + plotH * (1 - frac);
                const val = Math.round(maxOverRuns * frac);
                return (
                  <g key={frac}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke="rgba(255,255,255,0.09)"
                    />
                    <text
                      x={padL - 12}
                      y={y + 4}
                      textAnchor="end"
                      fill="#94A3B8"
                      fontSize="12"
                      fontWeight="700"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Manhattan Bars per Over */}
              {Array.from({ length: overs }, (_, i) => i + 1).map((ovNum) => {
                const slotW = plotW / overs;
                const centerX = padL + (ovNum - 0.5) * slotW;
                const o0 = inn0?.overByOver.find((x) => x.overNumber === ovNum);
                const o1 = inn1?.overByOver.find((x) => x.overNumber === ovNum);
                const barW = Math.min(28, slotW * 0.34);

                return (
                  <g key={ovNum}>
                    {o0 && (
                      <>
                        <rect
                          x={centerX - barW - 2}
                          y={padT + plotH - (o0.runs / maxOverRuns) * plotH}
                          width={barW}
                          height={Math.max(4, (o0.runs / maxOverRuns) * plotH)}
                          rx="5"
                          fill={t0?.primaryColor || "#E5B85C"}
                          opacity="0.88"
                        />
                        {o0.wickets > 0 && (
                          <circle
                            cx={centerX - barW / 2 - 2}
                            cy={padT + plotH - (o0.runs / maxOverRuns) * plotH - 10}
                            r="7"
                            fill="#E03340"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        )}
                      </>
                    )}
                    {o1 && (
                      <>
                        <rect
                          x={centerX + 2}
                          y={padT + plotH - (o1.runs / maxOverRuns) * plotH}
                          width={barW}
                          height={Math.max(4, (o1.runs / maxOverRuns) * plotH)}
                          rx="5"
                          fill={t1?.primaryColor || "#38BDF8"}
                          opacity="0.92"
                        />
                        {o1.wickets > 0 && (
                          <circle
                            cx={centerX + barW / 2 + 2}
                            cy={padT + plotH - (o1.runs / maxOverRuns) * plotH - 10}
                            r="7"
                            fill="#E03340"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        )}
                      </>
                    )}
                    <text
                      x={centerX}
                      y={chartH - 14}
                      textAnchor="middle"
                      fill="#CBD5E1"
                      fontSize="13"
                      fontWeight="700"
                    >
                      OV {ovNum}
                    </text>
                  </g>
                );
              })}

              {/* Cumulative Worm Trend Lines */}
              {inn0 && (
                <path
                  d={buildWormPath(inn0)}
                  fill="none"
                  stroke={t0?.primaryColor || "#F7D58B"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 5"
                />
              )}
              {inn1 && (
                <path
                  d={buildWormPath(inn1)}
                  fill="none"
                  stroke={t1?.primaryColor || "#38BDF8"}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>

            <div className="font-hud mt-2 flex items-center justify-between text-xs font-bold tracking-wider text-slate-400 uppercase">
              <span>BARS = RUNS PER OVER · RED DOTS = WICKETS · LINES = CUMULATIVE SCORE WORM</span>
              <span>TKPL 2026 MATCH ANALYTICS</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. TKPL 2026 LIVE POINTS TABLE
  if (card === "points-table") {
    return (
      <div className="anim-pop-in absolute top-[120px] left-1/2 z-30 w-[1380px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[28px] !p-[3px]">
          <div className="rounded-[25px] bg-[#081224]/98 p-7">
            <div className="mb-5 flex items-center justify-between border-b border-white/12 pb-4">
              <div className="flex items-center gap-3">
                <Trophy size={42} className="text-[#E5B85C]" />
                <div>
                  <span className="font-hud text-xs font-extrabold tracking-[0.26em] text-[#F7D58B] uppercase">
                    TENNIS GURU LAZER RED HARD TENNIS BALL KADAPA PREMIER LEAGUE
                  </span>
                  <h2 className="font-display text-5xl leading-none font-extrabold text-white">
                    TKPL 2026 — OFFICIAL POINTS TABLE
                  </h2>
                </div>
              </div>
              <span className="font-hud rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold tracking-[0.2em] text-emerald-300 uppercase">
                TOP 4 QUALIFY FOR PLAYOFFS
              </span>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="font-hud border-b border-white/15 text-xs font-extrabold tracking-[0.2em] text-slate-400 uppercase">
                  <th className="py-2.5 pl-3">POS</th>
                  <th className="py-2.5">FRANCHISE</th>
                  <th className="py-2.5 text-center">PLAYED</th>
                  <th className="py-2.5 text-center">WON</th>
                  <th className="py-2.5 text-center">LOST</th>
                  <th className="py-2.5 text-center">NRR</th>
                  <th className="py-2.5 pr-4 text-right">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {report.pointsTable.map((row, i) => (
                  <tr
                    key={row.teamId}
                    className={
                      i < 4
                        ? "bg-gradient-to-r from-[#E5B85C]/[0.08] to-transparent"
                        : ""
                    }
                  >
                    <td className="font-display py-2.5 pl-3 text-3xl font-extrabold text-[#F7D58B]">
                      {i + 1}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3.5">
                        <TeamCrest
                          logo={row.logo}
                          name={row.teamName}
                          shortName={row.shortName}
                          color={row.primaryColor}
                          size={42}
                        />
                        <span className="text-xl font-extrabold text-white uppercase">
                          {row.teamName}
                        </span>
                      </div>
                    </td>
                    <td className="font-telemetry py-2.5 text-center text-lg font-bold text-slate-300">
                      {row.played}
                    </td>
                    <td className="font-telemetry py-2.5 text-center text-lg font-extrabold text-emerald-300">
                      {row.won}
                    </td>
                    <td className="font-telemetry py-2.5 text-center text-lg font-bold text-rose-300">
                      {row.lost}
                    </td>
                    <td className="font-telemetry py-2.5 text-center text-lg font-bold text-slate-200">
                      {row.nrrText}
                    </td>
                    <td className="font-display py-2.5 pr-4 text-right text-4xl font-extrabold text-[#F7D58B]">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 7. TOURNAMENT LEADERS (MOST SIXES, MOST FOURS, BIGGEST SIXES, TOP RUNS, TOP WICKETS)
  if (card === "tournament-leaders") {
    return (
      <div className="anim-pop-in absolute top-[120px] left-1/2 z-30 w-[1560px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[28px] !p-[3px]">
          <div className="rounded-[25px] bg-[#081224]/98 p-7">
            <div className="mb-5 flex items-center justify-between border-b border-white/12 pb-4">
              <div className="flex items-center gap-3">
                <Flame size={40} className="text-[#E03340]" />
                <div>
                  <span className="font-hud text-xs font-extrabold tracking-[0.26em] text-[#F7D58B] uppercase">
                    TKPL 2026 SEASON LEADERS
                  </span>
                  <h2 className="font-display text-5xl leading-none font-extrabold text-white">
                    SIXES, FOURS &amp; CHAMPIONSHIP CHARTS
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatChip label="TOURNAMENT 6s" value={String(report.totalSixes)} highlight />
                <StatChip label="TOURNAMENT 4s" value={String(report.totalFours)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* Column 1: MOST SIXES + BIGGEST SIXES */}
              <div className="rounded-2xl border border-[#E03340]/35 bg-[#050C18] p-4">
                <div className="font-hud mb-3 text-sm font-extrabold tracking-[0.2em] text-red-300 uppercase">
                  MOST SIXES (6s)
                </div>
                <div className="space-y-2.5">
                  {report.mostSixes.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Live stats populate as sixes are hit!
                    </div>
                  ) : (
                    report.mostSixes.slice(0, 5).map((p, idx) => (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="font-display w-5 text-xl font-extrabold text-[#F7D58B]">
                            {idx + 1}
                          </span>
                          <PlayerAvatar
                            photo={p.photo}
                            name={p.name}
                            accentColor={p.teamColor}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white uppercase">
                              {p.name}
                            </div>
                            <div className="font-hud text-[11px] font-bold text-slate-400">
                              {p.teamShort} {p.biggestSix > 0 ? `· BEST ${p.biggestSix}m` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="font-display text-3xl font-extrabold text-red-400">
                          {p.sixes}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: TOP RUN SCORERS & FOURS */}
              <div className="rounded-2xl border border-[#E5B85C]/35 bg-[#050C18] p-4">
                <div className="font-hud mb-3 text-sm font-extrabold tracking-[0.2em] text-[#F7D58B] uppercase">
                  TOP RUNS &amp; BOUNDARIES
                </div>
                <div className="space-y-2.5">
                  {report.topRuns.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Live stats populate as runs are scored!
                    </div>
                  ) : (
                    report.topRuns.slice(0, 5).map((p, idx) => (
                      <div
                        key={p.playerId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="font-display w-5 text-xl font-extrabold text-[#F7D58B]">
                            {idx + 1}
                          </span>
                          <PlayerAvatar
                            photo={p.photo}
                            name={p.name}
                            accentColor={p.teamColor}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white uppercase">
                              {p.name}
                            </div>
                            <div className="font-hud text-[11px] font-bold text-slate-400">
                              {p.teamShort} · {p.fours}×4 · {p.sixes}×6
                            </div>
                          </div>
                        </div>
                        <div className="font-display text-3xl font-extrabold text-[#F7D58B]">
                          {p.runs}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: BIGGEST SIXES DISTANCE LEADERBOARD */}
              <div className="rounded-2xl border border-orange-400/35 bg-[#050C18] p-4">
                <div className="font-hud mb-3 text-sm font-extrabold tracking-[0.2em] text-orange-300 uppercase">
                  BIGGEST SIXES (METERS)
                </div>
                <div className="space-y-2.5">
                  {report.biggestSixes.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Six distance records appear here!
                    </div>
                  ) : (
                    report.biggestSixes.slice(0, 5).map((rec, idx) => (
                      <div
                        key={`${rec.playerId}-${rec.meters}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="font-display w-5 text-xl font-extrabold text-orange-300">
                            {idx + 1}
                          </span>
                          <PlayerAvatar
                            photo={rec.playerPhoto}
                            name={rec.playerName}
                            accentColor={rec.teamColor}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-white uppercase">
                              {rec.playerName}
                            </div>
                            <div className="font-hud truncate text-[11px] font-bold text-slate-400">
                              {rec.teamShort} · {rec.zoneLabel}
                            </div>
                          </div>
                        </div>
                        <div className="font-display text-3xl font-extrabold text-orange-300">
                          {rec.meters}m
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 8. MATCH RESULT & MAN OF THE MATCH SHOWCASE
  if (card === "match-summary" && match) {
    const inn0 = computeInningsSummary(
      match.innings[0],
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    );
    const inn1 = computeInningsSummary(
      match.innings[1],
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    );
    const t0 = teams.find((t) => t.id === match.innings[0]?.battingTeamId);
    const t1 = teams.find((t) => t.id === match.innings[1]?.battingTeamId);
    const motm = findPlayerInTeams(teams, match.manOfTheMatchId);

    return (
      <div className="anim-pop-in absolute top-[125px] left-1/2 z-30 w-[1380px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[30px] !p-[3px]">
          <div className="rounded-[27px] bg-[#081224]/98 p-8">
            <div className="text-center">
              <span className="font-hud rounded-full border border-[#F7D58B]/45 bg-[#E5B85C]/15 px-4 py-1 text-xs font-extrabold tracking-[0.26em] text-[#F7D58B] uppercase">
                TKPL 2026 · MATCH #{match.matchNumber} OFFICIAL RESULT
              </span>
              <h2 className="font-display mt-2 text-6xl leading-none font-extrabold text-white uppercase">
                {match.resultSummary || "MATCH SUMMARY"}
              </h2>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-6">
              {[
                { team: t0, sum: inn0 },
                { team: t1, sum: inn1 },
              ].map(
                ({ team, sum }, i) =>
                  team &&
                  sum && (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/12 bg-white/[0.04] p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <TeamCrest
                            logo={team.logo}
                            name={team.name}
                            shortName={team.shortName}
                            color={team.primaryColor}
                            size={56}
                          />
                          <div>
                            <div className="font-display text-3xl font-extrabold text-white uppercase">
                              {team.name}
                            </div>
                            <div className="font-hud text-xs font-bold text-slate-400">
                              {sum.fours} FOURS · {sum.sixes} SIXES
                              {sum.biggestSixMeters > 0
                                ? ` · LONGEST ${sum.biggestSixMeters}m`
                                : ""}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-5xl font-extrabold text-[#F7D58B]">
                            {sum.runs}/{sum.wickets}
                          </div>
                          <div className="font-telemetry text-xs font-bold text-slate-300">
                            ({sum.oversText} ov)
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
              )}
            </div>

            {motm && (
              <div className="mt-6 flex items-center justify-center gap-6 rounded-2xl border border-[#E5B85C]/45 bg-gradient-to-r from-[#E5B85C]/18 via-[#0E1E38] to-[#E5B85C]/18 p-5">
                <Award size={48} className="text-[#F7D58B]" />
                <PlayerAvatar
                  photo={motm.player.photo}
                  name={motm.player.name}
                  accentColor="#F7D58B"
                  size={84}
                />
                <div>
                  <div className="font-hud text-xs font-extrabold tracking-[0.26em] text-[#F7D58B] uppercase">
                    PLAYER OF THE MATCH
                  </div>
                  <div className="font-display text-5xl leading-none font-extrabold text-white uppercase">
                    {motm.player.name}
                  </div>
                  <div className="font-hud text-sm font-bold text-slate-300 uppercase">
                    {motm.team.name}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function StatChip({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-1.5 ${
        highlight
          ? "border-[#E5B85C]/45 bg-[#E5B85C]/15"
          : "border-white/12 bg-white/[0.05]"
      }`}
    >
      <div className="font-hud text-[10px] font-bold tracking-[0.18em] text-slate-400 uppercase">
        {label}
      </div>
      <div
        className={`font-display text-2xl leading-none font-extrabold ${
          highlight ? "text-[#F7D58B]" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
