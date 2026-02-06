# Ranking & Tournament System Analysis - Complete Documentation Index

**Created:** February 5, 2026  
**Analysis Scope:** Full college basketball simulator codebase  
**Focus:** Ranking systems, tournament seeding, RPI, strength of schedule  

---

## 📋 Document Guide

Start here based on your needs:

### 🎯 **Want the Quick Answer?**
→ Read **[ANALYSIS_COMPLETE_SUMMARY.md](ANALYSIS_COMPLETE_SUMMARY.md)** (5 min read)
- Executive summary of all findings
- Problem statement
- What exists vs. missing
- Severity assessment

### 🔍 **Want Deep Technical Analysis?**
→ Read **[RANKING_SYSTEM_ANALYSIS.md](RANKING_SYSTEM_ANALYSIS.md)** (20 min read)
- Complete breakdown of all systems
- Code locations with line numbers
- Current implementation details
- Recommendations by effort level
- Data structures explanation

### 📊 **Want to Understand the Flow?**
→ Read **[TOURNAMENT_SEEDING_FLOW_DIAGRAM.md](TOURNAMENT_SEEDING_FLOW_DIAGRAM.md)** (15 min read)
- Visual flow diagrams of tournament selection
- Formula breakdowns with examples
- S-curve seeding explanation
- Current vs. missing metrics table

### 💻 **Want Code References?**
→ Read **[TOURNAMENT_SEEDING_CODE_REFERENCE.md](TOURNAMENT_SEEDING_CODE_REFERENCE.md)** (20 min read)
- File locations and line numbers
- All function signatures
- Formula references
- Data structure definitions
- Debug checklist

### ⚡ **Want a Quick Reference Card?**
→ Read **[QUICK_REFERENCE_RANKING_TOURNAMENT.md](QUICK_REFERENCE_RANKING_TOURNAMENT.md)** (10 min read)
- At-a-glance status table
- Core formulas
- File locations
- Problem summary
- What's working vs. broken

### 🛣️ **Want to Implement Improvements?**
→ Read **[RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md)** (30 min read)
- Phase 1: Fix team rating (CRITICAL - 1 hour)
- Phase 2: Improve resume score (2 hours)
- Phase 3: Display rankings (3-4 hours)
- Phase 4: Add RPI (2 hours)
- Code examples for each phase
- Testing checklists

---

## 🗺️ Document Structure Map

```
┌─────────────────────────────────────────────────────────────────┐
│                 START HERE                                      │
│         ANALYSIS_COMPLETE_SUMMARY.md                           │
│         (Executive overview - 5 minutes)                       │
└────────────┬────────────────────────────────────────────────────┘
             │
      ┌──────┴──────┬──────────────┬──────────────┬──────────────┐
      │             │              │              │              │
      ↓             ↓              ↓              ↓              ↓
   DEEP DIVE   VISUALS       CODE REF       QUICK REF      IMPLEMENT
      │             │              │              │              │
      │             │              │              │              │
  RANKING_   TOURNAMENT_    TOURNAMENT_   QUICK_REFERENCE  RANKING_
  SYSTEM_    SEEDING_       SEEDING_      RANKING_        IMPLEMENTATION
  ANALYSIS   FLOW_DIAGRAM   CODE_         TOURNAMENT      ROADMAP
             (20 min)       REFERENCE     (10 min)        (30 min)
           (15 min)         (20 min)
           (20 min)
```

---

## 🎯 Key Findings Summary

### ✅ What EXISTS
1. **Tournament Selection System** - COMPLETE
   - Autobid determination (conference champions)
   - At-large team selection (top remaining teams)
   - S-curve seeding for 4 regions
   - Full bracket generation

2. **Game Simulation Strength** - WORKS
   - Calculates team strength per game
   - Weighted average of player ratings
   - Used in PPP calculations

3. **Recruiting Rankings** - WORKS
   - Top 100 recruits ranked
   - Quality bands for scouting
   - Separate from tournament seeding

### ❌ What's MISSING
1. **Dynamic Team Rating** - CRITICAL PROBLEM
   - Field defined but never populated
   - Falls back to static prestige
   - Breaks entire seeding system

2. **RPI Calculation** - NOT IMPLEMENTED
   - Would need opponent strength tracking
   - Could improve selection accuracy

3. **Strength of Schedule** - NOT IMPLEMENTED
   - Would reward tough schedules
   - Currently ignored

4. **National Rankings** - NOT IMPLEMENTED
   - No full 350+ team ranking system
   - Only tournament seeding happens

5. **Quality Wins Tracking** - NOT IMPLEMENTED
   - All wins treated equally
   - Should weight opponent strength

6. **Advanced Metrics** - NOT IMPLEMENTED
   - No RPI, NET rating, 4 factors
   - No efficiency tracking

---

## 📍 Critical File Locations

### Tournament Logic
| File | Purpose | Lines |
|------|---------|-------|
| `src/game/engine/tournament/selectTournament.ts` | Team selection & seeding | 336 |
| `src/game/engine/tournament/generateBracket.ts` | Bracket creation | 275 |
| `src/game/engine/tournament/initializeTournament.ts` | Tournament init | 32 |

### Team Data
| File | Purpose | Lines |
|------|---------|-------|
| `src/game/types/dynasty.ts` | TeamState definition | 130-170 |
| `src/game/engine/stats/applyGameToSeasonStats.ts` | Stats application | ~80-100 |
| `src/game/engine/stats/seasonStats.ts` | Stats tracking types | varies |

### Game Simulation
| File | Purpose | Lines |
|------|---------|-------|
| `src/game/engine/sim/simWorker.ts` | Batch game sim | 150-151 |
| `src/game/engine/sim/simGame_v0.ts` | Individual game sim | 374-392 |

---

## 🔑 Key Formulas

### Tournament Resume Score (Current)
```
resumeScore = (winPct × 0.55) + (confWinPct × 0.25) + (rating × 0.20)

where:
  winPct = wins / (wins + losses)
  confWinPct = confWins / (confWins + confLosses)
  rating = teamRating / 100 OR prestige / 100
```

### Tournament Seed Score (Current)
```
seedScore = (rating × 0.50) + (resumeScore × 0.50)

→ Determines final tournament seeding
→ Top scorers get #1 seeds (one per region)
```

### S-Curve Distribution (Current)
```
Seed line 1 (top 4 teams): South, West, Midwest, East
Seed line 2 (next 4 teams): East, Midwest, West, South (reversed)
Seed line 3: South, West, Midwest, East (alternates)
...continues...
Seed line 16 (teams 61-64): East, Midwest, West, South
```

### Game Strength (Simulation)
```
offensiveRating = Σ(playerOverall × minutes) / Σ(minutes)
defensiveRating = Σ(playerOverall × minutes) / Σ(minutes)
(Currently both same - simplified)
```

---

## 🚀 Quick Implementation Guide

### Phase 1: Fix Team Rating (CRITICAL - 1 HOUR)
**Goal:** Make tournament seeding respond to season performance

**Steps:**
1. Create `calculateTeamRating()` function in `seasonStats.ts`
2. Call it in `applyGameToSeasonStats.ts` after each game
3. Test that teamRating updates and changes during season

**Impact:** Fixes the biggest issue - seeding now responds to play

**Code Location:** [See RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md#phase-1-fix-team-rating-critical---1-hour)

### Phase 2: Improve Resume Score (2 HOURS)
**Goal:** Add point differential and strength of schedule

**Steps:**
1. Add pointsFor/pointsAgainst tracking in `dynasty.ts`
2. Implement `calculateStrengthOfSchedule()` function
3. Update resume score formula to include SOS (10%) and point diff (10%)

**Impact:** Better tournament seeding based on schedule strength

**Code Location:** [See RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md#phase-2-improve-resume-score-2-hours)

### Phase 3: Display Rankings (3-4 HOURS)
**Goal:** Show users full national rankings before tournament

**Steps:**
1. Create `generateRankings.ts` function
2. Call it in tournament initialization
3. Add UI component to display top 50 teams

**Impact:** Users see why teams are seeded as they are

**Code Location:** [See RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md#phase-3-national-rankings-system-3-4-hours)

### Phase 4: Advanced Metrics (2 HOURS - OPTIONAL)
**Goal:** Implement RPI and other advanced metrics

**Steps:**
1. Create `calculateRPI()` function
2. Display RPI alongside resume score
3. Compare to real NCAA methods

**Impact:** Full NCAA-level sophistication

**Code Location:** [See RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md#phase-4-rpi-implementation-optional---2-hours)

---

## 📊 Current System Status

### Tournament Seeding
| Aspect | Status | Notes |
|--------|--------|-------|
| Autobid Selection | ✅ Complete | Uses tournament winners or regular season |
| At-Large Selection | ✅ Complete | Top 32 remaining by resume score |
| Seed Calculation | ⚠️ Broken | Uses static prestige, not dynamic rating |
| Regional Distribution | ✅ Complete | S-curve balances strength |
| Bracket Generation | ✅ Complete | Proper NCAA tournament format |

### Team Ranking
| Aspect | Status | Notes |
|--------|--------|-------|
| Team Rating Field | ⚠️ Defined | Exists but never populated |
| Rating Calculation | ❌ Missing | Should be: weighted player ratings |
| Rating Updates | ❌ Missing | Should: update after each game |
| RPI | ❌ Missing | Would require opponent tracking |
| SOS | ❌ Missing | Would require schedule analysis |
| Quality Wins | ❌ Missing | Would require opponent ranking |
| National Rankings | ❌ Missing | Would require full team ranking |

---

## 🎓 Learning Path

**If you're new to this system:**

1. Start: [ANALYSIS_COMPLETE_SUMMARY.md](ANALYSIS_COMPLETE_SUMMARY.md) - understand the problem
2. Next: [TOURNAMENT_SEEDING_FLOW_DIAGRAM.md](TOURNAMENT_SEEDING_FLOW_DIAGRAM.md) - see how it works visually
3. Then: [TOURNAMENT_SEEDING_CODE_REFERENCE.md](TOURNAMENT_SEEDING_CODE_REFERENCE.md) - find the code
4. Finally: [RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md) - implement improvements

**If you're implementing improvements:**

1. Review: [RANKING_IMPLEMENTATION_ROADMAP.md](RANKING_IMPLEMENTATION_ROADMAP.md) - see the plan
2. Reference: [TOURNAMENT_SEEDING_CODE_REFERENCE.md](TOURNAMENT_SEEDING_CODE_REFERENCE.md) - find exact locations
3. Code: Use roadmap code examples as starting points
4. Test: Use provided testing checklist

**If you're debugging issues:**

1. Check: [QUICK_REFERENCE_RANKING_TOURNAMENT.md](QUICK_REFERENCE_RANKING_TOURNAMENT.md) - quick facts
2. Find: [TOURNAMENT_SEEDING_CODE_REFERENCE.md](TOURNAMENT_SEEDING_CODE_REFERENCE.md) - debug checklist
3. Trace: [TOURNAMENT_SEEDING_FLOW_DIAGRAM.md](TOURNAMENT_SEEDING_FLOW_DIAGRAM.md) - data flow

---

## 📞 How to Use These Documents

### As Reference Material
- Keep `QUICK_REFERENCE_RANKING_TOURNAMENT.md` open while coding
- Use `TOURNAMENT_SEEDING_CODE_REFERENCE.md` for file locations
- Reference `TOURNAMENT_SEEDING_FLOW_DIAGRAM.md` for formulas

### For Understanding Current System
- Read `RANKING_SYSTEM_ANALYSIS.md` for complete breakdown
- Review `TOURNAMENT_SEEDING_FLOW_DIAGRAM.md` for visual flows
- Check `ANALYSIS_COMPLETE_SUMMARY.md` for problems

### For Implementation
- Follow `RANKING_IMPLEMENTATION_ROADMAP.md` step-by-step
- Copy code examples into your IDE
- Use testing checklists to verify changes

### For Documentation
- Update these files as you make changes
- Add notes to roadmap as you implement phases
- Keep as team reference for future work

---

## ✅ Verification Checklist

Before considering this search complete, verify:

- [x] Found tournament selection system (selectTournament.ts)
- [x] Found bracket generation (generateBracket.ts)
- [x] Found team rating field (dynasty.ts:143)
- [x] Identified team rating is never populated (CRITICAL ISSUE)
- [x] Found game simulation strength calculation
- [x] Identified missing RPI calculation
- [x] Identified missing SOS calculation
- [x] Identified missing national rankings
- [x] Documented all seeding formulas
- [x] Created implementation roadmap
- [x] Provided code examples
- [x] Created 5+ reference documents

---

## 📝 Notes

### The Core Problem (In One Sentence)
**Tournament seeding uses a `teamRating` field that's defined but never populated, so it always falls back to static prestige, meaning season performance doesn't improve tournament prospects.**

### The Quick Fix (In One Sentence)
**Populate `teamRating` after each game with a calculation based on player roster quality and can solve 80% of the realism issues.**

### The Full Fix (In One Sentence)
**Implement Phases 1-3 to add dynamic team rating, strength of schedule, and national rankings display.**

---

## 🔗 Cross-References

| Topic | Where to Find | Document |
|-------|--------------|----------|
| Team rating problem | Main issue | All documents |
| Resume score formula | Formula 1 | Flow Diagram, Code Reference |
| Seed score formula | Formula 2 | Flow Diagram, Code Reference |
| S-curve explanation | Distribution | Flow Diagram, Quick Ref |
| selectTournament() | Function | Code Reference, Analysis |
| generateBracket() | Function | Code Reference, Analysis |
| Implementation details | Phases 1-4 | Roadmap |
| Code locations | Line numbers | Code Reference |
| Testing | Checklist | Roadmap |

---

## 🎬 Next Steps

1. **Choose your starting point** from the Document Guide above
2. **Read the appropriate document** for your use case
3. **Review relevant code** using Code Reference guide
4. **Follow implementation roadmap** if making changes
5. **Use testing checklist** to verify improvements

---

**Analysis completed:** February 5, 2026  
**Documents created:** 6 comprehensive guides  
**Code locations identified:** 15+ files  
**Recommendations:** 4 implementation phases  
**Status:** Ready for implementation  

👉 **Start with:** [ANALYSIS_COMPLETE_SUMMARY.md](ANALYSIS_COMPLETE_SUMMARY.md)
