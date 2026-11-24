import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ExternalLink,
  Plus,
  Sparkles,
  Trophy,
  Tv,
} from "lucide-react";
import type {
  BroadcastEffectTrigger,
  BroadcastState,
  MatchState,
  OverlayActiveCard,
} from "@/modules/core/types";
import {
  saveBroadcastState,
  subscribeBroadcastState,
  triggerOneShotEffect,
} from "@/modules/core/realtime";
import { recordBallDelivery } from "@/modules/scoring/lib/cricket-engine";
import { MatchSetupWizard } from "@/modules/scoring/components/MatchSetupWizard";
import { ScorerConsole } from "@/modules/scoring/components/ScorerConsole";
import { BroadcastDirector } from "@/modules/scoring/components/BroadcastDirector";
import { TournamentManager } from "@/modules/tournament/components/TournamentManager";
import { ObsOverlayCanvas } from "@/modules/overlays/components/ObsOverlayCanvas";
import { TeamCrest } from "@/modules/core/components/BrandMedia";

type StudioTab = "scorer" | "tournament" | "new-match";

function buildDemoMatch(state: BroadcastState): MatchState | null {
  const t1 = state.teams[0];
  const t2 = state.teams[1];
  if (!t1 || !t2 || t1.players.length < 3 || t2.players.length < 2) return null;

  const now = new Date().toISOString();
  let match: MatchState = {
    id: `demo-match-${Date.now()}`,
    matchNumber: state.matches.length + 1,
    stage: "League Match",
    title: `Match #${state.matches.length + 1} · ${t1.shortName} vs ${t2.shortName}`,
    venue: "Kadapa Stadium Ground",
    oversPerInnings: 10,
    powerplayOvers: 3,
    boundaryDistanceMeters: 58,
    teamAId: t1.id,
    teamBId: t2.id,
    teamAXI: t1.players.slice(0, 11).map((p) => p.id),
    teamBXI: t2.players.slice(0, 11).map((p) => p.id),
    tossWinnerId: t1.id,
    tossDecision: "bat",
    status: "live",
    currentInningsIndex: 0,
    innings: [
      {
        inningsNumber: 1,
        battingTeamId: t1.id,
        bowlingTeamId: t2.id,
        strikerId: t1.players[0].id,
        nonStrikerId: t1.players[1].id,
        currentBowlerId: t2.players[0].id,
        lastOverBowlerId: "",
        battingOrder: [t1.players[0].id, t1.players[1].id],
        bowlingOrder: [t2.players[0].id],
        balls: [],
        completed: false,
      },
      null,
    ],
    createdAt: now,
    updatedAt: now,
  };

  // Seed 9 exciting balls (including a 4 and an 88m 6!) so the operator sees live stats immediately
  const sampleBalls = [
    { runsOffBat: 1, extraType: "none" as const },
    { runsOffBat: 4, extraType: "none" as const },
    { runsOffBat: 0, extraType: "none" as const },
    {
      runsOffBat: 6,
      extraType: "none" as const,
      sixDistanceMeters: 88,
      sixZoneLabel: "DEEP MID-WICKET",
      shotAngleDeg: 72,
    },
    { runsOffBat: 2, extraType: "none" as const },
    { runsOffBat: 1, extraType: "none" as const },
    { runsOffBat: 4, extraType: "none" as const },
    { runsOffBat: 0, extraType: "wide" as const, extraRuns: 0 },
    {
      runsOffBat: 6,
      extraType: "none" as const,
      sixDistanceMeters: 96,
      sixZoneLabel: "OUT OF THE GROUND · LONG ON",
      shotAngleDeg: 38,
    },
  ];

  for (const b of sampleBalls) {
    if (match.innings[0]?.needsNextBowler) {
      match = {
        ...match,
        innings: [
          {
            ...match.innings[0],
            currentBowlerId: t2.players[1].id,
            bowlingOrder: Array.from(
              new Set([...match.innings[0].bowlingOrder, t2.players[1].id]),
            ),
            needsNextBowler: false,
          },
          null,
        ],
      };
    }
    match = recordBallDelivery(match, state.teams, b).match;
  }

  return match;
}

export function App() {
  const isOverlayRoute = window.location.pathname.startsWith("/overlay");
  if (isOverlayRoute) {
    return <ObsOverlayCanvas />;
  }

  return <BroadcastStudioApp />;
}

function BroadcastStudioApp() {
  const [state, setState] = useState<BroadcastState | null>(null);
  const [tab, setTab] = useState<StudioTab>("scorer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeBroadcastState(setState);
  }, []);

  const persistState = async (next: BroadcastState) => {
    setState(next);
    setSaving(true);
    try {
      const saved = await saveBroadcastState(next);
      setState(saved);
    } finally {
      setSaving(false);
    }
  };

  const activeMatch = useMemo(() => {
    if (!state) return null;
    return (
      state.matches.find((m) => m.id === state.activeMatchId) ||
      state.matches[state.matches.length - 1] ||
      null
    );
  }, [state]);

  const handleCreateMatch = (match: MatchState) => {
    if (!state) return;
    const next: BroadcastState = {
      ...state,
      matches: [...state.matches, match],
      activeMatchId: match.id,
      overlay: {
        ...state.overlay,
        activeCard: "none",
        activeEffect: null,
      },
    };
    setTab("scorer");
    persistState(next);
  };

  const handleUpdateActiveMatch = (
    updatedMatch: MatchState,
    effect?: BroadcastEffectTrigger | null,
    overlayPatch?: Partial<BroadcastState["overlay"]>,
  ) => {
    if (!state) return;
    const nextMatches = state.matches.map((m) =>
      m.id === updatedMatch.id ? updatedMatch : m,
    );
    const nextOverlay: BroadcastState["overlay"] = {
      ...state.overlay,
      ...overlayPatch,
      ...(effect !== undefined ? { activeEffect: effect } : {}),
    };
    persistState({
      ...state,
      matches: nextMatches,
      overlay: nextOverlay,
    });
  };

  const handlePatchOverlay = (patch: Partial<BroadcastState["overlay"]>) => {
    if (!state) return;
    persistState({
      ...state,
      overlay: { ...state.overlay, ...patch },
    });
  };

  const handleQuickShowCard = (
    card: OverlayActiveCard,
    extra?: Partial<BroadcastState["overlay"]>,
  ) => {
    handlePatchOverlay({ activeCard: card, ...extra });
  };

  const handleTriggerEffect = async (
    effect: Omit<BroadcastEffectTrigger, "id" | "triggeredAt">,
  ) => {
    const saved = await triggerOneShotEffect(effect);
    setState(saved);
  };

  const handleLoadDemo = () => {
    if (!state) return;
    const demo = buildDemoMatch(state);
    if (!demo) return;
    handleCreateMatch(demo);
  };

  if (!state) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#060B14] text-slate-300">
        <div className="text-center">
          <div className="font-display text-3xl font-extrabold text-[#F7D58B]">
            CONNECTING TO TKPL 2026 BROADCAST SERVER...
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Make sure the TKPL server window is running on port 4280.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_15%_0%,rgba(229,184,92,0.11),transparent_36%),radial-gradient(circle_at_88%_12%,rgba(224,51,64,0.12),transparent_38%),#060B14] pb-14">
      {/* Floating Top Studio Navigation Island */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex max-w-[1460px] flex-wrap items-center justify-between gap-3 rounded-full border border-white/12 bg-[#091324]/90 px-4 py-2.5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img
              src="/media/tkpl/brand/tkpl-official-logo-dark.png"
              alt="TKPL 2026"
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="font-display flex items-center gap-2 text-xl leading-none font-extrabold tracking-wider text-white">
                TKPL 2026 MATCH STUDIO
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-hud text-[10px] font-bold text-emerald-300 border border-emerald-400/35">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {saving ? "SYNCING..." : "LIVE SYNC"}
                </span>
              </div>
              <div className="font-hud text-[10px] font-bold tracking-[0.2em] text-[#E5B85C] uppercase">
                8 FRANCHISES · 137 AUCTION PLAYERS READY
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab("scorer")}
              className={`font-hud inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold tracking-wider uppercase transition-all ${
                tab === "scorer"
                  ? "bg-[#E5B85C] text-[#08101E]"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Activity size={14} /> Live Scorer
            </button>
            <button
              type="button"
              onClick={() => setTab("tournament")}
              className={`font-hud inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold tracking-wider uppercase transition-all ${
                tab === "tournament"
                  ? "bg-[#E5B85C] text-[#08101E]"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <Trophy size={14} /> Points &amp; Sponsors
            </button>
            <button
              type="button"
              onClick={() => setTab("new-match")}
              className={`font-hud inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold tracking-wider uppercase transition-all ${
                tab === "new-match"
                  ? "bg-[#E03340] text-white"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              <Plus size={14} /> New Match
            </button>
            <a
              href="/overlay?bg=preview"
              target="_blank"
              rel="noreferrer"
              className="font-hud inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-xs font-extrabold tracking-wider text-sky-200 uppercase hover:bg-sky-500/25"
            >
              <Tv size={14} /> Open Overlay Preview <ExternalLink size={12} />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-[1460px] px-4">
        {tab === "new-match" && (
          <MatchSetupWizard
            teams={state.teams}
            nextMatchNumber={state.matches.length + 1}
            defaultVenue={state.venueDefault}
            onCreateMatch={handleCreateMatch}
            onCancel={activeMatch ? () => setTab("scorer") : undefined}
          />
        )}

        {tab === "tournament" && (
          <TournamentManager
            state={state}
            onUpdateState={persistState}
            onSelectMatch={(matchId) => {
              persistState({ ...state, activeMatchId: matchId });
              setTab("scorer");
            }}
            onOpenNewMatch={() => setTab("new-match")}
          />
        )}

        {tab === "scorer" && (
          <>
            {!activeMatch ? (
              <div className="bezel-shell mx-auto max-w-4xl">
                <div className="bezel-core p-8 text-center">
                  <span className="font-hud inline-flex items-center gap-2 rounded-full border border-[#E5B85C]/40 bg-[#E5B85C]/15 px-4 py-1 text-xs font-extrabold tracking-[0.22em] text-[#F7D58B] uppercase">
                    <Sparkles size={13} /> READY FOR MATCH DAY
                  </span>
                  <h1 className="font-display mt-3 text-5xl font-extrabold tracking-wide text-white">
                    TKPL 2026 LIVE BROADCAST STUDIO
                  </h1>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
                    All 8 TKPL franchises, logos, colors, and 137 post-auction
                    players with photos are already loaded. Start your first live
                    match or launch a quick sample match to preview every OBS
                    overlay &amp; Six Distance effect right away!
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {state.teams.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5"
                      >
                        <TeamCrest
                          logo={t.logo}
                          name={t.name}
                          shortName={t.shortName}
                          color={t.primaryColor}
                          size={24}
                        />
                        <span className="font-hud text-xs font-bold text-slate-200">
                          {t.shortName}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setTab("new-match")}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E5B85C] to-[#F7D58B] px-7 py-3.5 text-sm font-extrabold text-[#08101E] shadow-lg"
                    >
                      <Plus size={16} /> START REAL MATCH #1
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDemo}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-400/45 bg-sky-500/15 px-6 py-3.5 text-sm font-bold text-sky-200 hover:bg-sky-500/25"
                    >
                      <Sparkles size={16} /> Load Sample Demo Match (Test OBS Now)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <ScorerConsole
                    state={state}
                    match={activeMatch}
                    onUpdateMatch={handleUpdateActiveMatch}
                    onQuickShowCard={handleQuickShowCard}
                  />
                </div>
                <div className="xl:col-span-4">
                  <BroadcastDirector
                    state={state}
                    activeMatch={activeMatch}
                    onPatchOverlay={handlePatchOverlay}
                    onTriggerEffect={handleTriggerEffect}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
