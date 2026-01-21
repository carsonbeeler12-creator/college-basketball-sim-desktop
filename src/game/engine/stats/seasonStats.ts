export type SeasonTotals = {
  games: number
  minutes: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  turnovers: number
  fouls: number
}

export type TeamSeasonTotals = SeasonTotals & {
  wins: number
  losses: number
  pointsAllowed: number
}

export function emptySeasonTotals(): SeasonTotals {
  return {
    games: 0,
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
  }
}

export function emptyTeamSeasonTotals(): TeamSeasonTotals {
  return { ...emptySeasonTotals(), wins: 0, losses: 0, pointsAllowed: 0 }
}
