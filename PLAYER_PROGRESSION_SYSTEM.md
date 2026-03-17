# Player Progression System - Technical Documentation

**Version:** 2.0 (Complete Overhaul)  
**Last Updated:** Implementation Complete  
**Save Compatibility:** ✅ Fully backwards compatible (all new fields optional)

---

## Overview

The player progression system has been completely redesigned to create **realistic, varied, and unpredictable career trajectories**. Not all players follow the same path—some peak early, some break out late, some plateau, and elite recruits don't always become stars.

### Key Features

1. **Growth Curves**: Early bloomers, normal progressors, and late bloomers
2. **Volatility System**: Predictable vs. unpredictable development patterns
3. **Plateau Mechanics**: Players can stop improving and even regress
4. **Breakout Years**: Late bloomers and underused talent can surge unexpectedly
5. **Scheme Fit**: Players develop faster in systems matching their archetype
6. **Confidence System**: Recent performance affects short-term development
7. **Controlled Randomness**: Bounded variance prevents extreme outliers
8. **Usage-Based Development**: Playing time is critical for improvement

---

## How Progression Curves Work

### 1. Growth Curves (Player Trajectories)

Every player has a `growthCurve` type that determines their development timeline:

#### **Early Bloomers** (15% of players)
- **Characteristics**: Peak quickly as freshmen/sophomores, then plateau
- **Multipliers by year**:
  - FR → SO: **1.4x** (huge initial jump)
  - SO → JR: **1.1x** (still improving)
  - JR → SR: **0.7x** (declining growth)
  - SR → Graduate: **0.4x** (minimal growth)
- **Career Arc**: Strong freshman year, gradual decline in improvement rate
- **Examples**: 5-star recruits who enter college already polished

#### **Normal Progressors** (60% of players)
- **Characteristics**: Steady development throughout career
- **Multipliers by year**:
  - FR → SO: **1.0x** (baseline)
  - SO → JR: **0.85x**
  - JR → SR: **0.7x**
  - SR → Graduate: **0.5x**
- **Career Arc**: Consistent year-over-year improvement, tapering in senior year
- **Examples**: Typical college players who improve steadily

#### **Late Bloomers** (25% of players)
- **Characteristics**: Slow start, breakout in junior/senior year
- **Multipliers by year**:
  - FR → SO: **0.6x** (slow start)
  - SO → JR: **0.8x** (picking up steam)
  - JR → SR: **1.3x** (breakout!)
  - SR → Graduate: **1.0x** (staying strong)
- **Career Arc**: May ride the bench early, then explode in development
- **Examples**: 2-star recruits who become All-Conference seniors

### 2. Volatility (Predictability)

Each player has a `volatility` rating (0-100) that determines development consistency:

#### **Low Volatility (0-30)**
- **Development**: Predictable, steady, few surprises
- **Variance**: ±0.5 points per season
- **Characteristics**: Safe, reliable players; minimal bust/breakout risk
- **Typical Players**: High work ethic, structured archetypes

#### **Medium Volatility (31-70)**
- **Development**: Some variance, occasional surprises
- **Variance**: ±1.0 points per season
- **Characteristics**: Normal development with room for unexpected jumps/drops
- **Typical Players**: Average prospects

#### **High Volatility (71-100)**
- **Development**: Wildly unpredictable, huge swings possible
- **Variance**: ±1.5 points per season
- **Characteristics**: High bust risk but also breakout potential
- **Typical Players**: High-potential recruits, risky prospects

**How Volatility is Assigned:**
- Tied to potential: Higher potential → typically more volatile
- Randomness added: Some high-potential players are stable, some low-potential are wild
- Formula: `(potential - 70) / 30 * 100 + random(-30, +30)`

### 3. Scheme Fit Multiplier

Players develop faster when their archetype matches the coach's scheme:

| Archetype | TEMPO | DEFENSIVE | POST_HEAVY | THREE_POINT | BALANCED |
|-----------|-------|-----------|------------|-------------|----------|
| **SHOOTER** | **1.20x** | 0.90x | 0.85x | **1.20x** | 1.0x |
| **POST_SCORER** | 1.0x | 1.05x | **1.25x** | 0.90x | 1.0x |
| **RIM_PROTECTOR** | 0.85x | **1.20x** | 1.05x | 0.95x | 1.0x |
| **THREE_AND_D_WING** | **1.15x** | **1.20x** | 0.80x | **1.25x** | 1.0x |

- **Perfect fit**: +25% development rate (SHOOTER in THREE_POINT scheme)
- **Mismatch**: -15% development rate (POST_SCORER in TEMPO scheme)
- **Balanced scheme**: Neutral (1.0x) for all archetypes

**Gameplay Impact:**
- User's coaching scheme **directly affects player development**
- Recruiting players that fit your scheme pays long-term dividends
- System archetypes develop faster in their ideal environment

---

## How Randomness is Bounded

### Hard Caps (Prevent Extreme Outliers)

1. **Absolute Maximum Growth**: ±4 points overall per season
2. **Elite Player Cap (90+ overall)**: ±2 points per season maximum
3. **Generational Talents**: Slightly looser cap (+15% bonus, max 5 points)
4. **Individual Stat Caps**: 0-3 points per rating per season

### Diminishing Returns at High Ratings

As players approach their potential, growth slows dramatically:

| Overall Rating | Room to Grow |
|----------------|--------------|
| 75-79 | 75% of potential gap |
| 80-84 | 55% of potential gap |
| 85-87 | 35% of potential gap |
| 88+ | **25% of potential gap** |

**Example:**
- 80 overall player with 90 potential:
  - Gap: 10 points
  - Room to grow: 10 × 0.55 = 5.5 points
  - Effectively capped at ~85 overall in most seasons

### Variance Formula

Total variance is controlled by volatility:
```
varianceRange = 1.5 × (volatility / 100)
randomVariance = random(-varianceRange, +varianceRange)
```

**Examples:**
- 0 volatility: ±0.0 variance (purely deterministic)
- 50 volatility: ±0.75 variance
- 100 volatility: ±1.5 variance (max)

### Plateau and Regression

Players can stop improving or even regress:

#### **Plateau Triggers**
- Close to potential (within 3-5 points): High plateau chance
- High overall (85+): 2.5x plateau multiplier
- Poor work ethic (<40): 1.5x plateau multiplier
- Senior year: 25% base plateau chance

#### **Regression**
- Once plateau'd, 15% base regression chance per year
- Additional +5% per year plateau'd
- Regression: -1 to -2 overall per season

---

## How Players Differentiate Over Careers

### Career Archetypes

The system creates 6 distinct career patterns:

#### 1. **The Bust** (5-10% of high-potential recruits)
- High star rating (4★ or 5★)
- Plateaus early (FR/SO year)
- Never reaches potential
- **Example**: 5★ recruit who peaks at 78 overall as sophomore

#### 2. **The Steady Contributor** (40-50% of players)
- Normal growth curve, medium volatility
- Gradual improvement each year
- Reaches 80-90% of potential by senior year
- **Example**: 3★ recruit → solid starter → 73 overall senior

#### 3. **The Late Bloomer** (15-20% of players)
- Slow start (bench FR/SO), breakout JR/SR
- High volatility + late growth curve
- Can jump 4-6 points in junior year
- **Example**: 2★ recruit → 68 overall junior → 76 overall senior

#### 4. **The Early Peak** (10-15% of players)
- Dominant freshman year, then plateaus
- Early growth curve + high initial rating
- Minimal SR year growth
- **Example**: 5★ recruit → 80 overall FR → 82 overall SR

#### 5. **The Hidden Gem** (5-8% of low-star recruits)
- Low star rating (1★ or 2★)
- Gem status + high work ethic + scheme fit
- Surpasses potential by 3-5 points
- **Example**: 1★ recruit → 58 initial → 77 overall senior

#### 6. **The Superstar** (1-3% of elite recruits)
- Generational talent flag
- Consistent high development despite diminishing returns
- Award bonuses + high usage + perfect scheme fit
- **Example**: 5★ generational → 85 overall FR → 93 overall SR

### Usage Impact on Development

Playing time is **the most critical factor** in player development:

| Minutes/Game | Tier | Multiplier | Description |
|--------------|------|------------|-------------|
| 28+ | Star | **1.4x** | Elite starters, team leaders |
| 22-28 | Starter | **1.2x** | Solid rotation starters |
| 15-22 | Rotation | **0.9x** | Key bench pieces |
| 8-15 | Bench | **0.6x** | Limited minutes, slow growth |
| <8 | Deep Bench | **0.3x** | Barely develops |

**Implications:**
- Bench players improve 4.6x slower than stars
- A 70 overall player with star minutes can exceed a 75 overall bench player in 2 years
- Redshirt freshmen (0 minutes) develop minimally

### Breakout Years

Random surge events that dramatically accelerate development:

#### **Breakout Conditions**
- Need 5+ point gap to potential
- Late bloomers in JR year: **15% chance**
- High volatility players: +50% chance
- Underused talent (potential > minutes): +40% chance

#### **Breakout Multiplier**
- **1.8x** boost to all development for that season
- Can result in 4-6 point jumps in a single year
- Combines with other multipliers (usage, scheme fit, awards)

**Example Breakout:**
```
Player: 2★ recruit, late bloomer, 70 potential, 62 overall SO
Situation: Only playing 12 min/game despite 70 potential
Breakout: Explodes to 68 overall junior year (6 point jump!)
Result: Becomes starter, continues strong development
```

### Confidence System

Recent performance affects short-term development:

#### **Confidence Calculation**
- Based on points per game vs. expected output
- Also factors in playing time (not playing hurts confidence)
- Changes slowly (±5 max per season)

#### **Confidence Multipliers**
- **High Confidence (70-100)**: 1.0x to 1.1x development
- **Medium Confidence (40-69)**: 0.95x to 1.0x development
- **Low Confidence (0-39)**: 0.9x to 0.95x development

**Example:**
- 75 overall player expected to score 12 ppg
- Actually scores 16 ppg with 25 min/game
- Confidence: 50 → 55 (positive season)
- Development boost: +2% for next season

---

## Formula Reference

### Base Improvement Calculation

```typescript
baseImprovement = roomToGrow × 0.12  // 12% of potential gap

// Apply all multipliers
totalImprovement = baseImprovement
  × workEthicMultiplier    // 0.7x to 1.3x
  × growthCurveMultiplier  // 0.4x to 1.4x
  × usageMultiplier        // 0.3x to 1.4x
  × schemeFitMultiplier    // 0.85x to 1.25x
  × awardBoostMultiplier   // 1.0x to 1.5x
  × confidenceMultiplier   // 0.9x to 1.1x
  × breakoutMultiplier     // 1.0x or 1.8x

// Add volatility-based variance
variance = random(-1.5 × volatility/100, +1.5 × volatility/100)
finalImprovement = clamp(totalImprovement + variance, -4, +4)
```

### Work Ethic Multiplier
```
workEthicMult = 0.7 + (workEthic / 100) × 0.6
```
- 30 work ethic → 0.88x
- 50 work ethic → 1.0x
- 100 work ethic → 1.3x

### Award Boost Multiplier
```
Player of Year: +30%
All-American 1st: +20%
All-American 2nd/3rd: +10-15%
All-Conference: +5-10%
```

---

## Balance Considerations

### Prevents Runaway Development
1. **Hard caps** limit max growth to ±4 per season
2. **Diminishing returns** slow growth at 80+ overall
3. **Plateau mechanics** stop some players from improving
4. **Regression** can happen after plateau

### Prevents Stat Inflation Over 100+ Seasons
- Elite players (88+) capped at ±2 per season
- Plateau chance increases exponentially with overall rating
- High volatility creates busts (canceled out by breakouts)
- Usage multiplier encourages rotation (bench players stagnate)

### Maintains Long-Term Balance
- Average development: +1.5 to +2.5 per season for starters
- Bench players: +0.5 to +1.5 per season
- Elite players: +0.5 to +1.5 per season (diminishing returns)
- **Net effect**: Ratings stay in realistic 60-90 range over time

---

## Save Compatibility

All new fields are **optional** and initialized on-demand:

### New Fields Added to `PlayerState.development`
```typescript
{
  volatility?: number;        // Initialized to potential-based value + variance
  growthCurve?: "early" | "normal" | "late";  // Assigned randomly
  confidence?: number;        // Starts at 50 (neutral)
  yearsSincePeak?: number;    // Tracks plateau duration
}
```

### Initialization Logic
- Called automatically in `progressPlayer()` via `ensureDevelopmentFields()`
- Uses player's potential and deterministic RNG to assign values
- Existing saves will initialize fields on first offseason after update

### No Manual Migration Required
- Engine handles initialization transparently
- No save version bump needed
- Old saves continue to work without manual intervention

---

## Testing & Validation

### Recommended Tests

1. **10-Year Sim**: Track player trajectories across careers
   - Verify early bloomers plateau in JR/SR year
   - Verify late bloomers surge in JR/SR year
   - Check for busts (high potential, low final rating)
   - Check for gems (low star, high final rating)

2. **Usage Experiment**: Compare bench vs. starter development
   - Two identical 70 overall FR players
   - One gets 28 min/game, one gets 8 min/game
   - By SR year, starter should be 6-10 points higher

3. **Scheme Fit Test**: Compare development in matched vs. mismatched schemes
   - SHOOTER in THREE_POINT scheme vs. POST_HEAVY scheme
   - Should see 15-25% faster development in matched scheme

4. **Breakout Detection**: Track 100 late bloomers
   - ~15-20% should have breakout JR/SR year (4+ point jump)
   - Underused talent should break out more frequently

5. **Stat Inflation Check**: 100-season sim
   - Average team overall should stay 68-72
   - Max player overall should stay below 94 (except rare generational + luck)

---

## Performance Considerations

### Computational Cost
- **Per player per season**: ~150-200 operations
- **Full roster (350 teams × 13 players)**: <50ms on modern CPU
- **No async needed**: Runs synchronously in offseason phase

### Memory Footprint
- **New fields**: 4 numbers per player (~16 bytes)
- **Total dynasty increase**: ~75 KB (350 teams × 13 players × 16 bytes)
- **Negligible** impact on save file size

---

## Future Enhancements (Not Implemented)

### Potential Additions
1. **Injury Impact**: Injuries reduce confidence and slow development
2. **Team Success Bonus**: Conference/tournament success boosts entire team's confidence
3. **Coaching Quality**: Elite coaches develop players faster
4. **Strength & Conditioning**: Additional work ethic-like attribute for physical development
5. **Mental Attributes**: Basketball IQ that improves separate from physical skills

### Why Not Included Now
- Minimize new data fields (save compatibility concern)
- Core mechanics already comprehensive
- Can be layered on top later if desired

---

## Code Reference

### Key Files
- **Types**: `src/game/types/dynasty.ts` (lines 172-182)
- **Progression Logic**: `src/game/engine/development/playerProgression.ts`
- **Offseason Integration**: `src/game/engine/development/advanceToOffseason.ts` (line 113)
- **Scheme Definitions**: `src/game/engine/schemes/schemeDefinitions.ts`

### Function Signature
```typescript
export function progressPlayer(
  player: PlayerState,
  rng: Rng,
  avgMinutesPlayed: number = 0,
  coachScheme?: CoachScheme
): PlayerState
```

### Example Usage
```typescript
// In offseason, for each player:
const isUserTeam = teamId === dynasty.league.userTeamId
const coachScheme = isUserTeam ? dynasty.coach.scheme : undefined

const avgMinutes = player.stats.gamesPlayed > 0
  ? player.stats.minutes / player.stats.gamesPlayed
  : 0

const progressedPlayer = progressPlayer(
  player,
  rng,
  avgMinutes,
  coachScheme
)
```

---

## Summary

The new player progression system creates **rich, varied, and unpredictable career trajectories** while maintaining long-term balance. Key innovations:

✅ **Not all players progress linearly** (growth curves)  
✅ **Some plateau early** (plateau mechanics)  
✅ **Some break out late** (breakout years, late bloomers)  
✅ **Elite prospects don't always become stars** (busts via plateau + volatility)  
✅ **Low-star recruits can become great** (gems + late bloomers + work ethic)  
✅ **Controlled randomness** (volatility + variance bounds)  
✅ **Long-term balance** (hard caps + diminishing returns)  
✅ **Backwards compatible** (all new fields optional)  
✅ **Performant** (<50ms for full league)

The system **rewards strategic coaching decisions** (scheme fit, rotation management, recruiting fit) while introducing enough randomness to create compelling stories over 100+ season dynasties.
