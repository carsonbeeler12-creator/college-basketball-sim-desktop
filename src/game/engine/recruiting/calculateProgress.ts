// src/game/engine/recruiting/calculateProgress.ts

import type { Dynasty, ID } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'

/**
 * Calculate weekly progress gain for a recruit based on hours allocated.
 * Progress accumulates weekly - this returns how much to add this week.
 * Higher-ranked recruits are harder to recruit (require more weeks).
 * 
 * Uses rank-based saturating curve: gain(h) = cap * (1 - exp(-h / tau))
 * Scholarship reduces tau by 10-15% (makes curve steeper, accelerating progress).
 * Prestige reduces tau significantly for elite programs (compounding advantage).
 * For unranked recruits only, prestige also slightly increases the cap.
 * 
 * New: Momentum can amplify or dampen progress (recruiting battles, big wins/losses).
 */
function calculateWeeklyProgressGain(
  hoursAllocated: number,
  scholarshipOffered: boolean,
  recruitRank: number | undefined,
  prestige: number,
  momentum?: number // New: -20 to +20 modifier affecting progress
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

  // === PRESTIGE EFFECT (COMPOUNDING ADVANTAGE) ===
  // Normalize prestige (40→0.0, 100→1.0)
  const prestigeNormalized = Math.max(0, Math.min(1, (prestige - 40) / 60))
  
  // Elite programs (85+) get a modest prestige effect
  // Personality system handles most of recruit preference differentiation now
  // Prestige advantage was increased too much when we added personalities
  let prestigeEffect: number
  if (prestige >= 90) {
    // Elite (90-100): 12-18% tau reduction (reduced from 20-30%)
    prestigeEffect = 0.12 + (prestigeNormalized * 0.06)
  } else if (prestige >= 85) {
    // Top tier (85-89): 10-14% tau reduction
    prestigeEffect = 0.10 + (prestigeNormalized * 0.04)
  } else if (prestige >= 75) {
    // Power (75-84): 8-12% tau reduction
    prestigeEffect = 0.08 + (prestigeNormalized * 0.04)
  } else if (prestige >= 60) {
    // Mid-major (60-74): 6-10% tau reduction
    prestigeEffect = 0.06 + (prestigeNormalized * 0.04)
  } else {
    // Low prestige (<60): 0-5% tau reduction (minimal advantage)
    prestigeEffect = prestigeNormalized * 0.05
  }

  // Apply prestige to tau: reduce tau by prestigeEffect (faster approach to cap)
  let effectiveTau = tau * (1 - prestigeEffect)

  // === SCHOLARSHIP EFFECT ===
  // Scholarship reduces tau by additional 10-15% (makes curve steeper, accelerating progress)
  // Elite programs get slightly better scholarship impact (15% vs 10%)
  const scholarshipBonus = prestige >= 85 ? 0.15 : 0.10
  effectiveTau = scholarshipOffered ? effectiveTau * (1 - scholarshipBonus) : effectiveTau

  // For unranked recruits only: prestige can slightly increase the cap (max +12%)
  // This allows high prestige teams to close low-tier recruits faster
  // Do NOT apply cap boost to ranked recruits (Top 100)
  let effectiveCap = cap
  if (isUnranked) {
    const capBoost = 0.12 * prestigeNormalized // max +12% cap boost for unranked (up from 10%)
    effectiveCap = cap * (1 + capBoost)
  }

  // === MOMENTUM EFFECT (NEW) ===
  // Momentum from -20 to +20 affects progress rate
  // Big wins, tournament runs add positive momentum
  // Losses, scandals add negative momentum
  // Creates recruiting swings and makes process feel dynamic
  const momentumModifier = momentum !== undefined ? (1 + (momentum / 100)) : 1.0 // -20% to +20%

  // Calculate weekly gain using saturating curve
  // gain(h) = cap * (1 - exp(-h / tau)) * momentumModifier
  const baseGain = effectiveCap * (1 - Math.exp(-hours / effectiveTau))
  const weeklyGain = baseGain * momentumModifier

  return Math.max(0, weeklyGain) // Never negative
}

/**
 * Calculate recruiting progress for a team's recruit (for display purposes).
 * Returns the current stored progress (always starts at 0, not initial interest).
 * 
 * Note: Actual progress accumulation happens in updateProgressForBoard during weekly sims.
 * Decoupled: initial interest affects RATE of progress, not starting progress.
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

  // Return stored progress (starts at 0, builds up over weeks)
  return board.progressByRecruitId?.[recruitId] ?? 0
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
  
  // === CALCULATE TEAM MOMENTUM (NEW) ===
  // Momentum affects recruiting progress based on recent performance
  // Big wins, tournament runs boost momentum; losses dampen it
  let teamMomentum = 0
  
  // Check recent game results (last 3-5 games if available)
  const allGames = Object.values(dynasty.league.gamesById)
  const teamGames = allGames
    .filter(g => g.status === 'FINAL' && (g.homeTeamId === teamId || g.awayTeamId === teamId))
    .sort((a, b) => b.day - a.day) // Most recent first
    .slice(0, 5) // Last 5 games
  
  // Count recent wins/losses
  let recentWins = 0
  let recentLosses = 0
  for (const game of teamGames) {
    if (!game.result) continue
    const isHome = game.homeTeamId === teamId
    const teamScore = isHome ? game.result.homeScore : game.result.awayScore
    const oppScore = isHome ? game.result.awayScore : game.result.homeScore
    if (teamScore > oppScore) recentWins++
    else recentLosses++
  }
  
  // Win streak boosts momentum
  if (recentWins >= 4) teamMomentum += 12 // 4+ game win streak
  else if (recentWins >= 3) teamMomentum += 8  // 3 game win streak
  else if (recentWins >= 2) teamMomentum += 4  // 2 game win streak
  
  // Loss streak dampens momentum
  if (recentLosses >= 4) teamMomentum -= 10 // 4+ game losing streak
  else if (recentLosses >= 3) teamMomentum -= 6  // 3 game losing streak
  
  // Tournament success gives MAJOR momentum boost
  // Check if team made tournament (would be in current world state)
  if (dynasty.world.phase === 'POSTSEASON' || dynasty.world.phase === 'TOURNAMENT_READY') {
    const tournament = dynasty.league.tournament
    if (tournament?.games) {
      // Check if team won any tournament games
      const tourneyWins = tournament.games.filter(g => 
        g.winnerId === teamId
      ).length
      
      if (tourneyWins >= 3) teamMomentum += 20 // Elite Eight or better
      else if (tourneyWins >= 2) teamMomentum += 15 // Sweet Sixteen
      else if (tourneyWins >= 1) teamMomentum += 10 // Won first round
    }
  }
  
  // Clamp momentum to -20/+20
  teamMomentum = Math.max(-20, Math.min(20, teamMomentum))

  let updatedRecruitPool = { ...recruitingState.recruitPool }
  let updatedDynasty = dynasty

  // Start with existing progress to preserve it (critical: don't lose progress when hours are cleared!)
  // Handle case where progressByRecruitId might be undefined/null
  const progressByRecruitId: Record<ID, number> = { ...(board.progressByRecruitId ?? {}) }
  
  // Initialize momentum tracking if it doesn't exist
  const momentumByRecruitId: Record<ID, number> = { ...(board.momentumByRecruitId ?? {}) }
  
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
    
    // Get or initialize recruit-specific momentum (starts at team momentum, but can diverge)
    const recruitMomentum = momentumByRecruitId[recruitId] ?? teamMomentum
    
    // === SMALL SCHOOL UNDERDOG BONUS ===
    // Capped/tapered vs old +50% (was easy to exploit on uncontested targets)
    let underdogBonus = 1.0
    if (prestige < 65 && hoursAllocated >= 40) {
      const allBoards = Object.values(recruitingState.boardsByTeamId)
      const competitorCount = allBoards.filter(otherBoard => {
        if (otherBoard.teamId === teamId) return false
        const otherTeamHours = otherBoard.hoursAllocatedByRecruitId[recruitId] ?? 0
        return otherTeamHours >= 40
      }).length

      if (competitorCount <= 1) {
        underdogBonus = prestige < 50 ? 1.28 : 1.36
      } else if (competitorCount === 2) {
        underdogBonus = prestige < 50 ? 1.12 : 1.18
      }
      underdogBonus = Math.min(underdogBonus, 1.38)
    }
    
    // Calculate weekly gain with momentum AND underdog bonus
    let weeklyGain = calculateWeeklyProgressGain(
      hoursAllocated, 
      scholarshipOffered, 
      recruit.rank, 
      prestige,
      recruitMomentum
    )
    
    // Apply underdog bonus
    weeklyGain = weeklyGain * underdogBonus

    const newProgress = Math.min(100, Math.round(currentStoredProgress + weeklyGain))
    
    // Always update progress (even if hours are 0, progress should still accumulate with scholarship)
    progressByRecruitId[recruitId] = newProgress
    
    // Update momentum with decay (momentum gradually returns to 0 over time)
    // This prevents permanent momentum boosts/penalties
    const momentumDecay = 0.85 // Momentum decays by 15% per week
    momentumByRecruitId[recruitId] = Math.round(recruitMomentum * momentumDecay)

    // === MINIMUM RECRUITMENT WINDOW ===
    // Recruits must be recruited for AT LEAST 8 weeks (56 days) before they can commit
    // This prevents lightning-fast commitments and makes recruiting feel more gradual
    const minimumRecruitmentDays = 56 // 8 weeks
    const canCommit = dynasty.world.day >= minimumRecruitmentDays
    
    // If progress reaches 100% and recruit isn't committed, they commit (if window passed)
    if (newProgress >= 100 && recruit.status === 'UNCOMMITTED' && canCommit) {
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
  // CRITICAL: Preserve all existing board data (hours, scholarships, visits) and only update progress + momentum
  const updatedBoard = {
    ...board,
    recruitIds: board.recruitIds.filter(id => !recruitsToRemoveFromBoard.includes(id)),
    progressByRecruitId,
    momentumByRecruitId, // NEW: Store momentum per recruit
    hoursAllocatedByRecruitId: board.hoursAllocatedByRecruitId ? { ...board.hoursAllocatedByRecruitId } : {},
    scholarshipOfferedToRecruitId: board.scholarshipOfferedToRecruitId ? { ...board.scholarshipOfferedToRecruitId } : {},
    visitScheduledForRecruitId: board.visitScheduledForRecruitId ? { ...board.visitScheduledForRecruitId } : {},
    scoutingHoursUsedByRecruitId: {},
  }
  
  // Clean up hours/progress/momentum tracking for removed recruits
  for (const recruitId of recruitsToRemoveFromBoard) {
    delete updatedBoard.hoursAllocatedByRecruitId[recruitId]
    delete updatedBoard.progressByRecruitId[recruitId]
    delete updatedBoard.momentumByRecruitId![recruitId]
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
