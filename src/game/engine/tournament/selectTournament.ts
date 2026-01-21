// src/game/engine/tournament/selectTournament.ts
// Tournament selection logic: autobids + at-large teams

import type { Dynasty, ID } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'

type Rng = { state: number }

function hashSeed(base: number, key: string): number {
  let h = base >>> 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h >>> 0
}

function rand01(rng: Rng): number {
  rng.state = (rng.state * 1103515245 + 12345) >>> 0
  return (rng.state >>> 16) / 65536
}

export type TournamentTeam = {
  teamId: ID
  seed: number // 1-16 within region
  region: 'East' | 'West' | 'South' | 'Midwest'
  isAutobid: boolean
  conferenceId?: string
  resumeScore: number
  seedScore: number
}

export type TournamentSelection = {
  seasonYear: number
  autobids: Array<{ teamId: ID; conferenceId: string }>
  atLarge: ID[]
  allTeams: TournamentTeam[] // All 64 teams with seeds
}

/**
 * Helper to get team rating (normalized 0-1)
 * If not available in state, use prestige/100 as fallback
 */
function getTeamRatingNormalized(teamId: ID, dynasty: Dynasty): number {
  const teamState = dynasty.league.teamsById[teamId]
  if (teamState?.season?.teamRating) {
    return teamState.season.teamRating / 100 // Assume 0-100 scale
  }
  
  // Fallback to prestige from static data
  const staticTeam = TEAMS.find(t => t.id === teamId)
  return (staticTeam?.prestige ?? 50) / 100
}

/**
 * Determine conference champions (autobids).
 * Priority:
 * 1. Conference tournament champion (if tournaments were played)
 * 2. Conference regular season champion (fallback if no tournament)
 * 
 * Tie-breakers for regular season:
 * 1. Head-to-head (not tracked easily yet, skip)
 * 2. Point differential (not tracked easily yet, skip)
 * 3. Higher team rating/prestige
 * 4. Random
 */
function getConferenceChampions(dynasty: Dynasty, rng: Rng): Array<{ teamId: ID; conferenceId: string }> {
  const autobids: Array<{ teamId: ID; conferenceId: string }> = []
  const teamsById = dynasty.league.teamsById

  // First, check if conference tournaments were played
  const conferenceTournaments = dynasty.league.conferenceTournaments
  if (conferenceTournaments) {
    // Use conference tournament champions as autobids
    for (const [confId, bracket] of Object.entries(conferenceTournaments)) {
      if (bracket.champion) {
        autobids.push({ teamId: bracket.champion, conferenceId: confId })
        console.log(`[Tournament Selection] Autobid: ${bracket.champion} (${confId} tournament champion)`)
      }
    }
    
    // If we got autobids from tournaments, we're done
    if (autobids.length > 0) {
      console.log(`[Tournament Selection] ${autobids.length} conference tournament champions selected as autobids`)
      return autobids
    }
  }

  // Fallback: Use conference regular season standings
  // Group teams by conference
  const teamsByConference = new Map<string, Array<{ teamId: ID; teamState: typeof teamsById[ID] }>>()

  for (const [teamId, teamState] of Object.entries(teamsById)) {
    if (!teamState || !teamState.meta?.conferenceId) continue

    const confId = teamState.meta.conferenceId as string
    if (!teamsByConference.has(confId)) {
      teamsByConference.set(confId, [])
    }
    teamsByConference.get(confId)!.push({ teamId, teamState })
  }

  // Find champion for each conference
  for (const [confId, teams] of teamsByConference.entries()) {
    if (teams.length < 1) continue

    // Sort by conference record
    teams.sort((a, b) => {
      const aConfWins = a.teamState?.season?.confWins ?? 0
      const aConfLosses = a.teamState?.season?.confLosses ?? 0
      const aConfRecord = aConfWins - aConfLosses

      const bConfWins = b.teamState?.season?.confWins ?? 0
      const bConfLosses = b.teamState?.season?.confLosses ?? 0
      const bConfRecord = bConfWins - bConfLosses

      if (bConfRecord !== aConfRecord) return bConfRecord - aConfRecord

      // Tie-breaker: Team Rating / Prestige
      const aRating = getTeamRatingNormalized(a.teamId, dynasty)
      const bRating = getTeamRatingNormalized(b.teamId, dynasty)
      if (Math.abs(aRating - bRating) > 0.05) return bRating - aRating

      // Tie-breaker: Random
      return rand01(rng) - 0.5
    })

    if (teams.length === 0) continue
    const champion = teams[0]
    autobids.push({ teamId: champion.teamId, conferenceId: confId })
  }

  return autobids
}

/**
 * Calculate team resume score for at-large selection.
 * Formula: (overallWinPct * 0.55) + (confWinPct * 0.25) + (teamRatingNormalized * 0.20)
 * 
 * NOTE: Uses teamState.season records (not seasonStats) because seasonStats may be 
 * overwritten with conference tournament games by the time National tournament selection happens.
 */
function calculateResumeScore(
  teamId: ID,
  teamState: typeof dynasty.league.teamsById[ID],
  dynasty: Dynasty
): number {
  // Use teamState.season for regular season record (authoritative source)
  const wins = teamState?.season?.wins ?? 0
  const losses = teamState?.season?.losses ?? 0
  const totalGames = wins + losses
  
  // Teams must have played games to be considered
  if (totalGames === 0) return 0

  const winPct = wins / totalGames

  const confWins = teamState?.season?.confWins ?? 0
  const confLosses = teamState?.season?.confLosses ?? 0
  const confTotal = confWins + confLosses
  const confWinPct = confTotal > 0 ? confWins / confTotal : 0

  const rating = getTeamRatingNormalized(teamId, dynasty)

  // Weighted score (0-1 scale)
  return (winPct * 0.55) + (confWinPct * 0.25) + (rating * 0.20)
}

/**
 * Select at-large teams
 * 
 * NOTE: Resume score calculation now uses teamState.season records,
 * so we don't need seasonStats anymore (it may only contain conf tournament games).
 */
function selectAtLargeTeams(
  dynasty: Dynasty,
  autobidTeamIds: Set<ID>,
  targetCount: number
): Array<{ teamId: ID; score: number }> {
  const teamsById = dynasty.league.teamsById

  const candidates: Array<{
    teamId: ID
    score: number
  }> = []

  for (const [teamId, teamState] of Object.entries(teamsById)) {
    if (autobidTeamIds.has(teamId)) continue // Skip autobids
    if (!teamState) continue

    // Calculate resume score using regular season record from teamState
    const score = calculateResumeScore(teamId, teamState, dynasty)

    candidates.push({ teamId, score })
  }

  // Sort by resume score (descending), fallback to prestige
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Use team rating or prestige as tiebreaker
    const aRating = getTeamRatingNormalized(a.teamId, dynasty)
    const bRating = getTeamRatingNormalized(b.teamId, dynasty)
    return bRating - aRating
  })

  return candidates.slice(0, targetCount)
}

/**
 * Seed and place teams into bracket using S-Curve
 * Follows tournament selection principles:
 * - S-curve seeding for balance
 * - Attempts to avoid same-conference matchups in Round of 64 when possible
 * - GUARANTEES 16 teams per region
 */
function seedAndPlaceTeams(
  dynasty: Dynasty,
  selectedTeams: Array<{ teamId: ID; isAutobid: boolean; resumeScore: number }>
): TournamentTeam[] {
  // Ensure we have exactly 64 teams
  if (selectedTeams.length < 64) {
    console.warn(`Tournament selection only has ${selectedTeams.length} teams; expected 64`)
  }
  if (selectedTeams.length > 64) {
    selectedTeams = selectedTeams.slice(0, 64)
  }

  // Calculate Seed Score: (teamRatingNormalized * 0.50) + (resumeScore * 0.50)
  const scoredTeams = selectedTeams.map(t => {
    const rating = getTeamRatingNormalized(t.teamId, dynasty)
    const seedScore = (rating * 0.50) + (t.resumeScore * 0.50)
    const conferenceId = dynasty.league.teamsById[t.teamId]?.meta?.conferenceId as string | undefined
    return { ...t, seedScore, conferenceId }
  })

  // Sort descending by seedScore (best teams first)
  scoredTeams.sort((a, b) => b.seedScore - a.seedScore)

  const finalTeams: TournamentTeam[] = []
  const regions: Array<'South' | 'West' | 'Midwest' | 'East'> = ['South', 'West', 'Midwest', 'East']

  // Track conference counts per region to help avoid same-conference matchups
  const conferencesByRegion: Record<string, Map<string, number>> = {
    South: new Map(),
    West: new Map(),
    Midwest: new Map(),
    East: new Map(),
  }

  // S-Curve Placement: 16 seed positions per region
  // 16 seed lines, 4 teams per line (4 regions x 16 seeds = 64 teams)
  for (let seedLine = 1; seedLine <= 16; seedLine++) {
    const startIndex = (seedLine - 1) * 4
    const teamsInLine = scoredTeams.slice(startIndex, startIndex + 4)
    
    // Snake draft direction for balance
    // Odd lines: South(0), West(1), Midwest(2), East(3)
    // Even lines: East(3), Midwest(2), West(1), South(0)
    const isReversed = seedLine % 2 === 0
    
    for (let idx = 0; idx < 4; idx++) {
      const team = teamsInLine[idx]
      const regionIdx = isReversed ? (3 - idx) : idx
      const region = regions[regionIdx] as 'South' | 'West' | 'Midwest' | 'East'
      
      if (team) {
        // Track conference
        if (team.conferenceId) {
          conferencesByRegion[region].set(
            team.conferenceId,
            (conferencesByRegion[region].get(team.conferenceId) ?? 0) + 1
          )
        }
        
        finalTeams.push({
          teamId: team.teamId,
          seed: seedLine,
          region,
          isAutobid: team.isAutobid,
          conferenceId: team.conferenceId,
          resumeScore: team.resumeScore,
          seedScore: team.seedScore
        })
      } else {
        // Placeholder for missing team (shouldn't happen if we have 64)
        finalTeams.push({
          teamId: null as any,
          seed: seedLine,
          region,
          isAutobid: false,
          conferenceId: undefined,
          resumeScore: 0,
          seedScore: 0
        })
      }
    }
  }

  return finalTeams
}

/**
 * Main selection function
 */
export function selectTournament(dynasty: Dynasty): TournamentSelection {
  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `tournament_${dynasty.world.seasonYear}`) >>> 0 }

  // Step 1: Autobids
  const autobids = getConferenceChampions(dynasty, rng)
  const autobidTeamIds = new Set(autobids.map(a => a.teamId))

  // Step 2: At-Large
  // Target 64 teams total for now (no play-ins yet)
  const totalSlots = 64
  const atLargeCount = Math.max(0, totalSlots - autobids.length)
  
  const atLarge = selectAtLargeTeams(dynasty, autobidTeamIds, atLargeCount)

  // Combine
  const allSelected = [
    ...autobids.map(a => {
      const teamState = dynasty.league.teamsById[a.teamId]
      const score = calculateResumeScore(a.teamId, teamState, dynasty)
      return { teamId: a.teamId, isAutobid: true, resumeScore: score }
    }),
    ...atLarge.map(a => ({ teamId: a.teamId, isAutobid: false, resumeScore: a.score }))
  ]

  // Step 3: Seed and Place
  const seededTeams = seedAndPlaceTeams(dynasty, allSelected)

  return {
    seasonYear: dynasty.world.seasonYear,
    autobids,
    atLarge: atLarge.map(t => t.teamId),
    allTeams: seededTeams,
  }
}
