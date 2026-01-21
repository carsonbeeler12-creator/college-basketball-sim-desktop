// src/game/engine/stats/generateSeasonHighlights.ts

import type { Dynasty, SeasonHighlight, ID } from '../../types/dynasty'
import { TEAMS } from '../../defaultData'

/**
 * Generate season highlights for end-of-season recap.
 * Called after awards and prestige adjustments.
 */
export function generateSeasonHighlights(dynasty: Dynasty): SeasonHighlight[] {
  const highlights: SeasonHighlight[] = []
  const seasonYear = dynasty.world.seasonYear
  const playersById = dynasty.playersById
  const teamsById = dynasty.league.teamsById

  // === TOURNAMENT HIGHLIGHTS ===
  const tournament = dynasty.league.tournament
  if (tournament?.games) {
    // Find championship winner
    const championshipGame = tournament.games.find(g => g.round === 'Championship' && g.winnerId)
    if (championshipGame?.winnerId) {
      const team = TEAMS.find(t => t.id === championshipGame.winnerId)
      if (team) {
        highlights.push({
          type: 'TOURNAMENT',
          teamId: championshipGame.winnerId,
          title: `${team.name} Wins National Championship!`,
          description: `${team.name} captured the national title in a thrilling tournament run.`,
          importance: 'HIGH',
        })
      }
    }

    // Find National Semifinals teams
    const semifinalGames = tournament.games.filter(g => 
      (g.round.includes('Semi-Final') || g.round.includes('National Semifinal')) && g.winnerId
    )
    const semifinalTeamIds = new Set<ID>()
    for (const game of semifinalGames) {
      if (game.winnerId && game.winnerId !== championshipGame?.winnerId) {
        semifinalTeamIds.add(game.winnerId)
      }
      // Add loser too (made National Semifinals)
      const loserId = game.team1Id === game.winnerId ? game.team2Id : game.team1Id
      if (loserId && loserId !== championshipGame?.winnerId) {
        semifinalTeamIds.add(loserId)
      }
    }

    for (const teamId of semifinalTeamIds) {
      const team = TEAMS.find(t => t.id === teamId)
      if (team) {
        highlights.push({
          type: 'TOURNAMENT',
          teamId,
          title: `${team.name} Reaches National Semifinals`,
          description: `${team.name} made a deep tournament run to the National Semifinals.`,
          importance: 'HIGH',
        })
      }
    }

    // Future: Find Cinderella story (low seed making Quarter-Finals+)
    // Could check seed numbers if we stored them
  }

  // === AWARD HIGHLIGHTS ===
  // Player of the Year
  for (const player of Object.values(playersById)) {
    const currentSeasonAwards = player.awards?.find(a => a.seasonYear === seasonYear)
    if (!currentSeasonAwards) continue

    for (const award of currentSeasonAwards.awards) {
      if (award === 'PLAYER_OF_THE_YEAR') {
        const team = TEAMS.find(t => t.id === player.team.teamId)
        highlights.push({
          type: 'AWARD',
          teamId: player.team.teamId,
          playerId: player.playerId,
          title: `${player.identity.firstName} ${player.identity.lastName} Named Player of the Year`,
          description: `${team?.name || 'Team'}'s star earned the sport's highest individual honor.`,
          importance: 'HIGH',
        })
      } else if (award === 'ALL_AMERICAN_FIRST') {
        const team = TEAMS.find(t => t.id === player.team.teamId)
        highlights.push({
          type: 'AWARD',
          teamId: player.team.teamId,
          playerId: player.playerId,
          title: `${player.identity.firstName} ${player.identity.lastName} - All-American`,
          description: `${player.identity.classYear} from ${team?.name || 'Team'} named to All-American First Team.`,
          importance: 'MEDIUM',
        })
      } else if (award === 'FRESHMAN_OF_THE_YEAR') {
        const team = TEAMS.find(t => t.id === player.team.teamId)
        highlights.push({
          type: 'AWARD',
          teamId: player.team.teamId,
          playerId: player.playerId,
          title: `${player.identity.firstName} ${player.identity.lastName} Named Freshman of the Year`,
          description: `First-year standout from ${team?.name || 'Team'} takes top rookie honor.`,
          importance: 'MEDIUM',
        })
      }
    }
  }

  // === PRESTIGE HIGHLIGHTS ===
  for (const teamId of Object.keys(teamsById)) {
    const teamState = teamsById[teamId]
    const team = TEAMS.find(t => t.id === teamId)
    if (!team || !teamState.prestige) continue

    const prestigeChange = teamState.prestige.dynamicModifier ?? 0

    // Major prestige gains
    if (prestigeChange >= 5) {
      highlights.push({
        type: 'PRESTIGE',
        teamId,
        title: `${team.name} Prestige Surges`,
        description: `${team.name} gained ${prestigeChange.toFixed(1)} prestige this season through strong performance.`,
        importance: 'MEDIUM',
      })
    }

    // Check for milestone wins
    const wins = teamState.season.wins
    if (wins >= 30) {
      highlights.push({
        type: 'MILESTONE',
        teamId,
        title: `${team.name} Wins 30+ Games`,
        description: `${team.name} finished ${wins}-${teamState.season.losses} in a dominant season.`,
        importance: 'MEDIUM',
      })
    }
  }

  // Sort by importance (HIGH first)
  highlights.sort((a, b) => {
    const importanceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return importanceOrder[a.importance] - importanceOrder[b.importance]
  })

  // Limit to top 20 highlights
  return highlights.slice(0, 20)
}
