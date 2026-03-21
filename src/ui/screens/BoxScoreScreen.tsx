import { TEAMS } from '../../game/defaultData'
import { formatGameDay, teamName as resolveTeamName } from '../utils/format'
import { getSchemeName } from '../../game/engine/schemes/schemeDefinitions'
import type { Dynasty, GameState, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'

// Color palette for teams
const TEAM_COLORS = [
  '#ff8c00', '#ff6b35', '#f7931e', '#fbb03b', '#f68a1f',
  '#ff4444', '#cc0000', '#ff1744', '#f50057', '#ff0000',
  '#4488ff', '#0055ff', '#0066cc', '#0066ff', '#0055dd',
  '#00aa44', '#00cc44', '#00ff00', '#11dd11', '#00dd44',
  '#ff00ff', '#dd00ff', '#aa00ff', '#8800ff', '#7700ff',
  '#ffaa00', '#ff9000', '#ff7700', '#ff6600', '#ff5500',
]

function getTeamColor(teamIndex: number): string {
  return TEAM_COLORS[teamIndex % TEAM_COLORS.length]
}

function playerName(save: Dynasty, playerId: ID) {
  const p = save.playersById?.[playerId]
  return p ? `${p.identity.firstName} ${p.identity.lastName}` : playerId
}

export function BoxScoreScreen(props: {
  activeSave: Dynasty | null
  activeGameId: string | null
  setScreen: (s: Screen) => void
}) {
  const { activeSave, activeGameId, setScreen } = props

  const activeGame: GameState | null =
    !activeSave || !activeGameId ? null : activeSave.league.gamesById?.[activeGameId] ?? null

  return (
    <section className="card wide">
      <h2 className="cardTitle">Box Score</h2>

      {!activeSave || !activeGame ? (
        <p className="cardText muted">No game selected.</p>
      ) : !activeGame.result?.boxScore ? (
        <p className="cardText muted">No box score found.</p>
      ) : (
        <>
          <div className="boxScoreHeader">
            <div className="boxScoreActions">
              <button className="btn secondary" onClick={() => setScreen('simResults')}>
                ← Back
              </button>
              <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
                Home
              </button>
            </div>
            <div className="cardText muted">
              {formatGameDay(activeGame.day, activeSave.world.seasonYear)} • {resolveTeamName(activeGame.awayTeamId, activeSave)} @ {resolveTeamName(activeGame.homeTeamId, activeSave)} • Final{' '}
              {activeGame.result.awayScore}–{activeGame.result.homeScore}
            </div>
          </div>

          <div className="boxScoreSpacer" />

          <div className="grid2">
            {(['away', 'home'] as const).map(side => {
              const teamId = side === 'home' ? activeGame.homeTeamId : activeGame.awayTeamId
              const lines =
                side === 'home'
                  ? activeGame.result!.boxScore!.playerLinesByTeam.home
                  : activeGame.result!.boxScore!.playerLinesByTeam.away
              const teamLine =
                side === 'home'
                  ? activeGame.result!.boxScore!.teamStats.home
                  : activeGame.result!.boxScore!.teamStats.away

              const teamIndex = TEAMS.findIndex(t => t.id === teamId)
              const teamColor = getTeamColor(teamIndex)
              const fgPct = teamLine.fga > 0 ? ((teamLine.fgm / teamLine.fga) * 100).toFixed(1) : '0'
              const tpPct = teamLine.tpa > 0 ? ((teamLine.tpm / teamLine.tpa) * 100).toFixed(1) : '0'
              const ftPct = teamLine.fta > 0 ? ((teamLine.ftm / teamLine.fta) * 100).toFixed(1) : '0'

              const userTeamId = activeSave?.league.userTeamId
              const isUserTeam = teamId === userTeamId
              const coachScheme = isUserTeam ? activeSave?.coach.scheme : null
              const schemeLabel = coachScheme ? getSchemeName(coachScheme) : null

              return (
                <section key={side} className="boxScoreTeamCard" style={{ borderLeftColor: teamColor }}>
                  <div className="boxScoreTeamHeader">
                    <div>
                      <div className="boxScoreTeamName" style={{ color: teamColor }}>
                        {resolveTeamName(teamId, activeSave)}
                      </div>
                      {schemeLabel && (
                        <div className="boxScoreSchemeLabel">
                          {schemeLabel} System
                        </div>
                      )}
                    </div>
                    <div className="boxScoreTeamScore" style={{ color: teamColor }}>
                      {teamLine.points}
                    </div>
                  </div>

                  <div className="boxScoreTeamStats">
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">FG</div>
                      <div className="boxScoreStatValue">{teamLine.fgm}/{teamLine.fga} ({fgPct}%)</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">3PT</div>
                      <div className="boxScoreStatValue">{teamLine.tpm}/{teamLine.tpa} ({tpPct}%)</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">FT</div>
                      <div className="boxScoreStatValue">{teamLine.ftm}/{teamLine.fta} ({ftPct}%)</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">REB</div>
                      <div className="boxScoreStatValue">{teamLine.rebounds}</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">AST</div>
                      <div className="boxScoreStatValue">{teamLine.assists}</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">STL</div>
                      <div className="boxScoreStatValue">{teamLine.steals}</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">BLK</div>
                      <div className="boxScoreStatValue">{teamLine.blocks}</div>
                    </div>
                    <div className="boxScoreStat">
                      <div className="boxScoreStatLabel">TO</div>
                      <div className="boxScoreStatValue">{teamLine.turnovers}</div>
                    </div>
                  </div>

                  <div className="boxScorePlayerStatsTitle" style={{ color: teamColor }}>
                    Player Stats
                  </div>

                  <div>
                    {lines
                      .slice()
                      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
                      .map((l) => {
                        const playerFgPct = l.fga > 0 ? ((l.fgm / l.fga) * 100).toFixed(0) : '0'
                        
                        return (
                          <div key={l.playerId} className="boxScorePlayerRow">
                            <div className="boxScorePlayerName">
                              {playerName(activeSave, l.playerId)}
                            </div>
                            <div className="boxScorePlayerMinutes">
                              {l.minutes} min
                            </div>
                            <div className="boxScorePlayerPoints">
                              {l.points}
                            </div>
                            <div className="boxScorePlayerStats">
                              {l.fgm}/{l.fga} ({playerFgPct}%) • {l.tpm}/{l.tpa} • {l.rebounds}R • {l.assists}A • {l.steals}S • {l.blocks}B
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}