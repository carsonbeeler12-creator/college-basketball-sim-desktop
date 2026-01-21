import type { PlayerState } from '../../types/dynasty'
import { getAwardDevelopmentBoost } from '../stats/calculateAwards'

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
 * Improve (or regress) a player's ratings based on potential, age, work ethic, and PLAYING TIME.
 * This should be called once per season (during offseason).
 * 
 * Realism: Player development is heavily influenced by usage. Bench players improve slowly.
 */
export function progressPlayer(player: PlayerState, rng: Rng, avgMinutesPlayed: number = 0): PlayerState {
  const { ratings, development, identity, stats } = player
  const { potential, workEthic = 50 } = development
  
  // Calculate room for growth
  const roomToGrow = Math.max(0, potential - ratings.overall)
  
  // Base improvement factor based on class year
  // Freshmen improve more, but much less than before (0.3x instead of 0.8x)
  let growthFactor = 0
  switch (identity.classYear) {
    case 'FR': growthFactor = 0.3; break // Moving to SO - minimal improvement for bench players
    case 'SO': growthFactor = 0.2; break // Moving to JR
    case 'JR': growthFactor = 0.15; break // Moving to SR
    case 'SR': growthFactor = 0.05; break // Graduating
  }
  
  // Work ethic bonus (0.8 to 1.2 multiplier)
  const workEthicMult = 0.8 + (workEthic / 100) * 0.4
  
  // USAGE MULTIPLIER: Minutes played dramatically affects development
  // Estimate if we don't have explicit stats
  // If player has no games played (e.g., redshirt, new player), use average rotation usage
  const estimatedMinutes = avgMinutesPlayed > 0 
    ? avgMinutesPlayed 
    : stats.gamesPlayed > 0 
      ? stats.minutes / stats.gamesPlayed
      : 12  // Default to ~12 min/game for players with no stats
  
  // Usage tier: 
  // 0-8 mins/game (bench): 0.4x (very limited development)
  // 8-15 mins/game (rotation): 0.8x
  // 15-25 mins/game (key rotation): 1.2x (better development)
  // 25+ mins/game (starter): 1.5x (best development)
  let usageMultiplier = 0.4
  if (estimatedMinutes >= 25) usageMultiplier = 1.5
  else if (estimatedMinutes >= 15) usageMultiplier = 1.2
  else if (estimatedMinutes >= 8) usageMultiplier = 0.8
  
  // AWARD BOOST: Players who won awards get extra development
  // Check if player won any awards this season
  const currentSeasonAwards = player.awards?.find(a => a.seasonYear === stats.seasonYear)
  const awardBoost = currentSeasonAwards 
    ? 1 + getAwardDevelopmentBoost(currentSeasonAwards.awards)
    : 1.0
  
  // Calculate total points to distribute
  // Much more conservative: 0.5-2 points per year for bench, more for starters
  // Award winners can get up to 50% more improvement
  const baseGain = roomToGrow * 0.15 * growthFactor * workEthicMult * usageMultiplier * awardBoost
  
  // Random variance (-0.5 to +1.0 overall equivalent)
  const variance = jitter(rng, 0.75)
  
  const totalOverallGain = Math.max(-1, baseGain + variance)
  
  // Distribute gains to specific attributes
  const newRatings = { ...ratings }
  
  // Keys to improve - prioritize position-relevant skills
  const keys: (keyof typeof ratings)[] = [
    'shooting2', 'shooting3', 'freeThrow', 'finishing', 
    'ballHandling', 'passing', 
    'perimeterDefense', 'rimDefense', 'steal', 'block',
    'athleticism', 'strength', 'stamina'
  ]

  for (const key of keys) {
    if (key === 'overall') continue
    
    // Chance to improve this specific stat (usage affects this too)
    const improveChance = 0.5 + (usageMultiplier * 0.2) // More usage = more development
    if (rand01(rng) < improveChance) {
      // Improvement amount: 0 to 2 (reduced from 0 to 3)
      const amount = Math.max(0, Math.round(rand01(rng) * 2))
      
      // Apply improvement
      newRatings[key] = clamp(newRatings[key] + amount, 20, 99)
    }
  }
  
  // Recalculate overall
  newRatings.overall = clamp(Math.round(ratings.overall + totalOverallGain), 40, 99)
  
  return {
    ...player,
    ratings: newRatings,
  }
}
