import { useMemo, useState } from 'react'
import type { Dynasty, ID, PlayerState } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { TEAMS } from '../../game/defaultData'
import { CONFERENCES } from '../../game/data/conferences'
import { fmtHeight, getRatingDisplayName } from '../utils/format'
import type { TeamSeasonTotals, SeasonTotals } from '../../game/engine/stats/seasonStats'

export function TeamDetailScreen(props: {
  activeSave: Dynasty | null
  teamId: ID
  setScreen: (s: Screen) => void
}) {
  const { activeSave, teamId, setScreen } = props
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)

  if (!activeSave) {
    return (
      <section className="card wide">
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  const team = TEAMS.find(t => t.id === teamId)
  const teamState = activeSave.league.teamsById?.[teamId]
  const seasonStats = (activeSave.league as any).seasonStats
  const teamStats = seasonStats?.teamsById?.[teamId] as TeamSeasonTotals | undefined

  if (!team || !teamState) {
    return (
      <section className="card wide">
        <p className="cardText muted">Team not found.</p>
        <button className="btn secondary" onClick={() => setScreen('standings')}>
          Back to Standings
        </button>
      </section>
    )
  }

  // Get roster players
  const rosterPlayers = useMemo(() => {
    const pids = teamState.roster?.playerIds ?? []
    const players = pids
      .map(pid => activeSave.playersById[pid])
      .filter(Boolean) as PlayerState[]
    
    // Sort by overall rating (descending)
    return players.sort((a, b) => b.ratings.overall - a.ratings.overall)
  }, [teamState, activeSave.playersById])

  // Get conference info
  const conference = team.conferenceId 
    ? CONFERENCES.find(c => c.id === team.conferenceId)
    : null

  // Calculate team stats
  const wins = teamState.season?.wins ?? teamStats?.wins ?? 0
  const losses = teamState.season?.losses ?? teamStats?.losses ?? 0
  const confWins = teamState.season?.confWins ?? 0
  const confLosses = teamState.season?.confLosses ?? 0
  const games = teamStats?.games ?? 0
  const ppg = games > 0 ? (teamStats?.points ?? 0) / games : 0
  const papg = games > 0 ? (teamStats?.pointsAllowed ?? 0) / games : 0
  const rpg = games > 0 ? (teamStats?.rebounds ?? 0) / games : 0
  const apg = games > 0 ? (teamStats?.assists ?? 0) / games : 0

  const formatStat = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals)
  }

  const getRatingColorClass = (value: number) => {
    if (value >= 80) return 'excellent'
    if (value >= 70) return 'good'
    if (value >= 60) return 'average'
    if (value >= 50) return 'poor'
    return 'weak'
  }

  return (
    <section className="card wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="cardTitle" style={{ margin: 0 }}>Team Details</h2>
        <button className="btn secondary" onClick={() => setScreen('standings')}>
          Back
        </button>
      </div>

      {/* Team Header */}
      <div className="hubHeader" style={{ marginBottom: 24 }}>
        <div>
          <div className="hubTeam">{team.name}</div>
          <div className="hubMeta">
            {conference && `${conference.name} • `}
            Prestige: {team.prestige} • Season {activeSave.world.seasonYear}
          </div>
          {games > 0 && (
            <>
              <div className="hubMeta" style={{ marginTop: 4, fontWeight: 600 }}>
                Record: {wins}-{losses}
                {confWins + confLosses > 0 && ` • Conf: ${confWins}-${confLosses}`}
              </div>
              <div className="hubMeta" style={{ marginTop: 4, fontSize: '14px' }}>
                {formatStat(ppg)} PPG / {formatStat(papg)} PAPG • {formatStat(rpg)} RPG • {formatStat(apg)} APG
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Stats Summary */}
      {games > 0 && teamStats && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="cardTitle" style={{ fontSize: '18px', marginBottom: 12 }}>Team Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <div>
              <div className="statLabel">Points Per Game</div>
              <div className="primaryStat">{formatStat(ppg)}</div>
            </div>
            <div>
              <div className="statLabel">Points Allowed</div>
              <div className="primaryStat">{formatStat(papg)}</div>
            </div>
            <div>
              <div className="statLabel">Rebounds Per Game</div>
              <div className="primaryStat">{formatStat(rpg)}</div>
            </div>
            <div>
              <div className="statLabel">Assists Per Game</div>
              <div className="primaryStat">{formatStat(apg)}</div>
            </div>
            {teamStats.fgm > 0 && (
              <>
                <div>
                  <div className="statLabel">FG%</div>
                  <div className="secondaryStat">
                    {formatStat((teamStats.fgm / teamStats.fga) * 100)}%
                  </div>
                </div>
                <div>
                  <div className="statLabel">3PT%</div>
                  <div className="secondaryStat">
                    {teamStats.tpa > 0 ? formatStat((teamStats.tpm / teamStats.tpa) * 100) : '0.0'}%
                  </div>
                </div>
                <div>
                  <div className="statLabel">FT%</div>
                  <div className="secondaryStat">
                    {teamStats.fta > 0 ? formatStat((teamStats.ftm / teamStats.fta) * 100) : '0.0'}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Roster */}
      <div>
        <h3 className="cardTitle" style={{ fontSize: '18px', marginBottom: 12 }}>
          Roster ({rosterPlayers.length} players)
        </h3>
        {rosterPlayers.length === 0 ? (
          <p className="cardText muted">No players on roster.</p>
        ) : (
          <div className="list">
            {rosterPlayers.map(p => {
              const playerStats = seasonStats?.playersById?.[p.playerId] as SeasonTotals | undefined
              const playerGames = playerStats?.games ?? 0
              const ppg = playerGames > 0 ? (playerStats?.points ?? 0) / playerGames : 0
              const rpg = playerGames > 0 ? (playerStats?.rebounds ?? 0) / playerGames : 0
              const apg = playerGames > 0 ? (playerStats?.assists ?? 0) / playerGames : 0

              return (
                <div
                  key={p.playerId}
                  className="listRow"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setExpandedPlayerId(expandedPlayerId === p.playerId ? null : p.playerId)
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <div className="listRowTitle" style={{ fontSize: '16px', marginBottom: 4 }}>
                        {p.identity.firstName} {p.identity.lastName}
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="secondaryStat" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                          {p.ratings.overall} OVR
                        </span>
                        <span className="tertiaryStat">{p.identity.position}</span>
                        <span className="tertiaryStat">{p.identity.classYear}</span>
                        <span className="tertiaryStat">{fmtHeight(p.identity.heightIn)} • {p.identity.weightLb} lb</span>
                        {playerGames > 0 && (
                          <>
                            <span className="tertiaryStat" style={{ color: 'var(--primary)' }}>
                              {formatStat(ppg)} PPG
                            </span>
                            <span className="tertiaryStat" style={{ color: 'var(--primary)' }}>
                              {formatStat(rpg)} RPG
                            </span>
                            <span className="tertiaryStat" style={{ color: 'var(--primary)' }}>
                              {formatStat(apg)} APG
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {expandedPlayerId === p.playerId && (
                    <div className="statReveal" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      {/* Season Stats */}
                      {playerGames > 0 && playerStats && (
                        <div className="statGroup" style={{ marginBottom: 16 }}>
                          <div className="statGroupTitle">Season Stats ({playerGames} games)</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                            <div>
                              <div className="statLabel">Points</div>
                              <div className="secondaryStat">{playerStats.points} ({formatStat(ppg)} PPG)</div>
                            </div>
                            <div>
                              <div className="statLabel">Rebounds</div>
                              <div className="secondaryStat">{playerStats.rebounds} ({formatStat(rpg)} RPG)</div>
                            </div>
                            <div>
                              <div className="statLabel">Assists</div>
                              <div className="secondaryStat">{playerStats.assists} ({formatStat(apg)} APG)</div>
                            </div>
                            <div>
                              <div className="statLabel">Steals</div>
                              <div className="secondaryStat">{playerStats.steals}</div>
                            </div>
                            <div>
                              <div className="statLabel">Blocks</div>
                              <div className="secondaryStat">{playerStats.blocks}</div>
                            </div>
                            <div>
                              <div className="statLabel">Turnovers</div>
                              <div className="secondaryStat">{playerStats.turnovers}</div>
                            </div>
                            {playerStats.fga > 0 && (
                              <>
                                <div>
                                  <div className="statLabel">FG%</div>
                                  <div className="secondaryStat">
                                    {formatStat((playerStats.fgm / playerStats.fga) * 100)}%
                                  </div>
                                </div>
                                {playerStats.tpa > 0 && (
                                  <div>
                                    <div className="statLabel">3PT%</div>
                                    <div className="secondaryStat">
                                      {formatStat((playerStats.tpm / playerStats.tpa) * 100)}%
                                    </div>
                                  </div>
                                )}
                                {playerStats.fta > 0 && (
                                  <div>
                                    <div className="statLabel">FT%</div>
                                    <div className="secondaryStat">
                                      {formatStat((playerStats.ftm / playerStats.fta) * 100)}%
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Offense */}
                      <div className="statGroup" style={{ marginBottom: 12 }}>
                        <div className="statGroupTitle">Offense</div>
                        <div className="ratingsGrid">
                          {(['shooting2', 'shooting3', 'freeThrow', 'finishing', 'ballHandling', 'passing'] as const).map((key) => {
                            const value = p.ratings[key]
                            const colorClass = getRatingColorClass(value)
                            return (
                              <div key={key} className="ratingRow">
                                <span className="ratingLabel">{getRatingDisplayName(key)}</span>
                                <span className={`ratingValue ${colorClass}`}>{value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {/* Defense */}
                      <div className="statGroup" style={{ marginBottom: 12 }}>
                        <div className="statGroupTitle">Defense</div>
                        <div className="ratingsGrid">
                          {(['perimeterDefense', 'rimDefense', 'steal', 'block'] as const).map((key) => {
                            const value = p.ratings[key]
                            const colorClass = getRatingColorClass(value)
                            return (
                              <div key={key} className="ratingRow">
                                <span className="ratingLabel">{getRatingDisplayName(key)}</span>
                                <span className={`ratingValue ${colorClass}`}>{value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      {/* Physical */}
                      <div className="statGroup">
                        <div className="statGroupTitle">Physical</div>
                        <div className="ratingsGrid">
                          {(['athleticism', 'strength', 'stamina'] as const).map((key) => {
                            const value = p.ratings[key]
                            const colorClass = getRatingColorClass(value)
                            return (
                              <div key={key} className="ratingRow">
                                <span className="ratingLabel">{getRatingDisplayName(key)}</span>
                                <span className={`ratingValue ${colorClass}`}>{value}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
