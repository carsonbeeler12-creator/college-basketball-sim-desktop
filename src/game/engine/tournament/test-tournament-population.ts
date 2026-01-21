// Test to verify tournament bracket gets populated with team names
import { initializeTournament } from './initializeTournament'
import type { Dynasty } from '../../types/dynasty'

// Mock dynasty data for testing
const mockDynasty: Dynasty = {
  saveVersion: 3,
  dynastyId: 'test-dynasty',
  createdAtISO: new Date().toISOString(),
  lastSavedAtISO: new Date().toISOString(),
  coach: {
    coachId: 'coach-1',
    name: 'Test Coach',
  },
  world: {
    seasonYear: 2024,
    day: 140, // End of regular season
    phase: 'TOURNAMENT_READY',
  },
  league: {
    userTeamId: 'team-1',
    teamsById: {
      'team-1': {
        teamId: 'team-1',
        name: 'Test Team 1',
        season: { wins: 20, losses: 10, confWins: 12, confLosses: 6 },
        roster: { playerIds: [], redshirtedPlayerIds: [] },
        rotation: {
          minutesTargetByPlayerId: {},
          depthChart: { PG: [], SG: [], SF: [], PF: [], C: [] },
          settings: { style: 'NORMAL', rotationSizeTarget: 8.5, benchFactor: 0.5, blowoutBenchFactor: 0.3 }
        }
      },
      'team-2': {
        teamId: 'team-2',
        name: 'Test Team 2',
        season: { wins: 18, losses: 12, confWins: 10, confLosses: 8 },
        roster: { playerIds: [], redshirtedPlayerIds: [] },
        rotation: {
          minutesTargetByPlayerId: {},
          depthChart: { PG: [], SG: [], SF: [], PF: [], C: [] },
          settings: { style: 'NORMAL', rotationSizeTarget: 8.5, benchFactor: 0.5, blowoutBenchFactor: 0.3 }
        }
      },
      'team-3': {
        teamId: 'team-3',
        name: 'Test Team 3',
        season: { wins: 22, losses: 8, confWins: 14, confLosses: 4 },
        roster: { playerIds: [], redshirtedPlayerIds: [] },
        rotation: {
          minutesTargetByPlayerId: {},
          depthChart: { PG: [], SG: [], SF: [], PF: [], C: [] },
          settings: { style: 'NORMAL', rotationSizeTarget: 8.5, benchFactor: 0.5, blowoutBenchFactor: 0.3 }
        }
      },
      'team-4': {
        teamId: 'team-4',
        name: 'Test Team 4',
        season: { wins: 19, losses: 11, confWins: 11, confLosses: 7 },
        roster: { playerIds: [], redshirtedPlayerIds: [] },
        rotation: {
          minutesTargetByPlayerId: {},
          depthChart: { PG: [], SG: [], SF: [], PF: [], C: [] },
          settings: { style: 'NORMAL', rotationSizeTarget: 8.5, benchFactor: 0.5, blowoutBenchFactor: 0.3 }
        }
      },
    },
    gamesById: {},
    standingsBySeason: {},
    schedule: undefined,
    tournament: undefined, // No tournament yet
  },
  playersById: {},
  recruiting: {
    seasonYear: 2024,
    recruitPool: {},
    boardsByTeamId: {},
    competitionByRecruitId: {},
  },
  rng: { seed: 12345, state: 12345 },
}

export function testTournamentPopulation() {
  console.log('🧪 Testing Tournament Population...')
  
  // Step 1: Initialize tournament
  console.log('Initializing tournament...')
  const dynastyWithTournament = initializeTournament(mockDynasty)
  
  if (!dynastyWithTournament.league.tournament) {
    console.error('❌ Tournament not created!')
    return false
  }
  
  console.log('✅ Tournament created successfully')
  console.log(`📊 Total games: ${dynastyWithTournament.league.tournament.games.length}`)
  
  // Step 2: Check Round of 64 games
  const round64Games = dynastyWithTournament.league.tournament.games.filter(g => g.round === 'Round of 64')
  console.log(`🏀 Round of 64 games: ${round64Games.length}`)
  
  // Step 3: Verify each game has team names
  let gamesWithTeams = 0
  let gamesWithMissingTeams = 0
  
  for (const game of round64Games) {
    const hasTeam1 = game.team1Id !== null
    const hasTeam2 = game.team2Id !== null
    
    if (hasTeam1 && hasTeam2) {
      gamesWithTeams++
      
      // Get team names from the selection data
      const team1 = dynastyWithTournament.league.tournament.selection.allTeams.find(t => t.teamId === game.team1Id)
      const team2 = dynastyWithTournament.league.tournament.selection.allTeams.find(t => t.teamId === game.team2Id)
      
      if (team1 && team2) {
        console.log(`  Game ${game.gameNumber}: #${team1.seed} ${game.team1Id} vs #${team2.seed} ${game.team2Id} (${game.region})`)
      } else {
        console.warn(`  ⚠️  Game ${game.gameNumber}: Missing team data for ${game.team1Id} or ${game.team2Id}`)
      }
    } else {
      gamesWithMissingTeams++
      console.warn(`  ⚠️  Game ${game.gameNumber}: Missing teams - team1: ${game.team1Id}, team2: ${game.team2Id}`)
    }
  }
  
  console.log(`\n📈 Results:`)
  console.log(`  Games with both teams: ${gamesWithTeams}`)
  console.log(`  Games with missing teams: ${gamesWithMissingTeams}`)
  console.log(`  Total Round of 64 games: ${round64Games.length}`)
  
  // Step 4: Check if bracket visualization will work
  const selection = dynastyWithTournament.league.tournament.selection
  console.log(`\n🏆 Tournament Selection:`)
  console.log(`  Autobids: ${selection.autobids.length}`)
  console.log(`  At-large: ${selection.atLarge.length}`)
  console.log(`  Total teams: ${selection.allTeams.length}`)
  
  // Step 5: Sample a few teams to verify data structure
  if (selection.allTeams.length > 0) {
    console.log(`\n👥 Sample teams:`)
    for (let i = 0; i < Math.min(5, selection.allTeams.length); i++) {
      const team = selection.allTeams[i]
      console.log(`  #${team.seed} ${team.teamId} (${team.region}) - Autobid: ${team.isAutobid}`)
    }
  }
  
  const success = gamesWithTeams === round64Games.length && round64Games.length > 0
  console.log(`\n${success ? '✅' : '❌'} Tournament population test ${success ? 'PASSED' : 'FAILED'}`)
  
  return success
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testTournamentPopulation()
}