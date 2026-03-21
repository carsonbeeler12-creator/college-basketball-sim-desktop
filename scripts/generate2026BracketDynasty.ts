/**
 * Generate a dynasty JSON with the real 2026 NCAA Tournament Round of 64
 * (teams from CBS 2026 bracket, mapped to game's fictional team IDs).
 *
 * Run: npm run generate:2026-bracket
 * Output: src/data/dynasty-2026-bracket.json (bundled with app, no fetch)
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { generateBracket } from '../src/game/engine/tournament/generateBracket'
import { DYNASTY_SAVE_VERSION } from '../src/game/types/dynasty'

type ID = string
type TournamentTeam = { teamId: ID; seed: number; region: string; isAutobid: boolean; resumeScore: number; seedScore: number }
type TournamentSelection = { seasonYear: number; autobids: { teamId: ID; conferenceId: string }[]; atLarge: ID[]; allTeams: TournamentTeam[] }
type TeamState = { teamId: ID; name: string; meta?: { conferenceId?: string }; roster: { playerIds: ID[]; redshirtedPlayerIds: ID[] }; season: { wins: number; losses: number; confWins: number; confLosses: number }; rotation: unknown }
type Dynasty = Record<string, unknown>

// Display names for the 64 teams (game's fictional names)
const TEAM_NAMES: Record<ID, string> = {
  durme: 'Durham Metropolitan Demons', carun: 'Carolina University Carolina Blue', chaco: 'Charlottesville College Cavs',
  loume: 'Louisville Metropolitan Redbirds', syrst: 'Syracuse State Citrus', ralin: 'Raleigh Institute Panthers',
  talin: 'Tallahassee Institute Warriors', corga: 'Coral Gables State Storm', soube: 'South Bend Tech Shamrocks',
  cleme: 'Clemson Metropolitan Panthers', winco: 'Winston-Salem College Deacons', blaco: 'Blacksburg College Techies',
  pitun: 'Pittsburgh University Wildcats', atlun: 'Atlanta University Bees', chehi: 'Chestnut Hill Metropolitan Falcons',
  ingst: 'Ingham State Warriors', wasun: 'Washtenaw University Wolves', monun: 'Monroe University Hoosiers',
  lafte: 'West Lafayette Tech Engineers', colte: 'Columbus Tech Bucks', madun: 'Madison University Badgers',
  prige: 'Prince George\'s University Bears', iowci: 'Iowa City College Eagles', chaco1: 'Champaign College Panthers',
  minco: 'Minneapolis College Tigers', evain: 'Evanston Institute Cougars', cenun: 'Centre University Wildcats',
  linin: 'Lincoln Institute Lions', pisun: 'Piscataway University Lions', lexst: 'Lexington State Cougars',
  gaico: 'Gainesville College Swampers', knoun: 'Knoxville University Vols', aubin: 'Auburn Institute Panthers',
  tusco: 'Tuscaloosa College Crimson', fayco: 'Fayetteville College Hogs', batro: 'Baton Rouge Institute Panthers',
  brast: 'Brazos State Farmers', colte1: 'Columbia Tech Panthers', athin: 'Athens Institute Dogs',
  state: 'Starkville Tech Dogs', colte2: 'Columbia Tech Roosters', naste: 'Nashville Tech Admirals',
  oxfst: 'Oxford State Raiders', lawun: 'Lawrence University Hawks', wacst: 'Waco State Bruins',
  lubin: 'Lubbock Institute Raiders', norun: 'Norman University Boomers', morte: 'Morgantown Tech Mountains',
  amete: 'Ames Tech Tornadoes', ausin: 'Austin Institute Horns', stite: 'Stillwater Tech Riders',
  forwo: 'Fort Worth Metropolitan Frogs', manme: 'Manhattan Metropolitan Cougars', losan: 'Los Angeles Tech Bears',
  tucun: 'Tucson University Cougars', eugte: 'Eugene Tech Webfoots', losan1: 'Los Angeles Tech Warriors',
  palal: 'Palo Alto Institute Red', boust: 'Boulder State Buffs', salla: 'Salt Lake City State Red',
  seaun: 'Seattle University Dogs', temin: 'Tempe Institute Devils', corco: 'Corvallis College Dam Builders',
  berme: 'Berkeley Metropolitan Bears', pulte: 'Pullman Tech Wildcats', vilin: 'Villanova Institute Cougars',
  stoin: 'Storrs Institute Dogs', milme: 'Milwaukee Metropolitan Panthers', omaun: 'Omaha University Lions',
  cinin: 'Cincinnati Institute Wolves', souor: 'South Orange Institute Raiders', proun: 'Providence University Monks',
  indst: 'Indianapolis State Dogs', quete: 'Queens Tech Storm', wasst: 'Washington State Bears',
  chime: 'Chicago Metropolitan Demons', houst: 'Houston State Wildcats', cinin1: 'Cincinnati Institute Cats',
  memun: 'Memphis University Panthers', wicco: 'Wichita College Shakers', phime: 'Philadelphia Metropolitan Hooters',
  dalme: 'Dallas Metropolitan Stallions', orlme: 'Orlando Metropolitan Swords', newor: 'New Orleans Institute Waves',
  grete: 'Greenville Tech Raiders', tulin: 'Tulsa Institute Bears', tamin: 'Tampa Institute Horns',
  sandi: 'San Diego Metropolitan Warriors', renme: 'Reno Metropolitan Wolves', boiin: 'Boise Institute Stallions',
  lasve: 'Las Vegas State Runners', logte: 'Logan Tech Farmers', forco: 'Fort Collins College Sheep',
  albco: 'Albuquerque College Wolves', freco: 'Fresno College Dogs', larin: 'Laramie Institute Riders',
  sanjo: 'San Jose State Warriors', colsp: 'Colorado Springs Institute Panthers', dayme: 'Dayton Metropolitan Flyers',
  ricun: 'Richmond University Sheep', davco: 'Davidson College Cougars', stlo: 'St. Louis Metropolitan Bears',
  kinin: 'Kingston Institute Sheep', ricun1: 'Richmond University Webs', stbo: 'St. Bonaventure Metropolitan Bonnies',
  faiin: 'Fairfax Institute Patriots', pitun1: 'Pittsburgh University Dukes', amhun: 'Amherst University Minutemen',
  broin: 'Bronx Institute Sheep', wasst1: 'Washington State Colonials', phime1: 'Philadelphia Metropolitan Explorers',
  phime2: 'Philadelphia Metropolitan Hawks', spoun: 'Spokane University Dogs', morin: 'Moraga Institute Highlanders',
  prost: 'Provo State Wildcats', sanfr: 'San Francisco University Dons', losan2: 'Los Angeles Tech Lions',
  malin: 'Malibu Institute Waves', sancl: 'Santa Clara College Stallions', porco: 'Portland College Aviators',
  stost: 'Stockton State Panthers', sandi1: 'San Diego Metropolitan Matadors', bufst: 'Buffalo State Horns',
  akrco: 'Akron College Wolves', kenst: 'Kent State Eagles', athin1: 'Athens Institute Wildcats',
  tolun: 'Toledo University Tigers', munin: 'Muncie Institute Redbirds', bowgr: 'Bowling Green State Eagles',
  ypsme: 'Ypsilanti Metropolitan Falcons', oxfst1: 'Oxford State Lions', kalun: 'Kalamazoo University Stallions',
  dekme: 'DeKalb Metropolitan Dogs', moupl: 'Mount Pleasant State Hawks', dayme1: 'Dayton Metropolitan Tigers',
  highe: 'Highland Heights College Wolves', rocst: 'Rochester State Panthers', dette: 'Detroit Tech Panthers',
  greba: 'Green Bay Metropolitan Hawks', milme1: 'Milwaukee Metropolitan Wildcats', cleco: 'Cleveland College Panthers',
  youte: 'Youngstown Tech Eagles', chime1: 'Chicago Metropolitan Eagles', indst1: 'Indianapolis State Wildcats',
  mooto: 'Moon Township University Colonials', chime2: 'Chicago Metropolitan Tigers', desmo: 'Des Moines University Dogs',
  peome: 'Peoria Metropolitan Hawks', terha: 'Terre Haute Institute Wolves', sprco: 'Springfield College Bruins',
  valun: 'Valparaiso University Wolves', cedfa: 'Cedar Falls University Wildcats', norun1: 'Normal University Hawks',
  carin: 'Carbondale Institute Panthers', evast: 'Evansville State Wildcats', brote: 'Brookings Tech Wolves',
  tulin1: 'Tulsa Institute Eagles', farte: 'Fargo Tech Tigers', denme1: 'Denver Metropolitan Bears',
  omaun1: 'Omaha University Wildcats', verun: 'Vermillion University Wolves', forwa: 'Fort Wayne Metropolitan Lions',
  macin: 'Macomb Institute Eagles', grafo: 'Grand Forks College Wolves', phote: 'Phoenix Tech Eagles',
  lascr: 'Las Cruces Metropolitan Farmers', orein: 'Orem Institute Wolves', seaun1: 'Seattle University Tigers',
  rivst: 'Riverside State Eagles', stein: 'Stephenville Institute Eagles', ediin: 'Edinburg Institute Wolves',
  stge: 'St. George Tech Lions', chime3: 'Chicago Metropolitan Wildcats', cedci: 'Cedar City Institute Lions',
  abiun: 'Abilene University Cougars', hunco: 'Huntsville College Wildcats', sanba: 'Santa Barbara University Panthers',
  irvst: 'Irvine State Panthers', lonbe: 'Long Beach Metropolitan Eagles', honme: 'Honolulu Metropolitan Wildcats',
  fulst: 'Fullerton State Bears', davst: 'Davis State Farmers', sanlu: 'San Luis Obispo Metropolitan Stallions',
  rivst1: 'Riverside State Wolves', norco: 'Northridge College Hawks', lajo: 'La Jolla University Tigers',
  murin1: 'Murray Institute Tigers', naste1: 'Nashville Tech Bears', claun: 'Clarksville University Bears',
  chain: 'Charleston Institute Wildcats', cooin: 'Cookeville Institute Wildcats', morst: 'Morehead State Falcons',
  jacme: 'Jacksonville Metropolitan Roosters', naste2: 'Nashville Tech Panthers', capgi: 'Cape Girardeau Tech Tigers',
  ricun2: 'Richmond University Panthers', edwte: 'Edwardsville Tech Wildcats', marin: 'Martin Institute Wolves',
  spaco: 'Spartanburg College Tigers', grete1: 'Greensboro Tech Warriors', grete2: 'Greenville Tech Lions',
  johci: 'Johnson City Metropolitan Bears', chaun: 'Chattanooga University Lions', macco: 'Macon College Bruins',
  culco: 'Cullowhee College Wolves', birco1: 'Birmingham College Dogs', chain1: 'Charleston Institute Dogs',
  lexst1: 'Lexington State Tigers', nacin: 'Nacogdoches Institute Eagles', thite: 'Thibodaux Tech Bears',
  abiun1: 'Abilene University Cougars', hamst: 'Hammond State Lions', corch: 'Corpus Christi Tech Bears',
  lakch: 'Lake Charles College Riders', newor1: 'New Orleans Institute Wildcats', beame: 'Beaumont Metropolitan Redbirds',
  natun: 'Natchitoches University Bears', houst2: 'Houston State Dogs', const1: 'Conway State Bruins',
  sanan1: 'San Antonio College Redbirds', stais: 'Staten Island University Tigers', smite: 'Smithfield Tech Dogs',
  noran: 'North Andover State Hawks', emmst: 'Emmitsburg State Mountains', brome: 'Brooklyn Metropolitan Panthers',
  brome1: 'Brooklyn Metropolitan Wildcats', faist: 'Fairfield State Hawks', newbr: 'New Britain Institute Demons',
  teast: 'Teaneck State Swords', lorin: 'Loretto Institute Wolves', rochi: 'Rock Hill State Falcons',
  radin: 'Radford Institute Wolves', buicr: 'Buies Creek Institute Eagles', boisp: 'Boiling Springs Tech Panthers',
  ashme: 'Asheville Metropolitan Dogs', chain2: 'Charleston Institute Wolves', higpo: 'High Point College Wildcats',
  clime: 'Clinton Metropolitan Bears', farst: 'Farmville State Wolves', spaco1: 'Spartanburg College Warriors',
  norst1: 'Norfolk State Warriors', durme1: 'Durham Metropolitan Falcons', balte: 'Baltimore Tech Bruins',
  wasst3: 'Washington State Bears', daybe: 'Daytona Beach Tech Cougars', grete3: 'Greensboro Tech Farmers',
  dovst: 'Dover State Tigers', orain: 'Orangeburg Institute Dogs', balte2: 'Baltimore Tech Falcons',
  prian: 'Princess Anne Tech Hawks', talin1: 'Tallahassee Institute Bears', houst3: 'Houston State Panthers',
  pravi: 'Prairie View Metropolitan Wildcats', grame: 'Grambling Metropolitan Panthers', batro1: 'Baton Rouge Institute Eagles',
  monte: 'Montgomery Tech Bears', jacte: 'Jackson Tech Panthers', lorco: 'Lorman College Panthers',
  pinbl: 'Pine Bluff University Bears', ittbe: 'Itta Bena College Wolves', norun2: 'Normal University Dogs',
  daybe1: 'Daytona Beach Tech Cougars', burco: 'Burlington College Bears', stobr: 'Stony Brook College Bears',
  balte3: 'Baltimore Tech Bears', albin: 'Albany Institute Bears', durme2: 'Durham Metropolitan Cougars',
  wesha: 'West Hartford College Hawks', vesme: 'Vestal Metropolitan Cats', oroun: 'Orono University Panthers',
  lowco: 'Lowell College Lions', lynst: 'Lynchburg State Panthers', naste3: 'Nashville Tech Bears',
  formy: 'Fort Myers Metropolitan Falcons', jacme1: 'Jacksonville Metropolitan Eagles', jacme2: 'Jacksonville Metropolitan Panthers',
  kenin: 'Kennesaw Institute Hooters', delme: 'DeLand Metropolitan Tigers', loume1: 'Louisville Metropolitan Swords',
  const2: 'Conway State Bruins', ricun3: 'Richmond University Panthers', floun: 'Florence University Lions',
  chaco3: 'Charlotte College Eagles', newro: 'New Rochelle University Highlanders', lawin: 'Lawrenceville Institute Panthers',
  weslo: 'West Long Branch State Hawks', bufst1: 'Buffalo State Eagles', loute: 'Loudonville Tech Panthers',
  rivst2: 'Riverdale State Eagles', hamun: 'Hamden University Lions', poume: 'Poughkeepsie Metropolitan Eagles',
  faist1: 'Fairfield State Tigers', lewun: 'Lewiston University Eagles', jerci: 'Jersey City State Panthers',
  troco: 'Troy College Warriors',
  phime3: 'Philadelphia Metropolitan Lions',  // Penn (Ivy)
  mosin: 'Moscow Institute Bears',            // Idaho
  chaco2: 'Charlotte College Wildcats',       // Queens NC
  loute: 'Loudonville Tech Panthers',         // Siena
}

// 2026 CBS seed list 1-64: real team name -> game team ID
// (Game uses fictional names: Durham Metropolitan=Duke, etc.)
const SEED_TO_TEAM_ID: Record<number, ID> = {
  1: 'durme',    // Duke
  2: 'tucun',    // Arizona
  3: 'wasun',    // Michigan
  4: 'gaico',    // Florida
  5: 'houst',    // Houston
  6: 'stoin',    // UConn
  7: 'amete',    // Iowa State
  8: 'lafte',    // Purdue
  9: 'ingst',    // Michigan State
  10: 'chaco1',  // Illinois
  11: 'spoun',   // Gonzaga
  12: 'chaco',   // Virginia
  13: 'linin',   // Nebraska
  14: 'tusco',   // Alabama
  15: 'lawun',   // Kansas
  16: 'fayco',   // Arkansas
  17: 'naste',   // Vanderbilt
  18: 'quete',   // St. John's
  19: 'lubin',   // Texas Tech
  20: 'madun',   // Wisconsin
  21: 'knoun',   // Tennessee
  22: 'carun',   // North Carolina
  23: 'loume',   // Louisville
  24: 'prost',   // BYU
  25: 'lexst',   // Kentucky
  26: 'morin',   // Saint Mary's
  27: 'corga',   // Miami FL
  28: 'losan',   // UCLA
  29: 'cleme',   // Clemson
  30: 'vilin',   // Villanova
  31: 'colte',   // Ohio State
  32: 'athin',   // Georgia
  33: 'logte',   // Utah State
  34: 'forwo',   // TCU
  35: 'stlo',    // Saint Louis
  36: 'iowci',   // Iowa
  37: 'sancl',   // Santa Clara
  38: 'orlme',   // UCF
  39: 'colte1',  // Missouri
  40: 'brast',   // Texas A&M
  41: 'ralin',   // NC State
  42: 'ausin',   // Texas
  43: 'dalme',   // SMU
  44: 'oxfst1',  // Miami OH -> Oxford OH
  45: 'ricun',   // VCU
  46: 'tamin',   // South Florida
  47: 'lakch',   // McNeese
  48: 'akrco',   // Akron
  49: 'cedfa',   // Northern Iowa
  50: 'higpo',   // High Point
  51: 'rivst',   // California Baptist -> Riverside
  52: 'stobr',   // Hofstra -> Stony Brook (NY)
  53: 'troco',   // Troy
  54: 'honme',   // Hawaii
  55: 'farte',   // North Dakota State
  56: 'phime3',  // Penn
  57: 'dayme1',  // Wright State
  58: 'kenin',   // Kennesaw State
  59: 'naste1',  // Tennessee State
  60: 'mosin',   // Idaho
  61: 'spaco',   // Furman
  62: 'chaco2',  // Queens NC
  63: 'loute',   // Siena
  64: 'brome',   // LIU
}

// S-curve: which overall seed goes to which region (East=1, West=2, South=3, Midwest=4)
const REGION_ORDER = ['East', 'West', 'South', 'Midwest'] as const
// Standard NCAA S-curve placement for 16 seeds per region
const SEED_TO_REGION: Record<number, 'East' | 'West' | 'South' | 'Midwest'> = {}
const regionSeeds: Record<string, number[]> = {
  East: [1, 8, 9, 16, 17, 24, 25, 32, 33, 40, 41, 48, 49, 56, 57, 64],
  West: [2, 7, 10, 15, 18, 23, 26, 31, 34, 39, 42, 47, 50, 55, 58, 63],
  South: [3, 6, 11, 14, 19, 22, 27, 30, 35, 38, 43, 46, 51, 54, 59, 62],
  Midwest: [4, 5, 12, 13, 20, 21, 28, 29, 36, 37, 44, 45, 52, 53, 60, 61],
}
for (const [region, seeds] of Object.entries(regionSeeds)) {
  for (let i = 0; i < seeds.length; i++) {
    SEED_TO_REGION[seeds[i]] = region as any
  }
}

function makeTeamState(teamId: ID): TeamState {
  const name = TEAM_NAMES[teamId] ?? teamId
  return {
    teamId,
    name,
    meta: {},
    roster: { playerIds: [], redshirtedPlayerIds: [] },
    season: { wins: 20, losses: 10, confWins: 12, confLosses: 6 },
    rotation: {
      minutesTargetByPlayerId: {},
      depthChart: { PG: [], SG: [], SF: [], PF: [], C: [] },
      settings: { style: 'NORMAL', rotationSizeTarget: 8.5, benchFactor: 0.5, blowoutBenchFactor: 0.3 },
    },
  }
}

function main() {
  const allTeams: TournamentTeam[] = []
  for (let overallSeed = 1; overallSeed <= 64; overallSeed++) {
    const teamId = SEED_TO_TEAM_ID[overallSeed]
    if (!teamId) {
      console.error(`Missing mapping for seed ${overallSeed}`)
      process.exit(1)
    }
    const region = SEED_TO_REGION[overallSeed]
    const seedInRegion = regionSeeds[region].indexOf(overallSeed) + 1
    allTeams.push({
      teamId,
      seed: seedInRegion,
      region,
      isAutobid: seedInRegion === 1,
      resumeScore: 0.8 - overallSeed * 0.01,
      seedScore: 0.9 - overallSeed * 0.012,
    })
  }

  const selection: TournamentSelection = {
    seasonYear: 2026,
    autobids: allTeams.filter(t => t.seed === 1).map(t => ({ teamId: t.teamId, conferenceId: 'acc' })),
    atLarge: allTeams.filter(t => t.seed !== 1).map(t => t.teamId),
    allTeams,
  }

  const bracket = generateBracket(selection, 150)

  const teamsById: Record<ID, TeamState> = {}
  for (const t of allTeams) {
    teamsById[t.teamId] = makeTeamState(t.teamId)
  }

  const dynasty: Dynasty = {
    saveVersion: DYNASTY_SAVE_VERSION,
    dynastyId: `2026-bracket-${Date.now()}`,
    createdAtISO: new Date().toISOString(),
    lastSavedAtISO: new Date().toISOString(),
    rng: { seed: 20260315, state: 20260315 },
    world: { seasonYear: 2026, phase: 'POSTSEASON', day: 150 },
    coach: {
      coachId: 'film-mode',
      name: 'Film Mode',
      scheme: 'BALANCED',
      careerStats: { seasonsCoached: 1, totalWins: 0, totalLosses: 0, averagePrestige: 0, currentPrestigeTier: 'MID_TIER', yearsAtCurrentSchool: 1 },
      meta: {},
    },
    league: {
      userTeamId: 'durme',
      teamsById,
      gamesById: {},
      standingsBySeason: {},
      tournament: bracket,
    },
    recruiting: { seasonYear: 2026, recruitPool: {}, boardsByTeamId: {}, competitionByRecruitId: {} },
    playersById: {},
  }

  const json = JSON.stringify(dynasty, null, 2)
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/data')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'dynasty-2026-bracket.json')
  writeFileSync(outPath, json, { encoding: 'utf8' })
  console.log('Wrote', outPath)
}

main()
