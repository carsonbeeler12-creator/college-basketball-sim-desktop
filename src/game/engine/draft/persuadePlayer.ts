// src/game/engine/draft/persuadePlayer.ts

import type { Dynasty, ID, PlayerState } from '../../types/dynasty'
import type { ClassYear } from '../../types/dynasty'

type Rng = { state: number }

function rand01(rng: Rng): number {
  // Simple RNG (same as other files)
  rng.state = ((rng.state * 1664525) + 1013904223) >>> 0
  return (rng.state >>> 0) / 0x100000000
}

/**
 * Check if a player is eligible and likely to declare for the draft.
 * Returns draft probability (0-1) or null if not eligible/likely.
 */
export function getDraftProbability(player: PlayerState): number | null {
  const classYear = player.identity.classYear as ClassYear
  const overall = player.ratings.overall ?? 0

  // Only juniors and sophomores can declare early
  if (classYear === 'SR' || classYear === 'FR') {
    return null // Seniors graduate, freshmen don't declare
  }

  // Juniors: high-rated players might declare
  if (classYear === 'JR') {
    if (overall >= 90) return 0.85
    if (overall >= 87) return 0.70
    if (overall >= 85) return 0.60
    if (overall >= 82) return 0.30
    return null // Not high enough rated
  }

  // Sophomores: exceptional players might declare
  if (classYear === 'SO') {
    if (overall >= 90) return 0.40
    if (overall >= 88) return 0.15
    return null // Not exceptional enough
  }

  return null
}

/**
 * Calculate persuasion success probability.
 * Factors:
 * - Team success (wins, tournament success)
 * - Player's minutes/role (more minutes = more loyalty)
 * - Player's overall rating (higher = harder to persuade)
 * - Team prestige
 */
export function calculatePersuasionChance(
  dynasty: Dynasty,
  teamId: ID,
  player: PlayerState
): number {
  const team = dynasty.league.teamsById[teamId]
  if (!team) return 0

  let baseChance = 0.30 // 30% base chance

  // Team success bonus - use PREVIOUS season's performance
  // (Since persuasion happens before the season starts, we look at last year)
  const previousSeasonYear = dynasty.world.seasonYear - 1
  const previousSeasonKey = String(previousSeasonYear)
  const previousStandings = dynasty.league.standingsBySeason?.[previousSeasonKey]
  
  let winPct = 0.5 // Default to average if no previous season data
  if (previousStandings && previousStandings.teamRecordsById) {
    const previousTeamRecord = previousStandings.teamRecordsById[teamId]
    if (previousTeamRecord) {
      const wins = previousTeamRecord.wins ?? 0
      const losses = previousTeamRecord.losses ?? 0
      winPct = wins + losses > 0 ? wins / (wins + losses) : 0.5
    }
  } else {
    // Fallback: use current season if we're mid-season (shouldn't happen but safety)
    const wins = team.season?.wins ?? 0
    const losses = team.season?.losses ?? 0
    winPct = wins + losses > 0 ? wins / (wins + losses) : 0.5
  }
  
  if (winPct >= 0.75) baseChance += 0.25 // Great season
  else if (winPct >= 0.65) baseChance += 0.15 // Good season
  else if (winPct >= 0.50) baseChance += 0.05 // Average season
  else baseChance -= 0.10 // Poor season

  // Player role bonus (more minutes = more loyalty)
  // Use previous season's stats (player.stats should reflect last season before new season starts)
  const totalGames = player.stats.gamesPlayed || 1
  const avgMinutes = totalGames > 0 ? (player.stats.minutes / totalGames) : 0
  
  if (avgMinutes >= 30) baseChance += 0.20 // Star player
  else if (avgMinutes >= 25) baseChance += 0.15 // Starter
  else if (avgMinutes >= 20) baseChance += 0.10 // Key rotation
  else if (avgMinutes >= 15) baseChance += 0.05 // Rotation player

  // Overall rating penalty (higher rated = harder to persuade)
  const overall = player.ratings.overall ?? 0
  if (overall >= 90) baseChance -= 0.25 // Elite players are hard to keep
  else if (overall >= 87) baseChance -= 0.15
  else if (overall >= 85) baseChance -= 0.10

  // Clamp between 0 and 0.95 (never 100% guaranteed)
  return Math.max(0.05, Math.min(0.95, baseChance))
}

/**
 * Attempt to persuade a player to stay instead of declaring for the draft.
 * Returns updated dynasty with persuasion result tracked.
 */
export function persuadePlayerToStay(
  dynasty: Dynasty,
  teamId: ID,
  playerId: ID
): { dynasty: Dynasty; success: boolean; chance: number } | null {
  const player = dynasty.playersById[playerId]
  if (!player) return null

  // Check if player is on this team
  if (player.team.teamId !== teamId) return null

  // Check if player is draft-eligible and likely to declare
  const draftProb = getDraftProbability(player)
  if (!draftProb || draftProb < 0.20) {
    return null // Not likely enough to declare, no need to persuade
  }

  // Calculate persuasion chance
  const chance = calculatePersuasionChance(dynasty, teamId, player)

  // Roll for success
  const rng: Rng = { state: dynasty.rng.state >>> 0 }
  const roll = rand01(rng)
  const success = roll < chance

  // Track persuasion attempt in player state
  const updatedPlayer: PlayerState = {
    ...player,
    draftDeclaration: {
      willDeclare: !success, // If persuasion failed, they will declare
      persuaded: success,
      persuasionAttempted: true,
      persuasionChance: chance,
    },
  }

  const updatedDynasty: Dynasty = {
    ...dynasty,
    rng: {
      ...dynasty.rng,
      state: rng.state >>> 0,
    },
    playersById: {
      ...dynasty.playersById,
      [playerId]: updatedPlayer,
    },
  }

  return {
    dynasty: updatedDynasty,
    success,
    chance,
  }
}

/**
 * Get all players on a team who are likely to declare for the draft.
 */
export function getPlayersLikelyDeclaring(
  dynasty: Dynasty,
  teamId: ID
): Array<{ 
  player: PlayerState
  draftProbability: number
  canPersuade: boolean // Hasn't been persuaded yet
  persuasionChance?: number // Success chance if attempted
}> {
  const team = dynasty.league.teamsById[teamId]
  if (!team || !team.roster) return []

  const rosterPlayerIds = team.roster.playerIds ?? []
  const result: Array<{ 
    player: PlayerState
    draftProbability: number
    canPersuade: boolean
    persuasionChance?: number
  }> = []

  for (const playerId of rosterPlayerIds) {
    const player = dynasty.playersById[playerId]
    if (!player) continue

    // Skip if already persuaded
    if (player.draftDeclaration?.persuaded) continue

    const draftProb = getDraftProbability(player)
    if (draftProb && draftProb >= 0.20) { // Only show if at least 20% likely
      const alreadyAttempted = player.draftDeclaration?.persuasionAttempted ?? false
      const persuasionChance = alreadyAttempted 
        ? player.draftDeclaration?.persuasionChance
        : calculatePersuasionChance(dynasty, teamId, player)

      result.push({ 
        player, 
        draftProbability: draftProb,
        canPersuade: !alreadyAttempted,
        persuasionChance,
      })
    }
  }

  // Sort by draft probability (descending)
  result.sort((a, b) => b.draftProbability - a.draftProbability)

  return result
}
