// src/game/engine/minutes/allocateTeamMinutes.ts
import type { Dynasty, ID, Position, PlayerState } from "../../types/dynasty";

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

const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];
const posOrder: Record<Position, number> = { PG: 0, SG: 1, SF: 2, PF: 3, C: 4 };

function defaultDepthChart(teamPlayers: PlayerState[]): Record<Position, ID[]> {
  const byPos: Record<Position, PlayerState[]> = { PG: [], SG: [], SF: [], PF: [], C: [] };
  for (const p of teamPlayers) byPos[p.identity.position].push(p);

  for (const pos of POSITIONS) {
    byPos[pos].sort((a, b) => (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0));
  }

  const overallSorted = [...teamPlayers].sort((a, b) => (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0));

  const chart: Record<Position, ID[]> = { PG: [], SG: [], SF: [], PF: [], C: [] };
  for (const pos of POSITIONS) {
    const ids = byPos[pos].map((p) => p.playerId);
    chart[pos] = ids.length > 0 ? ids : overallSorted.map((p) => p.playerId);
  }
  return chart;
}

function coveragePenalty(primary: Position, target: Position): number {
  if (primary === target) return 1.0;

  if (primary === "SG" && target === "PG") return 0.85;
  if (primary === "SF" && target === "SG") return 0.85;
  if (primary === "PF" && target === "SF") return 0.85;
  if (primary === "C" && target === "PF") return 0.85;

  if (primary === "SF" && target === "PG") return 0.70;
  if (primary === "PF" && target === "SG") return 0.70;
  if (primary === "C" && target === "SF") return 0.70;

  return 0;
}

/**
 * BIG CHANGE: make starter weights much more top-heavy.
 * With this, rank0 will usually land ~32–36 mins for its primary position demand.
 * ALSO: Reduced bench player minutes for realism
 */
function roleMultiplier(rank: number): number {
  if (rank === 0) return 3.2;  // starter
  if (rank === 1) return 0.85; // main backup (reduced from 1.25)
  if (rank === 2) return 0.35; // secondary (reduced from 0.55)
  if (rank === 3) return 0.15; // deep bench (reduced from 0.25)
  return 0.07;                 // emergency (reduced from 0.12)
}

/**
 * Uses benchFactor to slightly increase bench usage, but never overwhelms the starter.
 */
function philosophyFactor(benchFactor: number, rank: number): number {
  if (rank === 0) return 1.0;
  if (rank === 1) return 0.95 + benchFactor * 0.10; // ~0.95..1.00
  const deep = 0.75 + benchFactor * 0.35;           // ~0.75..0.925
  const depthDecay = 1 / (1 + (rank - 1) * 0.55);   // stronger decay than before
  return deep * depthDecay;
}

/**
 * NEW: apply rotationSizeTarget to clamp deep bench minutes.
 * Example: target 8.0 means ranks >= 8 get sharply reduced weight.
 */
function rotationSizeFactor(rotationSizeTarget: number, rank: number): number {
  const target = clamp(rotationSizeTarget, 6.5, 10.5); // sane bounds
  // ranks are 0-based; convert to 1-based "slot"
  const slot = rank + 1;

  // starters + main bench remain mostly unaffected
  if (slot <= Math.floor(target)) return 1.0;

  // beyond target: sharply reduce
  const over = slot - target; // e.g. 1.2 slots over target
  return 1 / (1 + over * 2.0); // strong falloff
}

function buildEligiblePlayers(dynasty: Dynasty, teamId: ID): PlayerState[] {
  const team = dynasty.league.teamsById?.[teamId];
  if (!team) return [];
  const ids = team.roster?.playerIds ?? [];
  const out: PlayerState[] = [];
  for (const pid of ids) {
    const p = dynasty.playersById?.[pid];
    if (!p) continue;
    out.push(p);
  }

  out.sort((a, b) => {
    const pa = posOrder[a.identity.position];
    const pb = posOrder[b.identity.position];
    if (pa !== pb) return pa - pb;
    return (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0);
  });

  return out;
}

function roundToTotal(rng: Rng, raw: { pid: ID; raw: number }[], total: number): Record<ID, number> {
  const out: Record<ID, number> = {};
  const floors = raw.map((x) => {
    const safe = Number.isFinite(x.raw) ? x.raw : 0;
    const f = Math.floor(safe);
    return { pid: x.pid, f, frac: safe - f };
  });

  let sum = 0;
  for (const x of floors) {
    out[x.pid] = x.f;
    sum += x.f;
  }

  floors.sort((a, b) => b.frac - a.frac);

  let need = total - sum;
  for (const x of floors) {
    if (need <= 0) break;
    out[x.pid] += 1;
    need -= 1;
  }

  while (need > 0 && floors.length > 0) {
    const pid = floors[randInt(rng, 0, floors.length - 1)].pid;
    out[pid] += 1;
    need -= 1;
  }
  while (need < 0 && floors.length > 0) {
    const pid = floors[randInt(rng, 0, floors.length - 1)].pid;
    if (out[pid] > 0) {
      out[pid] -= 1;
      need += 1;
    }
  }

  return out;
}

export function allocateTeamMinutes(args: {
  dynasty: Dynasty;
  teamId: ID;
  seedKey: string;
  overtimes?: number;
}): Record<ID, number> {
  const { dynasty, teamId, seedKey } = args;
  const ot = args.overtimes ?? 0;

  const totalTeamMinutes = 200 + ot * 25;

  const team = dynasty.league.teamsById?.[teamId];
  if (!team) return {};

  const players = buildEligiblePlayers(dynasty, teamId);
  if (players.length === 0) return {};

  const rotation = team.rotation;
  const defaultSettings = {
    style: "NORMAL" as const,
    rotationSizeTarget: 8.5,
    benchFactor: 0.5,
    blowoutBenchFactor: 0.7,
  };
  
  // Apply rotation style to settings
  const style = rotation.settings?.style ?? "NORMAL";
  let rotationSizeTarget = rotation.settings?.rotationSizeTarget ?? 8.5;
  let benchFactor = rotation.settings?.benchFactor ?? 0.5;
  
  // TIGHT = fewer players, less bench usage
  // NORMAL = balanced
  // DEEP = more players, more bench usage
  if (style === "TIGHT") {
    rotationSizeTarget = 7.0;
    benchFactor = 0.3;
  } else if (style === "DEEP") {
    rotationSizeTarget = 10.0;
    benchFactor = 0.7;
  } else {
    // NORMAL
    rotationSizeTarget = 8.5;
    benchFactor = 0.5;
  }
  
  const settings = {
    ...defaultSettings,
    ...rotation.settings,
    style,
    rotationSizeTarget,
    benchFactor,
  };

  const depthChart = rotation.depthChart ?? defaultDepthChart(players);
  const targets = rotation.minutesTargetByPlayerId ?? {};

  const rng: Rng = { state: hashSeed(dynasty.rng.seed, `${seedKey}_${teamId}`) };

  const locked: Record<ID, number> = {};
  const isLocked: Record<ID, boolean> = {};
  for (const p of players) {
    const raw = targets[p.playerId] ?? 0;
    const v = clamp(Math.round(raw), 0, 40);
    if (v > 0) {
      locked[p.playerId] = v;
      isLocked[p.playerId] = true;
    } else {
      locked[p.playerId] = 0;
      isLocked[p.playerId] = false;
    }
  }

  let lockedSum = Object.values(locked).reduce((a, b) => a + b, 0);
  if (lockedSum > totalTeamMinutes) {
    const scale = totalTeamMinutes / lockedSum;
    const scaledRaw = players
      .filter((p) => isLocked[p.playerId])
      .map((p) => ({ pid: p.playerId, raw: locked[p.playerId] * scale }));
    const scaled = roundToTotal(rng, scaledRaw, totalTeamMinutes);
    for (const pid of Object.keys(scaled)) locked[pid] = clamp(scaled[pid] ?? 0, 0, 40);
    lockedSum = totalTeamMinutes;
  }

  const remaining = totalTeamMinutes - lockedSum;

  const minutesByPlayer: Record<ID, number> = {};
  for (const p of players) minutesByPlayer[p.playerId] = locked[p.playerId] ?? 0;

  if (remaining <= 0) return minutesByPlayer;

  const addByPlayer: Record<ID, number> = {};
  for (const p of players) addByPlayer[p.playerId] = 0;

  // IMPORTANT: This is where the “40” comes from:
  // it’s positional demand, not a player being set to 40.
  const perPosDemand = 40 + ot * 5;

  for (const pos of POSITIONS) {
    let posLocked = 0;
    for (const p of players) {
      if (p.identity.position === pos) posLocked += locked[p.playerId] ?? 0;
    }
    const posNeed = clamp(perPosDemand - posLocked, 0, perPosDemand);
    if (posNeed <= 0) continue;

    const rankedList = depthChart[pos] ?? [];
    const rankById: Record<ID, number> = {};
    rankedList.forEach((pid, idx) => (rankById[pid] = idx));

    const candidates = players
      .map((p) => {
        const pid = p.playerId;
        if (isLocked[pid]) return null; // AUTO only

        const rank = rankById[pid] ?? 99;
        const cov = coveragePenalty(p.identity.position, pos);
        if (cov <= 0) return null;

        const ovr = p.ratings.overall ?? 50;

        const role = roleMultiplier(rank);
        const philos = philosophyFactor(settings.benchFactor ?? 0.5, rank);
        const rotSize = rotationSizeFactor(settings.rotationSizeTarget ?? 8.5, rank);

        // tiny deterministic jitter so allocations don’t always round identically
        const jitter = 0.97 + rand01(rng) * 0.06; // 0.97..1.03

        const weight = Math.max(0.001, ovr * role * cov * philos * rotSize * jitter);
        return { pid, weight };
      })
      .filter(Boolean) as { pid: ID; weight: number }[];

    if (candidates.length === 0) continue;

    const wsum = candidates.reduce((a, c) => a + c.weight, 0) || 1;
    const raw = candidates.map((c) => ({ pid: c.pid, raw: (c.weight / wsum) * posNeed }));
    const alloc = roundToTotal(rng, raw, posNeed);

    for (const [pid, m] of Object.entries(alloc)) {
      addByPlayer[pid] = (addByPlayer[pid] ?? 0) + (m ?? 0);
    }
  }

  for (const p of players) {
    const pid = p.playerId;
    if (!isLocked[pid]) {
      minutesByPlayer[pid] = clamp((minutesByPlayer[pid] ?? 0) + (addByPlayer[pid] ?? 0), 0, 40);
    }
  }

  // Final reconciliation to exact totalTeamMinutes WITHOUT changing locked players.
  const totalNow = () => Object.values(minutesByPlayer).reduce((a, b) => a + b, 0);
  let sum = totalNow();
  let need = totalTeamMinutes - sum;

  const autos = players
    .filter((p) => !isLocked[p.playerId])
    .sort((a, b) => (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0))
    .map((p) => p.playerId);

  if (need > 0) {
    let guard = 0;
    while (need > 0 && guard < 200_000 && autos.length > 0) {
      for (const pid of autos) {
        if (need <= 0) break;
        if ((minutesByPlayer[pid] ?? 0) < 40) {
          minutesByPlayer[pid] += 1;
          need -= 1;
        }
      }
      guard++;
    }
  } else if (need < 0) {
    const autosAsc = [...autos].reverse();
    let guard = 0;
    while (need < 0 && guard < 200_000 && autosAsc.length > 0) {
      for (const pid of autosAsc) {
        if (need >= 0) break;
        if ((minutesByPlayer[pid] ?? 0) > 0) {
          minutesByPlayer[pid] -= 1;
          need += 1;
        }
      }
      guard++;
    }
  }

  return minutesByPlayer;
}
