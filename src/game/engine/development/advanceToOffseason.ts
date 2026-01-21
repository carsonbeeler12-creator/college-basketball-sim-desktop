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
 * 5. Converting signed recruits to roster players
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
    
    // Add signed recruits to roster
    const signedRecruits = getSignedRecruitsForTeam(dynasty.recruiting.recruitPool, teamId)
    for (const recruit of signedRecruits) {
      const newPlayer = convertRecruitToPlayer(recruit, teamId, dynasty.world.seasonYear + 1)
      newDynasty.playersById[newPlayer.playerId] = newPlayer
      newPlayerIds.push(newPlayer.playerId)
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
  
  // Remove signed recruits from recruit pool
  const remainingRecruits: Record<ID, Recruit> = {}
  for (const recruitId of Object.keys(newDynasty.recruiting.recruitPool)) {
    const recruit = newDynasty.recruiting.recruitPool[recruitId]
    if (recruit.status !== 'SIGNED') {
      remainingRecruits[recruitId] = recruit
    }
  }
  newDynasty.recruiting.recruitPool = remainingRecruits
  
  // Update RNG state
  newDynasty.rng.state = rng.state
  
  return newDynasty
}

/**
 * Get all recruits that have signed with a specific team
 */
function getSignedRecruitsForTeam(recruitPool: Record<ID, Recruit>, teamId: ID): Recruit[] {
  const signedRecruits: Recruit[] = []
  
  for (const recruitId of Object.keys(recruitPool)) {
    const recruit = recruitPool[recruitId]
    if (recruit.status === 'SIGNED' && recruit.committedToTeamId === teamId) {
      signedRecruits.push(recruit)
    }
  }
  
  return signedRecruits
}

/**
 * Convert a signed recruit to a player state
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