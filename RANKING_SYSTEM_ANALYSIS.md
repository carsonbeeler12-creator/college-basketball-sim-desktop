# College Basketball Dynasty Sim - Ranking & Tournament System Analysis

## Executive Summary

The college basketball simulator has a **basic but functional tournament selection and seeding system**, but **NO dedicated ranking system** (RPI, power rankings, strength of schedule, etc.). Teams are seeded for tournament purposes only, using a simple weighted formula combining team rating and resume score.

---

## Current Systems Found

### 1. **Tournament Seeding System** ✅
**Location:** [`src/game/engine/tournament/selectTournament.ts`](src/game/engine/tournament/selectTournament.ts)

#### How It Works:

**Step 1: Autobids (Conference Champions)**
- Takes conference tournament champion if one exists
- Falls back to conference regular season champion (by conference record)
- Tie-breakers: Head-to-head (not tracked), Point differential (not tracked), Team rating/prestige

**Step 2: At-Large Selection**
- Candidates ranked by "Resume Score"
- Formula: `(winPct * 0.55) + (confWinPct * 0.25) + (teamRatingNormalized * 0.20)`
  - **55%**: Overall win percentage
  - **25%**: Conference win percentage  
  - **20%**: Team rating (normalized to 0-1)
- Top candidates fill remaining slots to reach 64 teams

**Step 3: S-Curve Seeding & Regional Placement**
- All 64 selected teams are scored: `(teamRatingNormalized * 0.50) + (resumeScore * 0.50)`
  - **50%**: Team rating
  - **50%**: Resume score
- Sorted descending by seed score
- Distributed into 4 regions (16 teams each) using "S-curve" format:
  - Seed line 1-16 places 4 teams (one per region)
  - Odd lines: South, West, Midwest, East order
  - Even lines: Reversed (East, Midwest, West, South)
  - This prevents clustering of top teams in one region

**Example:**
```
Seed Line 1: Team A→South, Team B→West, Team C→Midwest, Team D→East
Seed Line 2: Team E→East, Team F→Midwest, Team G→West, Team H→South
```

#### Code Location & Key Functions:
- `getTeamRatingNormalized()` - Gets team rating (0-1 scale) or prestige fallback
- `calculateResumeScore()` - Weights win records and team rating
- `selectAtLargeTeams()` - Picks remaining 31+ teams
- `seedAndPlaceTeams()` - Applies S-curve seeding

---

### 2. **Team Rating System** ⚠️ Minimal
**Location:** [`src/game/types/dynasty.ts`](src/game/types/dynasty.ts#L143) (line 143)

**Current State:**
- Teams have optional `teamRating` field (0-100 scale)
- **Initialized to `undefined`** in `generateLeague.ts`
- **Never calculated during regular season** (as of analysis)
- **Only used as fallback** - if missing, prestige/100 is used instead

**Problem:** The teamRating is defined but essentially unused. Teams currently rely on prestige (static team strength) rather than dynamic seasonal performance.

**Related Code:**
```typescript
// In dynasty.ts type definition
season: {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  teamRating?: number;  // Defined but not used
};
```

---

### 3. **Game Simulation Strength Calculation** ✅
**Location:** [`src/game/engine/sim/simWorker.ts`](src/game/engine/sim/simWorker.ts) & [`src/game/engine/sim/simGame_v0.ts`](src/game/engine/sim/simGame_v0.ts#L374-L392)

**How It Works:**
- Teams have `offensiveRating` and `defensiveRating` computed per game day
- Calculated as **weighted average of player overall ratings** by minutes played
- Formula: `strength = Σ(playerOverall * minutes) / Σ(minutes)`

**Usage in Game Sim:**
```typescript
const homeOffStrength = homeData.offensiveRating
const homeDefStrength = homeData.defensiveRating
const homePPP = 0.95 + (homeOffStrength - awayDefStrength) * 0.006 + variance
```

**Limitations:**
- Based purely on player ratings, not actual performance
- No history weighting (recency bias)
- No efficiency metrics (PPP, FG%, 3P%, defensive efficiency)
- No strength of schedule factoring in

---

### 4. **Recruiting Rankings** ✅
**Location:** [`src/game/engine/recruiting/generateRecruitPool.ts`](src/game/engine/recruiting/generateRecruitPool.ts)

**Current System:**
- Top 100 recruits assigned `rank: 1-100`
- Below top 100 have no rank
- Used to break ties in recruiting priorities
- Quality bands (ELITE, HIGH, MID, LOW, GARBAGE) based on rank + star rating + overall rating

**No effect on tournament seeding** - Only used for recruiting board display.

---

### 5. **Tournament Bracket Generation** ✅
**Location:** [`src/game/engine/tournament/generateBracket.ts`](src/game/engine/tournament/generateBracket.ts)

**How It Works:**
- Takes seeded 64 teams from tournament selection
- Creates matchups per NCAA tournament format:
  - Round of 64: #1 vs #16, #8 vs #9, #5 vs #12, #4 vs #13, etc.
  - Matchups organized by region and seed line
  - Continues through Round of 32, 16, 8, Finals, Championship

**No reseeding between rounds** - Bracket structure is determined at tournament start.

---

## What's MISSING 🚫

### Not Implemented:

1. **RPI (Rating Percentage Index)**
   - Would need: Win/Loss record, opponent strength, opponent's opponent strength
   - Currently: No calculation of opponent strength

2. **Strength of Schedule (SOS)**
   - Would need: Tracking all opponents' records/ratings
   - Currently: Ignored in seeding calculations

3. **Power Rankings**
   - Would need: Weighted team performance metrics
   - Currently: Static prestige only, no dynamic power ranking

4. **National Rankings**
   - Would need: Season-long tracking and ranking of all 350+ teams
   - Currently: Only seeding happens at tournament time

5. **Quality Wins / Bad Losses Tracking**
   - Would need: Opponent strength weighting
   - Currently: All wins treated equally

6. **Net Rating / Four Factors Analysis**
   - Would need: Offensive/Defensive efficiency tracking
   - Currently: Games simulated but box scores not analyzed

7. **Tiebreaker System**
   - Would need: Head-to-head records, point differential tracking
   - Currently: Hard-coded to skip these (not tracked easily yet)

---

## Architecture Issues & Realism Gaps

### 1. **Team Rating Never Updated**
```typescript
// In generateLeague.ts line 620
teamRating: undefined,  // ← Never assigned during season
```
The field exists but is never populated. This should be updated after each game based on performance.

### 2. **Resume Score Only Looks at W-L Records**
Current formula ignores:
- Quality of wins (who you beat)
- Game margins (beat a team by 1 vs 20 looks the same)
- Head-to-head records between candidates
- Conference performance breadth (beat everyone vs beat 2-3 teams repeatedly)

### 3. **Prestige is Static**
Prestige is from static team data - never changes during a season. A small school with great players should improve their seeding prospects.

### 4. **Upset Modifiers Don't Feed Back**
Games can produce upsets randomly, but this doesn't improve the underdog team's rating for future seeding.

### 5. **No Scheduling Strength Context**
- Easy conferences get same weight as hard conferences
- Playing a 10-win team vs 30-win team both count as one win

---

## Summary Table

| System | Status | Location | Tracks | Notes |
|--------|--------|----------|--------|-------|
| Tournament Selection | ✅ Complete | `selectTournament.ts` | Win %, Conf %, Rating | Basic but functional |
| Team Rating | ⚠️ Defined but unused | `dynasty.ts` + `generateLeague.ts` | N/A | Field exists, never updated |
| Game Sim Strength | ✅ Functional | `simWorker.ts` | Player Ratings weighted by minutes | No seasonal history |
| Bracket Generation | ✅ Complete | `generateBracket.ts` | NCAA format with 4 regions | Proper matchups created |
| Recruiting Ranks | ✅ Complete | `generateRecruitPool.ts` | Top 100 recruits | Doesn't affect tournament |
| RPI | ❌ Not implemented | - | N/A | No opponent strength tracking |
| SOS | ❌ Not implemented | - | N/A | Would require opponent history |
| Power Rankings | ❌ Not implemented | - | N/A | No national ranking system |
| National Rankings | ❌ Not implemented | - | N/A | Only tournament seeding happens |
| Quality Wins Tracking | ❌ Not implemented | - | N/A | All wins treated equally |

---

## Recommendations for Ranking Realism

### Phase 1: Quick Wins (1-2 hours)
1. **Populate `teamRating` during season**
   - Calculate after each game: weighted average of last N game performances
   - Update in `applyGameToSeasonStats.ts`
   - Formula: `average of offensiveRating + defensiveRating for games this season`

2. **Improve Resume Score**
   - Add point differential tracking to `TeamSeasonTotals`
   - Weight wins by margin: `wins + (totalPointDiff / maxPossiblePointDiff * 0.1)`
   - Better predictor of real team strength

3. **Add SOS Calculation**
   - Track opponents' combined win-loss records
   - Formula: `(oppWins) / (oppWins + oppLosses)` averaged
   - Use as tiebreaker in seeding

### Phase 2: Medium Effort (3-4 hours)
1. **Implement RPI**
   - Win pct (0.25) + Opponent win pct (0.50) + Opponent's opponent win pct (0.25)
   - Calculate during tournament selection
   - Use as alternative to prestige for teams without history

2. **National Rankings Display**
   - Generate full ranking of all teams before tournament selection
   - Display in standings screen
   - Show how rankings changed week-by-week

3. **Quality Win Tracking**
   - Define "quality" as opponent top-100 or +50% win percentage
   - Track separately: wins vs top-50, top-100, etc.
   - Display on team detail screen

### Phase 3: Advanced (Full Ranking System)
1. **Advanced Metrics Dashboard**
   - Offensive/Defensive efficiency (points per 100 possessions)
   - Four Factors analysis (FG%, TO%, REB%, FT%)
   - Tempo-free ratings
   - NET rating

2. **Dynamic Prestige System**
   - Start with base prestige
   - Adjust +/- based on tournament finish, conference performance
   - Create season-to-season momentum

3. **Market-Affecting Rankings**
   - Recruits more interested in high-ranked teams
   - Coaches job offers based on ranking tier
   - Contract bonuses for NCAA tournament seeding

---

## Key Files to Monitor/Modify

When implementing ranking improvements:

1. **Core Seeding Logic**: [`src/game/engine/tournament/selectTournament.ts`](src/game/engine/tournament/selectTournament.ts)
2. **Team State Definition**: [`src/game/types/dynasty.ts#L130-L170`](src/game/types/dynasty.ts#L130-L170)
3. **Season Stats Application**: [`src/game/engine/stats/applyGameToSeasonStats.ts`](src/game/engine/stats/applyGameToSeasonStats.ts)
4. **Game Simulation**: [`src/game/engine/sim/simWorker.ts`](src/game/engine/sim/simWorker.ts)
5. **Tournament Initialization**: [`src/game/engine/tournament/initializeTournament.ts`](src/game/engine/tournament/initializeTournament.ts)

---

## Data Structures Ready for Enhancement

### Current SeasonTotals (tracks):
```typescript
// In src/game/types/dynasty.ts
season: {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  teamRating?: number;  // ← Could be populated here
}
```

### Suggested Additions for Ranking System:
```typescript
season: {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  
  // NEW FIELDS
  teamRating?: number;            // Dynamic rating (0-100)
  pointsFor?: number;             // Total points scored
  pointsAgainst?: number;         // Total points allowed
  oppRecordAvg?: number;          // Average opponent win %
  rpi?: number;                   // RPI calculation
  qualityWins?: number;           // Wins vs top-100 teams
  netRating?: number;             // Off rating - Def rating
}
```

---

## Conclusion

The simulator has a **solid tournament selection foundation** but lacks the depth of analytical metrics that make real NCAA tournaments compelling. The biggest immediate impact would come from:

1. Actually populating the `teamRating` field (currently unused)
2. Adding strength of schedule to seeding calculations
3. Implementing RPI or NET Rating for better team evaluation

These changes would make seeding more strategic and give players meaningful ways to improve their tournament positioning.
