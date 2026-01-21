// src/game/engine/tournament/initializeTournament.ts
// Initialize tournament: selection + bracket generation

import type { Dynasty } from '../../types/dynasty'
import { selectTournament } from './selectTournament'
import { generateBracket } from './generateBracket'

/**
 * Initialize tournament for the current season.
 * This should be called when the regular season ends (transitioning to POSTSEASON).
 */
export function initializeTournament(dynasty: Dynasty): Dynasty {
  // Check if tournament already exists
  if (dynasty.league.tournament) {
    return dynasty // Already initialized
  }

  // Step 1: Select teams (autobids + at-large)
  const selection = selectTournament(dynasty)

  // Step 2: Generate bracket
  const bracket = generateBracket(selection, dynasty.world.day + 1) // Start next day

  // Step 3: Update dynasty with tournament
  return {
    ...dynasty,
    league: {
      ...dynasty.league,
      tournament: bracket,
    },
    world: {
      ...dynasty.world,
      phase: 'POSTSEASON',
    },
  }
}
