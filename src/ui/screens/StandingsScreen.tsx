import { useMemo, useState } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { TEAMS } from '../../game/defaultData'
import { CONFERENCES } from '../../game/data/conferences'

import type { TeamSeasonTotals, SeasonTotals } from '../../game/engine/stats/seasonStats'

type ViewMode = 'conference' | 'overall' | 'leaders'

export function StandingsScreen(props: {
  activeSave: Dynasty | null
  setScreen: (s: Screen) => void
  onTeamClick?: (teamId: ID) => void
}) {
  const { activeSave, setScreen, onTeamClick } = props
  const [viewMode, setViewMode] = useState<ViewMode>('conference')
  const [selectedConference, setSelectedConference] = useState<string | null>(null)

  if (!activeSave) {
    return (
      <section className="card wide">
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  // const seasonYear = activeSave.world.seasonYear
  const seasonStats = (activeSave.league as any).seasonStats
  const teamsById = activeSave.league.teamsById

  // Get all teams with their stats
  const teamsWithStats = useMemo(() => {
    const teams: Array<{
      teamId: ID
      team: typeof TEAMS[0]
      teamState: typeof teamsById[ID]
      stats: TeamSeasonTotals
      conferenceId?: string
    }> = []

    for (const team of TEAMS) {
      const teamState = teamsById[team.id]
      if (!teamState) continue

      // Merge seasonStats with teamState.season for complete picture
      const seasonStatsData = seasonStats?.teamsById?.[team.id]
      const teamSeason = teamState.season
      
      const stats: TeamSeasonTotals = {
        games: seasonStatsData?.games ?? 0,
        wins: teamSeason?.wins ?? seasonStatsData?.wins ?? 0,
        losses: teamSeason?.losses ?? seasonStatsData?.losses ?? 0,
        points: seasonStatsData?.points ?? 0,
        pointsAllowed: seasonStatsData?.pointsAllowed ?? 0,
        rebounds: seasonStatsData?.rebounds ?? 0,
        assists: seasonStatsData?.assists ?? 0,
        steals: seasonStatsData?.steals ?? 0,
        blocks: seasonStatsData?.blocks ?? 0,
        fgm: seasonStatsData?.fgm ?? 0,
        fga: seasonStatsData?.fga ?? 0,
        tpm: seasonStatsData?.tpm ?? 0,
        tpa: seasonStatsData?.tpa ?? 0,
        ftm: seasonStatsData?.ftm ?? 0,
        fta: seasonStatsData?.fta ?? 0,
        turnovers: seasonStatsData?.turnovers ?? 0,
        fouls: seasonStatsData?.fouls ?? 0,
        minutes: seasonStatsData?.minutes ?? 0,
      }

      teams.push({
        teamId: team.id,
        team,
        teamState,
        stats: stats as TeamSeasonTotals,
        conferenceId: team.conferenceId,
      })
    }

    return teams
  }, [teamsById, seasonStats])

  // Get all players with their stats
  const playersWithStats = useMemo(() => {
    const players: Array<{
      playerId: ID
      player: typeof activeSave.playersById[ID]
      stats: SeasonTotals
      teamName: string
    }> = []

    for (const [playerId, player] of Object.entries(activeSave.playersById)) {
      const stats = seasonStats?.playersById?.[playerId] ?? {
        games: 0,
        minutes: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fgm: 0,
        fga: 0,
        tpm: 0,
        tpa: 0,
        ftm: 0,
        fta: 0,
        turnovers: 0,
        fouls: 0,
      }

      // Find team name
      let teamName = 'Unknown'
      for (const [tid, teamState] of Object.entries(teamsById)) {
        if (teamState?.roster?.playerIds?.includes(playerId as ID)) {
          const team = TEAMS.find(t => t.id === tid)
          teamName = team?.name ?? tid
          break
        }
      }

      players.push({
        playerId: playerId as ID,
        player,
        stats: stats as SeasonTotals,
        teamName,
      })
    }

    return players
  }, [activeSave.playersById, seasonStats, teamsById])

  // Group teams by conference
  const teamsByConference = useMemo(() => {
    const grouped: Record<string, typeof teamsWithStats> = {}
    const independent: typeof teamsWithStats = []

    for (const teamData of teamsWithStats) {
      const confId = teamData.conferenceId || 'independent'
      if (confId === 'independent') {
        independent.push(teamData)
      } else {
        if (!grouped[confId]) grouped[confId] = []
        grouped[confId].push(teamData)
      }
    }

    // Sort each conference by conference record, then overall record
    for (const confId of Object.keys(grouped)) {
      grouped[confId].sort((a, b) => {
        const aConfWinPct = a.teamState?.season?.confWins ?? 0
        const aConfLoss = a.teamState?.season?.confLosses ?? 0
        const aConfTotal = aConfWinPct + aConfLoss
        const aConfPct = aConfTotal > 0 ? aConfWinPct / aConfTotal : 0

        const bConfWinPct = b.teamState?.season?.confWins ?? 0
        const bConfLoss = b.teamState?.season?.confLosses ?? 0
        const bConfTotal = bConfWinPct + bConfLoss
        const bConfPct = bConfTotal > 0 ? bConfWinPct / bConfTotal : 0

        if (bConfPct !== aConfPct) return bConfPct - aConfPct
        const aWinPct = a.stats.games > 0 ? a.stats.wins / a.stats.games : 0
        const bWinPct = b.stats.games > 0 ? b.stats.wins / b.stats.games : 0
        return bWinPct - aWinPct
      })
    }

    return { grouped, independent }
  }, [teamsWithStats])

  // Overall standings (sorted by win %)
  const overallStandings = useMemo(() => {
    return [...teamsWithStats].sort((a, b) => {
      const aWinPct = a.stats.games > 0 ? a.stats.wins / a.stats.games : 0
      const bWinPct = b.stats.games > 0 ? b.stats.wins / b.stats.games : 0
      if (bWinPct !== aWinPct) return bWinPct - aWinPct
      return b.stats.wins - a.stats.wins
    })
  }, [teamsWithStats])

  // Player leaderboards (with team IDs)
  const scoringLeaders = useMemo(() => {
    return [...playersWithStats]
      .filter(p => p.stats.games > 0)
      .map(p => {
        const teamId = Object.entries(teamsById).find(([, teamState]) => 
          teamState?.roster?.playerIds?.includes(p.playerId)
        )?.[0]
        return { ...p, teamId: teamId as ID | undefined }
      })
      .sort((a, b) => {
        const aPPG = a.stats.points / a.stats.games
        const bPPG = b.stats.points / b.stats.games
        return bPPG - aPPG
      })
      .slice(0, 20)
  }, [playersWithStats, teamsById])

  const reboundingLeaders = useMemo(() => {
    return [...playersWithStats]
      .filter(p => p.stats.games > 0)
      .map(p => {
        const teamId = Object.entries(teamsById).find(([, teamState]) => 
          teamState?.roster?.playerIds?.includes(p.playerId)
        )?.[0]
        return { ...p, teamId: teamId as ID | undefined }
      })
      .sort((a, b) => {
        const aRPG = a.stats.rebounds / a.stats.games
        const bRPG = b.stats.rebounds / b.stats.games
        return bRPG - aRPG
      })
      .slice(0, 20)
  }, [playersWithStats, teamsById])

  const assistLeaders = useMemo(() => {
    return [...playersWithStats]
      .filter(p => p.stats.games > 0)
      .map(p => {
        const teamId = Object.entries(teamsById).find(([, teamState]) => 
          teamState?.roster?.playerIds?.includes(p.playerId)
        )?.[0]
        return { ...p, teamId: teamId as ID | undefined }
      })
      .sort((a, b) => {
        const aAPG = a.stats.assists / a.stats.games
        const bAPG = b.stats.assists / b.stats.games
        return bAPG - aAPG
      })
      .slice(0, 20)
  }, [playersWithStats, teamsById])

  const formatStat = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals)
  }

  const getWinPercentage = (wins: number, losses: number) => {
    const total = wins + losses
    if (total === 0) return '0.000'
    return (wins / total).toFixed(3)
  }

  return (
    <section className="card wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="cardTitle" style={{ margin: 0 }}>Standings & Stats</h2>
        <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
          Back
        </button>
      </div>

      {/* View Mode Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
        <button
          className="btn secondary"
          onClick={() => setViewMode('conference')}
          style={{
            borderBottom: viewMode === 'conference' ? '3px solid var(--primary)' : '3px solid transparent',
            borderRadius: 0,
            marginBottom: -2,
          }}
        >
          Conference
        </button>
        <button
          className="btn secondary"
          onClick={() => setViewMode('overall')}
          style={{
            borderBottom: viewMode === 'overall' ? '3px solid var(--primary)' : '3px solid transparent',
            borderRadius: 0,
            marginBottom: -2,
          }}
        >
          Overall
        </button>
        <button
          className="btn secondary"
          onClick={() => setViewMode('leaders')}
          style={{
            borderBottom: viewMode === 'leaders' ? '3px solid var(--primary)' : '3px solid transparent',
            borderRadius: 0,
            marginBottom: -2,
          }}
        >
          Leaders
        </button>
      </div>

      {/* Conference Standings */}
      {viewMode === 'conference' && (
        <div>
          {selectedConference ? (
            <div>
              <button
                className="btn secondary"
                onClick={() => setSelectedConference(null)}
                style={{ marginBottom: 16 }}
              >
                ← Back to Conferences
              </button>
              {(() => {
                const conf = CONFERENCES.find(c => c.id === selectedConference)
                const teams = teamsByConference.grouped[selectedConference] ?? []
                return (
                  <div>
                    <h3 className="cardTitle" style={{ marginBottom: 16 }}>
                      {conf?.name ?? selectedConference}
                    </h3>
                    <div className="list">
                      {teams.map((teamData, idx) => {
                        const confWins = teamData.teamState?.season?.confWins ?? 0
                        const confLosses = teamData.teamState?.season?.confLosses ?? 0
                        const overallWins = teamData.stats.wins
                        const overallLosses = teamData.stats.losses
                        const ppg = teamData.stats.games > 0 ? teamData.stats.points / teamData.stats.games : 0
                        const papg = teamData.stats.games > 0 ? teamData.stats.pointsAllowed / teamData.stats.games : 0

                        return (
                          <div 
                            key={teamData.teamId} 
                            className="listRow" 
                            style={{ cursor: onTeamClick ? 'pointer' : 'default' }}
                            onClick={() => onTeamClick?.(teamData.teamId)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ 
                                  fontSize: '18px', 
                                  fontWeight: 800, 
                                  color: 'var(--muted)',
                                  minWidth: '30px',
                                  textAlign: 'right'
                                }}>
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="listRowTitle">{teamData.team.name}</div>
                                  <div className="listRowSub">
                                    Conf: {confWins}-{confLosses} • Overall: {overallWins}-{overallLosses} • 
                                    {' '}{formatStat(ppg)} PPG / {formatStat(papg)} PAPG
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div>
              <h3 className="cardTitle" style={{ marginBottom: 16 }}>Conferences</h3>
              <div className="grid3">
                {Object.entries(teamsByConference.grouped).map(([confId, teams]) => {
                  const conf = CONFERENCES.find(c => c.id === confId)
                  if (!conf || teams.length === 0) return null

                  return (
                    <button
                      key={confId}
                      className="tile"
                      onClick={() => setSelectedConference(confId)}
                    >
                      <div className="tileTitle">{conf.name}</div>
                      <div className="tileText">{teams.length} teams</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overall Standings */}
      {viewMode === 'overall' && (
        <div>
          <h3 className="cardTitle" style={{ marginBottom: 16 }}>Overall Standings</h3>
          <div className="list">
            {overallStandings.map((teamData, idx) => {
              const wins = teamData.stats.wins
              const losses = teamData.stats.losses
              const winPct = getWinPercentage(wins, losses)
              const ppg = teamData.stats.games > 0 ? teamData.stats.points / teamData.stats.games : 0
              const papg = teamData.stats.games > 0 ? teamData.stats.pointsAllowed / teamData.stats.games : 0
              const rpg = teamData.stats.games > 0 ? teamData.stats.rebounds / teamData.stats.games : 0
              const apg = teamData.stats.games > 0 ? teamData.stats.assists / teamData.stats.games : 0

              return (
                <div 
                  key={teamData.teamId} 
                  className="listRow" 
                  style={{ cursor: onTeamClick ? 'pointer' : 'default' }}
                  onClick={() => onTeamClick?.(teamData.teamId)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 800, 
                        color: 'var(--muted)',
                        minWidth: '30px',
                        textAlign: 'right'
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="listRowTitle">{teamData.team.name}</div>
                        <div className="listRowSub">
                          {wins}-{losses} ({winPct}) • {formatStat(ppg)} PPG / {formatStat(papg)} PAPG • 
                          {' '}{formatStat(rpg)} RPG • {formatStat(apg)} APG
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Player Leaders */}
      {viewMode === 'leaders' && (
        <div>
          <h3 className="cardTitle" style={{ marginBottom: 20 }}>Player Leaders</h3>
          
          <div className="grid2" style={{ marginBottom: 24 }}>
            {/* Scoring Leaders */}
            <div className="card">
              <h4 className="cardTitle" style={{ fontSize: '18px', marginBottom: 12 }}>Points Per Game</h4>
              <div className="list">
                {scoringLeaders.map((playerData, idx) => {
                  const ppg = playerData.stats.games > 0 ? playerData.stats.points / playerData.stats.games : 0
                  return (
                    <div 
                      key={playerData.playerId} 
                      className="listRow" 
                      style={{ cursor: onTeamClick && playerData.teamId ? 'pointer' : 'default' }}
                      onClick={() => playerData.teamId && onTeamClick?.(playerData.teamId)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 800, 
                            color: 'var(--muted)',
                            minWidth: '24px',
                            textAlign: 'right'
                          }}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="listRowTitle">
                              {playerData.player.identity.firstName} {playerData.player.identity.lastName}
                            </div>
                            <div className="listRowSub">
                              {playerData.teamName} • {formatStat(ppg)} PPG ({playerData.stats.points} pts / {playerData.stats.games} games)
                            </div>
                          </div>
                        </div>
                        <div className="secondaryStat" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                          {formatStat(ppg)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rebounding Leaders */}
            <div className="card">
              <h4 className="cardTitle" style={{ fontSize: '18px', marginBottom: 12 }}>Rebounds Per Game</h4>
              <div className="list">
                {reboundingLeaders.map((playerData, idx) => {
                  const rpg = playerData.stats.games > 0 ? playerData.stats.rebounds / playerData.stats.games : 0
                  return (
                    <div 
                      key={playerData.playerId} 
                      className="listRow" 
                      style={{ cursor: onTeamClick && playerData.teamId ? 'pointer' : 'default' }}
                      onClick={() => playerData.teamId && onTeamClick?.(playerData.teamId)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 800, 
                            color: 'var(--muted)',
                            minWidth: '24px',
                            textAlign: 'right'
                          }}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="listRowTitle">
                              {playerData.player.identity.firstName} {playerData.player.identity.lastName}
                            </div>
                            <div className="listRowSub">
                              {playerData.teamName} • {formatStat(rpg)} RPG ({playerData.stats.rebounds} reb / {playerData.stats.games} games)
                            </div>
                          </div>
                        </div>
                        <div className="secondaryStat" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                          {formatStat(rpg)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Assists Leaders */}
          <div className="card">
            <h4 className="cardTitle" style={{ fontSize: '18px', marginBottom: 12 }}>Assists Per Game</h4>
            <div className="list">
              {assistLeaders.map((playerData, idx) => {
                const apg = playerData.stats.games > 0 ? playerData.stats.assists / playerData.stats.games : 0
                return (
                  <div 
                    key={playerData.playerId} 
                    className="listRow" 
                    style={{ cursor: onTeamClick && playerData.teamId ? 'pointer' : 'default' }}
                    onClick={() => playerData.teamId && onTeamClick?.(playerData.teamId)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 800, 
                          color: 'var(--muted)',
                          minWidth: '24px',
                          textAlign: 'right'
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="listRowTitle">
                            {playerData.player.identity.firstName} {playerData.player.identity.lastName}
                          </div>
                          <div className="listRowSub">
                            {playerData.teamName} • {formatStat(apg)} APG ({playerData.stats.assists} ast / {playerData.stats.games} games)
                          </div>
                        </div>
                      </div>
                      <div className="secondaryStat" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                        {formatStat(apg)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Season Highlights Section - shown at end of season */}
      {activeSave.league.seasonHighlights && activeSave.league.seasonHighlights.length > 0 && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid var(--border)' }}>
          <h3 className="cardTitle" style={{ marginBottom: 16 }}>📰 Season Highlights</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {activeSave.league.seasonHighlights.map((highlight, idx) => {
              // Get team/player info if available
              const team = highlight.teamId ? TEAMS.find(t => t.id === highlight.teamId) : null

              // Color based on importance
              const borderColor = 
                highlight.importance === 'HIGH' ? '#ffd700' : 
                highlight.importance === 'MEDIUM' ? '#4caf50' : 
                'var(--border)'

              // Icon based on type
              const icon = 
                highlight.type === 'AWARD' ? '🏆' :
                highlight.type === 'TOURNAMENT' ? '🏀' :
                highlight.type === 'PRESTIGE' ? '⭐' :
                highlight.type === 'MILESTONE' ? '🎯' :
                '📢'

              return (
                <div 
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderLeft: `4px solid ${borderColor}`,
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '4px',
                    cursor: highlight.teamId && onTeamClick ? 'pointer' : 'default',
                  }}
                  onClick={() => highlight.teamId && onTeamClick && onTeamClick(highlight.teamId)}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        marginBottom: 4,
                        color: highlight.importance === 'HIGH' ? '#ffd700' : 'var(--text)'
                      }}>
                        {highlight.title}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        {highlight.description}
                      </div>
                      {team && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                          {team.city}, {team.state}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
