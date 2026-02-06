# Ranking System Implementation Roadmap

## Current State Assessment

### ✅ What's Working
- Tournament selection logic (autobids + at-large)
- S-curve seeding distribution
- Full bracket generation for 64 teams
- Game simulation with strength calculations
- Recruiting rankings (separate system)

### ❌ What's Broken
- `teamRating` field never populated (always undefined)
- No strength of schedule calculation
- No RPI or advanced metrics
- No dynamic prestige system
- No national rankings display
- All wins treated equally

### Result
Teams' tournament seeding **never improves during season** because it always falls back to static prestige value.

---

## Phase 1: Fix Team Rating (CRITICAL - 1 hour)

### Objective
Make team rating update during the season so tournament seeding responds to actual performance.

### Implementation

#### Step 1: Create Rating Calculation Function
**File:** `src/game/engine/stats/seasonStats.ts`

Add after line 20 (after imports):

```typescript
/**
 * Calculate team rating based on game performance.
 * Uses weighted average of offensive and defensive efficiency.
 * 
 * Range: 0-100 scale
 * 50 = average college team
 * 75+ = tournament contender
 * 85+ = national contender
 */
export function calculateTeamRating(
  teamStats: TeamSeasonTotals,
  teamState: TeamState,
  dynasty: Dynasty
): number {
  const rosterIds = teamState.roster?.playerIds ?? []
  const players = rosterIds
    .map(pid => dynasty.playersById[pid])
    .filter(p => p && p.ratings?.overall)

  if (players.length === 0) return 50; // No roster = average

  // Average player rating (main indicator of team strength)
  const avgPlayerRating = players.reduce((sum, p) => sum + (p.ratings.overall || 0), 0) / players.length

  // Adjust for win percentage (overperforming or underperforming expectations)
  const games = (teamStats.wins || 0) + (teamStats.losses || 0)
  if (games > 0) {
    const winPct = (teamStats.wins || 0) / games
    const expectedWinPct = (avgPlayerRating - 50) / 25 * 0.5 + 0.5 // 50 rating = 50% expected
    const adjustmentFactor = Math.max(0.9, Math.min(1.1, winPct / expectedWinPct))
    
    return Math.round(Math.max(30, Math.min(99, avgPlayerRating * adjustmentFactor)))
  }

  return Math.round(avgPlayerRating)
}
```

#### Step 2: Update Team Rating After Each Game
**File:** `src/game/engine/stats/applyGameToSeasonStats.ts`

Find the section where team stats are updated (around line 80-100) and add:

```typescript
// After updating seasonStats, update team rating
if (dy.league.teamsById[homeTeamId]) {
  dy.league.teamsById[homeTeamId].season.teamRating = calculateTeamRating(
    seasonStats.teamsById[homeTeamId] || emptyTeamSeasonTotals(),
    dy.league.teamsById[homeTeamId],
    dy
  )
}

if (dy.league.teamsById[awayTeamId]) {
  dy.league.teamsById[awayTeamId].season.teamRating = calculateTeamRating(
    seasonStats.teamsById[awayTeamId] || emptyTeamSeasonTotals(),
    dy.league.teamsById[awayTeamId],
    dy
  )
}
```

#### Step 3: Import the Function
**File:** `src/game/engine/stats/applyGameToSeasonStats.ts`

Add to imports at top:
```typescript
import { calculateTeamRating } from './seasonStats'
```

#### Step 4: Initialize Team Rating on Season Start
**File:** `src/game/engine/development/advanceToOffseason.ts`

When advancing to new season, initialize teamRating:
```typescript
// When resetting season stats
teamState.season = {
  wins: 0,
  losses: 0,
  confWins: 0,
  confLosses: 0,
  teamRating: undefined // Will be set after first game
}
```

### Testing

```typescript
// In src/scripts/test-tournament.ts
import { calculateTeamRating } from '@/game/engine/stats/seasonStats'

// After first few games, check:
const rating = dynasty.league.teamsById['team-id'].season.teamRating
console.log(`Team rating: ${rating}`) // Should be ~30-99, not undefined
```

**Expected Result:**
- Teams with better players = higher rating
- Teams winning more games = higher adjustments
- Teams overperforming expectations = bonus
- Teams underperforming = penalty

---

## Phase 2: Improve Resume Score (2 hours)

### Objective
Add point differential and begin strength of schedule to seeding calculations.

### Implementation

#### Step 1: Add Point Tracking
**File:** `src/game/types/dynasty.ts` (around line 143)

Modify TeamState.season:
```typescript
season: {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  teamRating?: number;
  
  // NEW FIELDS
  pointsFor?: number;         // Total points scored
  pointsAgainst?: number;     // Total points allowed
};
```

#### Step 2: Update Point Totals After Games
**File:** `src/game/engine/stats/applyGameToSeasonStats.ts`

When applying game results:
```typescript
// Add to team stats updates
teamState.season.pointsFor = (teamState.season.pointsFor ?? 0) + homeScore
teamState.season.pointsAgainst = (teamState.season.pointsAgainst ?? 0) + awayScore

// Similar for away team
```

#### Step 3: Calculate SOS (Strength of Schedule)
**File:** `src/game/engine/tournament/selectTournament.ts`

Add new function before `selectAtLargeTeams()`:

```typescript
/**
 * Calculate strength of schedule (average opponent win percentage)
 */
function calculateStrengthOfSchedule(
  teamId: ID,
  dynasty: Dynasty
): number {
  // For now, simple approximation: average of conference teams' records
  const team = dynasty.league.teamsById[teamId]
  const confId = team?.meta?.conferenceId
  
  if (!confId) return 0.5 // Neutral SOS
  
  let oppWinPct = 0
  let count = 0
  
  for (const [otherId, otherTeam] of Object.entries(dynasty.league.teamsById)) {
    if (otherId === teamId) continue
    if (otherTeam?.meta?.conferenceId !== confId) continue
    
    const wins = otherTeam?.season?.wins ?? 0
    const losses = otherTeam?.season?.losses ?? 0
    const total = wins + losses
    
    if (total > 0) {
      oppWinPct += wins / total
      count++
    }
  }
  
  return count > 0 ? oppWinPct / count : 0.5
}
```

#### Step 4: Update Resume Score Formula
**File:** `src/game/engine/tournament/selectTournament.ts`

Modify `calculateResumeScore()`:

```typescript
function calculateResumeScore(
  teamId: ID,
  teamState: typeof dynasty.league.teamsById[ID],
  dynasty: Dynasty
): number {
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
  
  // NEW: Point differential
  const pointsFor = teamState?.season?.pointsFor ?? 0
  const pointsAgainst = teamState?.season?.pointsAgainst ?? 0
  const pointDiff = pointsFor - pointsAgainst
  const avgMargin = totalGames > 0 ? pointDiff / totalGames : 0
  const pointDiffNormalized = Math.max(-1, Math.min(1, avgMargin / 20)) // -20 to +20 pt margin → -1 to +1
  
  // NEW: Strength of schedule
  const sos = calculateStrengthOfSchedule(teamId, dynasty)

  // Updated formula: 50% record, 15% conf, 15% rating, 10% SOS, 10% point diff
  return (winPct * 0.50) 
    + (confWinPct * 0.15) 
    + (rating * 0.15)
    + (sos * 0.10)
    + (Math.max(0, pointDiffNormalized) * 0.10)
}
```

### Testing

```typescript
// Verify different teams get different scores
const team1Score = calculateResumeScore('duke', dynasty.league.teamsById['duke'], dynasty)
const team2Score = calculateResumeScore('maine', dynasty.league.teamsById['maine'], dynasty)
console.log(`Duke: ${team1Score}, Maine: ${team2Score}`)
// Should have meaningful difference
```

---

## Phase 3: National Rankings System (3-4 hours)

### Objective
Generate and display full ranking of all teams before tournament.

### Implementation

#### Step 1: Create Rankings Function
**File:** `src/game/engine/tournament/generateRankings.ts` (new file)

```typescript
import type { Dynasty, ID } from '../../types/dynasty'
import { calculateResumeScore, calculateStrengthOfSchedule } from './selectTournament'

export type TeamRanking = {
  rank: number
  teamId: ID
  teamName: string
  record: string
  confRecord: string
  rating: number
  resumeScore: number
  sos: number
  pointDiff: number
}

export function generateNationalRankings(dynasty: Dynasty): TeamRanking[] {
  const rankings: Array<TeamRanking & { teamState: any }> = []

  for (const [teamId, teamState] of Object.entries(dynasty.league.teamsById)) {
    if (!teamState) continue

    const teamName = /* get team name from TEAMS */ ''
    const wins = teamState.season?.wins ?? 0
    const losses = teamState.season?.losses ?? 0
    const confWins = teamState.season?.confWins ?? 0
    const confLosses = teamState.season?.confLosses ?? 0
    const rating = teamState.season?.teamRating ?? 50

    const resumeScore = calculateResumeScore(teamId, teamState, dynasty)
    const sos = calculateStrengthOfSchedule(teamId, dynasty)
    const pointDiff = (teamState.season?.pointsFor ?? 0) - (teamState.season?.pointsAgainst ?? 0)

    rankings.push({
      rank: 0, // Assigned after sorting
      teamId,
      teamName,
      record: `${wins}-${losses}`,
      confRecord: `${confWins}-${confLosses}`,
      rating,
      resumeScore,
      sos,
      pointDiff,
      teamState
    })
  }

  // Sort by resume score (descending)
  rankings.sort((a, b) => b.resumeScore - a.resumeScore)

  // Assign ranks
  return rankings.map((team, idx) => ({
    ...team,
    rank: idx + 1
  }))
}
```

#### Step 2: Add to Tournament Initialization
**File:** `src/game/engine/tournament/initializeTournament.ts`

```typescript
import { generateNationalRankings } from './generateRankings'

export function initializeTournament(dynasty: Dynasty): Dynasty {
  // ...existing code...

  // NEW: Generate national rankings before tournament
  const rankings = generateNationalRankings(dynasty)

  return {
    ...dynasty,
    league: {
      ...dynasty.league,
      nationalRankings: rankings, // Store in dynasty
      tournament: bracket,
    },
    world: {
      ...dynasty.world,
      phase: 'POSTSEASON',
    },
  }
}
```

#### Step 3: Display in UI
**File:** `src/ui/screens/StandingsScreen.tsx` or new `RankingsScreen.tsx`

```typescript
export function RankingsDisplay({ rankings }: { rankings: TeamRanking[] }) {
  return (
    <div className="rankings-table">
      <h2>National Rankings</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Record</th>
            <th>Conf</th>
            <th>Rating</th>
            <th>Resume</th>
            <th>SOS</th>
            <th>Pt Diff</th>
          </tr>
        </thead>
        <tbody>
          {rankings.slice(0, 50).map(team => (
            <tr key={team.teamId}>
              <td>{team.rank}</td>
              <td>{team.teamName}</td>
              <td>{team.record}</td>
              <td>{team.confRecord}</td>
              <td>{team.rating.toFixed(1)}</td>
              <td>{team.resumeScore.toFixed(3)}</td>
              <td>{team.sos.toFixed(3)}</td>
              <td>{team.pointDiff}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## Phase 4: RPI Implementation (Optional - 2 hours)

### Objective
Implement RPI as alternative ranking metric.

### Implementation

```typescript
// File: src/game/engine/tournament/selectTournament.ts

function calculateRPI(
  teamId: ID,
  dynasty: Dynasty
): number {
  const team = dynasty.league.teamsById[teamId]
  const wins = team?.season?.wins ?? 0
  const losses = team?.season?.losses ?? 0
  const totalGames = wins + losses
  
  if (totalGames === 0) return 0.5

  // Own winning percentage
  const winPct = wins / totalGames

  // Opponent average winning percentage
  let oppWinTotal = 0
  let oppWinCount = 0
  
  // This would need game-level tracking which doesn't exist yet
  // For now, approximate from conference
  const confId = team?.meta?.conferenceId
  if (confId) {
    for (const [_, otherTeam] of Object.entries(dynasty.league.teamsById)) {
      if (otherTeam?.meta?.conferenceId === confId && otherTeam.season) {
        const oWins = otherTeam.season.wins ?? 0
        const oLosses = otherTeam.season.losses ?? 0
        const oTotal = oWins + oLosses
        if (oTotal > 0) {
          oppWinTotal += oWins / oTotal
          oppWinCount++
        }
      }
    }
  }
  
  const oppWinPct = oppWinCount > 0 ? oppWinTotal / oppWinCount : 0.5

  // NOTE: Opponent's Opponent would require tracking games
  // For now, approximate as average of all teams
  let ooppWinTotal = 0
  let ooppWinCount = 0
  for (const [_, t] of Object.entries(dynasty.league.teamsById)) {
    if (t?.season) {
      const oWins = t.season.wins ?? 0
      const oLosses = t.season.losses ?? 0
      const oTotal = oWins + oLosses
      if (oTotal > 0) {
        ooppWinTotal += oWins / oTotal
        ooppWinCount++
      }
    }
  }
  const ooppWinPct = ooppWinCount > 0 ? ooppWinTotal / ooppWinCount : 0.5

  // RPI Formula: 25% own + 50% opponent + 25% opponent's opponent
  return (winPct * 0.25) + (oppWinPct * 0.50) + (ooppWinPct * 0.25)
}
```

---

## Implementation Sequence

### Week 1: Phase 1 (Critical Fix)
- [ ] Day 1-2: Add `calculateTeamRating()` function
- [ ] Day 2-3: Update `applyGameToSeasonStats.ts`
- [ ] Day 3: Test and verify teamRating updates
- **Result:** Tournament seeding responds to season performance

### Week 2: Phase 2 (Improved Seeding)
- [ ] Day 1: Add point tracking fields
- [ ] Day 2: Implement SOS calculation
- [ ] Day 3: Update resume score formula
- [ ] Day 4: Test with various team scenarios
- **Result:** Better tournament seeding using SOS and point differential

### Week 3: Phase 3 (Display)
- [ ] Day 1-2: Create `generateRankings.ts`
- [ ] Day 2-3: Update tournament initialization
- [ ] Day 3-4: Create UI component
- [ ] Day 5: Display rankings pre-tournament
- **Result:** Users see full national rankings before tournament

### Week 4: Phase 4 (Polish)
- [ ] Implement RPI if desired
- [ ] Add more UI tweaks
- [ ] Test edge cases
- **Result:** Full ranking system complete

---

## Testing Checklist

### Phase 1 Tests
- [ ] Teams with better rosters get higher ratings
- [ ] Team rating updates after each game
- [ ] Winning games increases rating (with good roster)
- [ ] Losing games with good roster still shows rating
- [ ] Tournament seeding reflects season ratings

### Phase 2 Tests
- [ ] Point differential properly tracked
- [ ] SOS calculation works
- [ ] Teams with tough schedules get credit
- [ ] Resume scores are different from before
- [ ] Better teams still seed higher

### Phase 3 Tests
- [ ] Rankings generated before tournament
- [ ] Top 25 teams are recognizable
- [ ] Multiple ranking pages work (1-25, 26-50, etc.)
- [ ] UI displays cleanly

### Phase 4 Tests
- [ ] RPI calculation matches formulas
- [ ] RPI and resume score sometimes differ
- [ ] No crashes or undefined values

---

## Success Criteria

### Phase 1: CRITICAL
- ✅ `teamRating` field populated and updating
- ✅ Tournament seeding uses dynamic rating
- ✅ Better rosters = higher seeds

### Phase 2: HIGH
- ✅ Point differential affects seeding
- ✅ Teams with tough schedules rewarded
- ✅ Resume score more sophisticated

### Phase 3: MEDIUM
- ✅ Users see why teams are seeded
- ✅ Rankings make sense to them
- ✅ More immersive experience

### Phase 4: POLISH
- ✅ Multiple ranking methods available
- ✅ System feels complete
- ✅ Matches real NCAA sophistication

---

## Git Commit Messages

```
Phase 1:
  git commit -m "feat: populate team rating from season performance"
  git commit -m "fix: tournament seeding now responds to actual play"

Phase 2:
  git commit -m "feat: add point differential tracking"
  git commit -m "feat: implement strength of schedule calculation"
  git commit -m "feat: improve resume score with SOS and point diff"

Phase 3:
  git commit -m "feat: generate national rankings before tournament"
  git commit -m "feat: add rankings UI display"

Phase 4:
  git commit -m "feat: implement RPI calculation"
  git commit -m "polish: complete ranking system"
```

---

## Expected User Impact

### Before Implementation
- Team seeding doesn't change based on performance
- Small schools can't upset big teams in tournament
- Prestige is everything, wins don't matter
- No visibility into seeding rationale

### After Phase 1 (Critical)
- ✅ Playing better improves tournament chances
- ✅ Good rosters = better seeding
- ✅ Season outcomes matter!

### After Phase 2 (Improved)
- ✅ Strength of schedule recognized
- ✅ Point differential matters
- ✅ More nuanced seeding

### After Phase 3 (Display)
- ✅ Users see full rankings
- ✅ Can compare to real NCAA
- ✅ Understand seeding

### After Phase 4 (Complete)
- ✅ Multiple ranking methods
- ✅ NCAA-level sophistication
- ✅ Full immersion

---

This roadmap provides a clear path from broken to best-in-class ranking system. Start with Phase 1 to fix the critical issue, then expand as desired.
