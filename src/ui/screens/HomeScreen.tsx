import { TEAMS } from '../../game/defaultData'
import type { Screen } from '../../game/types'
import type { DynastyIndexEntry } from '../../game/types/dynastyIndex'

export function HomeScreen(props: {
  saves: DynastyIndexEntry[]
  setScreen: (s: Screen) => void
  loadSave: (id: string) => void
  deleteSave: (id: string) => Promise<void>
}) {
  const { saves, setScreen, loadSave, deleteSave } = props

  return (
    <div className="grid2">
      <div style={{ gridColumn: '1 / -1', background: '#ff6b35', padding: '12px', borderRadius: '4px', textAlign: 'center', marginBottom: '16px' }}>
        <strong>🚧 BETA VERSION 0.9.6</strong> - Help us improve! Report bugs and suggestions.
      </div>
      
      <section className="card">
        <h2 className="cardTitle">Start</h2>
        <div className="stack">
          <button className="btn" onClick={() => setScreen('newDynasty')}>
            New Dynasty
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="cardTitle">Load Dynasty</h2>

        {saves.length === 0 ? (
          <p className="cardText muted">No saves yet. Create your first dynasty.</p>
        ) : (
          <div className="list">
            {saves.map(s => {
              const team = TEAMS.find(t => t.id === s.userTeamId)
              return (
                <div key={s.dynastyId} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <button 
                    className="listRow" 
                    onClick={() => loadSave(s.dynastyId)}
                    style={{ flex: 1 }}
                  >
                    <div className="listRowTitle">{team ? team.name : s.userTeamId}</div>
                    <div className="listRowSub">
                      Coach {s.coachName} • Season {s.seasonYear}
                    </div>
                  </button>
                  <button
                    className="btn"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (confirm(`Delete dynasty: ${team?.name || 'Unknown'} - Coach ${s.coachName}?`)) {
                        await deleteSave(s.dynastyId)
                      }
                    }}
                    style={{ 
                      background: '#dc3545', 
                      padding: '8px 16px',
                      minWidth: 'auto'
                    }}
                  >
                    Delete
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}