import type { PlayerState, CoachScheme, Archetype } from '../../types/dynasty'
import { getAwardDevelopmentBoost } from '../stats/calculateAwards'
import { evaluateArchetypeFit } from '../schemes/schemeDefinitions'

type Rng = { state: number }

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

function rand01(rng: Rng): number {
  rng.state = hashSeed(rng.state, 'rand')
  return (rng.state / 4294967296) % 1.0
}

function jitter(rng: Rng, amount: number) {
  return (rand01(rng) - 0.5) * 2 * amount
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * Initialize missing development fields for backwards compatibility
 */
function ensureDevelopmentFields(player: PlayerState, rng: Rng): PlayerState {
  const dev = player.development
  
  // Initialize volatility if missing (tied to potential and archetype)
  if (dev.volatility === undefined) {
    // Higher potential players tend to be more volatile (riskier)
    // But add randomness: some high-potential players are stable, some low-potential breakout
    const basedOnPotential = (dev.potential - 70) / 30 // 70 pot -> 0, 100 pot -> 1
    const randomFactor = rand01(rng) * 0.6 - 0.3 // -0.3 to +0.3
    dev.volatility = clamp(Math.round((basedOnPotential + randomFactor) * 100), 0, 100)
  }
  
  // Initialize growth curve if missing
  if (!dev.growthCurve) {
    const roll = rand01(rng)
    if (roll < 0.15) dev.growthCurve = "early" // 15%: Peak FR/SO, plateau early
    else if (roll < 0.75) dev.growthCurve = "normal" // 60%: Steady improvement
    else dev.growthCurve = "late" // 25%: Slow start, breakout JR/SR
  }
  
  // Initialize confidence (neutral start)
  if (dev.confidence === undefined) {
    dev.confidence = 50
  }
  
  // Initialize years since peak
  if (dev.yearsSincePeak === undefined) {
    dev.yearsSincePeak = 0
  }
  
  return { ...player, development: dev }
}

/**
 * Calculate growth curve multiplier based on class year and curve type
 * Early bloomers peak quickly then plateau; late bloomers break out in JR/SR years
 */
function getGrowthCurveMultiplier(
  classYear: PlayerState['identity']['classYear'], 
  growthCurve: "early" | "normal" | "late"
): number {
  const yearMap = { FR: 0, SO: 1, JR: 2, SR: 3 }
  const year = yearMap[classYear]
  
  switch (growthCurve) {
    case "early":
      // FR: 1.4x, SO: 1.1x, JR: 0.7x, SR: 0.4x (peaks early, fades)
      return [1.4, 1.1, 0.7, 0.4][year]
    case "late":
      // FR: 0.6x, SO: 0.8x, JR: 1.3x, SR: 1.0x (slow start, late breakout)
      return [0.6, 0.8, 1.3, 1.0][year]
    case "normal":
    default:
      // FR: 1.0x, SO: 0.85x, JR: 0.7x, SR: 0.5x (steady decline)
      return [1.0, 0.85, 0.7, 0.5][year]
  }
}

/**
 * Calculate scheme fit multiplier for development
 * Players develop faster when their archetype matches the coach's scheme
 */
function getSchemeFitMultiplier(archetype: Archetype, scheme?: CoachScheme): number {
  if (!scheme || scheme === "BALANCED") return 1.0
  
  // Get archetype fit score (-2 to +5 typically)
  const fitScore = evaluateArchetypeFit(archetype, scheme)
  
  // Convert to multiplier: -2 -> 0.85x, 0 -> 1.0x, +5 -> 1.25x
  return 1.0 + (fitScore * 0.05)
}

/**
 * Calculate usage tier multiplier
 * Playing time is critical for development, but diminishing returns at high minutes
 */
function getUsageMultiplier(avgMinutesPlayed: number): { multiplier: number; tier: string } {
  if (avgMinutesPlayed >= 28) {
    return { multiplier: 1.4, tier: "star" } // 28+ min: star player
  } else if (avgMinutesPlayed >= 22) {
    return { multiplier: 1.2, tier: "starter" } // 22-28: solid starter
  } else if (avgMinutesPlayed >= 15) {
    return { multiplier: 0.9, tier: "rotation" } // 15-22: key reserve
  } else if (avgMinutesPlayed >= 8) {
    return { multiplier: 0.6, tier: "bench" } // 8-15: bench player
  } else {
    return { multiplier: 0.3, tier: "deep_bench" } // <8: rarely plays
  }
}

/**
 * Update player confidence based on recent performance
 * Confidence affects short-term development (±10%)
 */
function updateConfidence(player: PlayerState, avgMinutesPlayed: number): number {
  const { stats, ratings, development } = player
  const currentConfidence = development.confidence ?? 50
  
  // No games = no confidence change
  if (stats.gamesPlayed === 0) return currentConfidence
  
  // Calculate performance vs expectations
  const ppg = stats.points / stats.gamesPlayed
  const expectedPpg = (ratings.overall - 40) / 3 // ~60 rating -> 6.7 ppg, 85 rating -> 15 ppg
  
  const perfRatio = expectedPpg > 0 ? ppg / expectedPpg : 1.0
  
  // Also factor in playing time (not playing hurts confidence)
  const playingTimeFactor = avgMinutesPlayed / 20 // 20 min = baseline
  
  // Combined factor
  const combinedFactor = (perfRatio * 0.7) + (playingTimeFactor * 0.3)
  
  // Adjust confidence (slow movement: ±5 per season max)
  let delta = 0
  if (combinedFactor > 1.2) delta = +5 // Great season
  else if (combinedFactor > 1.0) delta = +3 // Good season
  else if (combinedFactor > 0.8) delta = +1 // Solid season
  else if (combinedFactor > 0.6) delta = -1 // Below expectations
  else if (combinedFactor > 0.4) delta = -3 // Poor season
  else delta = -5 // Really bad season
  
  return clamp(currentConfidence + delta, 0, 100)
}

/**
 * Determine if player has plateau'd (stopped improving)
 * This can happen when: 1) Close to potential, 2) Poor work ethic, 3) Age/class year
 */
function checkPlateau(player: PlayerState, rng: Rng): boolean {
  const { ratings, development, identity } = player
  const gap = development.potential - ratings.overall
  
  // Already at/above potential? Plateau'd
  if (gap <= 0) return true
  
  // Check class-year specific plateau chances
  const plateauChances: Record<string, number> = {
    FR: 0.02, // 2% chance (rare for freshmen)
    SO: 0.05, // 5%
    JR: 0.12, // 12% 
    SR: 0.25, // 25% (many seniors plateau)
  }
  
  let baseChance = plateauChances[identity.classYear] || 0.1
  
  // Work ethic affects plateau chance
  const workEthic = development.workEthic ?? 50
  if (workEthic < 40) baseChance *= 1.5 // Poor work ethic = more likely to plateau
  if (workEthic > 70) baseChance *= 0.6 // Great work ethic = less likely
  
  // Small gap to potential = more likely to plateau
  if (gap < 3) baseChance *= 2.0
  else if (gap < 5) baseChance *= 1.4
  
  // High ratings = plateau more easily (hard to improve at 85+)
  if (ratings.overall >= 85) baseChance *= 2.5
  else if (ratings.overall >= 80) baseChance *= 1.5
  
  return rand01(rng) < baseChance
}

/**
 * Determine if player has a "breakout" year (sudden improvement surge)
 * More common for late bloomers, players with high volatility, and underused talent
 */
function checkBreakout(player: PlayerState, avgMinutesPlayed: number, rng: Rng): boolean {
  const { ratings, development, identity } = player
  const gap = development.potential - ratings.overall
  
  // Need significant room to grow for breakout
  if (gap < 5) return false
  
  // Base breakout chances by class + growth curve
  let baseChance = 0.05 // 5% base
  
  if (development.growthCurve === "late") {
    // Late bloomers more likely to break out in JR/SR year
    if (identity.classYear === "JR") baseChance = 0.15
    else if (identity.classYear === "SR") baseChance = 0.12
    else baseChance = 0.08
  } else if (development.growthCurve === "early") {
    // Early bloomers can break out as freshmen
    if (identity.classYear === "FR") baseChance = 0.12
    else baseChance = 0.05
  }
  
  // Volatility increases breakout chance
  const volatility = development.volatility ?? 50
  baseChance *= (1 + volatility / 200) // 0 vol = 1.0x, 100 vol = 1.5x
  
  // Underused talent (high potential, low minutes) more likely to break out
  const expectedMinutes = (ratings.overall - 40) / 2 // ~70 rating -> 15 min
  if (avgMinutesPlayed < expectedMinutes - 5) {
    baseChance *= 1.4 // Underused talent looking to prove themselves
  }
  
  // Recent award winners less likely (already recognized)
  const currentSeasonAwards = player.awards?.find(a => a.seasonYear === player.stats.seasonYear)
  if (currentSeasonAwards && currentSeasonAwards.awards.length > 0) {
    baseChance *= 0.5
  }
  
  return rand01(rng) < baseChance
}

/**
 * Improve (or regress) a player's ratings based on a comprehensive development model.
 * Called once per season during offseason.
 * 
 * NEW FEATURES:
 * - Growth curves: early/normal/late bloomers have different trajectories
 * - Volatility: some players are predictable, others vary wildly
 * - Scheme fit: players develop faster in systems that match their archetype
 * - Plateau mechanics: some players stop improving early
 * - Breakout potential: late bloomers and underused talent can surge
 * - Confidence system: recent performance affects short-term development
 * - Controlled randomness: bounded variance prevents extreme outliers
 */
export function progressPlayer(
  player: PlayerState, 
  rng: Rng, 
  avgMinutesPlayed: number = 0,
  coachScheme?: CoachScheme
): PlayerState {
  // Ensure backwards compatibility - initialize missing fields
  player = ensureDevelopmentFields(player, rng)
  
  const { ratings, development, identity, stats } = player
  const { potential, workEthic = 50, volatility = 50, growthCurve = "normal" } = development
  
  // ===== STEP 1: Calculate base room to grow =====
  let roomToGrow = Math.max(0, potential - ratings.overall)
  
  // Diminishing returns at high ratings (elite players improve slower)
  if (ratings.overall >= 88) {
    roomToGrow *= 0.25 // 25% room at 88+
  } else if (ratings.overall >= 85) {
    roomToGrow *= 0.35 // 35% room at 85-87
  } else if (ratings.overall >= 80) {
    roomToGrow *= 0.55 // 55% room at 80-84
  } else if (ratings.overall >= 75) {
    roomToGrow *= 0.75 // 75% room at 75-79
  }
  
  // ===== STEP 2: Check for plateau (stops development) =====
  const hasPlateaud = checkPlateau(player, rng)
  if (hasPlateaud) {
    // Plateau: minimal or negative development
    const updatedConfidence = updateConfidence(player, avgMinutesPlayed)
    const newDev = {
      ...development,
      yearsSincePeak: (development.yearsSincePeak ?? 0) + 1,
      confidence: updatedConfidence
    }
    
    // Small chance of regression when plateau'd
    const regressChance = 0.15 + (newDev.yearsSincePeak * 0.05) // More years plateau'd = more regression
    if (rand01(rng) < regressChance) {
      // Slight regression: -1 to -2 overall
      const regression = -1 * (1 + Math.floor(rand01(rng) * 2))
      const newRatings = { ...ratings, overall: clamp(ratings.overall + regression, 40, 99) }
      return { ...player, ratings: newRatings, development: newDev }
    }
    
    // Otherwise, no change (plateau'd)
    return { ...player, development: newDev }
  }
  
  // ===== STEP 3: Calculate minutes and usage =====
  const estimatedMinutes = avgMinutesPlayed > 0 
    ? avgMinutesPlayed 
    : stats.gamesPlayed > 0 
      ? stats.minutes / stats.gamesPlayed
      : 12 // Default baseline
  
  const { multiplier: usageMultiplier } = getUsageMultiplier(estimatedMinutes)
  
  // ===== STEP 4: Apply all multipliers =====
  // Work ethic: 0.7 to 1.3x (30% = 0.7x, 50% = 1.0x, 100% = 1.3x)
  const workEthicMult = 0.7 + (workEthic / 100) * 0.6
  
  // Growth curve: varies by class year and curve type
  const growthCurveMult = getGrowthCurveMultiplier(identity.classYear, growthCurve)
  
  // Scheme fit: 0.85x to 1.25x based on archetype match
  const schemeFitMult = getSchemeFitMultiplier(identity.archetype, coachScheme)
  
  // Award boost: 0% to 50% extra development for award winners
  const currentSeasonAwards = player.awards?.find(a => a.seasonYear === stats.seasonYear)
  const awardBoostMult = currentSeasonAwards 
    ? 1 + getAwardDevelopmentBoost(currentSeasonAwards.awards)
    : 1.0
  
  // Confidence: ±10% modifier
  const updatedConfidence = updateConfidence(player, avgMinutesPlayed)
  const confidenceMult = 0.9 + (updatedConfidence / 100) * 0.2
  
  // ===== STEP 5: Check for breakout year =====
  const isBreakout = checkBreakout(player, avgMinutesPlayed, rng)
  const breakoutMult = isBreakout ? 1.8 : 1.0 // 80% bonus for breakout year!
  
  // ===== STEP 6: Calculate base improvement =====
  // Base formula: roomToGrow * 0.12 (12% of potential gap)
  let baseImprovement = roomToGrow * 0.12
  
  // Apply all multipliers
  baseImprovement *= workEthicMult
  baseImprovement *= growthCurveMult
  baseImprovement *= usageMultiplier
  baseImprovement *= schemeFitMult
  baseImprovement *= awardBoostMult
  baseImprovement *= confidenceMult
  baseImprovement *= breakoutMult
  
  // ===== STEP 7: Add volatility-based randomness =====
  // High volatility = more variance (can be positive or negative)
  // Low volatility = consistent, predictable development
  const volatilityFactor = volatility / 100 // 0 to 1.0
  const varianceRange = 1.5 * volatilityFactor // Max ±1.5 for 100 volatility
  const randomVariance = jitter(rng, varianceRange)
  
  let totalOverallGain = baseImprovement + randomVariance
  
  // ===== STEP 8: Apply hard caps to prevent extreme outliers =====
  // Absolute max: ±4 points per season (prevents runaway growth)
  totalOverallGain = clamp(totalOverallGain, -4, 4)
  
  // Extreme talent (90+ overall) capped at +2 max per season
  if (ratings.overall >= 90) {
    totalOverallGain = clamp(totalOverallGain, -2, 2)
  }
  
  // Generational talents get slightly looser caps
  if (development.isGenerational && totalOverallGain > 0) {
    totalOverallGain = Math.min(totalOverallGain * 1.15, 5) // +15% bonus, max 5
  }
  
  // ===== STEP 9: Distribute improvements to individual ratings =====
  const newRatings = { ...ratings }
  
  const ratingKeys: (keyof typeof ratings)[] = [
    'shooting2', 'shooting3', 'freeThrow', 'finishing', 
    'ballHandling', 'passing', 
    'perimeterDefense', 'rimDefense', 'steal', 'block',
    'athleticism', 'strength', 'stamina'
  ]
  
  // Determine which stats to focus on based on archetype and position
  const focusStats = getArchetypeFocusStats(identity.archetype)
  
  for (const key of ratingKeys) {
    // Skip overall (calculated at end)
    if (key === 'overall') continue
    
    // Higher chance to improve focus stats
    const isFocusStat = focusStats.includes(key)
    const baseChance = isFocusStat ? 0.65 : 0.40
    
    // Usage and volatility affect individual stat growth chance
    const improveChance = baseChance + (usageMultiplier * 0.1) + (volatilityFactor * 0.1)
    
    if (rand01(rng) < improveChance) {
      // Amount: 0 to 3 points (weighted toward 1-2)
      const roll = rand01(rng)
      let amount = 0
      if (roll < 0.15) amount = 3 // 15% chance
      else if (roll < 0.45) amount = 2 // 30% chance
      else if (roll < 0.85) amount = 1 // 40% chance
      else amount = 0 // 15% chance no change
      
      // Apply with clamp
      newRatings[key] = clamp(newRatings[key] + amount, 20, 99)
    } else if (rand01(rng) < 0.08) {
      // 8% chance of minor regression in non-focus stats (represents decay from lack of use)
      if (!isFocusStat && estimatedMinutes < 10) {
        newRatings[key] = clamp(newRatings[key] - 1, 20, 99)
      }
    }
  }
  
  // ===== STEP 10: Calculate final overall rating =====
  newRatings.overall = clamp(Math.round(ratings.overall + totalOverallGain), 40, 99)
  
  // ===== STEP 11: Update development tracking =====
  const newDevelopment = {
    ...development,
    confidence: updatedConfidence,
    yearsSincePeak: hasPlateaud ? (development.yearsSincePeak ?? 0) + 1 : 0,
  }
  
  return {
    ...player,
    ratings: newRatings,
    development: newDevelopment,
  }
}

/**
 * Get archetype-specific focus stats for targeted development
 */
function getArchetypeFocusStats(archetype: Archetype): (keyof PlayerState['ratings'])[] {
  switch (archetype) {
    case "PRIMARY_SCORER":
      return ['shooting2', 'shooting3', 'finishing', 'ballHandling', 'freeThrow']
    case "FACILITATOR":
      return ['passing', 'ballHandling', 'shooting3']
    case "SHOOTER":
      return ['shooting3', 'freeThrow', 'shooting2']
    case "TWO_WAY_GUARD":
      return ['perimeterDefense', 'steal', 'ballHandling', 'shooting3']
    case "WING_SCORER":
      return ['shooting2', 'shooting3', 'finishing', 'athleticism']
    case "THREE_AND_D_WING":
      return ['shooting3', 'perimeterDefense', 'steal']
    case "ALL_AROUND_WING":
      return ['shooting2', 'shooting3', 'passing', 'perimeterDefense', 'athleticism']
    case "POST_SCORER":
      return ['finishing', 'shooting2', 'strength']
    case "RIM_PROTECTOR":
      return ['rimDefense', 'block', 'strength']
    case "REBOUNDER_ENERGY_BIG":
      return ['strength', 'athleticism', 'rimDefense', 'stamina']
    case "STRETCH_BIG":
      return ['shooting3', 'freeThrow', 'shooting2']
    default:
      return ['shooting2', 'finishing', 'perimeterDefense', 'athleticism']
  }
}
