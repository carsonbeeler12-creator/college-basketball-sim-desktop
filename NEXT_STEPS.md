# Next Steps: Integrating Schemes into UI

## What's Done ✅
- Scheme definitions (5 types with modifiers)
- Recruiting system respects scheme fit
- Game sim applies scheme modifiers
- Coach career tracking
- All code compiles with zero errors
- Fully tested and documented

## What's Next 🚀

### Priority 1: Dynasty Creation UI (30 mins)

**Location:** Wherever users create new dynasties (probably a React component)

**Changes Needed:**
1. Add scheme selection dropdown
2. Show scheme descriptions
3. Pass scheme to `createDynasty()` function

**Code Example:**
```typescript
const schemes: CoachScheme[] = ['TEMPO', 'DEFENSIVE', 'POST_HEAVY', 'THREE_POINT', 'BALANCED'];

const schemeDescriptions: Record<CoachScheme, string> = {
  TEMPO: "Fast-paced, 3-point heavy, high-scoring basketball",
  DEFENSIVE: "Defense-first, grind-it-out, low-scoring basketball",
  POST_HEAVY: "Traditional paint offense, big man emphasis",
  THREE_POINT: "Perimeter offense and defense, floor spacing",
  BALANCED: "Flexible, adaptive system with no particular emphasis",
};

// In component:
const [selectedScheme, setSelectedScheme] = useState<CoachScheme>('BALANCED');

const handleCreateDynasty = () => {
  const newDynasty = createDynasty({
    coachName,
    userTeamId,
    coachScheme: selectedScheme,  // <- NEW
    seasonYear,
  });
};
```

### Priority 2: Coach Profile Display (30 mins)

**Show coach scheme and career stats somewhere (sidebar/dashboard)**

**Code Example:**
```typescript
import { getSchemeName } from '@/game/engine/schemes/schemeDefinitions';

<CoachCard>
  <Name>{dynasty.coach.name}</Name>
  <Scheme>{getSchemeName(dynasty.coach.scheme)}</Scheme>
  
  {dynasty.coach.careerStats && (
    <>
      <Record>
        {dynasty.coach.careerStats.totalWins}-{dynasty.coach.careerStats.totalLosses}
      </Record>
      <Prestige>
        Tier: {dynasty.coach.careerStats.currentPrestigeTier}
      </Prestige>
      <YearsAtSchool>
        Years: {dynasty.coach.careerStats.yearsAtCurrentSchool}
      </YearsAtSchool>
    </>
  )}
</CoachCard>
```

### Priority 3: Recruiting Board Fit Indicator (1 hour)

**Add scheme fit indicator to recruiting board**

**Code Example:**
```typescript
import { evaluateArchetypeFit } from '@/game/engine/schemes/schemeDefinitions';

function RecruitRow({ recruit, dynasty }) {
  const fit = evaluateArchetypeFit(recruit.identity.archetype, dynasty.coach.scheme);
  
  const fitColor = fit >= 3 ? 'green' : fit >= 0 ? 'yellow' : 'red';
  const fitText = fit >= 3 ? 'Perfect fit' : fit >= 0 ? 'Decent fit' : 'Poor fit';
  
  return (
    <tr>
      <td>{recruit.firstName} {recruit.lastName}</td>
      <td>{recruit.identity.archetype}</td>
      <td style={{ background: fitColor }}>{fitText}</td>
      <td>{recruit.ratings.overall}</td>
    </tr>
  );
}
```

### Priority 4: Game Result Enhancement (1 hour)

**Add scheme context to game results**

**Code Example:**
```typescript
function GameResult({ game, dynasty }) {
  const homeTeam = dynasty.league.teamsById[game.homeTeamId];
  const awayTeam = dynasty.league.teamsById[game.awayTeamId];
  
  const homeScheme = game.homeTeamId === dynasty.league.userTeamId 
    ? dynasty.coach.scheme 
    : 'BALANCED'; // TODO: track CPU schemes
  
  const awayScheme = game.awayTeamId === dynasty.league.userTeamId 
    ? dynasty.coach.scheme 
    : 'BALANCED';
  
  return (
    <GameCard>
      <Score>
        {homeTeam.name} ({homeScheme}) {game.result.homeScore} - 
        {game.result.awayScore} ({awayScheme}) {awayTeam.name}
      </Score>
      
      {game.result.boxScore?.meta?.possessions && (
        <Stats>
          Pace: {game.result.boxScore.meta.possessions} possessions
        </Stats>
      )}
    </GameCard>
  );
}
```

### Priority 5: Season Summary (1 hour)

**Show updated coach stats at end of season**

**Code Example:**
```typescript
function SeasonSummary({ previousCoachStats, newCoachStats }) {
  return (
    <SummaryCard>
      <Title>Season Complete!</Title>
      
      <Stats>
        <Stat>
          Career Record: {newCoachStats.totalWins}-{newCoachStats.totalLosses}
          ({newCoachStats.seasonsCoached} seasons)
        </Stat>
        
        <Stat>
          Prestige Tier: {newCoachStats.currentPrestigeTier}
          (was {previousCoachStats.currentPrestigeTier})
        </Stat>
        
        <Stat>
          Average Prestige: {newCoachStats.averagePrestige.toFixed(1)}
        </Stat>
      </Stats>
    </SummaryCard>
  );
}
```

---

## Testing Checklist

After implementing each section, test:

### Dynasty Creation ✓
- [ ] Can select each scheme (5 options)
- [ ] Dynasty saves with selected scheme
- [ ] `dynasty.coach.scheme` is correct value

### Coach Profile Display ✓
- [ ] Scheme name displays correctly
- [ ] Career stats show (even if mostly 0 for year 1)
- [ ] Format looks good in UI

### Recruiting Board ✓
- [ ] Fit indicator appears for each recruit
- [ ] Color/text changes with fit score
- [ ] SHOOTER shows green in TEMPO system
- [ ] SHOOTER shows red in DEFENSIVE system

### Game Results ✓
- [ ] Scheme name displays correctly
- [ ] Possession count shows (should vary with scheme)
- [ ] TEMPO games have more possessions than DEFENSIVE

### Season Summary ✓
- [ ] Career stats updated after season end
- [ ] Tier may change (if prestige changed)
- [ ] Years at school increments correctly

---

## Files to Reference While Building

1. **SCHEMES_SUMMARY.md** - High-level overview
2. **SCHEMES_TECHNICAL_GUIDE.md** - Deep dive with examples
3. **SCHEMES_UI_INTEGRATION.md** - Specific UI integration code
4. **SCHEMES_VISUAL_REFERENCE.md** - Charts and examples

---

## Known Limitations / Future Work

**Current Limitations:**
- CPU teams don't have separate schemes yet (use BALANCED)
  - Fix: Add `coachScheme` to CPU team tracking
- No UI for changing scheme mid-dynasty yet
  - Fix: Add "Edit Scheme" button in coach profile
- Tournament finish not tracked in `bestTournamentFinish` yet
  - Fix: Update when tournament completes

**Future Enhancements:**
- Scheme adjustment mid-career (with prestige penalty)
- Hybrid schemes (TEMPO_DEFENSIVE, etc.)
- Job market system (hire/fire, offers from other schools)
- Scheme vs Scheme analytics
- Coach AI for CPU programs

---

## Questions?

The engine is solid. If anything's unclear about how a system works:

1. Check **SCHEMES_TECHNICAL_GUIDE.md** for deep dives
2. Look at the example files created in `src/game/engine/schemes/`
3. Trace through the modified recruiting/sim/offseason files

---

## Timeline Estimate

- **Priority 1-2 (P1-P2)**: 1 hour total
- **Priority 3-4 (P3-P4)**: 2-3 hours total
- **Priority 5 (P5)**: 1 hour total

**Total UI Integration: ~4-5 hours** ✨

Then you're ready for Phase 2: Narratives + Job Market!

---

**Let me know if you need clarification on anything! 🚀**
