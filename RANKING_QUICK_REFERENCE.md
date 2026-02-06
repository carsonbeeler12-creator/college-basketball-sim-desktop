# Ranking System - Quick Reference

## What Changed?

### Before ❌
- Team ratings were `undefined` during season
- Tournament seeding used static prestige
- Rankings never updated with game results
- Unrealistic: 5-15 team could get #1 seed based on prestige alone

### After ✅
- Team ratings calculated dynamically after each game
- Tournament seeding uses current ratings
- Rankings update in real-time
- Realistic: Good teams get good seeds, bad teams get bad seeds

## The Formula (Simple Version)

```
Team Rating = 
  40% Win Percentage +
  30% Strength of Schedule +
  20% Strength of Victory +
  10% Point Differential
```

**Example:**
- 18-6 record vs. strong teams = ~75 rating
- 18-6 record vs. weak teams = ~60 rating
- Both have same record, but different ratings = realistic!

## Where Ratings Show Up

1. **Standings Screen** - Overall tab shows each team's rating
2. **Tournament Selection** - Used to determine seeds
3. **Bracket Placement** - Good ratings = good seeds

## Key Files

- **Calculate:** `src/game/engine/ratings/calculateTeamRating.ts`
- **Update:** `src/game/engine/stats/applyGameToSeasonStats.ts`
- **Tournament:** `src/game/engine/tournament/selectTournament.ts`
- **Display:** `src/ui/screens/StandingsScreen.tsx`

## How It Works in Practice

### Game 1: Your Team Goes 1-0
- Rating: 55 (just above average, no data yet)

### Game 10: Your Team Goes 10-0 Against Ranked Teams
- Rating: ~72 (strength of competition helps)

### Game 20: Your Team Goes 10-10 (mixed record)
- Rating: ~58 (back toward average)

### Tournament Time
- 10-10 team seeded appropriately (not high, not low)
- Reflects actual strength, not preseason expectations

## Why This is Realistic

✅ Accounts for opponent quality (Duke vs. cupcake)
✅ Rewards big wins (beating top teams helps)
✅ Penalizes quality losses (losing to top teams hurts less)
✅ Updates constantly (hot teams improve, cold teams drop)
✅ Used for tournament seeding (just like real NCAA)

## Performance Notes

- Ratings calculate in ~O(n²) where n = number of games
- Called once per game (negligible cost)
- All calculations are bounded 0-100
- No floating point precision issues

That's it! The ranking system now works correctly. 🏀
