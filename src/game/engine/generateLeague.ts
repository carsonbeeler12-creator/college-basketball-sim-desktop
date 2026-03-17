// src/game/engine/generateLeague.ts
import { TEAMS } from "../defaultData";
import type {
  Dynasty,
  ID,
  PlayerState,
  Position,
  ClassYear,
  TeamState,
  TeamRotationState,
  TeamRotationSettings,
  PlayerRatings,
  Archetype,
  RatingKey,
} from "../types/dynasty";
import { pickArchetypeForPosition, ARCHETYPE_OFFSETS } from "./ratings/archetypes";
import { computeOverall } from "./ratings/overall";

import { DYNASTY_SAVE_VERSION } from "../types/dynasty";

type Rng = { state: number };

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function rand01(rng: Rng): number {
  rng.state = (rng.state * 1664525 + 1013904223) >>> 0;
  return rng.state / 4294967296;
}
function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rand01(rng) * (max - min + 1)) + min;
}
function jitter(rng: Rng, amount: number) {
  return (rand01(rng) - 0.5) * 2 * amount;
}
function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}
function makeId(prefix: string, rng: Rng): ID {
  const a = Math.floor(rand01(rng) * 1e9).toString(16);
  const b = Math.floor(rand01(rng) * 1e9).toString(16);
  return `${prefix}_${a}_${b}`;
}

// ---------------------------
// Roster composition (13-man)
// ---------------------------
const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

function buildRosterPositions(rng: Rng): Position[] {
  // Start with 2 per position = 10
  const out: Position[] = [];
  for (const pos of POSITIONS) out.push(pos, pos);

  // Add 3 more slots with a modern bias toward guards/wings
  const addPool: Position[] = ["PG", "SG", "SG", "SF", "SF", "PF"];
  for (let i = 0; i < 3; i++) out.push(pick(rng, addPool));

  // Shuffle lightly so class assignment isn't always tied to position
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }

  // Ensure at least 2 ball-handlers (PG/SG)
  const ballHandlers = out.filter((p) => p === "PG" || p === "SG").length;
  if (ballHandlers < 2) {
    const idx = out.findIndex((p) => p === "SF" || p === "PF");
    if (idx >= 0) out[idx] = "SG";
  }

  // Ensure at least 2 bigs (PF/C)
  const bigs = out.filter((p) => p === "PF" || p === "C").length;
  if (bigs < 2) {
    const idx = out.findIndex((p) => p === "PG" || p === "SG");
    if (idx >= 0) out[idx] = "PF";
  }

  return out;
}

function buildClassYears(rng: Rng): ClassYear[] {
  // Baseline year-1 roster distribution for 13 players:
  // FR 3, SO 3, JR 3, SR 4
  const base: ClassYear[] = ["FR", "FR", "FR", "SO", "SO", "SO", "JR", "JR", "JR", "SR", "SR", "SR", "SR"];

  // Shuffle
  for (let i = base.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }
  return base;
}

// --------------------------------------
// Prestige → talent envelope (stronger)
// --------------------------------------
type TalentTier = "STAR" | "STARTER" | "ROTATION" | "BENCH" | "DEEP";

function prestigeMeans(prestige: number) {
  // prestige 1 => starters ~31, prestige 100 => starters ~85
  const starterMean = 30 + prestige * 0.55;
  const benchMean = 22 + prestige * 0.50;
  return { starterMean, benchMean };
}

function pickTierForSlot(rng: Rng, prestige: number, slotIndex: number): TalentTier {
  const p = prestige;
  const isTop = slotIndex <= 4;
  const isMid = slotIndex <= 8;

  const starChance = clamp((p - 70) / 60, 0, 0.25);
  const starterChance = clamp((p - 35) / 65, 0.15, 0.85);
  const rotationChance = clamp((p - 25) / 75, 0.20, 0.70);

  const r = rand01(rng);

  if (isTop) {
    if (r < starChance) return "STAR";
    if (r < starChance + 0.65) return "STARTER";
    return "ROTATION";
  }

  if (isMid) {
    if (r < rotationChance) return "ROTATION";
    if (r < rotationChance + 0.55) return "BENCH";
    return "DEEP";
  }

  if (r < 0.20 + starterChance * 0.10) return "BENCH";
  return "DEEP";
}

function overallTargetForPlayer(rng: Rng, prestige: number, tier: TalentTier, classYear: ClassYear): number {
  const { starterMean, benchMean } = prestigeMeans(prestige);
  let mean = benchMean;

  switch (tier) {
    case "STAR":
      mean = starterMean + 9;
      break;
    case "STARTER":
      mean = starterMean + 3;
      break;
    case "ROTATION":
      mean = starterMean - 2;
      break;
    case "BENCH":
      mean = benchMean - 4;
      break;
    case "DEEP":
      mean = benchMean - 12;
      break;
  }

  // Class year adjustments - younger players should be significantly lower
  // This ensures 90 overall is rare for freshmen, common for seniors
  let classYearAdjustment = 0;
  let isGenerationalFreshman = false;
  
  switch (classYear) {
    case "FR":
      // Freshmen penalty: -10 to -8 base (major reduction)
      // Generational talent exception: 0.02% chance (~1 in 5000) for elite programs to reduce penalty
      isGenerationalFreshman = prestige >= 90 && tier === "STAR" && rand01(rng) < 0.0002;
      classYearAdjustment = isGenerationalFreshman ? -5 + randInt(rng, 0, 2) : -10 + randInt(rng, 0, 2);
      break;
    case "SO":
      // Sophomore penalty: -4 to -3 (moderate reduction)
      classYearAdjustment = -4 + randInt(rng, 0, 1);
      break;
    case "JR":
      // Junior penalty: -2 to -1 (minor reduction)
      classYearAdjustment = -2 + randInt(rng, 0, 1);
      break;
    case "SR":
      // Seniors: no penalty (they're at peak)
      classYearAdjustment = 0;
      break;
  }

  const noise = jitter(rng, 5);
  const raw = mean + classYearAdjustment + noise;

  // Tail boost for elite players (creates ~45-136 players at 90+ across NCAA)
  // Very aggressive boosts for top programs to hit 1-3% elite player target
  let tailBoost = 0;
  if (prestige >= 90 && (classYear === "SR" || classYear === "JR") && (tier === "STAR" || tier === "STARTER")) {
    // Top 7 elite programs, SR/JR stars+starters: 75% chance for major boost
    if (rand01(rng) < 0.75) {
      tailBoost = randInt(rng, 9, 19);
    }
  } else if (prestige >= 85 && (classYear === "SR" || classYear === "JR") && (tier === "STAR" || tier === "STARTER")) {
    // Elite programs (85-89 prestige), SR/JR stars+starters: 55% chance
    if (rand01(rng) < 0.55) {
      tailBoost = randInt(rng, 7, 16);
    }
  } else if (prestige >= 80 && classYear === "SR" && (tier === "STAR" || tier === "STARTER")) {
    // Good programs (80-84), SR stars+starters: 40% chance
    if (rand01(rng) < 0.40) {
      tailBoost = randInt(rng, 6, 14);
    }
  } else if (prestige >= 75 && classYear === "SR" && tier === "STAR") {
    // Decent programs, SR stars only: 25% chance
    if (rand01(rng) < 0.25) {
      tailBoost = randInt(rng, 5, 12);
    }
  } else if (prestige >= 70 && classYear === "SR" && tier === "STAR") {
    // Mid-tier programs, SR stars: 15% chance
    if (rand01(rng) < 0.15) {
      tailBoost = randInt(rng, 4, 10);
    }
  } else if (prestige >= 85 && rand01(rng) < 0.015) {
    // General elite boost
    tailBoost = randInt(rng, 4, 10);
  } else if (prestige >= 75 && rand01(rng) < 0.006) {
    tailBoost = randInt(rng, 2, 6);
  }

  // Cap non-generational freshmen at 88 to prevent too many 90+ freshmen
  // Generational freshmen can reach 95+ but it's extremely rare
  const capped = classYear === "FR" && !isGenerationalFreshman
    ? Math.min(raw + tailBoost, 88) // Regular freshmen capped at 88
    : raw + tailBoost;

  return Math.round(clamp(capped, 25, 95));
}

// ---------------------------
// Identity + Ratings
// ---------------------------
const FIRST = [
  // Common/Anglo names
  "Jordan","Cameron","Tyler","Malik","Devin","Marcus","Ethan","Noah","Isaiah","Jalen","Darius","Caleb","Aiden","Xavier",
  "Cole","Grant","Trevor","KJ","Miles","Nolan","Brandon","Andre","Chris","Trey","Bryce","Micah","Parker","Austin",
  "James","Michael","David","Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew",
  "Joshua","Kenneth","Kevin","Brian","George","Timothy","Ronald","Jason","Edward","Jeffrey","Ryan","Jacob","Gary",
  "Nicholas","Eric","Jonathan","Stephen","Larry","Justin","Scott","Brandon","Benjamin","Samuel","Frank","Gregory",
  "Raymond","Alexander","Patrick","Jack","Dennis","Jerry","Tyler","Aaron","Jose","Henry","Adam","Douglas","Nathan",
  "Zachary","Kyle","Noah","Ethan","Jeremy","Hunter","Mason","Christian","Dylan","Tristan","Landon","Adrian","Connor",
  // African-American names
  "Jaden","Jamal","Tyrone","Darnell","Kendrick","Marquis","Trevon","DeAndre","Jeremiah","Kaleb","Malcolm","Terrell",
  "Andre","Darius","Quinton","Rashad","Tarik","Deion","Keenan","Quentin","Tariq","Jermaine","Darnell","Keon","Tevin",
  "Daquan","Kareem","Marquis","Tariq","Jamari","Kyrie","Shaquille","DeMarcus","Kobe","Jabari","Terrence","Deshawn",
  // Hispanic/Latino names
  "Alejandro","Carlos","Diego","Eduardo","Fernando","Gabriel","Hector","Ivan","Javier","Jorge","Luis","Manuel",
  "Miguel","Oscar","Pablo","Rafael","Ricardo","Roberto","Sergio","Victor","Alonso","Andres","Cesar","Dario",
  "Emilio","Felipe","Gonzalo","Ignacio","Jose","Leonardo","Mateo","Nicolas","Octavio","Pablo","Ramon","Sebastian",
  "Tomas","Ulysses","Valentin","Xavier","Yahir","Zachary",
  // Asian names
  "Kenji","Hiroshi","Min","Wei","Jin","Chen","Ming","Li","Takeshi","Ryo","Kai","Jun","Yuki","Ken","Ray","Tommy",
  "Andy","Daniel","Kevin","Michael","David","Steven","Eric","Jason","Andrew","Ryan","Justin","Alex","Chris",
  // Other diverse names
  "Amir","Zayn","Hassan","Mohamed","Omar","Ali","Ahmed","Yusuf","Ibrahim","Khalil","Rashid","Zayd","Tariq","Samir",
  "Dmitri","Ivan","Alexei","Nikolai","Viktor","Mikhail","Sergei","Andrei","Roman","Pavel","Yuri","Maxim",
];
const LAST = [
  // Common surnames
  "Johnson","Williams","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris",
  "Martin","Thompson","Garcia","Martinez","Robinson","Clark","Lewis","Lee","Walker","Hall","Allen","Young","King",
  "Wright","Lopez","Hill","Scott","Green","Adams","Baker","Gonzalez","Nelson","Carter","Mitchell","Perez","Roberts",
  "Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris","Rogers","Reed",
  "Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson",
  "Gray","Ramirez","James","Watson","Brooks","Kelly","Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson",
  "Coleman","Jenkins","Perry","Powell","Long","Patterson","Hughes","Flores","Washington","Butler","Simmons","Foster",
  "Gonzales","Bryant","Alexander","Russell","Griffin","Diaz","Hayes","Myers","Ford","Hamilton","Graham","Sullivan",
  "Wallace","Woods","Cole","West","Jordan","Owens","Reynolds","Fisher","Ellis","Harrison","Gibson","Mcdonald",
  "Cruz","Marshall","Ortiz","Gomez","Murray","Freeman","Wells","Webb","Simpson","Stevens","Tucker","Porter",
  // Hispanic/Latino surnames
  "Rodriguez","Lopez","Gonzalez","Hernandez","Garcia","Martinez","Sanchez","Torres","Ramirez","Flores","Rivera",
  "Perez","Gomez","Reyes","Cruz","Morales","Ortiz","Gutierrez","Chavez","Ramos","Mendoza","Herrera","Vargas",
  "Castro","Jimenez","Ruiz","Diaz","Alvarez","Moreno","Romero","Guzman","Mendez","Fernandez","Vega","Silva",
  "Molina","Soto","Contreras","Delgado","Garza","Vasquez","Rojas","Acosta","Carrillo","Medina","Castillo","Ochoa",
  // African-American surnames
  "Washington","Jackson","Brown","Davis","Williams","Johnson","Jones","Miller","Wilson","Moore","Taylor","Anderson",
  "Thomas","Harris","Robinson","Clark","Lewis","Walker","Hall","Allen","Young","King","Wright","Lopez","Hill",
  // Asian surnames
  "Wang","Li","Zhang","Liu","Chen","Yang","Huang","Zhao","Wu","Zhou","Xu","Sun","Ma","Zhu","Hu","Guo","He","Gao",
  "Lin","Luo","Song","Zheng","Han","Liang","Cheng","Deng","Xie","Cao","Peng","Xu","Xiao","Wei","Jiang","Yuan","Tian",
  "Yamamoto","Tanaka","Suzuki","Watanabe","Ito","Nakamura","Kobayashi","Kato","Yoshida","Yamada","Sasaki","Yamaguchi",
  "Matsumoto","Inoue","Kimura","Hayashi","Shimizu","Yamazaki","Mori","Abe","Ikeda","Hashimoto","Yamashita","Ishikawa",
  "Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Shin","Oh","Hwang","Song","Kwon","Moon",
  "Jung","Chung","Yu","Baek","Ahn","Seo","Roh","Jeon","Hong","Ko","Bae","Nam","Son","Woo","Sohn","Yang","Hahn",
  // Other diverse surnames
  "Patel","Shah","Singh","Kumar","Ahmed","Ali","Hassan","Khan","Rahman","Malik","Ibrahim","Hussein","Mohamed","Ahmad",
  "Hassan","Omar","Mahmoud","Abdel","Yusuf","Salem","Farid","Karim","Nasser","Fadel","Ibrahim","Hamza","Bakr",
  "Ivanov","Petrov","Sidorov","Smirnov","Popov","Lebedev","Kozlov","Novikov","Morozov","Volkov","Alekseev","Orlov",
  "Pavlov","Sokolov","Stepanov","Nikolaev","Orlov","Romanov","Fedorov","Egorov","Sergeev","Grigoriev","Petrov",
];

function genPlayerIdentity(
  rng: Rng,
  pos: Position,
  classYear: ClassYear,
  archetype: Archetype,
  teamCity: string,
  teamState: string
) {
  const firstName = pick(rng, FIRST);
  const lastName = pick(rng, LAST);

  const age =
    classYear === "FR" ? randInt(rng, 18, 19) :
    classYear === "SO" ? randInt(rng, 19, 20) :
    classYear === "JR" ? randInt(rng, 20, 21) :
    randInt(rng, 21, 23);

  let heightIn = 72;
  let weightLb = 190;
  if (pos === "PG") { heightIn = randInt(rng, 69, 75); weightLb = randInt(rng, 160, 205); }
  if (pos === "SG") { heightIn = randInt(rng, 72, 78); weightLb = randInt(rng, 175, 220); }
  if (pos === "SF") { heightIn = randInt(rng, 75, 81); weightLb = randInt(rng, 195, 235); }
  if (pos === "PF") { heightIn = randInt(rng, 77, 83); weightLb = randInt(rng, 210, 255); }
  if (pos === "C")  { heightIn = randInt(rng, 80, 87); weightLb = randInt(rng, 225, 285); }

  return {
    firstName,
    lastName,
    age,
    classYear,
    position: pos,
    archetype,
    heightIn,
    weightLb,
    hometown: `${teamCity}, ${teamState}`,
  };
}

function applyArchetypeOffsets(
  rng: Rng,
  pos: Position,
  archetype: Archetype,
  base: Record<RatingKey, number>
): Record<RatingKey, number> {
  const offsets = ARCHETYPE_OFFSETS[archetype] ?? {};
  const out: Record<RatingKey, number> = { ...base };

  for (const k of Object.keys(offsets) as RatingKey[]) {
    const range = offsets[k];
    if (!range) continue;
    const [minD, maxD] = range;

    // Keep a tiny randomness inside the offset to avoid clones
    const delta = randInt(rng, minD, maxD) + Math.round(jitter(rng, 1.5));
    out[k] = clamp(out[k] + delta, 1, 99);
  }

  // Position sanity clamps to prevent weird outliers
  if (pos === "PG" || pos === "SG") {
    out.rimDefense = clamp(out.rimDefense, 1, 80);
    out.block = clamp(out.block, 1, 75);
  }
  if (pos === "C") {
    out.ballHandling = clamp(out.ballHandling, 1, 85);
  }

  return out;
}

function nudgeTowardOverallTarget(rng: Rng, pos: Position, stats: Record<RatingKey, number>, target: number) {
  // Preserve archetype identity; just keep us from drifting wildly above/below target.
  let out = { ...stats };

  for (let iter = 0; iter < 2; iter++) {
    const ovr = computeOverall(out, pos);
    const diff = target - ovr;
    if (Math.abs(diff) <= 2) break;

    const shift = diff * 0.60; // gentle pull
    (Object.keys(out) as RatingKey[]).forEach((k) => {
      const scale = k === "stamina" ? 0.30 : 1.0;
      out[k] = clamp(out[k] + Math.round(shift * scale) + Math.round(jitter(rng, 0.8)), 1, 99);
    });
  }

  return out;
}

/**
 * Enforce rarity constraints per spec:
 * - 99 ratings are very rare (only allow if very high overallTarget and low chance)
 * - Elite players don't have 6+ stats at 95+
 * - Cap individual stats based on overallTarget to prevent inflation
 * - Generational talents get special treatment (allow more exceptional stats)
 */
function enforceRatingConstraints(
  rng: Rng,
  stats: Record<RatingKey, number>,
  overallTarget: number,
  isGenerational?: boolean
): Record<RatingKey, number> {
  const constrained = { ...stats };
  const keys = Object.keys(constrained) as RatingKey[];

  // Cap individual stats based on overallTarget - prevents recruits from having 90+ in everything
  // A 75 OVR recruit shouldn't have multiple 90+ stats
  // Generational talents get more lenient caps (they're truly special)
  const maxStatCap = isGenerational ? overallTarget + 20 : overallTarget + 15; // Generational can have more exceptional stats
  const strictMaxCap = isGenerational ? overallTarget + 15 : overallTarget + 10; // Generational can have more stats exceed cap
  
  // Count how many stats exceed the strict cap
  const overStrictCap = keys.filter((k) => constrained[k] > strictMaxCap);
  const maxOverCap = isGenerational ? 5 : 3; // Generational can have up to 5 stats exceed cap
  if (overStrictCap.length > maxOverCap) {
    // If more than maxOverCap stats exceed strict cap, reduce excess ones
    overStrictCap.sort((a, b) => constrained[b] - constrained[a]);
    const toReduce = overStrictCap.slice(maxOverCap); // Keep top specialized stats
    
    for (const k of toReduce) {
      constrained[k] = clamp(constrained[k] - randInt(rng, 3, 8), 1, strictMaxCap);
    }
  }
  
  // Hard cap all stats at maxStatCap
  for (const k of keys) {
    if (constrained[k] > maxStatCap) {
      constrained[k] = clamp(constrained[k] - randInt(rng, 2, 6), 1, maxStatCap);
    }
  }

  // Count how many 95+ stats exist
  let highStatCount = 0;
  for (const k of keys) {
    if (constrained[k] >= 95) highStatCount++;
  }

  // If elite player (high overallTarget) has too many stats at 95+, reduce excess
  // Elite players should have clear strengths, not be good at everything
  // Generational talents can have more 95+ stats (they're truly special)
  const maxHighStats = isGenerational ? 7 : 5; // Generational can have up to 7 stats at 95+
  if (overallTarget >= 85 && highStatCount > maxHighStats) {
    const highStats = keys.filter((k) => constrained[k] >= 95);
    // Sort by rating (descending) and reduce the "extra" ones
    highStats.sort((a, b) => constrained[b] - constrained[a]);
    const toReduce = highStats.slice(maxHighStats); // Keep top stats, reduce the rest

    for (const k of toReduce) {
      // Reduce to 92-94 range, maintaining player quality but enforcing variety
      constrained[k] = clamp(constrained[k] - randInt(rng, 3, 7), 88, 94);
    }
  }

  // Enforce 99 rarity: only allow 99 if overallTarget is very high (90+) AND low random chance
  // Even elite players rarely hit 99 in any stat
  // Generational talents have a higher chance (they're truly special)
  const allow99Chance = isGenerational ? 0.35 : 0.15; // Generational: 35% chance, others: 15%
  const allow99 = overallTarget >= 90 && rand01(rng) < allow99Chance;
  if (!allow99) {
    for (const k of keys) {
      if (constrained[k] >= 99) {
        constrained[k] = clamp(constrained[k] - randInt(rng, 1, 4), 95, 98);
      }
    }
  } else {
    // Even if allowed, limit stats at 99 (generational can have more)
    const max99Stats = isGenerational ? 3 : 2; // Generational can have up to 3 stats at 99
    const at99 = keys.filter((k) => constrained[k] >= 99);
    if (at99.length > max99Stats) {
      const sorted = [...at99].sort((a, b) => constrained[b] - constrained[a]);
      for (const k of sorted.slice(max99Stats)) {
        constrained[k] = clamp(constrained[k] - randInt(rng, 1, 3), 96, 98);
      }
    }
  }

  return constrained;
}

export function genRatings(rng: Rng, pos: Position, archetype: Archetype, overallTarget: number, isGenerational?: boolean): PlayerRatings {
  const core = (bias: number, spread: number) =>
    Math.round(clamp(overallTarget + bias + jitter(rng, spread), 1, 99));

  const isG = pos === "PG" || pos === "SG";
  const isW = pos === "SF";
  const isF = pos === "PF";
  const isC = pos === "C";

  // Position-shaped baseline
  const base: Record<RatingKey, number> = {
    shooting2: core(isC ? +6 : isF ? +3 : isW ? +1 : -2, 8),
    shooting3: core(isG ? +4 : isW ? +2 : isF ? -3 : -10, 8),
    freeThrow: core(isC ? -6 : isF ? -2 : +3, 9),
    finishing: core(isC ? +6 : isF ? +3 : isW ? +1 : 0, 8),
    ballHandling: core(isG ? +7 : isW ? +1 : -9, 8),
    passing: core(pos === "PG" ? +11 : pos === "SG" ? +2 : pos === "SF" ? 0 : -8, 8),

    perimeterDefense: core(isG ? +3 : isW ? +2 : -6, 8),
    rimDefense: core(isC ? +10 : isF ? +5 : -8, 8),
    steal: core(isG ? +5 : isW ? +1 : -6, 8),
    block: core(isC ? +12 : isF ? +6 : isW ? -5 : -11, 8),

    athleticism: core(isG ? +4 : isW ? +3 : isF ? +1 : -1, 8),
    strength: core(isC ? +10 : isF ? +6 : -2, 8),
    stamina: Math.round(clamp(55 + (overallTarget - 50) * 0.40 + jitter(rng, 8), 35, 95)),
  };

  // Archetype-first strong shaping
  const shaped = applyArchetypeOffsets(rng, pos, archetype, base);

  // Keep within the intended talent envelope for this player
  const tuned = nudgeTowardOverallTarget(rng, pos, shaped, overallTarget);

  // Enforce rarity constraints (99 rarity, elite balance)
  const constrained = enforceRatingConstraints(rng, tuned, overallTarget, isGenerational);

  const derivedOverall = computeOverall(constrained, pos);

  return {
    overall: derivedOverall,
    ...constrained,
  };
}

// ---------------------------
// Rotation state
// ---------------------------
function buildRotationState(playersById: Record<ID, PlayerState>, rosterIds: ID[]): TeamRotationState {
  const byPos: Record<Position, ID[]> = { PG: [], SG: [], SF: [], PF: [], C: [] };

  for (const pid of rosterIds) {
    const p = playersById[pid];
    if (!p) continue;
    byPos[p.identity.position].push(pid);
  }

  const sortByOverallDesc = (a: ID, b: ID) =>
    (playersById[b]?.ratings.overall ?? 0) - (playersById[a]?.ratings.overall ?? 0);

  (Object.keys(byPos) as Position[]).forEach((pos) => byPos[pos].sort(sortByOverallDesc));

  const defaults: TeamRotationSettings = {
    style: "NORMAL",
    rotationSizeTarget: 8.5,
    benchFactor: 0.5,
    blowoutBenchFactor: 0.7,
  };

  return {
    settings: defaults,
    depthChart: byPos,
    minutesTargetByPlayerId: {}, // 0 means auto
  };
}

export function generateLeagueAndRosters(dynasty: Dynasty): Dynasty {
  const rng: Rng = { state: dynasty.rng.state >>> 0 };

  const teamsById: Record<ID, TeamState> = {};
  const playersById: Record<ID, PlayerState> = {};

  for (const t of TEAMS) {
    const teamId = t.id as ID;
    const prestige = clamp(Number(t.prestige ?? 50), 1, 100);

    const rosterPlayerIds: ID[] = [];
    const redshirted: ID[] = [];

    const rosterPositions = buildRosterPositions(rng); // length 13
    const classYears = buildClassYears(rng); // length 13

    // Create players
    for (let i = 0; i < 13; i++) {
      const pos = rosterPositions[i];
      const classYear = classYears[i];

      const tier = pickTierForSlot(rng, prestige, i);
      const overallTarget = overallTargetForPlayer(rng, prestige, tier, classYear);
      
      // Determine if player is generational talent (extremely rare)
      // Target: 0-5 generational per entire NCAA (~0.01-0.1% of 4524 players)
      // Generational = extremely rare (2 max league-wide), only elite programs with exceptional recruits
      const isGenerational = overallTarget >= 92 && prestige >= 90 && rand01(rng) < 0.0004; // ~0.04% chance = ~2 players

      const archetype = pickArchetypeForPosition(rng, pos);
      const playerId = makeId("p", rng);

      const identity = genPlayerIdentity(rng, pos, classYear, archetype, t.city, t.state);
      const ratings = genRatings(rng, pos, archetype, overallTarget, isGenerational);

      const p: PlayerState = {
        playerId,
        identity,
        ratings,
        development: {
          potential: Math.round(clamp(overallTarget + randInt(rng, -5, 10), 35, 99)),
          workEthic: randInt(rng, 35, 95),
          durability: randInt(rng, 40, 95),
          isGenerational,
        },
        team: {
          teamId,
          isRedshirt: false,
        },
        stats: {
          seasonYear: dynasty.world.seasonYear,
          gamesPlayed: 0,
          minutes: 0,
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
        },
      };

      playersById[playerId] = p;
      rosterPlayerIds.push(playerId);
    }

    // Stable ordering: position then overall desc (helps UI & depth chart)
    const posOrder: Record<Position, number> = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };
    rosterPlayerIds.sort((a, b) => {
      const pa = playersById[a];
      const pb = playersById[b];
      const oa = posOrder[pa.identity.position] ?? 9;
      const ob = posOrder[pb.identity.position] ?? 9;
      if (oa !== ob) return oa - ob;
      return (pb.ratings.overall ?? 0) - (pa.ratings.overall ?? 0);
    });

    const rotation = buildRotationState(playersById, rosterPlayerIds);

    // Pace slightly correlated with prestige
    const paceBase = 70 + jitter(rng, 4) - (prestige - 60) * 0.05;

    teamsById[teamId] = {
      teamId,
      name: t.name, // Add team name from TEAMS array
      meta: {
        pace: clamp(Math.round(paceBase), 60, 80),
        conferenceId: t.conferenceId, // Store conferenceId in meta
      },
      roster: {
        playerIds: rosterPlayerIds,
        redshirtedPlayerIds: redshirted,
      },
      season: {
        wins: 0,
        losses: 0,
        confWins: 0,
        confLosses: 0,
        teamRating: undefined,
      },
      rotation,
    };
  }

  const updated: Dynasty = {
    ...dynasty,
    saveVersion: DYNASTY_SAVE_VERSION,
    rng: {
      ...dynasty.rng,
      state: rng.state >>> 0,
    },
    league: {
      ...dynasty.league,
      teamsById,
      gamesById: dynasty.league.gamesById ?? {},
      standingsBySeason: dynasty.league.standingsBySeason ?? {},
    },
    playersById,
  };

  return updated;
}
