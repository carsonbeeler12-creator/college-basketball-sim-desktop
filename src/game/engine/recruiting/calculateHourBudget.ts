// src/game/engine/recruiting/calculateHourBudget.ts

import type { Dynasty, ID } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'
import { getEffectivePrestige } from '../development/applyPrestigeAdjustments'

/**
 * Calculate weekly recruiting hour budget for a team.
 * 
 * Two-part model:
 * - Base Prestige (slow-moving, represents brand/history, can increase via achievements)
 * - Momentum / Recent Success (fast-moving, last 1-2 seasons)
 * 
 * Recent success matters more than historical prestige.
 */
export function calculateHourBudget(dynasty: Dynasty, teamId: ID): number {
  const team = TEAMS.find(t => t.id === teamId)
  if (!team) return 150 // Default fallback

  const teamState = dynasty.league.teamsById[teamId]
  
  // Use effective prestige (base + dynamic achievements)
  const prestige = getEffectivePrestige(team, teamState)
  
  // Calculate momentum from recent success
  const momentum = calculateMomentum(dynasty, teamId)
  
  // Base hours from prestige tier (now using effective prestige)
  const baseHours = getBaseHoursFromPrestige(prestige)
  
  // Apply momentum modifier
  const momentumModifier = 1.0 + (momentum * 0.15) // ±15% max modifier
  
  // Final calculation
  let finalHours = Math.round(baseHours * momentumModifier)
  
  // Ensure minimum and maximum bounds
  // Elite programs should have MORE recruiting capacity
  const minHours = 120
  const maxHours = prestige >= 85 ? 500 : prestige >= 65 ? 400 : 300
  finalHours = Math.max(minHours, Math.min(maxHours, finalHours))
  
  return finalHours
}

/**
 * Calculate momentum based on recent success (last 1-2 seasons).
 * Returns -1.0 to +1.0, where:
 * - Positive = good recent performance
 * - Negative = poor recent performance
 */
function calculateMomentum(dynasty: Dynasty, teamId: ID): number {
  const teamState = dynasty.league.teamsById[teamId]
  if (!teamState) return 0
  
  const currentSeason = dynasty.world.seasonYear
  const seasonStats = dynasty.league.standingsBySeason?.[String(currentSeason)]
  
  if (!seasonStats) {
    // No games played yet, use preseason expectations
    return 0
  }
  
  const teamStats = seasonStats.teamRecordsById?.[teamId]
  if (!teamStats) return 0
  
  const wins = teamStats.wins ?? 0
  const losses = teamStats.losses ?? 0
  const totalGames = wins + losses
  
  if (totalGames === 0) return 0
  
  // Calculate win percentage
  const winPct = wins / totalGames
  
  // Tournament success (if we have it) - placeholder for now
  // TODO: Add tournament results when postseason is implemented
  
  // Momentum based on:
  // - Win percentage (0.5 = .500, 0.6 = .600, etc.)
  // - Recent trend (last 10 games would be better, but using overall for now)
  
  // Convert win percentage to momentum (-1 to +1)
  // .500 = 0, .600 = +0.4, .700 = +0.8, .400 = -0.4, etc.
  let momentum = (winPct - 0.5) * 2
  
  // Cap at reasonable bounds
  momentum = Math.max(-1.0, Math.min(1.0, momentum))
  
  // Boost for very successful seasons (tournament runs, etc.)
  // TODO: Add tournament boost when implemented
  
  return momentum
}

/**
 * Get base hours from prestige tier.
 * INCREASED for realism: elite programs spend WAY more on recruiting
 * 
 * Program Tier | Prestige | Typical Hours/Week
 * Low-major    | 30-40    | 120-160
 * Mid-major    | 45-60    | 180-240
 * High-major   | 65-80    | 260-340
 * Blue blood   | 85-95    | 350-450
 */
function getBaseHoursFromPrestige(prestige: number): number {
  if (prestige >= 85) {
    // Blue blood: 350-450 (realistic for top programs)
    return 350 + ((prestige - 85) / 10) * 100
  } else if (prestige >= 65) {
    // High-major: 260-340
    return 260 + ((prestige - 65) / 20) * 80
  } else if (prestige >= 45) {
    // Mid-major: 180-240
    return 180 + ((prestige - 45) / 20) * 60
  } else {
    // Low-major: 120-160
    return 120 + ((prestige - 30) / 15) * 40
  }
}
