import { useMemo } from 'react'
import { allocateTeamMinutes } from '../../game/engine/minutes/allocateTeamMinutes'
import type { Dynasty, ID, Position, RotationStyle } from '../../game/types/dynasty'

export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

export function getUserTeamState(save: Dynasty) {
  const teamId = save?.league?.userTeamId
  if (!teamId) return null
  return save.league.teamsById?.[teamId] ?? null
}

export function useRotationController(args: {
  activeSave: Dynasty | null
  useManualTargets: boolean
  persistActiveSave: (d: Dynasty) => Promise<void>
}) {
  const { activeSave, useManualTargets, persistActiveSave } = args

  const minutesPreview = useMemo(() => {
    if (!activeSave) return null
    const team = getUserTeamState(activeSave)
    if (!team) return null

    return allocateTeamMinutes({
      dynasty: activeSave as any,
      teamId: team.teamId,
      seedKey: `preview_${activeSave.dynastyId}_${activeSave.world.seasonYear}_${activeSave.world.day}`,
    })
  }, [activeSave, useManualTargets])

  async function moveDepthChart(pid: ID, pos: Position, dir: -1 | 1) {
    if (!activeSave) return
    const team = getUserTeamState(activeSave)
    if (!team?.rotation?.depthChart) return

    const list = [...(team.rotation.depthChart[pos] ?? [])]
    const idx = list.indexOf(pid)
    if (idx < 0) return

    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= list.length) return

    const tmp = list[idx]
    list[idx] = list[newIdx]
    list[newIdx] = tmp

    const updated: Dynasty = {
      ...activeSave,
      lastSavedAtISO: new Date().toISOString(),
      league: {
        ...activeSave.league,
        teamsById: {
          ...activeSave.league.teamsById,
          [team.teamId]: {
            ...team,
            rotation: {
              ...team.rotation,
              depthChart: {
                ...team.rotation.depthChart,
                [pos]: list,
              },
            },
          },
        },
      },
    }

    await persistActiveSave(updated)
  }

  async function setRotationStyle(style: RotationStyle) {
    if (!activeSave) return
    const team = getUserTeamState(activeSave)
    if (!team?.rotation) return

    const updated: Dynasty = {
      ...activeSave,
      lastSavedAtISO: new Date().toISOString(),
      league: {
        ...activeSave.league,
        teamsById: {
          ...activeSave.league.teamsById,
          [team.teamId]: {
            ...team,
            rotation: {
              ...team.rotation,
              settings: {
                ...team.rotation.settings,
                style,
              },
            },
          },
        },
      },
    }

    await persistActiveSave(updated)
  }

  async function setPlayerManualMinutes(playerId: ID, minutes: number) {
    if (!activeSave) return
    const team = getUserTeamState(activeSave)
    if (!team?.rotation) return

    const safe = Math.max(0, Math.min(40, Math.round(minutes)))

    const updated: Dynasty = {
      ...activeSave,
      lastSavedAtISO: new Date().toISOString(),
      league: {
        ...activeSave.league,
        teamsById: {
          ...activeSave.league.teamsById,
          [team.teamId]: {
            ...team,
            rotation: {
              ...team.rotation,
              minutesTargetByPlayerId: {
                ...(team.rotation.minutesTargetByPlayerId ?? {}),
                [playerId]: safe,
              },
            },
          },
        },
      },
    }

    await persistActiveSave(updated)
  }

  async function resetManualMinutesToAuto() {
    if (!activeSave) return
    const team = getUserTeamState(activeSave)
    if (!team?.rotation) return

    const updated: Dynasty = {
      ...activeSave,
      lastSavedAtISO: new Date().toISOString(),
      league: {
        ...activeSave.league,
        teamsById: {
          ...activeSave.league.teamsById,
          [team.teamId]: {
            ...team,
            rotation: {
              ...team.rotation,
              minutesTargetByPlayerId: {},
            },
          },
        },
      },
    }

    await persistActiveSave(updated)
  }

  return {
    minutesPreview,
    moveDepthChart,
    setRotationStyle,
    setPlayerManualMinutes,
    resetManualMinutesToAuto,
  }
}
