import { TEAMS } from '../../game/defaultData'
import { formatGameDayShort } from '../utils/format'
import type { Dynasty, GameState } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'

function teamName(teamId: string) {
  return TEAMS.find(t => t.id === teamId)?.name ?? teamId
}

export function SimScreen(props: {
  activeSave: Dynasty | null
  activeTeamName: string | null
  recentGames: GameState[]
  setScreen: (s: Screen) => void
  onSimWeek: () => Promise<void> | void
  onOpenGame: (gameId: string) => void
  isSimulating?: boolean
}) {
  const { activeSave, activeTeamName, recentGames, setScreen, onSimWeek, onOpenGame, isSimulating } = props

  return (
    <section className="card wide">
      <h2 className="cardTitle">Sim</h2>

      {!activeSave ? (
        <p className="cardText muted">No dynasty loaded.</p>
      ) : (
        <>
          <div className="hubHeader">
            <div>
              <div className="hubTeam">{activeTeamName ?? 'User Team'}</div>
              <div className="hubMeta">
                Season {activeSave.world.seasonYear} • {formatGameDayShort(activeSave.world.day, activeSave.world.seasonYear)}
                {activeSave.world.phase === 'TOURNAMENT_READY' && (
                  <span style={{ color: '#ff6b35', fontWeight: 'bold', marginLeft: '8px' }}>
                    🏀 TOURNAMENT READY
                  </span>
                )}
              </div>
              {(() => {
                if (!activeSave) return null
                const teamId = activeSave.league.userTeamId
                const teamState = activeSave.league.teamsById?.[teamId]
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
              <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
                Back
              </button>
            </div>
          </div>

          <p className="cardText muted">
            {activeSave.world.phase === 'TOURNAMENT_READY' 
              ? 'Regular season complete! Tournament is ready to start. Go to the bracket screen to start simming tournament games.'
              : activeSave.world.phase === 'CONF_TOURNAMENT'
                ? 'Conference tournaments are ready. Use the Conference Tournaments screen to sim those games. Sim Week is disabled here.'
                : activeSave.world.phase === 'POSTSEASON'
                  ? 'Tournament is in progress! Go to the bracket screen to simulate tournament games.'
                  : 'Click "Sim Week" to simulate 7 days of games for all teams in the league. Your team\'s recent games will appear below.'
            }
          </p>

          <div className="row" style={{ justifyContent: 'flex-start', gap: 12 }}>
            <button 
              className="btn" 
              onClick={onSimWeek}
              disabled={['TOURNAMENT_READY','POSTSEASON','CONF_TOURNAMENT'].includes(activeSave.world.phase) || isSimulating}
              style={
                (['TOURNAMENT_READY','POSTSEASON','CONF_TOURNAMENT'].includes(activeSave.world.phase) || isSimulating) 
                  ? { opacity: 0.5, cursor: 'not-allowed' } 
                  : {}
              }
            >
              {activeSave.world.phase === 'TOURNAMENT_READY' 
                ? 'Tournament Ready' 
                : activeSave.world.phase === 'POSTSEASON'
                  ? 'Tournament In Progress'
                  : 'Sim Week'}
            </button>
            <button className="btn secondary" onClick={() => setScreen('simResults')}>
              View Recent Results
            </button>
          </div>

          <div style={{ height: 12 }} />

          <h3 className="cardTitle">Recent Games</h3>
          {recentGames.length === 0 ? (
            <p className="cardText muted">No games simmed yet.</p>
          ) : (
            <div className="list">
              {recentGames.map(g => (
                <button key={g.gameId} className="listRow" onClick={() => onOpenGame(g.gameId)}>
                  <div className="listRowTitle">
                    {formatGameDayShort(g.day, activeSave.world.seasonYear)}: {teamName(g.awayTeamId)} @ {teamName(g.homeTeamId)}
                  </div>
                  <div className="listRowSub">Final: {g.result?.awayScore}–{g.result?.homeScore}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}