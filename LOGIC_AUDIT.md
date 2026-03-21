# College Basketball Sim — Logic Audit

**Audit focus:** Realism + fun/competitiveness across sim, recruiting, and related systems.

**Updates (follow-up):** Team rating now uses opponent **prestige** for SOS/SOV (not circular `teamRating`), plus a **roster** component. Tournament outlook UI is **record-first** and shared across Sim / Results / Standings. Sim upset rates and shooting variance were raised slightly; elite takeover/historic nights toned down to reduce frequent undefeated seasons.

---

## 1. Game Simulation Logic

### 1.1 Two Engines

| Engine | File | Used for | Approach |
|--------|------|----------|----------|
| **Detailed** | `simGame_v0.ts` | User games, conference finals, national tournament | Possession-based, full player box scores |
| **Fast (batch)** | `simWorker.ts` | `simWeekFast` (7 days of games) | Macro team totals → distribute to players |

### 1.2 Detailed Sim (`simGame_v0.ts`)

**Scoring & pace:**
- Possessions: `(homePace + awayPace) / 2 + jitter`, 58–90 range
- Chaos: 8% fast (~1.12x), 8% slow (~0.86x)
- NCAA typical: ~68–72 poss → **realistic**

**Shot mechanics:**
- 3PT anchors: 22–50% by rating (steeper curve than old)
- Rim, midrange, FT: rating-anchored with defense suppression
- Perim/rim defense, steals, fatigue (25+ min), form variance

**Upset system:**
- Strength diff 5–9 pts: 6% upset chance
- 10–14 pts: 10%
- 15+ pts: 12%
- Upset mode: underdog 1.15–1.23x variance, favorite 0.94–0.98x

**Takeover / historic:**
- Takeover (~20%), hot night (~8%), historic (~2%)

**Assessment:**  
Good realism; upsets and chaos add drama. Historic nights (2%) might feel slightly frequent.

---

### 1.3 Fast Sim (`simWorker.ts`)

**Issues:**

1. **Offense = Defense**  
   `offensiveRating` and `defensiveRating` both = top-5 avg overall. No offense/defense split.

2. **PPP scaling:**  
   `0.98 + (offRating - oppDefRating) * 0.006` → 20-pt rating gap ≈ 12% PPP. Mild impact.

3. **No archetypes/schemes:**  
   Batch games ignore archetype, scheme, and upset logic.

4. **FT logic:**  
   `Math.round(homeFTA * 0.70)` — fixed 70% FT%; should tie to ratings.

5. **Minutes allocation:**  
   Starters 32±3, bench 15±5 (normalized to 200). Simpler than full rotation logic.

**Assessment:**  
Realism weaker than detailed sim. User games vs CPU games can feel different.

**Recommendations:**
- Separate offensive and defensive ratings (e.g. top-5 offense vs top-5 defense, or weighted by archetype).
- Add simplified upset/chaos logic for batch sim.
- Tie fast-sim FT% to team shooting ratings.
- Optionally increase PPP sensitivity to talent gaps.

---

## 2. Recruiting Logic

### 2.1 Interest Calculation (`generateRecruitPool.ts`)

**Factors:**
- Geography: hometown ~30 (×1.8 LOYALIST), same state ~20
- Prestige vs star alignment; STAR personality amplifies
- Recent success (win rate); WINNER amplifies
- Scheme fit; SCHEME_FIT amplifies
- Playing time proxy; DEVELOPER amplifies
- Star modifier: 5★ 40%, 4★ 55%, 3★ 70%, 2★ 85%, 1★ 100%

**Assessment:**  
Geography, prestige, personality fit, and fit-based boosts are realistic. Non-hometown cap at 25 is reasonable.

---

### 2.2 Progress / Commitment (`calculateProgress.ts`)

**Curve:**  
`cap * (1 - exp(-h / tau))` by rank tier.

**Caps (weekly):**  
Top 10: 6, 11–25: 7, 26–50: 9, 51–100: 11, unranked: 13.5.

**Prestige:**  
Reduces tau: elite 90+ ~12–18%, 85–89 ~10–14%, 75–84 ~8–12%, 60–74 ~6–10%.

**Other modifiers:**
- Scholarship: 10–15% tau reduction
- Momentum: ±20% from streaks/tournament
- Underdog: prestige &lt;65, few competitors → +50% (≤1) / +25% (2)
- Human battle: +12% when contesting with another school
- Min ~8 weeks before commit

**Order:**  
User progress runs before CPU progress → user wins same-week ties.

**Assessment:**  
Realistic structure. Prestige gives a big edge; underdog bonus is strong but needed for parity. Human battle and order fixes improve fairness.

**Risk:**  
Underdog +50% with 0 competitors can be exploited; consider tapering at very low prestige or very low competition.

---

### 2.3 Gem / Bust (`generateRecruitPool.ts`)

**Current (after fixes):**
- Gem: 3–8% by star; bust: 8–16%
- Gem overall: +2–5; bust: −5–10
- Rank sort: gems −6, busts +5 on sort key → less clustering at tier boundaries

**Assessment:**  
Busts > gems and rank de-clumping both improve realism and reduce exploitability.

---

### 2.4 Hour Budget (`calculateHourBudget.ts`)

**Prestige tiers:**
- Low-major: 120–160
- Mid-major: 180–240
- High-major: 260–340
- Blue blood: 350–500

**Momentum:** ±15% from win rate.

**Assessment:**  
Elite programs get far more hours; momentum rewards winning. 500 hours across ~20 recruits can be hard to spend meaningfully; diminishing returns or higher caps per recruit could be considered.

---

## 3. Player Development (`playerProgression.ts`)

**Growth curves:**  
Early (peak FR/SO), normal (steady), late (JR/SR breakout).

**Usage tiers:**
- 28+ min: 1.4x
- 22–28: 1.2x
- 15–22: 0.9x
- 8–15: 0.6x
- &lt;8: 0.3x

**Plateau:**  
Class-based (FR 2% → SR 25%), work ethic, gap to potential, rating level.

**Breakout:**  
5–15% by class/curve; late bloomers and underused talent boosted.

**Assessment:**  
Usage and curve structure match real college development. Deep bench (0.3x) is harsh but intentional.

---

## 4. Rotation Logic (`allocateTeamMinutes.ts`)

**Role weights:**  
Starter 3.2x, main backup 0.85x, secondary 0.35x, deep 0.15x, emergency 0.07x.

**Philosophy:**  
TIGHT (7.0), NORMAL (8.5), DEEP (10.0).

**Coverage penalties:**  
Position mismatch reduces effectiveness.

**Assessment:**  
Reasonable NCAA-style rotation depth and starter focus.

---

## 5. Prestige Adjustments (`applyPrestigeAdjustments.ts`)

**Gains:**  
30+ wins +1.5, 25+ +1.0, 20+ +0.5, 15+ +0.25; Elite Eight +2, Final Four +3, Final +5, Champ +7; conf tourney champ +2.

**Losses:**  
Losing season −2.0.

**Cap:**  
Dynamic modifier ±50.

**Assessment:**  
Tournament gains and win thresholds are sensible. −2 for losing season is strong; could soften to −1.0 or −1.5 to avoid over-penalizing bad seasons.

---

## 6. Tournament Selection (`selectTournament.ts`)

**Autobids:**  
Conference tournament champions (or regular-season champs if needed).

**Resume score:**  
`winPct * 0.55 + confWinPct * 0.25 + rating * 0.20`

**Seeding:**  
`seedScore = rating * 0.50 + resumeScore * 0.50`; S-curve placement.

**Assessment:**  
Win%, conference play, and rating mix are plausible. Real selection adds NET, SOS, Q1 wins; current model is a reasonable simplification.

---

## Summary: Realism vs Fun

| System | Realism | Fun / Balance | Main Gaps |
|--------|---------|----------------|-----------|
| Detailed sim | Good | Good | Historic nights may be slightly frequent |
| Fast sim | Weak | Adequate | No O/D split; no upsets/archetypes |
| Recruiting | Good | Good | Underdog bonus possibly exploitable |
| Development | Good | Good | Deep bench heavily penalized |
| Rotation | Good | Good | — |
| Prestige | Good | Adequate | Losing-season penalty harsh |
| Tournament | Good | Good | — |

---

## Priority Recommendations

1. **Fast sim parity:**  
   Add offensive vs defensive ratings, basic upset/chaos, and FT% tied to ratings.

2. **Prestige / losing season:**  
   Consider reducing losing-season penalty from −2.0 to −1.0 or −1.5.

3. **Underdog bonus:**  
   Add a cap or taper when prestige is very low (&lt;50) or competition is trivial.

4. **Detailed sim historic nights:**  
   Optionally lower historic night rate (e.g. 2% → 1%).
