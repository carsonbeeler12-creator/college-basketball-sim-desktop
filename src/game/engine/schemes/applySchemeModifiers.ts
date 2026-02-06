// src/game/engine/schemes/applySchemeModifiers.ts

import type { Dynasty, ID } from '../../types/dynasty';
import { TEAMS } from '../../defaultData';
import { getSchemeGameModifiers } from './schemeDefinitions';

/**
 * Get scheme modifiers for a team.
 * These are applied to game simulation parameters.
 */
export interface SchemeGameMods {
  pace: number; // Additive to possessions
  offensiveAccuracy: number; // Additive % to shooting
  defensiveAccuracy: number; // Additive % to opponent shooting (negative = better D)
  threePointVolume: number; // Additive % to 3-point attempts
}

export function getTeamSchemeModifiers(
  dynasty: Dynasty,
  teamId: ID
): SchemeGameMods {
  const team = TEAMS.find(t => t.id === teamId);
  if (!team) return { pace: 0, offensiveAccuracy: 0, defensiveAccuracy: 0, threePointVolume: 0 };

  // Check if this is the user's team
  const isUserTeam = teamId === dynasty.league.userTeamId;
  
  // User team always uses dynasty coach's scheme
  if (isUserTeam) {
    const scheme = dynasty.coach?.scheme ?? 'BALANCED';
    return getSchemeGameModifiers(scheme);
  }

  // For CPU teams, we'd need to track their coach separately
  // For now, default to BALANCED
  // TODO: Implement CPU team coach tracking
  return { pace: 0, offensiveAccuracy: 0, defensiveAccuracy: 0, threePointVolume: 0 };
}

/**
 * Apply scheme modifiers to game parameters.
 * Used to adjust pace, shooting accuracy, and 3-point volume.
 */
export function applyPaceModifier(basePace: number, paceModifier: number): number {
  // Pace is usually 60-80 possessions
  // Modifier is additive percentage
  // +6 = 6% faster pace, -5 = 5% slower pace
  const modifier = 1 + (paceModifier / 100);
  return basePace * modifier;
}

export function applyShootingModifier(basePct: number, accuracyModifier: number): number {
  // Modifier is additive percentage
  // +1.5 = +1.5 percentage points to FG%
  // -2 = -2 percentage points to FG%
  return Math.max(0.20, Math.min(0.60, basePct + (accuracyModifier / 100)));
}

export function applyThreePointVolumeModifier(baseThreeRate: number, volumeModifier: number): number {
  // Modifier is additive percentage
  // +5 = 5% more 3-point attempts
  // -4 = 4% fewer 3-point attempts
  const modifier = 1 + (volumeModifier / 100);
  return Math.max(0.20, Math.min(0.50, baseThreeRate * modifier));
}
