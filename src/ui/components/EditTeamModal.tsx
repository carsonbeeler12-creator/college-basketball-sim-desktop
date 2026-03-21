import { useState } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'
import { TEAMS } from '../../game/defaultData'

export function EditTeamModal(props: {
  dynasty: Dynasty
  teamId: ID
  onClose: () => void
  onSave: (teamId: ID, teamName: string) => void
}) {
  const { dynasty, teamId, onClose, onSave } = props
  const teamState = dynasty.league.teamsById[teamId]

  if (!teamState) return null

  const [teamName, setTeamName] = useState(teamState.name)

  const handleSave = () => {
    if (teamName.trim()) {
      onSave(teamId, teamName.trim())
      onClose()
    }
  }

  const handleReset = () => {
    const canonical = TEAMS.find(t => t.id === teamId)?.name ?? teamState.name
    setTeamName(canonical)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#2a2a2e',
        border: '2px solid #4a9d6f',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(74, 157, 111, 0.2)',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: 'var(--text)' }}>
          Edit Team Name
        </h3>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: 6,
            textTransform: 'uppercase',
          }}>
            Team Name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--darkBg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
        }}>
          <button
            className="btn secondary"
            onClick={handleReset}
            style={{ marginRight: 'auto' }}
          >
            Reset
          </button>
          <button
            className="btn secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
