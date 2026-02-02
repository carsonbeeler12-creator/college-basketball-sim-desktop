// src/game/engine/recruiting/generateRecruitPool.ts

import type { Dynasty, ID, Position, Recruit, GemBustStatus } from '../../types/dynasty'
import { pickArchetypeForPosition } from '../ratings/archetypes'
import { genRatings } from '../generateLeague'
import { TEAMS } from '../../defaultData'

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

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rand01(rng) * (max - min + 1)) + min
}

function jitter(rng: Rng, amount: number) {
  return (rand01(rng) - 0.5) * 2 * amount
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)]
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function makeId(prefix: string, rng: Rng): ID {
  const a = Math.floor(rand01(rng) * 1e9).toString(16)
  const b = Math.floor(rand01(rng) * 1e9).toString(16)
  return `${prefix}_${a}_${b}_${Date.now()}`
}

// Name generation (reuse from generateleague)
const FIRST = [
  "Jordan","Cameron","Tyler","Malik","Devin","Marcus","Ethan","Noah","Isaiah","Jalen","Darius","Caleb","Aiden","Xavier",
  "Cole","Grant","Trevor","KJ","Miles","Nolan","Brandon","Andre","Chris","Trey","Bryce","Micah","Parker","Austin",
  "James","Michael","David","Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew",
  "Joshua","Kenneth","Kevin","Brian","George","Timothy","Ronald","Jason","Edward","Jeffrey","Ryan","Jacob","Gary",
  "Nicholas","Eric","Jonathan","Stephen","Larry","Justin","Scott","Brandon","Benjamin","Samuel","Frank","Gregory",
  "Raymond","Alexander","Patrick","Jack","Dennis","Jerry","Tyler","Aaron","Jose","Henry","Adam","Douglas","Nathan",
  "Zachary","Kyle","Noah","Ethan","Jeremy","Hunter","Mason","Christian","Dylan","Tristan","Landon","Adrian","Connor",
  "Jaden","Jamal","Tyrone","Darnell","Kendrick","Marquis","Trevon","DeAndre","Jeremiah","Kaleb","Malcolm","Terrell",
  "Alejandro","Carlos","Diego","Eduardo","Fernando","Gabriel","Hector","Ivan","Javier","Jorge","Luis","Manuel",
  "Miguel","Oscar","Pablo","Rafael","Ricardo","Roberto","Sergio","Victor","Alonso","Andres","Cesar","Dario",
  "Emilio","Felipe","Gonzalo","Ignacio","Jose","Leonardo","Mateo","Nicolas","Octavio","Pablo","Ramon","Sebastian",
]

const LAST = [
  "Johnson","Williams","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris",
  "Martin","Thompson","Garcia","Martinez","Robinson","Clark","Lewis","Lee","Walker","Hall","Allen","Young","King",
  "Wright","Lopez","Hill","Scott","Green","Adams","Baker","Gonzalez","Nelson","Carter","Mitchell","Perez","Roberts",
  "Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers","Reed",
  "Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson",
  "Gray","Ramirez","James","Watson","Brooks","Kelly","Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson",
  "Rodriguez","Lopez","Gonzalez","Hernandez","Garcia","Martinez","Sanchez","Torres","Ramirez","Flores","Rivera",
]

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

/**
 * Generate a recruit pool for a season.
 * 
 * Pool size: ~200-300 recruits across all star ratings.
 * Distribution should favor lower star ratings (realistic).
 */
export function generateRecruitPool(dynasty: Dynasty, seasonYear: number): Record<ID, Recruit> {
  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `recruit_pool_${seasonYear}`) >>> 0 }
  let generationalCount = 0
  
  const pool: Record<ID, Recruit> = {}
  
  // Target distribution: More low-star recruits, fewer high-star
  // Rough distribution: 5★: 15, 4★: 45, 3★: 75, 2★: 100, 1★: 65 = ~300 total
  const distribution = [
    { stars: 5 as const, count: 15 },
    { stars: 4 as const, count: 45 },
    { stars: 3 as const, count: 75 },
    { stars: 2 as const, count: 100 },
    { stars: 1 as const, count: 65 },
  ]
  
  for (const { stars, count } of distribution) {
    for (let i = 0; i < count; i++) {
      const allowGenerational = generationalCount < 1
      const recruit = generateRecruit(rng, dynasty, stars, allowGenerational)
      if (recruit.isGenerational) generationalCount += 1
      pool[recruit.recruitId] = recruit
    }
  }
  
  // Assign national recruiting ranks (1-100) to top recruits
  // Sort by: generational status (first), then star rating, then overall rating
  const allRecruits = Object.values(pool)
  allRecruits.sort((a, b) => {
    // Generational talents always rank highest
    if (a.isGenerational && !b.isGenerational) return -1
    if (!a.isGenerational && b.isGenerational) return 1
    if (b.starRating !== a.starRating) return b.starRating - a.starRating
    return (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0)
  })
  
  // Assign ranks 1-100 to top recruits
  // Generational talents will always be #1 or #2 (depending on how many there are)
  for (let i = 0; i < Math.min(100, allRecruits.length); i++) {
    allRecruits[i].rank = i + 1
  }
  
  return pool
}

function generateRecruit(
  rng: Rng,
  dynasty: Dynasty,
  starRating: 1 | 2 | 3 | 4 | 5,
  allowGenerational: boolean,
  // seasonYear: number
): Recruit {
  const recruitId = makeId('recruit', rng)
  const position = pick(rng, POSITIONS)
  const archetype = pickArchetypeForPosition(rng, position)
  
  // Determine gem/bust status based on star rating
  const gemBustStatus = determineGemBustStatus(rng, starRating)
  
  // Check for generational talent (extremely rare - only for 5-stars)
  // Limit to at most one per season
  const isGenerational = allowGenerational && starRating === 5 && rand01(rng) < 0.002 // 0.2% chance
  
  // Overall rating based on star rating (freshman-level, since they're recruits)
  // Generational talents get a special boost
  let overallTarget = getOverallTargetForStarRating(rng, starRating)
  
  // Apply gem/bust modifiers to overall rating (busts are overrated, gems are underrated)
  if (gemBustStatus === 'BUST') {
    // Bust: lower overall (they're not as good as their star rating suggests)
    overallTarget = Math.max(overallTarget - randInt(rng, 3, 7), 1)
  } else if (gemBustStatus === 'GEM') {
    // Gem: higher overall (they're better than their star rating suggests)
    overallTarget = Math.min(overallTarget + randInt(rng, 2, 5), 99)
  }
  
  // Generational talents are truly special - boost their overall significantly
  if (isGenerational) {
    // Generational: 82-88 overall (exceptional even as freshmen)
    overallTarget = randInt(rng, 82, 88)
  }
  
  // Generate ratings (pass isGenerational flag to allow exceptional stats)
  const ratings = genRatings(rng, position, archetype, overallTarget, isGenerational)
  
  // Potential based on overall, gem/bust status, and star rating
  const potential = calculatePotential(rng, overallTarget, gemBustStatus, starRating)
  
  // Height/weight by position (similar to player generation)
  let heightIn = 72
  let weightLb = 190
  if (position === "PG") { heightIn = randInt(rng, 69, 75); weightLb = randInt(rng, 160, 205) }
  if (position === "SG") { heightIn = randInt(rng, 72, 78); weightLb = randInt(rng, 175, 220) }
  if (position === "SF") { heightIn = randInt(rng, 75, 81); weightLb = randInt(rng, 195, 235) }
  if (position === "PF") { heightIn = randInt(rng, 77, 83); weightLb = randInt(rng, 210, 255) }
  if (position === "C")  { heightIn = randInt(rng, 80, 87); weightLb = randInt(rng, 225, 285) }
  
  // Generate hometown (random from teams)
  const hometownTeam = pick(rng, TEAMS)
  const hometown = `${hometownTeam.city}, ${hometownTeam.state}`
  
  // Generate name
  const firstName = pick(rng, FIRST)
  const lastName = pick(rng, LAST)
  
  // Calculate initial interest in schools (uses star rating to determine difficulty)
  const interestByTeamId = calculateInitialInterest(rng, dynasty, starRating, hometownTeam.id)
  
  return {
    recruitId,
    firstName,
    lastName,
    position,
    heightIn,
    weightLb,
    hometown,
    ratings,
    potential,
    gemBustStatus,
    starRating,
    isGenerational: isGenerational || undefined, // Only set if true
    interestByTeamId,
    status: 'UNCOMMITTED',
    scoutedByTeamId: {},
  }
}

/**
 * Determine gem/bust status based on star rating and rarity rules.
 */
function determineGemBustStatus(rng: Rng, starRating: 1 | 2 | 3 | 4 | 5): GemBustStatus {
  const roll = rand01(rng)
  
  // Gems are rarer than busts, especially for high stars
  const gemChances: Record<number, number> = {
    5: 0.04, // 4% for 5★
    4: 0.06, // 6% for 4★
    3: 0.08, // 8% for 3★
    2: 0.05, // 5% for 2★
    1: 0.03, // 3% for 1★
  }
  
  const bustChances: Record<number, number> = {
    5: 0.08, // 8% for 5★
    4: 0.12, // 12% for 4★
    3: 0.15, // 15% for 3★
    2: 0.10, // 10% for 2★
    1: 0.05, // 5% for 1★
  }
  
  if (roll < gemChances[starRating]) return 'GEM'
  if (roll < gemChances[starRating] + bustChances[starRating]) return 'BUST'
  return 'NORMAL'
}

/**
 * Get overall rating target based on star rating.
 * Lowered ranges - recruits should be good but not elite as freshmen.
 * Note: Gem/bust status will modify this further.
 */
function getOverallTargetForStarRating(rng: Rng, starRating: 1 | 2 | 3 | 4 | 5): number {
  const ranges: Record<number, [number, number]> = {
    5: [73, 80], // 5★: 73-80 (busts will be 70-75, gems will be 78-82)
    4: [65, 75], // 4★: 65-75 (busts will be 62-70, gems will be 70-78)
    3: [58, 68], // 3★: 58-68 (busts will be 55-63, gems will be 63-71)
    2: [50, 60], // 2★: 50-60 (busts will be 47-55, gems will be 55-63)
    1: [42, 52], // 1★: 42-52 (busts will be 39-47, gems will be 47-55)
  }
  
  const [min, max] = ranges[starRating]
  return randInt(rng, min, max)
}

/**
 * Calculate potential based on overall, gem/bust status, and star rating.
 */
function calculatePotential(
  rng: Rng,
  overallTarget: number,
  gemBustStatus: GemBustStatus,
  starRating: number
): number {
  let basePotential = overallTarget
  
  // Gem = higher ceiling, Bust = lower ceiling
  if (gemBustStatus === 'GEM') {
    basePotential += randInt(rng, 5, 15) // +5 to +15
  } else if (gemBustStatus === 'BUST') {
    basePotential -= randInt(rng, 5, 15) // -5 to -15
  } else {
    basePotential += randInt(rng, -5, 10) // Normal variance
  }
  
  // Star rating also affects potential slightly
  basePotential += (starRating - 3) * 2 // Small boost for higher stars
  
  return clamp(Math.round(basePotential), 35, 99)
}

/**
 * Calculate initial interest in schools.
 * Factors: geography, prestige, star rating alignment.
 * Higher-star recruits have lower initial interest (they're in high demand).
 */
function calculateInitialInterest(
  rng: Rng,
  dynasty: Dynasty,
  // recruitId: ID,
  starRating: number,
  hometownTeamId: ID
): Record<ID, number> {
  const interest: Record<ID, number> = {}
  const allTeamIds = Object.keys(dynasty.league.teamsById)
  
  // Higher-star recruits have lower initial interest - they're harder to get
  // This makes the recruiting process take longer for elite prospects
  // 5★: 40%, 4★: 55%, 3★: 70%, 2★: 85%, 1★: 100%
  const interestModifierByStar: Record<number, number> = {
    5: 0.40, // Top recruits are in high demand - lower starting interest
    4: 0.55,
    3: 0.70,
    2: 0.85,
    1: 1.0,
  }
  const interestModifier = interestModifierByStar[starRating] ?? 1.0
  
  // Find hometown team data for matching
  const hometownTeamData = TEAMS.find(t => t.id === hometownTeamId)
  if (!hometownTeamData) {
    // If hometown team doesn't exist in TEAMS data, skip (shouldn't happen, but safety check)
    return interest
  }
  
  for (const teamId of allTeamIds) {
    // const team = dynasty.league.teamsById[teamId]
    const teamData = TEAMS.find(t => t.id === teamId)
    if (!teamData) continue
    
    let baseInterest = 0
    const isSameState = hometownTeamData.state === teamData.state
    
    // Hometown team ALWAYS gets interest (recruits are interested in their local team)
    // Match by team ID, or by city+state if team ID doesn't match (fallback for edge cases)
    const isHometownTeam = teamId === hometownTeamId || 
      (teamData.city === hometownTeamData.city && teamData.state === hometownTeamData.state)
    
    if (isHometownTeam) {
      baseInterest += 30 * interestModifier
      const final = clamp(Math.round(baseInterest + jitter(rng, 5 * interestModifier)), 5, 35)
      interest[teamId] = final
      continue // Skip other factors for hometown (already guaranteed)
    }
    
    // Geography: Same state gets a significant boost
    if (isSameState) {
      baseInterest += 20 * interestModifier
    }
    
    // Prestige alignment (higher prestige teams more interested in higher stars)
    const prestige = teamData.prestige
    const prestigeMatch = Math.abs(prestige / 20 - starRating) // 0-5 scale
    const prestigeScore = (5 - prestigeMatch) * 4 * interestModifier
    
    // Add prestige score
    baseInterest += prestigeScore
    
    // Add randomness for variety
    baseInterest += jitter(rng, 8 * interestModifier)
    
    // Calculate final interest
    const final = clamp(Math.round(baseInterest), 0, 35)
    
    // Probability-based selection: Not every team gets interest
    // Same state teams have higher chance, but still not guaranteed
    // This prevents all top recruits from having interest in all teams
    // Increased same-state probability so more local recruits show interest
    const baseChance = isSameState ? 0.85 : 0.40 // 85% chance for same state, 40% for others
    const roll = rand01(rng)
    
    // Only store interest if:
    // 1. Roll passes the probability check
    // 2. Final interest is at least 6% (meaningful threshold)
    if (roll < baseChance && final >= 6) {
      interest[teamId] = final
    }
  }
  
  return interest
}
