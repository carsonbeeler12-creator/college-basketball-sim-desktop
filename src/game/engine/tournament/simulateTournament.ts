// src/game/engine/tournament/simulateTournament.ts
// Tournament simulation: simulates games and advances winners

import type { Dynasty, ID } from '../../types/dynasty'
import type { TournamentBracket, BracketGame } from './generateBracket'
import { getNextGameForWinner } from './generateBracket'
import { simulateGame } from '../sim/simGame_v0'
import { applyFinalGameToSeasonStats } from '../stats/applyGameToSeasonStats'

/**
 * Simulate a single tournament game.
 */
export function simulateTournamentGame(
  dynasty: Dynasty,
  game: BracketGame,
  seasonYear: number,
  day: number
): { dynasty: Dynasty; winnerId: ID; homeScore: number; awayScore: number } {
  if (!game.team1Id || !game.team2Id) {
    throw new Error(`Cannot simulate game ${game.gameId}: missing teams`)
  }

  // Tournament games are neutral site, but we need to pick a "home" team
  // Use higher seed as "home" (lower seed number = better)
  // const team1 = dynasty.league.teamsById[game.team1Id]
  // const team2 = dynasty.league.teamsById[game.team2Id]
  
  // For simplicity, use team1 as home
  const { dynasty: updated, homeScore, awayScore } = simulateGame({
    dynasty,
    gameId: game.gameId,
    seasonYear,
    day,
    homeTeamId: game.team1Id,
    awayTeamId: game.team2Id,
  })

  // Apply stats
  const gameState = updated.league.gamesById[game.gameId]
  const withStats = applyFinalGameToSeasonStats(updated, gameState)

  // Determine winner (team1 is "home" in simulation)
  const winnerId = homeScore > awayScore ? game.team1Id : game.team2Id
  // const loserId = homeScore > awayScore ? game.team2Id : game.team1Id
  const winnerScore = homeScore > awayScore ? homeScore : awayScore
  const loserScore = homeScore > awayScore ? awayScore : homeScore

  return { 
    dynasty: withStats, 
    winnerId, 
    homeScore: winnerScore, // Winner's score
    awayScore: loserScore,   // Loser's score
  }
}

/**
 * Advance a winner to the next round.
 */
function advanceWinner(
  bracket: TournamentBracket,
  gameId: ID,
  winnerId: ID
): TournamentBracket {
  const game = bracket.games.find(g => g.gameId === gameId)
  if (!game) return bracket

  // Note: scores should already be set by the calling function
  // This function just needs to advance the winner to the next game
  const updatedGames = [...bracket.games]

  // Find next game and set winner as one of the teams
  const nextGame = getNextGameForWinner(bracket, gameId)
  if (nextGame) {
    const nextGameIndex = updatedGames.findIndex(g => g.gameId === nextGame.gameId)
    if (nextGameIndex >= 0) {
      // Determine which slot (team1 or team2) based on bracket position
      if (!updatedGames[nextGameIndex].team1Id) {
        updatedGames[nextGameIndex] = {
          ...updatedGames[nextGameIndex],
          team1Id: winnerId,
        }
      } else if (!updatedGames[nextGameIndex].team2Id) {
        updatedGames[nextGameIndex] = {
          ...updatedGames[nextGameIndex],
          team2Id: winnerId,
        }
      }
    }
  }

  // Ensure regions are recalculated from all games (preserves Round of 64)
  const updatedBracket: TournamentBracket = {
    ...bracket,
    games: updatedGames,
    regions: {
      East: updatedGames.filter(g => g.region === 'East'),
      West: updatedGames.filter(g => g.region === 'West'),
      South: updatedGames.filter(g => g.region === 'South'),
      Midwest: updatedGames.filter(g => g.region === 'Midwest'),
    },
  }

  return updatedBracket
}

/**
 * Simulate a single round of the tournament.
 * Returns updated dynasty and bracket.
 */
export function simulateTournamentRound(
  dynasty: Dynasty,
  bracket: TournamentBracket,
  round: BracketGame['round'],
  startDay: number
): { dynasty: Dynasty; bracket: TournamentBracket; gamesPlayed: number } {
  const roundGames = bracket.games.filter(g => g.round === round && !g.winnerId && g.team1Id && g.team2Id)
  let currentDay = startDay
  let updatedDynasty = dynasty
  let updatedBracket = bracket
  let gamesPlayed = 0

  for (const game of roundGames) {
    const { dynasty: newDynasty, winnerId, homeScore, awayScore } = simulateTournamentGame(
      updatedDynasty,
      game,
      dynasty.world.seasonYear,
      currentDay
    )

    // Update game with result - create new array to avoid mutation
    // Note: homeScore is winner's score, awayScore is loser's score
    const team1Score = game.team1Id === winnerId ? homeScore : awayScore
    const team2Score = game.team2Id === winnerId ? homeScore : awayScore
    
    const updatedGames = updatedBracket.games.map(g => {
      if (g.gameId === game.gameId) {
        return {
          ...g,
          winnerId,
          score1: team1Score,
          score2: team2Score,
        }
      }
      return g
    })
    
    // Update bracket with new games array
    updatedBracket = {
      ...updatedBracket,
      games: updatedGames,
      regions: {
        East: updatedGames.filter(g => g.region === 'East'),
        West: updatedGames.filter(g => g.region === 'West'),
        South: updatedGames.filter(g => g.region === 'South'),
        Midwest: updatedGames.filter(g => g.region === 'Midwest'),
      },
    }

    // Advance winner to next round
    updatedBracket = advanceWinner(updatedBracket, game.gameId, winnerId)

    updatedDynasty = newDynasty
    currentDay++
    gamesPlayed++
  }

  return { dynasty: updatedDynasty, bracket: updatedBracket, gamesPlayed }
}

/**
 * Simulate the entire tournament.
 */
export function simulateFullTournament(
  dynasty: Dynasty,
  bracket: TournamentBracket,
  startDay: number
): { dynasty: Dynasty; bracket: TournamentBracket } {
  let updatedDynasty = dynasty
  let updatedBracket = bracket
  let currentDay = startDay

  const rounds: BracketGame['round'][] = [
    'Round of 64',
    'Round of 32',
    'Round of 16',
    'Quarter-Finals',
    'Semi-Finals',
    'Championship',
  ]

  for (const round of rounds) {
    const { dynasty: newDynasty, bracket: newBracket, gamesPlayed } = simulateTournamentRound(
      updatedDynasty,
      updatedBracket,
      round,
      currentDay
    )
    updatedDynasty = newDynasty
    updatedBracket = newBracket
    currentDay += gamesPlayed
  }

  return { dynasty: updatedDynasty, bracket: updatedBracket }
}
