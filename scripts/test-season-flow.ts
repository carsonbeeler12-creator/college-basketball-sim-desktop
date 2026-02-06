// End-to-end test: postseason -> offseason -> preseason
import { TEAMS } from '../src/game/defaultData'
import { createDynasty } from '../src/game/engine/createDynasty'
import { advanceToOffseason } from '../src/game/engine/development/advanceToOffseason'
import { startNewSeason } from '../src/game/engine/development/startNewSeason'
import type { Dynasty, ID, Recruit, PlayerState } from '../src/game/types/dynasty'

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

async function main() {
  const userTeamId: ID = TEAMS[0].id
  const seasonYear = new Date().getFullYear()

  // 1) Create a fresh dynasty
  let dynasty: Dynasty = createDynasty({ coachName: 'Test Coach', userTeamId, seasonYear })
  const team = dynasty.league.teamsById[userTeamId]

  // Ensure roster exists
  if (!team?.roster?.playerIds?.length) {
    throw new Error('User team roster missing')
  }

  // 2) Mark two players as seniors to verify graduation
  const srIds = team.roster.playerIds.slice(0, 2)
  srIds.forEach(id => {
    const p = dynasty.playersById[id]
    if (p) {
      dynasty.playersById[id] = { ...p, identity: { ...p.identity, classYear: 'SR' } }
    }
  })

  // 2b) Boost multiple players' stats across teams to ensure awards pool
  const allTeamIds = Object.keys(dynasty.league.teamsById)
  let playersBootstrapped = 0
  for (const tid of allTeamIds.slice(0, 10)) {
    const t = dynasty.league.teamsById[tid]
    if (!t || t.roster.playerIds.length < 3) continue
    
    const pid = t.roster.playerIds[0]
    const p = dynasty.playersById[pid]
    if (!p) continue
    
    dynasty.playersById[pid] = {
      ...p,
      stats: {
        ...p.stats,
        seasonYear,
        gamesPlayed: 30,
        minutes: 800 + playersBootstrapped * 10,
        points: 500 + playersBootstrapped * 20,
        rebounds: 200 + playersBootstrapped * 5,
        assists: 120 + playersBootstrapped * 10,
        steals: 50,
        blocks: 20,
        fgm: 200,
        fga: 400,
        tpm: 60,
        tpa: 180,
        ftm: 80,
        fta: 100,
        turnovers: 60,
        fouls: 60,
      },
    }
    playersBootstrapped++
  }

  // 3) Fabricate a simple NCAA tournament result: user team wins championship
  // Minimal fields used by prestige adjustments
  const opponentId = pick(Object.keys(dynasty.league.teamsById).filter(tid => tid !== userTeamId))
  ;(dynasty as any).league.tournament = {
    games: [
      { team1Id: userTeamId, team2Id: opponentId, round: 'Championship', winnerId: userTeamId, score1: 80, score2: 70 },
    ],
  }

  // Also set a conference tournament champion for user team
  const confId = team.meta?.conferenceId as string | undefined
  if (confId) {
    ;(dynasty as any).league.conferenceTournaments = {
      [confId]: { champion: userTeamId },
    }
  }

  // 4) Add two committed recruits to verify conversion
  const samplePlayer: PlayerState = dynasty.playersById[team.roster.playerIds[0]]
  const baseRatings = samplePlayer.ratings

  const mkRecruit = (idx: number): Recruit => ({
    recruitId: `r_test_${idx}_${Date.now()}`,
    firstName: `Test${idx}`,
    lastName: 'Recruit',
    position: samplePlayer.identity.position,
    heightIn: samplePlayer.identity.heightIn,
    weightLb: samplePlayer.identity.weightLb,
    hometown: 'Test City, TS',
    archetype: samplePlayer.identity.archetype,
    ratings: { ...baseRatings },
    potential: Math.min(99, baseRatings.overall + 5),
    gemBustStatus: 'NORMAL',
    starRating: 3,
    isGenerational: undefined,
    interestByTeamId: { [userTeamId]: 30 },
    status: 'COMMITTED',
    scoutedByTeamId: {},
    committedToTeamId: userTeamId,
    rank: undefined,
  })

  dynasty.recruiting.recruitPool[mkRecruit(1).recruitId] = mkRecruit(1)
  dynasty.recruiting.recruitPool[mkRecruit(2).recruitId] = mkRecruit(2)

  const preOffseasonRosterCount = team.roster.playerIds.length
  const preSrCount = team.roster.playerIds.reduce((acc, id) => acc + (dynasty.playersById[id]?.identity.classYear === 'SR' ? 1 : 0), 0)

  // 5) Advance to offseason
  const offseason = advanceToOffseason(dynasty)
  const offTeam = offseason.league.teamsById[userTeamId]

  const postOffRosterIds = offTeam.roster.playerIds
  const postOffRosterCount = postOffRosterIds.length

  // Validate seniors removed and recruits added
  const seniorsRemoved = srIds.every(id => !offseason.playersById[id])
  const totalGraduated = preSrCount
  const expectedMinRoster = preOffseasonRosterCount - totalGraduated + 2
  const recruitsAdded = postOffRosterCount >= expectedMinRoster

  // Validate stats reset on a returning player
  const returningId = postOffRosterIds.find(id => !srIds.includes(id))
  const returningPlayer = returningId ? offseason.playersById[returningId] : undefined
  const statsReset = returningPlayer ? (
    returningPlayer.stats.gamesPlayed === 0 && returningPlayer.stats.points === 0 && returningPlayer.stats.seasonYear === seasonYear + 1
  ) : false

  // 6) Start new season (preseason)
  const preseason = startNewSeason(offseason)

  // Validate new recruit pool generated (~300)
  const recruitCount = Object.keys(preseason.recruiting.recruitPool).length
  const hasSchedule = Boolean(preseason.league.schedule)
  const seasonIncremented = preseason.world.seasonYear === seasonYear + 1
  const phaseIsPreseason = preseason.world.phase === 'PRESEASON'

  // Report
  console.log('\n=== SEASON FLOW E2E ===')
  console.log(`Pre-offseason roster: ${preOffseasonRosterCount}`)
  console.log(`Post-offseason roster: ${postOffRosterCount}`)
  console.log(`Seniors removed: ${seniorsRemoved ? 'OK' : 'FAIL'}`)
  console.log(`Signed recruits converted: ${recruitsAdded ? 'OK' : 'FAIL'} (expected ≥ ${expectedMinRoster})`)
  console.log(`Returning player stats reset: ${statsReset ? 'OK' : 'FAIL'}`)
  console.log(`Season incremented: ${seasonIncremented ? 'OK' : 'FAIL'}`)
  console.log(`Phase PRESEASON: ${phaseIsPreseason ? 'OK' : 'FAIL'}`)
  console.log(`Recruit pool size: ${recruitCount} (expected ~300)`)
  console.log(`Schedule exists: ${hasSchedule ? 'OK' : 'FAIL'}`)

  // Verify awards applied during offseason
  const awardedPlayers = Object.values(offseason.playersById).filter(p => Array.isArray(p.awards) && p.awards.length > 0)
  const awarded = awardedPlayers.some(p => p.awards?.some(a => a.seasonYear === seasonYear))
  console.log(`Awards applied: ${awarded ? 'OK' : 'WARN'} (${awardedPlayers.length} players with awards)`)

  const pass = seniorsRemoved && recruitsAdded && statsReset && seasonIncremented && phaseIsPreseason && hasSchedule && recruitCount >= 250 && awarded
  console.log(`\nResult: ${pass ? 'PASS' : 'WARN'}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
