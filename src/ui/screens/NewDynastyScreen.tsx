import { useState, useMemo } from 'react'
import { TEAMS } from '../../game/defaultData'
import { CONFERENCES } from '../../game/data/conferences'
import type { ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'

export function NewDynastyScreen(props: {
  coachName: string
  setCoachName: (s: string) => void
  selectedTeamId: string
  setSelectedTeamId: (s: string) => void
  setScreen: (s: Screen) => void
  startNewDynasty: (args: { coachName: string; userTeamId: ID; seasonYear: number }) => Promise<void>
}) {
  const { coachName, setCoachName, selectedTeamId, setSelectedTeamId, setScreen, startNewDynasty } = props
  const [searchQuery, setSearchQuery] = useState('')

  // Group teams by conference
  const teamsByConference = useMemo(() => {
    const grouped: Record<string, typeof TEAMS> = {}
    const noConference: typeof TEAMS = []

    for (const team of TEAMS) {
      const confId = team.conferenceId || 'independent'
      if (!grouped[confId]) {
        grouped[confId] = []
      }
      grouped[confId].push(team)
    }

    return { grouped, noConference }
  }, [])

  // Filter teams by search query
  const filteredTeamsByConference = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return teamsByConference.grouped

    const filtered: Record<string, typeof TEAMS> = {}
    
    for (const [confId, teams] of Object.entries(teamsByConference.grouped)) {
      const matching = teams.filter(
        team =>
          team.name.toLowerCase().includes(query) ||
          team.city.toLowerCase().includes(query) ||
          team.state.toLowerCase().includes(query) ||
          team.nickname.toLowerCase().includes(query) ||
          (team.conferenceId && CONFERENCES.find(c => c.id === team.conferenceId)?.name.toLowerCase().includes(query))
      )
      if (matching.length > 0) {
        filtered[confId] = matching
      }
    }

    return filtered
  }, [searchQuery, teamsByConference])

  // Get conference name
  function getConferenceName(confId: string): string {
    return CONFERENCES.find(c => c.id === confId)?.name || 'Independent'
  }

  // Sort conferences by name
  const sortedConferenceIds = useMemo(() => {
    return Object.keys(filteredTeamsByConference).sort((a, b) => {
      const nameA = getConferenceName(a)
      const nameB = getConferenceName(b)
      return nameA.localeCompare(nameB)
    })
  }, [filteredTeamsByConference])

  // Prestige badge color helper
  function getPrestigeColor(prestige: number): string {
    if (prestige >= 90) return '#4caf50' // Green - Elite
    if (prestige >= 80) return '#8bc34a' // Light green - Very strong
    if (prestige >= 70) return '#ffc107' // Yellow - Solid
    if (prestige >= 60) return '#ff9800' // Orange - Average
    return '#9e9e9e' // Gray - Below average
  }

  function getPrestigeLabel(prestige: number): string {
    if (prestige >= 90) return 'Elite'
    if (prestige >= 80) return 'Very Strong'
    if (prestige >= 70) return 'Solid'
    if (prestige >= 60) return 'Average'
    return 'Rebuilding'
  }

  const canCreate = coachName.trim().length > 0 && selectedTeamId.length > 0

  async function handleCreate() {
    if (!canCreate) return
    
    try {
      // Check if window.api is available
      if (typeof window === 'undefined' || !window.api) {
        throw new Error('Electron API not available. Please restart the app (close and reopen).')
      }
      
      if (!window.api.saveDynasty) {
        throw new Error('saveDynasty function not available. Please restart the dev server.')
      }
      
      await startNewDynasty({
        coachName: coachName.trim(),
        userTeamId: selectedTeamId as ID,
        seasonYear: 2026,
      })
      setScreen('dynastyHub')
    } catch (error) {
      console.error('Failed to create dynasty:', error)
      console.error('window.api:', window.api)
      console.error('window.api?.saveDynasty:', window.api?.saveDynasty)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create dynasty: ${errorMessage}\n\nCheck the browser console (F12) for more details.\n\nTry: 1) Restart the dev server, 2) Close and reopen the app window`)
    }
  }

  return (
    <section className="card wide">
      <h2 className="cardTitle">New Dynasty</h2>

      <div className="grid2" style={{ marginBottom: 16 }}>
        <label className="field">
          <div className="fieldLabel">Coach name</div>
          <input
            className="input"
            value={coachName}
            onChange={e => setCoachName(e.target.value)}
            placeholder="Enter your name"
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Search teams</div>
          <input
            className="input"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, city, or conference..."
          />
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="fieldLabel" style={{ marginBottom: 8 }}>Select team</div>
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          {sortedConferenceIds.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
              No teams found matching "{searchQuery}"
            </div>
          ) : (
            sortedConferenceIds.map(confId => {
              const teams = filteredTeamsByConference[confId]
              if (!teams || teams.length === 0) return null

              // Sort teams by prestige (descending)
              const sortedTeams = [...teams].sort((a, b) => b.prestige - a.prestige)

              return (
                <div key={confId}>
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(11, 18, 32, 0.95)',
                      backdropFilter: 'blur(8px)',
                      borderBottom: '1px solid var(--border)',
                      borderTop: '1px solid var(--border)',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--muted)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      marginBottom: 0,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {getConferenceName(confId)}
                  </div>
                  {sortedTeams.map((team, teamIndex) => {
                    const isSelected = selectedTeamId === team.id
                    const isFirstTeam = teamIndex === 0
                    return (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeamId(team.id)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                          color: isSelected ? 'var(--text-on-primary)' : 'var(--text)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '16px',
                          transition: 'background-color 0.2s',
                          position: 'relative',
                          zIndex: 1,
                          marginTop: isFirstTeam ? 0 : 0,
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div 
                            style={{ 
                              fontWeight: isSelected ? 600 : 500, 
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {team.name}
                          </div>
                          <div 
                            style={{ 
                              fontSize: '12px', 
                              opacity: 0.8,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {team.city}, {team.state} • {team.nickname}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 4,
                            flexShrink: 0,
                            minWidth: '80px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: isSelected ? 'var(--text-on-primary)' : getPrestigeColor(team.prestige),
                            }}
                          >
                            {team.prestige}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              opacity: 0.7,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {getPrestigeLabel(team.prestige)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>

      {selectedTeamId && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 4 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 4 }}>Selected Team:</div>
          {(() => {
            const team = TEAMS.find(t => t.id === selectedTeamId)
            if (!team) return null
            return (
              <div style={{ fontSize: '14px' }}>
                {team.name} ({team.prestige} prestige) • {getConferenceName(team.conferenceId || 'independent')}
              </div>
            )
          })()}
        </div>
      )}

      <div className="row">
        <button className="btn secondary" onClick={() => setScreen('home')}>
          Cancel
        </button>
        <button
          className="btn"
          onClick={handleCreate}
          disabled={!canCreate}
        >
          Create Dynasty
        </button>
      </div>
    </section>
  )
}
