import type { CoachScheme, Dynasty, ID } from '../../game/types/dynasty'
import { DYNASTY_SAVE_VERSION } from '../../game/types/dynasty'
import { generateLeagueAndRosters } from '../../game/engine/generateLeague'
import { generateSchedule } from '../../game/engine/schedule/generateSchedule'
import { generateRecruitPool } from '../../game/engine/recruiting/generateRecruitPool'

type CreateDynastyArgs = {
  coachName: string
  userTeamId: ID
  coachScheme: CoachScheme
  seasonYear: number
}

type WorkerRequest =
  | { type: 'CREATE_DYNASTY'; args: CreateDynastyArgs }

type WorkerResponse =
  | { type: 'PROGRESS'; stage: string; detail?: string }
  | { type: 'COMPLETE'; dynasty: any }
  | { type: 'ERROR'; message: string }

function nowISO(): string {
  return new Date().toISOString()
}

function makeSeed(): number {
  return Math.floor(Math.random() * 2_000_000_000)
}

function makeId(prefix: string): ID {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  if (!msg) return

  if (msg.type !== 'CREATE_DYNASTY') return

  try {
    const args = msg.args

    ;(self as any).postMessage({ type: 'PROGRESS', stage: 'league', detail: 'Generating teams & rosters…' } satisfies WorkerResponse)

    const coachName = args.coachName.trim()
    if (!coachName) throw new Error('Coach name is required.')
    if (!args.userTeamId) throw new Error('Team is required.')

    const createdAtISO = nowISO()
    const seed = makeSeed()

    const base: Dynasty = {
      saveVersion: DYNASTY_SAVE_VERSION,
      dynastyId: makeId('dynasty'),
      createdAtISO,
      lastSavedAtISO: createdAtISO,
      rng: { seed, state: seed >>> 0 },
      world: { seasonYear: args.seasonYear, phase: 'PRESEASON', day: 0 },
      coach: {
        coachId: makeId('coach'),
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
      league: { userTeamId: args.userTeamId, teamsById: {}, gamesById: {}, standingsBySeason: {} },
      recruiting: { seasonYear: args.seasonYear, recruitPool: {}, boardsByTeamId: {}, competitionByRecruitId: {} },
      playersById: {},
    }

    const withLeague = generateLeagueAndRosters(base)

    ;(self as any).postMessage({ type: 'PROGRESS', stage: 'schedule', detail: 'Building season schedule…' } satisfies WorkerResponse)

    const withSchedule: Dynasty = {
      ...withLeague,
      league: {
        ...withLeague.league,
        schedule: generateSchedule(withLeague),
      },
    }

    ;(self as any).postMessage({ type: 'PROGRESS', stage: 'recruits', detail: 'Generating recruit pool…' } satisfies WorkerResponse)

    const recruitPool = generateRecruitPool(withSchedule, args.seasonYear)

    ;(self as any).postMessage({ type: 'PROGRESS', stage: 'recruiting', detail: 'Initializing recruiting boards…' } satisfies WorkerResponse)

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

    const competitionByRecruitId: Record<ID, ID[]> = {}
    for (const recruitId of Object.keys(recruitPool)) {
      competitionByRecruitId[recruitId] = []
    }

    const dynasty: Dynasty = {
      ...withSchedule,
      recruiting: {
        seasonYear: args.seasonYear,
        recruitPool,
        boardsByTeamId,
        competitionByRecruitId,
      },
    }

    ;(self as any).postMessage({ type: 'COMPLETE', dynasty } satisfies WorkerResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    ;(self as any).postMessage({ type: 'ERROR', message } satisfies WorkerResponse)
  }
}

