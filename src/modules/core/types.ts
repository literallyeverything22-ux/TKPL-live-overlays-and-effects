export interface Player {
  id: string;
  serialNumber: string;
  name: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  city: string;
  age: number | null;
  grade: string;
  tag: string;
  soldPrice: number;
  photo: string;
}

export interface Team {
  id: string;
  slotNumber: number;
  name: string;
  shortName: string;
  ownerName: string;
  coOwnerName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  players: Player[];
}

export type ExtraType = "none" | "wide" | "noball" | "bye" | "legbye";

export type DismissalType =
  | "bowled"
  | "caught"
  | "lbw"
  | "runout"
  | "stumped"
  | "hitwicket"
  | "retired";

export interface WicketInfo {
  dismissalType: DismissalType;
  outPlayerId: string;
  fielderId?: string;
  fielderName?: string;
  bowlerCredited: boolean;
}

export interface BallEvent {
  id: string;
  sequence: number;
  overNumber: number; // 0-indexed over number
  ballInOver: number; // 1..6 for legal balls, 0 for extras not counting
  legalBall: boolean;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extraType: ExtraType;
  extraRuns: number;
  totalRuns: number;
  isBoundaryFour: boolean;
  isBoundarySix: boolean;
  sixDistanceMeters?: number;
  sixZoneLabel?: string;
  shotAngleDeg?: number;
  isFreeHitBall: boolean;
  wicket?: WicketInfo;
  prevStrikerId: string;
  prevNonStrikerId: string;
  prevBowlerId: string;
  timestamp: string;
}

export interface InningsState {
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  lastOverBowlerId: string;
  battingOrder: string[];
  bowlingOrder: string[];
  balls: BallEvent[];
  completed: boolean;
  target?: number;
  needsNextBatter?: boolean;
  needsNextBowler?: boolean;
}

export type MatchStage =
  | "League Match"
  | "Qualifier 1"
  | "Eliminator"
  | "Qualifier 2"
  | "Grand Finale";

export type MatchStatus = "setup" | "live" | "innings-break" | "completed";

export interface MatchState {
  id: string;
  matchNumber: number;
  stage: MatchStage;
  title: string;
  venue: string;
  oversPerInnings: number;
  powerplayOvers: number;
  boundaryDistanceMeters: number;
  teamAId: string;
  teamBId: string;
  teamAXI: string[];
  teamBXI: string[];
  tossWinnerId: string;
  tossDecision: "bat" | "bowl";
  status: MatchStatus;
  currentInningsIndex: 0 | 1;
  innings: [InningsState | null, InningsState | null];
  winnerTeamId?: string;
  resultSummary?: string;
  manOfTheMatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export type OverlayActiveCard =
  | "none"
  | "vs-banner"
  | "playing-xi"
  | "new-batter"
  | "bowler-intro"
  | "batter-spotlight"
  | "bowler-spotlight"
  | "scorecard"
  | "over-graph"
  | "points-table"
  | "tournament-leaders"
  | "match-summary";

export type BroadcastEffectType =
  | "four"
  | "six"
  | "wicket"
  | "free-hit"
  | "milestone"
  | "hat-trick"
  | "powerplay"
  | "match-win"
  | "custom";

export interface BroadcastEffectTrigger {
  id: number;
  type: BroadcastEffectType;
  title: string;
  subtitle?: string;
  badge?: string;
  playerId?: string;
  teamId?: string;
  meters?: number;
  zoneLabel?: string;
  shotAngleDeg?: number;
  statLine?: string;
  durationMs: number;
  triggeredAt: number;
}

export interface OverlayControlState {
  showScorebar: boolean;
  showCornerBug: boolean;
  showSponsorTicker: boolean;
  showWinPredictor: boolean;
  showTournamentSixesCounter: boolean;
  soundEnabled: boolean;
  activeCard: OverlayActiveCard;
  cardTeamId?: string;
  cardInningsIndex?: 0 | 1;
  spotlightPlayerId?: string;
  customTickerAlert?: string;
  sponsorMessages: string[];
  activeEffect: BroadcastEffectTrigger | null;
}

export interface ReplayClip {
  id: string;
  filePath: string;
  fileName: string;
  createdAt: string;
  title: string;
  subtitle: string;
  badge: string;
  eventType: "six" | "four" | "wicket" | "highlight";
  overLabel: string;
  playerId?: string;
  teamId?: string;
  meters?: number;
  matchNumber: number;
}

export interface StingerTrigger {
  id: number;
  direction: "in" | "out" | "manual";
  label: string;
  triggeredAt: number;
}

export type ThirdUmpireStatus = "idle" | "pending" | "out" | "not-out";

export interface ReplaySystemState {
  mode: "idle" | "playing" | "paused";
  activeClipId: string | null;
  previewClip?: ReplayClip;
  speedPercent: number;
  isSimulatedPreview: boolean;
  stinger: StingerTrigger | null;
  thirdUmpire: {
    status: ThirdUmpireStatus;
    note: string;
    updatedAt: number;
  };
  clips: ReplayClip[];
}

export interface ObsStatus {
  connected: boolean;
  connecting: boolean;
  url: string;
  currentScene: string;
  replayBufferActive: boolean;
  hasReplaySource: boolean;
  hasOverlaySource: boolean;
  replayInputName: string;
  overlayInputName: string;
  lastError: string;
}

export interface BroadcastState {
  version: number;
  revision: number;
  updatedAt: string;
  tournamentName: string;
  tournamentSubtitle: string;
  website: string;
  venueDefault: string;
  teams: Team[];
  matches: MatchState[];
  activeMatchId: string | null;
  overlay: OverlayControlState;
  replays?: ReplaySystemState;
}

export interface BatterStats {
  playerId: string;
  name: string;
  photo: string;
  tag: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalText: string;
  isStriker: boolean;
  isNonStriker: boolean;
  biggestSix: number;
}

export interface BowlerStats {
  playerId: string;
  name: string;
  photo: string;
  bowlingStyle: string;
  legalBalls: number;
  oversText: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  dots: number;
  foursConceded: number;
  sixesConceded: number;
  wides: number;
  noBalls: number;
  isCurrent: boolean;
}

export interface OverSummary {
  overNumber: number; // 1-based for display
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  cumulativeRuns: number;
  bowlerId: string;
  balls: BallEvent[];
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  oversText: string;
  batterId: string;
  batterName: string;
}

export interface InningsComputedSummary {
  runs: number;
  wickets: number;
  legalBalls: number;
  oversText: string;
  crr: number;
  projectedScore: number;
  fours: number;
  sixes: number;
  biggestSixMeters: number;
  extrasTotal: number;
  extrasBreakdown: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  partnership: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
  };
  last12Balls: {
    runs: number;
    wickets: number;
    balls: number;
  };
  currentOverBalls: BallEvent[];
  currentOverRuns: number;
  isFreeHitNext: boolean;
  isPowerplay: boolean;
  isHatTrickBall: boolean;
  battingCard: BatterStats[];
  bowlingCard: BowlerStats[];
  fallOfWickets: FallOfWicket[];
  overByOver: OverSummary[];
  chase?: {
    target: number;
    runsNeeded: number;
    ballsRemaining: number;
    rrr: number;
    battingWinPct: number;
    bowlingWinPct: number;
    isLastOverThriller: boolean;
  };
}

export interface NetworkInfo {
  port: number;
  lanIps: string[];
  localhostUrl: string;
  overlayUrl: string;
  previewOverlayUrl: string;
  greenOverlayUrl: string;
  scorerUrls: string[];
  lanOverlayUrls: string[];
}
