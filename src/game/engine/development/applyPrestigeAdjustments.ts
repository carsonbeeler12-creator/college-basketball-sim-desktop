import type { Dynasty } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'

/**
 * Calculate and apply prestige adjustments based on season performance.
 * Called at end of season (when transitioning to OFFSEASON).
 * 
 * Prestige gains:
 * - 20 wins: +0.5
 * - 25 wins: +1.0
 * - 30 wins: +1.5
 * - Quarter-Finals finish: +2.0
 * - National Semifinals finish: +3.0
 * - Championship game: +5.0
 * - Championship win: +7.0
 * - Conference tournament championship: +2.0
 * - Conference regular season championship: +1.0
 * 
 * Prestige losses:
 * - Losing season: -1.25 (was -2.0; harsh rebuild years felt punitive)
 */
export function applyPrestigeAdjustments(dynasty: Dynasty): Dynasty {
  let updated = { ...dynasty }
  const seasonYear = dynasty.world.seasonYear

  // Process each team
  for (const teamId of Object.keys(updated.league.teamsById)) {
    const teamState = updated.league.teamsById[teamId]
    const baseTeamData = TEAMS.find(t => t.id === teamId)

    if (!teamState || !baseTeamData) continue

    // Skip if already adjusted this season
    if (teamState.prestige?.lastAdjustedYear === seasonYear) continue

    let prestigeGain = 0

    // ===== REGULAR SEASON ACHIEVEMENTS =====
    const { wins, losses } = teamState.season
    const totalGames = wins + losses

    // Only count if they played games
    if (totalGames > 0) {
      const hasLosingRecord = wins < losses
      
      // Prestige gains for good records
      // 30+ wins: +1.5
      if (wins >= 30) prestigeGain += 1.5
      // 25+ wins: +1.0
      else if (wins >= 25) prestigeGain += 1.0
      // 20+ wins: +0.5
      else if (wins >= 20) prestigeGain += 0.5
      // 15+ wins (minor achievement, helps low-prestige teams): +0.25
      else if (wins >= 15) prestigeGain += 0.25
      
      if (hasLosingRecord) prestigeGain -= 1.25
    }

    // ===== TOURNAMENT ACHIEVEMENTS =====
    // Check if this team made the tournament and how far they went
    const tournament = updated.league.tournament
    if (tournament?.games) {
      const teamGames = tournament.games.filter(
        g => g.team1Id === teamId || g.team2Id === teamId
      )

      if (teamGames.length > 0) {
        // Find furthest round reached
        let maxRoundNum = 0
        let wonChampionship = false

        for (const game of teamGames) {
          // If this team won, advance in tournament
          if (game.winnerId === teamId) {
            const roundNum = getRoundNumber(game.round)
            maxRoundNum = Math.max(maxRoundNum, roundNum)

            // Check if championship
            if (game.round === 'Championship') {
              wonChampionship = true
            }
          } else if (game.winnerId && (game.team1Id === teamId || game.team2Id === teamId)) {
            // This team lost, check what round
            const roundNum = getRoundNumber(game.round)
            maxRoundNum = Math.max(maxRoundNum, roundNum - 1) // Lost in this round
            break
          }
        }

        // Apply tournament prestige bonuses
        if (wonChampionship) {
          prestigeGain += 7.0 // Championship win
        } else if (maxRoundNum === 4) {
          // Made it to Championship game (lost)
          prestigeGain += 5.0
        } else if (maxRoundNum === 3) {
          // Made it to National Semifinals
          prestigeGain += 3.0
        } else if (maxRoundNum === 2) {
          // Made it to Quarter-Finals
          prestigeGain += 2.0
        }
      }
    }

    // ===== CONFERENCE TOURNAMENT CHAMPIONSHIP =====
    // Award +2.0 prestige for winning conference tournament
    if (updated.league.conferenceTournaments) {
      // Find which conference this team belongs to
      const teamConferenceId = teamState.meta?.conferenceId as string | undefined
      
      if (teamConferenceId && updated.league.conferenceTournaments[teamConferenceId]) {
        const confTournament = updated.league.conferenceTournaments[teamConferenceId]
        
        // Check if this team won their conference tournament
        if (confTournament.champion === teamId) {
          prestigeGain += 2.0
        }
      }
    }

    // ===== APPLY PRESTIGE GAIN =====
    if (prestigeGain !== 0) {
      // Initialize prestige tracking if needed
      if (!teamState.prestige) {
        teamState.prestige = {
          dynamicModifier: 0,
          lastAdjustedYear: seasonYear,
        }
      }

      // Update the modifier (cumulative)
      const newModifier = (teamState.prestige.dynamicModifier ?? 0) + prestigeGain

      updated = {
        ...updated,
        league: {
          ...updated.league,
          teamsById: {
            ...updated.league.teamsById,
            [teamId]: {
              ...teamState,
              prestige: {
                dynamicModifier: clamp(newModifier, -50, 50), // Cap at ±50 to keep prestige reasonable
                lastAdjustedYear: seasonYear,
              },
            },
          },
        },
      }
    }
  }

  return updated
}

/**
 * Get the numeric round number for prestige calculation.
 * 1 = First Round, 2 = Second Round, 3 = Quarter-Finals, 4 = National Semifinals, 5 = Championship
 */
function getRoundNumber(round: string): number {
  if (round.includes('64')) return 1
  if (round.includes('32')) return 2
  if (round.includes('16')) return 3
  if (round.includes('Quarter-Final') || round.includes('Round of 8')) return 3
  if (round.includes('Semi-Final') || round.includes('National Semifinal')) return 4
  if (round.includes('Championship')) return 5
  return 0
}

/**
 * Clamp a number between min and max
 */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

/**
 * Get effective prestige for a team (base + dynamic modifier)
 * Used in recruiting calculations
 */
export function getEffectivePrestige(baseTeamData: { prestige: number }, teamState?: { prestige?: { dynamicModifier: number } }): number {
  const basePrestige = baseTeamData.prestige ?? 50
  const dynamicModifier = teamState?.prestige?.dynamicModifier ?? 0
  return clamp(basePrestige + dynamicModifier, 1, 100)
}
