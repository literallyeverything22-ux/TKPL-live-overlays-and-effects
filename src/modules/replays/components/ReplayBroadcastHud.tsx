import type {
  InningsComputedSummary,
  MatchState,
  ReplaySystemState,
  Team,
} from "@/modules/core/types";
import { findPlayerInTeams } from "@/modules/scoring/lib/cricket-engine";
import {
  PlayerAvatar,
  RedTennisBallIcon,
  TeamCrest,
} from "@/modules/core/components/BrandMedia";

interface ReplayBroadcastHudProps {
  replays: ReplaySystemState;
  teams: Team[];
  match: MatchState | null;
  summary: InningsComputedSummary | null;
  battingTeam?: Team;
  isPreviewBg: boolean;
}

export function ReplayBroadcastHud({
  replays,
  teams,
  match,
  summary,
  battingTeam,
  isPreviewBg,
}: ReplayBroadcastHudProps) {
  if (replays.mode === "idle") return null;

  const clip =
    replays.clips.find((c) => c.id === replays.activeClipId) ||
    replays.previewClip;

  const found = findPlayerInTeams(teams, clip?.playerId);
  const player = found?.player;
  const clipTeam = teams.find((t) => t.id === clip?.teamId) || found?.team;
  const speedText =
    replays.mode === "paused"
      ? "PAUSED · FRAME CHECK"
      : replays.speedPercent >= 98
        ? "NORMAL 1.0×"
        : `SLOW MOTION ${(replays.speedPercent / 100).toFixed(2).replace(/0$/, "")}×`;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* Subtle Broadcast Replay Frame Rim + Corner Brackets */}
      <div className="absolute inset-4 rounded-[26px] border-2 border-[#E03340]/55 shadow-[inset_0_0_50px_rgba(224,51,64,0.16)]" />
      <div className="absolute top-4 left-4 h-12 w-12 rounded-tl-[26px] border-t-4 border-l-4 border-[#F7D58B]" />
      <div className="absolute top-4 right-4 h-12 w-12 rounded-tr-[26px] border-t-4 border-r-4 border-[#F7D58B]" />
      <div className="absolute bottom-4 left-4 h-12 w-12 rounded-bl-[26px] border-b-4 border-l-4 border-[#F7D58B]" />
      <div className="absolute right-4 bottom-4 h-12 w-12 rounded-br-[26px] border-r-4 border-b-4 border-[#F7D58B]" />

      {/* TOP-LEFT INSTANT REPLAY & SLOW-MO BUG */}
      <div className="anim-slide-down absolute top-8 left-10 flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-r from-[#E03340] via-[#F59E0B] to-[#E5B85C] p-[2px] shadow-[0_14px_40px_rgba(224,51,64,0.45)]">
          <div className="flex items-center gap-3.5 rounded-[14px] bg-[#081224]/95 px-5 py-2.5">
            <span className="anim-pulse-dot h-3.5 w-3.5 rounded-full bg-[#E03340] shadow-[0_0_16px_#E03340]" />
            <div>
              <div className="font-display text-3xl leading-none font-extrabold tracking-wider text-white">
                INSTANT REPLAY
              </div>
              <div className="font-hud text-xs font-extrabold tracking-[0.22em] text-[#F7D58B] uppercase">
                {speedText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Preview Center Plate ONLY when testing without OBS video */}
      {replays.isSimulatedPreview && isPreviewBg && (
        <div className="anim-pop-in absolute top-1/2 left-1/2 w-[920px] -translate-x-1/2 -translate-y-1/2">
          <div className="relative overflow-hidden rounded-3xl border border-[#F7D58B]/35 bg-[#071120]/85 p-10 text-center backdrop-blur-md">
            <div className="anim-scanline pointer-events-none absolute inset-y-0 left-0 w-44 bg-gradient-to-r from-transparent via-[#E03340]/20 to-transparent" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#F7D58B]/40 bg-[#E03340]/20">
              <RedTennisBallIcon size={38} />
            </div>
            <div className="font-display mt-3 text-5xl font-extrabold tracking-wide text-white">
              OBS SLOW-MO REPLAY VIDEO PLAYS HERE
            </div>
            <p className="mt-2 text-lg text-slate-300">
              In OBS Studio, your live camera replay clip fills this entire screen at{" "}
              <strong className="text-[#F7D58B]">{speedText}</strong> while the TKPL
              Replay frame &amp; lower-third sit cleanly on top.
            </p>
          </div>
        </div>
      )}

      {/* BOTTOM REPLAY CONTEXT LOWER-THIRD BAR */}
      <div className="anim-slide-up absolute bottom-8 left-1/2 w-[1760px] -translate-x-1/2">
        <div className="broadcast-bezel !rounded-[22px] !p-[2.5px]">
          <div
            className="flex items-center justify-between gap-6 rounded-[19.5px] px-7 py-3.5"
            style={{
              background: `linear-gradient(110deg, ${clipTeam?.primaryColor || "#E03340"}36 0%, rgba(10,19,35,0.96) 44%, rgba(6,12,24,0.98) 100%)`,
            }}
          >
            {/* Left: Player Photo + Event Callout */}
            <div className="flex min-w-0 items-center gap-4">
              {player ? (
                <PlayerAvatar
                  photo={player.photo}
                  name={player.name}
                  accentColor={clipTeam?.primaryColor || "#F7D58B"}
                  size={68}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E03340]/20 border border-[#E03340]/40">
                  <RedTennisBallIcon size={38} />
                </div>
              )}

              {clipTeam && (
                <TeamCrest
                  logo={clipTeam.logo}
                  name={clipTeam.name}
                  shortName={clipTeam.shortName}
                  color={clipTeam.primaryColor}
                  size={52}
                />
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-hud rounded bg-[#E03340] px-2.5 py-0.5 text-xs font-extrabold tracking-[0.2em] text-white uppercase">
                    {clip?.badge || "TKPL REPLAY"}
                  </span>
                  {clip?.meters && (
                    <span className="font-telemetry rounded bg-[#E5B85C]/25 px-2.5 py-0.5 text-xs font-extrabold text-[#F7D58B] border border-[#E5B85C]/40">
                      {clip.meters} METERS
                    </span>
                  )}
                </div>
                <div className="font-display mt-0.5 truncate text-4xl leading-none font-extrabold tracking-wide text-white uppercase">
                  {clip?.title || "TKPL 2026 HIGHLIGHT REPLAY"}
                </div>
                <div className="font-hud truncate text-sm font-bold tracking-[0.14em] text-slate-300 uppercase">
                  {clip?.subtitle || "TENNIS GURU LAZER RED HARD TENNIS BALL PREMIER LEAGUE"}
                </div>
              </div>
            </div>

            {/* Right: Compact Live Score Pill so viewers never lose track of the match */}
            {match && summary && battingTeam && (
              <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/15 bg-black/45 px-5 py-2.5">
                <TeamCrest
                  logo={battingTeam.logo}
                  name={battingTeam.name}
                  shortName={battingTeam.shortName}
                  color={battingTeam.primaryColor}
                  size={44}
                />
                <div className="text-right">
                  <div className="font-hud text-[11px] font-bold tracking-[0.2em] text-[#F7D58B] uppercase">
                    {battingTeam.shortName} · {summary.oversText} OV
                  </div>
                  <div className="font-display text-4xl leading-none font-extrabold text-white">
                    {summary.runs}/{summary.wickets}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
