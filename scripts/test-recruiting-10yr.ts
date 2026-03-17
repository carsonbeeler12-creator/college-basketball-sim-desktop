// 10-year recruiting simulation to validate new personality/momentum/sleeper mechanics
import { TEAMS } from '../src/game/defaultData'
import { createDynasty } from '../src/game/engine/createDynasty'
import { advanceToOffseason } from '../src/game/engine/development/advanceToOffseason'
import { startNewSeason } from '../src/game/engine/development/startNewSeason'
import type { Dynasty, ID } from '../src/game/types/dynasty'

interface RecruitingStats {
  totalRecruits: number
  byPersonality: Record<string, number>
  sleepers: number
  sleeperBreakouts: number
  avgInterestPerRecruit: number
  recruitsWith0Interest: number
  recruitsWith3PlusSchools: number
}

function analyzeRecruitingPool(dynasty: Dynasty): RecruitingStats {
  const recruits = Object.values(dynasty.recruiting.recruitPool)
  
  const stats: RecruitingStats = {
    totalRecruits: recruits.length,
    byPersonality: {
      LOYALIST: 0,
      WINNER: 0,
      STAR: 0,
      DEVELOPER: 0,
      SCHEME_FIT: 0,
      NONE: 0
    },
    sleepers: 0,
    sleeperBreakouts: 0,
    avgInterestPerRecruit: 0,
    recruitsWith0Interest: 0,
    recruitsWith3PlusSchools: 0
  }

  let totalInterest = 0
  for (const recruit of recruits) {
    // Personality distribution
    const personality = recruit.personality || 'NONE'
    stats.byPersonality[personality]++

    // Sleeper tracking
    if (recruit.isSleeper) stats.sleepers++
    if (recruit.hasHadBreakout) stats.sleeperBreakouts++

    // Interest metrics
    const schools = Object.values(recruit.interestByTeamId || {}).filter(i => i > 0)
    totalInterest += schools.length
    if (schools.length === 0) stats.recruitsWith0Interest++
    if (schools.length >= 3) stats.recruitsWith3PlusSchools++
  }

  stats.avgInterestPerRecruit = recruits.length > 0 ? totalInterest / recruits.length : 0

  return stats
}

function checkMomentum(dynasty: Dynasty): { teamsWithMomentum: number; avgMomentum: number; minMomentum: number; maxMomentum: number } {
  const boards = Object.values(dynasty.recruiting.boardsByTeamId || {})
  const momentumValues: number[] = []

  for (const board of boards) {
    if (board.momentumByRecruitId) {
      const values = Object.values(board.momentumByRecruitId)
      momentumValues.push(...values)
    }
  }

  return {
    teamsWithMomentum: boards.filter(b => b.momentumByRecruitId && Object.keys(b.momentumByRecruitId).length > 0).length,
    avgMomentum: momentumValues.length > 0 ? momentumValues.reduce((a, b) => a + b, 0) / momentumValues.length : 0,
    minMomentum: momentumValues.length > 0 ? Math.min(...momentumValues) : 0,
    maxMomentum: momentumValues.length > 0 ? Math.max(...momentumValues) : 0
  }
}

async function main() {
  const userTeamId: ID = TEAMS[0].id
  const seasonYear = new Date().getFullYear()

  console.log('🏀 Starting 10-year recruiting simulation...\n')

  let dynasty: Dynasty = createDynasty({ coachName: 'Test Coach', userTeamId, seasonYear })

  const yearlyStats: Array<RecruitingStats & { year: number; momentum: ReturnType<typeof checkMomentum> }> = []
  let errors: string[] = []

  for (let year = 0; year < 10; year++) {
    try {
      console.log(`\n📅 Year ${year + 1}/${10} (Season ${dynasty.world.seasonYear})`)
      console.log('─'.repeat(60))

      // Analyze recruiting pool
      const recruitStats = analyzeRecruitingPool(dynasty)
      const momentumStats = checkMomentum(dynasty)
      yearlyStats.push({ ...recruitStats, year: year + 1, momentum: momentumStats })

      console.log(`Recruits: ${recruitStats.totalRecruits}`)
      console.log(`Personalities: L=${recruitStats.byPersonality.LOYALIST} W=${recruitStats.byPersonality.WINNER} S=${recruitStats.byPersonality.STAR} D=${recruitStats.byPersonality.DEVELOPER} SF=${recruitStats.byPersonality.SCHEME_FIT} N=${recruitStats.byPersonality.NONE}`)
      console.log(`Sleepers: ${recruitStats.sleepers} (${recruitStats.sleeperBreakouts} broke out)`)
      console.log(`Avg interest/recruit: ${recruitStats.avgInterestPerRecruit.toFixed(1)} schools`)
      console.log(`0 interest: ${recruitStats.recruitsWith0Interest} | 3+ schools: ${recruitStats.recruitsWith3PlusSchools}`)
      console.log(`Momentum: ${momentumStats.teamsWithMomentum} teams tracking (avg=${momentumStats.avgMomentum.toFixed(1)}, range=${momentumStats.minMomentum.toFixed(0)} to ${momentumStats.maxMomentum.toFixed(0)})`)

      // Simple fast-forward through season without game simulation (to test recruiting only)
      // Just advance the phase manually
      try {
        // Skip to offseason by manually setting phase
        dynasty = {
          ...dynasty,
          world: {
            ...dynasty.world,
            phase: 'OFFSEASON' as const,
            day: 180 // End of season
          }
        }
      } catch (err) {
        errors.push(`Year ${year + 1}: Phase transition failed - ${err}`)
        console.error(`❌ Phase transition error: ${err}`)
        break
      }

      console.log(`✅ Season fast-forwarded to offseason`)

      // Advance through offseason
      try {
        dynasty = advanceToOffseason(dynasty)
        dynasty = startNewSeason(dynasty)
      } catch (err) {
        errors.push(`Year ${year + 1}: Offseason transition failed - ${err}`)
        console.error(`❌ Offseason error: ${err}`)
        break
      }

      console.log(`✅ Offseason complete, starting Year ${dynasty.world.seasonYear}`)

    } catch (err) {
      errors.push(`Year ${year + 1}: Critical failure - ${err}`)
      console.error(`💥 Critical error in year ${year + 1}:`, err)
      break
    }
  }

  // Final analysis
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 10-YEAR RECRUITING ANALYSIS')
  console.log('='.repeat(60))

  // Aggregate statistics
  const totalRecruits = yearlyStats.reduce((sum, s) => sum + s.totalRecruits, 0)
  const avgRecruitsPerYear = totalRecruits / yearlyStats.length

  const personalityTotals = {
    LOYALIST: yearlyStats.reduce((sum, s) => sum + s.byPersonality.LOYALIST, 0),
    WINNER: yearlyStats.reduce((sum, s) => sum + s.byPersonality.WINNER, 0),
    STAR: yearlyStats.reduce((sum, s) => sum + s.byPersonality.STAR, 0),
    DEVELOPER: yearlyStats.reduce((sum, s) => sum + s.byPersonality.DEVELOPER, 0),
    SCHEME_FIT: yearlyStats.reduce((sum, s) => sum + s.byPersonality.SCHEME_FIT, 0),
    NONE: yearlyStats.reduce((sum, s) => sum + s.byPersonality.NONE, 0)
  }

  const totalSleepers = yearlyStats.reduce((sum, s) => sum + s.sleepers, 0)
  const totalBreakouts = yearlyStats.reduce((sum, s) => sum + s.sleeperBreakouts, 0)
  const avgInterest = yearlyStats.reduce((sum, s) => sum + s.avgInterestPerRecruit, 0) / yearlyStats.length

  console.log(`\n📈 Recruit Pool Metrics:`)
  console.log(`  Total recruits: ${totalRecruits} (avg ${avgRecruitsPerYear.toFixed(0)}/year)`)
  console.log(`  Expected: ~${yearlyStats.length * 300} (300/year)`)
  
  console.log(`\n👤 Personality Distribution:`)
  Object.entries(personalityTotals).forEach(([type, count]) => {
    const pct = (count / totalRecruits * 100).toFixed(1)
    const expected = type === 'NONE' ? 0 : 20
    const status = Math.abs(parseFloat(pct) - expected) < 3 ? '✅' : '⚠️'
    console.log(`  ${type.padEnd(12)}: ${count.toString().padStart(4)} (${pct.padStart(5)}%) ${status} ${type === 'NONE' ? 'Expected: 0%' : 'Expected: 20%'}`)
  })

  console.log(`\n💎 Sleeper Mechanics:`)
  console.log(`  Total sleepers: ${totalSleepers} (avg ${(totalSleepers / yearlyStats.length).toFixed(1)}/year)`)
  console.log(`  Breakouts: ${totalBreakouts} (${(totalBreakouts / totalSleepers * 100).toFixed(1)}% of sleepers)`)
  console.log(`  Expected breakout rate: ~60-70% (12% weekly × 8 weeks)`)

  console.log(`\n📞 Interest Distribution:`)
  console.log(`  Avg schools interested per recruit: ${avgInterest.toFixed(2)}`)
  console.log(`  Expected: 3-6 schools (varied by star rating)`)

  console.log(`\n📊 Momentum Tracking:`)
  const avgTeamsWithMomentum = yearlyStats.reduce((sum, s) => sum + s.momentum.teamsWithMomentum, 0) / yearlyStats.length
  const avgMomentumValue = yearlyStats.reduce((sum, s) => sum + s.momentum.avgMomentum, 0) / yearlyStats.length
  const totalTeams = dynasty && dynasty.league ? Object.keys(dynasty.league.teamsById).length : 'Unknown'
  console.log(`  Avg teams tracking momentum: ${avgTeamsWithMomentum.toFixed(0)} / ${totalTeams}`)
  console.log(`  Avg momentum value: ${avgMomentumValue.toFixed(1)} (range: -20 to +20)`)

  // Validation results
  console.log(`\n\n${'='.repeat(60)}`)
  console.log('🎯 VALIDATION RESULTS')
  console.log('='.repeat(60))

  const validations = []

  // Check recruit pool size
  const poolSizeOK = avgRecruitsPerYear >= 280 && avgRecruitsPerYear <= 320
  validations.push({ test: 'Recruit pool size (~300/year)', pass: poolSizeOK, value: avgRecruitsPerYear.toFixed(0) })

  // Check personality distribution (each should be ~20%)
  const personalityOK = Object.entries(personalityTotals).every(([type, count]) => {
    if (type === 'NONE') return count === 0
    const pct = count / totalRecruits * 100
    return pct >= 17 && pct <= 23 // 20% ± 3%
  })
  validations.push({ test: 'Personality distribution (20% each)', pass: personalityOK, value: `L=${(personalityTotals.LOYALIST / totalRecruits * 100).toFixed(1)}% W=${(personalityTotals.WINNER / totalRecruits * 100).toFixed(1)}% S=${(personalityTotals.STAR / totalRecruits * 100).toFixed(1)}% D=${(personalityTotals.DEVELOPER / totalRecruits * 100).toFixed(1)}% SF=${(personalityTotals.SCHEME_FIT / totalRecruits * 100).toFixed(1)}%` })

  // Check sleeper rate (~15-20% of pool)
  const sleeperRate = totalSleepers / totalRecruits * 100
  const sleeperOK = sleeperRate >= 10 && sleeperRate <= 25
  validations.push({ test: 'Sleeper rate (10-25% of pool)', pass: sleeperOK, value: `${sleeperRate.toFixed(1)}%` })

  // Check breakout rate (should be ~60-70% of sleepers)
  const breakoutRate = totalBreakouts / totalSleepers * 100
  const breakoutOK = breakoutRate >= 50 && breakoutRate <= 80
  validations.push({ test: 'Breakout rate (50-80% of sleepers)', pass: breakoutOK, value: `${breakoutRate.toFixed(1)}%` })

  // Check interest distribution
  const interestOK = avgInterest >= 2 && avgInterest <= 8
  validations.push({ test: 'Avg interest per recruit (2-8 schools)', pass: interestOK, value: avgInterest.toFixed(2) })

  // Check momentum tracking
  const momentumOK = avgTeamsWithMomentum > 0
  validations.push({ test: 'Momentum tracking active', pass: momentumOK, value: `${avgTeamsWithMomentum.toFixed(0)} teams` })

  // Check no runtime errors
  const noErrors = errors.length === 0
  validations.push({ test: 'No runtime errors', pass: noErrors, value: `${errors.length} errors` })

  validations.forEach(v => {
    const status = v.pass ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} - ${v.test}: ${v.value}`)
  })

  const allPass = validations.every(v => v.pass)
  console.log(`\n${allPass ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`)

  if (errors.length > 0) {
    console.log(`\n\n${'='.repeat(60)}`)
    console.log(`❌ ERRORS ENCOUNTERED (${errors.length})`)
    console.log('='.repeat(60))
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`))
  }

  console.log('\n')
  process.exit(allPass && errors.length === 0 ? 0 : 1)
}

main().catch(err => { 
  console.error('💥 Fatal error:', err)
  process.exit(1) 
})
