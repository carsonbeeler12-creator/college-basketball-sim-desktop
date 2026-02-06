# Integration Guide: Coaching Schemes System

## For UI/Component Development

### 1. Dynasty Creation Screen Changes

**Currently expects:**
```typescript
createDynasty({
  coachName: string,
  userTeamId: ID,
  seasonYear: number,
  seed?: number
})
```

**Now expects:**
```typescript
createDynasty({
  coachName: string,
  userTeamId: ID,
  coachScheme: CoachScheme,  // <- NEW REQUIRED PARAM
  seasonYear: number,
  seed?: number
})
```

**UI Implementation:**
Add a scheme selection dropdown/card before dynasty creation:
```typescript
const schemes = ['TEMPO', 'DEFENSIVE', 'POST_HEAVY', 'THREE_POINT', 'BALANCED'];

// Show descriptions:
// TEMPO: "Fast-paced, 3-point heavy, high-scoring basketball"
// DEFENSIVE: "Defense-first, grind-it-out, low-scoring basketball"
// POST_HEAVY: "Traditional paint offense, big man emphasis"
// THREE_POINT: "Perimeter offense and defense, floor spacing"
// BALANCED: "Flexible, adaptive system with no particular emphasis"
```

### 2. Coach Profile Display

**New info available:**
```typescript
dynasty.coach.scheme  // The scheme being used

dynasty.coach.careerStats?.{
  seasonsCoached,      // How many seasons coached
  totalWins,           // Career wins
  totalLosses,         // Career losses
  averagePrestige,     // Average prestige across all seasons
  currentPrestigeTier, // 'BLUE_BLOOD' | 'POWER' | 'MID_MAJOR' | 'MID_TIER' | 'SMALL_SCHOOL'
  yearsAtCurrentSchool // How long at current school
}
```

**Display Idea:**
```
Coach: "Coach Name" (TEMPO System)

Career Stats:
- Record: 45-20 (over 3 seasons)
- Current Tier: MID_MAJOR
- Average Prestige: 62.3
- Years at School: 1
```

### 3. Scheme Descriptions for Display

```typescript
import { getSchemeName, SCHEME_PROFILES } from '@/game/engine/schemes/schemeDefinitions';

// Get scheme name:
const schemeName = getSchemeName('TEMPO'); // "Tempo"

// Get scheme description:
const scheme = SCHEME_PROFILES['TEMPO'];
console.log(scheme.description); // "Fast-paced, 3-point heavy, high-scoring basketball"

// Show scheme strengths:
// TEMPO: Pace +6, Offense +1.5%, Defense -2%, 3P Volume +8%
// DEFENSIVE: Pace -5, Offense -1%, Defense +3.5%, 3P Volume -4%
```

### 4. Recruiting Board Enhancement

Currently, recruiting board shows:
- Player name, rating, interest level

**Can now add:**
- **Fit indicator** showing if player archetype matches coach scheme
- Green checkmark for good fit (+3 to +5)
- Yellow warning for neutral fit (0 to +2)
- Red X for bad fit (-5 to -1)

**Implementation:**
```typescript
import { evaluateArchetypeFit } from '@/game/engine/schemes/schemeDefinitions';

const recruit = {...}; // Recruit object
const fit = evaluateArchetypeFit(recruit.identity.archetype, dynasty.coach.scheme);

if (fit >= 3) {
  // Green - "Perfect fit for your system"
} else if (fit >= 0) {
  // Yellow - "Decent fit for your system"
} else {
  // Red - "Poor fit for your system"
}
```

### 5. Game Results Enhancement

Currently shows:
```
Your Team 78 - 72 Opponent
```

**Could add scheme context:**
```
Your Team (TEMPO) 78 - 72 (DEFENSIVE) Opponent

Game Flow:
- 45 possessions (faster pace due to your system)
- Your shooting: 48.2% (+1.5% from TEMPO system)
- Opponent shooting: 42.1% (-3.5% from their defensive system)
- You took 28 threes vs opponent's 18
```

### 6. Season Summary After Offseason

Display updated coach stats:
```
Season Complete!

Your Scheme: TEMPO
Record: 28-4
Coach Stats Updated:
- Career Record: 48-24 (2 seasons)
- Prestige Tier: MID_MAJOR (up from MID_TIER)
- Average Prestige: 58.4
```

---

## Type Exports for UI

All necessary types are exported from `src/game/types/dynasty.ts`:

```typescript
import type { 
  CoachScheme,      // 'TEMPO' | 'DEFENSIVE' | 'POST_HEAVY' | 'THREE_POINT' | 'BALANCED'
  CoachProfile,     // Full coach profile with scheme and careerStats
} from '@/game/types/dynasty';

import { 
  evaluateArchetypeFit,  // (archetype, scheme) => number
  getSchemeName,         // (scheme) => string
  SCHEME_PROFILES,       // Record<CoachScheme, SchemeProfile>
} from '@/game/engine/schemes/schemeDefinitions';
```

---

## Backward Compatibility

**Existing saves will NOT automatically work** because:
1. `CoachProfile` now requires `scheme` field (was optional in old saves)
2. `careerStats` may be undefined in old saves

**Migration strategy:**
```typescript
// In dynasty loading/migration logic:
function migrateCoachProfile(coach: CoachProfile): CoachProfile {
  if (!coach.scheme) {
    coach.scheme = 'BALANCED'; // Default for existing saves
  }
  if (!coach.careerStats) {
    coach.careerStats = {
      seasonsCoached: 1,
      totalWins: 0,
      totalLosses: 0,
      averagePrestige: 0,
    };
  }
  return coach;
}
```

---

## Future Expansion Points

### Phase 2: Scheme Adjustment
```typescript
// Allow coach to change scheme mid-dynasty
dynasty.coach.scheme = 'DEFENSIVE';  // From TEMPO
// Could trigger prestige penalties or player happiness effects
```

### Phase 3: Scheme Effectiveness Tracking
```typescript
// Track how well scheme performs
coachCareerStats.schemeWinRates: {
  TEMPO: 0.583,        // 58.3% win rate with TEMPO
  DEFENSIVE: 0.412,    // 41.2% win rate with DEFENSIVE
}
// Could suggest "your TEMPO system works, stick with it"
```

### Phase 4: Hybrid Schemes
```typescript
type CoachScheme = 
  | 'TEMPO'
  | 'DEFENSIVE'
  | 'TEMPO_DEFENSIVE'    // NEW: hybrid
  | 'TEMPO_POST'         // NEW: hybrid
  // etc.
```

---

## Testing UI Integration

1. **Create new dynasty with different schemes** and verify:
   - Schema saves correctly
   - `dynasty.coach.scheme` is set to selection
   - Game simulations produce different scores

2. **Display coach profile** and verify:
   - Scheme displays correctly
   - Career stats show (even if mostly zeros for season 1)

3. **End season and advance to offseason** and verify:
   - `careerStats.totalWins` updated
   - `careerStats.averagePrestige` calculated
   - `careerStats.currentPrestigeTier` set correctly

4. **Check recruiting boards** and verify:
   - Player fit evaluated correctly
   - Scheme-fit players prioritized in CPU recruiting

5. **Review game results** and verify:
   - Scores differ meaningfully between scheme types
   - TEMPO teams take more 3s, DEFENSIVE teams better defense
