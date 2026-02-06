// Worker wrapper for calling from main app
import type { Dynasty, ID } from '../../types/dynasty'
import type { SimDayRequest, SimDayResult, SimDayProgress } from './simWorker.types'
import { updateAllTeamRatings } from '../ratings/calculateTeamRating'

export type SimProgress = {
  completed: number
  total: number
}

export async function simulateDayWithWorker(
  dynasty: Dynasty,
  games: Array<{
    gameId: ID
    homeTeamId: ID
    awayTeamId: ID
    isConferenceGame: boolean
  }>,
  onProgress?: (progress: SimProgress) => void
): Promise<Dynasty> {
  return new Promise((resolve, reject) => {
    // Create worker
    const worker = new Worker(
      new URL('./simWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data

      if (msg.type === 'PROGRESS') {
        const progressMsg = msg as SimDayProgress
        onProgress?.({
          completed: progressMsg.completed,
          total: progressMsg.total,
        })
      } else if (msg.type === 'COMPLETE') {
        const result = msg as SimDayResult

        // Merge results back into dynasty (single immutable update)
        let updated: Dynasty = {
          ...dynasty,
          lastSavedAtISO: new Date().toISOString(),
          league: {
            ...dynasty.league,
            teamsById: result.updatedTeamsById,
            gamesById: {
              ...dynasty.league.gamesById,
              ...result.newGamesById,
            },
            seasonStats: result.updatedSeasonStats,
          },
          playersById: result.updatedPlayersById,
        }

        // Apply proper rating calculations now that we have all the game data
        updated = updateAllTeamRatings(updated)

        worker.terminate()
        resolve(updated)
      }
    }

    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }

    // Send request
    const request: SimDayRequest = {
      type: 'SIM_DAY',
      dynastySnapshot: {
        seed: dynasty.rng.seed,
        seasonYear: dynasty.world.seasonYear,
        day: dynasty.world.day,
        userTeamId: dynasty.league.userTeamId,
        teamsById: dynasty.league.teamsById,
        playersById: dynasty.playersById,
        gamesById: dynasty.league.gamesById,
        seasonStats: dynasty.league.seasonStats,
      },
      games,
    }

    worker.postMessage(request)
  })
}
