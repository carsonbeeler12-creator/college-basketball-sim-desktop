// src/game/engine/development/startNewSeason.ts

import type { Dynasty, ID, RecruitingBoard } from '../../types/dynasty'
import { generateRecruitPool } from '../recruiting/generateRecruitPool'
import { generateSchedule } from '../schedule/generateSchedule'

/**
 * Advances the dynasty from OFFSEASON to PRESEASON.
 * This handles:
 * 1. Applying prestige adjustments from last season achievements
 * 2. Incrementing the season year
 * 3. Generating a new recruit pool
 * 4. Resetting recruiting boards
 * 5. Generating a new schedule
 * 6. Resetting team records and stats
 */
export function startNewSeason(dynasty: Dynasty): Dynasty {
  const rng = { state: dynasty.rng.state }
  const newSeasonYear = dynasty.world.seasonYear + 1
  
  // Create new dynasty state
  const newDynasty: Dynasty = {
    ...dynasty,
    world: {
      ...dynasty.world,
      seasonYear: newSeasonYear,
      phase: 'PRESEASON',
      day: 0, // Reset day counter for new season
    },
    league: {
      ...dynasty.league,
      teamsById: { ...dynasty.league.teamsById },
    },
    recruiting: {
      seasonYear: newSeasonYear,
      recruitPool: {}, // Will be populated
      boardsByTeamId: {}, // Will be reset
      competitionByRecruitId: {}, // Will be reset
    },
  }

  // Generate new recruit pool using the proper implementation
  const newRecruitPool = generateRecruitPool(newDynasty, newSeasonYear)
  newDynasty.recruiting.recruitPool = newRecruitPool

  // Reset recruiting boards for all teams
  for (const teamId of Object.keys(newDynasty.league.teamsById)) {
    newDynasty.recruiting.boardsByTeamId[teamId] = createEmptyRecruitingBoard(teamId)
  }

  // Reset team season records and stats (but preserve prestige modifications)
  for (const teamId of Object.keys(newDynasty.league.teamsById)) {
    const team = newDynasty.league.teamsById[teamId]
    newDynasty.league.teamsById[teamId] = {
      ...team,
      season: {
        wins: 0,
        losses: 0,
        confWins: 0,
        confLosses: 0,
      },
    }
  }

  // Generate new schedule for the season
  newDynasty.league.schedule = generateSchedule(newDynasty)

  // Update RNG state
  newDynasty.rng.state = rng.state

  return newDynasty
}

/**
 * Create an empty recruiting board for a team
 */
function createEmptyRecruitingBoard(teamId: ID): RecruitingBoard {
  return {
    teamId,
    recruitIds: [],
    hoursAllocatedByRecruitId: {},
    progressByRecruitId: {},
    scholarshipOfferedToRecruitId: {},
    visitScheduledForRecruitId: {},
    scoutingHoursUsedByRecruitId: {},
  }
}