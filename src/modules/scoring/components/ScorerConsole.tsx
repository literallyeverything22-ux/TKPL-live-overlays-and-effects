import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Award,
  Flame,
  Flag,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Tv,
  UserPlus,
  X,
} from "lucide-react";
import type {
  BroadcastEffectTrigger,
  BroadcastState,
  DismissalType,
  ExtraType,
  InningsState,
  MatchState,
  OverlayActiveCard,
  Team,
} from "@/modules/core/types";
import {
  computeInningsSummary,
  estimateSixDistanceFromGroundTap,
  estimateSixDistanceFromHangTime,
  formatBallBadge,
  formatRate,
  recordBallDelivery,
  undoLastBallDelivery,
  type RecordBallInput,
} from "@/modules/scoring/lib/cricket-engine";
import {
  PlayerAvatar,
  RedTennisBallIcon,
  TeamCrest,
} from "@/modules/core/components/BrandMedia";

interface ScorerConsoleProps {
  state: BroadcastState;
  match: MatchState;
  onUpdateMatch: (
    nextMatch: MatchState,
    effect?: BroadcastEffectTrigger | null,
    overlayPatch?: Partial<BroadcastState["overlay"]>,
  ) => void;
  onQuickShowCard: (
    card: OverlayActiveCard,
    extra?: Partial<BroadcastState["overlay"]>,
  ) => void;
}

const DISMISSALS: { value: DismissalType; label: string }[] = [
  { value: "caught", label: "Caught" },
  { value: "bowled", label: "Bowled" },
  { value: "runout", label: "Run Out" },
  { value: "lbw", label: "LBW" },
  { value: "stumped", label: "Stumped" },
  { value: "hitwicket", label: "Hit Wicket" },
  { value: "retired", label: "Retired Hurt" },
];

export function ScorerConsole({
  state,
  match,
  onUpdateMatch,
  onQuickShowCard,
}: ScorerConsoleProps) {
  const teams = state.teams;
  const innIdx = match.currentInningsIndex;
  const currentInnings = match.innings[innIdx];
  const summary = useMemo(
    () =>
      computeInningsSummary(
        currentInnings,
        match.oversPerInnings,
        match.powerplayOvers,
        teams,
      ),
    [currentInnings, match.oversPerInnings, match.powerplayOvers, teams],
  );

  const battingTeam = teams.find((t) => t.id === currentInnings?.battingTeamId);
  const bowlingTeam = teams.find((t) => t.id === currentInnings?.bowlingTeamId);

  const battingXI = useMemo(() => {
    if (!battingTeam) return [];
    const xiIds =
      battingTeam.id === match.teamAId ? match.teamAXI : match.teamBXI;
    const filtered = battingTeam.players.filter((p) => xiIds.includes(p.id));
    return filtered.length > 0 ? filtered : battingTeam.players;
  }, [battingTeam, match]);

  const bowlingXI = useMemo(() => {
    if (!bowlingTeam) return [];
    const xiIds =
      bowlingTeam.id === match.teamAId ? match.teamAXI : match.teamBXI;
    const filtered = bowlingTeam.players.filter((p) => xiIds.includes(p.id));
    return filtered.length > 0 ? filtered : bowlingTeam.players;
  }, [bowlingTeam, match]);

  // Extra modifier bar (Wide / No-Ball / Bye / Leg-Bye)
  const [pendingExtra, setPendingExtra] = useState<ExtraType>("none");

  // Six Distance Studio Drawer state
  const [sixModalOpen, setSixModalOpen] = useState(false);
  const [sixMeters, setSixMeters] = useState(match.boundaryDistanceMeters + 18);
  const [sixZone, setSixZone] = useState("DEEP MID-WICKET");
  const [sixAngle, setSixAngle] = useState(65);
  const [tapDot, setTapDot] = useState<{ x: number; y: number } | null>({
    x: 158,
    y: 44,
  });
  const [hangTimerStart, setHangTimerStart] = useState<number | null>(null);
  const [hangElapsed, setHangElapsed] = useState<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Wicket Drawer state
  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [dismissalType, setDismissalType] = useState<DismissalType>("caught");
  const [outBatterChoice, setOutBatterChoice] = useState<"striker" | "nonStriker">("striker");
  const [fielderId, setFielderId] = useState("");
  const [wicketRuns, setWicketRuns] = useState(0);

  // New Batter / New Bowler Modals
  const [pickBatterOpen, setPickBatterOpen] = useState(false);
  const [pickBowlerOpen, setPickBowlerOpen] = useState(false);
  const [flashNewPlayerCard, setFlashNewPlayerCard] = useState(true);

  // 2nd Innings Setup state
  const [inn2Striker, setInn2Striker] = useState("");
  const [inn2NonStriker, setInn2NonStriker] = useState("");
  const [inn2Bowler, setInn2Bowler] = useState("");

  // Auto-open Next Batter / Next Bowler prompts when needed
  useEffect(() => {
    if (currentInnings?.needsNextBatter && !currentInnings.completed) {
      setPickBatterOpen(true);
    }
  }, [currentInnings?.needsNextBatter, currentInnings?.completed]);

  useEffect(() => {
    if (
      currentInnings?.needsNextBowler &&
      !currentInnings?.needsNextBatter &&
      !currentInnings.completed
    ) {
      setPickBowlerOpen(true);
    }
  }, [
    currentInnings?.needsNextBowler,
    currentInnings?.needsNextBatter,
    currentInnings?.completed,
  ]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, []);

  const strikerStat = summary?.battingCard.find((b) => b.isStriker);
  const nonStrikerStat = summary?.battingCard.find((b) => b.isNonStriker);
  const bowlerStat = summary?.bowlingCard.find((b) => b.isCurrent);

  const outPlayerIds = useMemo(
    () =>
      new Set(
        (summary?.battingCard || [])
          .filter((b) => b.isOut)
          .map((b) => b.playerId),
      ),
    [summary],
  );

  const availableNextBatters = useMemo(
    () =>
      battingXI.filter(
        (p) =>
          !outPlayerIds.has(p.id) &&
          p.id !== currentInnings?.strikerId &&
          p.id !== currentInnings?.nonStrikerId,
      ),
    [battingXI, outPlayerIds, currentInnings],
  );

  const commitDelivery = (input: RecordBallInput) => {
    const { match: nextMatch, effect } = recordBallDelivery(match, teams, input);
    setPendingExtra("none");
    onUpdateMatch(nextMatch, effect);
  };

  const handleRunPress = (runs: number) => {
    if (runs === 6 && pendingExtra !== "wide" && pendingExtra !== "bye" && pendingExtra !== "legbye") {
      setSixMeters(match.boundaryDistanceMeters + 20);
      setHangTimerStart(null);
      setHangElapsed(null);
      setSixModalOpen(true);
      return;
    }

    if (pendingExtra === "wide") {
      commitDelivery({ runsOffBat: 0, extraType: "wide", extraRuns: runs });
    } else if (pendingExtra === "noball") {
      commitDelivery({ runsOffBat: runs, extraType: "noball", extraRuns: 0 });
    } else if (pendingExtra === "bye" || pendingExtra === "legbye") {
      commitDelivery({
        runsOffBat: 0,
        extraType: pendingExtra,
        extraRuns: Math.max(1, runs),
      });
    } else {
      commitDelivery({ runsOffBat: runs, extraType: "none" });
    }
  };

  const handleStadiumTap = (evt: React.MouseEvent<SVGSVGElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * 240;
    const py = ((evt.clientY - rect.top) / rect.height) * 240;
    const dx = (px - 120) / 110;
    const dy = (py - 120) / 110;
    const est = estimateSixDistanceFromGroundTap(
      dx,
      dy,
      match.boundaryDistanceMeters,
    );
    setTapDot({ x: px, y: py });
    setSixMeters(est.meters);
    setSixZone(est.zoneLabel);
    setSixAngle(est.shotAngleDeg);
  };

  const handleHangTimeToggle = () => {
    if (hangTimerStart === null) {
      const start = performance.now();
      setHangTimerStart(start);
      setHangElapsed(0);
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setHangElapsed((performance.now() - start) / 1000);
      }, 45);
    } else {
      const elapsedSec = (performance.now() - hangTimerStart) / 1000;
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setHangTimerStart(null);
      setHangElapsed(elapsedSec);
      const calcMeters = estimateSixDistanceFromHangTime(
        elapsedSec,
        match.boundaryDistanceMeters,
      );
      setSixMeters(calcMeters);
      setSixZone(
        calcMeters >= match.boundaryDistanceMeters + 32
          ? "MONSTER HANG-TIME SIX!"
          : "TOWERING MAXIMUM!",
      );
    }
  };

  const handleConfirmSix = () => {
    setSixModalOpen(false);
    commitDelivery({
      runsOffBat: 6,
      extraType: pendingExtra === "noball" ? "noball" : "none",
      extraRuns: 0,
      sixDistanceMeters: sixMeters,
      sixZoneLabel: sixZone,
      shotAngleDeg: sixAngle,
    });
  };

  const handleConfirmWicket = () => {
    if (!currentInnings) return;
    const outId =
      outBatterChoice === "nonStriker"
        ? currentInnings.nonStrikerId
        : currentInnings.strikerId;
    const fielder = bowlingXI.find((p) => p.id === fielderId);
    setWicketModalOpen(false);
    commitDelivery({
      runsOffBat: dismissalType === "runout" ? wicketRuns : 0,
      extraType: pendingExtra,
      extraRuns: 0,
      wicket: {
        dismissalType,
        outPlayerId: outId,
        fielderId: fielder?.id,
        fielderName: fielder?.name,
      },
    });
    setFielderId("");
    setWicketRuns(0);
  };

  const handleSelectNextBatter = (playerId: string) => {
    if (!currentInnings) return;
    const lastBall = currentInnings.balls[currentInnings.balls.length - 1];
    const wasOutId = lastBall?.wicket?.outPlayerId;

    let nextStriker = currentInnings.strikerId;
    let nextNonStriker = currentInnings.nonStrikerId;
    if (wasOutId === currentInnings.nonStrikerId) {
      nextNonStriker = playerId;
    } else {
      nextStriker = playerId;
    }

    const updatedInnings: InningsState = {
      ...currentInnings,
      strikerId: nextStriker,
      nonStrikerId: nextNonStriker,
      battingOrder: Array.from(new Set([...currentInnings.battingOrder, playerId])),
      needsNextBatter: false,
    };

    const nextInnings: [InningsState | null, InningsState | null] = [
      innIdx === 0 ? updatedInnings : match.innings[0],
      innIdx === 1 ? updatedInnings : match.innings[1],
    ];

    setPickBatterOpen(false);
    onUpdateMatch(
      { ...match, innings: nextInnings, updatedAt: new Date().toISOString() },
      null,
      flashNewPlayerCard
        ? { activeCard: "new-batter", spotlightPlayerId: playerId }
        : undefined,
    );
  };

  const handleSelectNextBowler = (playerId: string) => {
    if (!currentInnings) return;
    const updatedInnings: InningsState = {
      ...currentInnings,
      currentBowlerId: playerId,
      bowlingOrder: Array.from(new Set([...currentInnings.bowlingOrder, playerId])),
      needsNextBowler: false,
    };
    const nextInnings: [InningsState | null, InningsState | null] = [
      innIdx === 0 ? updatedInnings : match.innings[0],
      innIdx === 1 ? updatedInnings : match.innings[1],
    ];
    setPickBowlerOpen(false);
    onUpdateMatch(
      { ...match, innings: nextInnings, updatedAt: new Date().toISOString() },
      null,
      flashNewPlayerCard
        ? { activeCard: "bowler-intro", spotlightPlayerId: playerId }
        : undefined,
    );
  };

  const handleSwapStrike = () => {
    if (!currentInnings) return;
    const updatedInnings: InningsState = {
      ...currentInnings,
      strikerId: currentInnings.nonStrikerId,
      nonStrikerId: currentInnings.strikerId,
    };
    const nextInnings: [InningsState | null, InningsState | null] = [
      innIdx === 0 ? updatedInnings : match.innings[0],
      innIdx === 1 ? updatedInnings : match.innings[1],
    ];
    onUpdateMatch({
      ...match,
      innings: nextInnings,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUndo = () => {
    const reverted = undoLastBallDelivery(match);
    onUpdateMatch(reverted, null, { activeEffect: null });
  };

  const handleEndInningsEarly = () => {
    if (!currentInnings) return;
    const updatedInnings: InningsState = {
      ...currentInnings,
      completed: true,
      needsNextBatter: false,
      needsNextBowler: false,
    };
    const nextInnings: [InningsState | null, InningsState | null] = [
      innIdx === 0 ? updatedInnings : match.innings[0],
      innIdx === 1 ? updatedInnings : match.innings[1],
    ];
    if (innIdx === 0) {
      onUpdateMatch({
        ...match,
        innings: nextInnings,
        status: "innings-break",
        updatedAt: new Date().toISOString(),
      });
    } else {
      const inn0Sum = computeInningsSummary(
        match.innings[0],
        match.oversPerInnings,
        match.powerplayOvers,
        teams,
      );
      const inn1Sum = summary;
      let winnerTeamId: string | undefined = undefined;
      let resultSummary = "MATCH COMPLETED";
      if (inn0Sum && inn1Sum && match.innings[0]) {
        const t1 = teams.find((t) => t.id === match.innings[0]!.battingTeamId);
        const t2 = battingTeam;
        if (inn1Sum.runs > inn0Sum.runs) {
          winnerTeamId = t2?.id;
          resultSummary = `${t2?.name} won by ${10 - inn1Sum.wickets} wickets`;
        } else if (inn0Sum.runs > inn1Sum.runs) {
          winnerTeamId = t1?.id;
          resultSummary = `${t1?.name} won by ${inn0Sum.runs - inn1Sum.runs} runs`;
        } else {
          resultSummary = "MATCH TIED!";
        }
      }
      onUpdateMatch({
        ...match,
        innings: nextInnings,
        status: "completed",
        winnerTeamId,
        resultSummary,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Start 2nd Innings
  const startSecondInnings = () => {
    const inn1 = match.innings[0];
    if (!inn1) return;
    const inn1Sum = computeInningsSummary(
      inn1,
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    );
    if (!inn1Sum) return;

    const bat2Team = teams.find((t) => t.id === inn1.bowlingTeamId);
    const bowl2Team = teams.find((t) => t.id === inn1.battingTeamId);
    if (!bat2Team || !bowl2Team) return;

    const bat2XIIds =
      bat2Team.id === match.teamAId ? match.teamAXI : match.teamBXI;
    const bowl2XIIds =
      bowl2Team.id === match.teamAId ? match.teamAXI : match.teamBXI;
    const bat2List = bat2Team.players.filter((p) => bat2XIIds.includes(p.id));
    const bowl2List = bowl2Team.players.filter((p) => bowl2XIIds.includes(p.id));

    const sId = inn2Striker || bat2List[0]?.id || "";
    const nsId =
      (inn2NonStriker && inn2NonStriker !== sId
        ? inn2NonStriker
        : bat2List.find((p) => p.id !== sId)?.id) || "";
    const bId = inn2Bowler || bowl2List[0]?.id || "";
    if (!sId || !nsId || !bId) return;

    const inn2: InningsState = {
      inningsNumber: 2,
      battingTeamId: bat2Team.id,
      bowlingTeamId: bowl2Team.id,
      strikerId: sId,
      nonStrikerId: nsId,
      currentBowlerId: bId,
      lastOverBowlerId: "",
      battingOrder: [sId, nsId],
      bowlingOrder: [bId],
      balls: [],
      completed: false,
      target: inn1Sum.runs + 1,
    };

    onUpdateMatch(
      {
        ...match,
        status: "live",
        currentInningsIndex: 1,
        innings: [match.innings[0], inn2],
        updatedAt: new Date().toISOString(),
      },
      null,
      { activeCard: "none" },
    );
  };

  // Innings Break Screen
  if (match.status === "innings-break" && match.innings[0]) {
    const inn1Sum = computeInningsSummary(
      match.innings[0],
      match.oversPerInnings,
      match.powerplayOvers,
      teams,
    )!;
    const bat2Team = teams.find((t) => t.id === match.innings[0]!.bowlingTeamId);
    const bowl2Team = teams.find((t) => t.id === match.innings[0]!.battingTeamId);
    const bat2List = (bat2Team?.players || []).filter((p) =>
      (bat2Team?.id === match.teamAId ? match.teamAXI : match.teamBXI).includes(p.id),
    );
    const bowl2List = (bowl2Team?.players || []).filter((p) =>
      (bowl2Team?.id === match.teamAId ? match.teamAXI : match.teamBXI).includes(p.id),
    );
    const effStriker = inn2Striker || bat2List[0]?.id || "";
    const effNonStriker =
      (inn2NonStriker && inn2NonStriker !== effStriker
        ? inn2NonStriker
        : bat2List.find((p) => p.id !== effStriker)?.id) || "";
    const effBowler = inn2Bowler || bowl2List[0]?.id || "";

    return (
      <div className="bezel-shell">
        <div className="bezel-core p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <span className="font-hud rounded-full border border-[#E5B85C]/40 bg-[#E5B85C]/15 px-3 py-1 text-xs font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                INNINGS BREAK
              </span>
              <h2 className="font-display mt-2 text-3xl font-extrabold text-white">
                {bat2Team?.name} NEED {inn1Sum.runs + 1} RUNS IN {match.oversPerInnings} OVERS
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                1st Innings: {bowl2Team?.name} scored{" "}
                <strong className="text-white">
                  {inn1Sum.runs}/{inn1Sum.wickets} ({inn1Sum.oversText})
                </strong>{" "}
                · {inn1Sum.fours} Fours · {inn1Sum.sixes} Sixes
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onQuickShowCard("scorecard", { cardInningsIndex: 0 })
              }
              className="inline-flex items-center gap-2 rounded-full border border-[#E5B85C]/40 bg-[#E5B85C]/15 px-4 py-2 text-xs font-bold text-[#F7D58B] hover:bg-[#E5B85C]/25"
            >
              <Tv size={14} /> Flash 1st Innings Scorecard on OBS
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="font-hud text-xs font-bold tracking-wider text-slate-400 uppercase">
                Chase Striker ({bat2Team?.shortName})
              </label>
              <select
                value={effStriker}
                onChange={(e) => setInn2Striker(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3 py-2.5 text-sm font-semibold text-white"
              >
                {bat2List.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-hud text-xs font-bold tracking-wider text-slate-400 uppercase">
                Chase Non-Striker
              </label>
              <select
                value={effNonStriker}
                onChange={(e) => setInn2NonStriker(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3 py-2.5 text-sm font-semibold text-white"
              >
                {bat2List
                  .filter((p) => p.id !== effStriker)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="font-hud text-xs font-bold tracking-wider text-slate-400 uppercase">
                Opening Bowler ({bowl2Team?.shortName})
              </label>
              <select
                value={effBowler}
                onChange={(e) => setInn2Bowler(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3 py-2.5 text-sm font-semibold text-white"
              >
                {bowl2List.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.bowlingStyle || p.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
            >
              <RotateCcw size={14} /> Undo Last Ball of 1st Innings
            </button>
            <button
              type="button"
              onClick={startSecondInnings}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E5B85C] to-[#F7D58B] px-6 py-3 text-sm font-extrabold text-[#08101E]"
            >
              <Play size={15} fill="currentColor" /> START 2ND INNINGS CHASE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Match Completed Screen
  if (match.status === "completed") {
    const allMatchPlayers = [...battingXI, ...bowlingXI];
    return (
      <div className="bezel-shell">
        <div className="bezel-core p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <span className="font-hud rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold tracking-[0.2em] text-emerald-300 uppercase">
                MATCH COMPLETED · POINTS TABLE AUTO-UPDATED
              </span>
              <h2 className="font-display mt-2 text-4xl font-extrabold tracking-wide text-[#F7D58B]">
                {match.resultSummary || "MATCH COMPLETE"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
            >
              <RotateCcw size={14} /> Undo Last Ball
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#081223] p-4">
              <label className="font-hud flex items-center gap-2 text-xs font-bold tracking-wider text-[#F7D58B] uppercase">
                <Award size={15} /> Select Man of the Match
              </label>
              <select
                value={match.manOfTheMatchId || ""}
                onChange={(e) =>
                  onUpdateMatch({
                    ...match,
                    manOfTheMatchId: e.target.value || undefined,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3.5 py-2.5 text-sm font-semibold text-white"
              >
                <option value="">-- Choose Player of the Match --</option>
                {allMatchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#081223] p-4">
              <button
                type="button"
                onClick={() => onQuickShowCard("match-summary")}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#E5B85C] to-[#F7D58B] px-4 py-3 text-xs font-extrabold text-[#08101E]"
              >
                SHOW MATCH SUMMARY &amp; MOTM ON LIVE
              </button>
              <button
                type="button"
                onClick={() => onQuickShowCard("points-table")}
                className="rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-3 text-xs font-bold text-sky-200 hover:bg-sky-500/25"
              >
                SHOW POINTS TABLE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentInnings || !summary || !battingTeam || !bowlingTeam) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* LIVE SCORE HEADER CARD */}
      <div className="bezel-shell">
        <div
          className="bezel-core relative overflow-hidden p-5"
          style={{
            background: `linear-gradient(135deg, ${battingTeam.primaryColor}22 0%, rgba(9,17,31,0.97) 48%, rgba(9,17,31,0.98) 100%)`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TeamCrest
                logo={battingTeam.logo}
                name={battingTeam.name}
                shortName={battingTeam.shortName}
                color={battingTeam.primaryColor}
                size={54}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-hud text-xs font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                    {battingTeam.name} · {innIdx === 0 ? "1ST INNINGS" : "2ND INNINGS"}
                  </span>
                  {summary.isPowerplay && (
                    <span className="font-hud rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/35">
                      POWERPLAY
                    </span>
                  )}
                  {summary.isFreeHitNext && (
                    <span className="font-hud animate-pulse rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      FREE HIT NEXT
                    </span>
                  )}
                  {summary.isHatTrickBall && (
                    <span className="font-hud animate-pulse rounded-full bg-fuchsia-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      HAT-TRICK BALL!
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-display text-5xl font-extrabold tracking-tight text-white">
                    {summary.runs}/{summary.wickets}
                  </span>
                  <span className="font-telemetry text-lg font-bold text-slate-300">
                    ({summary.oversText} / {match.oversPerInnings} ov)
                  </span>
                  <span className="font-telemetry rounded-lg bg-white/10 px-2.5 py-0.5 text-xs font-bold text-[#F7D58B]">
                    CRR {formatRate(summary.crr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Match Boundary Counters + Target */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-[#E5B85C]/30 bg-[#E5B85C]/10 px-3.5 py-2 text-center">
                <div className="font-hud text-[10px] font-bold tracking-widest text-[#F7D58B] uppercase">
                  FOURS (4s)
                </div>
                <div className="font-display text-2xl font-extrabold text-white">
                  {summary.fours}
                </div>
              </div>
              <div className="rounded-xl border border-[#E03340]/35 bg-[#E03340]/15 px-3.5 py-2 text-center">
                <div className="font-hud text-[10px] font-bold tracking-widest text-red-300 uppercase">
                  SIXES (6s)
                </div>
                <div className="font-display text-2xl font-extrabold text-white">
                  {summary.sixes}
                </div>
              </div>
              {summary.biggestSixMeters > 0 && (
                <div className="rounded-xl border border-orange-400/35 bg-orange-500/15 px-3.5 py-2 text-center">
                  <div className="font-hud text-[10px] font-bold tracking-widest text-orange-300 uppercase">
                    LONGEST 6
                  </div>
                  <div className="font-display text-2xl font-extrabold text-orange-200">
                    {summary.biggestSixMeters}m
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chase Banner or Partnership Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs">
            {summary.chase ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-hud rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-300 border border-emerald-400/30">
                  TARGET {summary.chase.target}
                </span>
                <span className="font-bold text-white">
                  Need{" "}
                  <strong className="text-[#F7D58B]">
                    {summary.chase.runsNeeded}
                  </strong>{" "}
                  runs off{" "}
                  <strong className="text-sky-300">
                    {summary.chase.ballsRemaining}
                  </strong>{" "}
                  balls · RRR {formatRate(summary.chase.rrr)}
                </span>
                <span className="text-slate-400">
                  Win %: {battingTeam.shortName} {summary.chase.battingWinPct}% vs{" "}
                  {bowlingTeam.shortName} {summary.chase.bowlingWinPct}%
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                <span>
                  Partnership:{" "}
                  <strong className="text-white">
                    {summary.partnership.runs} ({summary.partnership.balls})
                  </strong>
                </span>
                <span>
                  Projected ({match.oversPerInnings} ov):{" "}
                  <strong className="text-[#F7D58B]">{summary.projectedScore}</strong>
                </span>
                <span>
                  Extras: <strong className="text-white">{summary.extrasTotal}</strong>
                </span>
              </div>
            )}

            {/* This Over Ball Chips */}
            <div className="flex items-center gap-1.5">
              <span className="font-hud mr-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                THIS OVER ({summary.currentOverRuns}):
              </span>
              {summary.currentOverBalls.length === 0 ? (
                <span className="text-[11px] text-slate-500">Ready</span>
              ) : (
                summary.currentOverBalls.map((b) => (
                  <span
                    key={b.id}
                    className={`font-telemetry inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold ${
                      b.wicket
                        ? "bg-red-600 text-white"
                        : b.isBoundarySix
                          ? "bg-gradient-to-br from-[#E03340] to-orange-500 text-white"
                          : b.isBoundaryFour
                            ? "bg-[#E5B85C] text-[#08101E]"
                            : b.extraType !== "none"
                              ? "bg-sky-500/25 text-sky-200 border border-sky-400/40"
                              : "bg-white/10 text-slate-200"
                    }`}
                  >
                    {formatBallBadge(b)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BATTERS & BOWLER LIVE STRIP */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Batters Card */}
        <div className="bezel-shell lg:col-span-7">
          <div className="bezel-core p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-hud text-xs font-bold tracking-[0.18em] text-[#F7D58B] uppercase">
                AT THE CREASE
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSwapStrike}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                >
                  <ArrowLeftRight size={12} /> Swap Strike
                </button>
                <button
                  type="button"
                  onClick={() => setPickBatterOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                >
                  <UserPlus size={12} /> Change
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {[strikerStat, nonStrikerStat].map(
                (b, idx) =>
                  b && (
                    <div
                      key={b.playerId}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                        idx === 0
                          ? "border-[#E5B85C]/45 bg-[#E5B85C]/10"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <PlayerAvatar
                          photo={b.photo}
                          name={b.name}
                          accentColor={battingTeam.primaryColor}
                          size={40}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-sm font-extrabold text-white">
                            {idx === 0 && (
                              <span className="inline-block h-2 w-2 rounded-full bg-[#F7D58B]" />
                            )}
                            <span className="truncate">{b.name}</span>
                            {idx === 0 && (
                              <span className="text-[#F7D58B]">*</span>
                            )}
                          </div>
                          <div className="font-telemetry text-[11px] text-slate-400">
                            4s: <strong className="text-[#F7D58B]">{b.fours}</strong> · 6s:{" "}
                            <strong className="text-red-300">{b.sixes}</strong> · SR:{" "}
                            {b.strikeRate.toFixed(0)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-display text-2xl font-extrabold text-white">
                            {b.runs}
                          </span>
                          <span className="font-telemetry ml-1 text-xs text-slate-400">
                            ({b.balls})
                          </span>
                        </div>
                        <button
                          type="button"
                          title="Flash Batter Photo Card on YouTube Live"
                          onClick={() =>
                            onQuickShowCard("batter-spotlight", {
                              spotlightPlayerId: b.playerId,
                            })
                          }
                          className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-300 hover:border-[#E5B85C]/50 hover:text-[#F7D58B]"
                        >
                          <Tv size={14} />
                        </button>
                      </div>
                    </div>
                  ),
              )}
            </div>
          </div>
        </div>

        {/* Bowler Card */}
        <div className="bezel-shell lg:col-span-5">
          <div className="bezel-core flex h-full flex-col justify-between p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-hud text-xs font-bold tracking-[0.18em] text-sky-300 uppercase">
                CURRENT BOWLER
              </span>
              <button
                type="button"
                onClick={() => setPickBowlerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-3 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-500/25"
              >
                Change Bowler
              </button>
            </div>

            {bowlerStat && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar
                    photo={bowlerStat.photo}
                    name={bowlerStat.name}
                    accentColor={bowlingTeam.primaryColor}
                    size={46}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">
                      {bowlerStat.name}
                    </div>
                    <div className="font-telemetry text-[11px] text-slate-300">
                      Econ {formatRate(bowlerStat.economy)} · Dots {bowlerStat.dots}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-display text-2xl font-extrabold text-white">
                      {bowlerStat.wickets}-{bowlerStat.runsConceded}
                    </div>
                    <div className="font-telemetry text-[11px] text-sky-300">
                      {bowlerStat.oversText} ov
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Flash Bowler Spotlight on YouTube Live"
                    onClick={() =>
                      onQuickShowCard("bowler-spotlight", {
                        spotlightPlayerId: bowlerStat.playerId,
                      })
                    }
                    className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-300 hover:border-sky-400 hover:text-sky-300"
                  >
                    <Tv size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                Last 12 balls:{" "}
                <strong className="text-white">
                  {summary.last12Balls.runs}/{summary.last12Balls.wickets}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleEndInningsEarly}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-amber-400/40 hover:text-amber-200"
              >
                <Flag size={11} /> End {innIdx === 0 ? "1st" : "2nd"} Innings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1-CLICK BALL-BY-BALL SCORING KEYPAD */}
      <div className="bezel-shell">
        <div className="bezel-core p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-hud text-xs font-bold tracking-[0.2em] text-slate-300 uppercase">
                LIVE BALL SCORER
              </span>
              {pendingExtra !== "none" && (
                <span className="font-hud inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-0.5 text-[11px] font-extrabold text-[#04111F] uppercase">
                  {pendingExtra} ACTIVE — NOW TAP RUNS
                  <button
                    type="button"
                    onClick={() => setPendingExtra("none")}
                    className="ml-1 rounded-full bg-black/20 p-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={currentInnings.balls.length === 0}
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-35"
            >
              <RotateCcw size={13} /> Undo Last Ball
            </button>
          </div>

          {/* Primary Runs Grid */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[0, 1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRunPress(r)}
                className="group relative flex h-20 flex-col items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] transition-all hover:border-white/30 hover:bg-white/[0.1] active:scale-[0.97]"
              >
                <span className="font-display text-4xl font-extrabold text-white">
                  {r}
                </span>
                <span className="font-hud text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {r === 0 ? "DOT" : r === 1 ? "SINGLE" : r === 2 ? "DOUBLE" : "TRIPLE"}
                </span>
              </button>
            ))}

            {/* FOUR Button */}
            <button
              type="button"
              onClick={() => handleRunPress(4)}
              className="group relative flex h-20 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#F7D58B]/60 bg-gradient-to-br from-[#E5B85C] to-[#C88E26] text-[#07111F] shadow-[0_10px_28px_rgba(229,184,92,0.28)] transition-all hover:brightness-110 active:scale-[0.97]"
            >
              <span className="font-display text-4xl font-extrabold">4</span>
              <span className="font-hud text-[10px] font-extrabold tracking-widest uppercase">
                FOUR + FX
              </span>
            </button>

            {/* SIX Button (Opens Six Distance Studio) */}
            <button
              type="button"
              onClick={() => handleRunPress(6)}
              className="group relative flex h-20 flex-col items-center justify-center overflow-hidden rounded-2xl border border-red-300/60 bg-gradient-to-br from-[#E03340] via-[#D91E2D] to-[#99111D] text-white shadow-[0_10px_30px_rgba(224,51,64,0.38)] transition-all hover:brightness-110 active:scale-[0.97]"
            >
              <span className="font-display flex items-center gap-1 text-4xl font-extrabold">
                6 <Flame size={20} className="text-amber-300" />
              </span>
              <span className="font-hud text-[10px] font-extrabold tracking-widest text-amber-200 uppercase">
                SIX + METER
              </span>
            </button>
          </div>

          {/* Extras & Wicket Row */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-6">
            {(
              [
                { key: "wide", label: "WIDE (+1)", quickZero: true },
                { key: "noball", label: "NO BALL + FH", quickZero: true },
                { key: "bye", label: "BYE", quickZero: false },
                { key: "legbye", label: "LEG BYE", quickZero: false },
              ] as const
            ).map((ex) => {
              const active = pendingExtra === ex.key;
              return (
                <button
                  key={ex.key}
                  type="button"
                  onClick={() => {
                    if (active && ex.quickZero) {
                      // Double-tap Wide or No-Ball records it immediately with 0 extra runs
                      commitDelivery({
                        runsOffBat: 0,
                        extraType: ex.key,
                        extraRuns: 0,
                      });
                    } else {
                      setPendingExtra(active ? "none" : ex.key);
                    }
                  }}
                  className={`font-hud h-12 rounded-xl border text-xs font-extrabold tracking-wider uppercase transition-all ${
                    active
                      ? "border-sky-300 bg-sky-400 text-[#05101F]"
                      : "border-white/12 bg-white/[0.04] text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/12"
                  }`}
                >
                  {active && ex.quickZero ? `TAP AGAIN = ${ex.key.toUpperCase()}` : ex.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setDismissalType("caught");
                setOutBatterChoice("striker");
                setWicketModalOpen(true);
              }}
              className="font-hud col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-600/25 text-sm font-extrabold tracking-widest text-red-200 uppercase transition-all hover:bg-red-600 hover:text-white active:scale-[0.98]"
            >
              <Sparkles size={15} /> WICKET / OUT!
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Tip: Tap <strong className="text-slate-200">WIDE</strong> or{" "}
            <strong className="text-slate-200">NO BALL</strong> once then tap runs (e.g. NB + 4), or double-tap for a standard +1 Wide / No-Ball.
          </p>
        </div>
      </div>

      {/* SIX DISTANCE ESTIMATOR MODAL */}
      {sixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-2xl">
            <div className="bezel-core p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <RedTennisBallIcon size={34} />
                  <div>
                    <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-red-300 uppercase">
                      TKPL SIX DISTANCE STUDIO
                    </span>
                    <h3 className="font-display text-3xl font-extrabold text-white">
                      {strikerStat?.name.toUpperCase()} SMASHED A SIX!
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSixModalOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-slate-300 hover:bg-white/20"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Interactive Mini Stadium Tap Map */}
                <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-[#07111F] p-4">
                  <div className="font-hud mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#F7D58B] uppercase">
                    <Target size={14} /> Tap Where The Ball Landed
                  </div>
                  <svg
                    viewBox="0 0 240 240"
                    onClick={handleStadiumTap}
                    className="h-56 w-56 cursor-crosshair select-none"
                  >
                    {/* Out-of-ground zone */}
                    <circle
                      cx="120"
                      cy="120"
                      r="112"
                      fill="#0E2036"
                      stroke="rgba(229,184,92,0.22)"
                      strokeDasharray="4 4"
                    />
                    {/* Stands / deep ring */}
                    <circle
                      cx="120"
                      cy="120"
                      r="88"
                      fill="#122B3A"
                      stroke="rgba(255,255,255,0.12)"
                    />
                    {/* Cricket Outfield inside boundary rope */}
                    <circle
                      cx="120"
                      cy="120"
                      r="64"
                      fill="#11462E"
                      stroke="#F7D58B"
                      strokeWidth="2.5"
                    />
                    {/* 30-yard circle */}
                    <circle
                      cx="120"
                      cy="120"
                      r="34"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeDasharray="3 3"
                    />
                    {/* Center Pitch */}
                    <rect
                      x="114"
                      y="102"
                      width="12"
                      height="36"
                      rx="3"
                      fill="#D6B27A"
                    />
                    <text
                      x="120"
                      y="16"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="700"
                    >
                      STRAIGHT (LONG ON/OFF)
                    </text>
                    <text
                      x="120"
                      y="234"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="700"
                    >
                      BEHIND KEEPER
                    </text>
                    <text
                      x="14"
                      y="123"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="700"
                    >
                      OFF
                    </text>
                    <text
                      x="206"
                      y="123"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="700"
                    >
                      LEG
                    </text>
                    {/* Trajectory Line */}
                    {tapDot && (
                      <>
                        <line
                          x1="120"
                          y1="120"
                          x2={tapDot.x}
                          y2={tapDot.y}
                          stroke="#E03340"
                          strokeWidth="3"
                          strokeDasharray="5 3"
                        />
                        <circle
                          cx={tapDot.x}
                          cy={tapDot.y}
                          r="9"
                          fill="#E03340"
                          stroke="#FFF5E1"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </svg>
                  <div className="mt-2 text-center text-[11px] text-slate-400">
                    Gold Rope = {match.boundaryDistanceMeters}m · Tap outside gold ring
                  </div>
                </div>

                {/* Right: Instant Presets, Hang-Time Timer & Meter Control */}
                <div className="flex flex-col justify-between space-y-4">
                  {/* Live Calculated Readout */}
                  <div className="rounded-2xl border border-[#E03340]/40 bg-gradient-to-br from-[#E03340]/20 to-[#0C1729] p-4 text-center">
                    <div className="font-hud text-[11px] font-bold tracking-[0.2em] text-amber-200 uppercase">
                      {sixZone}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSixMeters((m) => Math.max(45, m - 2))}
                        className="h-9 w-9 rounded-full border border-white/15 bg-white/10 text-lg font-bold text-white hover:bg-white/20"
                      >
                        -
                      </button>
                      <div className="font-display text-6xl font-extrabold text-white">
                        {sixMeters}
                        <span className="ml-1 text-2xl text-[#F7D58B]">m</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSixMeters((m) => Math.min(130, m + 2))}
                        className="h-9 w-9 rounded-full border border-white/15 bg-white/10 text-lg font-bold text-white hover:bg-white/20"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Quick 1-Tap Presets */}
                  <div>
                    <div className="font-hud mb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      1-TAP DISTANCE PRESETS
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { m: match.boundaryDistanceMeters + 6, label: "Just Over" },
                        { m: match.boundaryDistanceMeters + 14, label: "Clean Hit" },
                        { m: match.boundaryDistanceMeters + 22, label: "Huge Six" },
                        { m: match.boundaryDistanceMeters + 30, label: "Monster!" },
                        { m: match.boundaryDistanceMeters + 38, label: "Out Of Ground" },
                        { m: match.boundaryDistanceMeters + 46, label: "Roof Crusher" },
                      ].map((p) => (
                        <button
                          key={p.m}
                          type="button"
                          onClick={() => {
                            setSixMeters(p.m);
                            setSixZone(p.label.toUpperCase());
                          }}
                          className={`rounded-xl border px-2 py-2 text-center transition-all ${
                            sixMeters === p.m
                              ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                          }`}
                        >
                          <div className="font-telemetry text-sm font-extrabold">
                            {p.m}m
                          </div>
                          <div className="text-[10px] text-slate-400">{p.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hang-Time Stopwatch Estimator */}
                  <button
                    type="button"
                    onClick={handleHangTimeToggle}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
                      hangTimerStart !== null
                        ? "animate-pulse border-amber-400 bg-amber-500 text-[#08101E]"
                        : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Timer size={15} />
                      {hangTimerStart !== null
                        ? "TAP WHEN BALL LANDS!"
                        : "Optional: Hang-Time Timer (Bat → Ground)"}
                    </span>
                    <span className="font-telemetry">
                      {hangElapsed !== null ? `${hangElapsed.toFixed(2)}s` : "START"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setSixModalOpen(false)}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSix}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E03340] via-[#F24B3E] to-[#E5B85C] px-7 py-3 text-sm font-extrabold text-white shadow-[0_10px_28px_rgba(224,51,64,0.42)]"
                >
                  <Flame size={16} /> FIRE SIX ({sixMeters}m) + BROADCAST FX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WICKET MODAL */}
      {wicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-lg">
            <div className="bezel-core p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-3xl font-extrabold text-red-400">
                  RECORD WICKET / OUT!
                </h3>
                <button
                  type="button"
                  onClick={() => setWicketModalOpen(false)}
                  className="rounded-full bg-white/10 p-1.5 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="font-hud mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    HOW OUT?
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DISMISSALS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDismissalType(d.value)}
                        className={`rounded-xl border py-2.5 text-xs font-bold transition-all ${
                          dismissalType === d.value
                            ? "border-red-400 bg-red-600 text-white"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(dismissalType === "runout" || dismissalType === "retired") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-hud mb-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                        WHICH BATTER?
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOutBatterChoice("striker")}
                          className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
                            outBatterChoice === "striker"
                              ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {strikerStat?.name || "Striker"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutBatterChoice("nonStriker")}
                          className={`flex-1 rounded-xl border py-2 text-xs font-bold ${
                            outBatterChoice === "nonStriker"
                              ? "border-[#E5B85C] bg-[#E5B85C]/20 text-[#F7D58B]"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {nonStrikerStat?.name || "Non-Striker"}
                        </button>
                      </div>
                    </div>
                    {dismissalType === "runout" && (
                      <div>
                        <div className="font-hud mb-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                          RUNS COMPLETED
                        </div>
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setWicketRuns(r)}
                              className={`flex-1 rounded-xl border py-2 font-telemetry text-xs font-bold ${
                                wicketRuns === r
                                  ? "border-[#E5B85C] bg-[#E5B85C] text-[#08101E]"
                                  : "border-white/10 bg-white/5 text-white"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(dismissalType === "caught" ||
                  dismissalType === "runout" ||
                  dismissalType === "stumped") && (
                  <div>
                    <label className="font-hud block text-xs font-bold tracking-wider text-slate-400 uppercase">
                      Fielder / Keeper (Optional)
                    </label>
                    <select
                      value={fielderId}
                      onChange={(e) => setFielderId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3 py-2.5 text-sm text-white"
                    >
                      <option value="">-- Skip / Same Bowler --</option>
                      {bowlingXI.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setWicketModalOpen(false)}
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWicket}
                  className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(220,38,38,0.45)] hover:bg-red-500"
                >
                  CONFIRM WICKET + PLAY FX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEXT BATTER PICKER MODAL */}
      {pickBatterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-lg">
            <div className="bezel-core p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                    {battingTeam.name}
                  </span>
                  <h3 className="font-display text-3xl font-extrabold text-white">
                    SELECT NEXT BATTER
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPickBatterOpen(false)}
                  className="rounded-full bg-white/10 p-1.5 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={flashNewPlayerCard}
                  onChange={(e) => setFlashNewPlayerCard(e.target.checked)}
                  className="accent-[#E5B85C]"
                />
                Automatically show <strong className="text-[#F7D58B]">New Batter Photo Card</strong> on YouTube Live
              </label>

              <div className="mt-4 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {availableNextBatters.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectNextBatter(p.id)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left hover:border-[#E5B85C] hover:bg-[#E5B85C]/15"
                  >
                    <PlayerAvatar
                      photo={p.photo}
                      name={p.name}
                      accentColor={battingTeam.primaryColor}
                      size={40}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.tag ? `${p.tag} · ` : ""}
                        {p.battingStyle} · {p.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEXT BOWLER PICKER MODAL */}
      {pickBowlerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="bezel-shell w-full max-w-lg">
            <div className="bezel-core p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-sky-300 uppercase">
                    END OF OVER · {bowlingTeam.name}
                  </span>
                  <h3 className="font-display text-3xl font-extrabold text-white">
                    SELECT NEXT BOWLER
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPickBowlerOpen(false)}
                  className="rounded-full bg-white/10 p-1.5 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={flashNewPlayerCard}
                  onChange={(e) => setFlashNewPlayerCard(e.target.checked)}
                  className="accent-sky-400"
                />
                Automatically show <strong className="text-sky-300">Bowler Intro Photo Card</strong> on YouTube Live
              </label>

              <div className="mt-4 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {bowlingXI.map((p) => {
                  const justBowled = p.id === currentInnings.lastOverBowlerId;
                  const stat = summary.bowlingCard.find((b) => b.playerId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectNextBowler(p.id)}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                        justBowled
                          ? "border-amber-400/25 bg-white/[0.02] opacity-60 hover:opacity-100"
                          : "border-white/10 bg-white/[0.04] hover:border-sky-400 hover:bg-sky-500/15"
                      }`}
                    >
                      <PlayerAvatar
                        photo={p.photo}
                        name={p.name}
                        accentColor={bowlingTeam.primaryColor}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {stat
                            ? `${stat.wickets}-${stat.runsConceded} (${stat.oversText})`
                            : p.bowlingStyle || p.role}
                          {justBowled ? " · Prev Over" : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
