// src/game/engine/stats/calculateAwards.ts

import type { Dynasty, ID } from '../../types/dynasty'
import type { PlayerAward } from '../../types'
import { TEAMS } from '../../defaultData'

/**
 * Calculate and award end-of-season honors to players.
 * Called during offseason after tournament.
 * 
 * Awards based on:
 * - Regular season stats (PPG, RPG, APG, etc.)
 * - Efficiency and advanced metrics
 * - Class year (for Freshman of Year)
 * - Team success (better teams get more awards)
 */
export function calculateAwards(dynasty: Dynasty): Dynasty {
  const seasonYear = dynasty.world.seasonYear
  const playersById = dynasty.playersById
  const teamsById = dynasty.league.teamsById

  // Get all eligible players (played at least 10 games)
  const eligiblePlayers = Object.values(playersById).filter(p => {
    return p.stats.gamesPlayed >= 10
  })

  if (eligiblePlayers.length === 0) return dynasty

  // Calculate per-game stats for all eligible players
  const playerStats = eligiblePlayers.map(p => {
    const gp = p.stats.gamesPlayed
    const mins = p.stats.minutes / gp
    const ppg = p.stats.points / gp
    const rpg = p.stats.rebounds / gp
    const apg = p.stats.assists / gp
    const spg = p.stats.steals / gp
    const bpg = p.stats.blocks / gp
    const fgPct = p.stats.fga > 0 ? p.stats.fgm / p.stats.fga : 0
    const tpPct = p.stats.tpa > 0 ? p.stats.tpm / p.stats.tpa : 0
    const ftPct = p.stats.fta > 0 ? p.stats.ftm / p.stats.fta : 0

    // Simple efficiency rating
    const efficiency = ppg + rpg + apg + spg + bpg + (fgPct * 10)

    // Team success bonus
    const teamState = teamsById[p.team.teamId]
    const teamWins = teamState?.season.wins ?? 0
    const teamBonus = teamWins * 0.1

    return {
      player: p,
      mins,
      ppg,
      rpg,
      apg,
      spg,
      bpg,
      fgPct,
      tpPct,
      ftPct,
      efficiency,
      score: efficiency + teamBonus, // Overall award score
      defensiveScore: spg + bpg + (p.ratings.perimeterDefense + p.ratings.rimDefense) / 50,
    }
  })

  // Sort by score for main awards
  playerStats.sort((a, b) => b.score - a.score)

  const awards: Map<ID, PlayerAward[]> = new Map()

  // === PLAYER OF THE YEAR ===
  // Top player overall
  if (playerStats.length > 0) {
    const winner = playerStats[0].player
    addAward(awards, winner.playerId, 'PLAYER_OF_THE_YEAR')
  }

  // === ALL-AMERICAN TEAMS ===
  // First Team: Top 5 players
  for (let i = 0; i < Math.min(5, playerStats.length); i++) {
    addAward(awards, playerStats[i].player.playerId, 'ALL_AMERICAN_FIRST')
  }

  // Second Team: Next 5 players (6-10)
  for (let i = 5; i < Math.min(10, playerStats.length); i++) {
    addAward(awards, playerStats[i].player.playerId, 'ALL_AMERICAN_SECOND')
  }

  // Third Team: Next 5 players (11-15)
  for (let i = 10; i < Math.min(15, playerStats.length); i++) {
    addAward(awards, playerStats[i].player.playerId, 'ALL_AMERICAN_THIRD')
  }

  // === FRESHMAN OF THE YEAR ===
  const freshmen = playerStats.filter(ps => ps.player.identity.classYear === 'FR')
  if (freshmen.length > 0) {
    freshmen.sort((a, b) => b.score - a.score)
    addAward(awards, freshmen[0].player.playerId, 'FRESHMAN_OF_THE_YEAR')
  }

  // === DEFENSIVE PLAYER OF THE YEAR ===
  const defensive = [...playerStats].sort((a, b) => b.defensiveScore - a.defensiveScore)
  if (defensive.length > 0) {
    addAward(awards, defensive[0].player.playerId, 'DEFENSIVE_PLAYER_OF_THE_YEAR')
  }

  // === ALL-CONFERENCE TEAMS ===
  // Group players by conference
  const playersByConference: Map<string, typeof playerStats> = new Map()
  
  for (const ps of playerStats) {
    const teamData = TEAMS.find(t => t.id === ps.player.team.teamId)
    const confId = teamData?.conferenceId ?? 'independent'
    
    if (!playersByConference.has(confId)) {
      playersByConference.set(confId, [])
    }
    playersByConference.get(confId)!.push(ps)
  }

  // Award All-Conference honors per conference
  for (const confPlayers of playersByConference.values()) {
    confPlayers.sort((a, b) => b.score - a.score)
    
    // First Team: Top 5 in conference
    for (let i = 0; i < Math.min(5, confPlayers.length); i++) {
      addAward(awards, confPlayers[i].player.playerId, 'ALL_CONFERENCE_FIRST')
    }
    
    // Second Team: Next 5 in conference
    for (let i = 5; i < Math.min(10, confPlayers.length); i++) {
      addAward(awards, confPlayers[i].player.playerId, 'ALL_CONFERENCE_SECOND')
    }
  }

  // === SIXTH MAN OF THE YEAR ===
  // Player who averaged 15-25 minutes (bench role) with high efficiency
  const benchPlayers = playerStats.filter(ps => ps.mins >= 15 && ps.mins < 25)
  if (benchPlayers.length > 0) {
    benchPlayers.sort((a, b) => b.efficiency - a.efficiency)
    addAward(awards, benchPlayers[0].player.playerId, 'SIXTH_MAN_OF_THE_YEAR')
  }

  // === APPLY AWARDS TO PLAYERS ===
  let updatedPlayersById = { ...playersById }

  for (const [playerId, playerAwards] of awards.entries()) {
    const player = updatedPlayersById[playerId]
    if (!player || playerAwards.length === 0) continue

    const existingAwards = player.awards ?? []
    
    updatedPlayersById[playerId] = {
      ...player,
      awards: [
        ...existingAwards,
        {
          seasonYear,
          awards: playerAwards,
        },
      ],
    }
  }

  return {
    ...dynasty,
    playersById: updatedPlayersById,
  }
}

/**
 * Helper to add award to a player's award list
 */
function addAward(awards: Map<ID, PlayerAward[]>, playerId: ID, award: PlayerAward) {
  if (!awards.has(playerId)) {
    awards.set(playerId, [])
  }
  awards.get(playerId)!.push(award)
}

/**
 * Get formatted award name for display
 */
export function getAwardName(award: PlayerAward): string {
  switch (award) {
    case 'PLAYER_OF_THE_YEAR': return 'Player of the Year'
    case 'ALL_AMERICAN_FIRST': return 'All-American (1st Team)'
    case 'ALL_AMERICAN_SECOND': return 'All-American (2nd Team)'
    case 'ALL_AMERICAN_THIRD': return 'All-American (3rd Team)'
    case 'ALL_CONFERENCE_FIRST': return 'All-Conference (1st Team)'
    case 'ALL_CONFERENCE_SECOND': return 'All-Conference (2nd Team)'
    case 'FRESHMAN_OF_THE_YEAR': return 'Freshman of the Year'
    case 'DEFENSIVE_PLAYER_OF_THE_YEAR': return 'Defensive Player of the Year'
    case 'SIXTH_MAN_OF_THE_YEAR': return 'Sixth Man of the Year'
    default: return award
  }
}

/**
 * Get development boost multiplier from awards
 * Better awards = bigger development boost
 */
export function getAwardDevelopmentBoost(awards: PlayerAward[]): number {
  if (!awards || awards.length === 0) return 0

  let boost = 0

  for (const award of awards) {
    switch (award) {
      case 'PLAYER_OF_THE_YEAR':
        boost += 0.3 // 30% boost to development
        break
      case 'ALL_AMERICAN_FIRST':
        boost += 0.2 // 20% boost
        break
      case 'ALL_AMERICAN_SECOND':
      case 'FRESHMAN_OF_THE_YEAR':
      case 'DEFENSIVE_PLAYER_OF_THE_YEAR':
        boost += 0.15 // 15% boost
        break
      case 'ALL_AMERICAN_THIRD':
      case 'ALL_CONFERENCE_FIRST':
        boost += 0.1 // 10% boost
        break
      case 'ALL_CONFERENCE_SECOND':
      case 'SIXTH_MAN_OF_THE_YEAR':
        boost += 0.05 // 5% boost
        break
    }
  }

  // Cap at 50% total boost (if someone wins multiple awards)
  return Math.min(boost, 0.5)
}
