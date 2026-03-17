// sim-desktop/src/game/engine/createDynasty.ts
import { generateLeagueAndRosters } from "./generateLeague"
import { generateSchedule } from "./schedule/generateSchedule"
import { generateRecruitPool } from "./recruiting/generateRecruitPool"
import { DYNASTY_SAVE_VERSION, type Dynasty, type ID, type CoachScheme } from "../types/dynasty"

type CreateDynastyArgs = {
  coachName: string
  userTeamId: ID
  coachScheme: CoachScheme
  seasonYear: number
  seed?: number
}

function nowISO(): string {
  return new Date().toISOString()
}

function makeSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000)
}

function makeId(prefix: string): ID {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function createDynasty(args: CreateDynastyArgs): Dynasty {
  const coachName = args.coachName.trim()
  if (!coachName) throw new Error("Coach name is required.")

  const userTeamId = args.userTeamId
  if (!userTeamId) throw new Error("Team is required.")

  const createdAtISO = nowISO()
  const seed = args.seed ?? makeSeed()

  const base: Dynasty = {
    saveVersion: DYNASTY_SAVE_VERSION,

    dynastyId: makeId("dynasty"),
    createdAtISO,
    lastSavedAtISO: createdAtISO,

    rng: {
      seed,
      state: seed >>> 0,
    },

    world: {
      seasonYear: args.seasonYear,
      phase: "PRESEASON",
      day: 0,
    },

    coach: {
      coachId: makeId("coach"),
      name: coachName,
      scheme: args.coachScheme,
      careerStats: {
        seasonsCoached: 1,
        totalWins: 0,
        totalLosses: 0,
        averagePrestige: 0,
        currentPrestigeTier: 'MID_TIER',
        yearsAtCurrentSchool: 1,
      },
      meta: {},
    },

    league: {
      userTeamId,
      teamsById: {},
      gamesById: {},
      standingsBySeason: {},
    },

    recruiting: {
      seasonYear: args.seasonYear,
      recruitPool: {},
      boardsByTeamId: {},
      competitionByRecruitId: {},
    },

    playersById: {},
  }

  const full = generateLeagueAndRosters(base)

  // Generate schedule for the season
  const withSchedule: Dynasty = {
    ...full,
    league: {
      ...full.league,
      schedule: generateSchedule(full),
    },
  }

  // Generate recruit pool for the season
  const recruitPool = generateRecruitPool(withSchedule, args.seasonYear)
  
  // Initialize recruiting boards for all teams
  const boardsByTeamId: Record<ID, any> = {}
  for (const teamId of Object.keys(withSchedule.league.teamsById)) {
    boardsByTeamId[teamId] = {
      teamId,
      recruitIds: [],
      hoursAllocatedByRecruitId: {},
      progressByRecruitId: {},
      scholarshipOfferedToRecruitId: {},
      visitScheduledForRecruitId: {},
      scoutingHoursUsedByRecruitId: {},
    }
  }
  
  // Initialize competition tracking
  const competitionByRecruitId: Record<ID, ID[]> = {}
  for (const recruitId of Object.keys(recruitPool)) {
    competitionByRecruitId[recruitId] = []
  }

  const withRecruiting: Dynasty = {
    ...withSchedule,
    recruiting: {
      seasonYear: args.seasonYear,
      recruitPool,
      boardsByTeamId,
      competitionByRecruitId,
    },
  }

  // NOTE:
  // CPU recruiting board initialization is intentionally DEFERRED.
  // Running `processCPURecruiting()` here can be very expensive (loops every team + many recruits),
  // and it blocks dynasty creation (UI can appear frozen / time out).
  // CPU boards will naturally populate as the season advances (weekly recruiting processing).

  // Hard guard so we never silently pass a broken object to the save layer.
  if (!withRecruiting.dynastyId) throw new Error("createDynasty(): dynastyId missing after generation.")
  return withRecruiting
}
