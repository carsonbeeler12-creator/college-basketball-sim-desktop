# Ranking & Tournament System - Code Reference Guide

## Quick Lookup: File Locations

### Tournament Selection & Seeding
| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `selectTournament()` | `src/game/engine/tournament/selectTournament.ts` | 306-336 | Main entry point - orchestrates entire selection process |
| `getConferenceChampions()` | `src/game/engine/tournament/selectTournament.ts` | 54-131 | Determines autobids from conference standings |
| `calculateResumeScore()` | `src/game/engine/tournament/selectTournament.ts` | 133-167 | Calculates resume score for at-large selection |
| `selectAtLargeTeams()` | `src/game/engine/tournament/selectTournament.ts` | 171-201 | Selects remaining teams for tournament |
| `getTeamRatingNormalized()` | `src/game/engine/tournament/selectTournament.ts` | 38-49 | Gets team rating (or prestige fallback) |
| `seedAndPlaceTeams()` | `src/game/engine/tournament/selectTournament.ts` | 207-289 | S-curve seeding and regional placement |

### Bracket Generation
| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `generateBracket()` | `src/game/engine/tournament/generateBracket.ts` | 58-275 | Converts tournament selection into full bracket |
| `initializeTournament()` | `src/game/engine/tournament/initializeTournament.ts` | 1-32 | Entry point called when regular season ends |

### Team Rating & Game Simulation
| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `precomputeTeamData()` | `src/game/engine/sim/simWorker.ts` | 94-180 | Calculates offensiveRating & defensiveRating |
| `calculateTeamStrength()` | `src/game/engine/sim/simGame_v0.ts` | 374-392 | Weighted average of player ratings by minutes |

### Types & Structures
| Type | File | Lines | Definition |
|------|------|-------|-----------|
| `TournamentTeam` | `src/game/engine/tournament/selectTournament.ts` | 17-26 | Team record with seed, region, scores |
| `TournamentSelection` | `src/game/engine/tournament/selectTournament.ts` | 28-32 | Results of tournament selection |
| `TeamState` | `src/game/types/dynasty.ts` | 120-160 | Team data including `season` with `teamRating` |
| `BracketGame` | `src/game/engine/tournament/generateBracket.ts` | 5-24 | Single tournament game record |
| `TournamentBracket` | `src/game/engine/tournament/generateBracket.ts` | 26-35 | Full bracket structure with games |

---

## Code Examples: Key Functions

### 1. selectTournament() - Main Entry Point

```typescript
// Location: src/game/engine/tournament/selectTournament.ts:306-336
export function selectTournament(dynasty: Dynasty): TournamentSelection {
  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `tournament_${dynasty.world.seasonYear}`) >>> 0 }

  // Step 1: Autobids
  const autobids = getConferenceChampions(dynasty, rng)
  const autobidTeamIds = new Set(autobids.map(a => a.teamId))

  // Step 2: At-Large
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
```

**Key Decisions:**
- Takes full `Dynasty` object as input
- Uses RNG seeded by season year for deterministic randomness
- Returns 64 teams with seeds and regional assignments
- Combines autobids + at-large with seeding

---

### 2. calculateResumeScore() - At-Large Selection Metric

```typescript
// Location: src/game/engine/tournament/selectTournament.ts:133-167
function calculateResumeScore(
  teamId: ID,
  teamState: typeof dynasty.league.teamsById[ID],
  dynasty: Dynasty
): number {
  // Use teamState.season for regular season record
  const wins = teamState?.season?.wins ?? 0
  const losses = teamState?.season?.losses ?? 0
  const totalGames = wins + losses
  
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
```

**Formula Breakdown:**
- 55% overall record: Emphasizes full season strength
- 25% conference record: Values tougher conference competition
- 20% team rating: Uses prestige or calculated rating

**Returns:** 0-1 value representing team strength for at-large consideration

---

### 3. seedAndPlaceTeams() - S-Curve Distribution

```typescript
// Location: src/game/engine/tournament/selectTournament.ts:207-289
function seedAndPlaceTeams(
  dynasty: Dynasty,
  selectedTeams: Array<{ teamId: ID; isAutobid: boolean; resumeScore: number }>
): TournamentTeam[] {
  // ...validation...

  // Calculate Seed Score: (teamRatingNormalized * 0.50) + (resumeScore * 0.50)
  const scoredTeams = selectedTeams.map(t => {
    const rating = getTeamRatingNormalized(t.teamId, dynasty)
    const seedScore = (rating * 0.50) + (t.resumeScore * 0.50)
    const conferenceId = dynasty.league.teamsById[t.teamId]?.meta?.conferenceId as string | undefined
    return { ...t, seedScore, conferenceId }
  })

  // Sort descending by seedScore
  scoredTeams.sort((a, b) => b.seedScore - a.seedScore)

  const finalTeams: TournamentTeam[] = []
  const regions: Array<'South' | 'West' | 'Midwest' | 'East'> = ['South', 'West', 'Midwest', 'East']

  // S-Curve Placement: 16 seed lines, 4 teams per line
  for (let seedLine = 1; seedLine <= 16; seedLine++) {
    const startIndex = (seedLine - 1) * 4
    const teamsInLine = scoredTeams.slice(startIndex, startIndex + 4)
    
    // Alternate direction for balance
    const isReversed = seedLine % 2 === 0
    
    for (let idx = 0; idx < 4; idx++) {
      const team = teamsInLine[idx]
      const regionIdx = isReversed ? (3 - idx) : idx
      const region = regions[regionIdx] as 'South' | 'West' | 'Midwest' | 'East'
      
      if (team) {
        finalTeams.push({
          teamId: team.teamId,
          seed: seedLine,
          region,
          isAutobid: team.isAutobid,
          conferenceId: team.conferenceId,
          resumeScore: team.resumeScore,
          seedScore: team.seedScore
        })
      }
    }
  }

  return finalTeams
}
```

**S-Curve Logic:**
- Top 4 teams distributed one per region
- Then next 4 distributed in reverse order (prevents clustering)
- Creates balanced strength across 4 regions
- Returns TournamentTeam[] with seed (1-16) and region assigned

---

### 4. getTeamRatingNormalized() - Rating Lookup (Currently Broken)

```typescript
// Location: src/game/engine/tournament/selectTournament.ts:38-49
function getTeamRatingNormalized(teamId: ID, dynasty: Dynasty): number {
  const teamState = dynasty.league.teamsById[teamId]
  if (teamState?.season?.teamRating) {
    return teamState.season.teamRating / 100 // Assume 0-100 scale
  }
  
  // Fallback to prestige from static data
  const staticTeam = TEAMS.find(t => t.id === teamId)
  return (staticTeam?.prestige ?? 50) / 100
}
```

**Current Behavior:**
- Tries to use `teamState.season.teamRating` (never set!)
- Falls back to static prestige from TEAMS array
- So **effectively always returns prestige/100**

**Problem:** `teamRating` is never populated during season, so prestige is always used (static, unchanging)

---

### 5. generateBracket() - Creates Tournament Structure

```typescript
// Location: src/game/engine/tournament/generateBracket.ts:55-275
export function generateBracket(selection: TournamentSelection, startDay: number): TournamentBracket {
  const games: BracketGame[] = []
  let gameIdCounter = 0
  let currentDay = startDay

  // Group teams by region and sort by seed
  const teamsByRegion = {
    East: selection.allTeams.filter(t => t.region === 'East').sort((a, b) => a.seed - b.seed),
    West: selection.allTeams.filter(t => t.region === 'West').sort((a, b) => a.seed - b.seed),
    South: selection.allTeams.filter(t => t.region === 'South').sort((a, b) => a.seed - b.seed),
    Midwest: selection.allTeams.filter(t => t.region === 'Midwest').sort((a, b) => a.seed - b.seed),
  }

  // Round of 64 matchups for each region
  const ROUND_OF_64_MATCHUPS: Array<[number, number]> = [
    [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
  ]

  // [... rest of bracket generation ...]
}
```

**Process:**
- Takes TournamentSelection (64 seeded teams)
- Groups by region
- Creates matchups using NCAA tournament seed line format
- Generates games for all 7 rounds
- Returns TournamentBracket with all games templated (not yet played)

---

## Data Structures: Field Reference

### TournamentTeam (What Gets Seeded)
```typescript
type TournamentTeam = {
  teamId: ID                               // Team identifier
  seed: number                             // 1-16 within region
  region: 'East' | 'West' | 'South' | 'Midwest'
  isAutobid: boolean                       // Conference champion?
  conferenceId?: string                    // Which conference
  resumeScore: number                      // 0-1 at-large metric
  seedScore: number                        // 0-1 final seeding metric
}
```

### TournamentSelection (Output of selectTournament)
```typescript
type TournamentSelection = {
  seasonYear: number
  autobids: Array<{ teamId: ID; conferenceId: string }>  // 32 teams
  atLarge: ID[]                                           // ~32 teams
  allTeams: TournamentTeam[]                              // 64 with seeds
}
```

### BracketGame (Individual Game)
```typescript
type BracketGame = {
  gameId: ID
  round: 'First Four' | 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarter-Finals' | 'Semi-Finals' | 'Championship'
  region?: 'East' | 'West' | 'South' | 'Midwest'  // null for finals
  gameNumber: number                          // Order within round
  team1Id: ID | null                          // null = TBD
  team2Id: ID | null
  winnerId: ID | null
  score1: number | null
  score2: number | null
  day: number
}
```

### TeamState.season (Where Team Data Stored)
```typescript
season: {
  wins: number
  losses: number
  confWins: number
  confLosses: number
  teamRating?: number  // ← DEFINED BUT NEVER USED
}
```

---

## Calculation Formulas Reference

### Formula 1: Resume Score (At-Large Selection)
```
resumeScore = (winPct × 0.55) + (confWinPct × 0.25) + (rating × 0.20)

where:
  winPct = wins / (wins + losses)
  confWinPct = confWins / (confWins + confLosses)
  rating = teamState.season.teamRating / 100  [or prestige/100 as fallback]

Result: 0-1 value
```

### Formula 2: Seed Score (Tournament Seeding)
```
seedScore = (rating × 0.50) + (resumeScore × 0.50)

where:
  rating = getTeamRatingNormalized() [0-1]
  resumeScore = calculated above [0-1]

Result: 0-1 value (higher = better seed)
```

### Formula 3: Game Strength (Simulation Only - not for seeding)
```
offensiveRating = Σ(playerOverall × minutes) / Σ(minutes)
defensiveRating = Σ(playerOverall × minutes) / Σ(minutes)  [currently same]

Used in:
  homePPP = 0.95 + (homeOffStrength - awayDefStrength) × 0.006 + variance
```

---

## Control Flow: Tournament Initialization to Bracket Ready

```
1. Season ends → advanceToOffseason() called

2. Tournament selection triggered
   └─→ initializeTournament(dynasty)
       ├─→ Calls selectTournament(dynasty)
       │   ├─→ getConferenceChampions()        [32 autobids]
       │   ├─→ selectAtLargeTeams()            [~32 at-large]
       │   └─→ seedAndPlaceTeams()             [S-curve distribution]
       │       └─→ Returns TournamentSelection
       │
       ├─→ Calls generateBracket(selection)
       │   └─→ Returns TournamentBracket (63 games, all templated)
       │
       └─→ Updates dynasty.league.tournament = bracket
           Returns updated dynasty

3. Bracket ready for simulation
   └─→ simulateTournament() processes games round-by-round
```

---

## TODO: Points for Enhancement

### High Priority (Immediate Impact)
- [ ] **Populate teamRating during season** in `applyGameToSeasonStats.ts`
  - Location: `src/game/engine/stats/applyGameToSeasonStats.ts`
  - Current: Never updates `teamState.season.teamRating`
  - Action: Calculate after each game, store in `teamRating` field

- [ ] **Add point differential to resume score**
  - Location: `calculateResumeScore()` in `selectTournament.ts`
  - Current: Uses only W-L records
  - Action: Add `(pointDiff / maxPossible * 0.10)` to weighting

### Medium Priority (Realism)
- [ ] **Implement SOS calculation**
  - Location: New function in `selectTournament.ts`
  - Calculate: Average opponent win percentage
  - Use: As tiebreaker in seeding

- [ ] **Add RPI calculation**
  - Location: New function in `selectTournament.ts`
  - Formula: 25% own record + 50% opponent records + 25% opponent's opponent
  - Use: Alternative ranking metric displayed to user

### Lower Priority (Nice to Have)
- [ ] **National rankings before tournament**
  - Location: New function in `tournament/` folder
  - Display: Show all teams ranked 1-350+ before tournament

- [ ] **Dynamic prestige adjustment**
  - Location: `advanceToOffseason.ts`
  - Based on: Tournament performance, conference championships

---

## Debug Checklist

When troubleshooting tournament seeding:

- [ ] **Is `getConferenceChampions()` returning 32 teams?**
  - Check conference tournament bracket exists
  - Check fallback to regular season standings

- [ ] **Are resume scores calculated correctly?**
  - Verify `calculateResumeScore()` receives correct W-L stats
  - Check team rating is being fetched (or using prestige)

- [ ] **Are all 64 teams being seeded?**
  - Verify autobids + at-large = 64
  - Check `seedAndPlaceTeams()` doesn't drop teams

- [ ] **Is S-curve distribution working?**
  - Each region should have exactly 16 teams
  - Seeds should be 1-16 in each region
  - No two same-seed teams should be in same region

- [ ] **Are bracket matchups correct?**
  - #1 vs #16, #8 vs #9, etc. in Round of 64
  - Winners placed in next round positions
  - All 63 games created

---

## Quick Access: Test Files

Located in `scripts/`:
- `test-season-flow-lite.ts` - Full season simulation with tournament
- `test-tournament-population.ts` - Tournament selection verification
- `test-season-flow.ts` - Extended testing

These test files can be run to verify tournament logic works correctly.
