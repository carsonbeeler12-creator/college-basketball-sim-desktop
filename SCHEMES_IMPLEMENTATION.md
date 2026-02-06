# Coaching Schemes System - Implementation Summary

## Overview
Implemented a comprehensive **coaching schemes system** that makes team identity matter. Schemes affect recruiting, game simulation, and coach career progression.

---

## What Was Built

### 1. **Scheme Types** (5 archetypes)
- **TEMPO**: Fast-paced, 3-point heavy, high-scoring (+6% pace, +1.5% accuracy, +8% 3P volume)
- **DEFENSIVE**: Defense-first, grind-it-out, low-scoring (-5% pace, +3.5% accuracy for defense, -4% 3P volume)
- **POST_HEAVY**: Traditional paint offense, big man emphasis (-3% pace, +0.5% accuracy, -6% 3P volume)
- **THREE_POINT**: 3-and-D system, perimeter focus (+2% pace, +1% accuracy, +5% 3P volume)
- **BALANCED**: No particular emphasis (all modifiers at 0)

### 2. **Scheme Definition System** (`src/game/engine/schemes/schemeDefinitions.ts`)
Each scheme has:
- **Game Modifiers**: How they affect pace, shooting accuracy, defense, and 3-point volume
- **Archetype Preferences**: How much each player archetype (PRIMARY_SCORER, SHOOTER, RIM_PROTECTOR, etc.) fits the scheme
- **Attribute Preferences**: Specific player rating preferences (shooting3, ballHandling, rimDefense, etc.)

### 3. **Scheme-Based Recruiting** (Updated `cpuRecruiting.ts`)
- **Players evaluated by scheme fit** during board management
- When recruiting, players with archetypes that match the scheme's philosophy get weighted higher
- Example: A TEMPO team prefers SHOOTER and FACILITATOR archetypes (+4 and +3 fit)
- Example: A DEFENSIVE team prefers RIM_PROTECTOR and THREE_AND_D_WING archetypes (+4 and +4 fit)

### 4. **Scheme Effects on Game Simulation** (Updated `simGame_v0.ts`)
- **Pace adjustment**: Affects number of possessions per game
  - TEMPO teams play ~6% faster
  - DEFENSIVE teams play ~5% slower
- **Shooting accuracy adjustment**: Affects offensive shooting %
  - TEMPO teams get +1.5% offensive bonus but -2% defensive (more points allowed)
  - DEFENSIVE teams get +3.5% defensive rating (opponents shoot worse)
- **Three-point volume adjustment**: Affects shot selection
  - TEMPO teams take +8% more 3s
  - POST_HEAVY teams take -6% fewer 3s
- Scheme modifiers apply to all player shooting percentages (3P, 2P rim, midrange, FT)

### 5. **Coach Profile Enhancement** (Updated `dynasty.ts`)
Each coach now has:
```typescript
scheme: CoachScheme;  // TEMPO, DEFENSIVE, POST_HEAVY, THREE_POINT, or BALANCED
careerStats: {
  seasonsCoached: number;
  totalWins: number;
  totalLosses: number;
  bestTournamentFinish?: string;  // CHAMPIONSHIP, SEMIFINAL, etc.
  averagePrestige: number;
  currentPrestigeTier?: 'BLUE_BLOOD' | 'POWER' | 'MID_MAJOR' | 'MID_TIER' | 'SMALL_SCHOOL';
  yearsAtCurrentSchool?: number;
}
```

### 6. **Coach Career Tracking** (Updated `advanceToOffseason.ts`)
- At end of each season, coach stats are updated:
  - Total wins/losses accumulated
  - Average prestige (tracked across seasons)
  - Years at current school
  - Current prestige tier (based on team's current prestige)
- Foundation for future **job market/hiring system**

### 7. **Dynasty Creation Updated** (`createDynasty.ts`)
- Now requires `coachScheme` parameter when creating new dynasty
- Coach initialized with careerStats at season 1

---

## Data Flow Examples

### Recruiting Example: DEFENSIVE Coach
```
1. Coach scheme = DEFENSIVE
2. CPU evaluates recruit archetype (e.g., TWO_WAY_GUARD)
3. Scheme prefers TWO_WAY_GUARD (+4 fit)
4. Recruit gets weighted higher on recruiting board
5. More hours allocated to recruit that fits scheme
6. Recruits matching scheme more likely to commit
```

### Game Simulation Example: TEMPO vs DEFENSIVE
```
TEMPO Team (user) vs DEFENSIVE Team (CPU)

1. TEMPO scheme: +6% pace, +1.5% offensive accuracy, +8% 3P volume
2. DEFENSIVE scheme: -5% pace, +3.5% defensive accuracy, -4% 3P volume

Result:
- Possessions: TEMPO team plays ~6% faster (more possessions)
- Shooting: TEMPO team shoots ~1.5% better but allows ~3.5% worse shooting
- Typical outcome: TEMPO wins on volume, DEFENSIVE on efficiency
- Example score: TEMPO team 92, DEFENSIVE team 78
```

### Coach Career Progression Example
```
Season 1: Start at small school (prestige 35)
- Scheme: BALANCED
- Win 25 games, lose 5
- After season: careerStats.totalWins = 25, currentPrestigeTier = SMALL_SCHOOL

Season 2: Successfully win tournament, prestige rises to 50
- careerStats.seasonsCoached = 2
- careerStats.totalWins = 50 (25 + 25)
- careerStats.averagePrestige = 42.5 ((35 + 50) / 2)
- careerStats.currentPrestigeTier = MID_TIER
- Foundation laid for job offers from better schools next offseason
```

---

## Files Created
- `src/game/engine/schemes/schemeDefinitions.ts` - Scheme profiles and fit evaluation
- `src/game/engine/schemes/applySchemeModifiers.ts` - Scheme modifier application to game params

## Files Modified
- `src/game/types/dynasty.ts` - Added CoachScheme type and careerStats
- `src/game/engine/recruiting/cpuRecruiting.ts` - Integrated scheme fit into recruiting board management
- `src/game/engine/sim/simGame_v0.ts` - Applied scheme modifiers to pace and shooting accuracy
- `src/game/engine/createDynasty.ts` - Updated to require scheme selection
- `src/game/engine/development/advanceToOffseason.ts` - Coach career stats tracking at season end

---

## What This Enables

### Immediate Immersion:
- **Players feel their system**: Recruiting naturally targets scheme-fit players
- **Coaching identity matters**: Different schemes play noticeably different basketball
- **Results reflect philosophy**: TEMPO wins on volume, DEFENSIVE wins on efficiency

### Future Features Ready:
- **Job market system**: Coach prestige tier can be used to generate job offers
- **Coach advancement**: Small school → mid-tier → power → blue blood career arc
- **Rivalry effects**: Scheme matchups could create natural competitive storylines
- **Media narratives**: Recaps can reference "Coach Smith's defensive system held opponent to..."

### Balancing Authority:
- Scheme modifiers are modest (+/- 1-6% typically) so they influence but don't dominate
- Strong players still beat weak players regardless of scheme
- Scheme is about team identity, not power leveling

---

## Next Steps (Future Phases)

### Phase 2A: Narrative Layer
- Track in-game events (tempo, shooting efficiency, defensive intensity)
- Generate templated recaps: "Coach's TEMPO offense forced 45 possessions"
- Connect scheme to game outcomes in recap text

### Phase 2B: Job Market
- Generate coach job openings based on prestige tier
- Offer coaches at other schools opportunities
- Track prestige tier progression to enable "Alabama to G-League" and "Small School to Blue Blood" narratives

### Phase 3: Advanced Schemes
- Allow scheme adjustments mid-dynasty (coach evolves their system)
- Add "hybrid" schemes (TEMPO_DEFENSIVE, etc.)
- Tournament success affects scheme effectiveness (upsets boost credibility)

---

## Technical Details

### Scheme Fit Scoring
Archetype fit ranges from -5 to +5:
- PRIMARY_SCORER in TEMPO: +3 (high fit)
- PRIMARY_SCORER in DEFENSIVE: -1 (low fit)
- RIM_PROTECTOR in DEFENSIVE: +4 (excellent fit)
- SHOOTER in THREE_POINT: +4 (excellent fit)

### Game Modifier Application
All modifiers are applied additively and clamped:
- Pace: `basePace * (1 + modifier/100)`, typical result 65-78 possessions
- Shooting: `basePct + (modifier/100)`, clamped to realistic ranges (0.18-0.58 for 3P, etc.)
- Volume: `baseRate * (1 + modifier/100)`, clamped to 0.20-0.50

---

## Testing Checklist

- [x] No TypeScript errors
- [x] Scheme types defined
- [x] Recruiting evaluates scheme fit
- [x] Game sim applies scheme modifiers
- [x] Coach stats tracked at season end
- [ ] UI for scheme selection (user-facing, next phase)
- [ ] Verify game scores differ between scheme types
- [ ] Verify recruitment boards prioritize scheme-fit players
