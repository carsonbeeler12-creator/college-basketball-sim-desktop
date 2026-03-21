// High-performance simWeek using worker for batch simulation
import type { Dynasty, ID } from "../../types/dynasty"
import { simulateDayWithWorker, type SimProgress } from "./simDayWorker"
import { processCPURecruiting } from "../recruiting/cpuRecruiting"
import { generateConferenceTournaments } from "../tournament/generateConferenceTournaments"

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

/**
 * High-performance simWeek using Web Worker for batch game simulation.
 * Simulates 7 days (or until phase changes) of games.
 */
export async function simWeekFast(
  dynasty: Dynasty,
  onProgress?: (progress: SimProgress) => void
): Promise<{ dynasty: Dynasty; events: string[] }> {
  const userTeamId = dynasty.league.userTeamId as ID
  const events: string[] = []

  // Don't simulate if tournament is ready to start
  if (dynasty.world.phase === 'TOURNAMENT_READY') {
    events.push('🏀 Tournament is ready to start! Click "Start Tournament" to begin.')
    return { dynasty, events }
  }

  // Don't simulate if tournament is in progress
  if (dynasty.world.phase === 'POSTSEASON') {
    events.push('🏀 Tournament is in progress! Use the bracket screen to simulate tournament games.')
    return { dynasty, events }
  }

  let workingDynasty = dynasty
  const startingPhase = dynasty.world.phase
  let totalGamesSimulated = 0
  const DAYS_TO_SIM = 7

  // Simulate up to 7 days (or until phase changes)
  for (let dayOffset = 0; dayOffset < DAYS_TO_SIM; dayOffset++) {
    // Transition from PRESEASON to CONFERENCE when first game is played
    if (workingDynasty.world.phase === 'PRESEASON') {
      workingDynasty = {
        ...workingDynasty,
        world: {
          ...workingDynasty.world,
          phase: 'CONFERENCE',
        },
      }
      events.push('🏀 Regular season has begun!')
    }

    // Check if phase changed (season ended)
    if (workingDynasty.world.phase !== startingPhase && dayOffset > 0) {
      break
    }

    // Get all games for this day from the schedule
    const schedule = workingDynasty.league.schedule
    const currentDay = workingDynasty.world.day
    const gamesForDay = schedule?.gamesByDay?.[currentDay] ?? []

    if (gamesForDay.length === 0) {
      // No games scheduled for today, check if season is over
      // Check if all remaining days also have no games (season complete)
      const hasMoreGames = schedule && Object.entries(schedule.gamesByDay).some(([day, games]) => {
        return Number(day) > currentDay && games.length > 0
      })
      
      if (workingDynasty.world.phase === 'CONFERENCE' && !hasMoreGames) {
        const withBrackets = generateConferenceTournaments(workingDynasty)
        workingDynasty = {
          ...withBrackets,
          world: {
            ...withBrackets.world,
            phase: 'CONF_TOURNAMENT',
          },
        }
        events.push('🏀 Regular season complete! Conference tournaments are ready. Go to Conference Tournaments to sim.')
        break
      }

      // Advance day and continue
      workingDynasty = {
        ...workingDynasty,
        world: {
          ...workingDynasty.world,
          day: currentDay + 1,
        },
        rng: {
          ...workingDynasty.rng,
          state: hashSeed(workingDynasty.rng.seed, `advance_${workingDynasty.world.seasonYear}_${currentDay}`),
        },
      }
      continue
    }

    // Simulate all games for this day using worker
    const withGames = await simulateDayWithWorker(
      workingDynasty,
      gamesForDay.map(g => ({
        gameId: g.gameId,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        isConferenceGame: g.isConferenceGame,
      })),
      onProgress
    )

    totalGamesSimulated += gamesForDay.length

    // Process CPU recruiting
    let withRecruiting = withGames
    if (withGames.recruiting) {
      withRecruiting = processCPURecruiting(withGames)
    }

    // Clean up old games to prevent memory bloat
    // Keep ALL user-team games, and keep only the most recent 30 non-user games
    const allGames = Object.entries(withRecruiting.league.gamesById || {})
    if (allGames.length > 60) {
      const userGames: typeof allGames = []
      const otherGames: typeof allGames = []
      for (const entry of allGames) {
        const g = entry[1]
        const isUserGame = g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
        if (isUserGame) userGames.push(entry)
        else otherGames.push(entry)
      }
      // Sort others by day and keep latest 30
      otherGames.sort((a, b) => (a[1].day ?? 0) - (b[1].day ?? 0))
      const keptOthers = otherGames.slice(-30)
      withRecruiting.league.gamesById = Object.fromEntries([...userGames, ...keptOthers])
    }

    // Check if season should end (all scheduled games complete)
    const hasMoreGames = schedule && Object.entries(schedule.gamesByDay).some(([day, games]) => {
      return Number(day) > withRecruiting.world.day && games.length > 0
    })
    
    if (withRecruiting.world.phase === 'CONFERENCE' && !withRecruiting.league.tournament && !hasMoreGames) {
      const withBrackets = generateConferenceTournaments(withRecruiting)
      workingDynasty = {
        ...withBrackets,
        world: {
          ...withBrackets.world,
          phase: 'CONF_TOURNAMENT',
        },
      }
      events.push('🏀 Regular season complete! Conference tournaments are ready. Go to Conference Tournaments to sim.')
      break
    }

    // Advance day
    workingDynasty = {
      ...withRecruiting,
      world: {
        ...withRecruiting.world,
        day: currentDay + 1,
      },
      rng: {
        ...withRecruiting.rng,
        state: hashSeed(withRecruiting.rng.seed, `advance_${withRecruiting.world.seasonYear}_${currentDay}`),
      },
    }
  }

  if (totalGamesSimulated > 0) {
    events.push(`✅ Simulated ${totalGamesSimulated} games over ${Math.min(DAYS_TO_SIM, workingDynasty.world.day - dynasty.world.day)} days`)
  }

  const finalDynasty: Dynasty = {
    ...workingDynasty,
    lastSavedAtISO: new Date().toISOString(),
  }

  return { dynasty: finalDynasty, events }
}
