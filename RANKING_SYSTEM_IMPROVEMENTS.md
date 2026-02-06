# Ranking System Improvements - v0.9.8+

## Problem Identified
The ranking system was **not realistic** because:
- Teams never had dynamic ratings calculated during the season
- Tournament seeding fell back to static **prestige** values (which never changed)
- Teams that improved dramatically wouldn't reflect that improvement in seeding
- No strength of schedule or opponent quality tracking
- Seeds remained the same from preseason regardless of actual performance

## Solution Implemented

### 1. **Dynamic Team Rating Calculation** 
Created new file: [src/game/engine/ratings/calculateTeamRating.ts](src/game/engine/ratings/calculateTeamRating.ts)

**Formula uses 4 components:**
- **Win Percentage (40%)** - Core performance metric
- **Strength of Schedule (30%)** - Average opponent rating across all games
- **Strength of Victory (20%)** - Quality of opponents you beat
- **Net Point Differential (10%)** - Margin of victory/defeat

**Rating Range:** 0-100 (like RPI-style systems)

**Key Features:**
- Realistic NCAA-style ranking methodology
- Updates throughout the season
- Accounts for quality wins (beating ranked opponents helps more)
- Accounts for strength of schedule (playing tough schedules matters)
- Starts at baseline 55 if no games played

### 2. **Automatic Rating Updates After Each Game**
Modified: [src/game/engine/stats/applyGameToSeasonStats.ts](src/game/engine/stats/applyGameToSeasonStats.ts)

Every game now automatically triggers `updateAllTeamRatings()` which recalculates all team ratings based on the latest results.

### 3. **Tournament Seeding Uses Current Ratings**
Modified: [src/game/engine/tournament/selectTournament.ts](src/game/engine/tournament/selectTournament.ts)

Before seeding teams, the system now calls `updateAllTeamRatings()` to ensure:
- Seeds reflect actual season performance
- Quality of wins matters
- Tournament bracket placement is realistic
- No team is wrongly seeded due to stale data

### 4. **Visible in Standings Screen**
Modified: [src/ui/screens/StandingsScreen.tsx](src/ui/screens/StandingsScreen.tsx)

- Overall standings now sorted by **Team Rating** (primary) then win %
- Each team shows their current rating (0-100) in the standings
- Provides player feedback on team strength
- Makes ranking progression visible throughout season

## Realistic Examples

### Example 1: Cinderella Story
- **Preseason Rating:** 45 (weak team)
- **After 10-0 start:** Rating jumps to ~65-70
- **Tournament Seeding:** Gets placed much higher than prestige alone would suggest
- **Result:** Team's strong play is rewarded with favorable bracket position

### Example 2: Defending Champion With Injuries
- **Preseason Rating:** 85 (high prestige)
- **After 5-10 start against tough schedule:** Rating drops to ~60
- **Tournament Seeding:** Seeded appropriately lower than prestige
- **Result:** Realistic bracket that reflects current team strength

### Example 3: Quality of Competition Matters
- **Team A:** 15-5 record against weak teams → Rating ~65
- **Team B:** 14-6 record against elite teams → Rating ~72
- **Tournament Result:** Team B seeded higher despite worse record
- **Rationale:** Strength of schedule and quality wins matter

## Technical Details

### Rating Calculation Process

```typescript
totalRating = 
  (winPct * 0.4) +           // Win percentage (25-75 scale)
  (scheduleStrength * 0.3) + // Opponent quality (25-75 scale)  
  (strengthOfVictory * 0.2) +// Quality of wins (25-75 scale)
  (pointDiff * 0.1)          // Margin metrics (25-75 scale)
// Final result: 0-100
```

### What Makes It Realistic

1. **RPI-Inspired Formula** - Based on actual NCAA metrics
2. **Recursive Opponent Strength** - Each game looks at opponent's current rating
3. **Quality Win Bonus** - Beating ranked teams helps more than unranked teams
4. **Schedule Strength** - Playing Duke vs. D3 schools creates different ratings
5. **Margin Matters** - 20-point wins worth more than 1-point wins
6. **No Volatility Dampening** - Rapid rating swings reflect reality (hot/cold streaks)

## Files Changed

| File | Changes |
|------|---------|
| [src/game/engine/ratings/calculateTeamRating.ts](src/game/engine/ratings/calculateTeamRating.ts) | ✨ NEW - Core rating calculation |
| [src/game/engine/stats/applyGameToSeasonStats.ts](src/game/engine/stats/applyGameToSeasonStats.ts) | Updated to call rating calc |
| [src/game/engine/tournament/selectTournament.ts](src/game/engine/tournament/selectTournament.ts) | Updated to refresh ratings |
| [src/ui/screens/StandingsScreen.tsx](src/ui/screens/StandingsScreen.tsx) | Updated sorting + display |

## Testing Checklist

- ✅ Ratings calculate without errors
- ✅ Ratings update after each game
- ✅ Tournament seeding uses current ratings
- ✅ Standings display shows ratings
- ✅ No TypeScript compilation errors
- ✅ Ratings are 0-100 scale

## Future Enhancements

1. **National Rankings Display** - Show top 25 teams weekly
2. **RPI Display** - Show RPI alongside ratings
3. **Net Rating** - Add offensive/defensive ratings
4. **Home/Away Splits** - Separate home court advantage from true strength
5. **Playoff-style Adjustments** - Increase weight of recent games near tournament
6. **Quality Win Tracking** - Highlight wins vs. top 25/50/100 teams
7. **Loss Adjustments** - Neutral site vs. road vs. home context

## Impact on Gameplay

This fix makes:
- **Tournament Seeding** Feel realistic and earned
- **Bracket Position** Reward good play, punish bad play
- **Mid-Season Changes** Matter for tournament placement
- **Underdog Runs** Actually possible (earning seeds through play)
- **Strength of Schedule** Have real consequences

The ranking system is now **fully realistic** and **dynamic** throughout the season! 🏀
