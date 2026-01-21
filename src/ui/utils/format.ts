import { ID, WorldPhase } from '../../game/types/dynasty'
import { TEAMS } from '../../game/defaultData'

export function fmtHeight(inches: number): string {
  const ft = Math.floor(inches / 12)
  const inch = inches % 12
  return `${ft}'${inch}"`
}

export function teamName(teamId: ID): string {
  return TEAMS.find(t => t.id === teamId)?.name ?? String(teamId)
}

/**
 * Converts a day number to a formatted date string for the college basketball season.
 * Season starts in early November and runs through March.
 * Days 1-60: Non-conference (November - early January)
 * Days 61-120: Conference play (mid-January - March)
 */
export function formatGameDay(day: number, seasonYear: number = 2026, phase?: WorldPhase): string {
  if (day <= 0) {
    return `Day ${day}`
  }

  // Season starts November 5th
  const seasonStart = new Date(seasonYear, 10, 5) // Month 10 = November (0-indexed)
  const gameDate = new Date(seasonStart)
  gameDate.setDate(gameDate.getDate() + (day - 1))

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const month = monthNames[gameDate.getMonth()]
  const date = gameDate.getDate()
  const year = gameDate.getFullYear()

  // Add context based on phase
  let phaseText = ''
  if (phase) {
    // Use provided phase if available
    switch (phase) {
      case 'PRESEASON':
        phaseText = ' • Preseason'
        break
      case 'NON_CONFERENCE':
        phaseText = ' • Non-Conference'
        break
      case 'CONFERENCE':
        phaseText = ' • Conference'
        break
      case 'CONF_TOURNAMENT':
        phaseText = ' • Conference Tournaments'
        break
      case 'TOURNAMENT_READY':
        phaseText = ' • Tournament Ready'
        break
      case 'POSTSEASON':
        phaseText = ' • Postseason'
        break
      case 'OFFSEASON':
        phaseText = ' • Offseason'
        break
      default:
        phaseText = ' • Postseason'
    }
  } else {
    // Fallback to day-based calculation
    if (day <= 60) {
      phaseText = ' • Non-Conference'
    } else if (day <= 120) {
      phaseText = ' • Conference'
    } else {
      phaseText = ' • Postseason'
    }
  }

  return `${month} ${date}, ${year}${phaseText}`
}

/**
 * Short format for game day (just the date without phase info)
 */
export function formatGameDayShort(day: number, seasonYear: number = 2026): string {
  if (day <= 0) {
    return `Day ${day}`
  }

  const seasonStart = new Date(seasonYear, 10, 5)
  const gameDate = new Date(seasonStart)
  gameDate.setDate(gameDate.getDate() + (day - 1))

  const month = gameDate.getMonth() + 1
  const date = gameDate.getDate()

  return `${month}/${date}/${seasonYear}`
}

/**
 * Get display name for a rating key
 */
export function getRatingDisplayName(key: string): string {
  const displayNames: Record<string, string> = {
    shooting2: 'Inside Scoring',
    shooting3: '3PT',
    freeThrow: 'Free Throw',
    finishing: 'Finishing',
    ballHandling: 'Ball Handling',
    passing: 'Passing',
    perimeterDefense: 'Perimeter Defense',
    rimDefense: 'Rim Defense',
    steal: 'Steal',
    block: 'Block',
    athleticism: 'Athleticism',
    strength: 'Strength',
    stamina: 'Stamina',
  }
  return displayNames[key] || key
}