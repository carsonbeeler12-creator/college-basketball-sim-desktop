import { useState } from 'react'
import { appVersionDisplay } from '../../appVersion'
import { TEAMS } from '../../game/defaultData'
import type { Screen } from '../../game/types'
import type { DynastyIndexEntry } from '../../game/types/dynastyIndex'

function formatLastPlayed(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export function HomeScreen(props: {
  saves: DynastyIndexEntry[]
  setScreen: (s: Screen) => void
  loadSave: (id: string) => void
  deleteSave: (id: string) => Promise<void>
  onLoad2026Bracket?: () => Promise<void>
}) {
  const { saves, setScreen, loadSave, deleteSave, onLoad2026Bracket } = props
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  return (
    <div className="homeContainer">
      {/* Beta Banner */}
      <div className="betaBanner">
        <span className="betaBannerIcon">🚧</span>
        <strong>BETA VERSION {appVersionDisplay()}</strong>
        <span className="betaBannerText">Help us improve! Report bugs and suggestions.</span>
      </div>

      {/* Hero Section */}
      <section className="homeHero">
        <h1 className="homeTitle">College Basketball Dynasty</h1>
        <p className="homeSubtitle">Build your program. Recruit elite talent. Win championships.</p>
        <div className="homeCtaRow">
          <button className="btn homeCtaBtn" onClick={() => setScreen('newDynasty')}>
            <span className="homeCtaIcon">🏀</span>
            Start New Dynasty
          </button>
          {onLoad2026Bracket && (
            <button className="btn secondary homeCtaBtn" onClick={onLoad2026Bracket}>
              2026 Tournament
            </button>
          )}
        </div>
      </section>

      {/* Dynasties Section */}
      {saves.length > 0 && (
        <section className="homeDynastiesSection">
          <h2 className="homeSectionTitle">Your Dynasties</h2>
          <div className="savesGrid">
            {saves.map(s => {
              const team = TEAMS.find(t => t.id === s.userTeamId)
              const isDeleting = deleteConfirm === s.dynastyId
              
              return (
                <div key={s.dynastyId} className="saveCard">
                  <div 
                    className="saveCardMain"
                    onClick={() => !isDeleting && loadSave(s.dynastyId)}
                    style={{ cursor: isDeleting ? 'default' : 'pointer' }}
                  >
                    <div className="saveCardHeader">
                      <div className="saveCardTeam">{team ? team.name : 'Unknown'}</div>
                      <div className="saveCardBadge">Season {s.seasonYear}</div>
                    </div>
                    
                    <div className="saveCardCoach">Coach {s.coachName}</div>
                    
                    <div className="saveCardMeta">
                      <span className="saveCardMetaItem">
                        <span className="saveCardMetaIcon">📅</span>
                        {formatLastPlayed(s.lastSavedAtISO)}
                      </span>
                    </div>
                  </div>

                  <div className="saveCardActions">
                    {!isDeleting ? (
                      <>
                        <button 
                          className="btn saveCardBtn"
                          onClick={() => loadSave(s.dynastyId)}
                        >
                          Continue
                        </button>
                        <button 
                          className="btn secondary saveCardBtnDelete"
                          onClick={() => setDeleteConfirm(s.dynastyId)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="deleteConfirmText">Delete this dynasty?</div>
                        <button 
                          className="btn saveCardBtnConfirm"
                          onClick={async () => {
                            await deleteSave(s.dynastyId)
                            setDeleteConfirm(null)
                          }}
                        >
                          Yes, Delete
                        </button>
                        <button 
                          className="btn secondary"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {saves.length === 0 && (
        <section className="homeEmptyState">
          <div className="emptyStateIcon">🏀</div>
          <h3 className="emptyStateTitle">No Dynasties Yet</h3>
          <p className="emptyStateText">
            Start your journey to become a championship coach.
            <br />
            Recruit star players, develop your roster, and build a legacy.
          </p>
          <button className="btn" onClick={() => setScreen('newDynasty')}>
            Create Your First Dynasty
          </button>
        </section>
      )}
    </div>
  )
}