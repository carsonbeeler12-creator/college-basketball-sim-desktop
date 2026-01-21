// src/game/engine/recruiting/calculateProgress.ts

import type { Dynasty, ID } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'

/**
 * Calculate weekly progress gain for a recruit based on hours allocated.
 * Progress accumulates weekly - this returns how much to add this week.
 * Higher-ranked recruits are harder to recruit (require more weeks).
 * 
 * Uses rank-based saturating curve: gain(h) = cap * (1 - exp(-h / tau))
 * Scholarship reduces tau by 10% (makes curve steeper, accelerating progress).
 * Prestige reduces tau (higher prestige = faster approach to cap, but same cap).
 * For unranked recruits only, prestige also slightly increases the cap.
 */
function calculateWeeklyProgressGain(
  hoursAllocated: number,
  scholarshipOffered: boolean,
  recruitRank: number | undefined,
  prestige: number
): number {
  const hours = Math.min(hoursAllocated, 300)

  // Rank-based parameters: each tier has its own cap and tau
  // cap = maximum weekly progress for that recruit tier
  // tau = how fast progress approaches the cap (lower = steeper early gains)
  let cap: number
  let tau: number

  const isRanked = recruitRank !== undefined && recruitRank <= 100
  const isUnranked = !isRanked

  if (recruitRank !== undefined) {
    if (recruitRank <= 10) {
      // Top 10: hardest to recruit
      cap = 6.0
      tau = 30
    } else if (recruitRank <= 25) {
      // 11-25: very hard
      cap = 7.0
      tau = 35
    } else if (recruitRank <= 50) {
      // 26-50: hard
      cap = 9.0
      tau = 40
    } else if (recruitRank <= 100) {
      // 51-100: moderate
      cap = 11.0
      tau = 55
    } else {
      // Unranked (>100): easiest
      cap = 13.5
      tau = 60
    }
  } else {
    // No rank: treat as unranked
    cap = 13.5
    tau = 60
  }

  // Prestige effect: normalize prestige (40→0.0, 100→1.0)
  // Prestige reduces tau (makes progress approach cap faster), max 15% reduction
  const prestigeNormalized = Math.max(0, Math.min(1, (prestige - 40) / 60))
  const prestigeEffect = 0.15 * prestigeNormalized // max 15% for prestige 100

  // Apply prestige to tau: reduce tau by prestigeEffect (faster approach to cap)
  let effectiveTau = tau * (1 - prestigeEffect)

  // Scholarship reduces tau by additional 10% (makes curve steeper, accelerating progress)
  // This boosts early and mid-range gains without breaking timelines
  effectiveTau = scholarshipOffered ? effectiveTau * 0.90 : effectiveTau

  // For unranked recruits only: prestige can slightly increase the cap (max +10%)
  // This allows high prestige teams to close low-tier recruits faster
  // Do NOT apply cap boost to ranked recruits (Top 100)
  let effectiveCap = cap
  if (isUnranked) {
    const capBoost = 0.10 * prestigeNormalized // max +10% cap boost for unranked
    effectiveCap = cap * (1 + capBoost)
  }

  // Calculate weekly gain using saturating curve
  // gain(h) = cap * (1 - exp(-h / tau))
  const weeklyGain = effectiveCap * (1 - Math.exp(-hours / effectiveTau))

  return weeklyGain
}

/**
 * Calculate recruiting progress for a team's recruit (for display purposes).
 * Returns the current stored progress, or initial interest if no progress stored yet.
 * 
 * Note: Actual progress accumulation happens in updateProgressForBoard during weekly sims.
 */
export function calculateProgress(
  dynasty: Dynasty,
  teamId: ID,
  recruitId: ID
): number {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return 0

  const board = recruitingState.boardsByTeamId[teamId]
  const recruit = recruitingState.recruitPool[recruitId]
  
  if (!board || !recruit) return 0

  // If already committed, return 100
  if (recruit.status === 'COMMITTED' && recruit.committedToTeamId === teamId) {
    return 100
  }

  // Return stored progress, or initial interest if no progress stored yet
  return board.progressByRecruitId?.[recruitId] ?? (recruit.interestByTeamId[teamId] ?? 0)
}

/**
 * Update progress for all recruits on a team's board.
 * This should be called weekly when advancing the season.
 * When progress reaches 100%, the recruit commits to that team.
 */
export function updateProgressForBoard(dynasty: Dynasty, teamId: ID): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return dynasty

  // Get team prestige for prestige boost calculation
  const team = TEAMS.find(t => t.id === teamId)
  const prestige = team?.prestige ?? 50 // Default to 50 if team not found

  let updatedRecruitPool = { ...recruitingState.recruitPool }
  let updatedDynasty = dynasty

  // Start with existing progress to preserve it (critical: don't lose progress when hours are cleared!)
  // Handle case where progressByRecruitId might be undefined/null
  const progressByRecruitId: Record<ID, number> = { ...(board.progressByRecruitId ?? {}) }
  const recruitsToRemoveFromBoard: ID[] = [] // Track commits to remove from board
  
  for (const recruitId of board.recruitIds) {
    const recruit = updatedRecruitPool[recruitId]
    if (!recruit) continue

    // If recruit committed to another team, remove them from board (can't recruit them anymore)
    if (recruit.status === 'COMMITTED' && recruit.committedToTeamId !== teamId) {
      recruitsToRemoveFromBoard.push(recruitId)
      continue // Don't process progress for recruits committed elsewhere
    }

    // Calculate new progress by adding weekly gain to current stored progress
    // Preserve existing progress if it exists, otherwise start from initial interest
    const currentStoredProgress = progressByRecruitId[recruitId] ?? (recruit.interestByTeamId[teamId] ?? 0)
    const hoursAllocated = board.hoursAllocatedByRecruitId[recruitId] ?? 0
    const scholarshipOffered = board.scholarshipOfferedToRecruitId[recruitId] ?? false
    const weeklyGain = calculateWeeklyProgressGain(hoursAllocated, scholarshipOffered, recruit.rank, prestige)
    const newProgress = Math.min(100, Math.round(currentStoredProgress + weeklyGain))
    
    // Always update progress (even if hours are 0, progress should still accumulate with scholarship)
    progressByRecruitId[recruitId] = newProgress

    // If progress reaches 100% and recruit isn't committed, they commit!
    if (newProgress >= 100 && recruit.status === 'UNCOMMITTED') {
      updatedRecruitPool[recruitId] = {
        ...recruit,
        status: 'COMMITTED',
        committedToTeamId: teamId,
        commitmentWeek: dynasty.world.day, // Use day as week number
      }
      updatedDynasty = { ...updatedDynasty }
      
      // Mark for removal from board
      recruitsToRemoveFromBoard.push(recruitId)
    }
  }

  // Build updated board, removing committed recruits
  // CRITICAL: Preserve all existing board data (hours, scholarships, visits) and only update progress
  // Don't create new empty objects - preserve existing ones to avoid data loss
  // Reset scouting hours each week (they come back)
  const updatedBoard = {
    ...board,
    recruitIds: board.recruitIds.filter(id => !recruitsToRemoveFromBoard.includes(id)),
    progressByRecruitId,
    // Preserve existing hours and scholarships - only create new objects if they don't exist
    hoursAllocatedByRecruitId: board.hoursAllocatedByRecruitId ? { ...board.hoursAllocatedByRecruitId } : {},
    scholarshipOfferedToRecruitId: board.scholarshipOfferedToRecruitId ? { ...board.scholarshipOfferedToRecruitId } : {},
    // Preserve visit scheduling if it exists
    visitScheduledForRecruitId: board.visitScheduledForRecruitId ? { ...board.visitScheduledForRecruitId } : {},
    // Reset scouting hours each week (they come back)
    scoutingHoursUsedByRecruitId: {},
  }
  
  // Clean up hours/progress tracking for removed recruits (only remove committed recruits)
  for (const recruitId of recruitsToRemoveFromBoard) {
    delete updatedBoard.hoursAllocatedByRecruitId[recruitId]
    delete updatedBoard.progressByRecruitId[recruitId]
    // Keep scholarship offered status (for reference, but not needed)
    // Keep visit scheduling (visits might still be relevant)
  }

  return {
    ...updatedDynasty,
    recruiting: {
      ...recruitingState,
      recruitPool: updatedRecruitPool,
      boardsByTeamId: {
        ...recruitingState.boardsByTeamId,
        [teamId]: updatedBoard,
      },
    },
  }
}

/**
 * Update progress for all teams (CPU + user).
 * Call this weekly during season.
 */
export function updateProgressForAllTeams(dynasty: Dynasty): Dynasty {
  let updated = dynasty

  // Update user team
  updated = updateProgressForBoard(updated, dynasty.league.userTeamId)

  // Update CPU teams (for now, we can add CPU logic later)
  for (const teamId of Object.keys(dynasty.league.teamsById)) {
    if (teamId !== dynasty.league.userTeamId) {
      updated = updateProgressForBoard(updated, teamId)
    }
  }

  return updated
}
