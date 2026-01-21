// Allocates an integer "total" across players using weighted random picks.
// This explicitly allows multi-steal / multi-block games.
// Optionally applies a soft max per player (still allows outliers).
export function allocateDiscreteEvents(
  total: number,
  weights: number[],
  options?: { softCap?: number; capPenalty?: number }
): number[] {
  const n = weights.length
  const out = new Array(n).fill(0)

  if (total <= 0 || n === 0) return out

  const softCap = options?.softCap ?? Infinity
  const capPenalty = options?.capPenalty ?? 0.55 // lower = harsher penalty after softCap

  for (let k = 0; k < total; k++) {
    // compute adjusted weights each draw
    let sum = 0
    const adj = new Array(n).fill(0)

    for (let i = 0; i < n; i++) {
      const base = Math.max(0, weights[i] ?? 0)
      if (base === 0) continue

      // after softCap, reduce chance but never make it impossible
      const penalty = out[i] >= softCap ? capPenalty : 1
      const w = base * penalty
      adj[i] = w
      sum += w
    }

    if (sum <= 0) break

    let r = Math.random() * sum
    let chosen = 0
    for (let i = 0; i < n; i++) {
      r -= adj[i]
      if (r <= 0) {
        chosen = i
        break
      }
    }

    out[chosen] += 1
  }

  return out
}

// Simple clamp utility
export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
