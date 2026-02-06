// src/game/engine/development/advanceToOffseason.ts

import type { Dynasty, ID, PlayerState, Recruit } from '../../types/dynasty'
import { progressPlayer } from './playerProgression'
import { calculateAwards } from '../stats/calculateAwards'
import { applyPrestigeAdjustments } from './applyPrestigeAdjustments'
import { generateSeasonHighlights } from '../stats/generateSeasonHighlights'
import { getEffectivePrestige } from './applyPrestigeAdjustments'
import { TEAMS } from '../../defaultData'

/**
 * Advances the dynasty from POSTSEASON to OFFSEASON.
 * This handles:
 * 1. Calculating and awarding end-of-season honors
 * 2. Generating season highlights for recap
 * 3. Updating coach career statistics
 * 4. Graduating SR players
 * 5. Progressing remaining players (FR->SO, SO->JR, JR->SR)
 * 6. Converting committed recruits to roster players
 * 7. Clearing old season data
 */
export function advanceToOffseason(dynasty: Dynasty): Dynasty {
  // First, calculate and award season honors
  let updatedDynasty = calculateAwards(dynasty)

  // Apply prestige adjustments before tournament data is cleared
  updatedDynasty = applyPrestigeAdjustments(updatedDynasty)
  
  // Generate season highlights for end-of-season recap
  const seasonHighlights = generateSeasonHighlights(updatedDynasty)
  
  const rng = { state: updatedDynasty.rng.state }
  
  // Update coach career statistics
  let updatedCoach = { ...updatedDynasty.coach }
  const userTeam = updatedDynasty.league.teamsById[updatedDynasty.league.userTeamId]
  if (userTeam && updatedCoach.careerStats) {
    // Create new careerStats object to ensure immutability
    const newCareerStats = { ...updatedCoach.careerStats }
    
    // Calculate wins/losses for this season
    const seasonWins = userTeam.season.wins
    const seasonLosses = userTeam.season.losses
    
    newCareerStats.totalWins += seasonWins
    newCareerStats.totalLosses += seasonLosses
    newCareerStats.seasonsCoached += 1
    newCareerStats.yearsAtCurrentSchool = (newCareerStats.yearsAtCurrentSchool ?? 0) + 1
    
    // Update average prestige
    const teamData = TEAMS.find(t => t.id === updatedDynasty.league.userTeamId)
    const currentPrestige = userTeam && teamData ? getEffectivePrestige(teamData, userTeam) : 0
    newCareerStats.averagePrestige = 
      (newCareerStats.averagePrestige * (newCareerStats.seasonsCoached - 1) + currentPrestige) / 
      newCareerStats.seasonsCoached
    
    // Update prestige tier based on current prestige
    if (currentPrestige >= 85) {
      newCareerStats.currentPrestigeTier = 'BLUE_BLOOD'
    } else if (currentPrestige >= 75) {
      newCareerStats.currentPrestigeTier = 'POWER'
    } else if (currentPrestige >= 60) {
      newCareerStats.currentPrestigeTier = 'MID_MAJOR'
    } else if (currentPrestige >= 45) {
      newCareerStats.currentPrestigeTier = 'MID_TIER'
    } else {
      newCareerStats.currentPrestigeTier = 'SMALL_SCHOOL'
    }
    
    updatedCoach.careerStats = newCareerStats
    // TODO: Set tournament finish based on tournament result when ready
  }
  
  // Create new dynasty state
  const newDynasty: Dynasty = {
    ...updatedDynasty,
    coach: updatedCoach,
    world: {
      ...updatedDynasty.world,
      phase: 'OFFSEASON',
      day: 0, // Reset day counter for offseason
    },
    playersById: { ...updatedDynasty.playersById },
    league: {
      ...updatedDynasty.league,
      teamsById: { ...updatedDynasty.league.teamsById },
      seasonHighlights, // Store highlights for display
    },
    recruiting: {
      ...updatedDynasty.recruiting,
      recruitPool: { ...updatedDynasty.recruiting.recruitPool },
    },
  }

  // Process each team
  for (const teamId of Object.keys(newDynasty.league.teamsById)) {
    const team = newDynasty.league.teamsById[teamId]
    const newPlayerIds: ID[] = []
    
    // Process current roster
    for (const playerId of team.roster.playerIds) {
      const player = newDynasty.playersById[playerId]
      if (!player) continue
      
      // Graduate SR players
      if (player.identity.classYear === 'SR') {
        // Remove SR players from the roster
        delete newDynasty.playersById[playerId]
        continue
      }
      
      // Progress younger players
      const progressedPlayer = progressPlayer(player, rng, 0)
      
      // Advance class year
      let newClassYear: PlayerState['identity']['classYear']
      switch (player.identity.classYear) {
        case 'FR': newClassYear = 'SO'; break
        case 'SO': newClassYear = 'JR'; break
        case 'JR': newClassYear = 'SR'; break
        default: newClassYear = player.identity.classYear
      }
      
      // Update player with new class year and progressed ratings
      const updatedPlayer: PlayerState = {
        ...progressedPlayer,
        identity: {
          ...progressedPlayer.identity,
          classYear: newClassYear,
        },
        stats: {
          ...progressedPlayer.stats,
          seasonYear: dynasty.world.seasonYear + 1, // New season
          gamesPlayed: 0,
          minutes: 0,
          points: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          fgm: 0,
          fga: 0,
          tpm: 0,
          tpa: 0,
          ftm: 0,
          fta: 0,
          turnovers: 0,
          fouls: 0,
        },
      }
      
      newDynasty.playersById[playerId] = updatedPlayer
      newPlayerIds.push(playerId)
    }
    
    // Add committed recruits to roster (COMMITTED means they will join next season)
    const committedRecruits = getCommittedRecruitsForTeam(dynasty.recruiting.recruitPool, teamId)
    for (const recruit of committedRecruits) {
      const newPlayer = convertRecruitToPlayer(recruit, teamId, dynasty.world.seasonYear + 1)
      newDynasty.playersById[newPlayer.playerId] = newPlayer
      newPlayerIds.push(newPlayer.playerId)
    }
    
    // Add walk-on players to fill roster to 13 spots if needed
    const MAX_ROSTER_SIZE = 13
    if (newPlayerIds.length < MAX_ROSTER_SIZE) {
      const walkOnsNeeded = MAX_ROSTER_SIZE - newPlayerIds.length
      // Get the current roster players for position analysis
      const rosterPlayers = newPlayerIds.map(id => newDynasty.playersById[id]).filter(p => p !== undefined)
      const walkOns = generateWalkOns(teamId, walkOnsNeeded, rng, dynasty.world.seasonYear + 1, rosterPlayers)
      for (const walkOn of walkOns) {
        newDynasty.playersById[walkOn.playerId] = walkOn
        newPlayerIds.push(walkOn.playerId)
      }
    }
    
    // Update team roster
    newDynasty.league.teamsById[teamId] = {
      ...team,
      roster: {
        ...team.roster,
        playerIds: newPlayerIds,
        redshirtedPlayerIds: [], // Clear redshirts for new season
      },
      season: {
        wins: 0,
        losses: 0,
        confWins: 0,
        confLosses: 0,
      },
    }
  }
  
  // Clear old tournament data
  newDynasty.league.tournament = undefined
  newDynasty.league.schedule = undefined
  newDynasty.league.seasonStats = undefined
  
  // Remove committed recruits from recruit pool (they've become players)
  const remainingRecruits: Record<ID, Recruit> = {}
  for (const recruitId of Object.keys(newDynasty.recruiting.recruitPool)) {
    const recruit = newDynasty.recruiting.recruitPool[recruitId]
    if (recruit.status !== 'COMMITTED') {
      remainingRecruits[recruitId] = recruit
    }
  }
  newDynasty.recruiting.recruitPool = remainingRecruits
  
  // Update RNG state
  newDynasty.rng.state = rng.state
  
  return newDynasty
}

/**
 * Get all recruits that have committed to a specific team
 */
function getCommittedRecruitsForTeam(recruitPool: Record<ID, Recruit>, teamId: ID): Recruit[] {
  const committedRecruits: Recruit[] = []
  
  for (const recruitId of Object.keys(recruitPool)) {
    const recruit = recruitPool[recruitId]
    if (recruit.status === 'COMMITTED' && recruit.committedToTeamId === teamId) {
      committedRecruits.push(recruit)
    }
  }
  
  return committedRecruits
}

/**
 * Convert a committed recruit to a player state
 */
function convertRecruitToPlayer(recruit: Recruit, teamId: ID, newSeasonYear: number): PlayerState {
  return {
    playerId: `p_${recruit.recruitId}_${Date.now()}`, // Generate new player ID
    identity: {
      firstName: recruit.firstName,
      lastName: recruit.lastName,
      age: 18, // Freshman age
      classYear: 'FR',
      position: recruit.position,
      archetype: determineArchetypeFromRatings(recruit.ratings, recruit.position),
      heightIn: recruit.heightIn,
      weightLb: recruit.weightLb,
      hometown: recruit.hometown,
    },
    ratings: recruit.ratings,
    development: {
      potential: recruit.potential,
      workEthic: 50, // Default work ethic for recruits
      durability: 70, // Default durability
    },
    team: {
      teamId,
      isRedshirt: false,
    },
    stats: {
      seasonYear: newSeasonYear,
      gamesPlayed: 0,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      turnovers: 0,
      fouls: 0,
    },
  }
}

/**
 * Determine archetype based on ratings and position
 * This is a simplified version - you might want to use the full archetype selection logic
 */
function determineArchetypeFromRatings(ratings: PlayerState['ratings'], position: PlayerState['identity']['position']): PlayerState['identity']['archetype'] {
  // Simplified archetype determination based on ratings
  // You could make this more sophisticated by comparing ratings to archetype templates
  
  if (position === 'PG') {
    if (ratings.passing > 75) return 'FACILITATOR'
    if (ratings.shooting3 > 70) return 'SHOOTER'
    return 'PRIMARY_SCORER'
  }
  
  if (position === 'SG') {
    if (ratings.shooting3 > 75) return 'SHOOTER'
    if (ratings.perimeterDefense > 70) return 'TWO_WAY_GUARD'
    return 'PRIMARY_SCORER'
  }
  
  if (position === 'SF') {
    if (ratings.shooting3 > 70 && ratings.perimeterDefense > 65) return 'THREE_AND_D_WING'
    if (ratings.shooting2 > 70) return 'WING_SCORER'
    return 'ALL_AROUND_WING'
  }
  
  if (position === 'PF') {
    if (ratings.shooting3 > 65) return 'STRETCH_BIG'
    if (ratings.finishing > 70) return 'POST_SCORER'
    return 'REBOUNDER_ENERGY_BIG'
  }
  
  if (position === 'C') {
    if (ratings.block > 75) return 'RIM_PROTECTOR'
    if (ratings.finishing > 70) return 'POST_SCORER'
    return 'REBOUNDER_ENERGY_BIG'
  }
  
  // Fallback
  return 'PRIMARY_SCORER'
}

/**
 * Rng helper for generating random numbers
 */
function randInt(rng: { state: number }, min: number, max: number): number {
  rng.state = (rng.state * 1664525 + 1013904223) >>> 0
  return min + (rng.state % (max - min + 1))
}

const WALKON_FIRST = ['Alex', 'Jordan', 'Chris', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Cameron', 'Parker', 'Hayden']
const WALKON_LAST = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas']

function pickWalkOnName(rng: { state: number }): { firstName: string; lastName: string } {
  const firstName = WALKON_FIRST[randInt(rng, 0, WALKON_FIRST.length - 1)]
  const lastName = WALKON_LAST[randInt(rng, 0, WALKON_LAST.length - 1)]
  return { firstName, lastName }
}

/**
 * Generate walk-on players to fill remaining roster spots by position of need
 * Analyzes current roster to determine which positions are understaffed
 */
function generateWalkOns(teamId: ID, count: number, rng: { state: number }, seasonYear: number, existingRoster?: PlayerState[]): PlayerState[] {
  const POSITIONS: Array<'PG' | 'SG' | 'SF' | 'PF' | 'C'> = ['PG', 'SG', 'SF', 'PF', 'C']
  
  // Count current players by position
  const playersByPosition: Record<string, number> = {
    PG: 0,
    SG: 0,
    SF: 0,
    PF: 0,
    C: 0,
  }
  
  if (existingRoster) {
    for (const player of existingRoster) {
      const pos = player.identity.position
      playersByPosition[pos] = (playersByPosition[pos] || 0) + 1
    }
  }
  
  // Define minimum requirements per position for a balanced roster
  const minByPosition: Record<string, number> = {
    PG: 2,
    SG: 2,
    SF: 2,
    PF: 2,
    C: 2,
  }
  
  // Identify positions that need filling (below minimum)
  const positionsNeeded: Array<'PG' | 'SG' | 'SF' | 'PF' | 'C'> = []
  
  for (const pos of POSITIONS) {
    const current = playersByPosition[pos] || 0
    const needed = Math.max(0, minByPosition[pos] - current)
    for (let i = 0; i < needed && positionsNeeded.length < count; i++) {
      positionsNeeded.push(pos as 'PG' | 'SG' | 'SF' | 'PF' | 'C')
    }
  }
  
  // If we still need more players (roster > 10), add guards/wings with bias
  if (positionsNeeded.length < count) {
    const addPool: Array<'PG' | 'SG' | 'SF' | 'PF' | 'C'> = ['PG', 'SG', 'SG', 'SF', 'SF', 'PF']
    while (positionsNeeded.length < count) {
      positionsNeeded.push(addPool[randInt(rng, 0, addPool.length - 1)])
    }
  }
  
  // Generate walk-on player for each position
  const walkOns: PlayerState[] = []
  for (let i = 0; i < count; i++) {
    const position = positionsNeeded[i]
    const walkOn = createWalkOnPlayer(teamId, position, seasonYear, i, rng)
    walkOns.push(walkOn)
  }
  
  return walkOns
}

/**
 * Create a single walk-on player
 */
function createWalkOnPlayer(teamId: ID, position: 'PG' | 'SG' | 'SF' | 'PF' | 'C', seasonYear: number, index: number, rng: { state: number }): PlayerState {
  // Generate basic walk-on ratings (very low overall)
  const baseRating = randInt(rng, 25, 40)
  
  // Position-specific height/weight
  let heightIn = 72
  let weightLb = 200
  if (position === 'C') {
    heightIn = randInt(rng, 80, 83)
    weightLb = randInt(rng, 240, 279)
  } else if (position === 'PF') {
    heightIn = randInt(rng, 78, 80)
    weightLb = randInt(rng, 220, 249)
  } else if (position === 'SF') {
    heightIn = randInt(rng, 76, 78)
    weightLb = randInt(rng, 200, 219)
  } else if (position === 'SG') {
    heightIn = randInt(rng, 74, 76)
    weightLb = randInt(rng, 185, 199)
  } else {
    // PG
    heightIn = randInt(rng, 72, 73)
    weightLb = randInt(rng, 175, 189)
  }

  const { firstName, lastName } = pickWalkOnName(rng)
  
  return {
    playerId: `p_walkOn_${teamId}_${seasonYear}_${index}_${Date.now()}`,
    identity: {
      firstName,
      lastName,
      age: 18,
      classYear: 'FR',
      position,
      archetype: determineArchetypeFromRatings(
        {
          overall: baseRating,
          passing: baseRating - 5,
          shooting2: baseRating - 3,
          shooting3: baseRating - 8,
          perimeterDefense: baseRating - 3,
           rimDefense: baseRating - 2,
           steal: baseRating - 2,
          finishing: baseRating - 3,
          block: baseRating - 4,
           ballHandling: baseRating - 5,
           freeThrow: baseRating - 3,
           athleticism: baseRating - 2,
           strength: baseRating - 2,
           stamina: baseRating - 1,
        } as any,
        position
      ),
      heightIn,
      weightLb,
      hometown: 'Walk-on, USA',
    },
    ratings: {
      overall: baseRating,
      passing: baseRating - 5,
      shooting2: baseRating - 3,
      shooting3: baseRating - 8,
      perimeterDefense: baseRating - 3,
       rimDefense: baseRating - 2,
       steal: baseRating - 2,
      finishing: baseRating - 3,
       ballHandling: baseRating - 5,
       freeThrow: baseRating - 3,
      block: baseRating - 4,
       athleticism: baseRating - 2,
       strength: baseRating - 2,
       stamina: baseRating - 1,
    },
    development: {
      potential: Math.min(60, baseRating + 5),
      workEthic: 50,
      durability: 70,
    },
    team: {
      teamId,
      isRedshirt: false,
    },
    stats: {
      seasonYear,
      gamesPlayed: 0,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      turnovers: 0,
      fouls: 0,
    },
  }
}