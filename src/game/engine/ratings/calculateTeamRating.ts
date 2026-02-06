// src/game/engine/ratings/calculateTeamRating.ts

import type { Dynasty, ID } from '../../types/dynasty'

/**
 * Calculate a realistic team rating (0-100) based on:
 * 1. Win-loss record (40% weight)
 * 2. Strength of Schedule (30% weight) - opponent average quality
 * 3. Strength of Victory (20% weight) - wins against quality opponents
 * 4. Net point differential (10% weight) - margin of victory
 * 
 * This mimics the NCAA RPI system but simplified for performance.
 * Rating updates throughout the season as more games are played.
 */
export function calculateTeamRating(
  teamId: ID,
  dynasty: Dynasty
): number {
  const teamsById = dynasty.league.teamsById
  const teamState = teamsById[teamId]

  if (!teamState) return 50 // Default neutral rating

  // Get team's games
  const wins = teamState.season?.wins ?? 0
  const losses = teamState.season?.losses ?? 0
  const totalGames = wins + losses

  // If no games played, return base rating (slightly above average)
  if (totalGames === 0) {
    return 55 // Slight benefit of the doubt
  }

  // Component 1: Win percentage (40% weight)
  const winPct = wins / totalGames
  const winPctRating = 25 + winPct * 50 // Range: 25-75

  // Component 2: Strength of Schedule (30% weight)
  // Average opponent rating from all games played
  const scheduleStrength = calculateScheduleStrength(teamId, dynasty)
  const sosRating = 25 + scheduleStrength * 50 // Range: 25-75

  // Component 3: Strength of Victory (20% weight)
  // Average opponent rating ONLY from wins
  const strengthOfVictory = calculateStrengthOfVictory(teamId, dynasty)
  const sovRating = 25 + strengthOfVictory * 50 // Range: 25-75

  // Component 4: Net Point Differential (10% weight)
  const pointDiff = calculatePointDifferential(teamId, dynasty)
  // Normalize to -40...+40, then scale to 25-75 range
  const normalizedDiff = Math.max(-1, Math.min(1, pointDiff / 40))
  const ppdRating = 50 + normalizedDiff * 25 // Range: 25-75

  // Combine all components
  const rating =
    winPctRating * 0.4 +
    sosRating * 0.3 +
    sovRating * 0.2 +
    ppdRating * 0.1

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(rating)))
}

/**
 * Calculate strength of schedule: average opponent rating across all games
 */
function calculateScheduleStrength(teamId: ID, dynasty: Dynasty): number {
  const teamsById = dynasty.league.teamsById
  const gamesById = dynasty.league.gamesById
  const teamState = teamsById[teamId]

  if (!teamState) return 0.5

  let totalOpponentRating = 0
  let gameCount = 0

  for (const gameId of Object.keys(gamesById)) {
    const game = gamesById[gameId]
    if (!game || game.status !== 'FINAL') continue

    let opponentId: ID | null = null
    if (game.homeTeamId === teamId) {
      opponentId = game.awayTeamId
    } else if (game.awayTeamId === teamId) {
      opponentId = game.homeTeamId
    } else {
      continue
    }

    const opponent = teamsById[opponentId]
    if (!opponent) continue

    // Get opponent's rating (recursive, but limited depth)
    const opponentRating = opponent.season?.teamRating ?? 50
    totalOpponentRating += opponentRating
    gameCount += 1
  }

  if (gameCount === 0) return 0.5
  const avgOpponentRating = totalOpponentRating / gameCount
  return Math.max(0, Math.min(1, avgOpponentRating / 100)) // Normalize to 0-1
}

/**
 * Calculate strength of victory: average opponent rating only from wins
 */
function calculateStrengthOfVictory(teamId: ID, dynasty: Dynasty): number {
  const teamsById = dynasty.league.teamsById
  const gamesById = dynasty.league.gamesById
  const teamState = teamsById[teamId]

  if (!teamState) return 0.5

  let totalWinOpponentRating = 0
  let winCount = 0

  for (const gameId of Object.keys(gamesById)) {
    const game = gamesById[gameId]
    if (!game || game.status !== 'FINAL') continue

    const homeScore = game.result?.boxScore?.teamStats?.home?.points ?? 0
    const awayScore = game.result?.boxScore?.teamStats?.away?.points ?? 0

    let isWin = false
    let opponentId: ID | null = null

    if (game.homeTeamId === teamId) {
      opponentId = game.awayTeamId
      isWin = homeScore > awayScore
    } else if (game.awayTeamId === teamId) {
      opponentId = game.homeTeamId
      isWin = awayScore > homeScore
    } else {
      continue
    }

    if (!isWin || !opponentId) continue

    const opponent = teamsById[opponentId]
    if (!opponent) continue

    const opponentRating = opponent.season?.teamRating ?? 50
    totalWinOpponentRating += opponentRating
    winCount += 1
  }

  if (winCount === 0) return 0.5
  const avgWinOpponentRating = totalWinOpponentRating / winCount
  return Math.max(0, Math.min(1, avgWinOpponentRating / 100)) // Normalize to 0-1
}

/**
 * Calculate average point differential (points for vs points against)
 */
function calculatePointDifferential(teamId: ID, dynasty: Dynasty): number {
  const seasonStats = (dynasty.league as any).seasonStats
  const teamSeasonStats = seasonStats?.teamsById?.[teamId]

  if (!teamSeasonStats) return 0

  const ptsFor = teamSeasonStats.points ?? 0
  const ptsAgainst = teamSeasonStats.pointsAllowed ?? 0
  const games = teamSeasonStats.games ?? 1

  if (games === 0) return 0
  return (ptsFor - ptsAgainst) / games // Points per game differential
}

/**
 * Batch update team ratings for all teams
 * Call this after each game or periodically during season
 */
export function updateAllTeamRatings(dynasty: Dynasty): Dynasty {
  const teamsById = dynasty.league.teamsById
  const updatedTeamsById: typeof teamsById = {}

  for (const [teamId, teamState] of Object.entries(teamsById)) {
    if (!teamState) {
      updatedTeamsById[teamId as ID] = teamState
      continue
    }
    
    const rating = calculateTeamRating(teamId as ID, dynasty)
    
    // Ensure season object exists and update teamRating
    updatedTeamsById[teamId as ID] = {
      ...teamState,
      season: {
        ...teamState.season,
        teamRating: rating,
      },
    }
  }

  return {
    ...dynasty,
    league: {
      ...dynasty.league,
      teamsById: updatedTeamsById,
    },
  }
}
