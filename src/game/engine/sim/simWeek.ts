// sim-desktop/src/game/engine/sim/simWeek.ts
import type { Dynasty, ID } from "../../types/dynasty"
import { simulateGame } from "./simGame_v0"
import { applyFinalGameToSeasonStats } from "../stats/applyGameToSeasonStats"
import { processCPURecruiting } from "../recruiting/cpuRecruiting"
import { updateProgressForBoard } from "../recruiting/calculateProgress"

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

function makeGameId(d: Dynasty, scheduledGameId?: ID): ID {
  if (scheduledGameId) return scheduledGameId
  // Fallback: Deterministic game ID based on day and season
  const rngState = hashSeed(d.rng.seed, `gameid_${d.world.seasonYear}_${d.world.day}`)
  const suffix = (rngState % 0x1000000).toString(16).padStart(6, '0')
  return `game_${d.dynastyId}_${d.world.seasonYear}_${d.world.day}_${suffix}`
}

function pickOpponentTeamId(d: Dynasty): ID {
  const userTeamId = d.league.userTeamId as ID
  const allTeamIds = Object.keys(d.league.teamsById ?? {}) as ID[]
  const pool = allTeamIds.filter(tid => tid !== userTeamId)
  if (pool.length === 0) return userTeamId

  // Deterministic choice based on RNG state and day
  const rngState = hashSeed(d.rng.seed, `opponent_${d.world.seasonYear}_${d.world.day}`)
  const idx = rngState % pool.length
  return pool[idx]
}

/**
 * Gets the next scheduled game for the user's team on the current day or next available day.
 * Returns null if no scheduled game exists (fallback to random opponent).
 */
function getNextScheduledGame(dynasty: Dynasty): { homeTeamId: ID; awayTeamId: ID; gameId: ID; isConferenceGame: boolean; day: number } | null {
  const schedule = dynasty.league.schedule
  if (!schedule) return null

  const userTeamId = dynasty.league.userTeamId
  const currentDay = dynasty.world.day

  // Check current day first, then look ahead up to 7 days
  for (let day = currentDay; day <= currentDay + 7; day++) {
    const gamesOnDay = schedule.gamesByDay[day] ?? []
    const userGame = gamesOnDay.find(
      g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
    )
    
    if (userGame) {
      return {
        homeTeamId: userGame.homeTeamId,
        awayTeamId: userGame.awayTeamId,
        gameId: userGame.gameId,
        isConferenceGame: userGame.isConferenceGame,
        day: userGame.day,
      }
    }
  }

  return null
}

export function simWeek(dynasty: Dynasty): { dynasty: Dynasty; newGameId: ID; events: string[] } {
  const userTeamId = dynasty.league.userTeamId as ID
  const events: string[] = []

  // Don't simulate if tournament is ready to start
  if (dynasty.world.phase === 'TOURNAMENT_READY') {
    events.push('🏀 Tournament is ready to start! Click "Start Tournament" to begin.')
    // Don't advance day or modify dynasty state when tournament is ready
    return { dynasty, newGameId: '', events }
  }

  // Don't simulate if tournament is in progress
  if (dynasty.world.phase === 'POSTSEASON') {
    events.push('🏀 Tournament is in progress! Use the bracket screen to simulate tournament games.')
    // Don't advance day or modify dynasty state during tournament
    return { dynasty, newGameId: '', events }
  }

  // Transition from PRESEASON to CONFERENCE when first game is played
  let workingDynasty = dynasty
  if (dynasty.world.phase === 'PRESEASON') {
    workingDynasty = {
      ...dynasty,
      world: {
        ...dynasty.world,
        phase: 'CONFERENCE',
      },
    }
    events.push('🏀 Regular season has begun!')
  }

  // Try to get scheduled game, fallback to random opponent
  let homeTeamId: ID
  let awayTeamId: ID
  let gameId: ID
  let gameDay: number
  let isConferenceGame = false

  const scheduledGame = getNextScheduledGame(workingDynasty)
  
  // If we have a schedule object but no scheduled game found, fall back to random opponent
  // This prevents the season from ending prematurely if there are gaps in the schedule
  if (!scheduledGame && workingDynasty.league.schedule && workingDynasty.world.phase === 'CONFERENCE') {
    // Use fallback random opponent instead of ending season
    const oppTeamId = pickOpponentTeamId(workingDynasty)
    homeTeamId = workingDynasty.world.day % 14 === 0 ? userTeamId : oppTeamId
    awayTeamId = homeTeamId === userTeamId ? oppTeamId : userTeamId
    gameId = makeGameId(workingDynasty)
    gameDay = workingDynasty.world.day
    isConferenceGame = false // Random opponent games are non-conference
  }

  if (scheduledGame) {
    homeTeamId = scheduledGame.homeTeamId
    awayTeamId = scheduledGame.awayTeamId
    gameId = makeGameId(workingDynasty, scheduledGame.gameId)
    gameDay = scheduledGame.day
    isConferenceGame = scheduledGame.isConferenceGame
  } else {
    // Fallback: random opponent (for backward compatibility)
    const oppTeamId = pickOpponentTeamId(workingDynasty)
    homeTeamId = workingDynasty.world.day % 14 === 0 ? userTeamId : oppTeamId
    awayTeamId = homeTeamId === userTeamId ? oppTeamId : userTeamId
    gameId = makeGameId(workingDynasty)
    gameDay = workingDynasty.world.day
  }

  const { dynasty: withGame, homeScore, awayScore } = simulateGame({
    dynasty: workingDynasty,
    gameId,
    seasonYear: workingDynasty.world.seasonYear,
    day: gameDay,
    homeTeamId,
    awayTeamId,
  })

  // Get the game that was just simulated
  const game = withGame.league.gamesById?.[gameId]
  if (!game || !game.result) {
    throw new Error(`Game ${gameId} was not properly created`)
  }

  // Apply season stats to dynasty (updates league.seasonStats if it exists)
  let updated = applyFinalGameToSeasonStats(withGame, game)

  // Update team win/loss records in TeamState (including conference records)
  const homeTeam = updated.league.teamsById[homeTeamId]
  const awayTeam = updated.league.teamsById[awayTeamId]

  if (homeTeam && awayTeam) {
    const homeWon = homeScore > awayScore
    
    updated = {
      ...updated,
      league: {
        ...updated.league,
        teamsById: {
          ...updated.league.teamsById,
          [homeTeamId]: {
            ...homeTeam,
            season: {
              ...homeTeam.season,
              wins: homeWon ? homeTeam.season.wins + 1 : homeTeam.season.wins,
              losses: homeWon ? homeTeam.season.losses : homeTeam.season.losses + 1,
              confWins: isConferenceGame && homeWon ? homeTeam.season.confWins + 1 : homeTeam.season.confWins,
              confLosses: isConferenceGame && !homeWon ? homeTeam.season.confLosses + 1 : homeTeam.season.confLosses,
            },
          },
          [awayTeamId]: {
            ...awayTeam,
            season: {
              ...awayTeam.season,
              wins: !homeWon ? awayTeam.season.wins + 1 : awayTeam.season.wins,
              losses: !homeWon ? awayTeam.season.losses : awayTeam.season.losses + 1,
              confWins: isConferenceGame && !homeWon ? awayTeam.season.confWins + 1 : awayTeam.season.confWins,
              confLosses: isConferenceGame && homeWon ? awayTeam.season.confLosses + 1 : awayTeam.season.confLosses,
            },
          },
        },
      },
    }
  }

  // Update PlayerState.stats for all players who played
  const homeLines = game.result.boxScore?.playerLinesByTeam?.home ?? []
  const awayLines = game.result.boxScore?.playerLinesByTeam?.away ?? []

  let finalDynasty = updated
  for (const line of [...homeLines, ...awayLines]) {
    const player = finalDynasty.playersById[line.playerId]
    if (!player) continue

    // Only update stats if this is the current season
    if (player.stats.seasonYear === workingDynasty.world.seasonYear) {
      finalDynasty = {
        ...finalDynasty,
        playersById: {
          ...finalDynasty.playersById,
          [line.playerId]: {
            ...player,
            stats: {
              ...player.stats,
              gamesPlayed: player.stats.gamesPlayed + 1,
              minutes: player.stats.minutes + line.minutes,
              points: player.stats.points + line.points,
              rebounds: player.stats.rebounds + line.rebounds,
              assists: player.stats.assists + line.assists,
              steals: player.stats.steals + line.steals,
              blocks: player.stats.blocks + line.blocks,
              fgm: player.stats.fgm + line.fgm,
              fga: player.stats.fga + line.fga,
              tpm: player.stats.tpm + line.tpm,
              tpa: player.stats.tpa + line.tpa,
              ftm: player.stats.ftm + line.ftm,
              fta: player.stats.fta + line.fta,
              turnovers: player.stats.turnovers + line.turnovers,
              fouls: player.stats.fouls + line.fouls,
            },
          },
        },
      }
    }
  }

  // Process CPU recruiting (weekly - during season and preseason)
  let withCPURecruiting = finalDynasty
  if (finalDynasty.recruiting) {
    withCPURecruiting = processCPURecruiting(finalDynasty)

    // Update progress for user team (CPU teams are updated in processCPURecruiting)
    withCPURecruiting = updateProgressForBoard(withCPURecruiting, userTeamId)
  }

  // Simulate games for all CPU teams (one game per team per week)
  // This ensures maximum gameplay activity each sim week
  let cpuSimulatedDynasty = withCPURecruiting
  const allTeamIds = Object.keys(cpuSimulatedDynasty.league.teamsById ?? {}) as ID[]
  const cpuTeamIds = allTeamIds.filter(tid => tid !== userTeamId)
  
  events.push(`📊 Starting CPU game simulation with ${cpuTeamIds.length} teams`)
  
  // Track which teams already played this week to avoid duplicates
  const teamsPlayedThisWeek = new Set<ID>([userTeamId])
  const cpuGamesCount: number[] = []
  
  // Generate one game per CPU team (pair them off)
  for (let i = 0; i < cpuTeamIds.length; i++) {
    const cpuTeamId = cpuTeamIds[i]
    
    // Skip if this team already played
    if (teamsPlayedThisWeek.has(cpuTeamId)) continue
    
    // Pick an opponent that hasn't played yet
    let opponentTeamId: ID | null = null
    for (let j = i + 1; j < cpuTeamIds.length; j++) {
      const potentialOpponent = cpuTeamIds[j]
      if (!teamsPlayedThisWeek.has(potentialOpponent)) {
        opponentTeamId = potentialOpponent
        break
      }
    }
    
    // If no opponent found among remaining teams, try to find any unplayed team
    if (!opponentTeamId) {
      for (let j = 0; j < i; j++) {
        const potentialOpponent = cpuTeamIds[j]
        if (!teamsPlayedThisWeek.has(potentialOpponent)) {
          opponentTeamId = potentialOpponent
          break
        }
      }
    }
    
    // If still no opponent, this team doesn't play this week
    if (!opponentTeamId) continue
    
    // Alternate home/away based on RNG
    const homeAwayRng = hashSeed(cpuSimulatedDynasty.rng.seed, `homeaway_${cpuTeamId}_${cpuSimulatedDynasty.world.day}`)
    const isHome = homeAwayRng % 2 === 0
    const homeTeamId = isHome ? cpuTeamId : opponentTeamId
    const awayTeamId = isHome ? opponentTeamId : cpuTeamId
    
    // Generate deterministic game ID
    const gameIdRng = hashSeed(cpuSimulatedDynasty.rng.seed, `gameid_cpu_${homeTeamId}_${awayTeamId}_${cpuSimulatedDynasty.world.day}`)
    const gameIdSuffix = (gameIdRng % 0x1000000).toString(16).padStart(6, '0')
    const gameId = `cpu_game_${cpuSimulatedDynasty.world.day}_${gameIdSuffix}` as ID
    
    try {
      // Simulate CPU game
      const { dynasty: cpuGameResult } = simulateGame({
        dynasty: cpuSimulatedDynasty,
        gameId,
        seasonYear: cpuSimulatedDynasty.world.seasonYear,
        day: cpuSimulatedDynasty.world.day,
        homeTeamId,
        awayTeamId,
      })
      
      // Get the game that was just simulated
      const cpuGame = cpuGameResult.league.gamesById?.[gameId]
      if (!cpuGame || !cpuGame.result) {
        console.error(`CPU game ${gameId} was not properly created`)
        continue
      }
      
      // Apply season stats
      let cpuUpdated = applyFinalGameToSeasonStats(cpuGameResult, cpuGame)
      
      // Manually update team records (like we do for user team games)
      const homeTeamRec = cpuUpdated.league.teamsById[homeTeamId]
      const awayTeamRec = cpuUpdated.league.teamsById[awayTeamId]
      
      if (homeTeamRec && awayTeamRec) {
        const homeScore = cpuGame.result.homeScore
        const awayScore = cpuGame.result.awayScore
        const homeWon = homeScore > awayScore
        
        cpuUpdated = {
          ...cpuUpdated,
          league: {
            ...cpuUpdated.league,
            teamsById: {
              ...cpuUpdated.league.teamsById,
              [homeTeamId]: {
                ...homeTeamRec,
                season: {
                  ...homeTeamRec.season,
                  wins: homeWon ? homeTeamRec.season.wins + 1 : homeTeamRec.season.wins,
                  losses: homeWon ? homeTeamRec.season.losses : homeTeamRec.season.losses + 1,
                  confWins: homeTeamRec.season.confWins,
                  confLosses: homeTeamRec.season.confLosses,
                },
              },
              [awayTeamId]: {
                ...awayTeamRec,
                season: {
                  ...awayTeamRec.season,
                  wins: !homeWon ? awayTeamRec.season.wins + 1 : awayTeamRec.season.wins,
                  losses: !homeWon ? awayTeamRec.season.losses : awayTeamRec.season.losses + 1,
                  confWins: awayTeamRec.season.confWins,
                  confLosses: awayTeamRec.season.confLosses,
                },
              },
            },
          },
        }
      }
      
      // Update dynasty with game result
      cpuSimulatedDynasty = cpuUpdated
      cpuGamesCount.push(1)
      
      // Mark both teams as having played this week
      teamsPlayedThisWeek.add(homeTeamId)
      teamsPlayedThisWeek.add(awayTeamId)
    } catch (err) {
      console.error(`Error simulating CPU game between ${homeTeamId} and ${awayTeamId}:`, err)
      events.push(`⚠️ Error simulating game between teams`)
    }
  }
  
  // Log CPU games count for debugging
  events.push(`⚙️ Simulated ${cpuGamesCount.length} CPU games this week`)

  // Check if season should end and prepare for conference/National tournament (using updated dynasty with CPU games)
  let withTournamentAfterCPU = cpuSimulatedDynasty
  if (cpuSimulatedDynasty.world.phase === 'CONFERENCE' && !cpuSimulatedDynasty.league.tournament) {
    // Check if we've completed all scheduled games (day > 120 means season is over)
    // The schedule runs from day 1-120, so if we're past day 120, season is complete
    if (cpuSimulatedDynasty.world.day > 120) {
      // Season is over, transition to conference tournament phase
      // generateConferenceTournaments will be called from the UI when advancing
      withTournamentAfterCPU = {
        ...cpuSimulatedDynasty,
        world: {
          ...cpuSimulatedDynasty.world,
          phase: 'CONF_TOURNAMENT',
        },
      }
      events.push('🏀 Regular season complete! Conference tournaments are ready.')
    }
  }

  // Advance time: advance by 1 day (since each sim week is 1 day in the new system)
  const newDay = withTournamentAfterCPU.world.day + 1
  const finalUpdated: Dynasty = {
    ...withTournamentAfterCPU,
    lastSavedAtISO: new Date().toISOString(),
    world: {
      ...withTournamentAfterCPU.world,
      day: newDay,
    },
    rng: {
      ...withTournamentAfterCPU.rng,
      // Advance RNG state deterministically (use current day before increment)
      state: hashSeed(withTournamentAfterCPU.rng.seed, `advance_${withTournamentAfterCPU.world.seasonYear}_${withTournamentAfterCPU.world.day}`),
    },
  }

  return { dynasty: finalUpdated, newGameId: gameId, events }
}
