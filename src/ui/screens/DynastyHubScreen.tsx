import { initializeTournament } from '../../game/engine/tournament/initializeTournament'
import { startNewSeason } from '../../game/engine/development/startNewSeason'
import { getEffectivePrestige } from '../../game/engine/development/applyPrestigeAdjustments'
import type { Dynasty, CoachScheme, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { TEAMS } from '../../game/defaultData'
import { formatGameDayShort } from '../utils/format'
import { getSchemeName, SCHEME_PROFILES } from '../../game/engine/schemes/schemeDefinitions'
import { EditTeamModal } from '../components/EditTeamModal'
import { useState } from 'react'

export function DynastyHubScreen(props: {
  activeSave: Dynasty | null
  setActiveSave: (d: Dynasty) => void
  setScreen: (s: Screen) => void
  upcomingGame: { opponent: string; isHome: boolean; day: number; isConferenceGame: boolean } | null
  onEditTeam?: (teamId: ID, teamName: string) => Promise<void>
}) {
  const { activeSave, setActiveSave, setScreen, upcomingGame, onEditTeam } = props
  const [showSeasonSummary, setShowSeasonSummary] = useState(false)
  const [showSchemeChangeModal, setShowSchemeChangeModal] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<ID | null>(null)
  const activeTeam = TEAMS.find(t => t.id === activeSave?.league.userTeamId) ?? null

  return (
    <section className="card wide">
      <h2 className="cardTitle">Dynasty Hub</h2>

      {!activeSave || !activeTeam ? (
        <p className="cardText muted">No dynasty loaded.</p>
      ) : (
        <>
          <div className="hubHeader">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="hubTeam">{activeTeam.name}</div>
                <button
                  className="btn secondary"
                  onClick={() => setEditingTeamId(activeTeam.id)}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '12px',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    border: '1px solid rgba(76, 175, 80, 0.5)',
                    color: '#4caf50',
                    fontWeight: 600,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Edit Name
                </button>
              </div>
              <div className="hubMeta">
                {activeTeam.city}, {activeTeam.state} • {activeTeam.nickname}
              </div>
              {(() => {
                const teamState = activeSave.league.teamsById?.[activeTeam.id]
                const wins = teamState?.season?.wins ?? 0
                const losses = teamState?.season?.losses ?? 0
                const totalGames = wins + losses
                if (totalGames > 0) {
                  return (
                    <div className="hubMeta" style={{ marginTop: 4, fontWeight: 600 }}>
                      Record: {wins}-{losses}
                    </div>
                  )
                }
                return null
              })()}
            </div>
            <div className="hubMeta right">
              Coach {activeSave.coach.name}
              {activeSave.coach.scheme && (
                <>
                  <br />
                  <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
                    {getSchemeName(activeSave.coach.scheme)} System
                  </span>
                </>
              )}
              <br />
              Season {activeSave.world.seasonYear} • {formatGameDayShort(activeSave.world.day, activeSave.world.seasonYear)}
              <br />
              {(() => {
                const teamState = activeSave.league.teamsById?.[activeTeam.id]
                const effectivePrestige = getEffectivePrestige(activeTeam, teamState)
                const dynamicModifier = teamState?.prestige?.dynamicModifier ?? 0
                const prestigeChange = dynamicModifier !== 0 
                  ? ` (${dynamicModifier > 0 ? '+' : ''}${dynamicModifier.toFixed(1)})`
                  : ''
                return (
                  <span>
                    Prestige: {effectivePrestige.toFixed(0)}
                    {prestigeChange && (
                      <span style={{ color: dynamicModifier > 0 ? '#4caf50' : '#f44336', fontSize: '0.9em' }}>
                        {prestigeChange}
                      </span>
                    )}
                  </span>
                )
              })()}
            </div>
          </div>

          {activeSave && activeSave.league.teamsById[activeSave.league.userTeamId] && (() => {
            const userTeam = activeSave.league.teamsById[activeSave.league.userTeamId]
            const seasonWins = userTeam.season.wins ?? 0
            const seasonLosses = userTeam.season.losses ?? 0
            const record = `${seasonWins}-${seasonLosses}`
            return (
              <div style={{ 
                padding: '12px', 
                background: 'rgba(76, 175, 80, 0.1)', 
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '4px',
                marginTop: '12px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '0.85em', color: '#4caf50', marginBottom: '8px', fontWeight: 600 }}>
                  Season Record
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9em' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>W-L</div>
                    <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#fff' }}>{record}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Conference</div>
                    <div style={{ fontSize: '1.1em', fontWeight: 600, color: '#fff' }}>{userTeam.season.confWins ?? 0}-{userTeam.season.confLosses ?? 0}</div>
                  </div>
                </div>
              </div>
            )
          })()}

          {activeSave && activeSave.coach.careerStats && (() => {
            const stats = activeSave.coach.careerStats
            const record = `${stats.totalWins}-${stats.totalLosses}`
            const tierLabel = stats.currentPrestigeTier
              ?.split('_')
              .map(w => w.charAt(0) + w.slice(1).toLowerCase())
              .join(' ') || 'Unranked'
            return (
              <button
                onClick={() => {}}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '12px',
                  backgroundColor: 'rgba(100, 200, 255, 0.1)',
                  border: '1px solid rgba(100, 200, 255, 0.4)',
                  borderRadius: '6px',
                  color: '#64c8ff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(100, 200, 255, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.6)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(100, 200, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.4)'
                }}
              >
                📊 Career Statistics: {record} • {stats.seasonsCoached}yr{stats.seasonsCoached !== 1 ? 's' : ''} • {tierLabel}
              </button>
            )
          })()}

          {activeSave?.world.phase === 'OFFSEASON' && (
            <button
              onClick={() => setShowSchemeChangeModal(true)}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: '12px',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.4)',
                borderRadius: '6px',
                color: '#ff9800',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.6)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 152, 0, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.4)'
              }}
            >
              ⚙️ Change Coaching Scheme
            </button>
          )}

          {upcomingGame && (() => {
            const opponentTeam = TEAMS.find(t => t.id === upcomingGame.opponent)
            const opponentName = opponentTeam?.name ?? 'Unknown'
            const location = upcomingGame.isHome ? 'vs' : '@'
            const gameType = upcomingGame.isConferenceGame ? 'Conference' : 'Non-Conference'
            return (
              <div style={{ 
                padding: '12px', 
                background: 'rgba(255, 152, 0, 0.1)', 
                border: '1px solid rgba(255, 152, 0, 0.3)',
                borderRadius: '4px',
                marginTop: '12px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '0.85em', color: '#ff9800', marginBottom: '4px' }}>
                  Next Game (Day {upcomingGame.day})
                </div>
                <div style={{ fontSize: '1.1em', fontWeight: 600 }}>
                  {location} {opponentName}
                </div>
                <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: '2px' }}>
                  {gameType}
                </div>
              </div>
            )
          })()}

          <div className="grid3">
            <button className="tile" onClick={() => setScreen('sim')}>
              <div className="tileTitle">Sim</div>
              <div className="tileText">Sim the week, run games, review box scores.</div>
            </button>

            <button className="tile" onClick={() => setScreen('roster')}>
              <div className="tileTitle">Roster</div>
              <div className="tileText">View players, ratings, development.</div>
            </button>

            <button className="tile" onClick={() => setScreen('rotation')}>
              <div className="tileTitle">Rotation</div>
              <div className="tileText">Depth chart + style + optional manual targets.</div>
            </button>

            <button className="tile" onClick={() => setScreen('recruiting')}>
              <div className="tileTitle">Recruiting</div>
              <div className="tileText">View prospects, manage board, allocate hours.</div>
            </button>

            <button className="tile" onClick={() => setScreen('draftDepartures')}>
              <div className="tileTitle">Draft Departures</div>
              <div className="tileText">View and persuade players considering draft declaration (Transfer portal coming soon).</div>
            </button>

            <button className="tile" onClick={() => setScreen('standings')}>
              <div className="tileTitle">Standings</div>
              <div className="tileText">Conference standings, overall records, player leaders.</div>
            </button>

            <button className="tile" onClick={() => setScreen('rankings')}>
              <div className="tileTitle">National Rankings</div>
              <div className="tileText">Top 25 teams by rating. See where you rank nationally.</div>
            </button>

            {activeSave?.world.phase === 'OFFSEASON' ? (
              <button 
                className="tile" 
                style={{ borderColor: 'var(--primary)', borderWidth: 2 }}
                onClick={() => setShowSeasonSummary(true)}
              >
                <div className="tileTitle" style={{ color: 'var(--primary)' }}>Start New Season</div>
                <div className="tileText">
                  Begin the {activeSave.world.seasonYear + 1} season! Generate new recruits and schedule.
                </div>
              </button>
            ) : null}

            {activeSave?.world.phase === 'CONF_TOURNAMENT' ? (
              <button 
                className="tile" 
                style={{ borderColor: 'var(--primary)', borderWidth: 2 }}
                onClick={() => setScreen('conferenceTournaments')}
              >
                <div className="tileTitle" style={{ color: 'var(--primary)' }}>Conference Tournaments</div>
                <div className="tileText">
                  Simulate conference tournaments to determine automatic bids and prestige gains.
                </div>
              </button>
            ) : null}

            {activeSave?.league.tournament || activeSave?.world.phase === 'TOURNAMENT_READY' ? (
              <button 
                className="tile" 
                onClick={() => {
                  if (!activeSave) return
                  if (activeSave.world.phase === 'TOURNAMENT_READY') {
                    // Initialize tournament when in TOURNAMENT_READY phase
                    const updated = initializeTournament(activeSave)
                    setActiveSave(updated)
                  }
                  setScreen('bracket')
                }}
              >
                <div className="tileTitle">
                  {activeSave?.world.phase === 'TOURNAMENT_READY' ? 'Start Tournament' : 'National Tournament'}
                </div>
                <div className="tileText">
                  {activeSave?.world.phase === 'TOURNAMENT_READY' 
                    ? 'Initialize tournament selection and bracket.' 
                    : 'View tournament bracket and results.'}
                </div>
              </button>
            ) : null}

            
          </div>

          {/* Season Summary Modal */}
          {showSeasonSummary && activeSave && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'var(--bg-panel)',
                border: '2px solid var(--primary)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h2 style={{ marginTop: 0, marginBottom: 16, color: 'var(--text)' }}>Season Summary</h2>
                
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Season {activeSave.world.seasonYear}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: 16 }}>
                    {TEAMS.find(t => t.id === activeSave.league.userTeamId)?.name || 'Your Team'}
                  </div>

                  {/* Season Record */}
                  {(() => {
                    const teamState = activeSave.league.teamsById?.[activeSave.league.userTeamId]
                    const wins = teamState?.season?.wins ?? 0
                    const losses = teamState?.season?.losses ?? 0
                    return (
                      <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(100, 200, 255, 0.1)',
                        border: '1px solid rgba(100, 200, 255, 0.3)',
                        borderRadius: '6px',
                        marginBottom: 12
                      }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>
                          Regular Season Record
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                          {wins}-{losses}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Coach Stats */}
                  {activeSave.coach.careerStats && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '6px',
                      marginBottom: 12
                    }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                        Career Progress
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '13px' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Total Record</div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                            {activeSave.coach.careerStats.totalWins}-{activeSave.coach.careerStats.totalLosses}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Seasons</div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                            {activeSave.coach.careerStats.seasonsCoached}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Current Tier</div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                            {activeSave.coach.careerStats.currentPrestigeTier?.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') || 'Unranked'}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Years at School</div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                            {activeSave.coach.careerStats.yearsAtCurrentSchool}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Prepare for recruiting and the upcoming {activeSave.world.seasonYear + 1} season!
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button 
                    className="btn secondary"
                    onClick={() => setShowSeasonSummary(false)}
                  >
                    Go Back
                  </button>
                  <button 
                    className="btn primary"
                    onClick={() => {
                      const updated = startNewSeason(activeSave)
                      setActiveSave(updated)
                      setShowSeasonSummary(false)
                    }}
                  >
                    Start Season {activeSave.world.seasonYear + 1}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scheme Change Modal */}
          {showSchemeChangeModal && activeSave && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'var(--bg-panel)',
                border: '2px solid var(--accent)',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <h2 style={{ marginTop: 0, marginBottom: 16, color: 'var(--text)' }}>Change Coaching Scheme</h2>
                
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Current: <strong>{getSchemeName(activeSave.coach.scheme)}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {(Object.keys(SCHEME_PROFILES) as CoachScheme[]).map(scheme => {
                    const profile = SCHEME_PROFILES[scheme]
                    const isCurrentScheme = activeSave.coach.scheme === scheme
                    
                    return (
                      <button
                        key={scheme}
                        onClick={() => {
                          const updated = {
                            ...activeSave,
                            coach: {
                              ...activeSave.coach,
                              scheme
                            }
                          }
                          setActiveSave(updated)
                          setShowSchemeChangeModal(false)
                        }}
                        style={{
                          padding: '14px',
                          backgroundColor: isCurrentScheme ? 'rgba(100, 200, 255, 0.3)' : 'rgba(100, 200, 255, 0.08)',
                          border: isCurrentScheme ? '2px solid rgba(100, 200, 255, 0.8)' : '1px solid rgba(100, 200, 255, 0.3)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left'
                        }}
                        onMouseEnter={e => {
                          if (!isCurrentScheme) {
                            e.currentTarget.style.backgroundColor = 'rgba(100, 200, 255, 0.15)'
                            e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.6)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isCurrentScheme) {
                            e.currentTarget.style.backgroundColor = 'rgba(100, 200, 255, 0.08)'
                            e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.3)'
                          }
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 6, color: isCurrentScheme ? '#64c8ff' : 'var(--text)' }}>
                          {isCurrentScheme && '✓ '}{profile.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {profile.description}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button 
                    className="btn secondary"
                    onClick={() => setShowSchemeChangeModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {editingTeamId && activeSave && (
        <EditTeamModal
          dynasty={activeSave}
          teamId={editingTeamId}
          onClose={() => setEditingTeamId(null)}
          onSave={async (teamId, teamName) => {
            if (onEditTeam) {
              await onEditTeam(teamId, teamName)
              setEditingTeamId(null)
            }
          }}
        />
      )}
    </section>
  )
}