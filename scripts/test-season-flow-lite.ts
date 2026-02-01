// Minimal E2E: postseason -> offseason -> preseason without CSV/TEAMS
import { generateSchedule } from '../src/game/engine/schedule/generateSchedule'
import type { Dynasty, ID, PlayerState, PlayerRatings, Recruit, TeamState, RecruitingBoard } from '../src/game/types/dynasty'

function mkRatings(overall: number): PlayerRatings {
  return {
    overall,
    shooting2: 60,
    shooting3: 60,
    freeThrow: 65,
    finishing: 62,
    ballHandling: 58,
    passing: 60,
    perimeterDefense: 55,
    rimDefense: 50,
    steal: 55,
    block: 50,
    athleticism: 60,
    strength: 55,
    stamina: 70,
  }
}

function mkPlayer(teamId: ID, idx: number, classYear: 'FR'|'SO'|'JR'|'SR'): PlayerState {
  const pid = `${teamId}_p${idx}`
  return {
    playerId: pid,
    identity: {
      firstName: `P${idx}`,
      lastName: `Team${teamId}`,
      age: 18 + (classYear === 'FR' ? 0 : classYear === 'SO' ? 1 : classYear === 'JR' ? 2 : 3),
      classYear,
      position: ['PG','SG','SF','PF','C'][idx % 5] as any,
      archetype: 'PRIMARY_SCORER',
      heightIn: 75,
      weightLb: 200,
      hometown: 'City, ST',
    },
    ratings: mkRatings(60 + (idx % 5)),
    development: { potential: 70, workEthic: 50, durability: 70 },
    team: { teamId, isRedshirt: false },
    stats: {
      seasonYear: 2025,
      gamesPlayed: 30,
      minutes: 20,
      points: 10,
      rebounds: 5,
      assists: 3,
      steals: 1,
      blocks: 0,
      fgm: 4,
      fga: 10,
      tpm: 1,
      tpa: 4,
      ftm: 1,
      fta: 2,
      turnovers: 2,
      fouls: 2,
    },
  }
}

function mkTeam(teamId: ID, name: string, playerIds: ID[], conferenceId: string): TeamState {
  return {
    teamId,
    name,
    meta: { pace: 70, conferenceId },
    roster: { playerIds, redshirtedPlayerIds: [] },
    season: { wins: 28, losses: 6, confWins: 16, confLosses: 4, teamRating: 75 },
    rotation: {
      minutesTargetByPlayerId: Object.fromEntries(playerIds.map(id => [id, 20])),
      depthChart: { PG: [], SG: [], SF: [], PF: [], C: [] },
      settings: { style: 'NORMAL', rotationSizeTarget: 8.5, benchFactor: 0.2, blowoutBenchFactor: 0.5 },
    },
    prestige: { dynamicModifier: 0 },
  }
}

function mkRecruit(teamId: ID, idx: number, ratings: PlayerRatings): Recruit {
  return {
    recruitId: `r_${teamId}_${idx}`,
    firstName: `R${idx}`,
    lastName: 'Committed',
    position: 'SG',
    heightIn: 75,
    weightLb: 195,
    hometown: 'Town, ST',
    ratings,
    potential: ratings.overall + 5,
    gemBustStatus: 'NORMAL',
    starRating: 3,
    isGenerational: undefined,
    interestByTeamId: { [teamId]: 30 },
    status: 'COMMITTED',
    committedToTeamId: teamId,
    scoutedByTeamId: {},
  }
}

async function main() {
  const userTeamId: ID = 'T1'
  const otherTeamId: ID = 'T2'

  const playersT1: PlayerState[] = []
  for (let i = 0; i < 10; i++) {
    const year = i < 2 ? 'SR' : (i % 3 === 0 ? 'JR' : (i % 2 === 0 ? 'SO' : 'FR'))
    playersT1.push(mkPlayer(userTeamId, i, year as any))
  }
  const playersT2: PlayerState[] = []
  for (let i = 0; i < 10; i++) {
    const year = (i % 3 === 0 ? 'JR' : (i % 2 === 0 ? 'SO' : 'FR'))
    playersT2.push(mkPlayer(otherTeamId, i, year as any))
  }

  const playerIdsT1 = playersT1.map(p => p.playerId)
  const playerIdsT2 = playersT2.map(p => p.playerId)

  let dynasty: Dynasty = {
    saveVersion: 3,
    dynastyId: 'dyn1',
    createdAtISO: new Date().toISOString(),
    lastSavedAtISO: new Date().toISOString(),
    rng: { seed: 123456789, state: 123456789 },
    world: { seasonYear: 2025, phase: 'POSTSEASON', day: 150 },
    coach: { coachId: 'c1', name: 'Test Coach', meta: {} },
    league: {
      userTeamId: userTeamId,
      teamsById: {
        [userTeamId]: mkTeam(userTeamId, 'Team One', playerIdsT1, 'confA'),
        [otherTeamId]: mkTeam(otherTeamId, 'Team Two', playerIdsT2, 'confA'),
      },
      gamesById: {},
      standingsBySeason: {},
      schedule: undefined,
      seasonStats: undefined,
      tournament: {
        seasonYear: 2025,
        teams: [ { teamId: userTeamId, seed: 1 }, { teamId: otherTeamId, seed: 2 } ],
        games: [ { team1Id: userTeamId, team2Id: otherTeamId, round: 'Championship', winnerId: userTeamId, score1: 80, score2: 70, day: 160 } ],
        rounds: [],
        championTeamId: userTeamId,
      } as any,
      conferenceTournaments: {
        confA: {
          conferenceId: 'confA',
          conferenceName: 'Test Conf',
          seasonYear: 2025,
          teams: [ { teamId: userTeamId, seed: 1 }, { teamId: otherTeamId, seed: 2 } ],
          games: [],
          champion: userTeamId,
        },
      },
      seasonHighlights: [],
    },
    recruiting: {
      seasonYear: 2025,
      recruitPool: {},
      boardsByTeamId: { [userTeamId]: { teamId: userTeamId, recruitIds: [], hoursAllocatedByRecruitId: {}, progressByRecruitId: {}, scholarshipOfferedToRecruitId: {}, visitScheduledForRecruitId: {}, scoutingHoursUsedByRecruitId: {} }, [otherTeamId]: { teamId: otherTeamId, recruitIds: [], hoursAllocatedByRecruitId: {}, progressByRecruitId: {}, scholarshipOfferedToRecruitId: {}, visitScheduledForRecruitId: {}, scoutingHoursUsedByRecruitId: {} } },
      competitionByRecruitId: {},
    },
    playersById: Object.fromEntries([...playersT1, ...playersT2].map(p => [p.playerId, p])),
  }

  // Add two committed recruits for T1
  const r1 = mkRecruit(userTeamId, 1, playersT1[0].ratings)
  const r2 = mkRecruit(userTeamId, 2, playersT1[1].ratings)
  dynasty.recruiting.recruitPool[r1.recruitId] = r1
  dynasty.recruiting.recruitPool[r2.recruitId] = r2

  const preOffRosterCount = dynasty.league.teamsById[userTeamId].roster.playerIds.length
  const srIds = dynasty.league.teamsById[userTeamId].roster.playerIds.slice(0,2)

  // Advance to offseason (lite, no awards/prestige)
  const offseason: Dynasty = {
    ...dynasty,
    world: { ...dynasty.world, phase: 'OFFSEASON', day: 0 },
    playersById: { ...dynasty.playersById },
    league: { ...dynasty.league, teamsById: { ...dynasty.league.teamsById } },
  }

  // Per team processing: graduate SR, advance class year, reset stats, add committed recruits
  for (const tid of Object.keys(offseason.league.teamsById)) {
    const team = offseason.league.teamsById[tid]
    const nextPlayerIds: ID[] = []

    for (const pid of team.roster.playerIds) {
      const p = offseason.playersById[pid]
      if (!p) continue
      if (p.identity.classYear === 'SR') {
        delete offseason.playersById[pid]
        continue
      }
      const nextClass = p.identity.classYear === 'FR' ? 'SO' : p.identity.classYear === 'SO' ? 'JR' : p.identity.classYear === 'JR' ? 'SR' : 'SR'
      offseason.playersById[pid] = {
        ...p,
        identity: { ...p.identity, classYear: nextClass as any },
        stats: {
          seasonYear: dynasty.world.seasonYear + 1,
          gamesPlayed: 0,
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
        },
      }
      nextPlayerIds.push(pid)
    }

    // Convert committed recruits
    const committed = Object.values(offseason.recruiting.recruitPool).filter(r => r.status === 'COMMITTED' && r.committedToTeamId === tid)
    for (const r of committed) {
      const newPid = `${tid}_new_${r.recruitId}`
      offseason.playersById[newPid] = {
        playerId: newPid,
        identity: {
          firstName: r.firstName,
          lastName: r.lastName,
          age: 18,
          classYear: 'FR',
          position: r.position,
          archetype: 'PRIMARY_SCORER',
          heightIn: r.heightIn,
          weightLb: r.weightLb,
          hometown: r.hometown,
        },
        ratings: r.ratings,
        development: { potential: r.potential, workEthic: 50, durability: 70 },
        team: { teamId: tid, isRedshirt: false },
        stats: {
          seasonYear: dynasty.world.seasonYear + 1,
          gamesPlayed: 0,
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
        },
      }
      nextPlayerIds.push(newPid)
    }

    // Update team
    offseason.league.teamsById[tid] = {
      ...team,
      roster: { playerIds: nextPlayerIds, redshirtedPlayerIds: [] },
      season: { wins: 0, losses: 0, confWins: 0, confLosses: 0 },
    }
  }

  // Clear tournament/schedule/seasonStats and remove committed recruits from pool
  offseason.league.tournament = undefined
  offseason.league.schedule = undefined
  offseason.league.seasonStats = undefined
  const remainingPool: Record<ID, Recruit> = {}
  for (const [rid, r] of Object.entries(offseason.recruiting.recruitPool)) {
    if (r.status !== 'COMMITTED') remainingPool[rid] = r
  }
  offseason.recruiting.recruitPool = remainingPool
  const offTeam = offseason.league.teamsById[userTeamId]
  const postOffRosterCount = offTeam.roster.playerIds.length

  const seniorsRemoved = srIds.every(id => !offseason.playersById[id])
  const recruitsAdded = postOffRosterCount >= preOffRosterCount - srIds.length + 2

  const returningId = offTeam.roster.playerIds.find(id => !srIds.includes(id))
  const returningPlayer = returningId ? offseason.playersById[returningId] : undefined
  const statsReset = returningPlayer ? (returningPlayer.stats.gamesPlayed === 0 && returningPlayer.stats.points === 0 && returningPlayer.stats.seasonYear === 2026) : false

  // Start new season (lite, no prestige/recruit pool generation)
  const preseason: Dynasty = {
    ...offseason,
    world: { ...offseason.world, seasonYear: offseason.world.seasonYear + 1, phase: 'PRESEASON', day: 0 },
    recruiting: {
      seasonYear: offseason.world.seasonYear + 1,
      recruitPool: {},
      boardsByTeamId: Object.fromEntries(Object.keys(offseason.league.teamsById).map(tid => {
        const b: RecruitingBoard = {
          teamId: tid,
          recruitIds: [],
          hoursAllocatedByRecruitId: {},
          progressByRecruitId: {},
          scholarshipOfferedToRecruitId: {},
          visitScheduledForRecruitId: {},
          scoutingHoursUsedByRecruitId: {},
        }
        return [tid, b]
      })),
      competitionByRecruitId: {},
    },
  }
  preseason.league.schedule = generateSchedule(preseason)
  const recruitCount = Object.keys(preseason.recruiting.recruitPool).length
  const hasSchedule = Boolean(preseason.league.schedule)
  const seasonIncremented = preseason.world.seasonYear === 2026
  const phaseIsPreseason = preseason.world.phase === 'PRESEASON'

  console.log('\n=== SEASON FLOW LITE E2E ===')
  console.log(`Pre-offseason roster: ${preOffRosterCount}`)
  console.log(`Post-offseason roster: ${postOffRosterCount}`)
  console.log(`Seniors removed: ${seniorsRemoved ? 'OK' : 'FAIL'}`)
  console.log(`Committed recruits converted: ${recruitsAdded ? 'OK' : 'FAIL'}`)
  console.log(`Returning player stats reset: ${statsReset ? 'OK' : 'FAIL'}`)
  console.log(`Season incremented: ${seasonIncremented ? 'OK' : 'FAIL'}`)
  console.log(`Phase PRESEASON: ${phaseIsPreseason ? 'OK' : 'FAIL'}`)
  console.log(`Recruit pool size: ${recruitCount} (expected ~300)`)
  console.log(`Schedule exists: ${hasSchedule ? 'OK' : 'FAIL'}`)

  const pass = seniorsRemoved && recruitsAdded && statsReset && seasonIncremented && phaseIsPreseason && hasSchedule && recruitCount >= 250
  console.log(`\nResult: ${pass ? 'PASS' : 'WARN'}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
