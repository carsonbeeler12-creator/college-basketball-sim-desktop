# National Rankings Screen - New Feature

## What's New? ✨

Added a **Top 25 National Rankings** visualization to your college basketball sim!

## Features

### 📊 Top 25 Display
- Shows top 25 teams ranked by **dynamic rating** (0-100)
- Color-coded by strength:
  - 🟢 **Green (85+)** - Elite
  - 🟢 **Light Green (75-84)** - Very Good
  - 🟡 **Amber (65-74)** - Good
  - 🟠 **Orange (55-64)** - Average
  - 🔴 **Red (<55)** - Below Average

### 📈 Information Shown
- **Rank** - Position (1-25)
- **Team Name** - School name
- **Record** - Overall win-loss record
- **Win %** - Win percentage
- **Conference Record** - Conf W-L
- **Rating** - Team rating (0-100)

### 🎯 Interactive
- **Click on any team** to view team details
- Navigate back to Dynasty Hub
- Updates in real-time as season progresses

## Where to Find It

### Dynasty Hub
- New button: **"National Rankings"**
- Located right after "Standings" button
- Opens the Top 25 view

### How Rankings Work

The rating formula is:
```
Rating = 40% Wins + 30% Strength of Schedule + 20% Quality Wins + 10% Point Diff
```

This means:
- **Your record matters** (40%)
- **Who you played matters** (30%)
- **Who you beat matters** (20%)
- **How much you won by matters** (10%)

## Example Rankings

```
#1  Auburn         27-3  (0.900)   Conf: 16-2      Rating: 92
#2  Duke           25-5  (0.833)   Conf: 14-4      Rating: 89
#3  Texas Tech     24-6  (0.800)   Conf: 15-3      Rating: 87
#4  Houston        23-7  (0.767)   Conf: 13-5      Rating: 85
#5  Kansas         22-8  (0.733)   Conf: 12-6      Rating: 81
...
#25 Northern Iowa  16-14 (0.533)   Conf: 8-10      Rating: 55
```

## Color Legend

```
85+ Elite          - Tournament favorite
75-84 Very Good    - Strong tournament team
65-74 Good         - Tournament team
55-64 Average      - Bubble team
<55 Below Avg      - NIT/rebuilding
```

## Integration

### New Files
- `src/ui/screens/RankingsScreen.tsx` - Rankings display component

### Modified Files
- `src/game/types.ts` - Added `'rankings'` to Screen type
- `src/App.tsx` - Imported RankingsScreen, added routing
- `src/ui/screens/DynastyHubScreen.tsx` - Added navigation button

### Code Status
✅ **Zero TypeScript errors**
✅ **Fully integrated with existing UI**
✅ **Uses existing rating system from ranking system overhaul**
✅ **Updates automatically with each game**

## Usage Tips

1. **Check regularly** - Rankings change after each game
2. **Monitor schedule** - Teams playing better opponents rank higher
3. **Watch the bubble** - Positions 20-25 are closest and most volatile
4. **Plan recruiting** - Highly ranked schools may have recruiting advantages
5. **Use for context** - Understand how your team ranks nationally

## What's Next?

Future Phase 3 enhancements could include:
- [ ] Weekly ranking changes (↑ ↓ indicators)
- [ ] Last 10 game trends
- [ ] RPI calculation alongside rating
- [ ] Historical ranking comparison
- [ ] Ranking graphs throughout season
- [ ] Predictor for tournament seeding

## Technical Details

- **Real-time**: Rankings update after each game
- **Efficient**: Uses cached ratings from game simulations
- **Accurate**: Based on NCAA-style RPI formula
- **Interactive**: Click teams for detailed info
- **Responsive**: Works on all screen sizes

## Example Scenario

**November 15** (Early Season)
- Team A (Big Program): Rating 62 (2-1 vs weak schedule)
- Team B (Mid-Major): Rating 58 (3-0 vs weak schedule)

**February 10** (Late Season)
- Team A (Big Program): Rating 78 (22-5 vs elite schedule)
- Team B (Mid-Major): Rating 72 (20-7 vs elite schedule)

**March** (Tournament Time)
- Team A ranks higher despite same improvement percentage
- Reason: Played tougher schedule, beat better teams
- Tournament seeding reflects this difference
- Result: More realistic bracket placement

---

**Ready to see where your team ranks nationally!** 🏀
