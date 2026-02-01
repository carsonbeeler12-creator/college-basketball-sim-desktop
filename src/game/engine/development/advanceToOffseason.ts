// src/game/engine/development/advanceToOffseason.ts

import type { Dynasty, ID, PlayerState, Recruit } from '../../types/dynasty'
import { progressPlayer } from './playerProgression'
import { calculateAwards } from '../stats/calculateAwards'
import { generateSeasonHighlights } from '../stats/generateSeasonHighlights'

/**
 * Advances the dynasty from POSTSEASON to OFFSEASON.
 * This handles:
 * 1. Calculating and awarding end-of-season honors
 * 2. Generating season highlights for recap
 * 3. Graduating SR players
 * 4. Progressing remaining players (FR->SO, SO->JR, JR->SR)
 * 5. Converting committed recruits to roster players
 * 6. Clearing old season data
 */
export function advanceToOffseason(dynasty: Dynasty): Dynasty {
  // First, calculate and award season honors
  let updatedDynasty = calculateAwards(dynasty)
  
  // Generate season highlights for end-of-season recap
  const seasonHighlights = generateSeasonHighlights(updatedDynasty)
  
  const rng = { state: updatedDynasty.rng.state }
  
  // Create new dynasty state
  const newDynasty: Dynasty = {
    ...updatedDynasty,
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
    const walkOn = createWalkOnPlayer(teamId, position, seasonYear, i)
    walkOns.push(walkOn)
  }
  
  return walkOns
}

/**
 * Create a single walk-on player
 */
function createWalkOnPlayer(teamId: ID, position: 'PG' | 'SG' | 'SF' | 'PF' | 'C', seasonYear: number, index: number): PlayerState {
  // Generate basic walk-on ratings (typically 40-55 overall)
  const baseRating = 40 + Math.floor(Math.random() * 15)
  
  // Position-specific height/weight
  let heightIn = 72
  let weightLb = 200
  if (position === 'C') {
    heightIn = 80 + Math.floor(Math.random() * 4)
    weightLb = 240 + Math.floor(Math.random() * 40)
  } else if (position === 'PF') {
    heightIn = 78 + Math.floor(Math.random() * 3)
    weightLb = 220 + Math.floor(Math.random() * 30)
  } else if (position === 'SF') {
    heightIn = 76 + Math.floor(Math.random() * 3)
    weightLb = 200 + Math.floor(Math.random() * 20)
  } else if (position === 'SG') {
    heightIn = 74 + Math.floor(Math.random() * 3)
    weightLb = 185 + Math.floor(Math.random() * 15)
  } else {
    // PG
    heightIn = 72 + Math.floor(Math.random() * 2)
    weightLb = 175 + Math.floor(Math.random() * 15)
  }
  
  return {
    playerId: `p_walkOn_${teamId}_${seasonYear}_${index}_${Date.now()}`,
    identity: {
      firstName: `Walk`,
      lastName: `On${index + 1}`,
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
          interiorDefense: baseRating - 2,
          rebounding: baseRating - 2,
          finishing: baseRating - 3,
          block: baseRating - 4,
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
      interiorDefense: baseRating - 2,
      rebounding: baseRating - 2,
      finishing: baseRating - 3,
      block: baseRating - 4,
    },
    development: {
      potential: baseRating + 10,
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