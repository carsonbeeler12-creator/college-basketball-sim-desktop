// src/game/engine/recruiting/cpuRecruiting.ts

import type { Dynasty, ID, Recruit } from '../../types/dynasty'
import { calculateHourBudget } from './calculateHourBudget'
import { addRecruitToBoard, offerScholarship } from './boardManagement'
import { canOfferScholarship } from './scholarshipLimits'
import { allocateHoursToRecruit } from './allocateHours'
import { updateProgressForBoard } from './calculateProgress'
import { TEAMS } from '../../defaultData'
import { getEffectivePrestige } from '../development/applyPrestigeAdjustments'
import { evaluateArchetypeFit } from '../schemes/schemeDefinitions'

type Rng = { state: number }

/**
 * Recruit quality bands (independent of Top 100 rank).
 * Used to determine which recruits high-prestige teams should target.
 */
type RecruitQualityBand = 'ELITE' | 'HIGH' | 'MID' | 'LOW' | 'GARBAGE'

/**
 * Determine recruit quality band based on rank, star rating, and overall rating.
 * Only top 100 recruits have rank, so we use overall/star as fallback.
 */
function getRecruitQualityBand(recruit: Recruit): RecruitQualityBand {
  const overall = recruit.ratings.overall ?? 0
  const starRating = recruit.starRating
  const rank = recruit.rank

  // Elite: Top 25 rank OR 5★ OR OVR ≥ 78
  if (rank !== undefined && rank <= 25) return 'ELITE'
  if (starRating === 5) return 'ELITE'
  if (overall >= 78) return 'ELITE'

  // High: Rank 26–100 OR 4★ OR OVR 70–77
  if (rank !== undefined && rank <= 100) return 'HIGH'
  if (starRating === 4) return 'HIGH'
  if (overall >= 70 && overall <= 77) return 'HIGH'

  // Mid: 3★ OR OVR 62–69
  if (starRating === 3) return 'MID'
  if (overall >= 62 && overall <= 69) return 'MID'

  // Low: 2★ OR OVR 55–61
  if (starRating === 2) return 'LOW'
  if (overall >= 55 && overall <= 61) return 'LOW'

  // Garbage: 1★ OR OVR ≤ 54
  return 'GARBAGE'
}

/**
 * Check if a recruit quality band is allowed for a prestige tier.
 * Returns true if the band should be considered, false if it should be filtered out.
 */
function isQualityBandAllowedForPrestige(
  band: RecruitQualityBand,
  prestige: number
): boolean {
  // Prestige 85–100: Primary = Elite/High; Secondary = Mid; Fallback = Low/Garbage only in emergencies
  if (prestige >= 85) {
    return band === 'ELITE' || band === 'HIGH' || band === 'MID'
  }

  // Prestige 65–84: Primary = High; Secondary = Mid; Opportunistic = Elite; Fallback = Low
  if (prestige >= 65) {
    return band === 'ELITE' || band === 'HIGH' || band === 'MID' || band === 'LOW'
  }

  // Prestige 45–64: Primary = Mid; Secondary = Low; Opportunistic = High; Fallback = Garbage
  if (prestige >= 45) {
    return true // All bands allowed
  }

  // Prestige <45: Primary = Low; Opportunistic = Mid; Garbage acceptable
  return true // All bands allowed
}

/**
 * Check if a recruit meets the minimum quality floor for high-prestige teams.
 * Returns true if the recruit is acceptable, false if it's below the quality floor.
 */
function meetsQualityFloor(recruit: Recruit, prestige: number): boolean {
  // High prestige teams (>=80) should never target garbage-tier recruits
  if (prestige >= 80) {
    const band = getRecruitQualityBand(recruit)
    if (band === 'GARBAGE') return false
    
    // Additional check: overall rating floor
    const overall = recruit.ratings.overall ?? 0
    if (overall < 58) return false
  }

  return true
}

/**
 * Get quality band weight for scoring (higher = better).
 * Used to prioritize higher quality recruits.
 */
function getQualityBandWeight(band: RecruitQualityBand): number {
  switch (band) {
    case 'ELITE': return 5
    case 'HIGH': return 4
    case 'MID': return 3
    case 'LOW': return 2
    case 'GARBAGE': return 1
  }
}

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

function rand01(rng: Rng): number {
  rng.state = hashSeed(rng.state, 'rand')
  return (rng.state / 4294967296) % 1.0
}

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rand01(rng) * (max - min + 1)) + min
}

/**
 * CPU teams automatically manage their recruiting boards.
 * 
 * Strategy:
 * - Higher prestige teams target higher star recruits
 * - Teams fill their boards based on position needs
 * - CPU allocates hours strategically (focus on high-interest, high-star recruits)
 * - CPU offers scholarships to top targets
 * 
 * Called weekly during the season.
 */
export function processCPURecruiting(dynasty: Dynasty): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  let updated = dynasty

  // Process each CPU team
  for (const teamId of Object.keys(dynasty.league.teamsById)) {
    // Skip user team (they manage their own)
    if (teamId === dynasty.league.userTeamId) continue

    updated = processTeamRecruiting(updated, teamId)
  }

  return updated
}

function processTeamRecruiting(dynasty: Dynasty, teamId: ID): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  const team = TEAMS.find(t => t.id === teamId)
  if (!team) return dynasty

  const teamState = dynasty.league.teamsById[teamId]
  const prestige = getEffectivePrestige(team, teamState)
  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return dynasty

  const hourBudget = calculateHourBudget(dynasty, teamId)
  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `cpu_recruit_${teamId}_${dynasty.world.day}`) >>> 0 }

  // 1. Manage board size (add recruits if board is not full)
  let updated = dynasty
  if (board.recruitIds.length < 20) {
    updated = addRecruitsToCPUBoard(updated, teamId, prestige, rng)
  }

  // 2. Allocate hours (CPU strategically allocates based on interest and star rating)
  updated = allocateCPUHours(updated, teamId, hourBudget, prestige, rng)

  // 3. Offer scholarships (CPU offers to top targets)
  updated = offerCPUScholarships(updated, teamId, prestige, rng)

  // 4. Update progress
  updated = updateProgressForBoard(updated, teamId)

  return updated
}

/**
 * CPU teams add recruits to their board based on:
 * - Quality bands (Elite/High/Mid/Low/Garbage) based on rank, star, and overall
 * - Prestige-based quality preferences (high prestige avoids garbage-tier)
 * - Initial interest level
 */
function addRecruitsToCPUBoard(
  dynasty: Dynasty,
  teamId: ID,
  prestige: number,
  rng: Rng
): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return dynasty

  // Get all uncommitted recruits and filter by quality bands and prestige preferences
  const availableRecruits = Object.values(recruitingState.recruitPool)
    .filter(recruit => {
      if (recruit.status !== 'UNCOMMITTED') return false
      if (board.recruitIds.includes(recruit.recruitId)) return false
      
      // Quality band filtering: only allow appropriate quality bands for this prestige
      const band = getRecruitQualityBand(recruit)
      if (!isQualityBandAllowedForPrestige(band, prestige)) return false
      
      // Quality floor: high prestige teams cannot target garbage-tier or very low overall
      if (!meetsQualityFloor(recruit, prestige)) return false
      
      // Check interest level (CPU prefers recruits with at least some interest)
      // Lower threshold for elite recruits (they have lower initial interest due to 0.40 modifier)
      const interest = recruit.interestByTeamId[teamId] ?? 0
      const minInterest = band === 'ELITE' ? 6 : band === 'HIGH' ? 8 : 10 // Lower threshold for better recruits
      return interest >= minInterest
    })

  // Score recruits: prefer higher quality bands, higher interest, higher overall
  // Within same quality band, prefer those with national ranks (more specific differentiation)
  // ALSO: prefer recruits that fit the team's coaching scheme
  availableRecruits.sort((a, b) => {
    const bandA = getRecruitQualityBand(a)
    const bandB = getRecruitQualityBand(b)
    const interestA = a.interestByTeamId[teamId] ?? 0
    const interestB = b.interestByTeamId[teamId] ?? 0
    const overallA = a.ratings.overall ?? 0
    const overallB = b.ratings.overall ?? 0
    
    // Get team's coaching scheme to evaluate fit
    const coachScheme = dynasty.coach?.scheme ?? 'BALANCED'
    const fitA = evaluateArchetypeFit(a.archetype, coachScheme)
    const fitB = evaluateArchetypeFit(b.archetype, coachScheme)
    
    // Primary sort: quality band weight (ELITE > HIGH > MID > LOW > GARBAGE)
    const bandWeightDiff = getQualityBandWeight(bandB) - getQualityBandWeight(bandA)
    if (bandWeightDiff !== 0) return bandWeightDiff * 10 // Weight band differences heavily
    
    // Secondary sort: scheme fit (if different)
    if (fitB !== fitA) return fitB - fitA
    
    // Tertiary sort: within same band, prefer those with national ranks (1-100)
    // Ranked recruits are more carefully vetted, so prefer them
    const hasRankA = a.rank !== undefined && a.rank <= 100
    const hasRankB = b.rank !== undefined && b.rank <= 100
    if (hasRankA && !hasRankB) return -1
    if (!hasRankA && hasRankB) return 1
    
    // Quaternary sort: if both ranked, prefer better rank
    if (hasRankA && hasRankB && a.rank !== undefined && b.rank !== undefined) {
      return a.rank - b.rank
    }
    
    // Quinary sort: score = interest + overall bonus
    const scoreA = interestA + overallA * 0.1
    const scoreB = interestB + overallB * 0.1
    
    return scoreB - scoreA
  })

  // Add recruits up to board limit
  // During preseason, add more aggressively (3-5), during season add gradually (1-3)
  const slotsAvailable = 20 - board.recruitIds.length
  const isPreseason = dynasty.world.phase === 'PRESEASON'
  const recruitsToAdd = Math.min(slotsAvailable, randInt(rng, isPreseason ? 3 : 1, isPreseason ? 5 : 3))
  
  let updated = dynasty
  for (let i = 0; i < recruitsToAdd && i < availableRecruits.length; i++) {
    const recruit = availableRecruits[i]
    const result = addRecruitToBoard(updated, teamId, recruit.recruitId)
    if (result) {
      updated = result
    }
  }

  return updated
}

/**
 * CPU teams allocate hours strategically:
 * - Use hour templates (anchor/strong/depth/fallback targets) based on prestige
 * - Apply quality guardrails (high-prestige teams limit hours on low-quality recruits)
 * - Prioritize higher quality bands and interest
 */
function allocateCPUHours(
  dynasty: Dynasty,
  teamId: ID,
  hourBudget: number,
  prestige: number,
  rng: Rng
): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board || board.recruitIds.length === 0) return dynasty

  // Get recruits on board with quality bands and scores
  const recruitsWithData = board.recruitIds.map(recruitId => {
    const recruit = recruitingState.recruitPool[recruitId]
    if (!recruit) return null

    const band = getRecruitQualityBand(recruit)
    const interest = recruit.interestByTeamId[teamId] ?? 0
    const overall = recruit.ratings.overall ?? 0
    const currentHours = board.hoursAllocatedByRecruitId[recruitId] ?? 0
    
    // Within-band differentiation: ranked recruits are prioritized
    // Rank 1-25: boost 1.5x, Rank 26-50: boost 1.3x, Rank 51-100: boost 1.1x
    let rankBoost = 1.0
    if (recruit.rank !== undefined && recruit.rank <= 100) {
      if (recruit.rank <= 25) rankBoost = 1.5
      else if (recruit.rank <= 50) rankBoost = 1.3
      else rankBoost = 1.1
    }

    // Score by quality band, interest (with rank boost), and overall
    const score = getQualityBandWeight(band) * interest * rankBoost + overall * 0.1

    return { recruitId, recruit, band, interest, overall, score, currentHours, rankBoost }
  }).filter(Boolean) as Array<{
    recruitId: ID
    recruit: Recruit
    band: RecruitQualityBand
    interest: number
    overall: number
    score: number
    currentHours: number
    rankBoost: number
  }>

  // Sort by score (descending) - top targets first
  recruitsWithData.sort((a, b) => b.score - a.score)

  // Calculate total currently allocated
  const totalAllocated = Object.values(board.hoursAllocatedByRecruitId).reduce((sum, h) => sum + h, 0)
  let remainingBudget = hourBudget - totalAllocated

  // Hour templates based on prestige
  // High prestige (>=85): 1 anchor (90-120h), 2 strong (45-70h), 2 depth (20-40h), 0-1 fallback (10-20h)
  // Mid prestige (65-84): 1 anchor (70-100h), 1-2 strong (35-60h), 2-3 depth (15-35h), 0-1 fallback (10-20h)
  // Low prestige (<65): Distribute more evenly (20-50h per recruit)
  let updated = dynasty

  if (prestige >= 85) {
    // High prestige template
    if (recruitsWithData.length === 0) return dynasty
    const anchor = recruitsWithData[0]
    const strong = recruitsWithData.slice(1, 3)
    const depth = recruitsWithData.slice(3, 5)
    const fallback = recruitsWithData.slice(5)

    // Anchor target: 90-120 hours
    if (anchor && remainingBudget > 0) {
      const targetHours = Math.min(randInt(rng, 90, 120), remainingBudget)
      // Quality guardrail: low-quality recruits get max 10-15 hours
      const maxHours = anchor.band === 'GARBAGE' || anchor.overall < 58 
        ? randInt(rng, 10, 15) 
        : targetHours
      const newTotal = Math.min(maxHours, remainingBudget)
      
      if (newTotal > anchor.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, anchor.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - anchor.currentHours)
        }
      }
    }

    // Strong targets: 45-70 hours each
    for (const recruitData of strong) {
      if (remainingBudget <= 0) break
      const targetHours = Math.min(randInt(rng, 45, 70), remainingBudget)
      const maxHours = recruitData.band === 'GARBAGE' || recruitData.overall < 58 
        ? randInt(rng, 10, 15) 
        : targetHours
      const newTotal = Math.min(maxHours, remainingBudget)
      
      if (newTotal > recruitData.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - recruitData.currentHours)
        }
      }
    }

    // Depth targets: 20-40 hours each
    for (const recruitData of depth) {
      if (remainingBudget <= 0) break
      const targetHours = Math.min(randInt(rng, 20, 40), remainingBudget)
      const maxHours = recruitData.band === 'GARBAGE' || recruitData.overall < 58 
        ? randInt(rng, 10, 15) 
        : targetHours
      const newTotal = Math.min(maxHours, remainingBudget)
      
      if (newTotal > recruitData.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - recruitData.currentHours)
        }
      }
    }

    // Fallback targets: 10-20 hours each (garbage-tier only)
    for (const recruitData of fallback) {
      if (remainingBudget <= 0) break
      // High prestige: fallback only for garbage-tier, max 10-15 hours
      if (recruitData.band === 'GARBAGE' || recruitData.overall < 58) {
        const targetHours = Math.min(randInt(rng, 10, 15), remainingBudget)
        const newTotal = Math.min(targetHours, remainingBudget)
        
        if (newTotal > recruitData.currentHours) {
          const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
          if (result) {
            updated = result
            remainingBudget -= (newTotal - recruitData.currentHours)
          }
        }
      }
    }
  } else if (prestige >= 65) {
    // Mid prestige template
    const anchor = recruitsWithData[0]
    const strong = recruitsWithData.slice(1, 3)
    const depth = recruitsWithData.slice(3, 6)
    const fallback = recruitsWithData.slice(6)

    // Anchor: 70-100 hours
    if (anchor && remainingBudget > 0) {
      const targetHours = Math.min(randInt(rng, 70, 100), remainingBudget)
      const newTotal = Math.min(targetHours, remainingBudget)
      
      if (newTotal > anchor.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, anchor.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - anchor.currentHours)
        }
      }
    }

    // Strong: 35-60 hours each
    for (const recruitData of strong) {
      if (remainingBudget <= 0) break
      const targetHours = Math.min(randInt(rng, 35, 60), remainingBudget)
      const newTotal = Math.min(targetHours, remainingBudget)
      
      if (newTotal > recruitData.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - recruitData.currentHours)
        }
      }
    }

    // Depth: 15-35 hours each
    for (const recruitData of depth) {
      if (remainingBudget <= 0) break
      const targetHours = Math.min(randInt(rng, 15, 35), remainingBudget)
      const newTotal = Math.min(targetHours, remainingBudget)
      
      if (newTotal > recruitData.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - recruitData.currentHours)
        }
      }
    }

    // Fallback: 10-20 hours
    for (const recruitData of fallback) {
      if (remainingBudget <= 0) break
      const targetHours = Math.min(randInt(rng, 10, 20), remainingBudget)
      const newTotal = Math.min(targetHours, remainingBudget)
      
      if (newTotal > recruitData.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - recruitData.currentHours)
        }
      }
    }
  } else {
    // Low prestige: distribute more evenly
    for (const recruitData of recruitsWithData) {
      if (remainingBudget <= 0) break
      const targetHours = Math.min(randInt(rng, 20, 50), remainingBudget)
      const newTotal = Math.min(targetHours, remainingBudget)
      
      if (newTotal > recruitData.currentHours) {
        const result = allocateHoursToRecruit(updated, teamId, recruitData.recruitId, newTotal)
        if (result) {
          updated = result
          remainingBudget -= (newTotal - recruitData.currentHours)
        }
      }
    }
  }

  return updated
}

/**
 * CPU teams offer scholarships to their top targets.
 * Higher prestige teams are more aggressive with offers.
 */
function offerCPUScholarships(
  dynasty: Dynasty,
  teamId: ID,
  prestige: number,
  rng: Rng
): Dynasty {
  const recruitingState = dynasty.recruiting
  if (!recruitingState) return dynasty

  const board = recruitingState.boardsByTeamId[teamId]
  if (!board) return dynasty

  // Get recruits on board, sorted by score
  const recruitsWithScores = board.recruitIds.map(recruitId => {
    const recruit = recruitingState.recruitPool[recruitId]
    if (!recruit) return null

    const interest = recruit.interestByTeamId[teamId] ?? 0
    const score = interest * recruit.starRating
    const hasScholarship = board.scholarshipOfferedToRecruitId[recruitId] ?? false
    const progress = board.progressByRecruitId[recruitId] ?? 0

    return { recruitId, recruit, score, hasScholarship, progress }
  }).filter(Boolean) as Array<{
    recruitId: ID
    recruit: any
    score: number
    hasScholarship: boolean
    progress: number
  }>

  // Sort by score
  recruitsWithScores.sort((a, b) => b.score - a.score)

  // CPU offers scholarships to top targets
  // Higher prestige teams offer more aggressively
  const offersThisWeek = randInt(rng, 0, 2) // Offer 0-2 per week

  let updated = dynasty
  let offersMade = 0

  for (const { recruitId, hasScholarship, progress } of recruitsWithScores) {
    if (offersMade >= offersThisWeek) break
    if (hasScholarship) continue // Already offered

    // Check if team has available scholarships
    if (!canOfferScholarship(updated, teamId)) {
      break // No scholarships available, stop offering
    }

    // CPU offers to recruits with decent progress or high interest
    // Higher prestige teams offer earlier (lower progress threshold)
    const progressThreshold = prestige >= 75 ? 20 : prestige >= 55 ? 30 : 40

    if (progress >= progressThreshold || rand01(rng) < 0.3) {
      const result = offerScholarship(updated, teamId, recruitId)
      if (result) {
        updated = result
        offersMade++
      }
    }
  }

  return updated
}
