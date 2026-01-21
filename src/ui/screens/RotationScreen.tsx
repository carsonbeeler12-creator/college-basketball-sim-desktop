import { useMemo, useState } from 'react'
import { TEAMS } from '../../game/defaultData'
import type { Dynasty, ID, Position, RotationStyle } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import { getUserTeamState } from '../hooks/useRotationController'

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

function clampInt(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, Math.trunc(n)))
}

function playerLabel(save: Dynasty, pid: ID) {
  const p = save.playersById?.[pid]
  if (!p) return pid
  return `${p.identity.firstName} ${p.identity.lastName} — ${p.identity.position} — OVR ${p.ratings.overall}`
}

function teamName(teamId: string) {
  return TEAMS.find(t => t.id === teamId)?.name ?? teamId
}

export function RotationScreen(props: {
  activeSave: Dynasty | null
  activeTeamName: string | null
  setScreen: (s: Screen) => void

  useManualTargets: boolean
  setUseManualTargets: (v: boolean) => void

  minutesPreview: Record<ID, number> | null
  userTeamHasRotation: boolean

  setRotationStyle: (style: RotationStyle) => Promise<void> | void
  moveDepthChart: (playerId: ID, pos: Position, delta: -1 | 1) => Promise<void> | void
  setPlayerManualMinutes: (playerId: ID, minutes: number) => Promise<void> | void
  resetManualMinutesToAuto: () => Promise<void> | void
}) {
  const {
    activeSave,
    activeTeamName,
    setScreen,
    useManualTargets,
    setUseManualTargets,
    minutesPreview,
    userTeamHasRotation,
    setRotationStyle,
    moveDepthChart,
    setPlayerManualMinutes,
    resetManualMinutesToAuto,
  } = props

  const [minutesDraftByPid, setMinutesDraftByPid] = useState<Record<ID, string>>({})

  const activeTeamId = useMemo(() => activeSave?.league.userTeamId ?? null, [activeSave])

  const rotationStyle = useMemo(() => {
    if (!activeSave) return 'NORMAL' as RotationStyle
    const ts = getUserTeamState(activeSave)
    return (ts?.rotation?.settings?.style ?? 'NORMAL') as RotationStyle
  }, [activeSave])

  if (!activeSave || !activeTeamId) {
    return (
      <section className="card wide">
        <h2 className="cardTitle">Rotation</h2>
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  if (!userTeamHasRotation) {
    return (
      <section className="card wide">
        <h2 className="cardTitle">Rotation</h2>
        <p className="cardText muted">This save is missing rotation data. Create a NEW dynasty.</p>
        <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
          Back
        </button>
      </section>
    )
  }

  const teamState = getUserTeamState(activeSave)!
  const dc = teamState.rotation.depthChart ?? ({} as Record<Position, ID[]>)

  return (
    <section className="card wide">
      <h2 className="cardTitle">Rotation</h2>

      <div className="hubHeader">
        <div>
          <div className="hubTeam">{activeTeamName ?? teamName(activeTeamId)}</div>
          <div className="hubMeta">
            Coach {activeSave.coach.name} • Season {activeSave.world.seasonYear}
          </div>
        </div>
        <div className="hubMeta right">
          <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
            Back
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 12, justifyContent: 'flex-start', marginBottom: 12 }}>
        <div className="field" style={{ maxWidth: 280 }}>
          <div className="fieldLabel">Rotation style</div>
          <select
            className="input"
            value={rotationStyle}
            onChange={e => setRotationStyle(e.target.value as RotationStyle)}
          >
            <option value="TIGHT">Tight</option>
            <option value="NORMAL">Normal</option>
            <option value="DEEP">Deep</option>
          </select>
        </div>

        <div className="field" style={{ maxWidth: 320 }}>
          <div className="fieldLabel">Manual targets</div>
          <label className="cardText" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={useManualTargets}
              onChange={e => {
                setUseManualTargets(e.target.checked)
                setMinutesDraftByPid({})
              }}
            />
            Use manual minutes (0 = auto)
          </label>
          <div className="cardText muted">Manual minutes are locked; auto fills the rest to 200.</div>
        </div>

        <div className="field" style={{ maxWidth: 320 }}>
          <div className="fieldLabel">Preview total</div>
          <div className="cardText muted">
            {minutesPreview ? Object.values(minutesPreview).reduce((a, b) => a + b, 0) : 0} minutes
          </div>
          <button className="btn secondary" onClick={resetManualMinutesToAuto} style={{ marginTop: 8 }}>
            Reset all to Auto
          </button>
        </div>
      </div>

      <div className="grid2">
        <section className="card">
          <h3 className="cardTitle">Depth Chart + Targets</h3>

          {POSITIONS.map(pos => {
            const list = dc[pos] ?? []
            return (
              <div key={pos} style={{ marginBottom: 14 }}>
                <div className="cardText" style={{ fontWeight: 700, marginBottom: 6 }}>
                  {pos}
                </div>

                <div className="list">
                  {list.map((pid, idx) => {
                    const stored = (teamState.rotation.minutesTargetByPlayerId?.[pid] ?? 0) as number
                    const draft = minutesDraftByPid[pid]
                    const showValue = draft !== undefined ? draft : String(stored)

                    return (
                      <div key={pid} className="listRow" style={{ cursor: 'default' }}>
                        <div className="listRowTitle">{idx + 1}. {playerLabel(activeSave, pid)}</div>

                        <div className="listRowSub" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button className="btn secondary" onClick={() => moveDepthChart(pid, pos, -1)} disabled={idx === 0}>
                            Up
                          </button>
                          <button
                            className="btn secondary"
                            onClick={() => moveDepthChart(pid, pos, 1)}
                            disabled={idx === list.length - 1}
                          >
                            Down
                          </button>

                          <div style={{ marginLeft: 12 }}>
                            <span className="cardText muted" style={{ marginRight: 8 }}>
                              Minutes:
                            </span>
                            <input
                              className="input"
                              style={{ width: 80, display: 'inline-block' }}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              disabled={!useManualTargets}
                              value={showValue}
                              onFocus={e => {
                                setMinutesDraftByPid(prev => ({ ...prev, [pid]: String(stored) }))
                                ;(e.target as HTMLInputElement).select()
                              }}
                              onChange={e => {
                                const raw = e.target.value
                                if (raw === '') {
                                  setMinutesDraftByPid(prev => ({ ...prev, [pid]: '' }))
                                  return
                                }
                                const digits = raw.replace(/\D/g, '').slice(0, 2)
                                setMinutesDraftByPid(prev => ({ ...prev, [pid]: digits }))
                              }}
                              onBlur={async () => {
                                const raw = minutesDraftByPid[pid]
                                const parsed = raw === undefined || raw === '' ? 0 : Number(raw)
                                const safe = clampInt(parsed, 0, 40)

                                setMinutesDraftByPid(prev => {
                                  const next = { ...prev }
                                  delete next[pid]
                                  return next
                                })

                                await setPlayerManualMinutes(pid, safe)
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>

        <section className="card">
          <h3 className="cardTitle">Minutes Preview</h3>
          {!minutesPreview ? (
            <p className="cardText muted">No preview available.</p>
          ) : (
            <div className="list">
              {Object.entries(minutesPreview)
                .map(([pid, min]) => ({ pid: pid as ID, min, p: activeSave.playersById[pid as ID] }))
                .filter(x => x.p)
                .sort((a, b) => b.min - a.min)
                .map(x => (
                  <div key={x.pid} className="listRow" style={{ cursor: 'default' }}>
                    <div className="listRowTitle">
                      {x.p.identity.firstName} {x.p.identity.lastName} — {x.p.identity.position} — OVR {x.p.ratings.overall}
                    </div>
                    <div className="listRowSub">{x.min} min</div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}