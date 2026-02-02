import { useEffect, useState } from 'react'
import type { Dynasty, ID } from '../../game/types/dynasty'
import type { Screen } from '../../game/types'
import type { BracketGame, TournamentBracket } from '../../game/engine/tournament/generateBracket'
import type { TournamentSelection, TournamentTeam } from '../../game/engine/tournament/selectTournament'
import { BracketVisualization } from '../components/BracketVisualization'
import { advanceToOffseason } from '../../game/engine/development/advanceToOffseason'
import type { BracketWorkerPayload, BracketWorkerResponse } from '../workers/bracketWorker'

const QA_PERF = Boolean(import.meta.env.VITE_QA_PERF_LOG)

function mark(name: string) {
  if (!QA_PERF || typeof performance === 'undefined') return
  performance.mark(name)
}

function measure(name: string, start: string, end: string) {
  if (!QA_PERF || typeof performance === 'undefined') return
  try {
    performance.mark(end)
    performance.measure(name, start, end)
  } catch {}
}

function mergeTournament(
  baseTournament: TournamentBracket,
  workerBracket?: BracketWorkerPayload['bracket']
): TournamentBracket {
  if (!workerBracket) return baseTournament

  const baseSelection = baseTournament.selection
  const workerSelection = workerBracket.selection as Partial<TournamentSelection> | undefined
  const baseTeamsById = new Map<string, TournamentTeam>(
    baseSelection.allTeams.map(t => [t.teamId, t])
  )

  const workerTeams = workerSelection?.allTeams
  const mergedTeams: TournamentTeam[] = (workerTeams ?? baseSelection.allTeams).map(t => {
    const base = baseTeamsById.get(t.teamId)
    return {
      teamId: t.teamId,
      seed: t.seed ?? base?.seed ?? 0,
      region: t.region ?? base?.region ?? 'East',
      isAutobid: base?.isAutobid ?? false,
      resumeScore: base?.resumeScore ?? 0,
      seedScore: base?.seedScore ?? 0,
    }
  })

  const mergedSelection: TournamentSelection = {
    seasonYear: workerSelection?.seasonYear ?? baseSelection.seasonYear,
    autobids: workerSelection?.autobids ?? baseSelection.autobids,
    atLarge: workerSelection?.atLarge ?? baseSelection.atLarge,
    allTeams: mergedTeams,
  }

  return {
    ...baseTournament,
    seasonYear: workerBracket.seasonYear ?? baseTournament.seasonYear,
    games: workerBracket.games ?? baseTournament.games,
    selection: mergedSelection,
  }
}

export function BracketScreen(props: {
  activeSave: Dynasty | null
  setScreen: (s: Screen) => void
  setActiveSave: (d: Dynasty) => void
  simulateTournamentGame?: (round: BracketGame['round']) => Promise<Dynasty | null>
}) {
  const { activeSave, setScreen, setActiveSave, simulateTournamentGame } = props

  const [bracketState, setBracketState] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error'
    data?: BracketWorkerPayload
    message?: string
    progress?: string
  }>({ status: 'idle' })

  if (!activeSave) {
    return (
      <section className="card wide">
        <p className="cardText muted">No dynasty loaded.</p>
      </section>
    )
  }

  useEffect(() => {
    if (!activeSave?.dynastyId) return
    let canceled = false

    const worker = new Worker(new URL('../workers/bracketWorker.ts', import.meta.url), { type: 'module' })

    const startLoad = async () => {
      try {
        mark('bracket:load:start')
        setBracketState({ status: 'loading', message: 'Loading bracket...' })

        const rawResponse = await window.api?.loadDynastyRaw?.(activeSave.dynastyId)
        const rawPayload = rawResponse?.raw ?? JSON.stringify(activeSave)

        worker.postMessage({
          type: 'BRACKET_VIEW',
          dynastyId: activeSave.dynastyId,
          raw: rawPayload,
          view: 'bracket',
        })
      } catch (err) {
        if (!canceled) {
          setBracketState({ status: 'error', message: 'Failed to start bracket worker' })
        }
      }
    }

    worker.onmessage = (event: MessageEvent<BracketWorkerResponse>) => {
      if (canceled) return
      const msg = event.data
      if (!msg) return

      if (msg.type === 'PROGRESS') {
        if (QA_PERF) mark(`bracket:${msg.stage}`)
        setBracketState(prev => ({
          status: 'loading',
          data: prev.data,
          message: msg.detail ?? prev.message ?? 'Loading bracket...',
          progress: msg.stage,
        }))
        return
      }

      if (msg.type === 'ERROR') {
        setBracketState({ status: 'error', message: msg.message })
        return
      }

      if (msg.type === 'COMPLETE') {
        if (QA_PERF) mark('bracket:worker:complete')
        mark('bracket:data:ready')
        measure('bracket:load->ready', 'bracket:load:start', 'bracket:data:ready')
        setBracketState({ status: 'ready', data: msg.payload })
        return
      }
    }

    startLoad()

    return () => {
      canceled = true
      worker.terminate()
    }
  }, [activeSave?.dynastyId, activeSave?.lastSavedAtISO])

  useEffect(() => {
    if (!QA_PERF) return
    if (bracketState.status === 'ready') {
      mark('bracket:first-render')
      measure('bracket:ready->render', 'bracket:load:start', 'bracket:first-render')
    }
  }, [bracketState.status])

  const bracketData = bracketState.data
  const baseTournament = activeSave.league.tournament
  const workerBracket = bracketData?.bracket

  const tournament = workerBracket && baseTournament
    ? mergeTournament(baseTournament, workerBracket)
    : baseTournament
  const bracketTeamsById = bracketData?.teamsById ?? activeSave.league.teamsById ?? {}
  const bracketLayout = bracketData?.layout

  const championshipGame = tournament?.games?.find((g: any) => g.round === 'Championship')
  const championId = championshipGame?.winnerId ?? null
  const championTeam = championId ? bracketTeamsById[championId] : null
  const championSelection = championId
    ? tournament?.selection?.allTeams?.find((t: any) => t.teamId === championId)
    : null

  if (!tournament) {
    return (
      <section className="card wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="cardTitle" style={{ margin: 0 }}>National Tournament</h2>
          <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
            Back
          </button>
        </div>
        <p className="cardText muted">National Tournament not yet started. Complete the regular season first.</p>
      </section>
    )
  }


  return (
    <section className="card wide bracket-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="cardTitle" style={{ margin: 0 }}>
          National Tournament {tournament.seasonYear ?? activeSave.world.seasonYear}
        </h2>
        <button className="btn secondary" onClick={() => setScreen('dynastyHub')}>
          Back
        </button>
      </div>

      {bracketState.status === 'loading' && (
        <p className="cardText muted" style={{ marginTop: -4 }}>
          Loading bracket... {bracketState.progress ? `(${bracketState.progress})` : ''}
        </p>
      )}

      {bracketState.status === 'error' && (
        <p className="cardText" style={{ color: '#f87171', marginTop: -4 }}>
          {bracketState.message ?? 'Failed to load bracket data.'}
        </p>
      )}

      {championId && championTeam && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #22c55e 100%)',
            color: '#f8fafc',
            border: '2px solid rgba(255,255,255,0.12)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 0.5 }}>Champions</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Season {tournament.seasonYear ?? activeSave.world.seasonYear}</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '12px 16px',
                borderRadius: 10,
                fontSize: 22,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(34,197,94,0.2)',
                color: '#22c55e',
                fontWeight: 900,
              }}>
                🏆
              </span>
              <span>{championTeam.name}</span>
            </div>

            {championSelection && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 14, fontWeight: 700 }}>
                <span style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)' }}>
                  Seed #{championSelection.seed}
                </span>
                <span style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)' }}>
                  {championSelection.region}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tournament Summary */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="cardTitle" style={{ fontSize: '18px', marginBottom: 12 }}>
          Championship Bracket
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {(['East', 'West', 'South', 'Midwest'] as const).map(region => {
            const regionGames = tournament.games.filter(g => g.region === region)
            const completed = regionGames.filter(g => g.winnerId).length
            const total = regionGames.length
            return (
              <div key={region} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: 4 }}>{region}</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  {completed}/{total} games
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bracket Visualization */}
      <div style={{ padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <BracketVisualization bracket={tournament} teamsById={bracketTeamsById} layout={bracketLayout} />
      </div>

      {/* Tournament Controls */}
      {(() => {
        // Find the next round that has games to play
        const rounds: BracketGame['round'][] = [
          'Round of 64',
          'Round of 32',
          'Round of 16',
          'Quarter-Finals',
          'Semi-Finals',
          'Championship',
        ]
        
        let nextRound: BracketGame['round'] | null = null
        let unplayedGames = 0
        
        for (const round of rounds) {
          const gamesInRound = tournament.games.filter(g => g.round === round && !g.winnerId && g.team1Id && g.team2Id)
          if (gamesInRound.length > 0) {
            nextRound = round
            unplayedGames = gamesInRound.length
            break
          }
        }

        const allGames = tournament.games.length
        const completedGames = tournament.games.filter(g => g.winnerId).length
        const tournamentComplete = completedGames === allGames

        return (
          <div style={{ display: 'flex', gap: 12, marginTop: 24, marginBottom: 24 }}>
            {!tournamentComplete && nextRound && (
              <button 
                className="btn primary"
                onClick={async () => {
                  try {
                    const updated = await simulateTournamentGame?.(nextRound!)
                    if (updated) {
                      setActiveSave(updated)
                    }
                  } catch (error) {
                    console.error('Failed to simulate tournament game:', error)
                    alert('Failed to simulate tournament game. Check console for details.')
                  }
                }}
                disabled={!simulateTournamentGame}
              >
                🏀 Sim {nextRound} ({unplayedGames} {unplayedGames === 1 ? 'game' : 'games'})
              </button>
            )}
            <button 
              className="btn secondary"
              onClick={() => setScreen('dynastyHub')}
            >
              Back to Hub
            </button>
          </div>
        )
      })()}

      {/* Tournament Summary & Stats */}
      <TournamentSummary 
        tournament={tournament} 
        teamsById={bracketTeamsById}
        setActiveSave={setActiveSave} 
        setScreen={setScreen} 
        activeSave={activeSave} 
      />
    </section>
  )
}

function TournamentSummary(props: { tournament: any, teamsById: Record<ID, { name: string }>, setActiveSave: (d: Dynasty) => void, setScreen: (s: Screen) => void, activeSave: Dynasty }) {
  const { tournament, teamsById, setActiveSave, setScreen, activeSave } = props

  const getTeamName = (teamId: ID) => {
    return teamsById[teamId]?.name ?? teamId
  }

  // Calculate tournament statistics
  const allGames = tournament.games || []
  const completedGames = allGames.filter((g: any) => g.winnerId)
  const totalGames = allGames.length
  const progress = totalGames > 0 ? Math.round((completedGames.length / totalGames) * 100) : 0

  // Get region stats
  const regionStats = (['East', 'West', 'South', 'Midwest'] as const).map(region => {
    const regionGames = tournament.games.filter((g: any) => g.region === region)
    const completed = regionGames.filter((g: any) => g.winnerId).length
    const total = regionGames.length
    const regionProgress = total > 0 ? Math.round((completed / total) * 100) : 0
    
    // Get remaining teams in region
    const remainingTeams = regionGames
      .filter((g: any) => g.round === 'Quarter-Finals' && g.winnerId)
      .map((g: any) => g.winnerId)
      .filter(Boolean)
    
    return { region, completed, total, progress: regionProgress, remainingTeams }
  })

  // Get National Semifinals teams (participants in the Semi-Finals)
  const semiFinals = tournament.games.filter((g: any) => g.round === 'Semi-Finals')
  const nationalSemifinalTeams = semiFinals
    .flatMap((g: any) => [g.team1Id, g.team2Id])
    .filter(Boolean)

  // Get championship teams
  const championship = tournament.games.find((g: any) => g.round === 'Championship')
  const championshipTeams = championship 
    ? [championship.team1Id, championship.team2Id].filter(Boolean)
    : []

  // Check if tournament is complete (championship has a winner)
  const isTournamentComplete = championship?.winnerId != null

  // Get top seeds remaining: teams that have a pending game (haven't been eliminated)
  const allRemainingTeams = tournament.selection.allTeams.filter((team: any) => {
    // Team is considered still alive if there exists a game where they are a participant
    // and that game has not yet been decided (winnerId is null)
    const hasPendingGame = tournament.games.some((g: any) => (
      (g.team1Id === team.teamId || g.team2Id === team.teamId) && g.winnerId == null
    ))
    return hasPendingGame
  })

  const topSeedsRemaining = allRemainingTeams
    .sort((a: any, b: any) => a.seed - b.seed)
    .slice(0, 8)

  // Get biggest upsets
  const upsets = completedGames
    .filter((game: any) => {
      if (!game.team1Id || !game.team2Id || !game.winnerId) return false
      const team1 = tournament.selection.allTeams.find((t: any) => t.teamId === game.team1Id)
      const team2 = tournament.selection.allTeams.find((t: any) => t.teamId === game.team2Id)
      if (!team1 || !team2) return false
      
      const winner = game.winnerId === game.team1Id ? team1 : team2
      const loser = game.winnerId === game.team1Id ? team2 : team1
      return winner.seed > loser.seed + 2 // At least 3 seed difference
    })
    .slice(0, 5)

  return (
    <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
      {/* Tournament Progress */}
      <div className="card">
        <h3 className="cardTitle" style={{ fontSize: '16px', marginBottom: 12 }}>Tournament Progress</h3>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--muted)' }}>Games Completed</span>
            <span style={{ fontWeight: 700 }}>{completedGames.length} / {totalGames}</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: 8, 
            background: 'var(--panel)', 
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: 'var(--primary)',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {progress}% Complete
        </div>
      </div>

      {/* Region Progress */}
      <div className="card">
        <h3 className="cardTitle" style={{ fontSize: '16px', marginBottom: 12 }}>Region Progress</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {regionStats.map(({ region, completed, total, progress }) => (
            <div key={region}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{region}</span>
                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                  {completed}/{total}
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: 4, 
                background: 'var(--panel)', 
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${progress}%`, 
                  height: '100%', 
                  background: 'var(--primary)',
                  opacity: 0.6
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* National Semifinals */}
      {nationalSemifinalTeams.length > 0 && (
        <div className="card">
          <h3 className="cardTitle" style={{ fontSize: '16px', marginBottom: 12 }}>National Semifinals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nationalSemifinalTeams.map((teamId: ID) => {
              const team = tournament.selection.allTeams.find((t: any) => t.teamId === teamId)
              const teamName = getTeamName(teamId)
              return team ? (
                <div key={teamId} style={{ 
                  padding: '8px 12px', 
                  background: 'var(--panel)', 
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600 }}>{teamName}</span>
                  <span style={{ 
                    color: 'var(--primary)', 
                    fontWeight: 700,
                    fontSize: '13px'
                  }}>
                    #{team.seed} {team.region}
                  </span>
                </div>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Championship Matchup */}
      {championshipTeams.length === 2 && (
        <div className="card">
          <h3 className="cardTitle" style={{ fontSize: '16px', marginBottom: 12 }}>Championship Matchup</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {championshipTeams.map((teamId: ID) => {
              const team = tournament.selection.allTeams.find((t: any) => t.teamId === teamId)
              const teamName = getTeamName(teamId)
              return team ? (
                <div key={teamId} style={{ 
                  padding: '10px 14px', 
                  background: 'var(--panel2)', 
                  borderRadius: 4,
                  border: '2px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{teamName}</span>
                  <span style={{ 
                    color: 'var(--primary)', 
                    fontWeight: 700,
                    fontSize: '14px'
                  }}>
                    #{team.seed} {team.region}
                  </span>
                </div>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Top Seeds Remaining */}
      {topSeedsRemaining.length > 0 && (
        <div className="card">
          <h3 className="cardTitle" style={{ fontSize: '16px', marginBottom: 12 }}>Top Seeds Remaining</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topSeedsRemaining.map((team: any) => {
              const teamName = getTeamName(team.teamId)
              return (
                <div key={team.teamId} style={{ 
                  padding: '6px 10px', 
                  background: 'var(--panel)', 
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px'
                }}>
                  <span>#{team.seed} {teamName}</span>
                  <span style={{ color: 'var(--muted)' }}>{team.region}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Biggest Upsets */}
      {upsets.length > 0 && (
        <div className="card">
          <h3 className="cardTitle" style={{ fontSize: '16px', marginBottom: 12 }}>Biggest Upsets</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upsets.map((game: any, idx: number) => {
              const team1 = tournament.selection.allTeams.find((t: any) => t.teamId === game.team1Id)
              const team2 = tournament.selection.allTeams.find((t: any) => t.teamId === game.team2Id)
              if (!team1 || !team2) return null
              
              const winner = game.winnerId === game.team1Id ? team1 : team2
              const loser = game.winnerId === game.team1Id ? team2 : team1
              const winnerName = getTeamName(winner.teamId)
              const loserName = getTeamName(loser.teamId)
              
              return (
                <div key={idx} style={{ 
                  padding: '8px 12px', 
                  background: 'var(--panel)', 
                  borderRadius: 4,
                  fontSize: '13px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    #{winner.seed} {winnerName} over #{loser.seed} {loserName}
                  </div>
                  {game.score1 !== null && game.score2 !== null && (
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      {game.score1} - {game.score2}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Advance to Offseason Button */}
      {isTournamentComplete && (
        <div style={{ gridColumn: '1 / -1', marginTop: 24, textAlign: 'center' }}>
          <button 
            className="btn primary" 
            onClick={() => {
              const newDynasty = advanceToOffseason(activeSave)
              setActiveSave(newDynasty)
              setScreen('dynastyHub')
            }}
          >
            🏆 Tournament Complete! Advance to Offseason
          </button>
          <p className="cardText muted" style={{ marginTop: 8, fontSize: '13px' }}>
            Players will graduate, progress, and new recruits will join your roster.
          </p>
        </div>
      )}
    </div>
  )
}
