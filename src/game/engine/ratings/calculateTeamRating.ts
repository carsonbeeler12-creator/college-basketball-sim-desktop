// src/game/engine/ratings/calculateTeamRating.ts

import type { Dynasty, ID } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'
import { getEffectivePrestige } from '../development/applyPrestigeAdjustments'

/**
 * Team rating (0–100):
 * 1. Win % — drives most of movement
 * 2. SOS / SOV — use opponent **prestige** (not circular teamRating)
 * 3. Point differential
 * 4. Roster talent — top-8 average overall so elite teams aren’t stuck in the 50s
 *
 * Old version used opponent `teamRating` for SOS, which collapsed everyone into
 * the same band and made “bubble” the default UI label.
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

  const staticRow = TEAMS.find(t => t.id === teamId)
  const prestigeStart = staticRow ? getEffectivePrestige(staticRow, teamState) : 50

  // If no games played, blend prestige + roster so ratings aren’t meaningless
  if (totalGames === 0) {
    const rosterNorm = rosterIntrinsicNorm(teamId, dynasty)
    const prestigeNorm = prestigeStart / 100
    const blended = 0.55 * prestigeNorm + 0.45 * rosterNorm
    return Math.max(0, Math.min(100, Math.round(30 + blended * 55)))
  }

  // Component 1: Win percentage
  const winPct = wins / totalGames
  const winPctRating = 25 + winPct * 50 // Range: 25-75

  // Component 2–3: SOS / SOV from opponent prestige (1–100 → 0–1), not teamRating
  const scheduleStrength = calculateScheduleStrengthFromPrestige(teamId, dynasty)
  const sosRating = 25 + scheduleStrength * 50 // Range: 25-75

  const strengthOfVictory = calculateStrengthOfVictoryFromPrestige(teamId, dynasty)
  const sovRating = 25 + strengthOfVictory * 50 // Range: 25-75

  // Component 4: Net point differential
  const pointDiff = calculatePointDifferential(teamId, dynasty)
  const normalizedDiff = Math.max(-1, Math.min(1, pointDiff / 40))
  const ppdRating = 50 + normalizedDiff * 25 // Range: 25-75

  // Component 5: Roster quality (stable spread across teams)
  const rosterNorm = rosterIntrinsicNorm(teamId, dynasty)
  const rosterRating = 25 + rosterNorm * 50

  const rating =
    winPctRating * 0.34 +
    sosRating * 0.22 +
    sovRating * 0.16 +
    ppdRating * 0.10 +
    rosterRating * 0.18

  return Math.max(0, Math.min(100, Math.round(rating)))
}

/** 0–1: average of top 8 roster overalls, mapped to talent tier */
function rosterIntrinsicNorm(teamId: ID, dynasty: Dynasty): number {
  const team = dynasty.league.teamsById[teamId]
  const ids = team?.roster?.playerIds ?? []
  const ovs: number[] = []
  for (const pid of ids) {
    const o = dynasty.playersById[pid]?.ratings?.overall
    if (typeof o === 'number') ovs.push(o)
  }
  if (ovs.length === 0) return 0.52
  ovs.sort((a, b) => b - a)
  const top = ovs.slice(0, 8)
  const avg = top.reduce((a, b) => a + b, 0) / top.length
  return Math.max(0, Math.min(1, (avg - 44) / 46))
}

function opponentPrestigeNorm(opponentId: ID, dynasty: Dynasty): number {
  const state = dynasty.league.teamsById[opponentId]
  const row = TEAMS.find(t => t.id === opponentId)
  if (!row) return 0.5
  const p = getEffectivePrestige(row, state)
  return Math.max(0, Math.min(1, p / 100))
}

/** SOS: average opponent prestige (avoids circular teamRating) */
function calculateScheduleStrengthFromPrestige(teamId: ID, dynasty: Dynasty): number {
  const teamsById = dynasty.league.teamsById
  const gamesById = dynasty.league.gamesById
  const teamState = teamsById[teamId]

  if (!teamState) return 0.5

  let sum = 0
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

    if (!opponentId || !teamsById[opponentId]) continue
    sum += opponentPrestigeNorm(opponentId, dynasty)
    gameCount += 1
  }

  if (gameCount === 0) return 0.5
  return sum / gameCount
}

/** SOV: average opponent prestige on wins only */
function calculateStrengthOfVictoryFromPrestige(teamId: ID, dynasty: Dynasty): number {
  const teamsById = dynasty.league.teamsById
  const gamesById = dynasty.league.gamesById
  const teamState = teamsById[teamId]

  if (!teamState) return 0.5

  let sum = 0
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

    if (!isWin || !opponentId || !teamsById[opponentId]) continue
    sum += opponentPrestigeNorm(opponentId, dynasty)
    winCount += 1
  }

  if (winCount === 0) return 0.5
  return sum / winCount
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
