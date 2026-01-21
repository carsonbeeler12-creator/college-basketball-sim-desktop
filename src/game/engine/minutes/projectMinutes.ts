// src/game/engine/minutes/projectMinutes.ts

import type { Dynasty, ID, Position, PlayerState } from '../../types/dynasty'

export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

export type MinutesProjection = {
  byPosition: Record<Position, {
    availableMinutes: number // Total projected minutes available at this position
    currentDepth: number // Number of players at this position (non-graduating, non-redshirt)
    graduatingCount: number // Number of players graduating
    averageCompetitionRating: number // Average overall of current players at this position
    opportunityScore: number // 0-100, higher = more opportunity
  }>
  totalAvailableMinutes: number // Total across all positions
}

/**
 * Projects minutes available for next season at each position.
 * Used for recruiting opportunity calculations.
 * 
 * Key factors:
 * - Current roster depth (non-graduating, non-redshirted players)
 * - Graduating players (SR class year)
 * - Redshirt planning (isRedshirt flag)
 * - Competition quality (overall ratings)
 * - Rotation style (affects how minutes are distributed)
 */
export function projectMinutesForNextSeason(
  dynasty: Dynasty,
  teamId: ID
): MinutesProjection | null {
  const team = dynasty.league.teamsById?.[teamId]
  if (!team || !team.roster) return null

  const rosterPlayerIds = team.roster.playerIds ?? []
  const players = rosterPlayerIds
    .map(pid => dynasty.playersById[pid])
    .filter(Boolean) as PlayerState[]

  // Constants
  const TOTAL_POSITION_MINUTES = 40 // Each position needs 40 minutes per game (200 total / 5 positions)
  const GAMES_PER_SEASON = 30 // Approximate games per season

  const projection: MinutesProjection = {
    byPosition: {
      PG: { availableMinutes: 0, currentDepth: 0, graduatingCount: 0, averageCompetitionRating: 0, opportunityScore: 0 },
      SG: { availableMinutes: 0, currentDepth: 0, graduatingCount: 0, averageCompetitionRating: 0, opportunityScore: 0 },
      SF: { availableMinutes: 0, currentDepth: 0, graduatingCount: 0, averageCompetitionRating: 0, opportunityScore: 0 },
      PF: { availableMinutes: 0, currentDepth: 0, graduatingCount: 0, averageCompetitionRating: 0, opportunityScore: 0 },
      C: { availableMinutes: 0, currentDepth: 0, graduatingCount: 0, averageCompetitionRating: 0, opportunityScore: 0 },
    },
    totalAvailableMinutes: 0,
  }

  // Analyze each position
  for (const pos of POSITIONS) {
    const playersAtPosition = players.filter(p => p.identity.position === pos)
    
    // Separate by graduation status
    const graduating = playersAtPosition.filter(p => p.identity.classYear === 'SR')
    const returning = playersAtPosition.filter(p => 
      p.identity.classYear !== 'SR' && !p.team.isRedshirt
    )
    const redshirting = playersAtPosition.filter(p => p.team.isRedshirt)

    // Calculate current depth (returning + redshirting, since redshirts will be active next year)
    const activeNextYear = [...returning, ...redshirting]

    // Calculate average competition rating (higher = more competition)
    const avgRating = activeNextYear.length > 0
      ? activeNextYear.reduce((sum, p) => sum + (p.ratings.overall ?? 50), 0) / activeNextYear.length
      : 0

    // Project available minutes
    // If we have fewer than ideal players, more minutes are available
    // Ideal depth: 2-3 players per position
    const idealDepth = 2.5
    const depthFactor = Math.max(0, idealDepth - activeNextYear.length)
    
    // Minutes become available from graduating players
    // Assume graduating players average ~25 minutes each (varies by depth)
    const graduatingMinutes = graduating.length > 0
      ? graduating.length * 25 * GAMES_PER_SEASON
      : 0

    // Additional minutes available if we're below ideal depth
    const depthDeficitMinutes = depthFactor > 0
      ? depthFactor * 15 * GAMES_PER_SEASON // 15 minutes per missing player
      : 0

    const totalAvailable = graduatingMinutes + depthDeficitMinutes

    // Calculate opportunity score (0-100)
    // Higher = better opportunity
    // Factors: available minutes, low competition, low depth
    const minutesScore = Math.min(100, (totalAvailable / (TOTAL_POSITION_MINUTES * GAMES_PER_SEASON)) * 100)
    const competitionScore = activeNextYear.length === 0 ? 100 : Math.max(0, 100 - avgRating)
    const depthScore = activeNextYear.length === 0 ? 100 : Math.max(0, (idealDepth - activeNextYear.length) / idealDepth * 100)
    
    // Weighted average
    const opportunityScore = Math.round(
      minutesScore * 0.5 + 
      competitionScore * 0.3 + 
      depthScore * 0.2
    )

    projection.byPosition[pos] = {
      availableMinutes: Math.round(totalAvailable),
      currentDepth: activeNextYear.length,
      graduatingCount: graduating.length,
      averageCompetitionRating: Math.round(avgRating * 10) / 10,
      opportunityScore: Math.min(100, Math.max(0, opportunityScore)),
    }
  }

  projection.totalAvailableMinutes = Object.values(projection.byPosition)
    .reduce((sum, pos) => sum + pos.availableMinutes, 0)

  return projection
}

/**
 * Get a simple opportunity rating for a specific position.
 * Returns a string description for UI display.
 */
export function getOpportunityRating(opportunityScore: number): string {
  if (opportunityScore >= 80) return 'Excellent'
  if (opportunityScore >= 60) return 'Very Good'
  if (opportunityScore >= 40) return 'Good'
  if (opportunityScore >= 20) return 'Fair'
  return 'Limited'
}

/**
 * Get opportunity color for UI display.
 */
export function getOpportunityColor(opportunityScore: number): string {
  if (opportunityScore >= 80) return '#4caf50' // Green
  if (opportunityScore >= 60) return '#8bc34a' // Light green
  if (opportunityScore >= 40) return '#ffc107' // Yellow
  if (opportunityScore >= 20) return '#ff9800' // Orange
  return '#9e9e9e' // Gray
}
