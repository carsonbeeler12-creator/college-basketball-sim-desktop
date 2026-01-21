// src/game/engine/tournament/generateBracket.ts
// Bracket generation: places teams in 4 regions with proper seeding

import type { ID } from '../../types/dynasty'
import type { TournamentSelection } from './selectTournament'

export type BracketGame = {
  gameId: ID
  round:
    | 'First Four'
    | 'Round of 64'
    | 'Round of 32'
    | 'Round of 16'
    | 'Quarter-Finals'
    | 'Semi-Finals'
    | 'Championship'
  region?: 'East' | 'West' | 'South' | 'Midwest' // Not applicable for Semifinals/Championship
  gameNumber: number // Within the round (stable ordering key)
  team1Id: ID | null // null = TBD
  team2Id: ID | null
  winnerId: ID | null // null = not played yet
  score1: number | null
  score2: number | null
  day: number // Day of season when game is played
}

export type TournamentBracket = {
  seasonYear: number
  selection: TournamentSelection
  games: BracketGame[]
  regions: {
    East: BracketGame[]
    West: BracketGame[]
    South: BracketGame[]
    Midwest: BracketGame[]
  }
}

/**
 * Standard National Tournament Round of 64 matchups by seed line
 */
const ROUND_OF_64_MATCHUPS: Array<[number, number]> = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
]

/**
 * Generate the full tournament bracket structure.
 * Places teams in proper matchups based on seeding.
 */
export function generateBracket(selection: TournamentSelection, startDay: number): TournamentBracket {
  const games: BracketGame[] = []
  let gameIdCounter = 0
  let currentDay = startDay

  const getNextGameId = (): ID => `tournament_${selection.seasonYear}_${gameIdCounter++}`

  // Group teams by region and sort by seed
  const teamsByRegion = {
    East: selection.allTeams.filter(t => t.region === 'East').sort((a, b) => a.seed - b.seed),
    West: selection.allTeams.filter(t => t.region === 'West').sort((a, b) => a.seed - b.seed),
    South: selection.allTeams.filter(t => t.region === 'South').sort((a, b) => a.seed - b.seed),
    Midwest: selection.allTeams.filter(t => t.region === 'Midwest').sort((a, b) => a.seed - b.seed),
  }

  // Validate we have 16 teams per region
  for (const region of ['East', 'West', 'South', 'Midwest'] as const) {
    if (teamsByRegion[region].length !== 16) {
      console.warn(`Region ${region} has ${teamsByRegion[region].length} teams instead of 16`)
    }
  }

  // Round of 64: 32 games (8 per region)
  const regions: Array<'East' | 'West' | 'South' | 'Midwest'> = ['East', 'West', 'South', 'Midwest']

  for (const region of regions) {
    const teams = teamsByRegion[region]
    if (teams.length === 0) {
      console.warn(`Region ${region} has no teams; skipping Round of 64 for this region`)
      continue
    }

    // Pad teams if needed (shouldn't happen if selection is correct)
    while (teams.length < 16) {
      console.warn(`Region ${region} has only ${teams.length} teams; padding with empty slots`)
      teams.push({ teamId: null as any, seed: teams.length + 1, region } as any)
    }

    for (let i = 0; i < ROUND_OF_64_MATCHUPS.length; i++) {
      const [seed1, seed2] = ROUND_OF_64_MATCHUPS[i]
      const team1 = teams.find(t => t.seed === seed1)
      const team2 = teams.find(t => t.seed === seed2)

      if (!team1 || !team2) {
        console.warn(`Missing team for matchup ${seed1} vs ${seed2} in ${region}`)
      }

      const game: BracketGame = {
        gameId: getNextGameId(),
        round: 'Round of 64',
        region,
        gameNumber: i, // IMPORTANT: 0..7 stable ordering
        team1Id: team1?.teamId ?? null,
        team2Id: team2?.teamId ?? null,
        winnerId: null,
        score1: null,
        score2: null,
        day: currentDay + (region === 'East' ? 0 : region === 'West' ? 1 : region === 'South' ? 2 : 3),
      }

      games.push(game)
    }
  }

  currentDay += 4

  // Round of 32: 16 games (4 per region)
  for (const region of regions) {
    for (let i = 0; i < 4; i++) {
      games.push({
        gameId: getNextGameId(),
        round: 'Round of 32',
        region,
        gameNumber: i, // 0..3
        team1Id: null,
        team2Id: null,
        winnerId: null,
        score1: null,
        score2: null,
        day: currentDay + (region === 'East' ? 0 : region === 'West' ? 1 : region === 'South' ? 2 : 3),
      })
    }
  }

  currentDay += 4

  // Round of 16: 8 games (2 per region)
  for (const region of regions) {
    for (let i = 0; i < 2; i++) {
      games.push({
        gameId: getNextGameId(),
        round: 'Round of 16',
        region,
        gameNumber: i, // 0..1
        team1Id: null,
        team2Id: null,
        winnerId: null,
        score1: null,
        score2: null,
        day: currentDay + (region === 'East' ? 0 : region === 'West' ? 1 : region === 'South' ? 2 : 3),
      })
    }
  }

  currentDay += 4

  // Quarter-Finals: 4 games (1 per region)
  for (const region of regions) {
    games.push({
      gameId: getNextGameId(),
      round: 'Quarter-Finals',
      region,
      gameNumber: 0,
      team1Id: null,
      team2Id: null,
      winnerId: null,
      score1: null,
      score2: null,
      day: currentDay + (region === 'East' ? 0 : region === 'West' ? 1 : region === 'South' ? 2 : 3),
    })
  }

  currentDay += 2

  // Semi-Finals: 2 games (National Semifinals)
  for (let i = 0; i < 2; i++) {
    games.push({
      gameId: getNextGameId(),
      round: 'Semi-Finals',
      gameNumber: i,
      team1Id: null,
      team2Id: null,
      winnerId: null,
      score1: null,
      score2: null,
      day: currentDay + i,
    })
  }

  currentDay += 2

  // Championship: 1 game
  games.push({
    gameId: getNextGameId(),
    round: 'Championship',
    gameNumber: 0,
    team1Id: null,
    team2Id: null,
    winnerId: null,
    score1: null,
    score2: null,
    day: currentDay,
  })

  return {
    seasonYear: selection.seasonYear,
    selection,
    games,
    regions: {
      East: games.filter(g => g.region === 'East'),
      West: games.filter(g => g.region === 'West'),
      South: games.filter(g => g.region === 'South'),
      Midwest: games.filter(g => g.region === 'Midwest'),
    },
  }
}

/**
 * Get the next game in a bracket path (for advancing winners).
 * NOTE: Your sim engine should call this after each completed game and assign the winner into the next game slot.
 */
export function getNextGameForWinner(bracket: TournamentBracket, gameId: ID): BracketGame | null {
  const game = bracket.games.find(g => g.gameId === gameId)
  if (!game) return null

  if (game.round === 'Round of 64') {
    const regionGames = bracket.regions[game.region!]
    const next = regionGames
      .filter(g => g.round === 'Round of 32')
      .sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0))

    const idx = Math.floor((game.gameNumber ?? 0) / 2)
    return next[idx] ?? null
  }

  if (game.round === 'Round of 32') {
    const regionGames = bracket.regions[game.region!]
    const next = regionGames
      .filter(g => g.round === 'Round of 16')
      .sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0))

    const idx = Math.floor((game.gameNumber ?? 0) / 2)
    return next[idx] ?? null
  }

  if (game.round === 'Round of 16') {
    const regionGames = bracket.regions[game.region!]
    const next = regionGames.find(g => g.round === 'Quarter-Finals')
    return next ?? null
  }

  if (game.round === 'Quarter-Finals') {
    const semis = bracket.games
      .filter(g => g.round === 'Semi-Finals')
      .sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0))

    // East+West feed Semi 0, South+Midwest feed Semi 1
    const regionIndex = ['East', 'West', 'South', 'Midwest'].indexOf(game.region!)
    const semiIndex = regionIndex < 2 ? 0 : 1
    return semis[semiIndex] ?? null
  }

  if (game.round === 'Semi-Finals') {
    return bracket.games.find(g => g.round === 'Championship') ?? null
  }

  return null
}
