// src/game/engine/recruiting/scholarshipLimits.ts

import type { Dynasty, ID } from '../../types/dynasty'
import type { ClassYear } from '../../types/dynasty'

const MAX_ROSTER_SIZE = 13 // Maximum players allowed on a roster (Division 1)

/**
 * Estimate how many players will leave after this season.
 * Includes:
 * - Graduating seniors (definite)
 * - Potential early draft declarations (probabilistic based on rating)
 */
function estimatePlayersLeaving(dynasty: Dynasty, teamId: ID): {
  graduating: number
  likelyDraft: number
  total: number
} {
  const team = dynasty.league.teamsById[teamId]
  if (!team || !team.roster) {
    return { graduating: 0, likelyDraft: 0, total: 0 }
  }

  const rosterPlayerIds = team.roster.playerIds ?? []
  const players = rosterPlayerIds
    .map(pid => dynasty.playersById[pid])
    .filter(Boolean)

  let graduating = 0
  let likelyDraft = 0

  for (const player of players) {
    const classYear = player.identity.classYear as ClassYear
    const overall = player.ratings.overall ?? 0

    // Check if player was persuaded to stay
    if (player.draftDeclaration?.persuaded) {
      continue // Skip this player - they're staying
    }

    // Seniors always graduate
    if (classYear === 'SR') {
      graduating++
    }
    // Juniors: high-rated players might declare early
    else if (classYear === 'JR') {
      // If already attempted persuasion and failed, they're definitely leaving
      if (player.draftDeclaration?.persuasionAttempted && !player.draftDeclaration.persuaded) {
        likelyDraft += 1.0 // 100% - they're declaring
      } else {
        // Otherwise, use probability estimates
        if (overall >= 90) {
          likelyDraft += 0.85
        } else if (overall >= 87) {
          likelyDraft += 0.70
        } else if (overall >= 85) {
          likelyDraft += 0.60
        } else if (overall >= 82) {
          likelyDraft += 0.30
        }
      }
    }
    // Sophomores: exceptional players might declare (very rare)
    else if (classYear === 'SO') {
      // If already attempted persuasion and failed, they're definitely leaving
      if (player.draftDeclaration?.persuasionAttempted && !player.draftDeclaration.persuaded) {
        likelyDraft += 1.0 // 100% - they're declaring
      } else {
        // Otherwise, use probability estimates
        if (overall >= 90) {
          likelyDraft += 0.40
        } else if (overall >= 88) {
          likelyDraft += 0.15
        }
      }
    }
  }

  // Round likely draft to nearest integer (conservative estimate)
  const likelyDraftRounded = Math.round(likelyDraft)

  return {
    graduating,
    likelyDraft: likelyDraftRounded,
    total: graduating + likelyDraftRounded,
  }
}

/**
 * Calculate available scholarships for a team.
 * Scholarships = MAX_ROSTER_SIZE - current_roster_size
 * Accounts for:
 * - Current roster size (how many players are currently on the team)
 * - Committed recruits (recruits who will join next season)
 * - Graduating seniors (definite)
 * - Likely early draft declarations (estimated)
 * 
 * Returns: { available, total, used, committed, leaving, estimatedAvailable }
 */
export function getAvailableScholarships(dynasty: Dynasty, teamId: ID): {
  available: number
  total: number
  used: number
  committed: number
  leaving: { graduating: number; likelyDraft: number; total: number }
  estimatedAvailable: number // Available including estimated departures
} {
  const team = dynasty.league.teamsById[teamId]
  if (!team) {
    return {
      available: 0,
      total: MAX_ROSTER_SIZE,
      used: 0,
      committed: 0,
      leaving: { graduating: 0, likelyDraft: 0, total: 0 },
      estimatedAvailable: 0,
    }
  }

  // Count current roster size (active players currently on team)
  const rosterSize = team.roster?.playerIds?.length ?? 0

  // Count committed recruits (recruits with status COMMITTED and committedToTeamId === teamId)
  // These will join the roster next season
  const recruitingState = dynasty.recruiting
  const committed = recruitingState ? Object.values(recruitingState.recruitPool).filter(
    recruit => recruit.status === 'COMMITTED' && recruit.committedToTeamId === teamId
  ).length : 0

  // Estimate players leaving after this season
  const leaving = estimatePlayersLeaving(dynasty, teamId)

  // Current roster occupancy = current players + committed recruits
  const used = rosterSize + committed
  
  // Available scholarships = roster capacity - current occupancy
  // If roster is full (13 players + 0 committed), you have 0 scholarships
  // If roster has 11 players + 0 committed, you have 2 scholarships
  const available = Math.max(0, MAX_ROSTER_SIZE - used)
  
  // Estimated available (optimistic - includes likely departures)
  // This allows planning ahead: if 2 players are graduating, you can offer 2 more scholarships
  // Formula: MAX_ROSTER_SIZE - used + leaving = slots that will open up
  const estimatedAvailable = Math.max(0, MAX_ROSTER_SIZE - used + leaving.total)

  return {
    available,
    total: MAX_ROSTER_SIZE,
    used,
    committed,
    leaving,
    estimatedAvailable,
  }
}

/**
 * Check if a team can offer another scholarship.
 * Scholarships are limited by roster capacity: MAX_ROSTER_SIZE - current_roster_size
 * Uses estimated available (includes likely departures) to allow planning ahead.
 */
export function canOfferScholarship(dynasty: Dynasty, teamId: ID): boolean {
  const scholarships = getAvailableScholarships(dynasty, teamId)
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return false

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return false

  // Count currently offered scholarships (not yet committed)
  const offeredCount = getOfferedScholarshipsCount(dynasty, teamId)

  // Total roster slots "reserved" = current roster + committed recruits + offered scholarships
  const totalReserved = scholarships.used + offeredCount

  // Can offer if total reserved < (MAX_ROSTER_SIZE + estimated leaving)
  // This allows planning ahead for departures: if 2 players are leaving, you can offer 2 more scholarships
  const maxAllowed = MAX_ROSTER_SIZE + scholarships.leaving.total
  
  return totalReserved < maxAllowed
}

/**
 * Count how many scholarships are currently offered (but not yet committed).
 */
export function getOfferedScholarshipsCount(dynasty: Dynasty, teamId: ID): number {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return 0

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return 0

  // Count recruits with scholarships offered but not yet committed
  let count = 0
  for (const recruitId of board.recruitIds) {
    const recruit = recruitingState.recruitPool[recruitId]
    const hasOffer = board.scholarshipOfferedToRecruitId[recruitId] ?? false
    const isCommitted = recruit?.status === 'COMMITTED' && recruit.committedToTeamId === teamId

    if (hasOffer && !isCommitted) {
      count++
    }
  }

  return count
}
