// src/game/engine/ratings/overall.ts
import type { Position, RatingKey } from "../../types/dynasty";

/**
 * Position-weighted overall.
 * - Ratings are the source of truth.
 * - Overall is derived only.
 */
export function computeOverall(r: Record<RatingKey, number>, pos: Position): number {
  const W = weightsForPosition(pos);

  let sum = 0;
  let wsum = 0;
  for (const [k, w] of Object.entries(W) as Array<[RatingKey, number]>) {
    const v = safe(r[k], 50);
    sum += v * w;
    wsum += w;
  }

  const base = wsum > 0 ? sum / wsum : 50;

  // Small compression so extremes are rarer without killing separation.
  const compressed = 50 + (base - 50) * 0.92;

  return Math.round(clamp(compressed, 1, 99));
}

function weightsForPosition(pos: Position): Record<RatingKey, number> {
  if (pos === "PG") {
    return {
      shooting2: 1.0,
      shooting3: 1.0,
      freeThrow: 0.35,
      finishing: 0.75,
      ballHandling: 1.25,
      passing: 1.25,

      perimeterDefense: 0.95,
      rimDefense: 0.25,
      steal: 0.70,
      block: 0.15,

      athleticism: 0.80,
      strength: 0.35,
      stamina: 0.35,
    };
  }

  if (pos === "SG") {
    return {
      shooting2: 1.05,
      shooting3: 1.20,
      freeThrow: 0.35,
      finishing: 0.80,
      ballHandling: 1.05,
      passing: 0.85,

      perimeterDefense: 0.95,
      rimDefense: 0.30,
      steal: 0.70,
      block: 0.20,

      athleticism: 0.85,
      strength: 0.45,
      stamina: 0.35,
    };
  }

  if (pos === "SF") {
    return {
      shooting2: 1.10,
      shooting3: 1.05,
      freeThrow: 0.30,
      finishing: 0.95,
      ballHandling: 0.75,
      passing: 0.70,

      perimeterDefense: 0.90,
      rimDefense: 0.55,
      steal: 0.55,
      block: 0.45,

      athleticism: 0.80,
      strength: 0.70,
      stamina: 0.35,
    };
  }

  if (pos === "PF") {
    return {
      shooting2: 0.95,
      shooting3: 0.70,
      freeThrow: 0.25,
      finishing: 1.10,
      ballHandling: 0.40,
      passing: 0.45,

      perimeterDefense: 0.65,
      rimDefense: 1.05,
      steal: 0.35,
      block: 0.85,

      athleticism: 0.65,
      strength: 1.05,
      stamina: 0.35,
    };
  }

  // C
  return {
    shooting2: 0.70,
    shooting3: 0.25,
    freeThrow: 0.20,
    finishing: 1.25,
    ballHandling: 0.20,
    passing: 0.30,

    perimeterDefense: 0.35,
    rimDefense: 1.35,
    steal: 0.25,
    block: 1.15,

    athleticism: 0.65,
    strength: 1.25,
    stamina: 0.35,
  };
}

function safe(n: unknown, fb: number): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : fb;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
