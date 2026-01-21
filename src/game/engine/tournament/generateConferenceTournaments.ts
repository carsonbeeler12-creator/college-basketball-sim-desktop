// src/game/engine/tournament/generateConferenceTournaments.ts

import type { Dynasty, ID, ConferenceTournamentBracket, ConferenceTournamentGame } from '../../types/dynasty'
import { CONFERENCES } from '../../data/conferences'

export function generateConferenceTournaments(dynasty: Dynasty): Dynasty {
  const seasonYear = dynasty.world.seasonYear
  const teamsById = dynasty.league.teamsById
  const startDay = dynasty.world.day + 1

  const conferenceTournaments: Record<string, ConferenceTournamentBracket> = {}

  // Derive conferences from the league data to avoid empty brackets
  const groups = new Map<string, ID[]>()
  for (const team of Object.values(teamsById)) {
    const confId = (team.meta?.conferenceId as string | undefined) || 'independent'
    if (!groups.has(confId)) groups.set(confId, [])
    groups.get(confId)!.push(team.teamId)
  }

  const getConfMeta = (confId: string) => {
    const meta = CONFERENCES.find(c => c.id === confId)
    return { id: confId, name: meta?.name ?? `Conference ${confId.substring(0, 3).toUpperCase()} Tournament` }
  }

  for (const [confId, teamIds] of groups.entries()) {
    const confMeta = getConfMeta(confId)

    // Build standings for all teams in the conference
    const confTeams = teamIds
      .map(teamId => {
        const teamState = teamsById[teamId]
        if (!teamState) return null
        const confWins = teamState.season.confWins ?? 0
        const confLosses = teamState.season.confLosses ?? 0
        return {
          teamId,
          confWins,
          confLosses,
          winPct: confWins / Math.max(1, confWins + confLosses),
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b!.winPct !== a!.winPct) return b!.winPct - a!.winPct
        const aWins = teamsById[a!.teamId].season.wins ?? 0
        const bWins = teamsById[b!.teamId].season.wins ?? 0
        return bWins - aWins
      })

    if (confTeams.length < 2) continue

    // Include every team: build a full-field single-elimination bracket with byes up to next power of two
    const seededTeams = confTeams.map((t, idx) => ({ teamId: t!.teamId, seed: idx + 1 }))

    const bracketSize = nextPowerOfTwo(confTeams.length)
    const slots = seedSlots(bracketSize, seededTeams)

    const games: ConferenceTournamentGame[] = []
    let gameIdCounter = 0
    const getGameId = () => `conf_tournament_${confId}_${seasonYear}_${gameIdCounter++}` as ID

    let roundTeams = slots
    let roundIndex = 0
    let champion: ID | null = null
    let isFirstRound = true

    while (roundTeams.length > 1) {
      const roundName = getRoundName(roundTeams.length)
      const nextRoundTeams: Array<ID | null> = []
      
      for (let i = 0; i < roundTeams.length; i += 2) {
        const gameId = getGameId()
        let game: ConferenceTournamentGame
        
        if (isFirstRound) {
          // Only the first round has teams populated; all games have matchups
          const team1Id = roundTeams[i]
          const team2Id = roundTeams[i + 1] ?? null
          game = createGame(gameId, roundName, team1Id, team2Id, startDay + roundIndex)
          
          // Auto-advance on byes - but DON'T set winnerId on the game object
          if (team1Id && !team2Id) {
            nextRoundTeams.push(team1Id)
          } else if (!team1Id && team2Id) {
            nextRoundTeams.push(team2Id)
          } else if (team1Id && team2Id) {
            nextRoundTeams.push(null)
          } else {
            nextRoundTeams.push(null)
          }
        } else {
          // Future rounds: create empty games with no teams yet
          // Teams will be populated as winners advance
          game = createGame(gameId, roundName, null, null, startDay + roundIndex)
          nextRoundTeams.push(null)
        }
        
        games.push(game)
      }

      roundTeams = nextRoundTeams
      roundIndex += 1
      isFirstRound = false
    }

    conferenceTournaments[confId] = {
      conferenceId: confId,
      conferenceName: confMeta.name,
      seasonYear,
      teams: seededTeams,
      games,
      champion,
    }
  }

  return {
    ...dynasty,
    league: {
      ...dynasty.league,
      conferenceTournaments,
    },
  }
}

function nextPowerOfTwo(n: number): number {
  let size = 1
  while (size < n) size <<= 1
  return size
}

function seedSlots(size: number, seeds: Array<{ teamId: ID; seed: number }>): Array<ID | null> {
  const slots = new Array<ID | null>(size).fill(null)
  // Simple high-vs-low seeding: 1 vs size, 2 vs size-1, etc.
  for (let i = 0; i < size / 2; i++) {
    const highSeed = i + 1
    const lowSeed = size - i
    const highTeam = seeds[highSeed - 1]?.teamId ?? null
    const lowTeam = seeds[lowSeed - 1]?.teamId ?? null
    slots[i * 2] = highTeam
    slots[i * 2 + 1] = lowTeam
  }
  return slots
}

function getRoundName(teamCount: number): string {
  if (teamCount >= 64) return 'Round of 64'
  if (teamCount === 32) return 'Round of 32'
  if (teamCount === 16) return 'Round of 16'
  if (teamCount === 8) return 'Quarterfinals'
  if (teamCount === 4) return 'Semifinals'
  if (teamCount === 2) return 'Championship'
  return 'Opening Round'
}

function createGame(
  gameId: ID,
  round: string,
  team1Id: ID | null,
  team2Id: ID | null,
  day: number
): ConferenceTournamentGame {
  return {
    gameId,
    round,
    team1Id,
    team2Id,
    winnerId: null,
    score1: null,
    score2: null,
    day,
  }
}
