// src/game/engine/sim/simGame.ts
import type {
  Dynasty,
  ID,
  PlayerBoxScoreLine,
  TeamBoxScoreLine,
  Position,
  Archetype,
} from "../../types/dynasty";
import { allocateTeamMinutes } from "../minutes/allocateTeamMinutes";
import { getTeamSchemeModifiers, applyPaceModifier } from "../schemes/applySchemeModifiers";

type Rng = { state: number };

function rand01(rng: Rng): number {
  rng.state = (rng.state * 1664525 + 1013904223) >>> 0;
  return rng.state / 4294967296;
}
function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rand01(rng) * (max - min + 1)) + min;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function hashSeed(base: number, key: string): number {
  let h = base >>> 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
// approx normal(0,1)
function randN01(rng: Rng): number {
  let s = 0;
  for (let i = 0; i < 12; i++) s += rand01(rng);
  return s - 6;
}
function binomial(rng: Rng, trials: number, p: number): number {
  let made = 0;
  const pp = clamp(p, 0.01, 0.99);
  for (let i = 0; i < trials; i++) if (rand01(rng) < pp) made++;
  return made;
}

type Anchor = { r: number; v: number };
function interp(rating: number, anchors: Anchor[]): number {
  const r = clamp(rating, 20, 99);
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i],
      b = anchors[i + 1];
    if (r >= a.r && r <= b.r) {
      const t = (r - a.r) / (b.r - a.r);
      return a.v + (b.v - a.v) * t;
    }
  }
  return anchors[anchors.length - 1].v;
}

// Baselines - steeper curves so ratings matter more
const THREE_PCT: Anchor[] = [
  { r: 20, v: 0.22 },
  { r: 35, v: 0.27 },
  { r: 50, v: 0.33 },
  { r: 65, v: 0.38 },
  { r: 80, v: 0.42 },
  { r: 90, v: 0.46 },
  { r: 99, v: 0.50 },
];
const RIM_2P_PCT: Anchor[] = [
  { r: 20, v: 0.40 },
  { r: 35, v: 0.46 },
  { r: 50, v: 0.52 },
  { r: 65, v: 0.58 },
  { r: 80, v: 0.64 },
  { r: 90, v: 0.68 },
  { r: 99, v: 0.72 },
];
// midrange is shooting2, but mid is harder than rim
const MID_2P_PCT: Anchor[] = [
  { r: 20, v: 0.32 },
  { r: 35, v: 0.38 },
  { r: 50, v: 0.43 },
  { r: 65, v: 0.48 },
  { r: 80, v: 0.53 },
  { r: 90, v: 0.57 },
  { r: 99, v: 0.61 },
];
const FT_PCT: Anchor[] = [
  { r: 20, v: 0.52 },
  { r: 35, v: 0.62 },
  { r: 50, v: 0.71 },
  { r: 65, v: 0.78 },
  { r: 80, v: 0.84 },
  { r: 90, v: 0.89 },
  { r: 99, v: 0.93 },
];

function perimSupp(perimD: number): number {
  return interp(perimD, [
    { r: 20, v: +0.003 },
    { r: 50, v: 0.0 },
    { r: 80, v: -0.008 },
    { r: 90, v: -0.012 },
    { r: 99, v: -0.015 },
  ]);
}
function rimSupp(rimD: number): number {
  return interp(rimD, [
    { r: 20, v: +0.004 },
    { r: 50, v: 0.0 },
    { r: 80, v: -0.01 },
    { r: 90, v: -0.015 },
    { r: 99, v: -0.02 },
  ]);
}

function makeTeamLine(): TeamBoxScoreLine {
  return {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    turnovers: 0,
    fouls: 0,
  };
}

function sumTeam(lines: PlayerBoxScoreLine[]): TeamBoxScoreLine {
  const t = makeTeamLine();
  for (const l of lines) {
    t.points += l.points;
    t.rebounds += l.rebounds;
    t.assists += l.assists;
    t.steals += l.steals;
    t.blocks += l.blocks;
    t.fgm += l.fgm;
    t.fga += l.fga;
    t.tpm += l.tpm;
    t.tpa += l.tpa;
    t.ftm += l.ftm;
    t.fta += l.fta;
    t.turnovers += l.turnovers;
    t.fouls += l.fouls;
  }
  return t;
}

function R(n: unknown, fallback = 50): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function roundToTotal(
  rng: Rng,
  raw: { pid: ID; raw: number }[],
  total: number
): Record<ID, number> {
  const out: Record<ID, number> = {};
  const floors = raw.map((x) => {
    const safe = Number.isFinite(x.raw) ? x.raw : 0;
    const f = Math.floor(safe);
    return { pid: x.pid, f, frac: safe - f };
  });

  for (const x of floors) out[x.pid] = x.f;
  let used = floors.reduce((a, b) => a + b.f, 0);
  let need = total - used;

  floors.sort((a, b) => b.frac - a.frac);
  for (const x of floors) {
    if (need <= 0) break;
    out[x.pid] += 1;
    need--;
  }
  while (need > 0 && floors.length > 0) {
    const pick = floors[randInt(rng, 0, floors.length - 1)];
    out[pick.pid] += 1;
    need--;
  }
  while (need < 0 && floors.length > 0) {
    const pick = floors[randInt(rng, 0, floors.length - 1)];
    if (out[pick.pid] > 0) {
      out[pick.pid] -= 1;
      need++;
    }
  }

  return out;
}

/**
 * Distribute a team total across players but enforce soft positional ceilings.
 * Excess is redistributed to eligible teammates (weighted).
 *
 * We still allow rare "spike" games by granting a small chance to exceed cap
 * for top-eligible defenders.
 */
function distributeWithSoftCaps(args: {
  rng: Rng;
  total: number;
  weights: { pid: ID; w: number; pos: Position; eliteFlag: boolean }[];
  capsByPos: Record<Position, number>;
  // chance to allow cap+spike for elite players (per player check)
  spikeChance: number;
  spikeMaxExtra: number;
}): Record<ID, number> {
  const { rng, total, weights, capsByPos, spikeChance, spikeMaxExtra } = args;

  const wsum = weights.reduce((a, b) => a + Math.max(0.0001, b.w), 0) || 1;
  const base = roundToTotal(
    rng,
    weights.map((x) => ({ pid: x.pid, raw: (Math.max(0.0001, x.w) / wsum) * total })),
    total
  );

  // First, determine per-player cap (with rare spike allowance for elite)
  const capFor: Record<ID, number> = {};
  for (const x of weights) {
    const baseCap = capsByPos[x.pos] ?? 99;
    let cap = baseCap;

    if (x.eliteFlag && rand01(rng) < spikeChance) {
      cap = baseCap + randInt(rng, 1, spikeMaxExtra);
    }
    capFor[x.pid] = cap;
  }

  // Redistribute any excess over caps
  let excess = 0;
  for (const x of weights) {
    const pid = x.pid;
    const cap = capFor[pid];
    const v = base[pid] ?? 0;
    if (v > cap) {
      excess += v - cap;
      base[pid] = cap;
    }
  }
  if (excess <= 0) return base;

  // Build eligible pool (below cap) with weights
  // Loop: assign 1 at a time to respect caps deterministically
  const eligible = () =>
    weights.filter((x) => (base[x.pid] ?? 0) < (capFor[x.pid] ?? 99));

  while (excess > 0) {
    const pool = eligible();
    if (pool.length === 0) break;

    const psum = pool.reduce((a, b) => a + Math.max(0.0001, b.w), 0) || 1;
    let r = rand01(rng) * psum;
    let chosen = pool[pool.length - 1];
    for (const p of pool) {
      r -= Math.max(0.0001, p.w);
      if (r <= 0) {
        chosen = p;
        break;
      }
    }
    base[chosen.pid] = (base[chosen.pid] ?? 0) + 1;
    excess--;
  }

  return base;
}

// Archetype multipliers (tendencies, not capabilities)
function threeMult(a: Archetype): number {
  switch (a) {
    case "SHOOTER":
      return 1.55;
    case "THREE_AND_D_WING":
      return 1.25;
    case "STRETCH_BIG":
      return 1.3;
    case "FACILITATOR":
      return 0.85;
    case "POST_SCORER":
      return 0.35;
    case "RIM_PROTECTOR":
      return 0.25;
    case "REBOUNDER_ENERGY_BIG":
      return 0.35;
    case "PRIMARY_SCORER":
      return 1.05;
    case "WING_SCORER":
      return 0.95;
    case "ALL_AROUND_WING":
      return 0.95;
    case "TWO_WAY_GUARD":
      return 0.95;
    default:
      return 1.0;
  }
}
function rimMult(a: Archetype): number {
  switch (a) {
    case "POST_SCORER":
      return 1.55;
    case "PRIMARY_SCORER":
      return 1.2;
    case "WING_SCORER":
      return 1.25;
    case "REBOUNDER_ENERGY_BIG":
      return 1.25;
    case "RIM_PROTECTOR":
      return 0.8;
    case "STRETCH_BIG":
      return 0.75;
    case "SHOOTER":
      return 0.75;
    case "THREE_AND_D_WING":
      return 0.85;
    case "FACILITATOR":
      return 0.95;
    case "ALL_AROUND_WING":
      return 1.0;
    case "TWO_WAY_GUARD":
      return 1.0;
    default:
      return 1.0;
  }
}

function posThreeBase(pos: Position): number {
  if (pos === "PG") return 5.0;
  if (pos === "SG") return 6.0;
  if (pos === "SF") return 4.0;
  if (pos === "PF") return 2.0;
  return 0.5; // C
}
function posRimBase(pos: Position): number {
  if (pos === "PG") return 6.0;
  if (pos === "SG") return 5.0;
  if (pos === "SF") return 6.0;
  if (pos === "PF") return 8.0;
  return 9.0; // C
}

function teamDefAverages(
  d: Dynasty,
  teamId: ID,
  minutes: Record<ID, number>
): { perimD: number; rimD: number; stl: number } {
  const team = d.league.teamsById[teamId];
  const ids = team?.roster?.playerIds ?? [];
  let wsum = 0;
  let per = 0,
    rim = 0,
    stl = 0;
  for (const pid of ids) {
    const p = d.playersById[pid];
    if (!p) continue;
    const m = minutes[pid] ?? 0;
    if (m <= 0) continue;
    wsum += m;
    per += R(p.ratings.perimeterDefense) * m;
    rim += R(p.ratings.rimDefense) * m;
    stl += R(p.ratings.steal) * m;
  }
  if (wsum <= 0) return { perimD: 50, rimD: 50, stl: 50 };
  return { perimD: per / wsum, rimD: rim / wsum, stl: stl / wsum };
}

/**
 * Calculate team strength (weighted average overall by minutes).
 * Used to determine if an upset is possible.
 */
function calculateTeamStrength(
  d: Dynasty,
  teamId: ID,
  minutes: Record<ID, number>
): number {
  const team = d.league.teamsById[teamId];
  const ids = team?.roster?.playerIds ?? [];
  let wsum = 0;
  let strength = 0;
  for (const pid of ids) {
    const p = d.playersById[pid];
    if (!p) continue;
    const m = minutes[pid] ?? 0;
    if (m <= 0) continue;
    wsum += m;
    strength += R(p.ratings.overall) * m;
  }
  if (wsum <= 0) return 50;
  return strength / wsum;
}

/**
 * Calculate upset modifiers based on team strength difference.
 * Returns variance multipliers for underdog and favorite.
 */
function calculateUpsetModifiers(
  rng: Rng,
  underdogStrength: number,
  favoriteStrength: number
): { underdogVarianceMult: number; favoriteVarianceMult: number; isUpsetGame: boolean } {
  const strengthDiff = favoriteStrength - underdogStrength;
  
  // Only apply upset logic if there's a meaningful difference (5+ points)
  if (strengthDiff < 5) {
    return { underdogVarianceMult: 1.0, favoriteVarianceMult: 1.0, isUpsetGame: false };
  }

  // Determine upset chance based on strength difference
  // 5-9 point difference: ~6% chance
  // 10-14 point difference: ~10% chance
  // 15+ point difference: ~12% chance (rare but possible)
  let upsetChance = 0;
  if (strengthDiff >= 15) {
    upsetChance = 0.12;
  } else if (strengthDiff >= 10) {
    upsetChance = 0.10;
  } else if (strengthDiff >= 5) {
    upsetChance = 0.06;
  }

  const isUpsetGame = rand01(rng) < upsetChance;

  if (!isUpsetGame) {
    // Normal game - slight variance boost for underdog still (makes games closer)
    const normalVariance = 1.0 + clamp((strengthDiff - 5) / 100, 0, 0.08);
    return {
      underdogVarianceMult: normalVariance,
      favoriteVarianceMult: 1.0 - clamp((strengthDiff - 5) / 200, 0, 0.03),
      isUpsetGame: false,
    };
  }

  // UPSET MODE: Underdog gets significant boost, favorite gets slight negative variance
  // This creates the "perfect storm" for an upset
  return {
    underdogVarianceMult: 1.15 + rand01(rng) * 0.08, // 1.15-1.23x variance
    favoriteVarianceMult: 0.94 + rand01(rng) * 0.04, // 0.94-0.98x variance (slight off night)
    isUpsetGame: true,
  };
}

function computePossessions(rng: Rng, homePace: number, awayPace: number): number {
  const base = (homePace + awayPace) / 2;
  const chaosRoll = rand01(rng);
  const chaosMult = chaosRoll < 0.08
    ? 1.12 + rand01(rng) * 0.08
    : chaosRoll > 0.92
      ? 0.86 + rand01(rng) * 0.06
      : 1.0;
  const raw = base + randInt(rng, -6, 6);
  return clamp(Math.round(raw * chaosMult), 58, 90);
}

function computeTeamFGA(rng: Rng, poss: number): number {
  // Typical: poss ~70 => FGA ~58-66
  // Allow occasional higher volume games (still within reason)
  return clamp(Math.round(poss * 0.90 + randInt(rng, -3, 5)), 52, 76);
}

function computeTeamThreeRate(rng: Rng): number {
  // Modern target: ~36–44% of FGA
  return 0.36 + rand01(rng) * 0.08;
}

function computeTeamFTA(rng: Rng, poss: number, rimPressureIndex: number): number {
  const base = poss * 0.26 + 2; // 70 => ~20
  const bump = (rimPressureIndex - 50) / 10;
  return clamp(Math.round(base + bump + randInt(rng, -4, 6)), 12, 34);
}

/**
 * Usage / shot gravity.
 * This must be strong enough that a 90+ OVR star can dominate a game sometimes.
 */
function offensiveGravity(p: any, min: number): number {
  const s3 = R(p.ratings.shooting3);
  const fin = R(p.ratings.finishing);
  const mid = R(p.ratings.shooting2);
  const ball = R(p.ratings.ballHandling);
  const ovr = R(p.ratings.overall);

  const arch = p.identity.archetype as Archetype;

  const archUsage =
    arch === "PRIMARY_SCORER" || arch === "WING_SCORER" || arch === "POST_SCORER"
      ? 1.18
      : arch === "SHOOTER"
      ? 1.08
      : arch === "FACILITATOR"
      ? 0.86
      : 1.0;

  const score = 0.44 * ovr + 0.24 * fin + 0.16 * s3 + 0.10 * ball + 0.06 * mid;

  // Higher exponent concentrates attempts (important for star tails)
  const pow = 1.75;
  return Math.max(0.0001, min * Math.pow(score / 100, pow) * archUsage);
}

function isEliteScorerProfile(p: any, min: number): boolean {
  const ovr = R(p.ratings.overall);
  const ball = R(p.ratings.ballHandling);
  const s3 = R(p.ratings.shooting3);
  const fin = R(p.ratings.finishing);
  const arch = p.identity.archetype as Archetype;

  const archOk =
    arch === "PRIMARY_SCORER" ||
    arch === "WING_SCORER" ||
    arch === "POST_SCORER" ||
    arch === "SHOOTER";

  return min >= 32 && ovr >= 88 && archOk && (ball >= 70 || fin >= 78 || s3 >= 80);
}

function buildTeamLinesRegulation(args: {
  dynasty: Dynasty;
  teamId: ID;
  minutes: Record<ID, number>;
  oppDef: { perimD: number; rimD: number; stl: number };
  teamFGA: number;
  teamTPA: number;
  teamFTA: number;
  rng: Rng;
  varianceMultiplier?: number; // For upsets: >1.0 boosts variance, <1.0 reduces it
}): PlayerBoxScoreLine[] {
  const { dynasty, teamId, minutes, oppDef, teamFGA, teamTPA, teamFTA, rng } = args;

  // Get scheme modifiers for shooting accuracy
  const schemeModifiers = getTeamSchemeModifiers(dynasty, teamId);
  const shootingModifier = schemeModifiers.offensiveAccuracy;

  const team = dynasty.league.teamsById[teamId];
  const ids = team?.roster?.playerIds ?? [];

  const active = ids
    .map((pid) => ({ pid, p: dynasty.playersById[pid], min: minutes[pid] ?? 0 }))
    .filter((x) => x.p && x.min > 0);

  if (active.length === 0) return [];

  // --- Star takeover / hot-night flags (rare tail) ---
  // Identify top gravity player
  const gravs = active.map((x) => ({
    pid: x.pid,
    g: offensiveGravity(x.p, x.min),
    min: x.min,
    p: x.p,
  }));
  gravs.sort((a, b) => b.g - a.g);
  const top = gravs[0];

  const takeover =
    top && isEliteScorerProfile(top.p, top.min) && rand01(rng) < 0.14; // rare
  const hot =
    top && isEliteScorerProfile(top.p, top.min) && rand01(rng) < 0.04; // very rare
  const historicNight =
    top && isEliteScorerProfile(top.p, top.min) && rand01(rng) < 0.0008; // almost never

  // Takeover boosts usage share
  const takeoverMult = historicNight ? 2.6 : takeover ? 1.75 : 1.0;

  // Allocate FGA by gravity (with takeover concentration)
  const gsum =
    active.reduce((a, x) => {
      const g = offensiveGravity(x.p, x.min);
      const boosted = x.pid === top?.pid ? g * takeoverMult : g;
      return a + boosted;
    }, 0) || 1;

  const fgaBy = roundToTotal(
    rng,
    active.map((x) => {
      const g = offensiveGravity(x.p, x.min);
      const boosted = x.pid === top?.pid ? g * takeoverMult : g;
      return { pid: x.pid, raw: (boosted / gsum) * teamFGA };
    }),
    teamFGA
  );

  // Allocate 3PA by per-player tendency
  const t3Sum =
    active.reduce((a, x) => {
      const p = x.p;
      const pos = p.identity.position as Position;
      const aType = p.identity.archetype as Archetype;

      const base = posThreeBase(pos);
      const arch = threeMult(aType);
      const ratingBias =
        R(p.ratings.shooting3) <= 35
          ? 0.6
          : R(p.ratings.shooting3) < 50
          ? 0.85
          : R(p.ratings.shooting3) < 65
          ? 1.0
          : R(p.ratings.shooting3) < 80
          ? 1.1
          : R(p.ratings.shooting3) < 90
          ? 1.2
          : 1.25;

      const per40 = base * arch * ratingBias;
      const w = Math.max(0.001, per40 * (x.min / 40));
      return a + w;
    }, 0) || 1;

  const tpaBy = roundToTotal(
    rng,
    active.map((x) => {
      const p = x.p;
      const pos = p.identity.position as Position;
      const aType = p.identity.archetype as Archetype;

      const base = posThreeBase(pos);
      const arch = threeMult(aType);
      const ratingBias =
        R(p.ratings.shooting3) <= 35
          ? 0.6
          : R(p.ratings.shooting3) < 50
          ? 0.85
          : R(p.ratings.shooting3) < 65
          ? 1.0
          : R(p.ratings.shooting3) < 80
          ? 1.1
          : R(p.ratings.shooting3) < 90
          ? 1.2
          : 1.25;

      const per40 = base * arch * ratingBias;
      const w = Math.max(0.001, per40 * (x.min / 40));
      return { pid: x.pid, raw: (w / t3Sum) * teamTPA };
    }),
    teamTPA
  );

  // Clamp 3PA <= FGA per player
  for (const x of active) {
    const pid = x.pid;
    const fga = fgaBy[pid] ?? 0;
    const tpa = tpaBy[pid] ?? 0;
    if (tpa > fga) tpaBy[pid] = fga;
  }

  // Allocate FTA primarily by rim pressure (finishing + athleticism + archetype rim mult)
  const rimSum =
    active.reduce((a, x) => {
      const p = x.p;
      const pos = p.identity.position as Position;
      const aType = p.identity.archetype as Archetype;

      const base = posRimBase(pos);
      const arch = rimMult(aType);
      const insideBias =
        R(p.ratings.finishing) <= 35
          ? 0.75
          : R(p.ratings.finishing) < 50
          ? 0.9
          : R(p.ratings.finishing) < 65
          ? 1.0
          : R(p.ratings.finishing) < 80
          ? 1.1
          : R(p.ratings.finishing) < 90
          ? 1.2
          : 1.25;

      const ballGate =
        pos === "PG" || pos === "SG" || pos === "SF"
          ? R(p.ratings.ballHandling) <= 35
            ? 0.85
            : R(p.ratings.ballHandling) >= 80
            ? 1.05
            : 1.0
          : 1.0;

      const per40 = base * arch * insideBias * ballGate;
      const historicRimBoost = historicNight && x.pid === top?.pid ? 1.6 : 1.0;
      const w = Math.max(0.001, per40 * (x.min / 40)) * historicRimBoost;
      return a + w;
    }, 0) || 1;

  const ftaBy = roundToTotal(
    rng,
    active.map((x) => {
      const p = x.p;
      const pos = p.identity.position as Position;
      const aType = p.identity.archetype as Archetype;

      const base = posRimBase(pos);
      const arch = rimMult(aType);
      const insideBias =
        R(p.ratings.finishing) <= 35
          ? 0.75
          : R(p.ratings.finishing) < 50
          ? 0.9
          : R(p.ratings.finishing) < 65
          ? 1.0
          : R(p.ratings.finishing) < 80
          ? 1.1
          : R(p.ratings.finishing) < 90
          ? 1.2
          : 1.25;

      const ballGate =
        pos === "PG" || pos === "SG" || pos === "SF"
          ? R(p.ratings.ballHandling) <= 35
            ? 0.85
            : R(p.ratings.ballHandling) >= 80
            ? 1.05
            : 1.0
          : 1.0;

      // During takeover, slightly bias FTA to the alpha (helps 45+ tails)
      const takeoverFtaMult = takeover && x.pid === top?.pid ? 1.22 : 1.0;
      const historicRimBoost = historicNight && x.pid === top?.pid ? 1.6 : 1.0;

      const per40 = base * arch * insideBias * ballGate;
      const w = Math.max(0.001, per40 * (x.min / 40)) * takeoverFtaMult * historicRimBoost;
      return { pid: x.pid, raw: (w / rimSum) * teamFTA };
    }),
    teamFTA
  );

  // Build shooting lines
  const lines: PlayerBoxScoreLine[] = [];

  for (const x of active) {
    const p = x.p;
    const pid = x.pid;
    const min = Math.round(x.min);

    const fga = fgaBy[pid] ?? 0;
    const tpa = clamp(tpaBy[pid] ?? 0, 0, fga);
    const twoPA = Math.max(0, fga - tpa);
    const fta = ftaBy[pid] ?? 0;

    // Midrange share within 2PA
    const pos = p.identity.position as Position;
    const baseMid =
      pos === "PG" || pos === "SG" ? 0.24 : pos === "SF" ? 0.2 : pos === "PF" ? 0.15 : 0.12;
    const midSkill = clamp((R(p.ratings.shooting2) - 50) / 200, -0.06, 0.06);
    const midShare = clamp(baseMid + midSkill, 0.08, 0.32);

    const midPA = Math.round(twoPA * midShare);
    const rimPA = Math.max(0, twoPA - midPA);

    // Form variance (reduced so ratings matter more, but still allows for game-to-game variation)
    const arch = p.identity.archetype as Archetype;
    const shooterVar = arch === "SHOOTER" || arch === "STRETCH_BIG" ? 1.2 : 1.0;
    const varianceMult = args.varianceMultiplier ?? 1.0;
    const form = randN01(rng) * 0.016 * shooterVar * varianceMult;

    // Hot night (rare tail): boosts alpha efficiency
    const hotBoost =
      hot && pid === top?.pid
        ? 0.06 + rand01(rng) * 0.04 // +6% to +10% (bounded later)
        : 0;
    const historicBoost =
      historicNight && pid === top?.pid
        ? 0.10 + rand01(rng) * 0.06 // +10% to +16% (extremely rare)
        : 0;

    // Defense suppression
    const tpBase = interp(R(p.ratings.shooting3), THREE_PCT);
    
    // Rim make: uses finishing + strength + athleticism (per spec)
    // Weighted combination: finishing is primary (60%), strength (25%) and athleticism (15%) add value
    const fin = R(p.ratings.finishing);
    const str = R(p.ratings.strength);
    const ath = R(p.ratings.athleticism);
    const rimOffenseRating = fin * 0.60 + str * 0.25 + ath * 0.15;
    const rimBase = interp(clamp(rimOffenseRating, 20, 99), RIM_2P_PCT);
    
    const midBase = interp(R(p.ratings.shooting2), MID_2P_PCT);
    const ftBase = interp(R(p.ratings.freeThrow), FT_PCT);

    // Fatigue multiplier: players playing >25 min/game experience reduced shooting
    // Fatigue penalty: 0.5% per extra minute beyond 25 (max -5% at 35+ minutes)
    const fatiguePenalty = Math.min(0.05, Math.max(0, (min - 25) * 0.005));

    // Apply scheme modifiers to shooting percentages
    const tpPct = clamp(tpBase + perimSupp(oppDef.perimD) + form + hotBoost + historicBoost - fatiguePenalty + (shootingModifier / 100), 0.18, 0.62);
    const rimPct = clamp(rimBase + rimSupp(oppDef.rimD) + form * 0.7 + hotBoost * 0.65 + historicBoost * 0.6 - fatiguePenalty * 0.8 + (shootingModifier / 100), 0.34, 0.82);
    const midPct = clamp(midBase + perimSupp(oppDef.perimD) * 0.35 + form * 0.6 + hotBoost * 0.45 + historicBoost * 0.4 - fatiguePenalty * 0.9 + (shootingModifier / 100), 0.25, 0.66);
    const ftPct = clamp(ftBase + form * 0.3 + (hot && pid === top?.pid ? 0.02 : 0) - fatiguePenalty * 0.5 + (shootingModifier / 100), 0.45, 0.95);

    const tpm = binomial(rng, tpa, tpPct);
    const rimPM = binomial(rng, rimPA, rimPct);
    const midPM = binomial(rng, midPA, midPct);
    const ftm = binomial(rng, fta, ftPct);

    const fgm = tpm + rimPM + midPM;
    const points = (rimPM + midPM) * 2 + tpm * 3 + ftm;

    lines.push({
      playerId: pid,
      minutes: min,
      points,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fgm,
      fga,
      tpm,
      tpa,
      ftm,
      fta,
      turnovers: 0,
      fouls: 0,
    });
  }

  // --- Event stats budgets ---
  // Rebounds: typical team totals mid-30s to low-40s (increased for better center numbers)
  const rareRebSpike = rand01(rng) < 0.004 ? randInt(rng, 8, 18) : 0;
  const baseReb = clamp(38 + randInt(rng, -3, 5) + rareRebSpike, 28, 58);

  // Team steals/blocks based on lineup defensive ratings (but capped to reality)
  const teamStlRating =
    active.reduce((a, x) => a + R(x.p.ratings.steal) * (x.min / 40), 0) /
    Math.max(1e-6, active.reduce((a, x) => a + x.min / 40, 0));
  const teamBlkRating =
    active.reduce((a, x) => a + R(x.p.ratings.block) * (x.min / 40), 0) /
    Math.max(1e-6, active.reduce((a, x) => a + x.min / 40, 0));

  // Typical college ranges (anchor): steals ~5–10; blocks ~2–6; elite can push higher rarely.
  const rareStlSpike = rand01(rng) < 0.003 ? randInt(rng, 3, 7) : 0;
  const rareBlkSpike = rand01(rng) < 0.003 ? randInt(rng, 3, 8) : 0;
  const stlCap = rareStlSpike > 0 ? 18 : 14;
  const blkCap = rareBlkSpike > 0 ? 16 : 10;
  const teamSteals = clamp(Math.round(7 + randInt(rng, -2, 4) + (teamStlRating - 50) / 18 + rareStlSpike), 4, stlCap);
  const teamBlocks = clamp(Math.round(4 + randInt(rng, -2, 3) + (teamBlkRating - 50) / 22 + rareBlkSpike), 1, blkCap);

  const baseFouls = 16 + randInt(rng, -3, 5);

  // Turnovers tied to opponent defensive pressure (steal + perimeterDefense per spec)
  // Combine steal and perimD into defensive pressure rating
  const defPressure = (oppDef.stl * 0.6 + oppDef.perimD * 0.4);
  const baseTO = clamp(11 + randInt(rng, -2, 4) + Math.round((defPressure - 50) / 18), 7, 18);

  // Assists tied to passing and makes
  const teamPass =
    active.reduce((a, x) => a + R(x.p.ratings.passing) * (x.min / 40), 0) / Math.max(1, active.length);
  const assistRate = clamp(0.52 + (teamPass - 50) / 200, 0.40, 0.72);
  const targetAst = clamp(Math.round(lines.reduce((a, b) => a + b.fgm, 0) * assistRate), 10, 25);

  // Rebounds allocation - tuned by position for NCAA ranges
  const posRebMult: Record<string, number> = { PG: 0.60, SG: 0.70, SF: 0.95, PF: 1.35, C: 1.70 };
  const posAstMult: Record<string, number> = { PG: 1.35, SG: 0.90, SF: 0.85, PF: 0.70, C: 0.60 };
  const posStlMult: Record<string, number> = { PG: 1.25, SG: 1.20, SF: 1.05, PF: 0.90, C: 0.75 };
  const posBlkMult: Record<string, number> = { PG: 0.40, SG: 0.50, SF: 0.80, PF: 1.20, C: 1.60 };
  const rebWsum =
    active.reduce((a, x) => {
      const p = x.p;
      // Increased weight on height and strength for centers
      const heightWeight = p.identity.position === 'C' ? 1.2 : 0.9;
      const strengthWeight = p.identity.position === 'C' ? 1.0 : 0.7;
      const w =
        (R(p.identity.heightIn) * heightWeight + R(p.ratings.strength) * strengthWeight + R(p.ratings.athleticism) * 0.6) *
        (posRebMult[p.identity.position] ?? 1) *
        (x.min / 40);
      return a + Math.max(0.001, w);
    }, 0) || 1;

  const rebBy = roundToTotal(
    rng,
    active.map((x) => {
      const p = x.p;
      // Increased weight on height and strength for centers
      const heightWeight = p.identity.position === 'C' ? 1.2 : 0.9;
      const strengthWeight = p.identity.position === 'C' ? 1.0 : 0.7;
      const w =
        (R(p.identity.heightIn) * heightWeight + R(p.ratings.strength) * strengthWeight + R(p.ratings.athleticism) * 0.6) *
        (posRebMult[p.identity.position] ?? 1) *
        (x.min / 40);
      return { pid: x.pid, raw: (Math.max(0.001, w) / rebWsum) * baseReb };
    }),
    baseReb
  );

  // Assists allocation
  const astWsum =
    active.reduce((a, x) => {
      const p = x.p;
      const pos = p.identity.position as Position;
      const w = (R(p.ratings.passing) * 1.2 + R(p.ratings.ballHandling) * 0.4) *
        (posAstMult[pos] ?? 1) *
        (x.min / 40);
      return a + Math.max(0.001, w);
    }, 0) || 1;

  const astBy = roundToTotal(
    rng,
    active.map((x) => {
      const p = x.p;
      const pos = p.identity.position as Position;
      const w = (R(p.ratings.passing) * 1.2 + R(p.ratings.ballHandling) * 0.4) *
        (posAstMult[pos] ?? 1) *
        (x.min / 40);
      return { pid: x.pid, raw: (Math.max(0.001, w) / astWsum) * targetAst };
    }),
    targetAst
  );

  // Steals allocation with positional soft caps + rare spikes
  const stlWeights = active.map((x) => {
    const p = x.p;
    const pos = p.identity.position as Position;
    const wRaw =
      (R(p.ratings.steal) * 1.0 + R(p.ratings.perimeterDefense) * 0.55 + R(p.ratings.athleticism) * 0.25) *
      (posStlMult[pos] ?? 1) *
      (x.min / 40);

    // Concentrate to top defenders a bit
    const w = Math.pow(Math.max(0.001, wRaw), 1.55);

    const elite = R(p.ratings.steal) >= 85 && R(p.ratings.perimeterDefense) >= 80 && x.min >= 30;
    return { pid: x.pid, w, pos, eliteFlag: elite };
  });

  const stealsBy = distributeWithSoftCaps({
    rng,
    total: teamSteals,
    weights: stlWeights,
    capsByPos: { PG: 5, SG: 5, SF: 4, PF: 3, C: 3 },
    spikeChance: 0.03,
    spikeMaxExtra: 2,
  });

  // Blocks allocation with positional soft caps + rare spikes
  const blkWeights = active.map((x) => {
    const p = x.p;
    const pos = p.identity.position as Position;
    const wRaw =
      (R(p.ratings.block) * 1.0 + R(p.ratings.rimDefense) * 0.7 + R(p.identity.heightIn) * 0.45) *
      (posBlkMult[pos] ?? 1) *
      (x.min / 40);

    // Stronger concentration for blocks (rim protectors dominate)
    const w = Math.pow(Math.max(0.001, wRaw), 1.75);

    // "Interior defender PG" exception: elite rim+block+athleticism with minutes
    const elite =
      (pos === "PG" || pos === "SG")
        ? R(p.ratings.block) >= 88 && R(p.ratings.rimDefense) >= 85 && R(p.ratings.athleticism) >= 85 && x.min >= 32
        : R(p.ratings.block) >= 82 && R(p.ratings.rimDefense) >= 80 && x.min >= 28;

    return { pid: x.pid, w, pos, eliteFlag: elite };
  });

  const blocksBy = distributeWithSoftCaps({
    rng,
    total: teamBlocks,
    weights: blkWeights,
    capsByPos: { PG: 2, SG: 2, SF: 3, PF: 5, C: 7 },
    spikeChance: 0.025,
    spikeMaxExtra: 3,
  });

  // Turnovers by usage + ball security (ballHandling/passing) + opponent pressure (steal/perimeterDefense per spec)
  const toWsum =
    active.reduce((a, x) => {
      const p = x.p;
      // Combine ballHandling and passing for turnover reduction (per spec)
      const ball = R(p.ratings.ballHandling);
      const pass = R(p.ratings.passing);
      const ballSecurity = (ball * 0.7 + pass * 0.3); // ballHandling is primary, passing helps decision-making
      const riskBase = 1.25 - clamp((ballSecurity - 20) / 120, 0, 0.70);
      
      // Opponent pressure: steal + perimeterDefense (per spec)
      const defPressure = (oppDef.stl * 0.6 + oppDef.perimD * 0.4);
      const press = 1.0 + clamp((defPressure - 50) / 120, 0, 0.20);
      const w = offensiveGravity(p, x.min) * riskBase * press;
      return a + Math.max(0.001, w);
    }, 0) || 1;

  const toBy = roundToTotal(
    rng,
    active.map((x) => {
      const p = x.p;
      // Combine ballHandling and passing for turnover reduction (per spec)
      const ball = R(p.ratings.ballHandling);
      const pass = R(p.ratings.passing);
      const ballSecurity = (ball * 0.7 + pass * 0.3); // ballHandling is primary, passing helps decision-making
      const riskBase = 1.25 - clamp((ballSecurity - 20) / 120, 0, 0.70);
      
      // Opponent pressure: steal + perimeterDefense (per spec)
      const defPressure = (oppDef.stl * 0.6 + oppDef.perimD * 0.4);
      const press = 1.0 + clamp((defPressure - 50) / 120, 0, 0.20);
      const w = offensiveGravity(p, x.min) * riskBase * press;
      return { pid: x.pid, raw: (Math.max(0.001, w) / toWsum) * baseTO };
    }),
    baseTO
  );

  // Fouls
  const foulMult: Record<string, number> = { PG: 0.8, SG: 0.9, SF: 1.0, PF: 1.15, C: 1.25 };
  const fWsum =
    active.reduce((a, x) => a + Math.max(0.001, (x.min / 40) * (foulMult[x.p.identity.position] ?? 1)), 0) || 1;

  const foulBy = roundToTotal(
    rng,
    active.map((x) => {
      const w = (x.min / 40) * (foulMult[x.p.identity.position] ?? 1);
      return { pid: x.pid, raw: (Math.max(0.001, w) / fWsum) * baseFouls };
    }),
    baseFouls
  );

  // Apply event stats to lines
  for (let i = 0; i < lines.length; i++) {
    const pid = lines[i].playerId;
    lines[i] = {
      ...lines[i],
      rebounds: rebBy[pid] ?? 0,
      assists: astBy[pid] ?? 0,
      steals: stealsBy[pid] ?? 0,
      blocks: blocksBy[pid] ?? 0,
      turnovers: toBy[pid] ?? 0,
      fouls: foulBy[pid] ?? 0,
    };
  }

  // stable sort for UI
  lines.sort((a, b) => b.minutes - a.minutes || b.points - a.points);
  return lines;
}

function addOvertimeToLines(rng: Rng, lines: PlayerBoxScoreLine[], otMinutesByPid: Record<ID, number>) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const otMin = otMinutesByPid[l.playerId] ?? 0;
    if (otMin <= 0) continue;

    const min = Math.max(1, l.minutes);
    const fgaPerMin = l.fga / min;
    const tpaPerMin = l.tpa / min;
    const ftaPerMin = l.fta / min;

    const addFGA = Math.max(0, Math.round(fgaPerMin * otMin));
    const addTPA = clamp(Math.round(tpaPerMin * otMin), 0, addFGA);
    const addFTA = Math.max(0, Math.round(ftaPerMin * otMin));

    const tpRate = l.tpa > 0 ? l.tpm / l.tpa : 0.35;
    const fg2Att = Math.max(0, l.fga - l.tpa);
    const fg2Made = Math.max(0, l.fgm - l.tpm);
    const twoRate = fg2Att > 0 ? fg2Made / fg2Att : 0.5;
    const ftRate = l.fta > 0 ? l.ftm / l.fta : 0.72;

    const otTPM = binomial(rng, addTPA, tpRate);
    const ot2PA = Math.max(0, addFGA - addTPA);
    const ot2PM = binomial(rng, ot2PA, twoRate);
    const otFTM = binomial(rng, addFTA, ftRate);

    const otFGM = otTPM + ot2PM;
    const otPts = ot2PM * 2 + otTPM * 3 + otFTM;

    lines[i] = {
      ...l,
      minutes: l.minutes + otMin,
      fga: l.fga + addFGA,
      tpa: l.tpa + addTPA,
      tpm: l.tpm + otTPM,
      fgm: l.fgm + otFGM,
      fta: l.fta + addFTA,
      ftm: l.ftm + otFTM,
      points: l.points + otPts,
      rebounds: l.rebounds + Math.round((l.rebounds / Math.max(1, l.minutes)) * otMin),
      assists: l.assists + Math.round((l.assists / Math.max(1, l.minutes)) * otMin),
      steals: l.steals + (rand01(rng) < 0.10 ? 1 : 0),
      blocks: l.blocks + (rand01(rng) < 0.07 ? 1 : 0),
      turnovers: l.turnovers + (rand01(rng) < 0.18 ? 1 : 0),
      fouls: l.fouls + (rand01(rng) < 0.20 ? 1 : 0),
    };
  }
}

export function simulateGame(args: {
  dynasty: Dynasty;
  gameId: ID;
  seasonYear: number;
  day: number;
  homeTeamId: ID;
  awayTeamId: ID;
}): { dynasty: Dynasty; homeScore: number; awayScore: number } {
  const { dynasty, gameId, seasonYear, day, homeTeamId, awayTeamId } = args;

  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `game_${gameId}_${seasonYear}_${day}`) };

  const homeMinutes = allocateTeamMinutes({
    dynasty,
    teamId: homeTeamId,
    seedKey: `minutes_${gameId}_home`,
    overtimes: 0,
  });
  const awayMinutes = allocateTeamMinutes({
    dynasty,
    teamId: awayTeamId,
    seedKey: `minutes_${gameId}_away`,
    overtimes: 0,
  });

  const homeDef = teamDefAverages(dynasty, homeTeamId, homeMinutes);
  const awayDef = teamDefAverages(dynasty, awayTeamId, awayMinutes);

  // Calculate team strengths for upset logic
  const homeStrength = calculateTeamStrength(dynasty, homeTeamId, homeMinutes);
  const awayStrength = calculateTeamStrength(dynasty, awayTeamId, awayMinutes);
  
  // Determine which team is the underdog and calculate upset modifiers
  let homeVarianceMult = 1.0;
  let awayVarianceMult = 1.0;
  if (homeStrength < awayStrength) {
    // Home is underdog
    const modifiers = calculateUpsetModifiers(rng, homeStrength, awayStrength);
    homeVarianceMult = modifiers.underdogVarianceMult;
    awayVarianceMult = modifiers.favoriteVarianceMult;
  } else if (awayStrength < homeStrength) {
    // Away is underdog
    const modifiers = calculateUpsetModifiers(rng, awayStrength, homeStrength);
    awayVarianceMult = modifiers.underdogVarianceMult;
    homeVarianceMult = modifiers.favoriteVarianceMult;
  }

  const homePace = dynasty.league.teamsById[homeTeamId]?.meta?.pace ?? 70;
  const awayPace = dynasty.league.teamsById[awayTeamId]?.meta?.pace ?? 70;
  
  // Apply coaching scheme modifiers to pace
  const homeScheme = getTeamSchemeModifiers(dynasty, homeTeamId);
  const awayScheme = getTeamSchemeModifiers(dynasty, awayTeamId);
  
  const adjustedHomePace = applyPaceModifier(homePace, homeScheme.pace);
  const adjustedAwayPace = applyPaceModifier(awayPace, awayScheme.pace);
  
  const poss = computePossessions(rng, adjustedHomePace, adjustedAwayPace);

  const homeFGA = computeTeamFGA(rng, poss);
  const awayFGA = computeTeamFGA(rng, poss);

  const homeThreeRate = computeTeamThreeRate(rng);
  const awayThreeRate = computeTeamThreeRate(rng);

  const homeTPA = clamp(Math.round(homeFGA * homeThreeRate), 16, 38);
  const awayTPA = clamp(Math.round(awayFGA * awayThreeRate), 16, 38);

  const homeRimIndex = clamp(Math.round(50 + (R(homeDef.rimD) - 50) * -0.10), 40, 60);
  const awayRimIndex = clamp(Math.round(50 + (R(awayDef.rimD) - 50) * -0.10), 40, 60);

  const homeFTA = computeTeamFTA(rng, poss, homeRimIndex);
  const awayFTA = computeTeamFTA(rng, poss, awayRimIndex);

  const homeLines = buildTeamLinesRegulation({
    dynasty,
    teamId: homeTeamId,
    minutes: homeMinutes,
    oppDef: awayDef,
    teamFGA: homeFGA,
    teamTPA: homeTPA,
    teamFTA: homeFTA,
    rng,
    varianceMultiplier: homeVarianceMult,
  });
  const awayLines = buildTeamLinesRegulation({
    dynasty,
    teamId: awayTeamId,
    minutes: awayMinutes,
    oppDef: homeDef,
    teamFGA: awayFGA,
    teamTPA: awayTPA,
    teamFTA: awayFTA,
    rng,
    varianceMultiplier: awayVarianceMult,
  });

  let homeScore = homeLines.reduce((a, b) => a + b.points, 0);
  let awayScore = awayLines.reduce((a, b) => a + b.points, 0);

  let overtimes = 0;
  while (homeScore === awayScore && overtimes < 3) {
    overtimes++;

    const otHomeMin = allocateTeamMinutes({
      dynasty,
      teamId: homeTeamId,
      seedKey: `minutes_${gameId}_home_ot${overtimes}`,
      overtimes: 1,
    });
    const otAwayMin = allocateTeamMinutes({
      dynasty,
      teamId: awayTeamId,
      seedKey: `minutes_${gameId}_away_ot${overtimes}`,
      overtimes: 1,
    });

    const incHome: Record<ID, number> = {};
    const incAway: Record<ID, number> = {};
    for (const pid of Object.keys(otHomeMin)) incHome[pid] = Math.max(0, (otHomeMin[pid] ?? 0) - (homeMinutes[pid] ?? 0));
    for (const pid of Object.keys(otAwayMin)) incAway[pid] = Math.max(0, (otAwayMin[pid] ?? 0) - (awayMinutes[pid] ?? 0));

    addOvertimeToLines(rng, homeLines, incHome);
    addOvertimeToLines(rng, awayLines, incAway);

    homeScore = homeLines.reduce((a, b) => a + b.points, 0);
    awayScore = awayLines.reduce((a, b) => a + b.points, 0);
  }
  if (homeScore === awayScore) homeScore += 1;

  const homeTeamLine = sumTeam(homeLines);
  const awayTeamLine = sumTeam(awayLines);

  homeTeamLine.points = homeScore;
  awayTeamLine.points = awayScore;

  const updated: Dynasty = {
    ...dynasty,
    league: {
      ...dynasty.league,
      gamesById: {
        ...dynasty.league.gamesById,
        [gameId]: {
          gameId,
          seasonYear,
          day,
          homeTeamId,
          awayTeamId,
          status: "FINAL",
          result: {
            homeScore,
            awayScore,
            boxScore: {
              meta: { possessions: poss, overtimes },
              teamStats: { home: homeTeamLine, away: awayTeamLine },
              playerLinesByTeam: { home: homeLines, away: awayLines },
            },
          },
        },
      },
    },
  };

  return { dynasty: updated, homeScore, awayScore };
}
