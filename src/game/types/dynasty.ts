// src/game/types/dynasty.ts

import type { PlayerAward } from '../types'

export type ID = string;

/**
 * Increment when save schema changes in a breaking way.
 * We bump to 3 because Archetype values changed to the v1 list.
 */
export const DYNASTY_SAVE_VERSION = 3 as const;

/**
 * v1 Archetypes (LOCKED)
 * Must match engine/ratings/archetypes.ts and any UI rendering.
 */
export type Archetype =
  | "PRIMARY_SCORER"
  | "FACILITATOR"
  | "SHOOTER"
  | "TWO_WAY_GUARD"
  | "WING_SCORER"
  | "THREE_AND_D_WING"
  | "ALL_AROUND_WING"
  | "POST_SCORER"
  | "RIM_PROTECTOR"
  | "REBOUNDER_ENERGY_BIG"
  | "STRETCH_BIG";

export type Dynasty = {
  saveVersion: number;

  dynastyId: ID;
  createdAtISO: string;
  lastSavedAtISO: string;

  rng: {
    seed: number;
    state: number;
  };

  world: {
    seasonYear: number;
    phase: WorldPhase;
    day: number;
  };

  coach: CoachProfile;

  league: {
    userTeamId: ID;
    teamsById: Record<ID, TeamState>;
    gamesById: Record<ID, GameState>;
    standingsBySeason: Record<string, StandingsSeason>;
    schedule?: Schedule; // Full season schedule
    seasonStats?: {
      teamsById: Record<ID, import('../engine/stats/seasonStats').TeamSeasonTotals>;
      playersById: Record<ID, import('../engine/stats/seasonStats').SeasonTotals>;
    };
    tournament?: import('../engine/tournament/generateBracket').TournamentBracket;
    conferenceTournaments?: Record<string, ConferenceTournamentBracket>; // Conference tournaments by conference ID
    seasonHighlights?: SeasonHighlight[]; // Major events from the season
  };

  recruiting: RecruitingState;

  playersById: Record<ID, PlayerState>;
};

export type WorldPhase =
  | "PRESEASON"
  | "NON_CONFERENCE"
  | "CONFERENCE"
  | "CONF_TOURNAMENT" // Conference tournaments before National tournament
  | "TOURNAMENT_READY"
  | "POSTSEASON"
  | "OFFSEASON";

export type CoachProfile = {
  coachId: ID;
  name: string;
  meta?: Record<string, unknown>;
};

export type RotationStyle = "TIGHT" | "NORMAL" | "DEEP";

export type TeamRotationSettings = {
  style: RotationStyle;
  rotationSizeTarget: number; // e.g. 8.5
  benchFactor: number; // 0..1
  blowoutBenchFactor: number; // 0..1
};

export type TeamRotationState = {
  minutesTargetByPlayerId: Record<ID, number>; // 0 means auto
  depthChart: Record<Position, ID[]>;
  settings: TeamRotationSettings;
};

export type TeamState = {
  teamId: ID;
  name: string; // Team name (e.g., "Durham University Blue Demons")

  meta?: {
    pace: number; // ~60..80 possessions target
    conferenceId?: string; // Conference identifier
  };

  roster: {
    playerIds: ID[];
    redshirtedPlayerIds: ID[];
  };

  season: {
    wins: number;
    losses: number;
    confWins: number;
    confLosses: number;

    teamRating?: number;
  };

  rotation: TeamRotationState;

  prestige?: {
    dynamicModifier: number; // Cumulative prestige changes from achievements (added to base prestige from TEAMS data)
    lastAdjustedYear?: number; // Last season when prestige was adjusted
  };
};

export type PlayerState = {
  playerId: ID;

  identity: {
    firstName: string;
    lastName: string;
    age: number;
    classYear: ClassYear;
    position: Position;
    archetype: Archetype;

    heightIn: number;
    weightLb: number;
    hometown?: string;
  };

  ratings: PlayerRatings;

  development: {
    potential: number;
    workEthic?: number;
    durability?: number;
  };

  // Career awards and honors
  awards?: {
    seasonYear: number;
    awards: PlayerAward[];
  }[];

  team: {
    teamId: ID;
    isRedshirt: boolean;
  };

  // Draft declaration tracking
  draftDeclaration?: {
    willDeclare: boolean;
    persuaded: boolean; // Whether coach successfully persuaded them to stay
    persuasionAttempted: boolean;
    persuasionChance?: number; // Chance at time of persuasion attempt
  };

  stats: {
    seasonYear: number;
    gamesPlayed: number;
    minutes: number;

    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;

    fgm: number;
    fga: number;
    tpm: number;
    tpa: number;
    ftm: number;
    fta: number;

    turnovers: number;
    fouls: number;
  };
};

export type PlayerRatings = {
  // Derived from subratings (position-weighted)
  overall: number;

  // Offense
  shooting2: number; // midrange
  shooting3: number;
  freeThrow: number;
  finishing: number; // rim finishing + pressure
  ballHandling: number;
  passing: number;

  // Defense
  perimeterDefense: number;
  rimDefense: number;
  steal: number;
  block: number;

  // Physical
  athleticism: number;
  strength: number;
  stamina: number;
};

export type RatingKey = Exclude<keyof PlayerRatings, "overall">;

export type ClassYear = "FR" | "SO" | "JR" | "SR";
export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type GameState = {
  gameId: ID;

  seasonYear: number;
  day: number;

  homeTeamId: ID;
  awayTeamId: ID;

  status: "SCHEDULED" | "FINAL";

  result?: {
    homeScore: number;
    awayScore: number;
    boxScore?: BoxScore;
  };
};

export type BoxScore = {
  meta?: {
    possessions?: number;
    overtimes?: number;
  };
  teamStats: {
    home: TeamBoxScoreLine;
    away: TeamBoxScoreLine;
  };
  playerLinesByTeam: {
    home: PlayerBoxScoreLine[];
    away: PlayerBoxScoreLine[];
  };
};

export type TeamBoxScoreLine = {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;

  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;

  turnovers: number;
  fouls: number;
};

export type PlayerBoxScoreLine = {
  playerId: ID;
  minutes: number;

  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;

  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;

  turnovers: number;
  fouls: number;
};

export type StandingsSeason = {
  seasonYear: number;
  teamRecordsById: Record<ID, TeamRecord>;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
};

/**
 * Recruiting system state.
 */
export type RecruitingState = {
  seasonYear: number;
  
  // Global recruit pool (all available recruits)
  recruitPool: Record<ID, Recruit>;
  
  // Recruiting boards per team
  boardsByTeamId: Record<ID, RecruitingBoard>;
  
  // Competition tracking (which teams are recruiting which players)
  competitionByRecruitId: Record<ID, ID[]>; // recruitId -> array of teamIds recruiting them
};

/**
 * A recruit (potential player to sign).
 */
export type Recruit = {
  recruitId: ID;
  
  // Identity
  firstName: string;
  lastName: string;
  position: Position;
  heightIn: number;
  weightLb: number;
  hometown: string; // "City, State"
  
  // Ratings (current ability)
  ratings: PlayerRatings;
  
  // Potential and development
  potential: number; // Max ceiling (35-99)
  gemBustStatus: GemBustStatus; // Hidden until scouted
  
  // Star rating (1-5, reflects current ability and national demand)
  starRating: 1 | 2 | 3 | 4 | 5;
  
  // Generational talent flag (extremely rare - true unicorns)
  isGenerational?: boolean; // Only possible for 5-star recruits, ~0.5% chance
  
  // National recruiting rank (1-100, only top 100 are ranked)
  rank?: number; // 1 = #1 recruit, 100 = #100 recruit
  
  // Interest in schools (0-100, higher = more interested)
  interestByTeamId: Record<ID, number>;
  
  // Status
  status: RecruitStatus;
  committedToTeamId?: ID; // If committed, which team
  commitmentWeek?: number; // When they committed (week number)
  
  // Scouting
  scoutedByTeamId: Record<ID, ScoutLevel>; // Which teams have scouted, and to what level
};

/**
 * Gem/Bust status (affects development curve, not initial ratings).
 */
export type GemBustStatus = "NORMAL" | "GEM" | "BUST";

/**
 * Recruit commitment status.
 */
export type RecruitStatus = "UNCOMMITTED" | "COMMITTED" | "SIGNED";

/**
 * Scouting level (what information is revealed).
 */
export type ScoutLevel = "NONE" | "PARTIAL" | "FULL"; // NONE = not scouted, PARTIAL = ratings band visible, FULL = everything including gem/bust

/**
 * A team's recruiting board.
 */
export type RecruitingBoard = {
  teamId: ID;
  
  // Recruits on this team's board (max 20)
  recruitIds: ID[];
  
  // Hour allocation per recruit (how many hours allocated this week)
  hoursAllocatedByRecruitId: Record<ID, number>;
  
  // Progress tracking (percentage toward commitment, 0-100)
  progressByRecruitId: Record<ID, number>;
  
  // Scholarship offers (must offer scholarship for player to commit)
  scholarshipOfferedToRecruitId: Record<ID, boolean>;
  
  // Visit tracking
  visitScheduledForRecruitId: Record<ID, number>; // recruitId -> game day when visit is scheduled
  
  // Scouting hours used this week (resets each week)
  scoutingHoursUsedByRecruitId: Record<ID, number>; // recruitId -> hours used for scouting this week
};

/**
 * Schedule structure for a season.
 * Games are organized by day for efficient lookup.
 */
export type Schedule = {
  seasonYear: number;
  gamesByDay: Record<number, ScheduledGame[]>; // day -> games on that day
};

export type ScheduledGame = {
  gameId: ID;
  homeTeamId: ID;
  awayTeamId: ID;
  isConferenceGame: boolean;
  day: number;
};

/**
 * Conference definition.
 */
export type Conference = {
  id: string; // e.g., "acc", "big-ten"
  name: string; // e.g., "Atlantic Coast Conference" (fictional name)
  teamIds: ID[]; // Teams in this conference
};

/**
 * Season highlights - major events to display at end of season
 */
export type SeasonHighlight = {
  type: 'AWARD' | 'TOURNAMENT' | 'PRESTIGE' | 'MILESTONE' | 'RECRUITING';
  teamId?: ID;
  playerId?: ID;
  title: string;
  description: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW'; // For sorting/filtering
};

/**
 * Conference tournament bracket structure
 */
export type ConferenceTournamentGame = {
  gameId: ID;
  round: string; // "Quarterfinals", "Semifinals", "Championship"
  team1Id: ID | null;
  team2Id: ID | null;
  winnerId: ID | null;
  score1: number | null;
  score2: number | null;
  day: number;
};

export type ConferenceTournamentBracket = {
  conferenceId: string;
  conferenceName: string;
  seasonYear: number;
  teams: Array<{ teamId: ID; seed: number }>; // Seeded by conference record
  games: ConferenceTournamentGame[];
  champion: ID | null; // Winner of tournament
};
