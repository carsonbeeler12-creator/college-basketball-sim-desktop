import type { BracketGame } from '../../game/engine/tournament/generateBracket'

export const REGIONS = ['East', 'West', 'South', 'Midwest'] as const
export type Region = typeof REGIONS[number]

export const REGION_ROUNDS = [
  { key: 'round64', label: 'First Round', rounds: ['Round of 64'] },
  { key: 'round32', label: 'Second Round', rounds: ['Round of 32'] },
  { key: 'round16', label: 'Round of 16', rounds: ['Round of 16'] },
  { key: 'elite8', label: 'Quarterfinals', rounds: ['Quarter-Finals'] },
] as const

export type RegionRoundKey = typeof REGION_ROUNDS[number]['key']

export function roundKeyFromRoundName(round: string): RegionRoundKey | null {
  if (round === 'Round of 64') return 'round64'
  if (round === 'Round of 32') return 'round32'
  if (round === 'Round of 16') return 'round16'
  if (round === 'Quarter-Finals') return 'elite8'
  return null
}

export function rowStartFor(regionRoundKey: RegionRoundKey, indexWithinRound: number): number {
  switch (regionRoundKey) {
    case 'round64':
      return indexWithinRound * 2 + 1 // 1,3,5,...,15
    case 'round32':
      return indexWithinRound * 4 + 2 // 2,6,10,14
    case 'round16':
      return indexWithinRound * 8 + 4 // 4,12
    case 'elite8':
      return 8 // center
    default:
      return 1
  }
}

export function sortGamesStable(a: BracketGame, b: BracketGame): number {
  const an = a.gameNumber ?? 0
  const bn = b.gameNumber ?? 0
  if (an !== bn) return an - bn
  return a.gameId.localeCompare(b.gameId)
}

export type RegionLayout = Record<Region, Record<RegionRoundKey, BracketGame[]>>

export function buildBracketLayout(games: BracketGame[]): RegionLayout {
  const regions: RegionLayout = {
    East: { round64: [], round32: [], round16: [], elite8: [] },
    West: { round64: [], round32: [], round16: [], elite8: [] },
    South: { round64: [], round32: [], round16: [], elite8: [] },
    Midwest: { round64: [], round32: [], round16: [], elite8: [] },
  }

  for (const g of games) {
    const region = g.region
    if (region !== 'East' && region !== 'West' && region !== 'South' && region !== 'Midwest') continue

    const key = roundKeyFromRoundName(g.round)
    if (!key) continue
    regions[region][key].push(g)
  }

  for (const region of REGIONS) {
    for (const round of Object.keys(regions[region]) as RegionRoundKey[]) {
      regions[region][round].sort(sortGamesStable)
    }
  }

  return regions
}
