import type { Team } from './types'
import rawCsv from './data/teams.csv?raw'

function parseTeamsCsv(csv: string): Team[] {
  const lines = csv
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  // Remove header
  const [, ...rows] = lines

  return rows.map((row, idx) => {
    const parts = row.split(',').map(p => p.trim())
    // Now accepts 6 or 7 fields: id, name, city, state, nickname, prestige, [conferenceId]
    if (parts.length < 6 || parts.length > 7) {
      throw new Error(`teams.csv row ${idx + 2} is invalid`)
    }

    const [id, name, city, state, nickname, prestigeStr, conferenceId] = parts
    const prestige = Number(prestigeStr)

    if (!Number.isFinite(prestige)) {
      throw new Error(`teams.csv row ${idx + 2} has invalid prestige`)
    }

    return { id, name, city, state, nickname, prestige, conferenceId: conferenceId || undefined }
  })
}

// Basic sanitization: replace any disallowed/trademark-sensitive nicknames with neutral alternatives
const DISALLOWED_NICKNAMES = new Map<string, string>([
  ['Hoosiers', 'Harvesters'],
  ['Badgers', 'Boreals'],
  ['Vols', 'Voyagers'],
  ['Crimson', 'Scarlets'],
  ['Buckeyes', 'Bucktails'],
  ['Bucks', 'Bucktails'],
  ['Hogs', 'Boars'],
  ['Tide', 'Currents'],
  ['Tar Heels', 'Tarheels'],
  ['Blue Devils', 'Blue Demons'],
  ['Hawkeyes', 'Blackbirds'],
  ['Spartans', 'Phalanx'],
  ['Wolverines', 'Grey Wolves'],
  ['Wildcats', 'Wild Cats'],
  ['Tigers', 'Highlanders'],
  ['Cougars', 'Ridge Cats'],
])

export const TEAMS: Team[] = parseTeamsCsv(rawCsv).map(t => {
  const original = t.nickname?.trim() ?? ''
  const exact = DISALLOWED_NICKNAMES.get(original)
  if (exact) return { ...t, nickname: exact }
  // Fuzzy: try case-insensitive matches and partial phrases
  const lower = original.toLowerCase()
  for (const [bad, replacement] of DISALLOWED_NICKNAMES.entries()) {
    const badLower = bad.toLowerCase()
    if (lower === badLower || lower.includes(badLower)) {
      return { ...t, nickname: replacement }
    }
  }
  return t
})
