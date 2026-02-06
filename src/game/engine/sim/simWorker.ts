// High-performance worker for batch game simulation
import type { SimDayRequest, SimDayProgress, SimDayResult } from './simWorker.types'
import type { ID, PlayerBoxScoreLine, TeamBoxScoreLine, PlayerState, TeamState, GameState } from '../../types/dynasty'
import { emptySeasonTotals, emptyTeamSeasonTotals, type SeasonTotals, type TeamSeasonTotals } from '../stats/seasonStats'

// Lightweight RNG (same as existing)
type Rng = { state: number }

function rand01(rng: Rng): number {
  rng.state = (rng.state * 1664525 + 1013904223) >>> 0
  return rng.state / 4294967296
}

function randN01(rng: Rng): number {
  let s = 0
  for (let i = 0; i < 12; i++) s += rand01(rng)
  return s - 6
}

function randInt(rng: Rng, lo: number, hi: number): number {
  return Math.floor(rand01(rng) * (hi - lo + 1)) + lo
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

function ensureSeasonStats(snapshot: any) {
  snapshot.seasonStats ??= { teamsById: {}, playersById: {} }
  snapshot.seasonStats.teamsById ??= {}
  snapshot.seasonStats.playersById ??= {}
}

function addInto<T extends Record<string, number>>(target: T, add: Partial<T>) {
  for (const [k, v] of Object.entries(add)) {
    if (typeof v !== 'number') continue
    ;(target as any)[k] = ((target as any)[k] ?? 0) + v
  }
}

// Precomputed team data for fast simulation
type TeamSimData = {
  teamId: ID
  playerIds: ID[]
  pace: number
  offensiveRating: number
  defensiveRating: number
  threeRate: number
  ftRate: number
  reboundRate: number
  assistRate: number
  stealRate: number
  blockRate: number
  turnoverRate: number
  players: PlayerSimData[]
}

type PlayerSimData = {
  playerId: ID
  minutes: number
  minutesPct: number
  usage: number
  shooting: number
  shooting3: number
  shooting2: number
  freeThrow: number
  rebounding: number
  passing: number
  stealing: number
  blocking: number
  position: string
  overall: number
}

// Precompute all team and player data ONCE per sim day
function precomputeTeamData(
  teamId: ID,
  teamsById: Record<ID, TeamState>,
  playersById: Record<ID, PlayerState>,
  _seed: string,
  rng: Rng
): TeamSimData {
  const team = teamsById[teamId]
  if (!team) throw new Error(`Team ${teamId} not found`)

  const rosterIds = team.roster?.playerIds ?? []
  const players: PlayerSimData[] = []

  // Allocate minutes (simplified from allocateTeamMinutes)
  const availablePlayers = rosterIds
    .map(pid => playersById[pid])
    .filter(p => p && p.ratings?.overall)
    .sort((a, b) => (b.ratings.overall || 0) - (a.ratings.overall || 0))
    .slice(0, 10) // Top 10 players

  let totalMinutes = 0
  const minuteShares: number[] = []
  
  // Starters get more minutes
  for (let i = 0; i < Math.min(5, availablePlayers.length); i++) {
    const share = 32 + randN01(rng) * 3
    minuteShares.push(share)
    totalMinutes += share
  }
  
  // Bench players
  for (let i = 5; i < availablePlayers.length; i++) {
    const share = 15 + randN01(rng) * 5
    minuteShares.push(share)
    totalMinutes += share
  }

  // Normalize to 200 total minutes
  const scale = 200 / totalMinutes
  for (let i = 0; i < availablePlayers.length; i++) {
    const player = availablePlayers[i]
    const mins = Math.max(1, Math.round(minuteShares[i] * scale))
    const minsPct = mins / 200

    players.push({
      playerId: player.playerId,
      minutes: mins,
      minutesPct: minsPct,
      usage: (player.ratings.overall || 50) / 100, // Use overall as usage proxy
      shooting: (player.ratings.shooting2 + player.ratings.shooting3) / 2 || 50,
      shooting3: player.ratings.shooting3 || 50,
      shooting2: player.ratings.shooting2 || 50,
      freeThrow: player.ratings.freeThrow || 50,
      rebounding: (player.ratings.athleticism + player.ratings.strength) / 2 || 50, // Proxy for rebounding
      passing: player.ratings.passing || 50,
      stealing: player.ratings.steal || 50,
      blocking: player.ratings.block || 50,
      position: player.identity.position || 'G',
      overall: player.ratings.overall || 50,
    })
  }

  // Team-level ratings (average of top players)
  const topPlayers = players.slice(0, 5)
  const avgOverall = topPlayers.length > 0 
    ? topPlayers.reduce((sum, p) => sum + p.overall, 0) / topPlayers.length 
    : 50
  
  return {
    teamId,
    playerIds: players.map(p => p.playerId),
    pace: team.meta?.pace ?? 70,
    offensiveRating: avgOverall,
    defensiveRating: avgOverall,
    threeRate: 0.37 + randN01(rng) * 0.05,
    ftRate: 0.27,
    reboundRate: 0.50,
    assistRate: 0.55,
    stealRate: 0.08,
    blockRate: 0.05,
    turnoverRate: 0.13,
    players,
  }
}

// Macro simulation - compute team totals, then distribute to players
function simulateGameMacro(
  homeData: TeamSimData,
  awayData: TeamSimData,
  rng: Rng
): {
  homeScore: number
  awayScore: number
  homeLines: PlayerBoxScoreLine[]
  awayLines: PlayerBoxScoreLine[]
  homeTeamLine: TeamBoxScoreLine
  awayTeamLine: TeamBoxScoreLine
} {
  // 1. Compute possessions (with occasional "crazy" pace swings)
  const avgPace = (homeData.pace + awayData.pace) / 2
  const chaosRoll = rand01(rng)
  const chaosMult = chaosRoll < 0.08
    ? 1.12 + rand01(rng) * 0.08 // fast, high-pace game
    : chaosRoll > 0.92
      ? 0.86 + rand01(rng) * 0.06 // slow, grindy game
      : 1.0
  const possessions = Math.round((66 + avgPace * 0.16 + randN01(rng) * 6) * chaosMult)

  // 2. Compute points per possession based on offensive/defensive ratings
  const homeOffStrength = homeData.offensiveRating
  const homeDefStrength = homeData.defensiveRating
  const awayOffStrength = awayData.offensiveRating
  const awayDefStrength = awayData.defensiveRating

  const pppNoise = randN01(rng) * (chaosMult > 1 ? 0.12 : 0.09)
  const homePPP = clamp(0.98 + (homeOffStrength - awayDefStrength) * 0.006 + pppNoise, 0.75, 1.25)
  const awayPPP = clamp(0.98 + (awayOffStrength - homeDefStrength) * 0.006 + pppNoise, 0.75, 1.25)

  const homePointsRaw = possessions * homePPP
  const awayPointsRaw = possessions * awayPPP

  // 3. Compute team shooting attempts
  const homeFGA = Math.round(possessions * 0.92 + randN01(rng) * 4)
  const awayFGA = Math.round(possessions * 0.92 + randN01(rng) * 4)

  const homeTPA = Math.round(homeFGA * homeData.threeRate)
  const awayTPA = Math.round(awayFGA * awayData.threeRate)

  const home2PA = homeFGA - homeTPA
  const away2PA = awayFGA - awayTPA

  // 4. Determine makes to hit target points
  const homeTPM = clamp(Math.round(homeTPA * (0.33 + (homeOffStrength - 50) * 0.002)), 0, homeTPA)
  const awayTPM = clamp(Math.round(awayTPA * (0.33 + (awayOffStrength - 50) * 0.002)), 0, awayTPA)

  const homeFTA = Math.round(possessions * homeData.ftRate + randN01(rng) * 3)
  const awayFTA = Math.round(possessions * awayData.ftRate + randN01(rng) * 3)

  const homeFTM = Math.round(homeFTA * 0.70)
  const awayFTM = Math.round(awayFTA * 0.70)

  // Calculate 2PM to reach target score
  const homePointsFrom3 = homeTPM * 3
  const homePointsFromFT = homeFTM
  const homePointsNeeded = Math.round(homePointsRaw) - homePointsFrom3 - homePointsFromFT
  const home2PM = clamp(Math.round(homePointsNeeded / 2), 0, home2PA)

  const awayPointsFrom3 = awayTPM * 3
  const awayPointsFromFT = awayFTM
  const awayPointsNeeded = Math.round(awayPointsRaw) - awayPointsFrom3 - awayPointsFromFT
  const away2PM = clamp(Math.round(awayPointsNeeded / 2), 0, away2PA)

  const homeFGM = homeTPM + home2PM
  const awayFGM = awayTPM + away2PM

  const homeScore = homeTPM * 3 + home2PM * 2 + homeFTM
  const awayScore = awayTPM * 3 + away2PM * 2 + awayFTM

  // 5. Compute other team totals
  const homeRebSpike = rand01(rng) < 0.004 ? randInt(rng, 8, 18) : 0
  const awayRebSpike = rand01(rng) < 0.004 ? randInt(rng, 8, 18) : 0
  const homeReb = clamp(Math.round(40 + randN01(rng) * 5 + homeRebSpike), 28, 58)
  const awayReb = clamp(Math.round(40 + randN01(rng) * 5 + awayRebSpike), 28, 58)

  const homeAst = Math.round(homeFGM * homeData.assistRate)
  const awayAst = Math.round(awayFGM * awayData.assistRate)

  const homeStlSpike = rand01(rng) < 0.003 ? randInt(rng, 3, 7) : 0
  const awayStlSpike = rand01(rng) < 0.003 ? randInt(rng, 3, 7) : 0
  const homeStl = clamp(Math.round(possessions * homeData.stealRate + homeStlSpike), 4, homeStlSpike > 0 ? 18 : 14)
  const awayStl = clamp(Math.round(possessions * awayData.stealRate + awayStlSpike), 4, awayStlSpike > 0 ? 18 : 14)

  const homeBlkSpike = rand01(rng) < 0.003 ? randInt(rng, 3, 8) : 0
  const awayBlkSpike = rand01(rng) < 0.003 ? randInt(rng, 3, 8) : 0
  const homeBlk = clamp(Math.round(possessions * homeData.blockRate + homeBlkSpike), 1, homeBlkSpike > 0 ? 16 : 10)
  const awayBlk = clamp(Math.round(possessions * awayData.blockRate + awayBlkSpike), 1, awayBlkSpike > 0 ? 16 : 10)

  const homeTov = Math.round(possessions * homeData.turnoverRate)
  const awayTov = Math.round(possessions * awayData.turnoverRate)

  const homeFouls = Math.round(18 + randN01(rng) * 4)
  const awayFouls = Math.round(18 + randN01(rng) * 4)

  // 6. Distribute to players proportionally by minutes and usage
  const homeLines = distributeTeamStats(homeData, {
    points: homeScore,
    fgm: homeFGM,
    fga: homeFGA,
    tpm: homeTPM,
    tpa: homeTPA,
    ftm: homeFTM,
    fta: homeFTA,
    rebounds: homeReb,
    assists: homeAst,
    steals: homeStl,
    blocks: homeBlk,
    turnovers: homeTov,
    fouls: homeFouls,
  }, rng)

  const awayLines = distributeTeamStats(awayData, {
    points: awayScore,
    fgm: awayFGM,
    fga: awayFGA,
    tpm: awayTPM,
    tpa: awayTPA,
    ftm: awayFTM,
    fta: awayFTA,
    rebounds: awayReb,
    assists: awayAst,
    steals: awayStl,
    blocks: awayBlk,
    turnovers: awayTov,
    fouls: awayFouls,
  }, rng)

  return {
    homeScore,
    awayScore,
    homeLines,
    awayLines,
    homeTeamLine: computeTeamTotals(homeLines),
    awayTeamLine: computeTeamTotals(awayLines),
  }
}

function distributeTeamStats(
  teamData: TeamSimData,
  totals: {
    points: number
    fgm: number
    fga: number
    tpm: number
    tpa: number
    ftm: number
    fta: number
    rebounds: number
    assists: number
    steals: number
    blocks: number
    turnovers: number
    fouls: number
  },
  _rng: Rng
): PlayerBoxScoreLine[] {
  const lines: PlayerBoxScoreLine[] = []

  // Distribute proportionally by minutes and usage (slightly more concentrated for stars)
  const totalUsageWeight = teamData.players.reduce((sum, p) => sum + Math.pow(p.usage, 1.75) * p.minutesPct, 0)
  const safeUsageWeight = totalUsageWeight > 0 ? totalUsageWeight : 1

  const posRebMult: Record<string, number> = { PG: 0.60, SG: 0.70, SF: 0.95, PF: 1.35, C: 1.70, G: 0.65, F: 1.15 }
  const posAstMult: Record<string, number> = { PG: 1.35, SG: 0.90, SF: 0.85, PF: 0.70, C: 0.60, G: 1.15, F: 0.75 }
  const posStlMult: Record<string, number> = { PG: 1.25, SG: 1.20, SF: 1.05, PF: 0.90, C: 0.75, G: 1.20, F: 0.95 }
  const posBlkMult: Record<string, number> = { PG: 0.40, SG: 0.50, SF: 0.80, PF: 1.20, C: 1.60, G: 0.45, F: 1.00 }

  for (const player of teamData.players) {
    const share = (Math.pow(player.usage, 1.75) * player.minutesPct) / safeUsageWeight

    // Distribute shooting
    const fga = Math.round(totals.fga * share)
    const tpa = Math.round(totals.tpa * share)
    const fta = Math.round(totals.fta * share)

    const fgm = Math.round(fga * (0.40 + (player.shooting - 50) * 0.003))
    const tpm = Math.round(tpa * (0.32 + (player.shooting3 - 50) * 0.003))
    const ftm = Math.round(fta * (0.70 + (player.freeThrow - 50) * 0.003))

    const points = tpm * 3 + (fgm - tpm) * 2 + ftm

    // Other stats (position-weighted)
    const pos = player.position || 'G'
    const rebounds = Math.round(totals.rebounds * player.minutesPct * (player.rebounding / 50) * (posRebMult[pos] ?? 1))
    const assists = Math.round(totals.assists * player.minutesPct * (player.passing / 50) * (posAstMult[pos] ?? 1))
    const steals = Math.round(totals.steals * player.minutesPct * (player.stealing / 50) * (posStlMult[pos] ?? 1))
    const blocks = Math.round(totals.blocks * player.minutesPct * (player.blocking / 50) * (posBlkMult[pos] ?? 1))
    const turnovers = Math.round(totals.turnovers * share)
    const fouls = Math.round(totals.fouls * player.minutesPct)

    lines.push({
      playerId: player.playerId,
      minutes: player.minutes,
      points: Math.max(0, points),
      rebounds: Math.max(0, rebounds),
      assists: Math.max(0, assists),
      steals: Math.max(0, steals),
      blocks: Math.max(0, blocks),
      fgm: Math.max(0, fgm),
      fga: Math.max(0, fga),
      tpm: Math.max(0, tpm),
      tpa: Math.max(0, tpa),
      ftm: Math.max(0, ftm),
      fta: Math.max(0, fta),
      turnovers: Math.max(0, turnovers),
      fouls: Math.max(0, fouls),
    })
  }

  // Normalize to match team totals
  normalizeToTeamTotals(lines, totals)

  return lines
}

function normalizeToTeamTotals(
  lines: PlayerBoxScoreLine[],
  totals: {
    points: number
    fgm: number
    fga: number
    tpm: number
    tpa: number
    ftm: number
    fta: number
  }
) {
  // Adjust player stats to exactly match team totals
  const currentTotals = computeTeamTotals(lines)

  if (lines.length === 0) return
  
  // Adjust FGA first
  const fgaDiff = totals.fga - currentTotals.fga
  if (Math.abs(fgaDiff) > 0) {
    const topShooter = lines.reduce((max, l) => l.fga > max.fga ? l : max)
    topShooter.fga = Math.max(0, topShooter.fga + fgaDiff)
  }

  // Adjust TPA
  const tpaDiff = totals.tpa - currentTotals.tpa
  if (Math.abs(tpaDiff) > 0) {
    const topThreeShooter = lines.reduce((max, l) => l.tpa > max.tpa ? l : max)
    topThreeShooter.tpa = Math.max(0, topThreeShooter.tpa + tpaDiff)
  }

  // Adjust FTA
  const ftaDiff = totals.fta - currentTotals.fta
  if (Math.abs(ftaDiff) > 0) {
    const topFTShooter = lines.reduce((max, l) => l.fta > max.fta ? l : max)
    topFTShooter.fta = Math.max(0, topFTShooter.fta + ftaDiff)
  }

  // Recompute after adjusting attempts
  const updatedTotals = computeTeamTotals(lines)

  // Now adjust FGM, TPM, FTM to match targets
  const fgmDiff = totals.fgm - updatedTotals.fgm
  if (Math.abs(fgmDiff) > 0) {
    const topShooter = lines.reduce((max, l) => l.fgm > max.fgm ? l : max)
    topShooter.fgm = Math.max(0, Math.min(topShooter.fga, topShooter.fgm + fgmDiff))
  }

  const tpmDiff = totals.tpm - updatedTotals.tpm
  if (Math.abs(tpmDiff) > 0) {
    const topThreeShooter = lines.reduce((max, l) => l.tpm > max.tpm ? l : max)
    topThreeShooter.tpm = Math.max(0, Math.min(topThreeShooter.tpa, topThreeShooter.tpm + tpmDiff))
  }

  const ftmDiff = totals.ftm - updatedTotals.ftm
  if (Math.abs(ftmDiff) > 0) {
    const topFTShooter = lines.reduce((max, l) => l.ftm > max.ftm ? l : max)
    topFTShooter.ftm = Math.max(0, Math.min(topFTShooter.fta, topFTShooter.ftm + ftmDiff))
  }

  // Finally, recalculate points from the adjusted FG breakdown
  for (const line of lines) {
    line.points = line.tpm * 3 + (line.fgm - line.tpm) * 2 + line.ftm
  }
}

function computeTeamTotals(lines: PlayerBoxScoreLine[]): TeamBoxScoreLine {
  return {
    points: lines.reduce((s, l) => s + l.points, 0),
    rebounds: lines.reduce((s, l) => s + l.rebounds, 0),
    assists: lines.reduce((s, l) => s + l.assists, 0),
    steals: lines.reduce((s, l) => s + l.steals, 0),
    blocks: lines.reduce((s, l) => s + l.blocks, 0),
    fgm: lines.reduce((s, l) => s + l.fgm, 0),
    fga: lines.reduce((s, l) => s + l.fga, 0),
    tpm: lines.reduce((s, l) => s + l.tpm, 0),
    tpa: lines.reduce((s, l) => s + l.tpa, 0),
    ftm: lines.reduce((s, l) => s + l.ftm, 0),
    fta: lines.reduce((s, l) => s + l.fta, 0),
    turnovers: lines.reduce((s, l) => s + l.turnovers, 0),
    fouls: lines.reduce((s, l) => s + l.fouls, 0),
  }
}

// Main worker message handler
self.onmessage = (e: MessageEvent<SimDayRequest>) => {
  const req = e.data

  if (req.type !== 'SIM_DAY') return

  const { dynastySnapshot, games } = req

  ensureSeasonStats(dynastySnapshot)
  const seasonStats = dynastySnapshot.seasonStats as {
    teamsById: Record<ID, TeamSeasonTotals>
    playersById: Record<ID, SeasonTotals>
  }

  // Mutable local state - we'll commit immutable copies at the end
  const teamsById = { ...dynastySnapshot.teamsById }
  const playersById = { ...dynastySnapshot.playersById }
  const gamesById: Record<ID, GameState> = {}

  // Precompute all team data ONCE
  const teamDataCache = new Map<ID, TeamSimData>()
  const allTeamIds = new Set<ID>()
  for (const game of games) {
    allTeamIds.add(game.homeTeamId)
    allTeamIds.add(game.awayTeamId)
  }

  for (const teamId of allTeamIds) {
    const seedKey = `team_${teamId}_${dynastySnapshot.day}`
    const teamRng: Rng = { state: hashSeed(dynastySnapshot.seed, seedKey) }
    teamDataCache.set(teamId, precomputeTeamData(
      teamId,
      teamsById,
      playersById,
      seedKey,
      teamRng
    ))
  }

  // Simulate all games
  for (let i = 0; i < games.length; i++) {
    const game = games[i]
    const gameRng: Rng = { state: hashSeed(dynastySnapshot.seed, `game_${game.gameId}`) }

    const homeData = teamDataCache.get(game.homeTeamId)
    const awayData = teamDataCache.get(game.awayTeamId)

    if (!homeData || !awayData) {
      console.error(`Missing team data for game ${game.gameId}`)
      continue
    }

    const { homeScore, awayScore, homeLines, awayLines, homeTeamLine, awayTeamLine } = 
      simulateGameMacro(homeData, awayData, gameRng)

    // Create game result
    const gameState: GameState = {
      gameId: game.gameId,
      seasonYear: dynastySnapshot.seasonYear,
      day: dynastySnapshot.day,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      status: 'FINAL',
      result: {
        homeScore,
        awayScore,
        boxScore: {
          playerLinesByTeam: {
            home: homeLines,
            away: awayLines,
          },
          teamStats: {
            home: homeTeamLine,
            away: awayTeamLine,
          },
        },
      },
    }

    gamesById[game.gameId] = gameState

    // Update season totals for teams
    const homeId = game.homeTeamId
    const awayId = game.awayTeamId

    const homeTeamTotals: TeamSeasonTotals = seasonStats.teamsById[homeId] ?? emptyTeamSeasonTotals()
    const awayTeamTotals: TeamSeasonTotals = seasonStats.teamsById[awayId] ?? emptyTeamSeasonTotals()

    addInto(homeTeamTotals, { ...homeTeamLine, games: 1 })
    addInto(awayTeamTotals, { ...awayTeamLine, games: 1 })

    homeTeamTotals.pointsAllowed += awayScore
    awayTeamTotals.pointsAllowed += homeScore

    if (homeScore > awayScore) {
      homeTeamTotals.wins += 1
      awayTeamTotals.losses += 1
    } else {
      awayTeamTotals.wins += 1
      homeTeamTotals.losses += 1
    }

    seasonStats.teamsById[homeId] = homeTeamTotals
    seasonStats.teamsById[awayId] = awayTeamTotals

    // Update team records (mutate local copies)
    const homeWon = homeScore > awayScore
    const homeTeam = teamsById[game.homeTeamId]
    const awayTeam = teamsById[game.awayTeamId]

    if (homeTeam && homeTeam.season) {
      teamsById[game.homeTeamId] = {
        ...homeTeam,
        season: {
          ...homeTeam.season,
          wins: homeWon ? homeTeam.season.wins + 1 : homeTeam.season.wins,
          losses: homeWon ? homeTeam.season.losses : homeTeam.season.losses + 1,
          confWins: game.isConferenceGame && homeWon ? homeTeam.season.confWins + 1 : homeTeam.season.confWins,
          confLosses: game.isConferenceGame && !homeWon ? homeTeam.season.confLosses + 1 : homeTeam.season.confLosses,
        },
      }
    }

    if (awayTeam && awayTeam.season) {
      teamsById[game.awayTeamId] = {
        ...awayTeam,
        season: {
          ...awayTeam.season,
          wins: !homeWon ? awayTeam.season.wins + 1 : awayTeam.season.wins,
          losses: !homeWon ? awayTeam.season.losses : awayTeam.season.losses + 1,
          confWins: game.isConferenceGame && !homeWon ? awayTeam.season.confWins + 1 : awayTeam.season.confWins,
          confLosses: game.isConferenceGame && homeWon ? awayTeam.season.confLosses + 1 : awayTeam.season.confLosses,
        },
      }
    }

    // Update player season stats (mutate local copies)
    for (const line of [...homeLines, ...awayLines]) {
      const player = playersById[line.playerId]
      if (!player || player.stats.seasonYear !== dynastySnapshot.seasonYear) continue

      const cur: SeasonTotals = seasonStats.playersById[line.playerId] ?? emptySeasonTotals()
      addInto(cur, { ...line, games: 1 })
      seasonStats.playersById[line.playerId] = cur

      playersById[line.playerId] = {
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
      }
    }

    // Send progress every 10 games
    if ((i + 1) % 10 === 0 || i === games.length - 1) {
      const progress: SimDayProgress = {
        type: 'PROGRESS',
        completed: i + 1,
        total: games.length,
      }
      self.postMessage(progress)
    }
  }

  // Calculate team ratings based on games and season stats
  // This mirrors the calculateTeamRating logic from the main thread
  for (const [teamId, teamState] of Object.entries(teamsById)) {
    if (!teamState || !teamState.season) continue

    const wins = teamState.season.wins ?? 0
    const losses = teamState.season.losses ?? 0
    const totalGames = wins + losses

    if (totalGames === 0) {
      // No games played, default rating
      teamsById[teamId] = {
        ...teamState,
        season: {
          ...teamState.season,
          teamRating: 55,
        },
      }
      continue
    }

    // Win percentage (40% weight)
    const winPct = wins / totalGames

    // For the worker, we'll use a simplified rating calculation
    // since we don't have full access to all opponent data
    // The main thread will recalculate these properly later if needed
    
    // Basic rating: weighted by wins and games played
    const baseRating = 50 + (winPct - 0.5) * 20
    const gamesPlayedBoost = Math.min(10, totalGames * 0.5)
    const rating = Math.max(0, Math.min(100, Math.round(baseRating + gamesPlayedBoost)))

    teamsById[teamId] = {
      ...teamState,
      season: {
        ...teamState.season,
        teamRating: rating,
      },
    }
  }

  // Calculate team ratings based on games and season stats
  // This mirrors the calculateTeamRating logic from the main thread
  for (const [teamId, teamState] of Object.entries(teamsById)) {
    if (!teamState || !teamState.season) continue

    const wins = teamState.season.wins ?? 0
    const losses = teamState.season.losses ?? 0
    const totalGames = wins + losses

    if (totalGames === 0) {
      // No games played, default rating
      teamsById[teamId] = {
        ...teamState,
        season: {
          ...teamState.season,
          teamRating: 55,
        },
      }
      continue
    }

    // Win percentage (40% weight)
    const winPct = wins / totalGames

    // For the worker, we'll use a simplified rating calculation
    // since we don't have full access to all opponent data
    // The main thread will recalculate these properly later if needed
    
    // Basic rating: weighted by wins and games played
    const baseRating = 50 + (winPct - 0.5) * 20
    const gamesPlayedBoost = Math.min(10, totalGames * 0.5)
    const rating = Math.max(0, Math.min(100, Math.round(baseRating + gamesPlayedBoost)))

    teamsById[teamId] = {
      ...teamState,
      season: {
        ...teamState.season,
        teamRating: rating,
      },
    }
  }

  // Send final result
  const result: SimDayResult = {
    type: 'COMPLETE',
    updatedTeamsById: teamsById,
    updatedPlayersById: playersById,
    newGamesById: gamesById,
    updatedSeasonStats: seasonStats,
  }

  self.postMessage(result)
}
