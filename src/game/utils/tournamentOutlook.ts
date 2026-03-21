/**
 * Single source of truth for "Tournament outlook" UI labels.
 * Record-first (NCAA-like); rating is secondary when sample is small.
 */
export function getTournamentOutlookLabel(
  wins: number,
  losses: number,
  rating: number | undefined
): string | null {
  const g = wins + losses
  if (g === 0 && rating == null) return null

  const pct = g > 0 ? wins / g : 0

  // --- Record-first (full season ~28–34 games) ---
  if (g >= 24) {
    if (pct >= 0.97 || wins >= 30) return 'Tournament lock'
    if (pct >= 0.91 || (wins >= 26 && losses <= 3)) return 'Strong position'
    if (pct >= 0.82 || (wins >= 22 && losses <= 6)) return 'Likely in'
    if (pct >= 0.71) return 'On the bubble'
    if (pct >= 0.59) return 'Outside looking in'
    return 'Longshot'
  }

  if (g >= 16) {
    if (pct >= 0.94) return 'Tournament lock'
    if (pct >= 0.88) return 'Strong position'
    if (pct >= 0.79) return 'Likely in'
    if (pct >= 0.68) return 'On the bubble'
    if (pct >= 0.56) return 'Outside looking in'
    return 'Longshot'
  }

  if (g >= 8) {
    if (pct >= 0.95) return 'Strong start'
    if (pct >= 0.85) return 'Good start'
    if (pct >= 0.70) return 'Mixed'
    return 'Early struggles'
  }

  // Very early season: rating + tiny sample
  if (rating != null) {
    if (rating >= 75) return 'Early: trending well'
    if (rating >= 62) return 'Early: building resume'
    if (rating >= 52) return 'Early: need wins'
    return 'Early: long road ahead'
  }

  return 'Season starting'
}

/** CSS suffix for `standingsOutlook-*` / coloring (labels can be multi-word). */
export function getTournamentOutlookStyleTier(
  label: string
): 'lock' | 'strong' | 'bubble' | 'longshot' {
  const x = label.toLowerCase()
  if (x.includes('lock')) return 'lock'
  if (x.includes('longshot') || x.includes('outside looking')) return 'longshot'
  if (
    x.includes('bubble') ||
    x.includes('mixed') ||
    x.includes('struggles') ||
    x.includes('too early') ||
    x.includes('season starting') ||
    x.includes('long road') ||
    x.includes('need wins')
  ) {
    return 'bubble'
  }
  if (
    x.includes('likely') ||
    x.includes('strong') ||
    x.includes('good start') ||
    x.includes('trending')
  ) {
    return 'strong'
  }
  return 'bubble'
}
