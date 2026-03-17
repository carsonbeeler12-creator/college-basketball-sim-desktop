import { useMemo, useState } from 'react'
import './App.css'

import { TEAMS } from './game/defaultData'
import type { Dynasty, PlayerState, ID } from './game/types/dynasty'
import type { Screen } from './game/types'
import { formatGameDayShort } from './ui/utils/format'

import { useDynastyController } from './ui/hooks/useDynastyController'
import { useRotationController, getUserTeamState } from './ui/hooks/useRotationController'

import { HomeScreen } from './ui/screens/HomeScreen'
import { NewDynastyScreen } from './ui/screens/NewDynastyScreen'
import { DynastyHubScreen } from './ui/screens/DynastyHubScreen'
import { RosterScreen } from './ui/screens/RosterScreen'
import { RotationScreen } from './ui/screens/RotationScreen'
import { SimScreen } from './ui/screens/SimScreen'
import { SimResultsScreen } from './ui/screens/SimResultsScreen'
import { BoxScoreScreen } from './ui/screens/BoxScoreScreen'
import { RecruitingScreen } from './ui/screens/RecruitingScreen'
import { DraftDeparturesScreen } from './ui/screens/DraftDeparturesScreen'
import { StandingsScreen } from './ui/screens/StandingsScreen'
import { RankingsScreen } from './ui/screens/RankingsScreen'
import { TeamDetailScreen } from './ui/screens/TeamDetailScreen'
import { BracketScreen } from './ui/screens/BracketScreen'
import { ConferenceTournamentsScreen } from './ui/screens/ConferenceTournamentsScreen'

function App() {
  const [screen, setScreen] = useState<Screen>('home')

  const [coachName, setCoachName] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState<string>(TEAMS[0]?.id ?? '')

  const [useManualTargets, setUseManualTargets] = useState(false)
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [viewingTeamId, setViewingTeamId] = useState<ID | null>(null)

  const dynastyCtl = useDynastyController()
  const activeSave = dynastyCtl.activeSave

  // ✅ This is the "setActiveSave" you want to pass to screens.
  // It persists AND updates activeSave through the controller.
  const setActiveSave = dynastyCtl.persistActiveSave

  const activeTeam = useMemo(() => {
    return TEAMS.find(t => t.id === activeSave?.league.userTeamId) ?? null
  }, [activeSave])

  const activeTeamName = activeTeam?.name ?? null

  const activeRoster = useMemo(() => {
    if (!activeSave || !activeTeam) return []
    const teamState = activeSave.league.teamsById?.[activeTeam.id]
    const pids = teamState?.roster?.playerIds ?? []
    const players = pids.map(pid => activeSave.playersById[pid]).filter(Boolean) as PlayerState[]
    players.sort((a, b) => (b.ratings.overall ?? 0) - (a.ratings.overall ?? 0))
    return players
  }, [activeSave, activeTeam])

  // Only show the most recent sim week's games (cleared at next sim start)
  const recentGames = useMemo(() => dynastyCtl.recentSimGames, [dynastyCtl.recentSimGames])

  const upcomingGame = useMemo(() => {
    if (!activeSave?.league.schedule) return null
    const userTeamId = activeSave.league.userTeamId
    const currentDay = activeSave.world.day
    const schedule = activeSave.league.schedule
    
    // Find next game for user's team
    for (let day = currentDay; day <= currentDay + 30; day++) {
      const gamesOnDay = schedule.gamesByDay[day] ?? []
      const userGame = gamesOnDay.find(
        g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
      )
      if (userGame) {
        return {
          ...userGame,
          opponent: userGame.homeTeamId === userTeamId ? userGame.awayTeamId : userGame.homeTeamId,
          isHome: userGame.homeTeamId === userTeamId,
        }
      }
    }
    return null
  }, [activeSave])

  const rotationCtl = useRotationController({
    activeSave: activeSave as Dynasty | null,
    useManualTargets,
    persistActiveSave: dynastyCtl.persistActiveSave,
  })

  const userTeamHasRotation = !!(activeSave ? getUserTeamState(activeSave as Dynasty)?.rotation?.depthChart : null)

  async function onSimWeek() {
    await dynastyCtl.handleSimWeek()
  }

  function onOpenGame(gameId: string) {
    setActiveGameId(gameId)
    setScreen('boxScore')
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brand">
          <div className="brandMark" />
          <div className="brandText">
            <div className="brandTitle">College Hoops Sim</div>
            <div className="brandSub">Dynasty Mode</div>
          </div>
        </div>

        <div className="topBarRight">
          {activeSave && activeTeam ? (
            <div className="activeBadge">
              <div className="activeBadgeLine1">{activeTeam.name}</div>
              <div className="activeBadgeLine2">
                Coach {activeSave.coach.name} • Season {activeSave.world.seasonYear} • {formatGameDayShort(activeSave.world.day, activeSave.world.seasonYear)}
                {(() => {
                  const teamState = activeSave.league.teamsById?.[activeTeam.id]
                  const wins = teamState?.season?.wins ?? 0
                  const losses = teamState?.season?.losses ?? 0
                  const totalGames = wins + losses
                  if (totalGames > 0) {
                    return ` • Record: ${wins}-${losses}`
                  }
                  return ''
                })()}
              </div>
            </div>
          ) : (
            <div className="activeBadge muted">
              <div className="activeBadgeLine1">No dynasty loaded</div>
              <div className="activeBadgeLine2">Create or load to begin</div>
            </div>
          )}

          {dynastyCtl.isSimulating && dynastyCtl.simProgress && (
            <div className="simProgress">
              <div className="simProgressText">
                Simulating: {dynastyCtl.simProgress.completed} / {dynastyCtl.simProgress.total} games
              </div>
              <div className="simProgressBarTrack">
                <div
                  className="simProgressBarFill"
                  style={{ width: `${(dynastyCtl.simProgress.completed / dynastyCtl.simProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {screen !== 'home' && (
            <button className="btn secondary" onClick={() => setScreen('home')}>
              Home
            </button>
          )}
        </div>
      </header>

      <main className="content">
        {screen === 'home' && (
          <HomeScreen
            saves={dynastyCtl.saves}
            setScreen={setScreen}
            loadSave={async id => {
              await dynastyCtl.loadSave(id)
              setScreen('dynastyHub')
            }}
            deleteSave={dynastyCtl.deleteSave}
          />
        )}

        {screen === 'newDynasty' && (
          <NewDynastyScreen
            coachName={coachName}
            setCoachName={setCoachName}
            selectedTeamId={selectedTeamId}
            setSelectedTeamId={setSelectedTeamId}
            setScreen={setScreen}
            startNewDynasty={async args => {
              await dynastyCtl.startNewDynasty(args)
              // Navigation is handled in NewDynastyScreen after successful creation
            }}
          />
        )}

        {screen === 'dynastyHub' && (
          <DynastyHubScreen
            activeSave={activeSave}
            setActiveSave={setActiveSave}
            setScreen={setScreen}
            upcomingGame={upcomingGame}
            onEditTeam={dynastyCtl.editTeamName}
          />
        )}

        {screen === 'roster' && (
          <RosterScreen
            activeSave={activeSave}
            activeRosterPlayers={activeRoster}
            setScreen={setScreen}
            setActiveSave={setActiveSave}
            onEditPlayer={dynastyCtl.editPlayerName}
          />
        )}

        {screen === 'rotation' && (
          <RotationScreen
            activeSave={activeSave}
            activeTeamName={activeTeamName}
            setScreen={setScreen}
            useManualTargets={useManualTargets}
            setUseManualTargets={setUseManualTargets}
            minutesPreview={rotationCtl.minutesPreview}
            userTeamHasRotation={userTeamHasRotation}
            setRotationStyle={rotationCtl.setRotationStyle}
            moveDepthChart={rotationCtl.moveDepthChart}
            setPlayerManualMinutes={rotationCtl.setPlayerManualMinutes}
            resetManualMinutesToAuto={rotationCtl.resetManualMinutesToAuto}
          />
        )}

        {screen === 'sim' && (
          <SimScreen
            activeSave={activeSave}
            activeTeamName={activeTeamName}
            recentGames={recentGames}
            setScreen={setScreen}
            onSimWeek={onSimWeek}
            onOpenGame={onOpenGame}
            isSimulating={dynastyCtl.isSimulating}
          />
        )}

        {screen === 'simResults' && (
          <SimResultsScreen
            activeSave={activeSave}
            recentGames={recentGames}
            setScreen={setScreen}
            onSimWeek={onSimWeek}
            onOpenGame={onOpenGame}
            isSimulating={dynastyCtl.isSimulating}
          />
        )}

        {screen === 'boxScore' && <BoxScoreScreen activeSave={activeSave} activeGameId={activeGameId} setScreen={setScreen} />}

        {screen === 'recruiting' && (
          <RecruitingScreen 
            activeSave={activeSave} 
            setScreen={setScreen}
            setActiveSave={setActiveSave}
          />
        )}

        {screen === 'draftDepartures' && (
          <DraftDeparturesScreen 
            activeSave={activeSave} 
            setScreen={setScreen}
            setActiveSave={setActiveSave}
          />
        )}

        {screen === 'standings' && (
          <StandingsScreen 
            activeSave={activeSave} 
            setScreen={(s) => {
              if (s === 'teamDetail' && viewingTeamId) {
                setScreen('teamDetail')
              } else {
                setScreen(s)
              }
            }}
            onTeamClick={(teamId) => {
              setViewingTeamId(teamId)
              setScreen('teamDetail')
            }}
          />
        )}

        {screen === 'rankings' && (
          <RankingsScreen 
            activeSave={activeSave} 
            setScreen={(s) => {
              if (s === 'teamDetail' && viewingTeamId) {
                setScreen('teamDetail')
              } else {
                setScreen(s)
              }
            }}
            onTeamClick={(teamId) => {
              setViewingTeamId(teamId)
              setScreen('teamDetail')
            }}
          />
        )}

        {screen === 'teamDetail' && viewingTeamId && (
          <TeamDetailScreen 
            activeSave={activeSave} 
            teamId={viewingTeamId}
            setScreen={(s) => {
              setScreen(s)
              if (s !== 'teamDetail') {
                setViewingTeamId(null)
              }
            }}
          />
        )}

        {screen === 'bracket' && (
          <BracketScreen 
            activeSave={activeSave} 
            setScreen={setScreen}
            setActiveSave={setActiveSave}
            simulateTournamentGame={dynastyCtl.simulateTournamentGame}
          />
        )}

        {screen === 'conferenceTournaments' && (
          <ConferenceTournamentsScreen 
            dynasty={activeSave!}
            setScreen={setScreen}
            onGenerateTournaments={async () => {
              const updated = await dynastyCtl.handleGenerateConferenceTournaments()
              if (updated) {
                await setActiveSave(updated)
              }
            }}
            onSimulateRound={async (round) => {
              const updated = await dynastyCtl.simulateConferenceTournamentGames(round)
              if (updated) {
                await setActiveSave(updated)
              }
            }}
            onAdvanceToNationalSelection={async () => {
              // Move to National tournament selection phase
              if (activeSave) {
                const updated = {
                  ...activeSave,
                  world: {
                    ...activeSave.world,
                    phase: 'TOURNAMENT_READY' as const,
                  },
                }
                await setActiveSave(updated)
                setScreen('dynastyHub')
              }
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App
