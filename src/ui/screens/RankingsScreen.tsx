import { useMemo } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { TEAMS } from '../../game/defaultData'

export function RankingsScreen(props: {
  activeSave: Dynasty | null
  setScreen: (s: Screen) => void
  onTeamClick?: (teamId: ID) => void
}) {
  const { activeSave, setScreen, onTeamClick } = props

  if (!activeSave) {
    return (
      <section className="card wide">
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  // Get top 25 teams by overall rating
  const top25 = useMemo(() => {
    const teamsById = activeSave.league.teamsById
    const playersById = activeSave.playersById
    
    const teams: Array<{
      teamId: ID
      team: typeof TEAMS[0]
      overall: number
      wins: number
      losses: number
      confWins: number
      confLosses: number
    }> = []

    for (const team of TEAMS) {
      const teamState = teamsById[team.id]
      if (!teamState) continue

      // Calculate team's overall as average of roster players' overall ratings
      let totalOverall = 0
      let playerCount = 0
      for (const playerId of teamState.roster.playerIds) {
        const player = playersById[playerId]
        if (player) {
          totalOverall += player.ratings.overall
          playerCount += 1
        }
      }
      const overall = playerCount > 0 ? Math.round(totalOverall / playerCount) : 50

      teams.push({
        teamId: team.id,
        team,
        overall,
        wins: teamState.season?.wins ?? 0,
        losses: teamState.season?.losses ?? 0,
        confWins: teamState.season?.confWins ?? 0,
        confLosses: teamState.season?.confLosses ?? 0,
      })
    }

    // Sort by overall rating (descending)
    teams.sort((a, b) => b.overall - a.overall)

    // Return top 25
    return teams.slice(0, 25)
  }, [activeSave])

  const getRatingColor = (rating: number): string => {
    if (rating >= 85) return '#4CAF50' // Green - Elite
    if (rating >= 75) return '#8BC34A' // Light green - Very good
    if (rating >= 65) return '#FFC107' // Amber - Good
    if (rating >= 55) return '#FF9800' // Orange - Average
    return '#F44336' // Red - Below average
  }

  return (
    <section className="card wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="cardTitle" style={{ margin: 0 }}>National Rankings</h2>
        <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
          Back
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p className="cardText muted">
          {activeSave.world.seasonYear} Regular Season • {top25.length} teams ranked
        </p>
      </div>

      <div className="list">
        {top25.map((teamData, idx) => {
          const rank = idx + 1

          return (
            <div
              key={teamData.teamId}
              className="listRow"
              style={{
                cursor: onTeamClick ? 'pointer' : 'default',
                borderLeft: `4px solid ${getRatingColor(teamData.overall)}`,
                paddingLeft: 12,
                backgroundColor: teamData.teamId === activeSave.league.userTeamId ? 'rgba(74, 157, 111, 0.15)' : 'transparent',
                borderTop: teamData.teamId === activeSave.league.userTeamId ? '2px solid #4a9d6f' : 'none',
                borderBottom: teamData.teamId === activeSave.league.userTeamId ? '2px solid #4a9d6f' : 'none',
              }}
              onClick={() => onTeamClick?.(teamData.teamId)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  {/* Rank */}
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      color: getRatingColor(teamData.overall),
                      minWidth: '40px',
                      textAlign: 'center',
                    }}
                  >
                    {rank}
                  </div>

                  {/* Team Info */}
                  <div>
                    <div className="listRowTitle">{teamData.team.name}</div>
                    <div className="listRowSub">
                      {teamData.wins}-{teamData.losses}
                    </div>
                  </div>
                </div>

                {/* Overall Rating */}
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: getRatingColor(teamData.overall),
                    }}
                  >
                    {teamData.overall}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, padding: '12px', backgroundColor: 'var(--darkBg)', borderRadius: '4px' }}>
        <p className="cardText muted" style={{ marginBottom: 8 }}>
          <strong>Rating Scale:</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: '#4CAF50',
              }}
            />
            <span className="cardText muted">85+ Elite</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: '#8BC34A',
              }}
            />
            <span className="cardText muted">75-84 Very Good</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: '#FFC107',
              }}
            />
            <span className="cardText muted">65-74 Good</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: '#FF9800',
              }}
            />
            <span className="cardText muted">55-64 Average</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: '#F44336',
              }}
            />
            <span className="cardText muted">&lt;55 Below Avg</span>
          </div>
        </div>
      </div>
    </section>
  )
}
