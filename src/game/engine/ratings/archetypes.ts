// src/game/engine/ratings/archetypes.ts
import type { Archetype, Position, RatingKey } from "../../types/dynasty";

type Rng = { state: number };

function rand01(rng: Rng): number {
  rng.state = (rng.state * 1664525 + 1013904223) >>> 0;
  return rng.state / 4294967296;
}
function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rand01(rng) * (max - min + 1)) + min;
}
function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

export const ARCHETYPES = [
  "PRIMARY_SCORER",
  "FACILITATOR",
  "SHOOTER",
  "TWO_WAY_GUARD",
  "WING_SCORER",
  "THREE_AND_D_WING",
  "ALL_AROUND_WING",
  "POST_SCORER",
  "RIM_PROTECTOR",
  "REBOUNDER_ENERGY_BIG",
  "STRETCH_BIG",
] as const satisfies readonly Archetype[];

/**
 * Backwards-compatible small nudges (kept so other files importing ARCHETYPE_BIASES won't break).
 * Generation will NOT rely on these anymore; it will use ARCHETYPE_OFFSETS instead.
 */
export const ARCHETYPE_BIASES: Record<Archetype, Partial<Record<RatingKey, number>>> = {
  PRIMARY_SCORER: { shooting2: +3, shooting3: +2, finishing: +3, ballHandling: +2 },
  FACILITATOR: { passing: +6, ballHandling: +3, shooting3: +1 },
  SHOOTER: { shooting3: +7, freeThrow: +3, shooting2: +1 },
  TWO_WAY_GUARD: { perimeterDefense: +5, steal: +4, ballHandling: +1, shooting3: +1 },
  WING_SCORER: { shooting2: +3, shooting3: +2, athleticism: +2, finishing: +2 },
  THREE_AND_D_WING: { shooting3: +4, perimeterDefense: +6, steal: +2, athleticism: +1 },
  ALL_AROUND_WING: { shooting2: +2, shooting3: +2, passing: +2, perimeterDefense: +2, athleticism: +1 },
  POST_SCORER: { shooting2: +2, finishing: +6, strength: +4 },
  RIM_PROTECTOR: { rimDefense: +8, block: +6, strength: +3 },
  REBOUNDER_ENERGY_BIG: { strength: +4, athleticism: +2, rimDefense: +3, shooting2: +1, stamina: +2 },
  STRETCH_BIG: { shooting3: +6, freeThrow: +2, shooting2: +1, strength: -1 },
};

/**
 * Strong archetype shaping for generation.
 * Each entry is [minDelta, maxDelta] applied on top of a position baseline.
 * This creates REAL separation between roles.
 */
export const ARCHETYPE_OFFSETS: Record<Archetype, Partial<Record<RatingKey, [number, number]>>> = {
  PRIMARY_SCORER: {
    ballHandling: [6, 12],
    finishing: [6, 12],
    shooting2: [4, 10],
    shooting3: [2, 8],
    freeThrow: [0, 6],
    passing: [-8, -4],
    rimDefense: [-12, -8],
    block: [-14, -10],
    athleticism: [2, 8],
  },

  FACILITATOR: {
    passing: [10, 16],
    ballHandling: [6, 12],
    shooting3: [0, 6],
    finishing: [-10, -6],
    rimDefense: [-12, -8],
    block: [-14, -10],
    stamina: [0, 6],
  },

  SHOOTER: {
    shooting3: [10, 16],
    freeThrow: [6, 12],
    shooting2: [2, 8],
    finishing: [-12, -8],
    ballHandling: [-8, -4],
    passing: [-8, -4],
    strength: [-12, -8],
    rimDefense: [-10, -6],
    block: [-12, -8],
  },

  TWO_WAY_GUARD: {
    perimeterDefense: [8, 14],
    steal: [6, 12],
    ballHandling: [2, 8],
    shooting3: [0, 6],
    rimDefense: [-10, -6],
    block: [-12, -8],
    athleticism: [2, 8],
  },

  WING_SCORER: {
    shooting2: [6, 12],
    finishing: [6, 12],
    athleticism: [4, 10],
    shooting3: [2, 8],
    passing: [-8, -4],
    rimDefense: [-10, -6],
    block: [-8, -4],
  },

  THREE_AND_D_WING: {
    shooting3: [6, 12],
    perimeterDefense: [8, 14],
    steal: [2, 8],
    ballHandling: [-10, -6],
    passing: [-8, -4],
    finishing: [-8, -4],
  },

  ALL_AROUND_WING: {
    shooting2: [2, 6],
    shooting3: [2, 6],
    passing: [2, 6],
    perimeterDefense: [2, 6],
    athleticism: [2, 6],
    rimDefense: [0, 4],
    strength: [0, 4],
  },

  POST_SCORER: {
    finishing: [10, 16],
    strength: [8, 14],
    shooting2: [2, 8],
    shooting3: [-14, -10],
    ballHandling: [-14, -10],
    passing: [-12, -8],
    perimeterDefense: [-12, -8],
  },

  RIM_PROTECTOR: {
    rimDefense: [12, 18],
    block: [10, 16],
    strength: [6, 12],
    shooting3: [-20, -14],
    ballHandling: [-14, -10],
    passing: [-12, -8],
    perimeterDefense: [-12, -8],
    freeThrow: [-10, -6],
  },

  REBOUNDER_ENERGY_BIG: {
    strength: [10, 16],
    athleticism: [6, 12],
    stamina: [4, 10],
    rimDefense: [4, 10],
    block: [0, 6],
    shooting3: [-16, -10],
    ballHandling: [-14, -10],
    passing: [-12, -8],
  },

  STRETCH_BIG: {
    shooting3: [10, 16],
    freeThrow: [4, 10],
    shooting2: [2, 8],
    strength: [-12, -8],
    finishing: [-10, -6],
    block: [-12, -8],
    perimeterDefense: [-10, -6],
    ballHandling: [-12, -8],
  },
};

export function pickArchetypeForPosition(rng: Rng, pos: Position): Archetype {
  if (pos === "PG") return pick(rng, ["PRIMARY_SCORER", "FACILITATOR", "SHOOTER", "TWO_WAY_GUARD"] as const);
  if (pos === "SG") return pick(rng, ["PRIMARY_SCORER", "SHOOTER", "TWO_WAY_GUARD", "WING_SCORER"] as const);
  if (pos === "SF") return pick(rng, ["WING_SCORER", "THREE_AND_D_WING", "ALL_AROUND_WING", "SHOOTER"] as const);
  if (pos === "PF") return pick(rng, ["POST_SCORER", "STRETCH_BIG", "REBOUNDER_ENERGY_BIG", "RIM_PROTECTOR"] as const);
  return pick(rng, ["POST_SCORER", "RIM_PROTECTOR", "REBOUNDER_ENERGY_BIG"] as const); // C
}
