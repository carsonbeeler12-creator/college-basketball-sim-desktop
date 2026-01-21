import { memo, useMemo } from 'react'
import type { BracketGame, TournamentBracket as EngineTournamentBracket } from '../../game/engine/tournament/generateBracket'
import type { Region, RegionLayout } from '../logic/bracketLayout'
import { REGION_ROUNDS, buildBracketLayout, rowStartFor } from '../logic/bracketLayout'

type ID = string
type TournamentSelectionTeam = EngineTournamentBracket['selection']['allTeams'][number]
type TournamentBracket = Pick<EngineTournamentBracket, 'games' | 'selection'>
type TeamsById = Record<string, { name: string } | any>

type Props = {
  bracket: TournamentBracket
  teamsById: TeamsById
  layout?: RegionLayout
}

const REGION_BORDER_COLORS: Record<'East' | 'West' | 'South' | 'Midwest', string> = {
  East: '#4A90E2',
  West: '#E24A4A',
  South: '#4AE24A',
  Midwest: '#E2A64A',
}

const LEFT_REGIONS: Region[] = ['South', 'East']
const RIGHT_REGIONS: Region[] = ['West', 'Midwest']

function getSeed(allTeams: TournamentSelectionTeam[], teamId: ID | null): number | null {
  if (!teamId) return null
  const t = allTeams.find(x => x.teamId === teamId)
  return t?.seed ?? null
}

function getTeamName(teamsById: TeamsById, teamId: ID | null): string {
  if (!teamId) return 'TBD'
  const teamData = teamsById?.[teamId]
  if (!teamData) {
    // Team not found in teamsById - this shouldn't happen
    console.warn(`Team ${teamId} not found in teamsById`)
    return 'TBD'
  }
  
  // Handle different possible structures
  if (typeof teamData === 'object') {
    // Could be { name: string, ... } or any TeamState object
    if ('name' in teamData && typeof teamData.name === 'string') {
      return teamData.name
    }
  }
  
  // Fallback - shouldn't reach here
  console.warn(`Team ${teamId} has no name property:`, teamData)
  return 'TBD'
}

const TeamRow = memo(function TeamRow({
  seed,
  name,
  isWinner,
  isEmpty,
}: {
  seed: number | null
  name: string
  isWinner: boolean
  isEmpty: boolean
}) {
  return (
    <div className={`bracket-team ${isEmpty ? 'bracket-team-empty' : ''} ${isWinner ? 'bracket-team-winner' : ''}`}>
      <span className="bracket-seed">{seed != null ? seed : ''}</span>
      <span className="bracket-team-name">{name}</span>
    </div>
  )
})

const Matchup = memo(function Matchup({
  borderColor,
  team1,
  team2,
  winnerId,
  className,
}: {
  borderColor: string
  team1: { seed: number | null; name: string; id: ID | null }
  team2: { seed: number | null; name: string; id: ID | null }
  winnerId: ID | null
  className: string
}) {
  const team1Winner = winnerId != null && team1.id != null && winnerId === team1.id
  const team2Winner = winnerId != null && team2.id != null && winnerId === team2.id

  return (
    <div className={`bracket-matchup ${className}`} style={{ borderColor }}>
      <TeamRow seed={team1.seed} name={team1.name} isWinner={team1Winner} isEmpty={!team1.id} />
      <TeamRow seed={team2.seed} name={team2.name} isWinner={team2Winner} isEmpty={!team2.id} />
    </div>
  )
})

// IMPORTANT: named export to match BracketScreen import
export function BracketVisualization({ bracket, teamsById, layout }: Props) {
  const games: BracketGame[] = bracket.games ?? []
  const allTeams: TournamentSelectionTeam[] = bracket.selection?.allTeams ?? []

  // Hard guard so you don't get a white screen if bracket is missing fields
  if (games.length === 0) {
    return <div className="cardText muted">No tournament games found.</div>
  }

  const gamesByRegionAndKey = useMemo(() => {
    if (layout) return layout
    return buildBracketLayout(games)
  }, [layout, games])

  return (
    <div className="bracket-wrapper">
      <div className="bracket-main" style={{ position: 'relative' }}>
        <div className="bracket-layout">
          {/* LEFT: South + East */}
          <div className="bracket-side bracket-side-left">
            {LEFT_REGIONS.map(region => {
              const color = REGION_BORDER_COLORS[region]
              const regionGames = gamesByRegionAndKey[region]

              return (
                <div key={region} className="bracket-region-container bracket-region-left">
                  <div className="bracket-region-header" style={{ color }}>
                    <h3 className="bracket-region-title">{region}</h3>
                  </div>

                  <div className="bracket-region-content">
                    {REGION_ROUNDS.map(col => {
                      const colGames = regionGames[col.key] ?? []

                      return (
                        <div key={col.key} className="bracket-round-column">
                          <div className="bracket-round-label">{col.label}</div>
                          <div className="bracket-round-games">
                            {colGames.length === 0 ? (
                              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '6px 0' }}>No games</div>
                            ) : (
                              colGames.map((g, idx) => {
                                const t1 = { id: g.team1Id, seed: getSeed(allTeams, g.team1Id), name: getTeamName(teamsById, g.team1Id) }
                                const t2 = { id: g.team2Id, seed: getSeed(allTeams, g.team2Id), name: getTeamName(teamsById, g.team2Id) }

                                return (
                                  <div
                                    key={g.gameId}
                                    className="bracket-matchup-container"
                                    style={{ gridRowStart: rowStartFor(col.key, idx) }}
                                  >
                                    <Matchup
                                      borderColor={color}
                                      className={
                                        col.key === 'round64'
                                          ? 'bracket-matchup-round64'
                                          : col.key === 'round32'
                                            ? 'bracket-matchup-round32'
                                            : col.key === 'round16'
                                              ? 'bracket-matchup-round16'
                                              : 'bracket-matchup-elite8'
                                      }
                                      team1={t1}
                                      team2={t2}
                                      winnerId={g.winnerId}
                                    />
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT: West + Midwest */}
          <div className="bracket-side bracket-side-right">
            {RIGHT_REGIONS.map(region => {
              const color = REGION_BORDER_COLORS[region]
              const regionGames = gamesByRegionAndKey[region]

              return (
                <div key={region} className="bracket-region-container bracket-region-right">
                  <div className="bracket-region-header" style={{ color }}>
                    <h3 className="bracket-region-title">{region}</h3>
                  </div>

                  <div className="bracket-region-content">
                    {REGION_ROUNDS.map(col => {
                      const colGames = regionGames[col.key] ?? []

                      return (
                        <div key={col.key} className="bracket-round-column">
                          <div className="bracket-round-label">{col.label}</div>
                          <div className="bracket-round-games">
                            {colGames.length === 0 ? (
                              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '6px 0' }}>No games</div>
                            ) : (
                              colGames.map((g, idx) => {
                                const t1 = { id: g.team1Id, seed: getSeed(allTeams, g.team1Id), name: getTeamName(teamsById, g.team1Id) }
                                const t2 = { id: g.team2Id, seed: getSeed(allTeams, g.team2Id), name: getTeamName(teamsById, g.team2Id) }

                                return (
                                  <div
                                    key={g.gameId}
                                    className="bracket-matchup-container"
                                    style={{ gridRowStart: rowStartFor(col.key, idx) }}
                                  >
                                    <Matchup
                                      borderColor={color}
                                      className={
                                        col.key === 'round64'
                                          ? 'bracket-matchup-round64'
                                          : col.key === 'round32'
                                            ? 'bracket-matchup-round32'
                                            : col.key === 'round16'
                                              ? 'bracket-matchup-round16'
                                              : 'bracket-matchup-elite8'
                                      }
                                      team1={t1}
                                      team2={t2}
                                      winnerId={g.winnerId}
                                    />
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER: National Semifinals & Championship */}
        {(() => {
          const semis = (bracket.games ?? [])
            .filter(g => g.round === 'Semi-Finals')
            .sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0))
          const championship = (bracket.games ?? []).find(g => g.round === 'Championship')

          const getTeamInfo = (teamId: ID | null) => ({
            id: teamId,
            seed: getSeed(allTeams, teamId),
            name: getTeamName(teamsById, teamId),
            region: allTeams.find(t => t.teamId === teamId)?.region ?? null,
          })

          const winnerId = championship?.winnerId ?? null
          const winnerName = winnerId ? getTeamName(teamsById, winnerId) : null
          const winnerSeed = winnerId ? getSeed(allTeams, winnerId) : null
          const winnerRegion = winnerId ? (allTeams.find(t => t.teamId === winnerId)?.region ?? null) : null

          return (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {/* National Semifinals */}
                <div className="card" style={{ gridColumn: '1 / 2' }}>
                  <h4 className="cardTitle" style={{ marginBottom: 8 }}>National Semifinals</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Array.from({ length: 2 }, (_, i) => semis[i] ?? { gameId: `semi_placeholder_${i}`, team1Id: null, team2Id: null, score1: null, score2: null }).map(g => {
                      const t1 = getTeamInfo(g.team1Id)
                      const t2 = getTeamInfo(g.team2Id)
                      const hasTeams = Boolean(g.team1Id || g.team2Id)
                      return (
                        <div key={g.gameId} style={{ padding: '10px 12px', background: 'var(--panel)', borderRadius: 6, border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>
                              {t1.seed ? `#${t1.seed} ` : ''}{t1.name}
                              {t1.region ? <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 12 }}>{t1.region}</span> : null}
                            </span>
                            <span style={{ fontWeight: 700 }}>
                              {t2.seed ? `#${t2.seed} ` : ''}{t2.name}
                              {t2.region ? <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 12 }}>{t2.region}</span> : null}
                            </span>
                          </div>
                          {hasTeams && (g.score1 != null || g.score2 != null) && (
                            <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                              <span>Scores</span>
                              <span>{g.score1 ?? '-'} - {g.score2 ?? '-'}</span>
                            </div>
                          )}
                          {!hasTeams && (
                            <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>Waiting for winners…</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Championship */}
                <div className="card" style={{ gridColumn: '2 / 3' }}>
                  <h4 className="cardTitle" style={{ marginBottom: 8 }}>Championship</h4>
                  {championship ? (
                    <div style={{ padding: '10px 14px', background: 'var(--panel2)', borderRadius: 8, border: '2px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontWeight: 700 }}>
                          #{getSeed(allTeams, championship.team1Id) ?? ''} {getTeamName(teamsById, championship.team1Id)}
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          #{getSeed(allTeams, championship.team2Id) ?? ''} {getTeamName(teamsById, championship.team2Id)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="cardText muted">No championship game found.</div>
                  )}
                </div>

                {/* Winner Banner */}
                <div className="card" style={{ gridColumn: '3 / 4', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 96 }}>
                  {winnerId ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Champions</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {winnerName}
                        {winnerSeed != null && winnerRegion ? (
                          <span style={{ color: 'var(--primary)', marginLeft: 8 }}>#{winnerSeed} {winnerRegion}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="cardText muted">Awaiting champion...</div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
 