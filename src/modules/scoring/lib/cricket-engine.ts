import type {
  BallEvent,
  BatterStats,
  BowlerStats,
  BroadcastEffectTrigger,
  DismissalType,
  ExtraType,
  FallOfWicket,
  InningsComputedSummary,
  InningsState,
  MatchState,
  OverSummary,
  Player,
  Team,
} from "@/modules/core/types";

export function formatOvers(legalBalls: number): string {
  const completedOvers = Math.floor(legalBalls / 6);
  const rem = legalBalls % 6;
  return `${completedOvers}.${rem}`;
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0.00";
  return value.toFixed(2);
}

export function formatBallBadge(ball: BallEvent): string {
  if (ball.wicket) {
    if (ball.extraType === "wide") return "WD+W";
    if (ball.extraType === "noball") return "NB+W";
    if (ball.runsOffBat > 0) return `${ball.runsOffBat}+W`;
    return "W";
  }
  if (ball.extraType === "wide") {
    return ball.totalRuns > 1 ? `${ball.totalRuns}WD` : "WD";
  }
  if (ball.extraType === "noball") {
    return ball.runsOffBat > 0 ? `NB+${ball.runsOffBat}` : "NB";
  }
  if (ball.extraType === "bye") return `${ball.extraRuns}B`;
  if (ball.extraType === "legbye") return `${ball.extraRuns}LB`;
  return String(ball.runsOffBat);
}

/**
 * Estimates red hard-tennis-ball six flight distance from bat-to-ground hang time.
 * Calibrated for T10 tennis-ball trajectories (launch angle ~36-42 deg).
 */
export function estimateSixDistanceFromHangTime(
  hangSeconds: number,
  boundaryMeters: number,
): number {
  const clampedTime = Math.max(2.1, Math.min(6.2, hangSeconds));
  // Physics model with tennis ball air-drag correction:
  // v_y ≈ g*t/2, horizontal carry ≈ 19.6 * t + drag curve
  const rawMeters = Math.round(22 + clampedTime * 16.4 + Math.pow(clampedTime - 2, 1.35) * 3.1);
  return Math.max(boundaryMeters + 3, Math.min(118, rawMeters));
}

/**
 * Converts a normalized tap (dx, dy in [-1, 1], where circle radius 0.62 = boundary rope)
 * on the interactive mini stadium map into realistic meters, cricket fielding zone label, and angle.
 */
export function estimateSixDistanceFromGroundTap(
  dx: number,
  dy: number,
  boundaryMeters: number,
): { meters: number; zoneLabel: string; shotAngleDeg: number } {
  const distNorm = Math.hypot(dx, dy);
  // Boundary rope sits at radius 0.58 of the stadium graphic; outer ring = 1.0 (~boundary + 46m)
  const ropeRadius = 0.58;
  const extraRatio = Math.max(0.05, (distNorm - ropeRadius) / (1 - ropeRadius));
  const meters = Math.round(
    Math.max(boundaryMeters + 3, Math.min(116, boundaryMeters + 3 + extraRatio * 44)),
  );

  // Angle: 0 deg = straight down the ground (top, dy < 0), +90 = right (leg/off), etc.
  // Assuming standard broadcast camera view (batter at bottom facing upward, RHB):
  // Top = Straight / Long On-Off, Left = Off Side (Cover/Point), Right = Leg Side (Mid-Wicket/Square Leg)
  const angleRad = Math.atan2(dx, -dy);
  let deg = (angleRad * 180) / Math.PI;
  if (deg < 0) deg += 360;

  let zoneLabel = "STRAIGHT DOWN THE GROUND";
  if (deg >= 340 || deg < 20) zoneLabel = "STRAIGHT DOWN THE GROUND";
  else if (deg >= 20 && deg < 55) zoneLabel = "LONG ON";
  else if (deg >= 55 && deg < 95) zoneLabel = "COW CORNER / DEEP MID-WICKET";
  else if (deg >= 95 && deg < 135) zoneLabel = "DEEP SQUARE LEG";
  else if (deg >= 135 && deg < 175) zoneLabel = "FINE LEG";
  else if (deg >= 175 && deg < 205) zoneLabel = "OVER THE KEEPER";
  else if (deg >= 205 && deg < 245) zoneLabel = "THIRD MAN";
  else if (deg >= 245 && deg < 285) zoneLabel = "DEEP POINT / COVER";
  else if (deg >= 285 && deg < 318) zoneLabel = "EXTRA COVER";
  else zoneLabel = "LONG OFF";

  if (meters >= boundaryMeters + 34) {
    zoneLabel = `OUT OF THE GROUND · ${zoneLabel}`;
  }

  return {
    meters,
    zoneLabel,
    shotAngleDeg: Math.round(deg),
  };
}

export function findPlayerInTeams(
  teams: Team[],
  playerId?: string,
): { player: Player; team: Team } | null {
  if (!playerId) return null;
  for (const team of teams) {
    const player = team.players.find((p) => p.id === playerId);
    if (player) return { player, team };
  }
  return null;
}

function buildDismissalText(
  ball: BallEvent,
  playerLookup: Map<string, Player>,
): string {
  if (!ball.wicket) return "not out";
  const bowlerName = playerLookup.get(ball.bowlerId)?.name || "Bowler";
  const fielderName =
    ball.wicket.fielderName ||
    (ball.wicket.fielderId ? playerLookup.get(ball.wicket.fielderId)?.name : "");

  switch (ball.wicket.dismissalType) {
    case "bowled":
      return `b ${bowlerName}`;
    case "caught":
      return fielderName
        ? `c ${fielderName} b ${bowlerName}`
        : `c & b ${bowlerName}`;
    case "lbw":
      return `lbw b ${bowlerName}`;
    case "stumped":
      return fielderName
        ? `st ${fielderName} b ${bowlerName}`
        : `st b ${bowlerName}`;
    case "runout":
      return fielderName ? `run out (${fielderName})` : "run out";
    case "hitwicket":
      return `hit wicket b ${bowlerName}`;
    case "retired":
      return "retired hurt";
    default:
      return "out";
  }
}

export function computeInningsSummary(
  innings: InningsState | null,
  oversPerInnings: number,
  powerplayOvers: number,
  teams: Team[],
): InningsComputedSummary | null {
  if (!innings) return null;

  const battingTeam = teams.find((t) => t.id === innings.battingTeamId);
  const bowlingTeam = teams.find((t) => t.id === innings.bowlingTeamId);
  const playerMap = new Map<string, Player>();
  for (const t of [battingTeam, bowlingTeam]) {
    for (const p of t?.players || []) playerMap.set(p.id, p);
  }

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let fours = 0;
  let sixes = 0;
  let biggestSixMeters = 0;
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;

  const battingOrderIds: string[] = [];
  const ensureBatter = (id: string) => {
    if (id && !battingOrderIds.includes(id)) battingOrderIds.push(id);
  };
  for (const id of innings.battingOrder) ensureBatter(id);
  ensureBatter(innings.strikerId);
  ensureBatter(innings.nonStrikerId);

  const batterAcc = new Map<
    string,
    {
      runs: number;
      balls: number;
      fours: number;
      sixes: number;
      isOut: boolean;
      dismissalText: string;
      biggestSix: number;
    }
  >();
  const getBatter = (id: string) => {
    ensureBatter(id);
    if (!batterAcc.has(id)) {
      batterAcc.set(id, {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissalText: "not out",
        biggestSix: 0,
      });
    }
    return batterAcc.get(id)!;
  };
  if (innings.strikerId) getBatter(innings.strikerId);
  if (innings.nonStrikerId) getBatter(innings.nonStrikerId);

  const bowlingOrderIds: string[] = [];
  const ensureBowler = (id: string) => {
    if (id && !bowlingOrderIds.includes(id)) bowlingOrderIds.push(id);
  };
  for (const id of innings.bowlingOrder) ensureBowler(id);
  ensureBowler(innings.currentBowlerId);

  const bowlerAcc = new Map<
    string,
    {
      legalBalls: number;
      runsConceded: number;
      wickets: number;
      dots: number;
      foursConceded: number;
      sixesConceded: number;
      wides: number;
      noBalls: number;
      overRunsMap: Map<number, { runs: number; legal: number }>;
    }
  >();
  const getBowler = (id: string) => {
    ensureBowler(id);
    if (!bowlerAcc.has(id)) {
      bowlerAcc.set(id, {
        legalBalls: 0,
        runsConceded: 0,
        wickets: 0,
        dots: 0,
        foursConceded: 0,
        sixesConceded: 0,
        wides: 0,
        noBalls: 0,
        overRunsMap: new Map(),
      });
    }
    return bowlerAcc.get(id)!;
  };
  if (innings.currentBowlerId) getBowler(innings.currentBowlerId);

  const fallOfWickets: FallOfWicket[] = [];
  const overMap = new Map<number, OverSummary>();

  let partRuns = 0;
  let partBalls = 0;
  let partFours = 0;
  let partSixes = 0;

  let runningCumulative = 0;

  for (const ball of innings.balls) {
    runs += ball.totalRuns;
    runningCumulative += ball.totalRuns;
    if (ball.legalBall) legalBalls++;
    if (ball.isBoundaryFour) fours++;
    if (ball.isBoundarySix) {
      sixes++;
      if ((ball.sixDistanceMeters || 0) > biggestSixMeters) {
        biggestSixMeters = ball.sixDistanceMeters || 0;
      }
    }

    if (ball.extraType === "wide") wides += ball.extraRuns;
    if (ball.extraType === "noball") noBalls += ball.extraRuns;
    if (ball.extraType === "bye") byes += ball.extraRuns;
    if (ball.extraType === "legbye") legByes += ball.extraRuns;

    // Partnership
    partRuns += ball.totalRuns;
    if (ball.legalBall) partBalls++;
    if (ball.isBoundaryFour) partFours++;
    if (ball.isBoundarySix) partSixes++;

    // Batter update
    const bStat = getBatter(ball.strikerId);
    bStat.runs += ball.runsOffBat;
    // Wides do not count as a ball faced by the batter; No-balls DO count as a ball faced in cricket
    if (ball.extraType !== "wide") {
      bStat.balls += 1;
    }
    if (ball.isBoundaryFour) bStat.fours += 1;
    if (ball.isBoundarySix) {
      bStat.sixes += 1;
      if ((ball.sixDistanceMeters || 0) > bStat.biggestSix) {
        bStat.biggestSix = ball.sixDistanceMeters || 0;
      }
    }

    // Bowler update
    const bwStat = getBowler(ball.bowlerId);
    if (ball.legalBall) bwStat.legalBalls += 1;
    // Byes & leg-byes are NOT charged to the bowler
    const bowlerChargedRuns =
      ball.extraType === "bye" || ball.extraType === "legbye"
        ? 0
        : ball.totalRuns;
    bwStat.runsConceded += bowlerChargedRuns;
    if (ball.legalBall && bowlerChargedRuns === 0 && !ball.wicket) {
      bwStat.dots += 1;
    }
    if (ball.isBoundaryFour) bwStat.foursConceded += 1;
    if (ball.isBoundarySix) bwStat.sixesConceded += 1;
    if (ball.extraType === "wide") bwStat.wides += ball.extraRuns;
    if (ball.extraType === "noball") bwStat.noBalls += 1;

    const ovRec = bwStat.overRunsMap.get(ball.overNumber) || { runs: 0, legal: 0 };
    ovRec.runs += bowlerChargedRuns;
    if (ball.legalBall) ovRec.legal += 1;
    bwStat.overRunsMap.set(ball.overNumber, ovRec);

    // Over summary
    const overDisplayNum = ball.overNumber + 1;
    if (!overMap.has(overDisplayNum)) {
      overMap.set(overDisplayNum, {
        overNumber: overDisplayNum,
        runs: 0,
        wickets: 0,
        fours: 0,
        sixes: 0,
        cumulativeRuns: runningCumulative,
        bowlerId: ball.bowlerId,
        balls: [],
      });
    }
    const ovSummary = overMap.get(overDisplayNum)!;
    ovSummary.runs += ball.totalRuns;
    ovSummary.cumulativeRuns = runningCumulative;
    if (ball.isBoundaryFour) ovSummary.fours += 1;
    if (ball.isBoundarySix) ovSummary.sixes += 1;
    ovSummary.balls.push(ball);

    // Wicket handling
    if (ball.wicket) {
      if (ball.wicket.dismissalType !== "retired") {
        wickets += 1;
        ovSummary.wickets += 1;
        if (ball.wicket.bowlerCredited) {
          bwStat.wickets += 1;
        }
        const outBatter = getBatter(ball.wicket.outPlayerId);
        outBatter.isOut = true;
        outBatter.dismissalText = buildDismissalText(ball, playerMap);
        fallOfWickets.push({
          wicketNumber: wickets,
          score: runs,
          oversText: formatOvers(legalBalls),
          batterId: ball.wicket.outPlayerId,
          batterName: playerMap.get(ball.wicket.outPlayerId)?.name || "Batter",
        });
        partRuns = 0;
        partBalls = 0;
        partFours = 0;
        partSixes = 0;
      } else {
        const retBatter = getBatter(ball.wicket.outPlayerId);
        retBatter.dismissalText = "retired hurt";
      }
    }
  }

  // Current over balls
  const completedOversCount = Math.floor(legalBalls / 6);
  const currentOverIndex =
    legalBalls > 0 && legalBalls % 6 === 0 && innings.balls.length > 0
      ? innings.balls[innings.balls.length - 1].overNumber
      : completedOversCount;

  const isStartOfNewOver =
    legalBalls > 0 && legalBalls % 6 === 0 && innings.needsNextBowler;
  const activeOverBalls = innings.balls.filter(
    (b) => b.overNumber === (isStartOfNewOver ? completedOversCount - 1 : currentOverIndex),
  );
  const currentOverRuns = activeOverBalls.reduce((s, b) => s + b.totalRuns, 0);

  // Is Free Hit next? Walk back past any wides to see if previous delivery was a noball
  let isFreeHitNext = false;
  for (let i = innings.balls.length - 1; i >= 0; i--) {
    const b = innings.balls[i];
    if (b.extraType === "wide") continue;
    if (b.extraType === "noball") {
      isFreeHitNext = true;
    }
    break;
  }

  // Hat-trick detection: current bowler took wickets on their last 2 legal balls
  const currentBowlerLegal = innings.balls.filter(
    (b) => b.bowlerId === innings.currentBowlerId && b.legalBall,
  );
  const isHatTrickBall =
    currentBowlerLegal.length >= 2 &&
    Boolean(currentBowlerLegal[currentBowlerLegal.length - 1].wicket?.bowlerCredited) &&
    Boolean(currentBowlerLegal[currentBowlerLegal.length - 2].wicket?.bowlerCredited);

  // Last 12 legal balls
  let l12Runs = 0;
  let l12Wkts = 0;
  let l12Legal = 0;
  for (let i = innings.balls.length - 1; i >= 0 && l12Legal < 12; i--) {
    const b = innings.balls[i];
    l12Runs += b.totalRuns;
    if (b.wicket && b.wicket.dismissalType !== "retired") l12Wkts += 1;
    if (b.legalBall) l12Legal += 1;
  }

  const crr = legalBalls > 0 ? (runs * 6) / legalBalls : 0;
  const projectedScore =
    legalBalls > 0 ? Math.max(runs, Math.round(crr * oversPerInnings)) : oversPerInnings * 10;

  const battingCard: BatterStats[] = battingOrderIds.map((pid) => {
    const p = playerMap.get(pid);
    const st = batterAcc.get(pid) || {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      dismissalText: "not out",
      biggestSix: 0,
    };
    return {
      playerId: pid,
      name: p?.name || "Batter",
      photo: p?.photo || "",
      tag: p?.tag || "",
      runs: st.runs,
      balls: st.balls,
      fours: st.fours,
      sixes: st.sixes,
      strikeRate: st.balls > 0 ? (st.runs / st.balls) * 100 : 0,
      isOut: st.isOut,
      dismissalText: st.dismissalText,
      isStriker: pid === innings.strikerId && !st.isOut,
      isNonStriker: pid === innings.nonStrikerId && !st.isOut,
      biggestSix: st.biggestSix,
    };
  });

  const bowlingCard: BowlerStats[] = bowlingOrderIds.map((pid) => {
    const p = playerMap.get(pid);
    const st = bowlerAcc.get(pid) || {
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      dots: 0,
      foursConceded: 0,
      sixesConceded: 0,
      wides: 0,
      noBalls: 0,
      overRunsMap: new Map(),
    };
    let maidens = 0;
    for (const ov of st.overRunsMap.values()) {
      if (ov.legal === 6 && ov.runs === 0) maidens += 1;
    }
    return {
      playerId: pid,
      name: p?.name || "Bowler",
      photo: p?.photo || "",
      bowlingStyle: p?.bowlingStyle || "",
      legalBalls: st.legalBalls,
      oversText: formatOvers(st.legalBalls),
      maidens,
      runsConceded: st.runsConceded,
      wickets: st.wickets,
      economy: st.legalBalls > 0 ? (st.runsConceded * 6) / st.legalBalls : 0,
      dots: st.dots,
      foursConceded: st.foursConceded,
      sixesConceded: st.sixesConceded,
      wides: st.wides,
      noBalls: st.noBalls,
      isCurrent: pid === innings.currentBowlerId,
    };
  });

  let chase: InningsComputedSummary["chase"] = undefined;
  if (innings.inningsNumber === 2 && typeof innings.target === "number") {
    const totalMatchBalls = oversPerInnings * 6;
    const runsNeeded = Math.max(0, innings.target - runs);
    const ballsRemaining = Math.max(0, totalMatchBalls - legalBalls);
    const rrr = ballsRemaining > 0 ? (runsNeeded * 6) / ballsRemaining : runsNeeded > 0 ? 99 : 0;

    // Realistic T10 tennis-ball win probability model
    let battingWinPct = 50;
    if (runsNeeded === 0) {
      battingWinPct = 100;
    } else if (ballsRemaining === 0 || wickets >= 10) {
      battingWinPct = 0;
    } else {
      const wicketsInHand = Math.max(0, 10 - wickets);
      // T10 red-tennis-ball par chasing rate ~10.8 RPO
      const rateDiff = 10.8 - rrr;
      const wicketBoost = (wicketsInHand - 5) * 0.42;
      const pressurePenalty = ballsRemaining <= 12 && rrr > 14 ? (rrr - 14) * 0.3 : 0;
      const logit = rateDiff * 0.44 + wicketBoost - pressurePenalty;
      const rawPct = Math.round((1 / (1 + Math.exp(-logit))) * 100);
      battingWinPct = Math.max(4, Math.min(96, rawPct));
    }

    chase = {
      target: innings.target,
      runsNeeded,
      ballsRemaining,
      rrr,
      battingWinPct,
      bowlingWinPct: 100 - battingWinPct,
      isLastOverThriller: ballsRemaining <= 6 && runsNeeded > 0 && runsNeeded <= 24,
    };
  }

  return {
    runs,
    wickets,
    legalBalls,
    oversText: formatOvers(legalBalls),
    crr,
    projectedScore,
    fours,
    sixes,
    biggestSixMeters,
    extrasTotal: wides + noBalls + byes + legByes,
    extrasBreakdown: { wides, noBalls, byes, legByes },
    partnership: {
      runs: partRuns,
      balls: partBalls,
      fours: partFours,
      sixes: partSixes,
    },
    last12Balls: {
      runs: l12Runs,
      wickets: l12Wkts,
      balls: l12Legal,
    },
    currentOverBalls: activeOverBalls,
    currentOverRuns,
    isFreeHitNext,
    isPowerplay: completedOversCount < powerplayOvers,
    isHatTrickBall,
    battingCard,
    bowlingCard,
    fallOfWickets,
    overByOver: Array.from(overMap.values()).sort(
      (a, b) => a.overNumber - b.overNumber,
    ),
    chase,
  };
}

export interface RecordBallInput {
  runsOffBat: number;
  extraType: ExtraType;
  extraRuns?: number; // additional runs on wide/bye/legbye
  sixDistanceMeters?: number;
  sixZoneLabel?: string;
  shotAngleDeg?: number;
  wicket?: {
    dismissalType: DismissalType;
    outPlayerId?: string;
    fielderId?: string;
    fielderName?: string;
  };
}

export function recordBallDelivery(
  match: MatchState,
  teams: Team[],
  input: RecordBallInput,
): {
  match: MatchState;
  effect: BroadcastEffectTrigger | null;
} {
  const innIdx = match.currentInningsIndex;
  const currentInnings = match.innings[innIdx];
  if (!currentInnings || currentInnings.completed) {
    return { match, effect: null };
  }

  const prevSummary = computeInningsSummary(
    currentInnings,
    match.oversPerInnings,
    match.powerplayOvers,
    teams,
  )!;

  const isWide = input.extraType === "wide";
  const isNoBall = input.extraType === "noball";
  const isBye = input.extraType === "bye";
  const isLegBye = input.extraType === "legbye";
  const legalBall = !isWide && !isNoBall;

  const runsOffBat = isWide || isBye || isLegBye ? 0 : Math.max(0, input.runsOffBat);
  let extraRuns = 0;
  if (isWide || isNoBall) {
    extraRuns = 1 + Math.max(0, input.extraRuns ?? 0);
  } else if (isBye || isLegBye) {
    extraRuns = Math.max(1, input.extraRuns ?? input.runsOffBat);
  }

  const totalRuns = runsOffBat + extraRuns;
  const isBoundaryFour = runsOffBat === 4;
  const isBoundarySix = runsOffBat === 6;

  const overNumber = Math.floor(prevSummary.legalBalls / 6);
  const ballInOver = legalBall ? (prevSummary.legalBalls % 6) + 1 : 0;

  let wicketInfo: BallEvent["wicket"] = undefined;
  if (input.wicket) {
    const dType = input.wicket.dismissalType;
    const bowlerCredited = dType !== "runout" && dType !== "retired";
    wicketInfo = {
      dismissalType: dType,
      outPlayerId: input.wicket.outPlayerId || currentInnings.strikerId,
      fielderId: input.wicket.fielderId,
      fielderName: input.wicket.fielderName,
      bowlerCredited,
    };
  }

  const sixDistance = isBoundarySix
    ? input.sixDistanceMeters || match.boundaryDistanceMeters + 14
    : undefined;

  const ballEvent: BallEvent = {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sequence: currentInnings.balls.length + 1,
    overNumber,
    ballInOver,
    legalBall,
    strikerId: currentInnings.strikerId,
    nonStrikerId: currentInnings.nonStrikerId,
    bowlerId: currentInnings.currentBowlerId,
    runsOffBat,
    extraType: input.extraType,
    extraRuns,
    totalRuns,
    isBoundaryFour,
    isBoundarySix,
    sixDistanceMeters: sixDistance,
    sixZoneLabel: isBoundarySix
      ? input.sixZoneLabel || "OVER THE BOUNDARY"
      : undefined,
    shotAngleDeg: isBoundarySix ? input.shotAngleDeg ?? 35 : undefined,
    isFreeHitBall: prevSummary.isFreeHitNext,
    wicket: wicketInfo,
    prevStrikerId: currentInnings.strikerId,
    prevNonStrikerId: currentInnings.nonStrikerId,
    prevBowlerId: currentInnings.currentBowlerId,
    timestamp: new Date().toISOString(),
  };

  // Compute next strike state
  let nextStrikerId = currentInnings.strikerId;
  let nextNonStrikerId = currentInnings.nonStrikerId;

  // Running runs that cause batter crossing (runs off bat, or extra running runs on bye/legbye/wide/nb)
  const crossingRuns = isWide || isNoBall ? Math.max(0, input.extraRuns ?? 0) + runsOffBat : totalRuns;
  if (!isBoundaryFour && !isBoundarySix && crossingRuns % 2 === 1) {
    [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
  }

  const newLegalBalls = prevSummary.legalBalls + (legalBall ? 1 : 0);
  const overJustEnded = legalBall && newLegalBalls % 6 === 0;
  if (overJustEnded) {
    [nextStrikerId, nextNonStrikerId] = [nextNonStrikerId, nextStrikerId];
  }

  const nextBalls = [...currentInnings.balls, ballEvent];
  const updatedInnings: InningsState = {
    ...currentInnings,
    strikerId: nextStrikerId,
    nonStrikerId: nextNonStrikerId,
    lastOverBowlerId: overJustEnded
      ? currentInnings.currentBowlerId
      : currentInnings.lastOverBowlerId,
    battingOrder: Array.from(
      new Set([
        ...currentInnings.battingOrder,
        currentInnings.strikerId,
        currentInnings.nonStrikerId,
      ].filter(Boolean)),
    ),
    bowlingOrder: Array.from(
      new Set([
        ...currentInnings.bowlingOrder,
        currentInnings.currentBowlerId,
      ].filter(Boolean)),
    ),
    balls: nextBalls,
    needsNextBatter: Boolean(wicketInfo),
    needsNextBowler: overJustEnded,
  };

  const nextSummary = computeInningsSummary(
    updatedInnings,
    match.oversPerInnings,
    match.powerplayOvers,
    teams,
  )!;

  const maxBalls = match.oversPerInnings * 6;
  const allOut = nextSummary.wickets >= 10;
  const oversFinished = nextSummary.legalBalls >= maxBalls;
  const targetReached =
    updatedInnings.inningsNumber === 2 &&
    typeof updatedInnings.target === "number" &&
    nextSummary.runs >= updatedInnings.target;

  if (allOut || oversFinished || targetReached) {
    updatedInnings.completed = true;
    updatedInnings.needsNextBatter = false;
    updatedInnings.needsNextBowler = false;
  }

  const nextInningsTuple: [InningsState | null, InningsState | null] = [
    innIdx === 0 ? updatedInnings : match.innings[0],
    innIdx === 1 ? updatedInnings : match.innings[1],
  ];

  let nextStatus = match.status;
  let winnerTeamId = match.winnerTeamId;
  let resultSummary = match.resultSummary;

  if (updatedInnings.completed) {
    if (innIdx === 0) {
      nextStatus = "innings-break";
    } else {
      nextStatus = "completed";
      const inn1 = computeInningsSummary(
        nextInningsTuple[0],
        match.oversPerInnings,
        match.powerplayOvers,
        teams,
      );
      const team1 = teams.find((t) => t.id === nextInningsTuple[0]?.battingTeamId);
      const team2 = teams.find((t) => t.id === updatedInnings.battingTeamId);
      if (inn1) {
        if (nextSummary.runs > inn1.runs) {
          winnerTeamId = team2?.id;
          const wktsLeft = 10 - nextSummary.wickets;
          const ballsLeft = maxBalls - nextSummary.legalBalls;
          resultSummary = `${team2?.name || "Chasing Team"} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"} (${ballsLeft} ball${ballsLeft === 1 ? "" : "s"} left)`;
        } else if (nextSummary.runs < inn1.runs) {
          winnerTeamId = team1?.id;
          const margin = inn1.runs - nextSummary.runs;
          resultSummary = `${team1?.name || "Defending Team"} won by ${margin} run${margin === 1 ? "" : "s"}`;
        } else {
          winnerTeamId = undefined;
          resultSummary = "MATCH TIED!";
        }
      }
    }
  }

  const updatedMatch: MatchState = {
    ...match,
    innings: nextInningsTuple,
    status: nextStatus,
    winnerTeamId,
    resultSummary,
    updatedAt: new Date().toISOString(),
  };

  // Determine automatic Broadcast TV Effect trigger
  const now = Date.now();
  const strikerStatBefore = prevSummary.battingCard.find(
    (b) => b.playerId === ballEvent.strikerId,
  );
  const strikerStatAfter = nextSummary.battingCard.find(
    (b) => b.playerId === ballEvent.strikerId,
  );
  const bowlerStatAfter = nextSummary.bowlingCard.find(
    (b) => b.playerId === ballEvent.bowlerId,
  );

  let effect: BroadcastEffectTrigger | null = null;

  if (updatedMatch.status === "completed") {
    effect = {
      id: now,
      type: "match-win",
      title: winnerTeamId
        ? `${teams.find((t) => t.id === winnerTeamId)?.name.toUpperCase()} WIN!`
        : "MATCH TIED!",
      subtitle: resultSummary,
      badge: `${match.stage.toUpperCase()} · MATCH ${match.matchNumber}`,
      teamId: winnerTeamId,
      durationMs: 7500,
      triggeredAt: now,
    };
  } else if (wicketInfo) {
    const outStat = nextSummary.battingCard.find(
      (b) => b.playerId === wicketInfo.outPlayerId,
    );
    const prevBowlerBalls = currentInnings.balls.filter(
      (b) => b.bowlerId === ballEvent.bowlerId && b.legalBall,
    );
    const isHatTrick =
      wicketInfo.bowlerCredited &&
      prevBowlerBalls.length >= 2 &&
      Boolean(prevBowlerBalls[prevBowlerBalls.length - 1].wicket?.bowlerCredited) &&
      Boolean(prevBowlerBalls[prevBowlerBalls.length - 2].wicket?.bowlerCredited);

    if (isHatTrick) {
      effect = {
        id: now,
        type: "hat-trick",
        title: "HAT-TRICK!",
        subtitle: `${bowlerStatAfter?.name || "Bowler"} · ${bowlerStatAfter?.wickets}-${bowlerStatAfter?.runsConceded} (${bowlerStatAfter?.oversText})`,
        badge: "3 IN 3 BALLS!",
        playerId: ballEvent.bowlerId,
        teamId: currentInnings.bowlingTeamId,
        durationMs: 6500,
        triggeredAt: now,
      };
    } else {
      effect = {
        id: now,
        type: "wicket",
        title: "WICKET!",
        subtitle: outStat?.name || "Batter",
        badge: wicketInfo.dismissalType.toUpperCase(),
        playerId: wicketInfo.outPlayerId,
        teamId: currentInnings.battingTeamId,
        statLine: outStat
          ? `${outStat.runs} (${outStat.balls}) · ${outStat.fours}×4 · ${outStat.sixes}×6 · ${outStat.dismissalText}`
          : "",
        durationMs: 5600,
        triggeredAt: now,
      };
    }
  } else if (isBoundarySix) {
    const prevRuns = strikerStatBefore?.runs ?? 0;
    const afterRuns = strikerStatAfter?.runs ?? 0;
    const milestoneBadge =
      prevRuns < 100 && afterRuns >= 100
        ? "CENTURY SIX!"
        : prevRuns < 50 && afterRuns >= 50
          ? "FIFTY UP WITH A SIX!"
          : prevRuns < 30 && afterRuns >= 30
            ? "30+ IMPACT KNOCK!"
            : `INNINGS SIX #${nextSummary.sixes}`;

    effect = {
      id: now,
      type: "six",
      title: "MAXIMUM SIX!",
      subtitle: strikerStatAfter?.name || "Batter",
      badge: milestoneBadge,
      playerId: ballEvent.strikerId,
      teamId: currentInnings.battingTeamId,
      meters: sixDistance,
      zoneLabel: ballEvent.sixZoneLabel,
      shotAngleDeg: ballEvent.shotAngleDeg,
      statLine: strikerStatAfter
        ? `${strikerStatAfter.runs}* (${strikerStatAfter.balls}) · ${strikerStatAfter.fours}×4 · ${strikerStatAfter.sixes}×6`
        : "",
      durationMs: 5800,
      triggeredAt: now,
    };
  } else if (isBoundaryFour) {
    const prevRuns = strikerStatBefore?.runs ?? 0;
    const afterRuns = strikerStatAfter?.runs ?? 0;
    const milestoneTag =
      prevRuns < 50 && afterRuns >= 50
        ? "HALF-CENTURY!"
        : `INNINGS FOUR #${nextSummary.fours}`;

    effect = {
      id: now,
      type: "four",
      title: "CRACKING FOUR!",
      subtitle: strikerStatAfter?.name || "Batter",
      badge: milestoneTag,
      playerId: ballEvent.strikerId,
      teamId: currentInnings.battingTeamId,
      statLine: strikerStatAfter
        ? `${strikerStatAfter.runs}* (${strikerStatAfter.balls}) · ${strikerStatAfter.fours}×4 · ${strikerStatAfter.sixes}×6`
        : "",
      durationMs: 4200,
      triggeredAt: now,
    };
  } else if (isNoBall) {
    effect = {
      id: now,
      type: "free-hit",
      title: "NO BALL · FREE HIT!",
      subtitle: "NEXT DELIVERY IS A FREE HIT",
      badge: "FREE HIT ALERT",
      teamId: currentInnings.battingTeamId,
      durationMs: 4000,
      triggeredAt: now,
    };
  } else if (strikerStatBefore && strikerStatAfter) {
    if (strikerStatBefore.runs < 50 && strikerStatAfter.runs >= 50) {
      effect = {
        id: now,
        type: "milestone",
        title: "HALF-CENTURY! 50",
        subtitle: strikerStatAfter.name,
        badge: "TKPL MILESTONE",
        playerId: ballEvent.strikerId,
        teamId: currentInnings.battingTeamId,
        statLine: `${strikerStatAfter.runs}* (${strikerStatAfter.balls}) · ${strikerStatAfter.fours}×4 · ${strikerStatAfter.sixes}×6 · SR ${strikerStatAfter.strikeRate.toFixed(0)}`,
        durationMs: 6000,
        triggeredAt: now,
      };
    } else if (strikerStatBefore.runs < 30 && strikerStatAfter.runs >= 30 && match.oversPerInnings <= 10) {
      effect = {
        id: now,
        type: "milestone",
        title: "30+ BLASTER!",
        subtitle: strikerStatAfter.name,
        badge: "T10 IMPACT KNOCK",
        playerId: ballEvent.strikerId,
        teamId: currentInnings.battingTeamId,
        statLine: `${strikerStatAfter.runs}* (${strikerStatAfter.balls}) · ${strikerStatAfter.fours}×4 · ${strikerStatAfter.sixes}×6`,
        durationMs: 4800,
        triggeredAt: now,
      };
    }
  }

  return { match: updatedMatch, effect };
}

export function undoLastBallDelivery(match: MatchState): MatchState {
  const innIdx = match.currentInningsIndex;
  const currentInnings = match.innings[innIdx];
  if (!currentInnings || currentInnings.balls.length === 0) {
    return match;
  }

  const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
  const remainingBalls = currentInnings.balls.slice(0, -1);

  const restoredInnings: InningsState = {
    ...currentInnings,
    strikerId: lastBall.prevStrikerId,
    nonStrikerId: lastBall.prevNonStrikerId,
    currentBowlerId: lastBall.prevBowlerId,
    balls: remainingBalls,
    completed: false,
    needsNextBatter: false,
    needsNextBowler: false,
  };

  const nextInnings: [InningsState | null, InningsState | null] = [
    innIdx === 0 ? restoredInnings : match.innings[0],
    innIdx === 1 ? restoredInnings : match.innings[1],
  ];

  return {
    ...match,
    innings: nextInnings,
    status: "live",
    winnerTeamId: undefined,
    resultSummary: undefined,
    updatedAt: new Date().toISOString(),
  };
}
