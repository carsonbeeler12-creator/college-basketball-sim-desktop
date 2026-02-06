// src/ui/screens/ConferenceTournamentsScreen.tsx

import type { Dynasty, ConferenceTournamentBracket } from '../../game/types/dynasty'
import { useState } from 'react'

function getConferenceColor(confId: string) {
  const palette = ['#2563eb', '#16a34a', '#f97316', '#8b5cf6', '#06b6d4', '#f59e0b']
  const idx = Math.abs(hash(confId)) % palette.length
  return palette[idx]
}

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h
}

function getNextRound(bracket: ConferenceTournamentBracket): string | null {
  // Include both actual games (both teams present) and bye games (missing winner advancement)
  const pending = bracket.games.filter(g => {
    // Actual games: both teams, no winner
    if (g.team1Id && g.team2Id && !g.winnerId) return true
    // Bye games: one team missing and no winner (team should auto-advance)
    if ((!g.team1Id || !g.team2Id) && !g.winnerId) return true
    return false
  })
  
  if (pending.length === 0) return null
  pending.sort((a, b) => a.day - b.day)
  return pending[0].round
}

function orderRounds(games: ConferenceTournamentBracket['games']): string[] {
  const rounds = Array.from(new Set(games.map(g => g.round)))
  rounds.sort((a, b) => minDay(games, a) - minDay(games, b))
  return rounds
}

function minDay(games: ConferenceTournamentBracket['games'], round: string): number {
  const days = games.filter(g => g.round === round).map(g => g.day)
  return days.length > 0 ? Math.min(...days) : 0
}

function ConferenceBracketDisplay({ bracket, accentColor, teamsById, userTeamId }: { 
  bracket: ConferenceTournamentBracket, 
  accentColor: string,
  teamsById: Dynasty['league']['teamsById'],
  userTeamId: string
}) {
  const rounds = orderRounds(bracket.games)
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {rounds.map(round => {
        const roundGames = bracket.games.filter(g => g.round === round)
        return (
          <div key={round}>
            <h3 style={{ 
              marginBottom: '0.75rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: accentColor,
              borderBottom: `2px solid ${accentColor}`,
              paddingBottom: '0.5rem'
            }}>
              {round}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {roundGames.map((game, idx) => {
                const team1Info = game.team1Id ? bracket.teams?.find(t => t.teamId === game.team1Id) : null
                const team2Info = game.team2Id ? bracket.teams?.find(t => t.teamId === game.team2Id) : null
                const team1 = game.team1Id ? teamsById[game.team1Id] : null
                const team2 = game.team2Id ? teamsById[game.team2Id] : null
                const winner = game.winnerId 
                  ? (game.winnerId === game.team1Id ? 'team1' : 'team2')
                  : undefined
                
                // Skip displaying bye games (where one or both teams are missing)
                // These are handled automatically by the simulation
                if (!team1 && !team2) return null
                
                // For single-team bye (one team missing), only show if game hasn't been played yet
                // Once played, the winner has advanced and we don't need to show the bye
                const isBye = !team1 || !team2
                if (isBye && game.winnerId) return null
                
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '6px',
                      border: `1px solid ${accentColor}20`
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {team1 && (
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: team2 ? '0.5rem' : '0',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: winner === 'team1' ? `${accentColor}20` : (game.team1Id === userTeamId ? 'rgba(74, 157, 111, 0.1)' : 'transparent'),
                          borderRadius: '4px',
                          fontWeight: winner === 'team1' ? 'bold' : (game.team1Id === userTeamId ? 'bold' : 'normal'),
                          borderLeft: game.team1Id === userTeamId ? '3px solid #4a9d6f' : 'none',
                          paddingLeft: game.team1Id === userTeamId ? '0.25rem' : '0.5rem'
                        }}>
                          <span>
                            {team1Info ? `(${team1Info.seed}) ${team1.name}` : team1.name}
                          </span>
                          {game.score1 !== null && game.score1 !== undefined && (
                            <span style={{ fontSize: '1.125rem', marginLeft: '1rem' }}>
                              {game.score1}
                            </span>
                          )}
                          {winner === 'team1' && (
                            <span style={{ marginLeft: '0.5rem', color: accentColor }}>✓</span>
                          )}
                        </div>
                      )}
                      {team2 && (
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: winner === 'team2' ? `${accentColor}20` : (game.team2Id === userTeamId ? 'rgba(74, 157, 111, 0.1)' : 'transparent'),
                          borderRadius: '4px',
                          fontWeight: winner === 'team2' ? 'bold' : (game.team2Id === userTeamId ? 'bold' : 'normal'),
                          borderLeft: game.team2Id === userTeamId ? '3px solid #4a9d6f' : 'none',
                          paddingLeft: game.team2Id === userTeamId ? '0.25rem' : '0.5rem'
                        }}>
                          <span>
                            {team2Info ? `(${team2Info.seed}) ${team2.name}` : team2.name}
                          </span>
                          {game.score2 !== null && game.score2 !== undefined && (
                            <span style={{ fontSize: '1.125rem', marginLeft: '1rem' }}>
                              {game.score2}
                            </span>
                          )}
                          {winner === 'team2' && (
                            <span style={{ marginLeft: '0.5rem', color: accentColor }}>✓</span>
                          )}
                        </div>
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
  )
}

interface Props {
  dynasty: Dynasty
  onGenerateTournaments: () => Promise<void>
  onSimulateRound: (round: string) => Promise<void>
  onAdvanceToNationalSelection: () => Promise<void>
  setScreen?: (screen: any) => void
}

export function ConferenceTournamentsScreen({ 
  dynasty, 
  onGenerateTournaments, 
  onSimulateRound,
  onAdvanceToNationalSelection,
  setScreen
}: Props) {
  const { conferenceTournaments } = dynasty.league
  const [selectedConference, setSelectedConference] = useState<string | null>(null)
  
  const conferenceList = conferenceTournaments
    ? Object.entries(conferenceTournaments).map(([confId, bracket]) => ({
        id: confId,
        name: bracket.conferenceName || 'Conference Tournament',
        bracket
      }))
    : []

  const tournamentsGenerated = !!conferenceTournaments && Object.keys(conferenceTournaments).length > 0
  const allComplete = conferenceList.every(c => !getNextRound(c.bracket))
  
  // Find the next round to simulate across all conferences
  const nextGlobalRound = conferenceList.length > 0 
    ? conferenceList
        .map(c => getNextRound(c.bracket))
        .filter(Boolean)
        .reduce((acc, round) => {
          if (!acc) return round
          return acc // Return first non-null round
        }, null as string | null)
    : null

  // Auto-select first conference on load
  if (tournamentsGenerated && !selectedConference && conferenceList.length > 0) {
    setSelectedConference(conferenceList[0].id)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0a0a0a', color: '#fff' }}>
      {!tournamentsGenerated ? (
        <div style={{ flex: 1, padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ margin: 0 }}>Conference Tournaments</h1>
            {setScreen && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn secondary" onClick={() => setScreen?.('dynastyHub')}>
                  ← Back
                </button>
                <button className="btn secondary" onClick={() => setScreen?.('dynastyHub')}>
                  Home
                </button>
              </div>
            )}
          </div>
          <p style={{ marginBottom: '1rem', color: '#888' }}>
            Regular season is complete! Generate conference tournament brackets to begin.
          </p>
          <button
            onClick={onGenerateTournaments}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Generate Conference Tournaments
          </button>
        </div>
      ) : (
        <>
          {/* Left Sidebar */}
          <div style={{ 
            width: '320px',
            borderRight: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #333' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Conferences</h2>
                {setScreen && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn secondary" 
                      onClick={() => setScreen?.('dynastyHub')}
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      ↺
                    </button>
                  </div>
                )}
              </div>
              <div style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {conferenceList.length} tournaments
              </div>
              {nextGlobalRound && (
                <button
                  onClick={async () => {
                    // Simulate all conferences for this round (one call simulates all games in the round)
                    await onSimulateRound(nextGlobalRound)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                >
                  ⚡ Simulate All {nextGlobalRound}
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {conferenceList.map(conf => {
                  const accentColor = getConferenceColor(conf.id)
                  const championId = conf.bracket.champion
                  const championTeam = championId ? dynasty.league.teamsById[championId] : null
                  const nextRound = getNextRound(conf.bracket)
                  
                  // Debug: show what's happening for Atlantic Collegiate Conference
                  if (conf.name === 'Atlantic Collegiate Conference') {
                    console.log('ACC Debug:', {
                      confName: conf.name,
                      championId,
                      championTeam: championTeam?.name || 'NOT FOUND',
                      nextRound,
                      totalGames: conf.bracket.games.length,
                      games: conf.bracket.games.map(g => ({
                        round: g.round,
                        team1Id: g.team1Id,
                        team2Id: g.team2Id,
                        winnerId: g.winnerId
                      }))
                    })
                  }
                  
                  const isSelected = selectedConference === conf.id
                  
                  return (
                    <div
                      key={conf.id}
                      onClick={() => setSelectedConference(conf.id)}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: isSelected ? '#1a1a1a' : 'transparent',
                        border: `2px solid ${isSelected ? accentColor : '#333'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.25rem'
                      }}>
                        <div style={{ 
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          flex: 1
                        }}>
                          {conf.name}
                        </div>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: accentColor,
                            flexShrink: 0,
                            marginLeft: '0.5rem'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        {championTeam 
                          ? (
                            <span>
                              🏆 {championTeam.name}
                              <span style={{ 
                                marginLeft: '0.5rem',
                                padding: '0.125rem 0.375rem',
                                backgroundColor: '#16a34a',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                color: 'white'
                              }}>
                                AUTO-BID
                              </span>
                            </span>
                          )
                          : nextRound 
                            ? `⏸️ ${nextRound}`
                            : '✓ Complete'
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {allComplete && (
              <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
                <button
                  onClick={onAdvanceToNationalSelection}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  → National Tournament
                </button>
              </div>
            )}
          </div>
          
          {/* Right Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {selectedConference ? (() => {
              const conf = conferenceList.find(c => c.id === selectedConference)
              if (!conf) return null
              
              const accentColor = getConferenceColor(conf.id)
              const championId = conf.bracket.champion
              const championTeam = championId ? dynasty.league.teamsById[championId] : null
              const nextRound = getNextRound(conf.bracket)
              
              return (
                <div style={{ padding: '2rem' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>{conf.name}</h1>
                    {championTeam && (
                      <div style={{ 
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#16a34a20',
                        border: '2px solid #16a34a',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        color: '#16a34a',
                        fontWeight: 'bold',
                        marginTop: '0.5rem'
                      }}>
                        🏆 Champion: {championTeam.name}
                      </div>
                    )}
                  </div>
                  
                  {nextRound && (
                    <div style={{ marginBottom: '2rem' }}>
                      <button
                        onClick={() => onSimulateRound(nextRound)}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: accentColor,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        Simulate {nextRound} →
                      </button>
                    </div>
                  )}
                  
                  <ConferenceBracketDisplay 
                    bracket={conf.bracket} 
                    accentColor={accentColor} 
                    teamsById={dynasty.league.teamsById}
                    userTeamId={dynasty.league.userTeamId}
                  />
                </div>
              )
            })() : (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
                fontSize: '1.125rem'
              }}>
                ← Select a conference to view bracket
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
