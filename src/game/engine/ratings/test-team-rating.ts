// src/game/engine/ratings/test-team-rating.ts

import { calculateTeamRating } from './calculateTeamRating'
import type { Dynasty, ID } from '../../types/dynasty'

/**
 * Test suite for team rating calculations
 * Run: npx ts-node src/game/engine/ratings/test-team-rating.ts
 */

function testBasicRating() {
  console.log('\n📊 Test 1: Basic Rating Calculation')
  console.log('=====================================')
  
  // Mock dynasty with undefeated team
  const mockDynasty: Partial<Dynasty> = {
    league: {
      teamsById: {
        'team_1': {
          teamId: 'team_1' as ID,
          season: { wins: 10, losses: 0, confWins: 5, confLosses: 0 },
        } as any,
      },
      gamesById: {},
      seasonStats: {
        teamsById: {
          'team_1': {
            games: 10,
            points: 750,
            pointsAllowed: 500,
          } as any,
        },
        playersById: {},
      },
    },
  } as any

  const rating = calculateTeamRating('team_1' as ID, mockDynasty as Dynasty)
  console.log(`✅ Undefeated team (10-0) rating: ${rating}`)
  console.log(`   Expected: ~85-95 (excellent team)`)
  console.log(`   Result: ${rating > 80 ? '✓ PASS' : '✗ FAIL'}`)
}

function testLosingTeam() {
  console.log('\n📊 Test 2: Losing Team Rating')
  console.log('=====================================')
  
  const mockDynasty: Partial<Dynasty> = {
    league: {
      teamsById: {
        'team_2': {
          teamId: 'team_2' as ID,
          season: { wins: 2, losses: 8, confWins: 0, confLosses: 5 },
        } as any,
      },
      gamesById: {},
      seasonStats: {
        teamsById: {
          'team_2': {
            games: 10,
            points: 600,
            pointsAllowed: 750,
          } as any,
        },
        playersById: {},
      },
    },
  } as any

  const rating = calculateTeamRating('team_2' as ID, mockDynasty as Dynasty)
  console.log(`✅ Losing team (2-8) rating: ${rating}`)
  console.log(`   Expected: ~25-35 (poor team)`)
  console.log(`   Result: ${rating < 50 ? '✓ PASS' : '✗ FAIL'}`)
}

function testNoGamesTeam() {
  console.log('\n📊 Test 3: Team With No Games')
  console.log('=====================================')
  
  const mockDynasty: Partial<Dynasty> = {
    league: {
      teamsById: {
        'team_3': {
          teamId: 'team_3' as ID,
          season: { wins: 0, losses: 0, confWins: 0, confLosses: 0 },
        } as any,
      },
      gamesById: {},
      seasonStats: {
        teamsById: {
          'team_3': {
            games: 0,
            points: 0,
            pointsAllowed: 0,
          } as any,
        },
        playersById: {},
      },
    },
  } as any

  const rating = calculateTeamRating('team_3' as ID, mockDynasty as Dynasty)
  console.log(`✅ No games played rating: ${rating}`)
  console.log(`   Expected: 55 (neutral baseline)`)
  console.log(`   Result: ${rating === 55 ? '✓ PASS' : '✗ FAIL'}`)
}

function testRatingScale() {
  console.log('\n📊 Test 4: Rating Scale Validation')
  console.log('=====================================')
  
  const scenarios = [
    { wins: 20, losses: 0, expectedMin: 90, label: '20-0 (dominant)' },
    { wins: 15, losses: 5, expectedMin: 75, label: '15-5 (excellent)' },
    { wins: 10, losses: 10, expectedMin: 45, label: '10-10 (average)' },
    { wins: 5, losses: 15, expectedMin: 25, label: '5-15 (poor)' },
    { wins: 0, losses: 20, expectedMin: 10, label: '0-20 (terrible)' },
  ]

  for (const scenario of scenarios) {
    const mockDynasty: Partial<Dynasty> = {
      league: {
        teamsById: {
          'team_x': {
            teamId: 'team_x' as ID,
            season: {
              wins: scenario.wins,
              losses: scenario.losses,
              confWins: scenario.wins,
              confLosses: scenario.losses,
            },
          } as any,
        },
        gamesById: {},
        seasonStats: {
          teamsById: {
            'team_x': {
              games: scenario.wins + scenario.losses,
              points: 1000,
              pointsAllowed: 900,
            } as any,
          },
          playersById: {},
        },
      },
    } as any

    const rating = calculateTeamRating('team_x' as ID, mockDynasty as Dynasty)
    const pass = rating >= scenario.expectedMin - 10
    console.log(`  ${scenario.label}: ${rating} ${pass ? '✓' : '✗'}`)
  }
}

console.log('\n🧪 TEAM RATING TEST SUITE')
console.log('==========================')

testBasicRating()
testLosingTeam()
testNoGamesTeam()
testRatingScale()

console.log('\n✅ Test suite complete!')
console.log('All rating calculations should be in expected ranges.')
