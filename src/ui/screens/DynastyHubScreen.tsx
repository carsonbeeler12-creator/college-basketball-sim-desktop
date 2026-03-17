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
    <section className="card wide hubCard">
      <h2 className="hubPageTitle">Dynasty Hub</h2>

      {!activeSave || !activeTeam ? (
        <p className="cardText muted">No dynasty loaded.</p>
      ) : (
        <>
        <div className="hubLayout">
          {/* Left column: context (header, next game, phase CTA) */}
          <div className="hubLayoutLeft">
          {/* Compact header: team, record, season, prestige, coach in one strip */}
          <div className="hubCompactHeader">
            <div className="hubCompactTeam">
              <h1 className="hubCompactTeamName">{activeTeam.name}</h1>
              <button
                className="hubEditTeamBtn hubEditTeamBtnSmall"
                onClick={() => setEditingTeamId(activeTeam.id)}
                title="Edit team name"
              >
                ✏️
              </button>
              <span className="hubCompactLocation">{activeTeam.city}, {activeTeam.state}</span>
            </div>
            {activeSave.league.teamsById[activeSave.league.userTeamId] && (() => {
              const userTeam = activeSave.league.teamsById[activeSave.league.userTeamId]
              const seasonWins = userTeam.season.wins ?? 0
              const seasonLosses = userTeam.season.losses ?? 0
              const teamState = activeSave.league.teamsById?.[activeTeam.id]
              const effectivePrestige = getEffectivePrestige(activeTeam, teamState)
              const getPrestigeTier = (p: number): string => {
                if (p >= 90) return 'Blue Blood'
                if (p >= 80) return 'Power'
                if (p >= 70) return 'Major'
                if (p >= 60) return 'Mid-Tier'
                return 'Rising'
              }
              return (
                <div className="hubCompactStats">
                  <span className="hubCompactStat">
                    <span className="hubCompactStatLabel">Record</span>
                    <span className="hubCompactStatValue">{seasonWins}-{seasonLosses}</span>
                  </span>
                  <span className="hubCompactStat">
                    <span className="hubCompactStatLabel">Season</span>
                    <span className="hubCompactStatValue">{formatGameDayShort(activeSave.world.day, activeSave.world.seasonYear)}</span>
                  </span>
                  <span className="hubCompactStat">
                    <span className="hubCompactStatLabel">Prestige</span>
                    <span className="hubCompactStatValue">{effectivePrestige.toFixed(0)} <span className="hubCompactStatSub">{getPrestigeTier(effectivePrestige)}</span></span>
                  </span>
                  <span className="hubCompactStat">
                    <span className="hubCompactStatLabel">Coach</span>
                    <span className="hubCompactStatValue">{activeSave.coach.name}{activeSave.coach.scheme ? ` · ${getSchemeName(activeSave.coach.scheme)}` : ''}</span>
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Next game - slim bar */}
          {upcomingGame && (() => {
            const opponentTeam = TEAMS.find(t => t.id === upcomingGame.opponent)
            const opponentName = opponentTeam?.name ?? 'Unknown'
            const location = upcomingGame.isHome ? 'vs' : '@'
            return (
              <div className="hubNextGameBar">
                <span className="hubNextGameLabel">Next</span>
                <span className="hubNextGameMatchup">{location} {opponentName}</span>
                <span className="hubNextGameDay">Day {upcomingGame.day}</span>
                <button className="btn hubNextGameSimBtn" onClick={() => setScreen('sim')}>Sim week</button>
              </div>
            )
          })()}

          {/* Phase CTA - one prominent bar when applicable */}
          {activeSave.world.phase === 'OFFSEASON' && (
            <div className="hubPhaseCta">
              <div className="hubPhaseCtaText">
                Offseason · Ready to start Season {activeSave.world.seasonYear + 1}
              </div>
              <div className="hubPhaseCtaActions">
                <button type="button" className="hubPhaseCtaLink" onClick={() => setShowSchemeChangeModal(true)}>
                  Change scheme
                </button>
                <button className="btn" onClick={() => setShowSeasonSummary(true)}>
                  Start new season
                </button>
              </div>
            </div>
          )}
          {activeSave.world.phase === 'CONF_TOURNAMENT' && (
            <div className="hubPhaseCta">
              <div className="hubPhaseCtaText">Conference tournament week</div>
              <button className="btn" onClick={() => setScreen('conferenceTournaments')}>
                Conference tournaments
              </button>
            </div>
          )}
          {(activeSave.league.tournament || activeSave.world.phase === 'TOURNAMENT_READY') && (
            <div className="hubPhaseCta">
              <div className="hubPhaseCtaText">
                {activeSave.world.phase === 'TOURNAMENT_READY' ? 'Bracket ready' : 'National tournament'}
              </div>
              <button
                className="btn"
                onClick={() => {
                  if (activeSave.world.phase === 'TOURNAMENT_READY') {
                    const updated = initializeTournament(activeSave)
                    setActiveSave(updated)
                  }
                  setScreen('bracket')
                }}
              >
                {activeSave.world.phase === 'TOURNAMENT_READY' ? 'Start tournament' : 'View bracket'}
              </button>
            </div>
          )}

          </div>
          {/* Right column: nav tiles - fills the space */}
          <div className="hubLayoutRight">
            <div className="hubNavSection">
              <h3 className="hubNavSectionTitle">Go to</h3>
              <div className="hubNavGrid">
                <button className="tile hubTile" onClick={() => setScreen('sim')}>
                  <span className="hubTileTitle">Sim</span>
                  <span className="hubTileDesc">Run games</span>
                </button>
                <button className="tile hubTile" onClick={() => setScreen('roster')}>
                  <span className="hubTileTitle">Roster</span>
                  <span className="hubTileDesc">Players & ratings</span>
                </button>
                <button className="tile hubTile" onClick={() => setScreen('rotation')}>
                  <span className="hubTileTitle">Rotation</span>
                  <span className="hubTileDesc">Depth chart</span>
                </button>
                <button className="tile hubTile" onClick={() => setScreen('recruiting')}>
                  <span className="hubTileTitle">Recruiting</span>
                  <span className="hubTileDesc">Board & hours</span>
                </button>
                <button className="tile hubTile" onClick={() => setScreen('draftDepartures')}>
                  <span className="hubTileTitle">Draft departures</span>
                  <span className="hubTileDesc">Declarations</span>
                </button>
                <button className="tile hubTile" onClick={() => setScreen('standings')}>
                  <span className="hubTileTitle">Standings</span>
                  <span className="hubTileDesc">Conference & stats</span>
                </button>
                <button className="tile hubTile" onClick={() => setScreen('rankings')}>
                  <span className="hubTileTitle">Rankings</span>
                  <span className="hubTileDesc">Top 25</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Season Summary Modal */}
          {showSeasonSummary && activeSave && (
            <div className="modal">
              <div className="modalContent modalWide">
                <h2 className="modalTitle">Season Summary</h2>
                
                <div className="modalBody">
                  <div className="modalMeta">
                    Season {activeSave.world.seasonYear}
                  </div>
                  <div className="modalTeamName">
                    {TEAMS.find(t => t.id === activeSave.league.userTeamId)?.name || 'Your Team'}
                  </div>

                  {/* Season Record */}
                  {(() => {
                    const teamState = activeSave.league.teamsById?.[activeSave.league.userTeamId]
                    const wins = teamState?.season?.wins ?? 0
                    const losses = teamState?.season?.losses ?? 0
                    return (
                      <div className="modalStatCard modalStatCardBlue">
                        <div className="modalStatLabel">
                          Regular Season Record
                        </div>
                        <div className="modalStatValue">
                          {wins}-{losses}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Coach Stats */}
                  {activeSave.coach.careerStats && (
                    <div className="modalStatCard modalStatCardGreen">
                      <div className="modalStatSectionTitle">
                        Career Progress
                      </div>
                      <div className="modalStatsGrid">
                        <div>
                          <div className="modalStatLabel">Total Record</div>
                          <div className="modalStatValue">
                            {activeSave.coach.careerStats.totalWins}-{activeSave.coach.careerStats.totalLosses}
                          </div>
                        </div>
                        <div>
                          <div className="modalStatLabel">Seasons</div>
                          <div className="modalStatValue">
                            {activeSave.coach.careerStats.seasonsCoached}
                          </div>
                        </div>
                        <div>
                          <div className="modalStatLabel">Current Tier</div>
                          <div className="modalStatValue">
                            {activeSave.coach.careerStats.currentPrestigeTier?.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ') || 'Unranked'}
                          </div>
                        </div>
                        <div>
                          <div className="modalStatLabel">Years at School</div>
                          <div className="modalStatValue">
                            {activeSave.coach.careerStats.yearsAtCurrentSchool}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="modalSubtext">
                    Prepare for recruiting and the upcoming {activeSave.world.seasonYear + 1} season!
                  </div>
                </div>

                <div className="modalActions">
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
            <div className="modal">
              <div className="modalContent modalWide">
                <h2 className="modalTitle">Change Coaching Scheme</h2>
                
                <div className="modalMeta">
                  Current: <strong>{getSchemeName(activeSave.coach.scheme)}</strong>
                </div>

                <div className="schemeGrid">
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
                        className={isCurrentScheme ? 'schemeOption schemeOptionActive' : 'schemeOption'}
                      >
                        <div className="schemeOptionName">
                          {isCurrentScheme && '✓ '}{profile.name}
                        </div>
                        <div className="schemeOptionDesc">
                          {profile.description}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="modalActions">
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