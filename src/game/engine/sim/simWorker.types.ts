// Worker message types for high-performance simulation
import type { Dynasty, ID } from '../../types/dynasty'

export type SimDayRequest = {
  type: 'SIM_DAY'
  dynastySnapshot: {
    seed: number
    seasonYear: number
    day: number
    userTeamId: ID
    teamsById: Dynasty['league']['teamsById']
    playersById: Dynasty['playersById']
    gamesById: Dynasty['league']['gamesById']
    seasonStats: Dynasty['league']['seasonStats']
  }
  games: Array<{
    gameId: ID
    homeTeamId: ID
    awayTeamId: ID
    isConferenceGame: boolean
  }>
}

export type SimDayProgress = {
  type: 'PROGRESS'
  completed: number
  total: number
}

export type SimDayResult = {
  type: 'COMPLETE'
  updatedTeamsById: Dynasty['league']['teamsById']
  updatedPlayersById: Dynasty['playersById']
  newGamesById: Record<ID, Dynasty['league']['gamesById'][ID]>
  updatedSeasonStats: Dynasty['league']['seasonStats']
}

export type WorkerMessage = SimDayRequest
export type WorkerResponse = SimDayProgress | SimDayResult
