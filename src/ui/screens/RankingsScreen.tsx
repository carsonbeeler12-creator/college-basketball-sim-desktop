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

  // Get top 25 teams by dynamic team rating (season performance-based)
  const top25 = useMemo(() => {
    const teamsById = activeSave.league.teamsById
    
    const teams: Array<{
      teamId: ID
      team: typeof TEAMS[0]
      // 0-100 season performance rating (see calculateTeamRating/updateAllTeamRatings)
      rating: number
      wins: number
      losses: number
      confWins: number
      confLosses: number
    }> = []

    for (const team of TEAMS) {
      const teamState = teamsById[team.id]
      if (!teamState) continue

      // Prefer dynamic season rating if present; fall back to neutral 50
      const rating = teamState.season?.teamRating ?? 50

      teams.push({
        teamId: team.id,
        team,
        rating,
        wins: teamState.season?.wins ?? 0,
        losses: teamState.season?.losses ?? 0,
        confWins: teamState.season?.confWins ?? 0,
        confLosses: teamState.season?.confLosses ?? 0,
      })
    }

    // Sort by dynamic rating (descending), then win %
    teams.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating
      const aGames = a.wins + a.losses
      const bGames = b.wins + b.losses
      const aWinPct = aGames > 0 ? a.wins / aGames : 0
      const bWinPct = bGames > 0 ? b.wins / bGames : 0
      if (bWinPct !== aWinPct) return bWinPct - aWinPct
      return b.wins - a.wins
    })

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
    <div className="content">
      <section className="card wide rankingsContainer">
        <div className="rankingsHeader">
          <h2 className="cardTitle">National Rankings</h2>
          <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
            Back
          </button>
        </div>

        <p className="cardText muted" style={{ marginBottom: 20 }}>
          {activeSave.world.seasonYear} Regular Season • {top25.length} teams ranked
        </p>

        <div className="rankingsList">
          {top25.map((teamData, idx) => {
            const rank = idx + 1
            const isUserTeam = teamData.teamId === activeSave.league.userTeamId

            return (
              <div
                key={teamData.teamId}
                className={`rankingsTeamRow ${isUserTeam ? 'isUser' : ''}`}
                onClick={() => onTeamClick?.(teamData.teamId)}
                style={{ borderLeftColor: getRatingColor(teamData.rating) }}
              >
                <div className="rankingsRank" style={{ color: getRatingColor(teamData.rating) }}>
                  {rank}
                </div>
                <div className="rankingsTeamInfo">
                  <div className="rankingsTeamName">{teamData.team.name}</div>
                  <div className="rankingsTeamRecord">{teamData.wins}-{teamData.losses}</div>
                </div>
                <div className="rankingsOverall">
                  <div className="rankingsRating" style={{ color: getRatingColor(teamData.rating) }}>
                    {teamData.rating}
                  </div>
                  <div className="rankingsRatingLabel">Team Rating</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="rankingsLegend">
          <div className="rankingsLegendTitle">Rating Scale</div>
          <div className="rankingsLegendGrid">
            <div className="rankingsLegendItem">
              <div className="rankingsLegendColor" style={{ backgroundColor: '#4CAF50' }} />
              <span>85+ Elite</span>
            </div>
            <div className="rankingsLegendItem">
              <div className="rankingsLegendColor" style={{ backgroundColor: '#8BC34A' }} />
              <span>75-84 Very Good</span>
            </div>
            <div className="rankingsLegendItem">
              <div className="rankingsLegendColor" style={{ backgroundColor: '#FFC107' }} />
              <span>65-74 Good</span>
            </div>
            <div className="rankingsLegendItem">
              <div className="rankingsLegendColor" style={{ backgroundColor: '#FF9800' }} />
              <span>55-64 Average</span>
            </div>
            <div className="rankingsLegendItem">
              <div className="rankingsLegendColor" style={{ backgroundColor: '#F44336' }} />
              <span>&lt;55 Below Avg</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
