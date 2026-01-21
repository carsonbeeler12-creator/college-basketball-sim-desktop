// src/game/engine/recruiting/boardManagement.ts

import type { Dynasty, ID } from '../../types/dynasty'
import { canOfferScholarship } from './scholarshipLimits'
import { calculateHourBudget } from './calculateHourBudget'
import { getTotalAllocatedHours } from './allocateHours'

const MAX_BOARD_SIZE = 20

/**
 * Add a recruit to a team's recruiting board.
 * Returns updated dynasty or null if board is full or recruit doesn't exist.
 */
export function addRecruitToBoard(dynasty: Dynasty, teamId: ID, recruitId: ID): Dynasty | null {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return null

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return null

  // Check if recruit exists
  const recruit = recruitingState.recruitPool[recruitId]
  if (!recruit) return null

  // Check if board is full
  if (board.recruitIds.length >= MAX_BOARD_SIZE) {
    return null // Board full
  }

  // Check if already on board
  if (board.recruitIds.includes(recruitId)) {
    return dynasty // Already on board, no change needed
  }

  // Add to board
  const updatedBoard = {
    ...board,
    recruitIds: [...board.recruitIds, recruitId],
    hoursAllocatedByRecruitId: {
      ...board.hoursAllocatedByRecruitId,
      [recruitId]: board.hoursAllocatedByRecruitId[recruitId] ?? 0,
    },
    progressByRecruitId: {
      ...board.progressByRecruitId,
      [recruitId]: board.progressByRecruitId[recruitId] ?? 0,
    },
    scholarshipOfferedToRecruitId: {
      ...board.scholarshipOfferedToRecruitId,
      [recruitId]: board.scholarshipOfferedToRecruitId[recruitId] ?? false,
    },
  }

  // Update competition tracking
  const competitionByRecruitId = { ...recruitingState.competitionByRecruitId }
  if (!competitionByRecruitId[recruitId]) {
    competitionByRecruitId[recruitId] = []
  }
  if (!competitionByRecruitId[recruitId].includes(teamId)) {
    competitionByRecruitId[recruitId] = [...competitionByRecruitId[recruitId], teamId]
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
      competitionByRecruitId,
    },
  }
}

/**
 * Remove a recruit from a team's recruiting board.
 */
export function removeRecruitFromBoard(dynasty: Dynasty, teamId: ID, recruitId: ID): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return dynasty

  // Remove from board
  const updatedBoard = {
    ...board,
    recruitIds: board.recruitIds.filter(id => id !== recruitId),
    hoursAllocatedByRecruitId: {
      ...board.hoursAllocatedByRecruitId,
    },
    progressByRecruitId: {
      ...board.progressByRecruitId,
    },
    scholarshipOfferedToRecruitId: {
      ...board.scholarshipOfferedToRecruitId,
    },
  }

  // Clean up tracking for this recruit (remove allocated hours/progress)
  delete updatedBoard.hoursAllocatedByRecruitId[recruitId]
  delete updatedBoard.progressByRecruitId[recruitId]
  delete updatedBoard.scholarshipOfferedToRecruitId[recruitId]

  // Update competition tracking
  const competitionByRecruitId = { ...recruitingState.competitionByRecruitId }
  if (competitionByRecruitId[recruitId]) {
    competitionByRecruitId[recruitId] = competitionByRecruitId[recruitId].filter(id => id !== teamId)
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
      competitionByRecruitId,
    },
  }
}

/**
 * Offer a scholarship to a recruit.
 * Recruit must be on the board.
 * Returns null if no scholarships available.
 */
export function offerScholarship(dynasty: Dynasty, teamId: ID, recruitId: ID): Dynasty | null {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return null

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return null

  // Check if recruit is on board
  if (!board.recruitIds.includes(recruitId)) {
    return null // Must be on board first
  }

  // Check if already offered
  if (board.scholarshipOfferedToRecruitId[recruitId]) {
    return dynasty // Already offered, no change needed
  }

  // Check if team has available scholarships
  if (!canOfferScholarship(dynasty, teamId)) {
    return null // No scholarships available
  }

  // Update scholarship status
  const updatedBoard = {
    ...board,
    scholarshipOfferedToRecruitId: {
      ...board.scholarshipOfferedToRecruitId,
      [recruitId]: true,
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
 * Scout a recruit (upgrade scout level).
 * Scout level progression: NONE -> PARTIAL -> FULL
 * Costs hours: 10 hours for PARTIAL, 20 hours for FULL (30 total to fully scout)
 * Returns updated dynasty or null if recruit doesn't exist, already fully scouted, or insufficient hours.
 */
export function scoutRecruit(dynasty: Dynasty, teamId: ID, recruitId: ID): Dynasty | null {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return null

  const recruit = recruitingState.recruitPool[recruitId]
  if (!recruit) return null

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return null

  const currentLevel = recruit.scoutedByTeamId[teamId] ?? 'NONE'
  
  // Upgrade scout level
  let newLevel: 'PARTIAL' | 'FULL'
  let hoursNeeded: number
  if (currentLevel === 'NONE') {
    newLevel = 'PARTIAL'
    hoursNeeded = 10
  } else if (currentLevel === 'PARTIAL') {
    newLevel = 'FULL'
    hoursNeeded = 20
  } else {
    return dynasty // Already fully scouted, no change needed
  }

  // Check if recruit is on board (required for scouting)
  if (!board.recruitIds.includes(recruitId)) {
    return null // Must be on board to scout
  }

  // Check hour budget (include both recruiting hours and scouting hours)
  const hourBudget = calculateHourBudget(dynasty, teamId)
  const recruitingHoursUsed = getTotalAllocatedHours(dynasty, teamId)
  const scoutingHoursUsed = Object.values(board.scoutingHoursUsedByRecruitId ?? {}).reduce((sum, h) => sum + h, 0)
  const currentScoutingHoursForRecruit = board.scoutingHoursUsedByRecruitId?.[recruitId] ?? 0
  const otherScoutingHours = scoutingHoursUsed - currentScoutingHoursForRecruit
  
  const totalHoursUsed = recruitingHoursUsed + otherScoutingHours
  const remainingHours = hourBudget - totalHoursUsed
  
  if (remainingHours < hoursNeeded) {
    return null // Insufficient hours
  }

  // Update scout level
  const updatedRecruit = {
    ...recruit,
    scoutedByTeamId: {
      ...recruit.scoutedByTeamId,
      [teamId]: newLevel,
    },
  }

  // Update scouting hours used
  const updatedBoard = {
    ...board,
    scoutingHoursUsedByRecruitId: {
      ...(board.scoutingHoursUsedByRecruitId ?? {}),
      [recruitId]: currentScoutingHoursForRecruit + hoursNeeded,
    },
  }

  return {
    ...dynasty,
    lastSavedAtISO: new Date().toISOString(),
    recruiting: {
      ...recruitingState,
      recruitPool: {
        ...recruitingState.recruitPool,
        [recruitId]: updatedRecruit,
      },
      boardsByTeamId: {
        ...recruitingState.boardsByTeamId,
        [teamId]: updatedBoard,
      },
    },
  }
}
