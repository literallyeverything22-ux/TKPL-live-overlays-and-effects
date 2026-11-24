import { useMemo, useState } from "react";
import { Check, Play, Shuffle, Users, Zap } from "lucide-react";
import type {
  MatchStage,
  MatchState,
  Team,
} from "@/modules/core/types";
import { PlayerAvatar, TeamCrest } from "@/modules/core/components/BrandMedia";

interface MatchSetupWizardProps {
  teams: Team[];
  nextMatchNumber: number;
  defaultVenue: string;
  onCreateMatch: (match: MatchState) => void;
  onCancel?: () => void;
}

const STAGES: MatchStage[] = [
  "League Match",
  "Qualifier 1",
  "Eliminator",
  "Qualifier 2",
  "Grand Finale",
];

export function MatchSetupWizard({
  teams,
  nextMatchNumber,
  defaultVenue,
  onCreateMatch,
  onCancel,
}: MatchSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [teamAId, setTeamAId] = useState(teams[0]?.id || "");
  const [teamBId, setTeamBId] = useState(teams[1]?.id || "");
  const [matchNumber, setMatchNumber] = useState(nextMatchNumber);
  const [stage, setStage] = useState<MatchStage>("League Match");
  const [venue, setVenue] = useState(defaultVenue || "Kadapa Stadium Ground");
  const [oversPerInnings, setOversPerInnings] = useState(10);
  const [powerplayOvers, setPowerplayOvers] = useState(3);
  const [boundaryDistanceMeters, setBoundaryDistanceMeters] = useState(58);
  const [tossWinnerId, setTossWinnerId] = useState(teams[0]?.id || "");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");

  const teamA = useMemo(
    () => teams.find((t) => t.id === teamAId),
    [teams, teamAId],
  );
  const teamB = useMemo(
    () => teams.find((t) => t.id === teamBId),
    [teams, teamBId],
  );

  const [teamAXI, setTeamAXI] = useState<string[]>(() =>
    (teams[0]?.players || []).slice(0, 11).map((p) => p.id),
  );
  const [teamBXI, setTeamBXI] = useState<string[]>(() =>
    (teams[1]?.players || []).slice(0, 11).map((p) => p.id),
  );

  const handleSelectTeamA = (id: string) => {
    setTeamAId(id);
    const t = teams.find((x) => x.id === id);
    setTeamAXI((t?.players || []).slice(0, 11).map((p) => p.id));
    if (tossWinnerId !== id && tossWinnerId !== teamBId) {
      setTossWinnerId(id);
    }
  };

  const handleSelectTeamB = (id: string) => {
    setTeamBId(id);
    const t = teams.find((x) => x.id === id);
    setTeamBXI((t?.players || []).slice(0, 11).map((p) => p.id));
    if (tossWinnerId !== teamAId && tossWinnerId !== id) {
      setTossWinnerId(teamAId);
    }
  };

  const battingFirstTeamId = useMemo(() => {
    const winner = tossWinnerId === teamBId ? teamBId : teamAId;
    const other = winner === teamAId ? teamBId : teamAId;
    return tossDecision === "bat" ? winner : other;
  }, [teamAId, teamBId, tossWinnerId, tossDecision]);

  const bowlingFirstTeamId =
    battingFirstTeamId === teamAId ? teamBId : teamAId;

  const battingTeam = teams.find((t) => t.id === battingFirstTeamId);
  const bowlingTeam = teams.find((t) => t.id === bowlingFirstTeamId);

  const battingXIPlayers = useMemo(() => {
    const xiIds = battingFirstTeamId === teamAId ? teamAXI : teamBXI;
    return (battingTeam?.players || []).filter((p) => xiIds.includes(p.id));
  }, [battingFirstTeamId, teamAId, teamAXI, teamBXI, battingTeam]);

  const bowlingXIPlayers = useMemo(() => {
    const xiIds = bowlingFirstTeamId === teamAId ? teamAXI : teamBXI;
    return (bowlingTeam?.players || []).filter((p) => xiIds.includes(p.id));
  }, [bowlingFirstTeamId, teamAId, teamAXI, teamBXI, bowlingTeam]);

  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [openingBowlerId, setOpeningBowlerId] = useState("");

  const resolvedStriker =
    battingXIPlayers.find((p) => p.id === strikerId)?.id ||
    battingXIPlayers[0]?.id ||
    "";
  const resolvedNonStriker =
    battingXIPlayers.find(
      (p) => p.id === nonStrikerId && p.id !== resolvedStriker,
    )?.id ||
    battingXIPlayers.find((p) => p.id !== resolvedStriker)?.id ||
    "";
  const resolvedBowler =
    bowlingXIPlayers.find((p) => p.id === openingBowlerId)?.id ||
    bowlingXIPlayers[0]?.id ||
    "";

  const togglePlayerInXI = (side: "A" | "B", playerId: string) => {
    const setter = side === "A" ? setTeamAXI : setTeamBXI;
    setter((prev) => {
      if (prev.includes(playerId)) {
        return prev.length > 2 ? prev.filter((id) => id !== playerId) : prev;
      }
      if (prev.length >= 11) return prev;
      return [...prev, playerId];
    });
  };

  const canGoStep2 = Boolean(teamAId && teamBId && teamAId !== teamBId);

  const handleLaunchMatch = () => {
    if (!teamA || !teamB || !resolvedStriker || !resolvedNonStriker || !resolvedBowler) {
      return;
    }
    const now = new Date().toISOString();
    const match: MatchState = {
      id: `match-${Date.now()}`,
      matchNumber,
      stage,
      title: `Match #${matchNumber} · ${teamA.shortName} vs ${teamB.shortName}`,
      venue: venue.trim() || "Kadapa Stadium Ground",
      oversPerInnings,
      powerplayOvers: Math.min(powerplayOvers, oversPerInnings),
      boundaryDistanceMeters,
      teamAId,
      teamBId,
      teamAXI,
      teamBXI,
      tossWinnerId: tossWinnerId === teamBId ? teamBId : teamAId,
      tossDecision,
      status: "live",
      currentInningsIndex: 0,
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: battingFirstTeamId,
          bowlingTeamId: bowlingFirstTeamId,
          strikerId: resolvedStriker,
          nonStrikerId: resolvedNonStriker,
          currentBowlerId: resolvedBowler,
          lastOverBowlerId: "",
          battingOrder: [resolvedStriker, resolvedNonStriker],
          bowlingOrder: [resolvedBowler],
          balls: [],
          completed: false,
        },
        null,
      ],
      createdAt: now,
      updatedAt: now,
    };
    onCreateMatch(match);
  };

  return (
    <div className="bezel-shell mx-auto max-w-5xl">
      <div className="bezel-core p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <span className="font-hud inline-flex items-center gap-2 rounded-full border border-[#E5B85C]/35 bg-[#E5B85C]/10 px-3 py-1 text-xs font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
              <Zap size={13} strokeWidth={1.6} /> NEW TKPL 2026 MATCH SETUP
            </span>
            <h2 className="font-display mt-2 text-3xl font-extrabold tracking-wide text-white">
              {step === 1 && "1. Select Franchises, Overs & Toss"}
              {step === 2 && "2. Confirm Playing XI (Imported From Auction)"}
              {step === 3 && "3. Pick Openers & Opening Bowler"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  if (n === 1 || canGoStep2) setStep(n as 1 | 2 | 3);
                }}
                className={`font-hud flex h-9 items-center gap-2 rounded-full px-4 text-xs font-bold tracking-wider uppercase transition-all ${
                  step === n
                    ? "bg-[#E5B85C] text-[#08101E]"
                    : step > n
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-white/5 text-slate-400 border border-white/10"
                }`}
              >
                {step > n && <Check size={14} strokeWidth={2} />}
                Step {n}
              </button>
            ))}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="ml-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Team A Selector */}
              <div className="rounded-2xl border border-white/10 bg-[#081223] p-4">
                <div className="font-hud mb-3 text-xs font-bold tracking-[0.18em] text-[#E5B85C] uppercase">
                  TEAM A (HOME / SIDE 1)
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {teams.map((t) => {
                    const selected = t.id === teamAId;
                    const disabled = t.id === teamBId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectTeamA(t.id)}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                          selected
                            ? "border-[#E5B85C] bg-[#E5B85C]/15 shadow-[0_0_24px_rgba(229,184,92,0.16)]"
                            : disabled
                              ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-35"
                              : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        }`}
                      >
                        <TeamCrest
                          logo={t.logo}
                          name={t.name}
                          shortName={t.shortName}
                          color={t.primaryColor}
                          size={38}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">
                            {t.name}
                          </div>
                          <div className="font-hud text-[11px] font-semibold text-slate-400">
                            {t.shortName} · {t.players.length} squad
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Team B Selector */}
              <div className="rounded-2xl border border-white/10 bg-[#081223] p-4">
                <div className="font-hud mb-3 text-xs font-bold tracking-[0.18em] text-sky-300 uppercase">
                  TEAM B (OPPONENT / SIDE 2)
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {teams.map((t) => {
                    const selected = t.id === teamBId;
                    const disabled = t.id === teamAId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectTeamB(t.id)}
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                          selected
                            ? "border-sky-400 bg-sky-400/15 shadow-[0_0_24px_rgba(56,189,248,0.16)]"
                            : disabled
                              ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-35"
                              : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        }`}
                      >
                        <TeamCrest
                          logo={t.logo}
                          name={t.name}
                          shortName={t.shortName}
                          color={t.primaryColor}
                          size={38}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">
                            {t.name}
                          </div>
                          <div className="font-hud text-[11px] font-semibold text-slate-400">
                            {t.shortName} · {t.players.length} squad
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Match Config Row */}
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-[#081223] p-5 md:grid-cols-4">
              <div>
                <label className="font-hud block text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Match # &amp; Stage
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={matchNumber}
                    onChange={(e) => setMatchNumber(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-center font-telemetry text-sm font-bold text-white"
                  />
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as MatchStage)}
                    className="flex-1 rounded-xl border border-white/15 bg-[#0F1E36] px-3 py-2 text-sm font-semibold text-white"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-hud block text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Overs Per Innings (T10 Default)
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[6, 8, 10, 12, 15, 20].map((ov) => (
                    <button
                      key={ov}
                      type="button"
                      onClick={() => {
                        setOversPerInnings(ov);
                        setPowerplayOvers(ov <= 8 ? 2 : ov <= 12 ? 3 : 6);
                      }}
                      className={`font-telemetry rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                        oversPerInnings === ov
                          ? "bg-[#E5B85C] text-[#08101E]"
                          : "bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {ov} Ov
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-hud block text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Boundary Distance (For 6 Meter)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range"
                    min={45}
                    max={75}
                    value={boundaryDistanceMeters}
                    onChange={(e) => setBoundaryDistanceMeters(Number(e.target.value))}
                    className="flex-1 accent-[#E03340]"
                  />
                  <span className="font-telemetry w-14 rounded-lg border border-[#E03340]/40 bg-[#E03340]/15 py-1 text-center text-sm font-bold text-red-300">
                    {boundaryDistanceMeters}m
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Average rope distance on your ground
                </p>
              </div>

              <div>
                <label className="font-hud block text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Ground / Venue Name
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                  placeholder="Kadapa Stadium Ground"
                />
              </div>
            </div>

            {/* Toss Section */}
            {teamA && teamB && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E5B85C]/25 bg-[#E5B85C]/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <Shuffle size={20} strokeWidth={1.6} className="text-[#E5B85C]" />
                  <div>
                    <div className="font-hud text-xs font-bold tracking-wider text-[#F7D58B] uppercase">
                      TOSS RESULT
                    </div>
                    <div className="text-sm text-slate-300">
                      Who won the toss &amp; chose to bat or bowl?
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[teamA, teamB].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTossWinnerId(t.id)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                        (tossWinnerId || teamA.id) === t.id
                          ? "border-[#E5B85C] bg-[#E5B85C] text-[#08101E]"
                          : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {t.shortName} Won Toss
                    </button>
                  ))}
                  <span className="mx-1 text-xs text-slate-400">opted to</span>
                  {(["bat", "bowl"] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setTossDecision(dec)}
                      className={`font-hud rounded-full border px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${
                        tossDecision === dec
                          ? "border-emerald-400 bg-emerald-500 text-[#04140B]"
                          : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {dec === "bat" ? "Bat First" : "Bowl First"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#E5B85C] to-[#F7D58B] px-6 py-3 text-sm font-extrabold text-[#08101E] shadow-lg transition-all hover:brightness-105 disabled:opacity-40"
              >
                Next: Confirm Playing XI
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && teamA && teamB && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { side: "A" as const, team: teamA, xi: teamAXI },
                { side: "B" as const, team: teamB, xi: teamBXI },
              ].map(({ side, team, xi }) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-white/10 bg-[#081223] p-4"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <TeamCrest
                        logo={team.logo}
                        name={team.name}
                        shortName={team.shortName}
                        color={team.primaryColor}
                        size={36}
                      />
                      <div>
                        <div className="font-bold text-white">{team.name}</div>
                        <div className="font-hud text-xs font-semibold text-slate-400">
                          Click players to toggle Playing XI
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-telemetry rounded-full px-3 py-1 text-xs font-bold ${
                        xi.length === 11
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                      }`}
                    >
                      <Users size={12} className="mr-1 inline" />
                      {xi.length} / 11
                    </span>
                  </div>

                  <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {team.players.map((p) => {
                      const active = xi.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePlayerInXI(side, p.id)}
                          className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                            active
                              ? "border-emerald-400/50 bg-emerald-500/12"
                              : "border-white/5 bg-white/[0.02] opacity-55 hover:opacity-85"
                          }`}
                        >
                          <PlayerAvatar
                            photo={p.photo}
                            name={p.name}
                            accentColor={team.primaryColor}
                            size={36}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-white">
                              {p.name}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">
                              {p.tag ? `${p.tag} · ` : ""}
                              {p.role}
                            </div>
                          </div>
                          {active && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[#04140B]">
                              <Check size={12} strokeWidth={2.5} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#E5B85C] to-[#F7D58B] px-6 py-3 text-sm font-extrabold text-[#08101E] shadow-lg"
              >
                Next: Pick Openers &amp; Bowler
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/15">
                  →
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 3 && battingTeam && bowlingTeam && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#E5B85C]/30 bg-[#081223] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <TeamCrest
                    logo={battingTeam.logo}
                    name={battingTeam.name}
                    shortName={battingTeam.shortName}
                    color={battingTeam.primaryColor}
                    size={40}
                  />
                  <div>
                    <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-[#E5B85C] uppercase">
                      BATTING FIRST
                    </span>
                    <div className="text-lg font-extrabold text-white">
                      {battingTeam.name}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-hud block text-xs font-bold tracking-wider text-slate-300 uppercase">
                      Striker (Facing Ball 1)
                    </label>
                    <select
                      value={resolvedStriker}
                      onChange={(e) => setStrikerId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3.5 py-2.5 text-sm font-semibold text-white"
                    >
                      {battingXIPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.tag ? `(${p.tag})` : ""} — {p.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-hud block text-xs font-bold tracking-wider text-slate-300 uppercase">
                      Non-Striker
                    </label>
                    <select
                      value={resolvedNonStriker}
                      onChange={(e) => setNonStrikerId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3.5 py-2.5 text-sm font-semibold text-white"
                    >
                      {battingXIPlayers
                        .filter((p) => p.id !== resolvedStriker)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.tag ? `(${p.tag})` : ""} — {p.role}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-400/30 bg-[#081223] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <TeamCrest
                    logo={bowlingTeam.logo}
                    name={bowlingTeam.name}
                    shortName={bowlingTeam.shortName}
                    color={bowlingTeam.primaryColor}
                    size={40}
                  />
                  <div>
                    <span className="font-hud text-[11px] font-bold tracking-[0.2em] text-sky-300 uppercase">
                      BOWLING FIRST
                    </span>
                    <div className="text-lg font-extrabold text-white">
                      {bowlingTeam.name}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-hud block text-xs font-bold tracking-wider text-slate-300 uppercase">
                    Opening Bowler (Over 1)
                  </label>
                  <select
                    value={resolvedBowler}
                    onChange={(e) => setOpeningBowlerId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0F1E36] px-3.5 py-2.5 text-sm font-semibold text-white"
                  >
                    {bowlingXIPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.bowlingStyle ? `· ${p.bowlingStyle}` : `· ${p.role}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                  <strong className="text-[#F7D58B]">Match Format:</strong>{" "}
                  {oversPerInnings} Overs · Powerplay {powerplayOvers} Ov · Rope{" "}
                  {boundaryDistanceMeters}m · {venue}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleLaunchMatch}
                className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#E03340] via-[#F24B3E] to-[#E5B85C] px-7 py-3.5 text-sm font-extrabold tracking-wide text-white shadow-[0_12px_36px_rgba(224,51,64,0.38)] transition-all hover:scale-[1.01]"
              >
                <Play size={16} fill="currentColor" />
                START LIVE MATCH &amp; OPEN SCORER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
