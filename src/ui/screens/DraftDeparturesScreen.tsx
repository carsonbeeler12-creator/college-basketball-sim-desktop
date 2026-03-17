import { useState } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { getPlayersLikelyDeclaring, persuadePlayerToStay } from '../../game/engine/draft/persuadePlayer'

export function DraftDeparturesScreen(props: {
  activeSave: Dynasty | null
  setActiveSave: (d: Dynasty) => void
  setScreen: (s: Screen) => void
}) {
  const { activeSave, setActiveSave, setScreen } = props
  const [persuadingPlayerId, setPersuadingPlayerId] = useState<ID | null>(null)
  const [persuasionResult, setPersuasionResult] = useState<{ playerId: ID; success: boolean; playerName: string } | null>(null)

  if (!activeSave) {
    return (
      <section className="card wide">
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  const userTeamId = activeSave.league.userTeamId
  const playersLikelyDeclaring = getPlayersLikelyDeclaring(activeSave, userTeamId)

  const handlePersuade = (playerId: ID) => {
    if (!activeSave) return
    
    setPersuadingPlayerId(playerId)
    const result = persuadePlayerToStay(activeSave, userTeamId, playerId)
    
    if (result) {
      const player = activeSave.playersById[playerId]
      const playerName = player ? `${player.identity.firstName} ${player.identity.lastName}` : 'Player'
      
      setActiveSave(result.dynasty)
      setPersuasionResult({ playerId, success: result.success, playerName })
      
      // Auto-hide result after 5 seconds
      setTimeout(() => {
        setPersuasionResult(null)
      }, 5000)
    }
    
    setPersuadingPlayerId(null)
  }

  const formatProbability = (prob: number) => {
    return `${Math.round(prob * 100)}%`
  }

  return (
    <div className="content">
      <section className="card wide draftDepContainer">
        <div className="rankingsHeader">
          <h2 className="cardTitle">Draft Departures</h2>
          <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
            Back
          </button>
        </div>

        {/* Persuasion Result Banner */}
        {persuasionResult && (
          <div style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: '8px',
            backgroundColor: persuasionResult.success 
              ? 'rgba(76, 175, 80, 0.15)' 
              : 'rgba(244, 67, 54, 0.15)',
            border: `1px solid ${persuasionResult.success ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: persuasionResult.success ? '#4caf50' : '#f44336',
                marginBottom: 4,
              }}>
                {persuasionResult.success ? '✓ Success!' : '✗ Unsuccessful'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                {persuasionResult.success
                  ? `${persuasionResult.playerName} will stay for another season instead of declaring for the draft.`
                  : `${persuasionResult.playerName} has decided to declare for the draft after this season.`}
              </div>
            </div>
            <button
              onClick={() => setPersuasionResult(null)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '18px',
                marginLeft: 12,
              }}
            >
              ×
            </button>
          </div>
        )}

        {playersLikelyDeclaring.length === 0 ? (
          <div className="draftDepEmpty">
            <div className="draftDepEmptyIcon">✓</div>
            <div className="draftDepEmptyText">
              All Clear - No players are currently considering declaring for the draft after this season.
            </div>
            <div style={{ fontSize: '13px', marginTop: 12, fontStyle: 'italic', color: 'var(--muted)' }}>
              Transfer portal departures coming soon...
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
              <div style={{ fontSize: '14px', color: '#ff9800', fontWeight: 600, marginBottom: 4 }}>
                ⚠️ Players Considering Draft Declaration (After This Season)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                These players are likely to declare for the draft after this season ends. Attempt to persuade them to stay for another year.
                <strong style={{ display: 'block', marginTop: 6 }}>You can only attempt persuasion once per player.</strong>
                Success chance is based on last season's team performance, player's role from last season, and their overall rating.
              </div>
            </div>

            <div className="draftDepPlayerList">
              {playersLikelyDeclaring.map(({ player, draftProbability, canPersuade, persuasionChance }) => {
                const avgMinutes = player.stats.gamesPlayed > 0 
                  ? (player.stats.minutes / player.stats.gamesPlayed).toFixed(1)
                  : '0'
                const isPersuading = persuadingPlayerId === player.playerId

                return (
                  <div key={player.playerId} className="draftDepPlayerCard">
                    <div className="draftDepPlayerInfo">
                      <div className="draftDepPlayerName">
                        {player.identity.firstName} {player.identity.lastName}
                      </div>
                      <div className="draftDepPlayerStats">
                        <div className="draftDepPlayerStat">
                          <div className="draftDepPlayerStatLabel">Position</div>
                          <div className="draftDepPlayerStatValue">{player.identity.position}</div>
                        </div>
                        <div className="draftDepPlayerStat">
                          <div className="draftDepPlayerStatLabel">Class</div>
                          <div className="draftDepPlayerStatValue">{player.identity.classYear}</div>
                        </div>
                        <div className="draftDepPlayerStat">
                          <div className="draftDepPlayerStatLabel">OVR</div>
                          <div className="draftDepPlayerStatValue">{player.ratings.overall}</div>
                        </div>
                        <div className="draftDepPlayerStat">
                          <div className="draftDepPlayerStatLabel">Draft Likelihood</div>
                          <div className="draftDepPlayerStatValue">{formatProbability(draftProbability)}</div>
                        </div>
                        <div className="draftDepPlayerStat">
                          <div className="draftDepPlayerStatLabel">Avg Min/Game</div>
                          <div className="draftDepPlayerStatValue">{avgMinutes}</div>
                        </div>
                        <div className="draftDepPlayerStat">
                          <div className="draftDepPlayerStatLabel">Games</div>
                          <div className="draftDepPlayerStatValue">{player.stats.gamesPlayed}</div>
                        </div>
                      </div>
                    </div>
                    
                    {canPersuade && persuasionChance !== undefined && (
                      <div className="draftDepActions">
                        <div style={{ textAlign: 'right', minWidth: 100 }}>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                            Success Chance
                          </div>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 700,
                            color: persuasionChance >= 0.5 ? '#4caf50' : persuasionChance >= 0.3 ? '#ff9800' : '#f44336'
                          }}>
                            {formatProbability(persuasionChance)}
                          </div>
                        </div>
                        <button
                          className="draftDepBtn draftDepBtnPersuade"
                          onClick={() => handlePersuade(player.playerId)}
                          disabled={isPersuading}
                        >
                          {isPersuading ? '⏳ Persuading...' : '🤝 Persuade'}
                        </button>
                      </div>
                    )}

                    {!canPersuade && (
                      <div style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                          {player.draftDeclaration?.persuaded 
                            ? '✓ Persuaded to Stay'
                            : 'Already Attempted'}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
