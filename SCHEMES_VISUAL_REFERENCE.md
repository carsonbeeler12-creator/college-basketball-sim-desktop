# Coaching Schemes - Visual Reference Guide

## Scheme Flowchart

```
CREATE DYNASTY
    ↓
Select Coach Scheme (TEMPO/DEFENSIVE/POST_HEAVY/THREE_POINT/BALANCED)
    ↓
    ├─→ RECRUITING SYSTEM
    │   ├─ Evaluate recruit archetype vs scheme
    │   ├─ Apply fit score (-5 to +5)
    │   ├─ Prioritize recruits with matching archetype
    │   └─ Result: Roster naturally matches system
    │
    ├─→ GAME SIMULATION
    │   ├─ Apply scheme pace modifier
    │   ├─ Apply scheme offensive accuracy
    │   ├─ Apply scheme three-point volume
    │   └─ Result: Teams play noticeably different styles
    │
    ├─→ SEASON PROGRESSION
    │   ├─ Accumulate wins/losses
    │   ├─ Track record
    │   └─ Update prestige tier
    │
    └─→ OFFSEASON
        ├─ Update coach career stats
        ├─ Calculate average prestige
        ├─ Set prestige tier (Blue Blood/Power/Mid-Major/Mid-Tier/Small School)
        └─ Year advances, foundation for job market ready
```

---

## Scheme Comparison Matrix

### Recruiting Priorities

```
TEMPO System
├─ PRIMARY: SHOOTER (+4), FACILITATOR (+3)
├─ SECONDARY: WING_SCORER (+3), THREE_AND_D_WING (+3), ALL_AROUND_WING (+2)
├─ AVOID: RIM_PROTECTOR (-2), REBOUNDER_ENERGY_BIG (-1), POST_SCORER (0)
└─ Result: Ball-dominant, perimeter-heavy roster

DEFENSIVE System
├─ PRIMARY: TWO_WAY_GUARD (+4), THREE_AND_D_WING (+4), RIM_PROTECTOR (+4)
├─ SECONDARY: REBOUNDER_ENERGY_BIG (+3), POST_SCORER (+2)
├─ AVOID: SHOOTER (-2), WING_SCORER (-1), PRIMARY_SCORER (-1)
└─ Result: Defense-first, physical roster

POST_HEAVY System
├─ PRIMARY: POST_SCORER (+5), RIM_PROTECTOR (+3), REBOUNDER_ENERGY_BIG (+3)
├─ SECONDARY: STRETCH_BIG (+2), ALL_AROUND_WING (+0)
├─ AVOID: SHOOTER (-3), TWO_WAY_GUARD (-1), WING_SCORER (-1)
└─ Result: Big-man dependent, interior focused

THREE_POINT System
├─ PRIMARY: SHOOTER (+4), THREE_AND_D_WING (+5)
├─ SECONDARY: TWO_WAY_GUARD (+3), STRETCH_BIG (+3), PRIMARY_SCORER (+1)
├─ AVOID: POST_SCORER (-1), REBOUNDER_ENERGY_BIG (-1)
└─ Result: Floor spacing, perimeter defense

BALANCED System
└─ No preferences, recruit talent regardless
```

### Game Simulation Effects

```
                  Pace    Offense  Defense  3P Vol   Winning Style
TEMPO              +6%    +1.5%    -2%      +8%     High-scoring shootouts
DEFENSIVE          -5%    -1%      +3.5%    -4%     Defensive grind
POST_HEAVY         -3%    +0.5%    +1%      -6%     Traditional interior
THREE_POINT        +2%    +1%      +1.5%    +5%     Balanced/versatile
BALANCED            0%     0%       0%       0%      Talent dependent
```

### Coach Prestige Tier System

```
Prestige Score Range  →  Tier            →  Recruiting Reach
85-100                   BLUE_BLOOD        National powerhouse
75-84                    POWER             Elite conference leader
60-74                    MID_MAJOR         Strong regional program
45-59                    MID_TIER          Competitive mid-level
0-44                     SMALL_SCHOOL      Regional program
```

---

## Example: Season Simulation

### Setup
```
TEMPO Team (Home) vs DEFENSIVE Team (Away)
Base roster quality: Equal (both 70 OVR average)
Arena: Neutral court
```

### Game Flow

```
STEP 1: PACE CALCULATION
  TEMPO base pace: 70 possessions
  TEMPO modifier: +6%
  Adjusted: 70 × 1.06 = 74.2 possessions
  
  DEFENSIVE base pace: 70 possessions
  DEFENSIVE modifier: -5%
  Adjusted: 70 × 0.95 = 66.5 possessions
  
  → Average: 70.4 possessions (slightly faster due to TEMPO)

STEP 2: SHOOTING ACCURACY CALCULATION
  TEMPO player shooting:
    Base: 35% (average 70 OVR player from 3)
    Scheme modifier: +1.5%
    Opponent perim D: 50 (neutral)
    Form variance: +0.8% (random)
    Result: 35% + 1.5% + 0.8% = 37.3%
  
  DEFENSIVE player shooting:
    Base: 35% (same quality)
    Scheme modifier: -2% (worse offense)
    Opponent perim D: 50
    Form variance: -0.3% (random)
    Result: 35% - 2% - 0.3% = 32.7%
  
  → TEMPO team shoots ~4.6% better from three

STEP 3: SHOT SELECTION CALCULATION
  TEMPO 3PA rate: 30% × 1.08 = 32.4% (more 3s)
  DEFENSIVE 3PA rate: 30% × 0.96 = 28.8% (fewer 3s)
  
  In 70 FGA game:
  TEMPO: 70 × 0.324 = 22.7 ≈ 23 threes
  DEFENSIVE: 70 × 0.288 = 20.2 ≈ 20 threes
  
  → TEMPO takes 3 more threes per game

STEP 4: FINAL SCORE CALCULATION
  TEMPO Team:
    - 70 FGA, 23 from 3-point range, 47 from 2-point range
    - 3P%: 37.3%, makes 8.6 ≈ 9 threes (27 points)
    - 2P%: 50%, makes 23.5 ≈ 24 twos (48 points)
    - FT%: 75%, 10 makes (10 points)
    - Total: 85 points
  
  DEFENSIVE Team:
    - 70 FGA, 20 from 3-point range, 50 from 2-point range
    - 3P%: 32.7%, makes 6.5 ≈ 7 threes (21 points)
    - 2P%: 48%, makes 24 twos (48 points)
    - FT%: 75%, 8 makes (8 points)
    - Total: 77 points
  
  → TEMPO wins 85-77
     High-volume, high-scoring style vs Grind-it-out defense
```

---

## Coach Career Progression Example

### 5-Year Arc

```
YEAR 1: Start at Small School
────────────────────────────
Prestige: 35 (SMALL_SCHOOL)
Scheme: BALANCED
Record: 25-5
Coach Stats at End:
  seasonsCoached: 1
  totalWins: 25
  totalLosses: 5
  averagePrestige: 35
  currentPrestigeTier: SMALL_SCHOOL
  yearsAtCurrentSchool: 1

↓↓↓ SUCCESS BUILDS PRESTIGE ↓↓↓

YEAR 2: Same School, Growing
───────────────────────────────
Prestige: 45 (up from 35)
Scheme: Change to TEMPO (coach evolves)
Record: 28-2
Coach Stats at End:
  seasonsCoached: 2
  totalWins: 53
  totalLosses: 7
  averagePrestige: 40
  currentPrestigeTier: MID_TIER (prestige 45)
  yearsAtCurrentSchool: 2

YEAR 3: Recruited to Mid-Major
───────────────────────────────
Prestige: 60 (starting prestige at new school)
Scheme: Still TEMPO
Record: 24-6
Coach Stats at End:
  seasonsCoached: 3
  totalWins: 77
  totalLosses: 13
  averagePrestige: 46.7 ((35+45+60)/3)
  currentPrestigeTier: MID_MAJOR (prestige 60)
  yearsAtCurrentSchool: 1 (reset at new school)

YEAR 4: Building New Program
─────────────────────────────
Prestige: 72 (established at mid-major)
Scheme: TEMPO
Record: 26-4
Coach Stats at End:
  seasonsCoached: 4
  totalWins: 103
  totalLosses: 17
  averagePrestige: 53 ((35+45+60+72)/4)
  currentPrestigeTier: MID_MAJOR
  yearsAtCurrentSchool: 2

YEAR 5: Blue Blood Opportunity
──────────────────────────────
Prestige: 82 (power conference school)
Scheme: TEMPO
Record: 23-7
Coach Stats at End:
  seasonsCoached: 5
  totalWins: 126
  totalLosses: 24
  averagePrestige: 58.8 ((35+45+60+72+82)/5)
  currentPrestigeTier: POWER (prestige 82)
  yearsAtCurrentSchool: 1

Career Arc Complete: Small School → Mid-Tier → Mid-Major → Power
```

---

## Scheme Matchup Chart

```
                    vs TEMPO    vs DEFENSIVE  vs POST_HEAVY  vs THREE_POINT  vs BALANCED
TEMPO           ────────────     Advantage      Advantage      Neutral        Advantage
                Mirrors each      (more poss)    (more O)       (balanced)     (more O)
                                                                              
DEFENSIVE       Disadvantage   ────────────     Neutral       Advantage      Neutral
                (fewer poss)   Mirrors each      (grind)       (good D)       (solid)
                                                                              
POST_HEAVY      Disadvantage     Neutral      ────────────    Advantage      Neutral
                (fast O beats)   (low scor)   Mirrors each     (spacing)      (talent)
                                                                              
THREE_POINT     Neutral        Disadvantage    Disadvantage  ────────────    Advantage
                (balanced)     (take fewer 3)  (take fewer 3) Mirrors each    (balanced)
                                                                              
BALANCED        Disadvantage     Neutral        Neutral       Disadvantage  ────────────
                (vs specialist)  (vs specialist) (vs specialist) (vs specialist) Mirrors each
```

**Legend:**
- Advantage: This scheme has edge (better matchup for this system)
- Neutral: System-neutral matchup
- Disadvantage: Other scheme has edge

---

## Decision Tree: Choosing a Scheme

```
                    START
                      ↓
        What's your coaching philosophy?
        
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    ↓                                                 ↓
Want high-scoring games?           Want defensive battles?
    │                                         │
    ↓                                         ↓
TEMPO                                    DEFENSIVE
(Fast pace, lots of 3s)                 (Slow grind, tough D)
    │                                         │
    └─→ Best with: SHOOTERS              └─→ Best with: DEFENDERS
        FACILITATORS                         RIM PROTECTORS
        WING SCORERS                         TWO WAY GUARDS
        
        
        ┌─────────────────────────────────────────────┐
        │                                             │
        ↓                                             ↓
Want traditional basketball?      Want modern balanced style?
        │                                       │
        ↓                                       ↓
    POST_HEAVY                            THREE_POINT
    (Big man focus)                       (3-and-D system)
        │                                       │
        └─→ Best with: POST SCORERS         └─→ Best with: SHOOTERS
            RIM PROTECTORS                      THREE_AND_D WINGS
            BIG MEN                             STRETCHY BIGS
        
        
                    Can't decide?
                         ↓
                    BALANCED
                (No emphasis, flexible)
                    └─→ Best with: Talent
                        (Any archetype works)
```

---

## Performance Indicators by Scheme

### Expected Win Rate (Against Average Opposition)

```
Scheme        Low Talent    Mid Talent    High Talent
────────────────────────────────────────────────────
TEMPO         40-45%        50-55%        65-70%
DEFENSIVE     42-47%        50-55%        65-70%
POST_HEAVY    40-45%        50-55%        62-68%
THREE_POINT   43-48%        52-57%        68-72%
BALANCED      41-46%        50-55%        60-65%

Legend: All systems are comparable with equal talent.
        Scheme matters most vs similar talent levels.
        THREE_POINT slightly best (most versatile).
```

### Typical Season Statistics

```
TEMPO Team (28-4 record)
─────────────────────────
Avg PPG: 87
Avg PPG Allowed: 81
Possessions/Game: 74
3P Attempts/Game: 24
3P%: 38%
Record: 28-4

DEFENSIVE Team (28-4 record)
────────────────────────────
Avg PPG: 75
Avg PPG Allowed: 68
Possessions/Game: 66
3P Attempts/Game: 20
3P%: 32%
Record: 28-4

Post-Heavy Team (28-4 record)
──────────────────────────────
Avg PPG: 78
Avg PPG Allowed: 72
Possessions/Game: 68
3P Attempts/Game: 20
3P%: 33%
Record: 28-4

All systems can reach 28-4, just different styles.
```

---

**This is your complete reference guide! 🏀**
