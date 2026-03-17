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

  // === INDIVIDUAL PERFORMANCE HIGHLIGHTS ===
  // Find best single-game performance for each team
  const bestPerformancesByTeam = new Map<ID, {
    playerId: ID;
    gameId: ID;
    points: number;
    rebounds: number;
    assists: number;
    score: number;
  }>();

  // Scan all games for best performances
  const allGames = Object.values(dynasty.league.gamesById).filter(g => g.status === 'FINAL' && g.result?.boxScore);
  
  for (const game of allGames) {
    const boxScore = game.result!.boxScore!;
    const allPlayerLines = [...boxScore.playerLinesByTeam.home, ...boxScore.playerLinesByTeam.away];
    
    for (const line of allPlayerLines) {
      const player = playersById[line.playerId];
      if (!player || line.minutes < 15) continue; // Only rotation players
      
      const teamId = player.team.teamId;
      
      // Calculate performance score (weighted combination)
      // Prioritize points but reward well-rounded games
      const performanceScore = 
        line.points * 1.0 + 
        line.assists * 1.5 + 
        line.rebounds * 1.2 + 
        line.steals * 2.0 + 
        line.blocks * 2.0 -
        line.turnovers * 1.0;
      
      const current = bestPerformancesByTeam.get(teamId);
      if (!current || performanceScore > current.score) {
        bestPerformancesByTeam.set(teamId, {
          playerId: line.playerId,
          gameId: game.gameId,
          points: line.points,
          rebounds: line.rebounds,
          assists: line.assists,
          score: performanceScore,
        });
      }
    }
  }

  // Create highlights for exceptional performances
  for (const [teamId, perf] of bestPerformancesByTeam.entries()) {
    const player = playersById[perf.playerId];
    const team = TEAMS.find(t => t.id === teamId);
    if (!player || !team) continue;

    // Only highlight truly exceptional games (35+ points OR 15+ assists OR 18+ rebounds OR triple-double)
    const isTripleDouble = 
      [perf.points >= 10 ? 1 : 0, perf.rebounds >= 10 ? 1 : 0, perf.assists >= 10 ? 1 : 0].filter(x => x).length >= 3;
    
    const isExceptional = perf.points >= 35 || perf.assists >= 15 || perf.rebounds >= 18 || isTripleDouble;
    
    if (isExceptional) {
      const statLine = `${perf.points} PTS, ${perf.rebounds} REB, ${perf.assists} AST`;
      let description = '';
      
      if (isTripleDouble) {
        description = `Epic triple-double performance in ${team.name}'s best individual game of the season.`;
      } else if (perf.points >= 40) {
        description = `Explosive ${perf.points}-point eruption in a legendary individual performance.`;
      } else if (perf.points >= 35) {
        description = `Dominant scoring display in ${team.name}'s highest-scoring individual game.`;
      } else if (perf.assists >= 15) {
        description = `Record-setting ${perf.assists}-assist masterclass running the offense.`;
      } else if (perf.rebounds >= 18) {
        description = `Dominated the glass with ${perf.rebounds} rebounds in a monster performance.`;
      }
      
      highlights.push({
        type: 'PERFORMANCE',
        teamId,
        playerId: perf.playerId,
        gameId: perf.gameId,
        statLine,
        title: `${player.identity.firstName} ${player.identity.lastName}: ${statLine}`,
        description,
        importance: perf.points >= 40 || isTripleDouble ? 'HIGH' : 'MEDIUM',
      });
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
