// src/game/engine/schedule/generateSchedule.ts

import type { Dynasty, ID, Schedule, ScheduledGame } from '../../types/dynasty'

type Rng = { state: number }

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

/**
 * Generates a full season schedule for all teams.
 * 
 * Schedule structure:
 * - Days 1-45: Non-conference games (10-11 games per team)
 * - Days 46-120: Conference games (18-20 games per team)
 * 
 * Each team plays:
 * - ~11 non-conference games (mix of home/away)
 * - ~18-20 conference games (single round-robin, with select home/away matchups)
 * - Total: ~30 games (matching Division 1 standard)
 */
export function generateSchedule(dynasty: Dynasty): Schedule {
  const teams = Object.values(dynasty.league.teamsById)
  const conferences = new Map<string, ID[]>()
  
  // Group teams by conference
  for (const team of teams) {
    // Get conferenceId from team metadata
    const confId = (team.meta?.conferenceId as string | undefined) || 'independent'
    if (!conferences.has(confId)) {
      conferences.set(confId, [])
    }
    conferences.get(confId)!.push(team.teamId)
  }
  
  const gamesByDay: Record<number, ScheduledGame[]> = {}
  let gameIdCounter = 0
  
  // Create RNG state for schedule generation (don't mutate dynasty's RNG)
  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `schedule_${dynasty.world.seasonYear}`) >>> 0 }
  
  // Generate unique game ID
  const getNextGameId = (): ID => {
    const id = `game_${dynasty.world.seasonYear}_${gameIdCounter++}`
    return id
  }
  
  // Non-conference games (Days 1-45): ~11 games per team
  generateNonConferenceGames(
    rng,
    teams.map(t => t.teamId),
    gamesByDay,
    getNextGameId,
    1, // Start day
    45 // End day
  )
  
  // Conference games (Days 46-120): ~18-20 games per team
  for (const [, teamIds] of conferences.entries()) {
    if (teamIds.length < 2) continue // Need at least 2 teams
    
    generateConferenceGames(
      rng,
      teamIds,
      gamesByDay,
      getNextGameId,
      46, // Start day
      120 // End day
    )
  }
  
  return {
    seasonYear: dynasty.world.seasonYear,
    gamesByDay,
  }
}

function generateNonConferenceGames(
  rng: Rng,
  allTeamIds: ID[],
  gamesByDay: Record<number, ScheduledGame[]>,
  getNextGameId: () => ID,
  startDay: number,
  endDay: number
): void {
  const targetGamesPerTeam = 11 // ~11 non-conference games per team
  
  // Track games scheduled per team
  const gamesByTeam = new Map<ID, number>()
  for (const tid of allTeamIds) {
    gamesByTeam.set(tid, 0)
  }
  
  // Track available days
  const availableDays: number[] = []
  for (let day = startDay; day <= endDay; day++) {
    availableDays.push(day)
  }
  
  // Shuffle teams for variety
  const shuffled = [...allTeamIds]
  shuffleArray(rng, shuffled)
  
  // Schedule games
  for (const homeTeamId of shuffled) {
    let homeGames = gamesByTeam.get(homeTeamId) ?? 0
    
    // Continue until this team has enough games
    while (homeGames < targetGamesPerTeam && availableDays.length > 0) {
      // Pick a random available day
      const dayIdx = randInt(rng, 0, availableDays.length - 1)
      const day = availableDays[dayIdx]
      
      // Find an opponent that also needs games and isn't already scheduled this day
      const teamsNeedingGames = allTeamIds.filter(tid => {
        if (tid === homeTeamId) return false
        const games = gamesByTeam.get(tid) ?? 0
        if (games >= targetGamesPerTeam) return false
        
        // Check if this team already has a game on this day
        const existingGames = gamesByDay[day] ?? []
        return !existingGames.some(g => g.homeTeamId === tid || g.awayTeamId === tid)
      })
      
      if (teamsNeedingGames.length === 0) {
        // Remove this day if no valid opponents
        availableDays.splice(dayIdx, 1)
        continue
      }
      
      // Pick random opponent
      const awayTeamId = pick(rng, teamsNeedingGames)
      
      // Decide home/away (alternate to balance)
      const isHome = homeGames % 2 === 0
      const finalHome = isHome ? homeTeamId : awayTeamId
      const finalAway = isHome ? awayTeamId : homeTeamId
      
      // Create game
      if (!gamesByDay[day]) {
        gamesByDay[day] = []
      }
      gamesByDay[day].push({
        gameId: getNextGameId(),
        homeTeamId: finalHome,
        awayTeamId: finalAway,
        isConferenceGame: false,
        day,
      })
      
      // Update counts
      gamesByTeam.set(finalHome, (gamesByTeam.get(finalHome) ?? 0) + 1)
      gamesByTeam.set(finalAway, (gamesByTeam.get(finalAway) ?? 0) + 1)
      homeGames = gamesByTeam.get(homeTeamId) ?? 0
      
      // Remove day if it's full (max 50 games per day to spread them out)
      if (gamesByDay[day].length >= 50) {
        availableDays.splice(dayIdx, 1)
      }
    }
  }
}

function generateConferenceGames(
  rng: Rng,
  teamIds: ID[],
  gamesByDay: Record<number, ScheduledGame[]>,
  getNextGameId: () => ID,
  startDay: number,
  endDay: number
): void {
  
  // Single round-robin + select double-headers for rivalry games
  // Each team plays ~18-20 conference games (not all teams twice)
  const matchups: Array<{ home: ID; away: ID }> = []
  
  // First, create single round-robin (each team plays every other once)
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      // Alternate home/away to balance
      if (i % 2 === 0) {
        matchups.push({ home: teamIds[i], away: teamIds[j] })
      } else {
        matchups.push({ home: teamIds[j], away: teamIds[i] })
      }
    }
  }
  
  // Add select return matchups for top rivalries (about 1/3 of matchups get home-and-away)
  // This gives us ~18-20 conference games per team instead of 30
  const rivalryCount = Math.floor(matchups.length / 3)
  for (let i = 0; i < rivalryCount && i < matchups.length; i++) {
    const original = matchups[i]
    matchups.push({ home: original.away, away: original.home })
  }
  
  // Shuffle matchups for variety
  shuffleArray(rng, matchups)
  
  // Schedule matchups across available days
  const availableDays: number[] = []
  for (let day = startDay; day <= endDay; day++) {
    availableDays.push(day)
  }
  
  let matchupIdx = 0
  let dayIdx = 0
  
  while (matchupIdx < matchups.length && dayIdx < availableDays.length) {
    const day = availableDays[dayIdx]
    const matchup = matchups[matchupIdx]
    
    // Check if either team already has a game on this day
    const existingGames = gamesByDay[day] ?? []
    const hasConflict = existingGames.some(
      g => g.homeTeamId === matchup.home || g.awayTeamId === matchup.home ||
           g.homeTeamId === matchup.away || g.awayTeamId === matchup.away
    )
    
    if (hasConflict) {
      dayIdx++
      if (dayIdx >= availableDays.length) {
        dayIdx = 0 // Wrap around
      }
      continue
    }
    
    // Schedule the game
    if (!gamesByDay[day]) {
      gamesByDay[day] = []
    }
    gamesByDay[day].push({
      gameId: getNextGameId(),
      homeTeamId: matchup.home,
      awayTeamId: matchup.away,
      isConferenceGame: true,
      day,
    })
    
    matchupIdx++
    dayIdx++
    if (dayIdx >= availableDays.length) {
      dayIdx = 0
    }
  }
}

// RNG utilities
function rand01(rng: Rng): number {
  rng.state = hashSeed(rng.state, 'rand')
  return (rng.state % 1000000) / 1000000
}

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rand01(rng) * (max - min + 1)) + min
}

function pick<T>(rng: Rng, array: T[]): T {
  return array[randInt(rng, 0, array.length - 1)]
}

function shuffleArray<T>(rng: Rng, array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i)
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}
