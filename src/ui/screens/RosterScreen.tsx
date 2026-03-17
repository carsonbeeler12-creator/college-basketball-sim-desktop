import { useState } from 'react'
import type { Dynasty, PlayerState, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { TEAMS } from '../../game/defaultData'
import { fmtHeight, getRatingDisplayName } from '../utils/format'
import { getAwardName } from '../../game/engine/stats/calculateAwards'
import { EditPlayerModal } from '../components/EditPlayerModal'

export function RosterScreen(props: {
  activeSave: Dynasty | null
  activeRosterPlayers: PlayerState[]
  setScreen: (s: Screen) => void
  setActiveSave?: (d: Dynasty) => Promise<void> | void
  onEditPlayer?: (playerId: ID, firstName: string, lastName: string) => Promise<void>
}) {
  const { activeSave, activeRosterPlayers, setScreen, onEditPlayer } = props
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
  const [editingPlayerId, setEditingPlayerId] = useState<ID | null>(null)
  const activeTeam = TEAMS.find(t => t.id === activeSave?.league.userTeamId) ?? null

  return (
    <section className="card wide">
      <h2 className="cardTitle">Roster</h2>

      {!activeSave || !activeTeam ? (
        <p className="cardText muted">No dynasty loaded.</p>
      ) : activeRosterPlayers.length === 0 ? (
        <p className="cardText muted">No roster data found for this save. Create a NEW dynasty.</p>
      ) : (
        <>
          <div className="hubHeader">
            <div>
              <div className="hubTeam">{activeTeam.name}</div>
              <div className="hubMeta">
                Coach {activeSave.coach.name} • Season {activeSave.world.seasonYear}
              </div>
              {(() => {
                const teamState = activeSave.league.teamsById?.[activeTeam.id]
                const wins = teamState?.season?.wins ?? 0
                const losses = teamState?.season?.losses ?? 0
                const totalGames = wins + losses
                if (totalGames > 0) {
                  return (
                    <div className="simRecordMeta">
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

          <div className="rosterPlayerGrid">
            {activeRosterPlayers.map(p => (
              <div
                key={p.playerId}
                className="rosterPlayerCard"
                onClick={() =>
                  setExpandedPlayerId(expandedPlayerId === p.playerId ? null : p.playerId)
                }
              >
                <div className="rosterPlayerHeader">
                  <div className="rosterPlayerInfo">
                    <div className="rosterPlayerName">
                      {p.identity.firstName} {p.identity.lastName}
                    </div>
                    <div className="rosterPlayerStats">
                      <span className="rosterOvr">
                        {p.ratings.overall} OVR
                      </span>
                      <span className="tertiaryStat">{p.identity.position}</span>
                      <span className="tertiaryStat">{p.identity.classYear}</span>
                      <span className="tertiaryStat">{fmtHeight(p.identity.heightIn)} • {p.identity.weightLb} lb</span>
                      {p.awards && p.awards.length > 0 && (
                        <span className="rosterAwardsBadge">
                          🏆 {p.awards.reduce((sum, a) => sum + a.awards.length, 0)} Award{p.awards.reduce((sum, a) => sum + a.awards.length, 0) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rosterPlayerActions">
                    <button
                      className="rosterEditBtn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPlayerId(p.playerId)
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {expandedPlayerId === p.playerId && (
                  <div className="rosterStatsReveal">
                    {/* Awards */}
                    {p.awards && p.awards.length > 0 && (
                      <div className="rosterAwardsSection">
                        <div className="statGroupTitle">Career Awards & Honors</div>
                        {p.awards.map((yearAwards, idx) => (
                          <div key={idx} className="rosterAwardYear">
                            <div className="rosterAwardSeasonLabel">
                              Season {yearAwards.seasonYear}
                            </div>
                            {yearAwards.awards.map((award, aIdx) => (
                              <div key={aIdx} className="rosterAwardItem">
                                🏆 {getAwardName(award)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Offense */}
                    <div className="rosterStatGroup">
                      <div className="statGroupTitle">Offense</div>
                      <div className="ratingsGrid">
                        {(['shooting2', 'shooting3', 'freeThrow', 'finishing', 'ballHandling', 'passing'] as const).map((key) => {
                          const value = p.ratings[key]
                          const colorClass = value >= 80 ? 'excellent' : value >= 70 ? 'good' : value >= 60 ? 'average' : value >= 50 ? 'poor' : 'weak'
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
                    <div className="rosterStatGroup">
                      <div className="statGroupTitle">Defense</div>
                      <div className="ratingsGrid">
                        {(['perimeterDefense', 'rimDefense', 'steal', 'block'] as const).map((key) => {
                          const value = p.ratings[key]
                          const colorClass = value >= 80 ? 'excellent' : value >= 70 ? 'good' : value >= 60 ? 'average' : value >= 50 ? 'poor' : 'weak'
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
                    <div className="rosterStatGroup">
                      <div className="statGroupTitle">Physical</div>
                      <div className="ratingsGrid">
                        {(['athleticism', 'strength', 'stamina'] as const).map((key) => {
                          const value = p.ratings[key]
                          const colorClass = value >= 80 ? 'excellent' : value >= 70 ? 'good' : value >= 60 ? 'average' : value >= 50 ? 'poor' : 'weak'
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
            ))}
          </div>
        </>
      )}
      
      {editingPlayerId && activeSave && (
        <EditPlayerModal
          dynasty={activeSave}
          playerId={editingPlayerId}
          onClose={() => setEditingPlayerId(null)}
          onSave={async (playerId, firstName, lastName) => {
            if (onEditPlayer) {
              await onEditPlayer(playerId, firstName, lastName)
            }
          }}
        />
      )}


    </section>
  )
}