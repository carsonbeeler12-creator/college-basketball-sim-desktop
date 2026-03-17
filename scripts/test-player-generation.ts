// Player generation analysis test
import { TEAMS } from '../src/game/defaultData'
import { createDynasty } from '../src/game/engine/createDynasty'
import type { Dynasty, PlayerState } from '../src/game/types/dynasty'

interface PlayerStats {
  total: number
  byArchetype: Record<string, number>
  byClassYear: Record<string, number>
  byPosition: Record<string, number>
  overallStats: {
    min: number
    max: number
    avg: number
    median: number
    stdev: number
    p90: number
    p75: number
    p25: number
  }
  potentialStats: {
    min: number
    max: number
    avg: number
  }
  generationalTalents: {
    count: number
    pct: number
    names: string[]
  }
  rareTalents: {
    count: number
    pct: number
  }
  positionAverages: Record<string, { avg: number; min: number; max: number }>
}

function analyzePlayerGeneration(dynasty: Dynasty): PlayerStats {
  const players = Object.values(dynasty.playersById)
  
  // Initialize counters
  const byArchetype: Record<string, number> = {}
  const byClassYear: Record<string, number> = {}
  const byPosition: Record<string, number> = {}
  const overalls: number[] = []
  const potentials: number[] = []
  const positionOveralls: Record<string, number[]> = {}
  const generational: string[] = []

  // Aggregate data
  for (const player of players) {
    // Overall
    const overall = player.ratings.overall ?? 0
    overalls.push(overall)
    
    // Potential
    if (player.ratings.potential !== undefined) {
      potentials.push(player.ratings.potential)
    }

    // Archetype
    const arch = player.identity.archetype
    byArchetype[arch] = (byArchetype[arch] ?? 0) + 1

    // Class year
    const classYear = player.identity.classYear
    byClassYear[classYear] = (byClassYear[classYear] ?? 0) + 1

    // Position
    const pos = player.identity.position
    byPosition[pos] = (byPosition[pos] ?? 0) + 1
    if (!positionOveralls[pos]) positionOveralls[pos] = []
    positionOveralls[pos].push(overall)

    // Generational talent: isGenerational flag or extremely high overall
    if (player.development?.isGenerational || overall >= 95) {
      const name = `${player.identity.firstName} ${player.identity.lastName}`
      generational.push(name)
    }
  }

  // Calculate statistics
  const sortedOveralls = [...overalls].sort((a, b) => a - b)
  const n = sortedOveralls.length
  
  const calculateStats = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    const n = sorted.length
    const min = sorted[0]
    const max = sorted[n - 1]
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const median = sorted[Math.floor(n / 2)]
    
    // Standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
    const stdev = Math.sqrt(variance)
    
    // Percentiles
    const p90 = sorted[Math.floor(n * 0.90)]
    const p75 = sorted[Math.floor(n * 0.75)]
    const p25 = sorted[Math.floor(n * 0.25)]
    
    return { min, max, avg, median, stdev, p90, p75, p25 }
  }

  const overallStats = calculateStats(overalls)
  const potentialStats = potentials.length > 0 
    ? { min: Math.min(...potentials), max: Math.max(...potentials), avg: potentials.reduce((a,b) => a+b, 0) / potentials.length }
    : { min: 0, max: 0, avg: 0 }

  // Position averages
  const positionAverages: Record<string, { avg: number; min: number; max: number }> = {}
  for (const [pos, values] of Object.entries(positionOveralls)) {
    positionAverages[pos] = {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    }
  }

  // Count 90+ overall (rare talent)
  const rareTalents = overalls.filter(o => o >= 90).length

  return {
    total: players.length,
    byArchetype,
    byClassYear,
    byPosition,
    overallStats,
    potentialStats,
    generationalTalents: {
      count: generational.length,
      pct: (generational.length / players.length * 100),
      names: generational.slice(0, 10) // Show first 10
    },
    rareTalents: {
      count: rareTalents,
      pct: (rareTalents / players.length * 100)
    },
    positionAverages
  }
}

async function main() {
  const userTeamId = TEAMS[0].id
  const seasonYear = new Date().getFullYear()

  console.log('🏀 Player Generation Analysis\n')
  
  let dynasty: Dynasty = createDynasty({ coachName: 'Test Coach', userTeamId, seasonYear })
  
  const stats = analyzePlayerGeneration(dynasty)

  console.log('📊 OVERALL STATISTICS')
  console.log('='.repeat(60))
  console.log(`Total players: ${stats.total}`)
  console.log(`Avg overall: ${stats.overallStats.avg.toFixed(1)} ± ${stats.overallStats.stdev.toFixed(1)}`)
  console.log(`Range: ${stats.overallStats.min}-${stats.overallStats.max}`)
  console.log(`Median: ${stats.overallStats.median}`)
  console.log(`P25: ${stats.overallStats.p25} | P75: ${stats.overallStats.p75} | P90: ${stats.overallStats.p90}`)

  console.log(`\n💎 ELITE PLAYERS`)
  console.log('='.repeat(60))
  console.log(`Generational talents (95+ OVR or isGenerational): ${stats.generationalTalents.count} (${stats.generationalTalents.pct.toFixed(2)}%)`)
  if (stats.generationalTalents.names.length > 0) {
    console.log(`  Examples: ${stats.generationalTalents.names.slice(0, 5).join(', ')}`)
  }
  console.log(`90+ overall (rare talent): ${stats.rareTalents.count} (${stats.rareTalents.pct.toFixed(2)}%)`)

  console.log(`\n📈 POTENTIAL STATS`)
  console.log('='.repeat(60))
  console.log(`Avg potential: ${stats.potentialStats.avg.toFixed(1)}`)
  console.log(`Range: ${stats.potentialStats.min}-${stats.potentialStats.max}`)

  console.log(`\n🎯 ARCHETYPE DISTRIBUTION`)
  console.log('='.repeat(60))
  const archetypes = Object.entries(stats.byArchetype)
    .sort((a, b) => b[1] - a[1])
  for (const [arch, count] of archetypes) {
    const pct = (count / stats.total * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(count / stats.total * 20))
    console.log(`${arch.padEnd(20)}: ${count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`)
  }

  console.log(`\n🏫 CLASS YEAR DISTRIBUTION`)
  console.log('='.repeat(60))
  const classYears = ['FR', 'SO', 'JR', 'SR']
  for (const year of classYears) {
    const count = stats.byClassYear[year] ?? 0
    const pct = (count / stats.total * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(count / stats.total * 20))
    console.log(`${year.padEnd(20)}: ${count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`)
  }

  console.log(`\n🏀 POSITION DISTRIBUTION`)
  console.log('='.repeat(60))
  const positions = ['PG', 'SG', 'SF', 'PF', 'C']
  for (const pos of positions) {
    const count = stats.byPosition[pos] ?? 0
    const avg = stats.positionAverages[pos]?.avg ?? 0
    const pct = (count / stats.total * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(count / stats.total * 20))
    console.log(`${pos.padEnd(20)}: ${count.toString().padStart(3)} (${pct.padStart(5)}%) avg OVR: ${avg.toFixed(1)} ${bar}`)
  }

  console.log(`\n📋 POSITION OVERALL RANGES`)
  console.log('='.repeat(60))
  for (const pos of positions) {
    const stats_pos = stats.positionAverages[pos]
    if (stats_pos) {
      console.log(`${pos}: ${stats_pos.min}-${stats_pos.max} (avg ${stats_pos.avg.toFixed(1)})`)
    }
  }

  console.log(`\n\n${'='.repeat(60)}`)
  console.log('📊 GENERATION QUALITY ASSESSMENT')
  console.log('='.repeat(60))

  // Assessment based on real NCAA distribution
  const generationalGood = stats.generationalTalents.count <= 3  // 0-3 max (Zion-level talent)
  const eliteGood = stats.rareTalents.count >= 8 && stats.rareTalents.count <= 35  // 8-35 players (0.2-0.8% = NBA lottery picks)
  const overallGood = stats.overallStats.avg >= 50 && stats.overallStats.avg <= 55  // Balanced league avg
  const spreadGood = stats.overallStats.stdev >= 10 && stats.overallStats.stdev <= 14  // Good variety

  console.log(`✅ Generational talent rate: ${stats.generationalTalents.pct.toFixed(2)}% = ${stats.generationalTalents.count} players (target: 0-3 league-wide)`)
  console.log(`   Status: ${generationalGood ? '✓ EXCELLENT (extremely rare)' : '✗ TOO MANY'} `)
  
  console.log(`✅ Elite 90+ overall: ${stats.rareTalents.pct.toFixed(2)}% = ${stats.rareTalents.count} players (target: 0.2-0.8% = 8-35 players)`)
  console.log(`   Status: ${eliteGood ? '✓ REALISTIC (NBA-ready talent)' : stats.rareTalents.count < 8 ? '⚠️  SLIGHTLY LOW (but acceptable)' : '✗ TOO HIGH'}`)
  
  console.log(`✅ Average overall: ${stats.overallStats.avg.toFixed(1)} (target: 50-55 for balanced league)`)
  console.log(`   Status: ${overallGood ? '✓ GOOD (balanced)' : '⚠️  OUT OF RANGE'}`)
  
  console.log(`✅ Std deviation: ${stats.overallStats.stdev.toFixed(1)} (target: 10-14)`)
  console.log(`   Status: ${spreadGood ? '✓ GOOD (nice variety)' : stats.overallStats.stdev < 10 ? '⚠️  TOO NARROW' : '⚠️  TOO WIDE'}`)

  const allGood = generationalGood && eliteGood && overallGood && spreadGood
  console.log(`\n${allGood ? '🎉 ALL METRICS REALISTIC' : '⚠️  SOME METRICS COULD BE TUNED'}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
