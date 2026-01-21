// src/game/engine/recruiting/allocateHours.ts

import type { Dynasty, ID } from '../../types/dynasty'
import { calculateHourBudget } from './calculateHourBudget'

/**
 * Allocate recruiting hours to a recruit.
 * Returns updated dynasty or null if invalid allocation.
 * Requires a scholarship offer to be made first.
 */
export function allocateHoursToRecruit(
  dynasty: Dynasty,
  teamId: ID,
  recruitId: ID,
  hours: number
): Dynasty | null {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return null

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return null

  // Check if recruit is on board
  if (!board.recruitIds.includes(recruitId)) {
    return null // Must be on board to allocate hours
  }

  // Check if recruit exists and is not already committed to another team
  const recruit = recruitingState.recruitPool[recruitId]
  if (!recruit) return null
  if (recruit.status === 'COMMITTED' && recruit.committedToTeamId !== teamId) {
    return null // Cannot allocate hours to a recruit committed to another team
  }

  // Check if scholarship has been offered (players can't commit without an offer)
  const scholarshipOffered = board.scholarshipOfferedToRecruitId[recruitId] ?? false
  if (!scholarshipOffered) {
    return null // Must offer scholarship before allocating hours
  }

  // Validate hours - must be multiple of 5 (no negatives)
  const safeHours = Math.max(0, Math.round(hours))
  // Always round to nearest 5 (ensures hours end in 0 or 5)
  const rounded = Math.round(safeHours / 5) * 5

  // Check hour budget
  const hourBudget = calculateHourBudget(dynasty, teamId)
  const currentAllocated = Object.values(board.hoursAllocatedByRecruitId).reduce((sum, h) => sum + h, 0)
  const otherHours = currentAllocated - (board.hoursAllocatedByRecruitId[recruitId] ?? 0)
  
  // Cap at budget (but keep it rounded to 5)
  const maxAllowed = hourBudget - otherHours
  const capped = Math.min(rounded, maxAllowed)
  const finalHours = Math.floor(capped / 5) * 5 // Ensure it's still a multiple of 5 after capping

  // Update allocation
  const updatedBoard = {
    ...board,
    hoursAllocatedByRecruitId: {
      ...board.hoursAllocatedByRecruitId,
      [recruitId]: finalHours,
    },
  }

  return {
    ...dynasty,
    lastSavedAtISO: new Date().toISOString(),
    recruiting: {
      ...recruitingState,
      boardsByTeamId: {
        ...recruitingState.boardsByTeamId,
        [teamId]: updatedBoard,
      },
    },
  }
}

/**
 * Calculate total allocated hours for a team.
 */
export function getTotalAllocatedHours(dynasty: Dynasty, teamId: ID): number {
  const board = dynasty.recruiting?.boardsByTeamId[teamId]
  if (!board) return 0

  return Object.values(board.hoursAllocatedByRecruitId).reduce((sum, hours) => sum + hours, 0)
}

/**
 * Get total scouting hours used by a team this week.
 */
export function getTotalScoutingHours(dynasty: Dynasty, teamId: ID): number {
  const board = dynasty.recruiting?.boardsByTeamId[teamId]
  if (!board) return 0

  return Object.values(board.scoutingHoursUsedByRecruitId ?? {}).reduce((sum, hours) => sum + hours, 0)
}

/**
 * Get remaining hours in budget (including both recruiting and scouting hours).
 */
export function getRemainingHours(dynasty: Dynasty, teamId: ID): number {
  const budget = calculateHourBudget(dynasty, teamId)
  const allocated = getTotalAllocatedHours(dynasty, teamId)
  const scoutingHours = getTotalScoutingHours(dynasty, teamId)
  return Math.max(0, budget - allocated - scoutingHours)
}
