import { initializeTournament } from '../../game/engine/tournament/initializeTournament'
import { startNewSeason } from '../../game/engine/development/startNewSeason'
import { getEffectivePrestige } from '../../game/engine/development/applyPrestigeAdjustments'
import type { Dynasty } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { TEAMS } from '../../game/defaultData'
import { formatGameDayShort } from '../utils/format'

export function DynastyHubScreen(props: {
  activeSave: Dynasty | null
  setActiveSave: (d: Dynasty) => void
  setScreen: (s: Screen) => void
  upcomingGame: { opponent: string; isHome: boolean; day: number; isConferenceGame: boolean } | null
}) {
  const { activeSave, setActiveSave, setScreen, upcomingGame } = props
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
              <div className="hubTeam">{activeTeam.name}</div>
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

            {activeSave?.world.phase === 'OFFSEASON' ? (
              <button 
                className="tile" 
                style={{ borderColor: 'var(--primary)', borderWidth: 2 }}
                onClick={() => {
                  if (!activeSave) return
                  const updated = startNewSeason(activeSave)
                  setActiveSave(updated)
                }}
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
        </>
      )}
    </section>
  )
}