# Tournament Seeding Flow Diagram

## Current Tournament Selection Process

```
┌─────────────────────────────────────────────────────────────────┐
│          TOURNAMENT SELECTION FLOW (selectTournament)            │
└─────────────────────────────────────────────────────────────────┘

INPUT: Dynasty object (full season stats)

                        ↓

┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Get Conference Champions (AUTOBIDS)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  if conferenceTournaments exist:                                │
│    → Use tournament champions                                  │
│  else:                                                          │
│    → For each conference:                                      │
│      • Sort teams by confWins - confLosses                    │
│      • Top team = champion                                    │
│                                                                 │
│  Result: 32 autobid teams (1 per conference)                 │
│          with teamId, conferenceId, isAutobid=true            │
└─────────────────────────────────────────────────────────────────┘

                        ↓

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Select At-Large Teams                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  For each non-autobid team:                                     │
│    → Calculate Resume Score (0-1)                              │
│       = (winPct × 0.55)                                        │
│       + (confWinPct × 0.25)                                    │
│       + (teamRatingNormalized × 0.20)                          │
│                                                                 │
│  Sort by Resume Score (descending)                             │
│  Select top (64 - autobids) teams                             │
│                                                                 │
│  Result: ~32 at-large teams with isAutobid=false             │
└─────────────────────────────────────────────────────────────────┘

                        ↓

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Calculate Seed Scores (Seeding)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  For each of 64 selected teams:                                 │
│    → seedScore = (teamRatingNormalized × 0.50)                 │
│                + (resumeScore × 0.50)                          │
│                                                                 │
│  Sort teams by seedScore (descending = better)                │
│                                                                 │
│  Result: 64 teams ranked by combined seed score               │
│          (best team = seed 1, worst = seed 64)                │
└─────────────────────────────────────────────────────────────────┘

                        ↓

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Distribute into Regions (S-Curve Placement)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Seed Line 1 (Top 4 teams):    South, West, Midwest, East     │
│  Seed Line 2 (Next 4 teams):   East, Midwest, West, South     │
│  Seed Line 3 (Next 4 teams):   South, West, Midwest, East     │
│  ...continue alternating...                                    │
│  Seed Line 16 (Teams 61-64):   East, Midwest, West, South     │
│                                                                 │
│  Why "S-Curve"? Balances strength across all 4 regions        │
│  Prevents Top 4 seeds all going to one region                 │
│                                                                 │
│  Result: 4 regions × 16 seeds each = 64 teams                │
│          Each team has: teamId, seed (1-16), region, scores  │
└─────────────────────────────────────────────────────────────────┘

                        ↓

OUTPUT: TournamentSelection
  - seasonYear
  - autobids: Array<{teamId, conferenceId}>
  - atLarge: Array<teamId>
  - allTeams: Array<{teamId, seed, region, resumeScore, seedScore, isAutobid}>

```

---

## Team Rating Calculation (CURRENT: Never Happens)

```
┌─────────────────────────────────────────────────────────────────┐
│ Team Rating Status: DEFINED BUT NOT USED ⚠️                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Field Location:  teamState.season.teamRating                   │
│ Type:            Optional number (0-100 scale)                │
│ Initialization:  undefined (generateLeague.ts:620)            │
│ Updates:         NEVER (during season)                        │
│ Fallback:        (staticTeam.prestige / 100) if undefined     │
│                                                                 │
│ So in practice:                                                │
│ getTeamRatingNormalized(teamId, dynasty)                       │
│   if (teamState.season.teamRating exists)                      │
│     return teamState.season.teamRating / 100                  │
│   else                                                         │
│     return TEAMS.find(t.prestige) / 100  ← Always this!      │
│                                                                 │
│ Result: Team rating = static prestige, never changes!         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Game Simulation Strength (DOES WORK)

```
┌─────────────────────────────────────────────────────────────────┐
│ GAME SIMULATION: Team Strength Calculation                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ When simulating a game (simWorker.ts):                          │
│                                                                  │
│ 1. Get roster players                                           │
│    → Top 10 best-rated players by overall rating              │
│                                                                  │
│ 2. Allocate minutes based on player quality                    │
│    → Better players get more minutes                           │
│    → 80-100 minutes for starters                              │
│    → 20-40 minutes for bench                                  │
│                                                                  │
│ 3. Calculate offensiveRating & defensiveRating                 │
│    offensiveRating = Σ(playerOverall × minutes) / Σ(minutes) │
│    defensiveRating = Σ(playerOverall × minutes) / Σ(minutes) │
│                      (Currently same as offensive)             │
│                                                                  │
│    Example:                                                     │
│    Player A (Overall 85) plays 40 minutes                      │
│    Player B (Overall 78) plays 35 minutes                      │
│    Player C (Overall 72) plays 25 minutes                      │
│                                                                  │
│    Rating = (85×40 + 78×35 + 72×25) / (40+35+25)             │
│           = (3400 + 2730 + 1800) / 100                        │
│           = 79.3                                              │
│                                                                  │
│ 4. Use in game formula:                                        │
│    homePPP = 0.95 + (offStrength - defStrength) × 0.006 + variance
│                                                                  │
│    → Home +3 point strength advantage over away              │
│    → Offensive rating is king                                 │
│    → No defensive adjustment shown                            │
│                                                                  │
│ Result: offensiveRating & defensiveRating used for PPP       │
│         But NOT for season-long team rating!                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resume Score Calculation (Used for At-Large Selection)

```
┌─────────────────────────────────────────────────────────────────┐
│ RESUME SCORE FORMULA                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ resumeScore = (winPct × 0.55) + (confWinPct × 0.25) + (rating × 0.20)
│                                                                   │
│ Components:                                                      │
│ • winPct       = seasonWins / (seasonWins + seasonLosses)     │
│ • confWinPct   = confWins / (confWins + confLosses)          │
│ • rating       = getTeamRatingNormalized() / 100             │
│                = staticPrestige / 100  (usually)             │
│                                                                  │
│ Example: Team with 25-8 record, 14-6 conf, prestige 65       │
│ • winPct = 25/33 = 0.758                                      │
│ • confWinPct = 14/20 = 0.700                                  │
│ • rating = 65/100 = 0.650                                     │
│ • resumeScore = (0.758 × 0.55) + (0.700 × 0.25) + (0.650 × 0.20)
│              = 0.417 + 0.175 + 0.130                          │
│              = 0.722                                           │
│                                                                  │
│ Scale: 0 (worst team ever) to ~1.0 (undefeated, high prestige)
│                                                                  │
│ Limitations:                                                     │
│ ✗ All wins treated equally (no quality weighting)             │
│ ✗ No head-to-head records                                     │
│ ✗ No point differential                                       │
│ ✗ Prestige is static, not earned                             │
│ ✗ No strength of schedule factoring                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Seed Score (Final Seeding)

```
┌─────────────────────────────────────────────────────────────────┐
│ SEED SCORE FORMULA                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ seedScore = (teamRating × 0.50) + (resumeScore × 0.50)        │
│                                                                   │
│ Weights Resume Score and Team Rating equally for final seeding │
│                                                                   │
│ So a team can be seeded high by:                                │
│ Option A: High resume score (good W-L record)                  │
│ Option B: High team rating (prestige or actual rating)        │
│ Option C: Combination                                           │
│                                                                   │
│ Then teams sorted by seedScore descending:                      │
│ Top 4 teams → Seed #1 in each region (S-curve)                │
│ Next 4 teams → Seed #2 in each region                         │
│ ...and so on...                                                 │
│ Bottom 4 teams → Seed #16 in each region                      │
│                                                                  │
│ Result: 64 seeded teams distributed to 4 regions               │
│         Ready for bracket generation                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Gets Placed in Bracket After Seeding

```
┌─────────────────────────────────────────────────────────────────┐
│ BRACKET GENERATION (generateBracket.ts)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Takes: TournamentSelection (64 seeded teams)                   │
│ Creates: Full tournament bracket structure                      │
│                                                                  │
│ ROUND OF 64 MATCHUPS (NCAA Standard):                          │
│                                                                  │
│  Region: East (16 teams)                                       │
│  ────────────────────                                          │
│  Game 1: #1 East vs #16 East                                  │
│  Game 2: #8 East vs #9 East                                   │
│  Game 3: #5 East vs #12 East                                  │
│  Game 4: #4 East vs #13 East                                  │
│  Game 5: #6 East vs #11 East                                  │
│  Game 6: #3 East vs #14 East                                  │
│  Game 7: #7 East vs #10 East                                  │
│  Game 8: #2 East vs #15 East                                  │
│                                                                  │
│  [Repeat for West, South, Midwest regions]                     │
│                                                                  │
│  32 games in Round of 64 (8 per region)                       │
│  16 games in Round of 32 (4 per region)                       │
│  8 games in Round of 16 (2 per region)                        │
│  4 games in Quarter-Finals (Final Four: 2 per semi)           │
│  2 games in Semi-Finals                                        │
│  1 game in Championship                                        │
│                                                                  │
│ Total: 63 games (no play-in yet)                              │
│                                                                  │
│ Each game has:                                                 │
│ • gameId, round, region, gameNumber                           │
│ • team1Id, team2Id (or null if not played yet)                │
│ • winnerId, score1, score2 (null until played)               │
│ • day (when game scheduled)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary: Data Flow

```
Season Ends
    ↓
selectTournament()
    ├─→ getConferenceChampions() → 32 autobids
    ├─→ selectAtLargeTeams()
    │   ├─→ calculateResumeScore() for each team
    │   └─→ Pick top (64 - 32) teams
    └─→ seedAndPlaceTeams()
        ├─→ Calculate seedScore = 50% rating + 50% resume
        ├─→ Sort by seedScore
        └─→ Distribute into 4 regions via S-curve
            ↓
        Returns: TournamentSelection
            ├─ seasonYear
            ├─ autobids[]
            ├─ atLarge[]
            └─ allTeams[] (64 teams with seed/region)
    ↓
generateBracket()
    ├─→ Group by region
    ├─→ Create Round of 64 matchups
    ├─→ Template future rounds
    └─→ Returns: TournamentBracket (ready to simulate)
    ↓
Tournament Simulation
    ├─→ Simulate games based on team strength
    └─→ Update bracket with results
```

---

## Key Missing Metrics

```
╔════════════════════════════════════════════════════════════════╗
║ What Would Improve Realism (Not Currently Calculated)         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║ 1. STRENGTH OF SCHEDULE (SOS)                                  ║
║    Would weight: opponents' win % averaged                    ║
║    Impact: Could promote mid-major upsets                     ║
║                                                                 ║
║ 2. RPI (Rating Percentage Index)                              ║
║    Formula: 25% own W%, 50% opp W%, 25% opp-opp W%          ║
║    Would recognize quality wins                               ║
║                                                                 ║
║ 3. POINT DIFFERENTIAL                                          ║
║    Would track: margin of victory averaged                    ║
║    Impact: Beating a team by 2 vs 30 are different           ║
║                                                                 ║
║ 4. QUALITY WIN TRACKING                                        ║
║    Would track: wins vs #1-50, #51-100, unranked             ║
║    Impact: KenPom-style weighting                             ║
║                                                                 ║
║ 5. NET RATING                                                  ║
║    Would calculate: PPP scored - PPP allowed                 ║
║    Impact: Better efficiency measurement                      ║
║                                                                 ║
║ 6. NATIONAL RANKINGS                                           ║
║    Would generate: Full ranking of 300+ teams pre-tournament  ║
║    Impact: Show seeding justification to users                ║
║                                                                 ║
║ 7. DYNAMIC PRESTIGE                                            ║
║    Would adjust: Prestige based on tournament performance     ║
║    Impact: Create momentum/dynasty rebuilding stories         ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```
