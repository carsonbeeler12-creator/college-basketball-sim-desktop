import { emptySeasonTotals, emptyTeamSeasonTotals, type SeasonTotals, type TeamSeasonTotals } from './seasonStats'

type AnyDynasty = any

export function ensureSeasonStats(dynasty: AnyDynasty) {
  dynasty.league.seasonStats ??= { teamsById: {}, playersById: {} }
  dynasty.league.seasonStats.teamsById ??= {}
  dynasty.league.seasonStats.playersById ??= {}
}

function addInto<T extends Record<string, number>>(target: T, add: Partial<T>) {
  for (const [k, v] of Object.entries(add)) {
    if (typeof v !== 'number') continue
    ;(target as any)[k] = ((target as any)[k] ?? 0) + v
  }
}

export function applyFinalGameToSeasonStats(dynasty: AnyDynasty, game: any) {
  if (!game?.result?.boxScore) return dynasty
  if (game.status !== 'FINAL') return dynasty

  ensureSeasonStats(dynasty)

  const { boxScore } = game.result
  const homeId = game.homeTeamId
  const awayId = game.awayTeamId

  const homeTeam: TeamSeasonTotals =
    dynasty.league.seasonStats.teamsById[homeId] ?? emptyTeamSeasonTotals()
  const awayTeam: TeamSeasonTotals =
    dynasty.league.seasonStats.teamsById[awayId] ?? emptyTeamSeasonTotals()

  const homePts = boxScore.teamStats.home.points
  const awayPts = boxScore.teamStats.away.points

  // Team totals
  addInto(homeTeam, { ...boxScore.teamStats.home, games: 1 })
  addInto(awayTeam, { ...boxScore.teamStats.away, games: 1 })

  homeTeam.pointsAllowed += awayPts
  awayTeam.pointsAllowed += homePts

  if (homePts > awayPts) {
    homeTeam.wins += 1
    awayTeam.losses += 1
  } else {
    awayTeam.wins += 1
    homeTeam.losses += 1
  }

  dynasty.league.seasonStats.teamsById[homeId] = homeTeam
  dynasty.league.seasonStats.teamsById[awayId] = awayTeam

  // Player totals
  const homeLines = boxScore.playerLinesByTeam.home ?? []
  const awayLines = boxScore.playerLinesByTeam.away ?? []

  for (const line of [...homeLines, ...awayLines]) {
    const pid = line.playerId
    const cur: SeasonTotals = dynasty.league.seasonStats.playersById[pid] ?? emptySeasonTotals()
    addInto(cur, { ...line, games: 1 })
    dynasty.league.seasonStats.playersById[pid] = cur
  }

  return dynasty
}
