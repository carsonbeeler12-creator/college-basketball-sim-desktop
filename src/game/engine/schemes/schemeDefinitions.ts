// src/game/engine/schemes/schemeDefinitions.ts

import type { CoachScheme, Archetype, RatingKey } from '../../types/dynasty';

/**
 * Scheme characteristics: what offensive and defensive traits they favor.
 * Used for:
 * 1. Recruiting fit evaluation (higher values = prefer players with these attributes)
 * 2. Game sim modifiers (scheme-based bonus/penalty)
 * 3. Narrative generation (scheme context for recaps)
 */
export interface SchemeProfile {
  name: string;
  description: string;
  
  // How this scheme affects game sim (these are additive)
  gameModifiers: {
    pace: number; // Additive modifier to possessions (e.g., +5 = 5% faster pace)
    offensiveAccuracy: number; // Additive % to shooting (e.g., +2 = +2% FG%)
    defensiveAccuracy: number; // Negative = opponent shoots worse
    threePointVolume: number; // How much schemes prefer 3s (affects shot selection in sim)
  };
  
  // Ideal player archetypes for this scheme (higher = better fit)
  archetypePreferences: Partial<Record<Archetype, number>>;
  
  // Ideal player attributes for recruiting (higher = more desired)
  attributePreferences: Partial<Record<RatingKey, number>>;
}

export const SCHEME_PROFILES: Record<CoachScheme, SchemeProfile> = {
  TEMPO: {
    name: "Tempo",
    description: "Fast-paced, 3-point heavy, high-scoring basketball",
    gameModifiers: {
      pace: +6, // Significantly faster pace
      offensiveAccuracy: +1.5,
      defensiveAccuracy: -2, // Sacrifices defense for pace
      threePointVolume: +8, // Heavily emphasize 3s
    },
    archetypePreferences: {
      "PRIMARY_SCORER": 3,
      "FACILITATOR": 3,
      "SHOOTER": 4,
      "TWO_WAY_GUARD": 2,
      "WING_SCORER": 3,
      "THREE_AND_D_WING": 3,
      "ALL_AROUND_WING": 2,
      "POST_SCORER": 0,
      "RIM_PROTECTOR": -2,
      "REBOUNDER_ENERGY_BIG": -1,
      "STRETCH_BIG": 3,
    },
    attributePreferences: {
      shooting3: 6,
      ballHandling: 5,
      athleticism: 4,
      shooting2: 2,
      passing: 3,
      finishing: 2,
      perimeterDefense: -2,
    },
  },

  DEFENSIVE: {
    name: "Defensive",
    description: "Defense-first, grind-it-out, low-scoring basketball",
    gameModifiers: {
      pace: -5, // Slower pace
      offensiveAccuracy: -1,
      defensiveAccuracy: +3.5, // Strong defensive advantage
      threePointVolume: -4, // Fewer 3s, more paint
    },
    archetypePreferences: {
      "PRIMARY_SCORER": -1,
      "FACILITATOR": 1,
      "SHOOTER": -2,
      "TWO_WAY_GUARD": 4,
      "WING_SCORER": -1,
      "THREE_AND_D_WING": 4,
      "ALL_AROUND_WING": 2,
      "POST_SCORER": 2,
      "RIM_PROTECTOR": 4,
      "REBOUNDER_ENERGY_BIG": 3,
      "STRETCH_BIG": 0,
    },
    attributePreferences: {
      perimeterDefense: 6,
      rimDefense: 5,
      block: 5,
      steal: 4,
      strength: 4,
      athleticism: 3,
      shooting3: -3,
    },
  },

  POST_HEAVY: {
    name: "Post-Heavy",
    description: "Traditional paint offense, big man emphasis",
    gameModifiers: {
      pace: -3,
      offensiveAccuracy: +0.5,
      defensiveAccuracy: +1,
      threePointVolume: -6, // Heavy post focus
    },
    archetypePreferences: {
      "PRIMARY_SCORER": 0,
      "FACILITATOR": 0,
      "SHOOTER": -3,
      "TWO_WAY_GUARD": 1,
      "WING_SCORER": 1,
      "THREE_AND_D_WING": -1,
      "ALL_AROUND_WING": 0,
      "POST_SCORER": 5,
      "RIM_PROTECTOR": 3,
      "REBOUNDER_ENERGY_BIG": 3,
      "STRETCH_BIG": 2,
    },
    attributePreferences: {
      finishing: 5,
      strength: 5,
      rimDefense: 3,
      block: 3,
      shooting2: 4,
      passing: 2,
      shooting3: -3,
    },
  },

  THREE_POINT: {
    name: "3-and-D",
    description: "Perimeter offense and defense, floor spacing",
    gameModifiers: {
      pace: +2,
      offensiveAccuracy: +1,
      defensiveAccuracy: +1.5,
      threePointVolume: +5,
    },
    archetypePreferences: {
      "PRIMARY_SCORER": 1,
      "FACILITATOR": 1,
      "SHOOTER": 4,
      "TWO_WAY_GUARD": 3,
      "WING_SCORER": 2,
      "THREE_AND_D_WING": 5,
      "ALL_AROUND_WING": 2,
      "POST_SCORER": -1,
      "RIM_PROTECTOR": 1,
      "REBOUNDER_ENERGY_BIG": -1,
      "STRETCH_BIG": 3,
    },
    attributePreferences: {
      shooting3: 5,
      perimeterDefense: 5,
      steal: 3,
      athleticism: 2,
      shooting2: 2,
      passing: 1,
      rimDefense: -1,
    },
  },

  BALANCED: {
    name: "Balanced",
    description: "Flexible, adaptive system with no particular emphasis",
    gameModifiers: {
      pace: 0,
      offensiveAccuracy: 0,
      defensiveAccuracy: 0,
      threePointVolume: 0,
    },
    archetypePreferences: {
      "PRIMARY_SCORER": 0,
      "FACILITATOR": 0,
      "SHOOTER": 0,
      "TWO_WAY_GUARD": 0,
      "WING_SCORER": 0,
      "THREE_AND_D_WING": 0,
      "ALL_AROUND_WING": 0,
      "POST_SCORER": 0,
      "RIM_PROTECTOR": 0,
      "REBOUNDER_ENERGY_BIG": 0,
      "STRETCH_BIG": 0,
    },
    attributePreferences: {
      shooting3: 0,
      shooting2: 0,
      finishing: 0,
      ballHandling: 0,
      passing: 0,
      freeThrow: 0,
      perimeterDefense: 0,
      rimDefense: 0,
      steal: 0,
      block: 0,
      athleticism: 0,
      strength: 0,
      stamina: 0,
    },
  },
};

/**
 * Evaluate how well a player (by archetype) fits a scheme.
 * Returns a score (-10 to +10) that modifies recruiting interest.
 */
export function evaluateArchetypeFit(archetype: Archetype, scheme: CoachScheme): number {
  const schemeProfile = SCHEME_PROFILES[scheme];
  if (!schemeProfile) return 0;
  
  const preference = schemeProfile.archetypePreferences[archetype];
  return preference ?? 0;
}

/**
 * Get the scheme's narrative name for recaps.
 */
export function getSchemeName(scheme: CoachScheme): string {
  return SCHEME_PROFILES[scheme].name;
}

/**
 * Get game modifiers for a scheme.
 */
export function getSchemeGameModifiers(scheme: CoachScheme) {
  return SCHEME_PROFILES[scheme].gameModifiers;
}
