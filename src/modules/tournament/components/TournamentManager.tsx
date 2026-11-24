import { useState } from "react";
import {
  Check,
  Database,
  Flame,
  Plus,
  Trash2,
  Trophy,
  UserPlus,
} from "lucide-react";
import type { BroadcastState, MatchState, Player } from "@/modules/core/types";
import { computeTournamentStats } from "@/modules/tournament/lib/stats-engine";
import { createServerBackup } from "@/modules/core/realtime";
import { PlayerAvatar, TeamCrest } from "@/modules/core/components/BrandMedia";

interface TournamentManagerProps {
  state: BroadcastState;
  onUpdateState: (next: BroadcastState) => void;
  onSelectMatch: (matchId: string) => void;
  onOpenNewMatch: () => void;
}

export function TournamentManager({
  state,
  onUpdateState,
  onSelectMatch,
  onOpenNewMatch,
}: TournamentManagerProps) {
  const report = computeTournamentStats(state.teams, state.matches);
  const [newSponsor, setNewSponsor] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(state.teams[0]?.id || "");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerRole, setNewPlayerRole] = useState("All-rounder");

  const selectedTeam = state.teams.find((t) => t.id === selectedTeamId);

  const handleAddSponsor = () => {
    const clean = newSponsor.trim();
    if (!clean) return;
    onUpdateState({
      ...state,
      overlay: {
        ...state.overlay,
        sponsorMessages: [...state.overlay.sponsorMessages, clean],
      },
    });
    setNewSponsor("");
  };

  const handleRemoveSponsor = (idx: number) => {
    onUpdateState({
      ...state,
      overlay: {
        ...state.overlay,
        sponsorMessages: state.overlay.sponsorMessages.filter((_, i) => i !== idx),
      },
    });
  };

  const handleAddPlayer = () => {
    if (!selectedTeam || !newPlayerName.trim()) return;
    const player: Player = {
      id: `${selectedTeam.id}-custom-${Date.now()}`,
      serialNumber: "",
      name: newPlayerName.trim(),
      role: newPlayerRole,
      battingStyle: "RHB",
      bowlingStyle: "",
      city: "Kadapa",
      age: null,
      grade: "",
      tag: "Sub",
      soldPrice: 0,
      photo: "",
    };
    const nextTeams = state.teams.map((t) =>
      t.id === selectedTeam.id ? { ...t, players: [...t.players, player] } : t,
    );
    onUpdateState({ ...state, teams: nextTeams });
    setNewPlayerName("");
  };

  const handleDeleteMatch = (matchId: string) => {
    const remaining = state.matches.filter((m) => m.id !== matchId);
    onUpdateState({
      ...state,
      matches: remaining,
      activeMatchId:
        state.activeMatchId === matchId
          ? remaining[remaining.length - 1]?.id || null
          : state.activeMatchId,
    });
  };

  const handleBackup = async () => {
    try {
      const res = await createServerBackup();
      setBackupMsg(`Saved backup: data/backups/${res.fileName}`);
      setTimeout(() => setBackupMsg(""), 4000);
    } catch {
      setBackupMsg("Backup failed — check server window.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tournament Headline Totals */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Matches Tracked", value: report.totalMatchesTracked, accent: "text-white" },
          { label: "Tournament Sixes (6s)", value: report.totalSixes, accent: "text-red-400" },
          { label: "Tournament Fours (4s)", value: report.totalFours, accent: "text-[#F7D58B]" },
          {
            label: "Biggest Six So Far",
            value: report.biggestSixes[0] ? `${report.biggestSixes[0].meters}m` : "—",
            accent: "text-orange-300",
          },
        ].map((card) => (
          <div key={card.label} className="bezel-shell">
            <div className="bezel-core p-4">
              <div className="font-hud text-[11px] font-bold tracking-[0.18em] text-slate-400 uppercase">
                {card.label}
              </div>
              <div className={`font-display mt-1 text-4xl font-extrabold ${card.accent}`}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Points Table */}
        <div className="bezel-shell lg:col-span-7">
          <div className="bezel-core p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display flex items-center gap-2 text-2xl font-extrabold text-white">
                <Trophy size={20} className="text-[#E5B85C]" /> TKPL 2026 POINTS TABLE
              </h3>
              <button
                type="button"
                onClick={handleBackup}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
              >
                <Database size={13} /> Save Backup
              </button>
            </div>
            {backupMsg && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
                <Check size={14} /> {backupMsg}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="font-hud border-b border-white/10 text-[11px] tracking-wider text-slate-400 uppercase">
                    <th className="py-2">#</th>
                    <th className="py-2">Franchise</th>
                    <th className="py-2 text-center">P</th>
                    <th className="py-2 text-center">W</th>
                    <th className="py-2 text-center">L</th>
                    <th className="py-2 text-center">NRR</th>
                    <th className="py-2 text-right">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {report.pointsTable.map((row, idx) => (
                    <tr key={row.teamId} className="hover:bg-white/[0.03]">
                      <td className="font-telemetry py-2.5 font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <TeamCrest
                            logo={row.logo}
                            name={row.teamName}
                            shortName={row.shortName}
                            color={row.primaryColor}
                            size={28}
                          />
                          <span className="font-bold text-white">{row.teamName}</span>
                        </div>
                      </td>
                      <td className="font-telemetry py-2.5 text-center text-slate-300">
                        {row.played}
                      </td>
                      <td className="font-telemetry py-2.5 text-center font-bold text-emerald-300">
                        {row.won}
                      </td>
                      <td className="font-telemetry py-2.5 text-center text-rose-300">
                        {row.lost}
                      </td>
                      <td className="font-telemetry py-2.5 text-center text-slate-300">
                        {row.nrrText}
                      </td>
                      <td className="font-display py-2.5 text-right text-xl font-extrabold text-[#F7D58B]">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Matches List + Sponsor Ticker Manager */}
        <div className="space-y-6 lg:col-span-5">
          <div className="bezel-shell">
            <div className="bezel-core p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-2xl font-extrabold text-white">
                  MATCHES ({state.matches.length})
                </h3>
                <button
                  type="button"
                  onClick={onOpenNewMatch}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#E5B85C] px-3.5 py-1.5 text-xs font-extrabold text-[#08101E]"
                >
                  <Plus size={14} /> New Match
                </button>
              </div>
              {state.matches.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No matches created yet. Click <strong>New Match</strong> to start Match #1!
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {state.matches.map((m: MatchState) => {
                    const isActive = m.id === state.activeMatchId;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                          isActive
                            ? "border-[#E5B85C]/50 bg-[#E5B85C]/12"
                            : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectMatch(m.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-xs font-extrabold text-white">
                            {m.title} ({m.stage})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {m.resultSummary || m.status.toUpperCase()} · {m.oversPerInnings} overs
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMatch(m.id)}
                          title="Delete match"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bezel-shell">
            <div className="bezel-core p-5">
              <h3 className="font-display mb-3 flex items-center gap-2 text-2xl font-extrabold text-white">
                <Flame size={18} className="text-red-400" /> SPONSOR &amp; TICKER MESSAGES
              </h3>
              <div className="space-y-2">
                {state.overlay.sponsorMessages.map((msg, idx) => (
                  <div
                    key={`${idx}-${msg}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200"
                  >
                    <span className="truncate">{msg}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSponsor(idx)}
                      className="text-slate-400 hover:text-red-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newSponsor}
                  onChange={(e) => setNewSponsor(e.target.value)}
                  placeholder="Add sponsor or tournament announcement..."
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddSponsor}
                  className="rounded-xl bg-[#E5B85C] px-4 py-2 text-xs font-extrabold text-[#08101E]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Squad Viewer & Substitute Player Adder */}
      <div className="bezel-shell">
        <div className="bezel-core p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display flex items-center gap-2 text-2xl font-extrabold text-white">
              <UserPlus size={18} className="text-sky-300" /> IMPORTED TKPL 2026 SQUADS
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {state.teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    t.id === selectedTeamId
                      ? "bg-[#E5B85C] text-[#08101E]"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {t.shortName} ({t.players.length})
                </button>
              ))}
            </div>
          </div>

          {selectedTeam && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#07111F] p-3">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder={`Add substitute player to ${selectedTeam.name}...`}
                  className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white"
                />
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value)}
                  className="rounded-lg border border-white/15 bg-[#0F1E36] px-3 py-1.5 text-xs text-white"
                >
                  <option value="All-rounder">All-rounder</option>
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddPlayer}
                  className="rounded-lg bg-sky-400 px-3.5 py-1.5 text-xs font-extrabold text-[#06101F]"
                >
                  + Add Player
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {selectedTeam.players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-2"
                  >
                    <PlayerAvatar
                      photo={p.photo}
                      name={p.name}
                      accentColor={selectedTeam.primaryColor}
                      size={36}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-white">
                        {p.name}
                      </div>
                      <div className="truncate text-[10px] text-slate-400">
                        {p.tag ? `${p.tag} · ` : ""}
                        {p.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
