# Tournament & Ranking System - Executive Summary

## Search Results Summary

I've completed a comprehensive analysis of the college basketball simulator's ranking and tournament systems. Here's what exists and what's missing:

---

## ✅ What EXISTS

### 1. **Tournament Selection & Seeding (COMPLETE)**
- **Autobids**: Conference champions determined from tournament winners or regular season standings
- **At-Large Selection**: Best remaining 32 teams selected by resume score
- **Resume Score Formula**: 55% overall record + 25% conference record + 20% team rating
- **Seed Scoring**: 50% team rating + 50% resume score determines final seeds
- **S-Curve Distribution**: Teams placed into 4 regions with balanced strength
- **Full Bracket Generation**: Proper NCAA tournament matchup structure created

**Files:**
- [`src/game/engine/tournament/selectTournament.ts`](src/game/engine/tournament/selectTournament.ts)
- [`src/game/engine/tournament/generateBracket.ts`](src/game/engine/tournament/generateBracket.ts)
- [`src/game/engine/tournament/initializeTournament.ts`](src/game/engine/tournament/initializeTournament.ts)

**Status:** Fully functional, used every season

---

### 2. **Game Simulation Strength Calculation (WORKS)**
- Teams assigned offensiveRating and defensiveRating per game
- Calculated as: weighted average of player overall ratings by minutes played
- Used in game PPP (points per possession) calculations
- Real-time strength assessment during season

**Files:**
- [`src/game/engine/sim/simWorker.ts`](src/game/engine/sim/simWorker.ts) (lines 94-180)
- [`src/game/engine/sim/simGame_v0.ts`](src/game/engine/sim/simGame_v0.ts) (lines 374-392)

**Status:** Functional but not connected to seasonal team rating

---

### 3. **Recruiting Rankings (BASIC)**
- Top 100 recruits assigned national rank (1-100)
- Used for recruiting board display and tie-breaking
- Quality bands (ELITE/HIGH/MID/LOW/GARBAGE) based on recruit ratings
- No impact on tournament seeding

**Files:**
- [`src/game/engine/recruiting/generateRecruitPool.ts`](src/game/engine/recruiting/generateRecruitPool.ts) (lines 101-115)

**Status:** Works for recruiting, separate from tournament rankings

---

## ❌ What's MISSING

### 1. **RPI (Rating Percentage Index)** 🚫
- **Would Calculate:** 25% own record + 50% opponent records + 25% opponent's opponent records
- **Current:** Not implemented
- **Why Matters:** Better identifies quality wins vs cupcake opponents
- **Effort to Add:** 2-3 hours

### 2. **Strength of Schedule (SOS)** 🚫
- **Would Calculate:** Average opponent win percentage or average opponent rating
- **Current:** Completely ignored
- **Why Matters:** Rewards teams for playing tougher schedules
- **Effort to Add:** 1-2 hours

### 3. **Power Rankings / National Rankings** 🚫
- **Would Generate:** Full ranking of all 350+ teams before tournament
- **Current:** Only tournament seeding (64 teams ranked)
- **Why Matters:** Shows user the ranking rationale
- **Effort to Add:** 3-4 hours

### 4. **Dynamic Team Rating During Season** 🚫
- **Currently:** `teamState.season.teamRating` field exists but is NEVER populated
- **Falls Back To:** Static prestige (never changes)
- **Should Be:** Updated after each game based on actual performance
- **Why Matters:** Would make seeding respond to season performance
- **Effort to Add:** 1-2 hours

### 5. **Quality Wins Tracking** 🚫
- **Would Track:** Wins vs ranked teams, tournament resume metrics
- **Current:** All wins treated equally
- **Why Matters:** Real tournament committees heavily weight quality
- **Effort to Add:** 2-3 hours

### 6. **Point Differential** 🚫
- **Would Calculate:** Total points for - total points against, average margin
- **Current:** Exists in game simulation but not stored seasonally
- **Why Matters:** Blowout wins show dominance better than close wins
- **Effort to Add:** 1 hour

### 7. **Head-to-Head Records** 🚫
- **Would Track:** Records against common opponents and direct matchups
- **Current:** Code comment says "not tracked easily yet, skip" (line 113 of selectTournament.ts)
- **Why Matters:** NCAA uses as tournament tie-breaker
- **Effort to Add:** 3-4 hours

### 8. **Conference Strength Weighting** 🚫
- **Currently:** All conferences treated equally
- **Should Be:** Strong conferences (like SEC) tougher conference records
- **Why Matters:** 16-4 in weak conference ≠ 16-4 in strong conference
- **Effort to Add:** 2-3 hours

---

## Key Problem: Team Rating Field

**The biggest issue:** A `teamRating` field is defined in the team state but never populated.

```typescript
// In src/game/types/dynasty.ts (line 143)
season: {
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  teamRating?: number;  // ← DEFINED BUT NEVER SET
};
```

```typescript
// In src/game/engine/generateLeague.ts (line 620)
teamRating: undefined,  // ← Never changed during season
```

This means:
- ❌ Tournament seeding always uses static prestige
- ❌ Season performance doesn't improve a team's ranking
- ❌ Upsets don't help underdog teams' tournament chances
- ✅ (But tourney logic is solid, just needs dynamic input)

---

## System Architecture

```
TOURNAMENT FLOW:
├─ selectTournament()
│  ├─ getConferenceChampions()        → 32 autobids
│  ├─ selectAtLargeTeams()            → Calculate resumeScores
│  └─ seedAndPlaceTeams()             → S-curve seeding
│      └─ Uses: teamRating (broken)
│
└─ generateBracket()
   └─ Creates 63 games in NCAA format

SEEDING FORMULA:
├─ Resume Score = (winPct × 0.55) + (confWinPct × 0.25) + (rating × 0.20)
├─ Seed Score = (rating × 0.50) + (resumeScore × 0.50)
└─ Distribution via S-curve (balanced across 4 regions)
```

---

## Priority Fixes (Ranked by Impact)

### 🔴 CRITICAL (1-2 hours, high impact)
1. **Populate `teamRating` during season**
   - In `applyGameToSeasonStats.ts`: Calculate after each game
   - Formula: Rolling average of offensiveRating + defensiveRating
   - Effect: Seeding now responds to actual season performance

### 🟡 HIGH (2-3 hours, medium-high impact)
1. **Add point differential to resume score**
   - Track points for/against, calculate margin average
   - Weight it ~5-10% in resume score calculation
   - Effect: Blowout wins matter for seeding

2. **Implement SOS (Strength of Schedule)**
   - Calculate opponent winning percentage average
   - Use as seeding tiebreaker
   - Effect: Rewards tough schedule, helps small schools

### 🟢 MEDIUM (3-4 hours, medium impact)
1. **Build National Rankings System**
   - Generate full ranking of 350+ teams
   - Use improved metrics (teamRating, SOS, quality wins)
   - Display in UI pre-tournament
   - Effect: User sees ranking rationale

2. **Quality Wins Tracking**
   - Define "quality" (Top-50, Top-100, Top-150)
   - Count separately in resume calculations
   - Effect: Better tournaments, like real NCAA

---

## Files to Modify for Improvements

| File | Change | Impact |
|------|--------|--------|
| `src/game/engine/stats/applyGameToSeasonStats.ts` | Populate `teamRating` after games | CRITICAL |
| `src/game/engine/tournament/selectTournament.ts` | Improve resume score, add SOS | HIGH |
| `src/game/types/dynasty.ts` | Add tracking fields for SOS, pointDiff, qualityWins | FOUNDATION |
| `src/ui/screens/StandingsScreen.tsx` | Display national rankings, explain seeding | UX |

---

## Documentation Created

I've created 3 comprehensive reference documents in your workspace:

1. **[`RANKING_SYSTEM_ANALYSIS.md`](RANKING_SYSTEM_ANALYSIS.md)** - Deep technical analysis
   - What systems exist
   - What's missing
   - Architecture overview
   - Recommendations for improvement

2. **[`TOURNAMENT_SEEDING_FLOW_DIAGRAM.md`](TOURNAMENT_SEEDING_FLOW_DIAGRAM.md)** - Visual guide
   - Complete flow diagram
   - Formula breakdowns
   - Data structures
   - Missing metrics list

3. **[`TOURNAMENT_SEEDING_CODE_REFERENCE.md`](TOURNAMENT_SEEDING_CODE_REFERENCE.md)** - Developer guide
   - File locations & line numbers
   - Function signatures
   - Formula references
   - Debug checklist

---

## Quick Facts

**What's Currently Used:**
- ✅ Tournament selection (autobids + at-large)
- ✅ S-curve seeding algorithm
- ✅ 64-team bracket generation
- ✅ NCAA tournament format (4 regions × 16 seeds)

**What's Broken:**
- ❌ `teamRating` never updated during season
- ❌ All wins treated equally (no quality weighting)
- ❌ No strength of schedule calculation
- ❌ No RPI or power rankings

**System Status:**
- Tournament seeding: **FUNCTIONAL but incomplete**
- Data foundation: **READY** (fields defined, just need population)
- Realism: **BASIC** (works, but lacks depth)
- User benefit: **MEDIUM** (would improve with better metrics)

---

## Example: Current vs. Improved Seeding

### Current System
```
Team A: 30-3 record, prestige 75, mid-major conference
→ resumeScore = (0.909 × 0.55) + (0.857 × 0.25) + (0.75 × 0.20) = 0.828
→ seedScore = (0.75 × 0.50) + (0.828 × 0.50) = 0.789
→ Seed #1

Team B: 25-8 record, prestige 80, power conference  
→ resumeScore = (0.758 × 0.55) + (0.700 × 0.25) + (0.80 × 0.20) = 0.731
→ seedScore = (0.80 × 0.50) + (0.731 × 0.50) = 0.766
→ Seed #2
```

### Improved System (with SOS + Quality Wins)
```
Team A: 30-3, SOS 0.65 (weak schedule), quality wins 5
→ resumeScore = (0.909 × 0.55) + (0.65 × 0.10) + (0.75 × 0.20) + (qualityWins) = 0.72
→ Seed #3 (dropped: played weak schedule)

Team B: 25-8, SOS 0.78 (strong schedule), quality wins 12
→ resumeScore = (0.758 × 0.55) + (0.78 × 0.10) + (0.80 × 0.20) + (qualityWins) = 0.81
→ Seed #1 (improved: played strong schedule, quality wins matter)
```

The difference? One team played Alabama, Kentucky, Duke; the other played mid-majors. That matters!

---

## Next Steps (Your Decision)

If you want to improve tournament realism:

**Option A: Quick Fix (1 hour)**
- Populate `teamRating` from game simulation data
- Add point differential tracking
- **Result:** Seeding starts responding to actual performance

**Option B: Medium Overhaul (3-4 hours)**
- Option A + SOS calculation
- Option A + National rankings display
- **Result:** Complete ranking system visible to user

**Option C: Full System (6-8 hours)**
- Option B + RPI calculation
- Option B + Quality wins tracking
- Option B + Prestige dynamics
- **Result:** Tournament feels as sophisticated as real NCAA

Let me know if you want me to implement any of these levels!
