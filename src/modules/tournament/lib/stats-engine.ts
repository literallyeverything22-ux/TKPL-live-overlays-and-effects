import type { MatchState, Player, Team } from "@/modules/core/types";
import { computeInningsSummary } from "@/modules/scoring/lib/cricket-engine";

export interface PointsTableRow {
  teamId: string;
  teamName: string;
  shortName: string;
  logo: string;
  primaryColor: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
  nrrText: string;
  runsFor: number;
  ballsFor: number;
  runsAgainst: number;
  ballsAgainst: number;
}

export interface PlayerTournamentStat {
  playerId: string;
  name: string;
  photo: string;
  teamId: string;
  teamShort: string;
  teamColor: string;
  teamLogo: string;
  matches: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  biggestSix: number;
  wickets: number;
  runsConceded: number;
  ballsBowled: number;
  strikeRate: number;
  economy: number;
}

export interface BiggestSixRecord {
  meters: number;
  zoneLabel: string;
  playerId: string;
  playerName: string;
  playerPhoto: string;
  teamShort: string;
  teamColor: string;
  matchNumber: number;
}

export interface TournamentStatsReport {
  totalMatchesCompleted: number;
  totalMatchesTracked: number;
  totalSixes: number;
  totalFours: number;
  totalRuns: number;
  totalWickets: number;
  pointsTable: PointsTableRow[];
  topRuns: PlayerTournamentStat[];
  topWickets: PlayerTournamentStat[];
  mostSixes: PlayerTournamentStat[];
  mostFours: PlayerTournamentStat[];
  biggestSixes: BiggestSixRecord[];
}

export function computeTournamentStats(
  teams: Team[],
  matches: MatchState[],
): TournamentStatsReport {
  const teamMap = new Map<string, Team>();
  const playerTeamMap = new Map<string, { player: Player; team: Team }>();
  for (const team of teams) {
    teamMap.set(team.id, team);
    for (const p of team.players) {
      playerTeamMap.set(p.id, { player: p, team });
    }
  }

  const ptsAcc = new Map<string, PointsTableRow>();
  for (const team of teams) {
    ptsAcc.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName,
      logo: team.logo,
      primaryColor: team.primaryColor,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      nrr: 0,
      nrrText: "0.000",
      runsFor: 0,
      ballsFor: 0,
      runsAgainst: 0,
      ballsAgainst: 0,
    });
  }

  const playerAcc = new Map<string, PlayerTournamentStat & { matchSet: Set<string> }>();
  const ensurePlayerStat = (pid: string) => {
    if (!playerAcc.has(pid)) {
      const ref = playerTeamMap.get(pid);
      playerAcc.set(pid, {
        playerId: pid,
        name: ref?.player.name || "Player",
        photo: ref?.player.photo || "",
        teamId: ref?.team.id || "",
        teamShort: ref?.team.shortName || "TKPL",
        teamColor: ref?.team.primaryColor || "#E5B85C",
        teamLogo: ref?.team.logo || "",
        matches: 0,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        biggestSix: 0,
        wickets: 0,
        runsConceded: 0,
        ballsBowled: 0,
        strikeRate: 0,
        economy: 0,
        matchSet: new Set(),
      });
    }
    return playerAcc.get(pid)!;
  };

  let totalMatchesCompleted = 0;
  let totalSixes = 0;
  let totalFours = 0;
  let totalRuns = 0;
  let totalWickets = 0;
  const biggestSixes: BiggestSixRecord[] = [];

  for (const match of matches) {
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

    // Aggregate batting, bowling, and boundary stats from both live and completed matches
    for (const [idx, summary] of [inn0, inn1].entries()) {
      const rawInnings = match.innings[idx as 0 | 1];
      if (!summary || !rawInnings) continue;
      totalSixes += summary.sixes;
      totalFours += summary.fours;
      totalRuns += summary.runs;
      totalWickets += summary.wickets;

      for (const b of summary.battingCard) {
        if (b.balls === 0 && b.runs === 0 && !b.isOut) continue;
        const ps = ensurePlayerStat(b.playerId);
        ps.matchSet.add(match.id);
        ps.runs += b.runs;
        ps.ballsFaced += b.balls;
        ps.fours += b.fours;
        ps.sixes += b.sixes;
        if (b.biggestSix > ps.biggestSix) ps.biggestSix = b.biggestSix;
      }

      for (const bw of summary.bowlingCard) {
        if (bw.legalBalls === 0 && bw.runsConceded === 0 && bw.wickets === 0) continue;
        const ps = ensurePlayerStat(bw.playerId);
        ps.matchSet.add(match.id);
        ps.wickets += bw.wickets;
        ps.runsConceded += bw.runsConceded;
        ps.ballsBowled += bw.legalBalls;
      }

      for (const ball of rawInnings.balls) {
        if (ball.isBoundarySix && ball.sixDistanceMeters) {
          const ref = playerTeamMap.get(ball.strikerId);
          biggestSixes.push({
            meters: ball.sixDistanceMeters,
            zoneLabel: ball.sixZoneLabel || "MASSIVE SIX",
            playerId: ball.strikerId,
            playerName: ref?.player.name || "Batter",
            playerPhoto: ref?.player.photo || "",
            teamShort: ref?.team.shortName || "TKPL",
            teamColor: ref?.team.primaryColor || "#E5B85C",
            matchNumber: match.matchNumber,
          });
        }
      }
    }

    // Points table updates for completed matches
    if (match.status === "completed" && inn0 && inn1 && match.innings[0] && match.innings[1]) {
      totalMatchesCompleted++;
      const t1Row = ptsAcc.get(match.innings[0].battingTeamId);
      const t2Row = ptsAcc.get(match.innings[1].battingTeamId);
      if (t1Row && t2Row) {
        const maxBalls = match.oversPerInnings * 6;
        const t1Balls = inn0.wickets >= 10 ? maxBalls : Math.max(1, inn0.legalBalls);
        const t2Balls = inn1.wickets >= 10 ? maxBalls : Math.max(1, inn1.legalBalls);

        t1Row.played += 1;
        t2Row.played += 1;
        t1Row.runsFor += inn0.runs;
        t1Row.ballsFor += t1Balls;
        t1Row.runsAgainst += inn1.runs;
        t1Row.ballsAgainst += t2Balls;

        t2Row.runsFor += inn1.runs;
        t2Row.ballsFor += t2Balls;
        t2Row.runsAgainst += inn0.runs;
        t2Row.ballsAgainst += t1Balls;

        if (match.winnerTeamId === t1Row.teamId) {
          t1Row.won += 1;
          t1Row.points += 2;
          t2Row.lost += 1;
        } else if (match.winnerTeamId === t2Row.teamId) {
          t2Row.won += 1;
          t2Row.points += 2;
          t1Row.lost += 1;
        } else {
          t1Row.tied += 1;
          t2Row.tied += 1;
          t1Row.points += 1;
          t2Row.points += 1;
        }
      }
    }
  }

  const pointsTable = Array.from(ptsAcc.values())
    .map((row) => {
      const nrr =
        row.ballsFor > 0 && row.ballsAgainst > 0
          ? (row.runsFor * 6) / row.ballsFor - (row.runsAgainst * 6) / row.ballsAgainst
          : 0;
      const rounded = Math.round(nrr * 1000) / 1000;
      const nrrText = `${rounded >= 0 ? "+" : ""}${rounded.toFixed(3)}`;
      return { ...row, nrr: rounded, nrrText };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.nrr - a.nrr ||
        b.won - a.won ||
        a.teamName.localeCompare(b.teamName),
    );

  const finalizedPlayers: PlayerTournamentStat[] = Array.from(playerAcc.values()).map(
    ({ matchSet, ...rest }) => ({
      ...rest,
      matches: matchSet.size,
      strikeRate: rest.ballsFaced > 0 ? (rest.runs / rest.ballsFaced) * 100 : 0,
      economy: rest.ballsBowled > 0 ? (rest.runsConceded * 6) / rest.ballsBowled : 0,
    }),
  );

  return {
    totalMatchesCompleted,
    totalMatchesTracked: matches.length,
    totalSixes,
    totalFours,
    totalRuns,
    totalWickets,
    pointsTable,
    topRuns: [...finalizedPlayers]
      .filter((p) => p.runs > 0)
      .sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)
      .slice(0, 8),
    topWickets: [...finalizedPlayers]
      .filter((p) => p.wickets > 0)
      .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)
      .slice(0, 8),
    mostSixes: [...finalizedPlayers]
      .filter((p) => p.sixes > 0)
      .sort((a, b) => b.sixes - a.sixes || b.biggestSix - a.biggestSix)
      .slice(0, 8),
    mostFours: [...finalizedPlayers]
      .filter((p) => p.fours > 0)
      .sort((a, b) => b.fours - a.fours || b.runs - a.runs)
      .slice(0, 8),
    biggestSixes: biggestSixes.sort((a, b) => b.meters - a.meters).slice(0, 6),
  };
}
