import { useState, useEffect } from 'react'
import { createDynasty } from '../../game/engine/createDynasty'
import { simWeek } from '../../game/engine/sim/simWeek'
import { simWeekFast } from '../../game/engine/sim/simWeekFast'
import { simulateTournamentRound } from '../../game/engine/tournament/simulateTournament'
import { generateConferenceTournaments } from '../../game/engine/tournament/generateConferenceTournaments'
import { simulateConferenceTournamentRound } from '../../game/engine/tournament/simulateConferenceTournaments'
import type { Dynasty, GameState, ID } from '../../game/types/dynasty'
import type { DynastyIndexEntry } from '../../game/types/dynastyIndex'

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

export function useDynastyController() {
  const [saves, setSaves] = useState<DynastyIndexEntry[]>([])
  const [activeSave, setActiveSaveState] = useState<Dynasty | null>(null)
  const [simProgress, setSimProgress] = useState<{ completed: number; total: number } | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [recentSimGames, setRecentSimGames] = useState<GameState[]>([])

  // Load all saves on mount
  useEffect(() => {
    loadDynastyIndex()
  }, [])

  async function loadDynastyIndex() {
    if (typeof window === 'undefined' || !window.api) return
    try {
      mark('dynasty:index:start')
      const loaded = (await window.api.loadDynastyIndex?.()) as DynastyIndexEntry[]
      if (Array.isArray(loaded)) {
        setSaves(loaded)
      } else {
        const fallback = (await window.api.loadDynasties?.()) as Dynasty[]
        const index = Array.isArray(fallback)
          ? fallback.map(d => ({
              dynastyId: d.dynastyId,
              coachName: d.coach?.name ?? 'Coach',
              userTeamId: d.league?.userTeamId ?? 'unknown',
              seasonYear: d.world?.seasonYear ?? 0,
              createdAtISO: d.createdAtISO,
              lastSavedAtISO: d.lastSavedAtISO,
            }))
          : []
        setSaves(index)
      }
      measure('dynasty:index:load', 'dynasty:index:start', 'dynasty:index:end')
    } catch (err) {
      console.error('Failed to load dynasties:', err)
    }
  }

  async function persistActiveSave(dynasty: Dynasty): Promise<void> {
    if (typeof window === 'undefined' || !window.api) {
      throw new Error('Electron API not available')
    }
    
    try {
      const stamped: Dynasty = {
        ...dynasty,
        lastSavedAtISO: new Date().toISOString(),
      }
      await window.api.saveDynasty(stamped)
      setActiveSaveState(stamped)
      await loadDynastyIndex() // Refresh the saves list
    } catch (err) {
      console.error('Failed to save dynasty:', err)
      throw err
    }
  }

  async function loadSave(dynastyId: ID) {
    if (typeof window === 'undefined' || !window.api?.loadDynasty) return
    try {
      mark('dynasty:load:start')
      const loaded = (await window.api.loadDynasty(dynastyId)) as Dynasty
      if (loaded) {
        // Migration: Add missing scheme and careerStats to old saves
        if (!loaded.coach.scheme) {
          loaded.coach.scheme = 'BALANCED' // Default scheme for old saves
        }
        if (!loaded.coach.careerStats) {
          const teamState = loaded.league.teamsById?.[loaded.league.userTeamId]
          const currentSeasonWins = teamState?.season?.wins ?? 0
          const currentSeasonLosses = teamState?.season?.losses ?? 0
          loaded.coach.careerStats = {
            seasonsCoached: 1,
            totalWins: currentSeasonWins,
            totalLosses: currentSeasonLosses,
            averagePrestige: 0,
            currentPrestigeTier: 'MID_TIER',
            yearsAtCurrentSchool: 1
          }
        }
        setActiveSaveState(loaded)
      }
      measure('dynasty:load:complete', 'dynasty:load:start', 'dynasty:load:end')
    } catch (err) {
      console.error('Failed to load dynasty:', err)
    }
  }

  async function deleteSave(dynastyId: ID): Promise<void> {
    if (typeof window === 'undefined' || !window.api) {
      throw new Error('Electron API not available')
    }
    try {
      await window.api.deleteDynasty(dynastyId)
      // If the deleted save was the active one, clear it
      if (activeSave?.dynastyId === dynastyId) {
        setActiveSaveState(null)
      }
      // Refresh the saves list
      await loadDynastyIndex()
    } catch (err) {
      console.error('Failed to delete dynasty:', err)
      throw err
    }
  }

  async function startNewDynasty(args: { coachName: string; userTeamId: ID; coachScheme: any; seasonYear: number }) {
    const dynasty = createDynasty(args)
    await persistActiveSave(dynasty)
    setActiveSaveState(dynasty)
  }

  async function handleSimWeek() {
    if (!activeSave || isSimulating) return
    
    setIsSimulating(true)
    setSimProgress(null)
    setRecentSimGames([])
    
    // Capture current save state to detect changes during async operation
    const saveSnapshot = activeSave
    const previousGameIds = new Set(Object.keys(saveSnapshot.league.gamesById ?? {}))
    
    try {
      // Use fast worker-based simulation
      const result = await simWeekFast(saveSnapshot, (progress) => {
        setSimProgress(progress)
      })
      
      // Verify save hasn't changed during simulation
      if (activeSave.dynastyId !== saveSnapshot.dynastyId) {
        console.warn('Save changed during simulation, canceling update')
        return
      }
      
      if (result?.dynasty) {
        const newGames = Object.values(result.dynasty.league.gamesById ?? {}).filter(g => !previousGameIds.has(g.gameId)) as GameState[]
        const userTeamId = result.dynasty.league.userTeamId
        const userGames = newGames.filter(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId)
        userGames.sort((a, b) => (b.day ?? 0) - (a.day ?? 0))
        setRecentSimGames(userGames)
        await persistActiveSave(result.dynasty)
      }
    } catch (error) {
      console.error('Simulation error:', error)
      // Fallback to old sync version on error
      const result = simWeek(saveSnapshot)
      if (result?.dynasty) {
        const newGames = Object.values(result.dynasty.league.gamesById ?? {}).filter(g => !previousGameIds.has(g.gameId)) as GameState[]
        const userTeamId = result.dynasty.league.userTeamId
        const userGames = newGames.filter(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId)
        userGames.sort((a, b) => (b.day ?? 0) - (a.day ?? 0))
        setRecentSimGames(userGames)
        await persistActiveSave(result.dynasty)
      }
    } finally {
      setIsSimulating(false)
      setSimProgress(null)
    }
  }

  async function simulateTournamentGame(round: 'First Four' | 'Round of 64' | 'Round of 32' | 'Round of 16' | 'Quarter-Finals' | 'Semi-Finals' | 'Championship'): Promise<Dynasty | null> {
    if (!activeSave || !activeSave.league.tournament) return null
    
    const result = simulateTournamentRound(
      activeSave,
      activeSave.league.tournament,
      round,
      activeSave.world.day
    )
    const updated: Dynasty = {
      ...result.dynasty,
      league: {
        ...result.dynasty.league,
        tournament: result.bracket,
      },
    }
    await persistActiveSave(updated)
    return updated
  }

  async function handleGenerateConferenceTournaments(): Promise<Dynasty | null> {
    if (!activeSave) return null
    
    const generated = generateConferenceTournaments(activeSave)
    const updated: Dynasty = {
      ...generated,
      world: {
        ...generated.world,
        phase: 'CONF_TOURNAMENT',
      },
    }
    if (updated) {
      await persistActiveSave(updated)
      return updated
    }
    return null
  }

  async function simulateConferenceTournamentGames(round: string): Promise<Dynasty | null> {
    if (!activeSave) return null
    
    const updated = simulateConferenceTournamentRound(activeSave, round)
    await persistActiveSave(updated)
    return updated
  }

  async function editPlayerName(playerId: ID, firstName: string, lastName: string): Promise<void> {
    if (!activeSave) return
    
    const updated = { ...activeSave }
    const player = updated.playersById[playerId]
    if (player) {
      player.identity.firstName = firstName
      player.identity.lastName = lastName
      await persistActiveSave(updated)
    }
  }

  async function editTeamName(teamId: ID, teamName: string): Promise<void> {
    if (!activeSave) return
    
    const updated = { ...activeSave }
    const teamState = updated.league.teamsById[teamId]
    if (teamState) {
      teamState.name = teamName
      await persistActiveSave(updated)
    }
  }

  return {
    saves,
    activeSave,
    persistActiveSave,
    loadSave,
    deleteSave,
    startNewDynasty,
    handleSimWeek,
    simulateTournamentGame,
    handleGenerateConferenceTournaments,
    simulateConferenceTournamentGames,
    editPlayerName,
    editTeamName,
    simProgress,
    isSimulating,
    recentSimGames,
  }
}
