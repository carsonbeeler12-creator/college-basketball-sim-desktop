# Copilot Instructions: College Basketball Dynasty Simulator

## Architecture Overview

**Stack**: Electron + React + TypeScript (Vite) for NCAA basketball dynasty management sim.

### Core Design Pattern
- **Central Data Structure**: `Dynasty` type in [src/game/types/dynasty.ts](src/game/types/dynasty.ts) holds all game state (teams, players, schedule, league standings, tournament brackets, recruiting state).
- **Immutable Updates**: Game engine functions take `Dynasty` and return modified `Dynasty` via object spreading (never mutate directly).
- **Phase-Driven Progression**: Game progresses through `WorldPhase` enum (PRESEASON → NON_CONFERENCE → CONFERENCE → CONF_TOURNAMENT → TOURNAMENT_READY → POSTSEASON → OFFSEASON).

### Component Layers

1. **Electron Main** ([electron/main.ts](electron/main.ts)): IPC handlers for dynasty file persistence (save/load/delete) in `userData/dynasties/`.
2. **Preload** ([electron/preload.ts](electron/preload.ts)): Exposes `window.api` with `saveDynasty()`, `loadDynasty()`, `loadDynastyIndex()` etc.
3. **React UI** ([src/ui/screens/](src/ui/screens/)): Screen-based navigation controlled from [src/App.tsx](src/App.tsx).
4. **Game Engine** ([src/game/engine/](src/game/engine/)): Pure functions for simulation, recruiting, ratings, schedules, and tournament management.

## Critical Game Flows

### Season Simulation (`simWeek`)
- [src/ui/hooks/useDynastyController.ts](src/ui/hooks/useDynastyController.ts) → calls `simWeek()` from [src/game/engine/sim/simWeek.ts](src/game/engine/sim/simWeek.ts)
- Generates games for current phase, simulates them, updates standings/stats incrementally
- Returns: `{ dynasty, newGameId, events }`
- Fast variant: `simWeekFast()` for bulk simulation without tracking individual games

### Offseason Transition ([src/game/engine/development/advanceToOffseason.ts](src/game/engine/development/advanceToOffseason.ts))
- Graduates seniors, resets stats for returning players, converts signed recruits to roster
- Generates ~300-person recruit pool annually
- Allocates coaching awards (Player of Year, All-American, etc.)
- Increments `seasonYear`, transitions to PRESEASON phase

### Tournament Management
- Conference tournaments: [src/game/engine/tournament/generateConferenceTournaments.ts](src/game/engine/tournament/generateConferenceTournaments.ts) + [simulateConferenceTournaments.ts](src/game/engine/tournament/simulateConferenceTournaments.ts)
- NCAA tournament: [generateBracket.ts](src/game/engine/tournament/generateBracket.ts) + [simulateTournament.ts](src/game/engine/tournament/simulateTournament.ts)
- Bracket is precomputed; games simulated round-by-round

### Recruiting System
- **Generation**: [generateRecruitPool.ts](src/game/engine/recruiting/generateRecruitPool.ts) creates pool annually
- **Management**: Teams allocate coaching hours across recruiting targets via [boardManagement.ts](src/game/engine/recruiting/boardManagement.ts)
- **CPU Teams**: Auto-recruiting via [cpuRecruiting.ts](src/game/engine/recruiting/cpuRecruiting.ts)
- **Signs**: Recruited players convert to roster at offseason

## Data Flows & Key Types

### Dynasty Structure (Central State)
```
Dynasty {
  world: { seasonYear, phase, day }
  league: { userTeamId, teamsById, gamesById, schedule, tournament, conferenceTournaments }
  playersById: { [PlayerState] }
  recruiting: { seasonYear, boardsByTeamId }
  coach: { name, scheme, careerStats }
  rng: { seed, state } // For deterministic randomness
}
```

### Player Ratings Evolution
- **Archetypes**: 11 fixed types (PRIMARY_SCORER, FACILITATOR, SHOOTER, etc.) defined in [engine/ratings/archetypes.ts](src/game/engine/ratings/archetypes.ts)
- **Ratings Update**: [src/game/engine/ratings/playerRatingUpdate.ts](src/game/engine/ratings/playerRatingUpdate.ts) — progress based on archetype, scheme fit, and minutes played
- **Scheme Influence**: Coach scheme (BALANCED, PACE_AND_SPACE, etc.) affects rating gains and recruiting appeal

### Stats Tracking
- **Game Stats**: Tracked per-game, accumulated to season totals
- **Location**: [src/game/engine/stats/](src/game/engine/stats/)
- **Awards Eligibility**: Determined by season stats; processed in offseason

## Key Workflows for Development

### Testing
- **End-to-End Season Flow**: `npm run test:season-flow` validates graduation → offseason → new season
- Uses `vite-node` to run TypeScript directly without build
- See [scripts/test-season-flow.ts](scripts/test-season-flow.ts) as example for creating dynasty, advancing phases

### Build & Deployment
- **Dev**: `npm run dev:electron` (Vite dev server + Electron)
- **Build**: `npm run build` (TypeScript check → Vite build → electron-builder)
- **Deployment**: PowerShell scripts for itch.io ([scripts/itch-push.ps1](scripts/itch-push.ps1))

### Performance Monitoring
- Set `VITE_QA_PERF_LOG=true` env var to enable `performance.mark/measure` logging in [useDynastyController.ts](src/ui/hooks/useDynastyController.ts)
- Useful for profiling sim week duration and file I/O

## Common Patterns & Gotchas

1. **Always Return New Dynasty**: Engine functions never mutate. Use object spreading:
   ```typescript
   const updated = { ...dynasty, world: { ...dynasty.world, day: day + 1 } }
   ```

2. **Phase Progression**: Many features gate on `dynasty.world.phase`. Check phase enums in [types/dynasty.ts](src/game/types/dynasty.ts).

3. **Save Versioning**: `DYNASTY_SAVE_VERSION` in [types/dynasty.ts](src/game/types/dynasty.ts) increments on schema changes. Older saves auto-migrate in `loadSave()`.

4. **Rng Seed**: `dynasty.rng` enables deterministic randomness. Seed advances with each random call.

5. **Team & Player ID Consistency**: IDs are stable strings; always validate they exist in respective `teamsById`/`playersById` before access.

6. **UI State Sync**: `useDynastyController.persistActiveSave()` handles save + index refresh atomically; prefer over manual API calls.

## Repository Navigation

- **Game Logic**: `src/game/engine/` (sim, recruiting, ratings, stats, schedule, tournament)
- **Types**: `src/game/types/` (Dynasty, Player, Team structures)
- **UI Screens**: `src/ui/screens/` (one component per major screen)
- **UI Hooks**: `src/ui/hooks/` (useDynastyController, useRotationController)
- **Electron IPC**: `electron/main.ts` (file I/O), `electron/preload.ts` (API bridge)
- **Build Config**: `vite.config.ts`, `electron-builder.json5`, `tsconfig.json`

## Testing & Debugging

- Run type checker: `npm run build` (includes `tsc`)
- Run linter: `npm run lint`
- Load raw dynasty JSON in browser console: `window.api.loadDynastyRaw(dynastyId)`
- Export debug data: `window.api.saveDebug(obj)` (saved to `userData/`)

---

## Simulation Mechanics

### Rotation System

**Starter Selection** ([allocateTeamMinutes.ts](src/game/engine/minutes/allocateTeamMinutes.ts)):
- Depth chart autofills by position+overall rating if manual chart undefined
- Each position ranked 0–N; rank 0 = starter with highest weight (roleMultiplier 3.2)
- User can reorder depth chart via `moveDepthChart()` → saves to `team.rotation.depthChart[position][]`

**Minute Distribution**:
- Three factors multiply to determine player minutes:
  1. **Role**: Starter(3.2) > Backup(0.85) > Bench(0.35) > Deep(0.15) > Emergency(0.07)
  2. **Philosophy**: `benchFactor` (0–1) amplifies role weight for backups; starters always 1.0
  3. **Rotation Size**: `rotationSizeTarget` (6.5–10.5) sharply reduces deep bench beyond target
- Position coverage penalties (e.g., SG covering PG = 0.85 multiplier) applied
- Final minutes per player rounded to match team 200-minute total per game

**Recalculation Triggers** ([useDynastyController.ts](src/ui/hooks/useDynastyController.ts)):
- `allocateTeamMinutes()` called each game with deterministic seed: `${gameId}_${teamId}_${dayOfSeason}`
- Seed ensures same player gets same minutes for preview vs. actual game
- Rotation settings kept in `team.rotation.settings` (style: NORMAL/AGGRESSIVE, benchFactor, rotationSizeTarget)

---

## Coaching Schemes

**Available Schemes** ([schemeDefinitions.ts](src/game/engine/schemes/schemeDefinitions.ts)):
- **TEMPO**: +6 pace, +1.5 accuracy, -2 defense, +8 three volume (fast, perimeter-heavy)
- **DEFENSIVE**: -5 pace, -1 accuracy, +3.5 defense, -4 three volume (slow, grind-it-out)
- **POST_HEAVY**: -3 pace, +0.5 accuracy, +1 defense, -6 three volume (big man emphasis)
- **THREE_POINT**: +2 pace, +1 accuracy, +1.5 defense, +5 three volume (3-and-D balance)
- **BALANCED**: 0 modifiers across all categories (baseline, no bonuses)

**Modifiers Table** (Applied in game simulation):

| Scheme | Pace | Off Accuracy | Def Accuracy | 3PT Volume |
|--------|------|--------------|--------------|------------|
| TEMPO | +6% | +1.5% | -2% | +8% |
| DEFENSIVE | -5% | -1% | +3.5% | -4% |
| POST_HEAVY | -3% | +0.5% | +1% | -6% |
| THREE_POINT | +2% | +1% | +1.5% | +5% |
| BALANCED | — | — | — | — |

**Recruiting Bias** (Archetype preferences):
- TEMPO prefers SHOOTER(+4), FACILITATOR(+3), STRETCH_BIG(+3); penalizes RIM_PROTECTOR(-2)
- DEFENSIVE prefers TWO_WAY_GUARD(+4), THREE_AND_D_WING(+4), RIM_PROTECTOR(+4); penalizes SHOOTER(-2)
- POST_HEAVY prefers POST_SCORER(+5), REBOUNDER(+3); penalizes SHOOTER(-3)
- THREE_POINT prefers THREE_AND_D_WING(+5), SHOOTER(+4), neutral on defense focus
- Archetype fit increases recruiting success rate in [cpuRecruiting.ts](src/game/engine/recruiting/cpuRecruiting.ts)

**Progression Impact**:
- Player ratings improve faster (+progression multiplier) when minutes fit archetype + scheme
- e.g., SHOOTER in TEMPO system gains shooting rating faster than POST_SCORER
- Scheme mismatches deduct from progression (e.g., RIM_PROTECTOR in TEMPO grows slower)
- Applied in [playerRatingUpdate.ts](src/game/engine/ratings/playerRatingUpdate.ts)

---

## Preseason Phase

**Step-by-Step Checklist** ([startNewSeason.ts](src/game/engine/development/startNewSeason.ts)):

1. ✅ Set `world.phase = 'PRESEASON'`, `world.day = 0`, `world.seasonYear += 1`
2. ✅ Generate fresh recruit pool (~250–300 recruits via [generateRecruitPool.ts](src/game/engine/recruiting/generateRecruitPool.ts))
3. ✅ Reset all recruiting boards: `boardsByTeamId[teamId] = { recruitIds: [], hoursAllocated: {}, ... }`
4. ✅ Reset team season records: `team.season = { wins: 0, losses: 0, confWins: 0, confLosses: 0 }`
5. ✅ Generate new schedule for season via [generateSchedule.ts](src/game/engine/schedule/generateSchedule.ts)
6. ✅ Clear tournament/conferenceTournaments (repopulated at phase transitions)
7. ✅ Clear seasonal stats: `seasonStats = { teamsById: {}, playersById: {} }`
8. ✅ Advance RNG state (deterministic seed progression)

**Validation Rules**:
- All rosters must have ≥10 players (graduates removed, recruits signed converts to roster in advanceToOffseason)
- Depth charts autofill if missing or corrupted
- Schedule must have games for each team (validation in generateSchedule)
- Recruit pool must be populated before CPU teams begin recruiting
- No games simulated in PRESEASON; phase advances to NON_CONFERENCE when `simWeek()` called with sufficient day count

---

## Game Stat Pipeline

**High-Level Flow** ([simGame_v0.ts](src/game/engine/sim/simGame_v0.ts) + [simWorker.ts](src/game/engine/sim/simWorker.ts)):

```
1. INPUT: Dynasty + two team IDs
   ↓
2. ALLOCATE MINUTES: Call allocateTeamMinutes() → { pid: minutes }[] per team
   ↓
3. COMPUTE POSSESSIONS: Base pace (66) + scheme pace mod ± random variance
   ↓
4. GENERATE TEAM TOTALS: FGA/FTA/rebounds/steals/blocks/TOs per possession rate
   ↓
5. RATING INTERPOLATION: Player overall → 3PT%, 2PT%, FT% curves (steeper = more differentiation)
   ↓
6. DISTRIBUTE TO PLAYERS: Round-robin distribution to match team totals + soft position caps
           Starters cap 24+ pts/game, benches cap 10–15 pts (rare spike allowed ~5%)
   ↓
7. APPLY ARCHETYPE MULTIPLIERS: SHOOTER gets +55% 3P volume, POST_SCORER gets +55% rim volume
   ↓
8. SCHEME MODIFIERS: Add accuracy/pace adjustments at game level
   ↓
9. UPSET LOGIC: Variance scaled by team strength diff (underdogs get wider variance cone)
   ↓
10. OUTPUT: { homeBoxScore, awayBoxScore, gameState } with all player stats recorded
```

**Key Stages**:
- **Minutes**: Deterministic per player based on depth chart + role + scheme fit
- **Rating Curves**: 20-rating → 22% 3PT%, 99-rating → 50% (anchors in code)
- **Soft Caps**: Prevent unrealistic single-game performances while allowing rare hot games
- **Archetype Tendencies**: SHOOTER takes more 3s, POST_SCORER attacks rim; independent of ability
- **Team Defense**: Weighted average of defenders' perimD/rimD ratings affects opponent shooting %
- **Final Rounding**: Fractional stats resolved stochastically to ensure totals match exactly
