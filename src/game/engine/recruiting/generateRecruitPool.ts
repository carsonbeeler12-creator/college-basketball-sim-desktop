// src/game/engine/recruiting/generateRecruitPool.ts

import type { Dynasty, ID, Position, Recruit, GemBustStatus, Archetype } from '../../types/dynasty'
import { pickArchetypeForPosition } from '../ratings/archetypes'
import { genRatings } from '../generateLeague'
import { TEAMS } from '../../defaultData'
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
    // Bust: significantly lower overall (they're not as good as their star rating suggests)
    overallTarget = Math.max(overallTarget - randInt(rng, 5, 10), 1)
  } else if (gemBustStatus === 'GEM') {
    // Gem: higher overall (they're better than their star rating suggests)
    overallTarget = Math.min(overallTarget + randInt(rng, 3, 7), 99)
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
  
  // Assign personality type FIRST (before calculating interest, since it affects interest calculation)
  const personalityRoll = rand01(rng)
  let personality: 'LOYALIST' | 'WINNER' | 'STAR' | 'DEVELOPER' | 'SCHEME_FIT'
  if (personalityRoll < 0.20) personality = 'LOYALIST'       // 20%: Values hometown/geography
  else if (personalityRoll < 0.40) personality = 'WINNER'    // 20%: Values recent success/winning
  else if (personalityRoll < 0.60) personality = 'STAR'      // 20%: Values prestige/exposure  
  else if (personalityRoll < 0.80) personality = 'DEVELOPER' // 20%: Values playing time/coaching
  else personality = 'SCHEME_FIT'                             // 20%: Values scheme archetype match
  
  // Calculate initial interest in schools (uses star rating to determine difficulty)
  const interestByTeamId = calculateInitialInterest(rng, dynasty, starRating, hometownTeam.id, personality, archetype)
  
  // Generate work ethic: higher stars tend to have higher work ethic
  // 5★: 50-65 avg, 4★: 45-60, 3★: 40-55, 2★: 35-50, 1★: 30-45
  let workEthicBase = 50
  switch (starRating) {
    case 5: workEthicBase = randInt(rng, 50, 70); break
    case 4: workEthicBase = randInt(rng, 45, 65); break
    case 3: workEthicBase = randInt(rng, 40, 60); break
    case 2: workEthicBase = randInt(rng, 35, 55); break
    case 1: workEthicBase = randInt(rng, 30, 50); break
  }
  //Gems tend to have higher work ethic, busts lower
  let finalWorkEthic = workEthicBase
  if (gemBustStatus === 'GEM') finalWorkEthic = Math.min(100, finalWorkEthic + randInt(rng, 5, 10))
  else if (gemBustStatus === 'BUST') finalWorkEthic = Math.max(20, finalWorkEthic - randInt(rng, 5, 10))
  
  // Identify potential sleepers (hidden gems that can suddenly spike in interest mid-season)
  // More common in lower-star ratings (2-3★), especially gems
  // Simulates summer camp performances, growth spurts, injury recoveries
  let isSleeper = false
  if (gemBustStatus === 'GEM' && starRating <= 3) {
    isSleeper = rand01(rng) < 0.18 // 18% of 2-3★ gems are sleepers
  } else if (starRating === 2) {
    isSleeper = rand01(rng) < 0.08 // 8% of 2★ normals are sleepers
  } else if (starRating === 3) {
    isSleeper = rand01(rng) < 0.05 // 5% of 3★ normals are sleepers
  }
  
  return {
    recruitId,
    firstName,
    lastName,
    position,
    heightIn,
    weightLb,
    hometown,
    archetype,
    ratings,
    potential,
    gemBustStatus,
    starRating,
    isGenerational: isGenerational || undefined, // Only set if true
    workEthic: finalWorkEthic,  // Add variance to work ethic
    personality,  // Affects which factors they prioritize
    isSleeper: isSleeper || undefined, // Only set if true
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
    5: 0.05, // 5% for 5★
    4: 0.08, // 8% for 4★
    3: 0.10, // 10% for 3★
    2: 0.06, // 6% for 2★
    1: 0.03, // 3% for 1★
  }
  
  const bustChances: Record<number, number> = {
    5: 0.12, // 12% for 5★ (busts hurt more at high ratings)
    4: 0.15, // 15% for 4★
    3: 0.18, // 18% for 3★
    2: 0.12, // 12% for 2★
    1: 0.08, // 8% for 1★
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
 * Factors: geography, prestige, star rating alignment, personality type, recent success, scheme fit, PT availability.
 * Higher-star recruits have lower initial interest (they're in high demand).
 */
function calculateInitialInterest(
  rng: Rng,
  dynasty: Dynasty,
  starRating: number,
  hometownTeamId: ID,
  personality: 'LOYALIST' | 'WINNER' | 'STAR' | 'DEVELOPER' | 'SCHEME_FIT',
  archetype: Archetype
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
  
  // Get coach scheme for scheme fit evaluation
  const coachScheme = dynasty.coach?.scheme ?? 'BALANCED'
  
  for (const teamId of allTeamIds) {
    const teamState = dynasty.league.teamsById[teamId]
    const teamData = TEAMS.find(t => t.id === teamId)
    if (!teamData || !teamState) continue
    
    let baseInterest = 0
    const isSameState = hometownTeamData.state === teamData.state
    
    // Hometown team ALWAYS gets interest (recruits are interested in their local team)
    const isHometownTeam = teamId === hometownTeamId || 
      (teamData.city === hometownTeamData.city && teamData.state === hometownTeamData.state)
    
    if (isHometownTeam) {
      const homeBonusBase = 30 * interestModifier
      // LOYALIST personality doubles hometown bonus
      const homeBonusFinal = personality === 'LOYALIST' ? homeBonusBase * 1.8 : homeBonusBase
      baseInterest += homeBonusFinal
      const final = clamp(Math.round(baseInterest + jitter(rng, 5 * interestModifier)), 5, 40)
      interest[teamId] = final
      continue // Skip other factors for hometown (already guaranteed)
    }
    
    // === GEOGRAPHY FACTOR ===
    // Same state gets a significant boost
    let geographyBonus = 0
    if (isSameState) {
      geographyBonus = 20 * interestModifier
      // LOYALIST personality amplifies geography bonus
      if (personality === 'LOYALIST') geographyBonus *= 1.6
    }
    baseInterest += geographyBonus
    
    // === PRESTIGE FACTOR ===
    // Prestige alignment (higher prestige teams more interested in higher stars)
    const prestige = teamData.prestige
    const prestigeMatch = Math.abs(prestige / 20 - starRating) // 0-5 scale
    let prestigeScore = (5 - prestigeMatch) * 4 * interestModifier
    // STAR personality amplifies prestige bonus
    if (personality === 'STAR') prestigeScore *= 1.7
    baseInterest += prestigeScore
    
    // === RECENT SUCCESS FACTOR ===
    // Teams with recent tournament success or winning records are more attractive
    let recentSuccessBonus = 0
    
    // Check tournament history if it exists (major boost)
    // Note: tournamentHistory may not be directly accessible - we'll use prestige baseline
    // Real tournament success is reflected in prestige already
    // This is a proxy for "hot" teams with recent success
    
    // Check recent win percentage (base team season record)
    const wins = teamState.season?.wins ?? 0
    const losses = teamState.season?.losses ?? 0
    const totalGames = wins + losses
    if (totalGames > 0) {
      const winPct = wins / totalGames
      // 75%+ win rate = +5, 60-75% = +3, 50-60% = +1
      if (winPct >= 0.75) recentSuccessBonus += 5
      else if (winPct >= 0.60) recentSuccessBonus += 3
      else if (winPct >= 0.50) recentSuccessBonus += 1
    }
    
    // WINNER personality amplifies recent success bonus
    if (personality === 'WINNER') recentSuccessBonus *= 1.8
    baseInterest += recentSuccessBonus * interestModifier
    
    // === SCHEME FIT FACTOR ===
    // Recruits value schools whose scheme matches their archetype
    const schemeFit = evaluateArchetypeFit(archetype, coachScheme)
    let schemeFitBonus = schemeFit * 2 // Base: -2 to +5 depending on fit
    // SCHEME_FIT personality amplifies scheme fit bonus
    if (personality === 'SCHEME_FIT') schemeFitBonus *= 2.0
    baseInterest += schemeFitBonus * interestModifier
    
    // === PLAYING TIME FACTOR ===
    // Recruits value schools with PT opportunities (check roster depth at their position)
    // This is a proxy - use teamState.roster size (O(1)), NOT a full scan of playersById (O(players)).
    // Scanning all players for every team for every recruit is extremely expensive and can freeze dynasty creation.
    const rosterSize = teamState.roster?.playerIds?.length ?? 0
    let playingTimeBonus = 0
    if (rosterSize < 10) playingTimeBonus = 4 // Thin roster = more PT
    else if (rosterSize < 12) playingTimeBonus = 2 // Normal roster
    // Over-stacked rosters get no bonus or penalty (recruit should avoid if DEVELOPER)
    
    // DEVELOPER personality amplifies PT bonus
    if (personality === 'DEVELOPER') playingTimeBonus *= 1.8
    baseInterest += playingTimeBonus * interestModifier
    
    // === CONFERENCE PRESTIGE FACTOR ===
    // Playing in a high-prestige conference (measured by avg prestige of teams) adds appeal
    // Simplified: use team's conferenceId as proxy (power conferences have higher base prestige)
    const conference = teamData.conferenceId ?? 'Other'
    let conferenceFactor = 0
    // Power conferences (SEC, ACC, Big Ten, Big 12, Big East, Pac-12) get bonus
    const powerConferences = ['SEC', 'ACC', 'Big Ten', 'Big 12', 'Big East', 'Pac-12']
    if (powerConferences.includes(conference)) conferenceFactor = 3
    // STAR personality values conference prestige
    if (personality === 'STAR') conferenceFactor *= 1.5
    baseInterest += conferenceFactor * interestModifier
    
    // Add randomness for variety
    baseInterest += jitter(rng, 8 * interestModifier)
    
    // Calculate final interest
    // Reduced cap from 40 to 25 to slow down initial interest momentum
    // Recruits still get interested, but need more weekly gains to commit
    const final = clamp(Math.round(baseInterest), 0, 25)
    
    // Probability-based selection: Not every team gets interest
    // Same state teams have higher chance, but still not guaranteed
    // Increased same-state probability so more local recruits show interest
    const baseChance = isSameState ? 0.85 : 0.45 // 85% chance for same state, 45% for others (up from 40%)
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
