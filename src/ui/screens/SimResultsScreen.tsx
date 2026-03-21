import { getTournamentOutlookLabel } from '../../game/utils/tournamentOutlook'
import { formatGameDayShort, teamName } from '../utils/format'
import type { Dynasty, GameState } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'

export function SimResultsScreen(props: {
  activeSave: Dynasty | null
  recentGames: GameState[]
  setScreen: (s: Screen) => void
  onSimWeek: () => Promise<void> | void
  onOpenGame: (gameId: string) => void
  isSimulating?: boolean
}) {
  const { activeSave, recentGames, setScreen, onSimWeek, onOpenGame, isSimulating } = props

  return (
    <section className="card wide">
      <h2 className="cardTitle">Results</h2>

      {!activeSave ? (
        <p className="cardText muted">No dynasty loaded.</p>
      ) : recentGames.length === 0 ? (
        <p className="cardText muted">No games simmed yet.</p>
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <button className="btn secondary" onClick={() => setScreen('sim')}>
              Back
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {(() => {
                const teamId = activeSave.league.userTeamId
                const teamState = activeSave.league.teamsById?.[teamId]
                const wins = teamState?.season?.wins ?? 0
                const losses = teamState?.season?.losses ?? 0
                const rating = teamState?.season?.teamRating
                const totalGames = wins + losses

                if (totalGames === 0 && rating == null) return null

                const outlook = getTournamentOutlookLabel(wins, losses, rating)

                return (
                  <div className="simRecordMeta">
                    {totalGames > 0 && (
                      <span>
                        Record: {wins}-{losses}
                      </span>
                    )}
                    {(rating != null || totalGames > 0) && <span className="simMetaDivider">•</span>}
                    <span>
                      {rating != null && <>Team Rating: {rating}</>}
                      {rating != null && outlook && ' · '}
                      {outlook && <span className="simOutlookTag">{outlook}</span>}
                    </span>
                  </div>
                )
              })()}
              <button 
                className="btn" 
                onClick={onSimWeek}
                disabled={isSimulating}
                style={isSimulating ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                {isSimulating ? 'Simulating...' : 'Sim Week'}
              </button>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div className="list">
            {recentGames.map(g => (
              <button key={g.gameId} className="listRow" onClick={() => onOpenGame(g.gameId)}>
                <div className="listRowTitle">
                  {formatGameDayShort(g.day, activeSave?.world.seasonYear ?? 2026)}: {teamName(g.awayTeamId, activeSave)} @ {teamName(g.homeTeamId, activeSave)}
                </div>
                <div className="listRowSub">Final: {g.result?.awayScore}–{g.result?.homeScore}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}