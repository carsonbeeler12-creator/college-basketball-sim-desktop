import { useState } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'

export function EditPlayerModal(props: {
  dynasty: Dynasty
  playerId: ID
  onClose: () => void
  onSave: (playerId: ID, firstName: string, lastName: string) => void
}) {
  const { dynasty, playerId, onClose, onSave } = props
  const player = dynasty.playersById[playerId]

  if (!player) return null

  const [firstName, setFirstName] = useState(player.identity.firstName)
  const [lastName, setLastName] = useState(player.identity.lastName)

  const handleSave = () => {
    if (firstName.trim() && lastName.trim()) {
      onSave(playerId, firstName.trim(), lastName.trim())
      onClose()
    }
  }

  const handleReset = () => {
    // Would need access to original names - for now just clear to defaults
    setFirstName(player.identity.firstName)
    setLastName(player.identity.lastName)
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
          Edit Player Name
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: 6,
            textTransform: 'uppercase',
          }}>
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
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

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: 6,
            textTransform: 'uppercase',
          }}>
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
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
