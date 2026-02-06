# Coaching Schemes - Technical Deep Dive

## How Schemes Affect Each Game System

### 1. Recruiting System

**File:** `src/game/engine/recruiting/cpuRecruiting.ts`

**What Changed:**
When CPU teams (and by extension, user teams in board management) evaluate recruits, they now score recruits higher if their archetype fits the coach's scheme.

**Code Flow:**
```typescript
// In addRecruitsToCPUBoard():
const coachScheme = dynasty.coach?.scheme ?? 'BALANCED';
const fitA = evaluateArchetypeFit(a.identity.archetype, coachScheme);
const fitB = evaluateArchetypeFit(b.identity.archetype, coachScheme);

// Secondary sort: scheme fit (if different)
if (fitB !== fitA) return fitB - fitA;
```

**Example:**
```
Scenario: TEMPO coach has 3 recruits on board:
- Recruit A: SHOOTER archetype, fit score +4 with TEMPO
- Recruit B: RIM_PROTECTOR archetype, fit score -2 with TEMPO
- Recruit C: FACILITATOR archetype, fit score +3 with TEMPO

After sorting, priority order:
1. Recruit A (SHOOTER, +4 fit) - gets most hours allocated
2. Recruit C (FACILITATOR, +3 fit) - gets second most hours
3. Recruit B (RIM_PROTECTOR, -2 fit) - gets fewest hours

Result: TEMPO team naturally builds with shooters and facilitators
```

**Archetype Fit Scores by Scheme:**

TEMPO scheme preferences:
```
PRIMARY_SCORER: 3      (Good offensive engine)
FACILITATOR: 3         (Needs playmakers for pace)
SHOOTER: 4             (Key for 3P volume)
TWO_WAY_GUARD: 2       (Defensive focus less important)
WING_SCORER: 3         (Scoring versatility good)
THREE_AND_D_WING: 3    (Elite wing option)
ALL_AROUND_WING: 2     (More defensive than needed)
POST_SCORER: 0         (Doesn't fit fast pace)
RIM_PROTECTOR: -2      (Slow, defensive-focused)
REBOUNDER_ENERGY_BIG: -1  (Energy good, but pace not)
STRETCH_BIG: 3         (Floor spacer, perfect for TEMPO)
```

DEFENSIVE scheme preferences:
```
TWO_WAY_GUARD: 4       (Defensive specialist needed)
THREE_AND_D_WING: 4    (Elite defensive piece)
RIM_PROTECTOR: 4       (Rim defense critical)
REBOUNDER_ENERGY_BIG: 3 (Defensive grunt work)
PRIMARY_SCORER: -1     (Not defensive priority)
SHOOTER: -2            (Can't defend, liability)
FACILITATOR: 1         (Okay, but not priority)
STRETCH_BIG: 0         (Neutral)
ALL_AROUND_WING: 2     (Defensive versatility)
POST_SCORER: 2         (Interior presence)
WING_SCORER: -1        (Can't defend)
```

---

### 2. Game Simulation System

**Files:** 
- `src/game/engine/sim/simGame_v0.ts` (applies modifiers)
- `src/game/engine/schemes/applySchemeModifiers.ts` (defines modifiers)

**What Changed:**
Before games are simulated, we get the coach's scheme modifiers and apply them to:
1. Pace (possessions per game)
2. Offensive accuracy (team shooting %)
3. Three-point volume (% of shots from 3)

**Code Flow:**
```typescript
// In simulateGame():
const homeScheme = getTeamSchemeModifiers(dynasty, homeTeamId);
const awayScheme = getTeamSchemeModifiers(dynasty, awayTeamId);

const adjustedHomePace = applyPaceModifier(homePace, homeScheme.pace);
const adjustedAwayPace = applyPaceModifier(awayPace, awayScheme.pace);

const poss = computePossessions(rng, adjustedHomePace, adjustedAwayPace);
```

**Then in buildTeamLinesRegulation():**
```typescript
// Apply scheme modifiers to shooting percentages
const tpPct = clamp(
  tpBase + perimSupp(oppDef.perimD) + form + hotBoost - fatiguePenalty 
  + (shootingModifier / 100),  // <- SCHEME MODIFIER HERE
  0.18, 0.58
);
```

**Example: TEMPO vs DEFENSIVE Game**

Initial parameters:
```
TEMPO team (home):
- Base pace: 70 possessions
- Scheme modifier: +6%
- Adjusted pace: 70 * 1.06 = 74.2 possessions
- Shooting modifier: +1.5%
- Three-point modifier: +8%

DEFENSIVE team (away):
- Base pace: 70 possessions
- Scheme modifier: -5%
- Adjusted pace: 70 * 0.95 = 66.5 possessions
- Shooting modifier: -2%
- Three-point modifier: -4%
```

Average of paces used: (74.2 + 66.5) / 2 = 70.35 (relatively neutral)

**Shooting accuracy applied to each player:**
```
Base 3P%: 35% (for average player)
Opponent's perimeter defense: 50 (average)
Form variance: +0.8%
Scheme modifier: +1.5% for TEMPO, -2% for DEFENSIVE

TEMPO team player: 35% + 0% + 0.8% + 1.5% = 37.3%
DEFENSIVE team player: 35% - 0.8% + 0% - 2% = 32.2%

Result: TEMPO shoots 5.1 percentage points better from 3
```

**Three-point volume adjustment:**
```
Base 3PA attempt rate (% of FGA): 30%

TEMPO modifier: +8%
Adjusted rate: 30% * 1.08 = 32.4%

DEFENSIVE modifier: -4%
Adjusted rate: 30% * 0.96 = 28.8%

In a 70-possession game (70 FGA per team):
TEMPO attempts: 70 * 0.324 = 22.7 threes (~23)
DEFENSIVE attempts: 70 * 0.288 = 20.2 threes (~20)

Result: TEMPO takes 3 more threes per game on average
```

---

### 3. Coach Career Progression

**File:** `src/game/engine/development/advanceToOffseason.ts`

**What Changed:**
At end of season, coach's `careerStats` are updated with this season's performance.

**Code:**
```typescript
if (userTeam && updatedCoach.careerStats) {
  const seasonWins = userTeam.season.wins;
  const seasonLosses = userTeam.season.losses;
  
  // Accumulate wins/losses
  updatedCoach.careerStats.totalWins += seasonWins;
  updatedCoach.careerStats.totalLosses += seasonLosses;
  updatedCoach.careerStats.seasonsCoached += 1;
  updatedCoach.careerStats.yearsAtCurrentSchool += 1;
  
  // Calculate average prestige across all seasons
  const currentPrestige = getEffectivePrestige(teamData, userTeam);
  updatedCoach.careerStats.averagePrestige = 
    (prevAvg * (prevSeasons - 1) + currentPrestige) / prevSeasons;
  
  // Update prestige tier
  if (currentPrestige >= 85) {
    updatedCoach.careerStats.currentPrestigeTier = 'BLUE_BLOOD';
  } else if (currentPrestige >= 75) {
    updatedCoach.careerStats.currentPrestigeTier = 'POWER';
  } else if (currentPrestige >= 60) {
    updatedCoach.careerStats.currentPrestigeTier = 'MID_MAJOR';
  } else if (currentPrestige >= 45) {
    updatedCoach.careerStats.currentPrestigeTier = 'MID_TIER';
  } else {
    updatedCoach.careerStats.currentPrestigeTier = 'SMALL_SCHOOL';
  }
}
```

**Example Career Arc (Multi-Year):**
```
Year 1: Start at Xavier (small school, prestige 38)
- Record: 28-4
- careerStats: {
    seasonsCoached: 1,
    totalWins: 28,
    totalLosses: 4,
    averagePrestige: 38,
    currentPrestigeTier: 'SMALL_SCHOOL',
    yearsAtCurrentSchool: 1
  }

Year 2: Still at Xavier, prestige rose to 52 (prestige modifier +14)
- Record: 25-5
- careerStats: {
    seasonsCoached: 2,
    totalWins: 53,  // 28 + 25
    totalLosses: 9,  // 4 + 5
    averagePrestige: 45,  // (38 + 52) / 2
    currentPrestigeTier: 'MID_TIER',  // >= 45
    yearsAtCurrentSchool: 2
  }

Year 3: Moved to Memphis (prestige 65 for new team)
- Record: 24-6
- careerStats: {
    seasonsCoached: 3,
    totalWins: 77,  // 53 + 24
    totalLosses: 15, // 9 + 6
    averagePrestige: 51.7,  // (45*2 + 65) / 3
    currentPrestigeTier: 'MID_MAJOR',  // >= 60? No, 51.7, so MID_TIER
    yearsAtCurrentSchool: 1  // Reset at new school
  }

Note: currentPrestigeTier uses current prestige (65), not average,
so it would be 'MID_MAJOR'. This shows year 3 coach is at a mid-major
despite average prestige being lower (due to years at small school).
```

---

## Scheme Modifier Values (Reference Table)

### Pace Modifiers (% adjustment to possessions)
```
TEMPO:       +6  → Faster paced (~74 poss vs 70 baseline)
DEFENSIVE:   -5  → Slower paced (~66 poss vs 70 baseline)
POST_HEAVY:  -3  → Slower paced (~68 poss vs 70 baseline)
THREE_POINT: +2  → Slightly faster (~71 poss vs 70 baseline)
BALANCED:    0   → No change (70 poss)
```

### Offensive Accuracy Modifiers (percentage points)
```
TEMPO:       +1.5  → Better offense (35% becomes 36.5%)
DEFENSIVE:   -1    → Worse offense (35% becomes 34%)
POST_HEAVY:  +0.5  → Slight edge (35% becomes 35.5%)
THREE_POINT: +1    → Good offense (35% becomes 36%)
BALANCED:    0     → No change (35%)
```

### Defensive Accuracy Modifiers (opponent shooting, negative = better D)
```
TEMPO:       -2    → Worse defense (opponents +2% shooting)
DEFENSIVE:   +3.5  → Better defense (opponents -3.5% shooting)
POST_HEAVY:  +1    → Decent defense (opponents -1% shooting)
THREE_POINT: +1.5  → Decent defense (opponents -1.5% shooting)
BALANCED:    0     → No change
```

### Three-Point Volume Modifiers (% adjustment to attempts)
```
TEMPO:       +8  → Much more 3PA (30% → 32.4% of shots)
DEFENSIVE:   -4  → Fewer 3PA (30% → 28.8% of shots)
POST_HEAVY:  -6  → Much fewer 3PA (30% → 28.2% of shots)
THREE_POINT: +5  → More 3PA (30% → 31.5% of shots)
BALANCED:    0   → No change (30% of shots)
```

---

## Scheme Effectiveness Analysis

Based on modifier values, expected outcomes:

**TEMPO System:**
- Advantage: Higher pace = more possessions, more scoring
- Disadvantage: Worse defense, allows more opponent possessions
- Best against: Slower teams with worse shooters
- Worst against: Defensive teams with good 3P shooters
- Win rate expectation: High scoring games, variable defense

**DEFENSIVE System:**
- Advantage: Much better defense, fewer opponent possessions
- Disadvantage: Lower scoring, fewer possessions
- Best against: Offensive teams
- Worst against: 3P shooters (system takes fewer 3s)
- Win rate expectation: Low scoring, grinding games

**POST_HEAVY System:**
- Advantage: Moderate offensive boost, interior presence
- Disadvantage: Fewer 3P attempts, slower pace
- Best against: Teams without great rim defenders
- Worst against: Modern 3P heavy teams
- Win rate expectation: Traditional basketball, interior focused

**THREE_POINT System:**
- Advantage: Balanced, good offense and defense, good 3P volume
- Disadvantage: None particularly strong
- Best against: Teams without great perimeter defenders
- Worst against: None particularly weak
- Win rate expectation: Most versatile, consistent

**BALANCED System:**
- Advantage: No weakness, flexible to any matchup
- Disadvantage: No particular strength
- Best against: Varies based on player talent
- Worst against: Specialized systems
- Win rate expectation: Depends entirely on talent

---

## Debug/Testing Commands

### Check Coach Scheme
```typescript
console.log(dynasty.coach.scheme);      // 'TEMPO'
console.log(dynasty.coach.careerStats); // Full career stats
```

### Check Scheme Modifiers
```typescript
import { getSchemeGameModifiers } from '@/game/engine/schemes/schemeDefinitions';

const mods = getSchemeGameModifiers('TEMPO');
console.log(mods);
// { pace: 6, offensiveAccuracy: 1.5, defensiveAccuracy: -2, threePointVolume: 8 }
```

### Check Recruit Fit
```typescript
import { evaluateArchetypeFit } from '@/game/engine/schemes/schemeDefinitions';

const fit = evaluateArchetypeFit('SHOOTER', 'TEMPO');
console.log(fit); // 4 (excellent fit)
```

### Check Game Modifiers Applied
```typescript
import { getTeamSchemeModifiers } from '@/game/engine/schemes/applySchemeModifiers';

const mods = getTeamSchemeModifiers(dynasty, teamId);
console.log(mods); // { pace: 6, offensiveAccuracy: 1.5, ... }
```
