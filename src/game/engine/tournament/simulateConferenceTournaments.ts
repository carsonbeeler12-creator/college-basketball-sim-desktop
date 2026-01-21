// src/game/engine/tournament/simulateConferenceTournaments.ts

import type { Dynasty, ID, ConferenceTournamentBracket } from '../../types/dynasty'
import { simulateGame } from '../sim/simGame_v0'
import { applyFinalGameToSeasonStats } from '../stats/applyGameToSeasonStats'

/**
 * Simulate all conference tournament games for a specific round.
 * Advances winners to next round automatically.
 */
export function simulateConferenceTournamentRound(
  dynasty: Dynasty,
  round: string
): Dynasty {
  const conferenceTournaments = dynasty.league.conferenceTournaments
  if (!conferenceTournaments) return dynasty

  let updatedDynasty = { ...dynasty }

  // Simulate games in each conference tournament
  for (const [confId, bracket] of Object.entries(conferenceTournaments)) {
    let updatedBracket = bracket
    
    // First, process all bye games (games where one team is missing)
    // This includes both auto-advance byes and partial bye games
    const byeGames = updatedBracket.games.filter(
      g => g.round === round && (!g.team1Id || !g.team2Id)
    )
    
    for (const byeGame of byeGames) {
      // If bye game already has a winner, advance it
      if (byeGame.winnerId) {
        updatedBracket = updateConferenceBracket(
          updatedBracket,
          byeGame.gameId,
          byeGame.winnerId,
          0,
          0
        )
      } else if (byeGame.team1Id && !byeGame.team2Id) {
        // Auto-advance team1 if team2 is missing
        updatedBracket = updateConferenceBracket(
          updatedBracket,
          byeGame.gameId,
          byeGame.team1Id,
          0,
          0
        )
      } else if (!byeGame.team1Id && byeGame.team2Id) {
        // Auto-advance team2 if team1 is missing
        updatedBracket = updateConferenceBracket(
          updatedBracket,
          byeGame.gameId,
          byeGame.team2Id,
          0,
          0
        )
      }
    }
    
    // Then simulate actual games
    const roundGames = updatedBracket.games.filter(
      g => g.round === round && g.team1Id && g.team2Id && !g.winnerId
    )

    for (const game of roundGames) {
      const { dynasty: newDynasty, winnerId, homeScore, awayScore } = simulateConferenceTournamentGame(
        updatedDynasty,
        game
      )

      updatedDynasty = newDynasty

      // Update game with results
      updatedBracket = updateConferenceBracket(
        updatedBracket,
        game.gameId,
        winnerId,
        homeScore,
        awayScore
      )
    }

    updatedDynasty = {
      ...updatedDynasty,
      league: {
        ...updatedDynasty.league,
        conferenceTournaments: {
          ...updatedDynasty.league.conferenceTournaments!,
          [confId]: updatedBracket,
        },
      },
    }
  }

  return updatedDynasty
}

/**
 * Simulate a single conference tournament game
 */
function simulateConferenceTournamentGame(
  dynasty: Dynasty,
  game: { gameId: ID; team1Id: ID | null; team2Id: ID | null; day: number }
): { dynasty: Dynasty; winnerId: ID; homeScore: number; awayScore: number } {
  if (!game.team1Id || !game.team2Id) {
    throw new Error(`Cannot simulate game ${game.gameId}: missing teams`)
  }

  // Neutral site game - use team1 as "home" for simulation
  const { dynasty: updated, homeScore, awayScore } = simulateGame({
    dynasty,
    gameId: game.gameId,
    seasonYear: dynasty.world.seasonYear,
    day: game.day,
    homeTeamId: game.team1Id,
    awayTeamId: game.team2Id,
  })

  // Apply stats
  const gameState = updated.league.gamesById[game.gameId]
  const withStats = applyFinalGameToSeasonStats(updated, gameState)

  // Determine winner
  const winnerId = homeScore > awayScore ? game.team1Id : game.team2Id

  return {
    dynasty: withStats,
    winnerId,
    homeScore,
    awayScore,
  }
}

/**
 * Update conference bracket with game result and advance winner
 */
function updateConferenceBracket(
  bracket: ConferenceTournamentBracket,
  gameId: ID,
  winnerId: ID,
  homeScore: number,
  awayScore: number
): ConferenceTournamentBracket {
  const updatedGames = bracket.games.map(g => {
    if (g.gameId === gameId) {
      return {
        ...g,
        winnerId,
        score1: homeScore,
        score2: awayScore,
      }
    }
    return g
  })

  // Find the game that was just played
  const gameIndex = bracket.games.findIndex(g => g.gameId === gameId)
  if (gameIndex === -1) return bracket

  const completedGame = bracket.games[gameIndex]

  // Advance winner to next round
  const rounds = orderRounds(updatedGames)
  const currentRoundIndex = rounds.findIndex(r => r === completedGame.round)
  if (currentRoundIndex === -1) {
    return {
      ...bracket,
      games: updatedGames,
    }
  }

  const currentRoundGames = updatedGames
    .filter(g => g.round === completedGame.round)
    .sort(roundSort)

  const gameIndexInRound = currentRoundGames.findIndex(g => g.gameId === gameId)

  // Advance to next round if one exists
  if (currentRoundIndex < rounds.length - 1) {
    const nextRound = rounds[currentRoundIndex + 1]
    const nextRoundGames = updatedGames
      .filter(g => g.round === nextRound)
      .sort(roundSort)

    const targetIndex = Math.floor(gameIndexInRound / 2)
    if (targetIndex < nextRoundGames.length) {
      const targetGame = nextRoundGames[targetIndex]
      const slot = gameIndexInRound % 2 === 0 ? 'team1Id' : 'team2Id'
      
      // Create new array instead of mutating
      const finalGames = updatedGames.map(g => {
        if (g.gameId === targetGame.gameId) {
          return {
            ...targetGame,
            [slot]: winnerId,
          }
        }
        return g
      })
      
      return {
        ...bracket,
        games: finalGames,
      }
    }
    
    // If we couldn't find a target game in the next round, treat this as the championship
    return {
      ...bracket,
      games: updatedGames,
      champion: winnerId,
    }
  } else {
    // Final round - set the champion
    return {
      ...bracket,
      games: updatedGames,
      champion: winnerId,
    }
  }
}

/**
 * Simulate all remaining conference tournaments completely
 */
export function simulateAllConferenceTournaments(dynasty: Dynasty): Dynasty {
  let updated = dynasty

  // Determine round order from the first bracket present
  const firstBracket = Object.values(updated.league.conferenceTournaments ?? {})[0]
  if (!firstBracket) return updated

  const rounds = orderRounds(firstBracket.games)
  for (const round of rounds) {
    updated = simulateConferenceTournamentRound(updated, round)
  }

  return updated
}

function orderRounds(games: ConferenceTournamentBracket['games']): string[] {
  const rounds = Array.from(new Set(games.map(g => g.round)))
  rounds.sort((a, b) => minDayForRound(games, a) - minDayForRound(games, b))
  return rounds
}

function minDayForRound(games: ConferenceTournamentBracket['games'], round: string): number {
  return Math.min(...games.filter(g => g.round === round).map(g => g.day))
}

function roundSort(a: { day: number; gameId: ID }, b: { day: number; gameId: ID }) {
  if (a.day !== b.day) return a.day - b.day
  return String(a.gameId).localeCompare(String(b.gameId))
}
