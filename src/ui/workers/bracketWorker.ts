/// <reference lib="webworker" />
import type { BracketGame } from '../../game/engine/tournament/generateBracket'
import type { RegionLayout } from '../logic/bracketLayout'
import { buildBracketLayout } from '../logic/bracketLayout'

export type BracketWorkerRequest = {
  type: 'BRACKET_VIEW'
  dynastyId: string
  raw: string
  view: 'bracket'
}

export type BracketWorkerProgress = {
  type: 'PROGRESS'
  dynastyId: string
  stage: string
  detail?: string
  elapsedMs: number
}

export type BracketWorkerError = {
  type: 'ERROR'
  dynastyId?: string
  message: string
}

export type BracketWorkerPayload = {
  bracket: {
    seasonYear?: number
    games: BracketGame[]
    selection: {
      allTeams: Array<{ teamId: string; seed: number; region: 'East' | 'West' | 'South' | 'Midwest' }>
    }
  }
  teamsById: Record<string, { name: string }>
  layout: RegionLayout
}

export type BracketWorkerResponse =
  | BracketWorkerProgress
  | BracketWorkerError
  | { type: 'COMPLETE'; dynastyId: string; payload: BracketWorkerPayload; elapsedMs: number }

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<BracketWorkerRequest>) => {
  const start = performance.now()
  const msg = event.data
  if (!msg || msg.type !== 'BRACKET_VIEW') return

  const postProgress = (stage: string, detail?: string) => {
    const elapsedMs = performance.now() - start
    const progress: BracketWorkerProgress = { type: 'PROGRESS', dynastyId: msg.dynastyId, stage, detail, elapsedMs }
    ctx.postMessage(progress)
  }

  const postError = (message: string) => {
    const err: BracketWorkerError = { type: 'ERROR', dynastyId: msg.dynastyId, message }
    ctx.postMessage(err)
  }

  try {
    if (!msg.raw) {
      postError('Missing save payload')
      return
    }

    postProgress('parse')
    const parsed = JSON.parse(msg.raw)
    const dynasty = parsed?.dynasty ?? parsed

    if (!dynasty?.league?.tournament) {
      postError('Tournament not found in save')
      return
    }

    const tournament = dynasty.league.tournament
    const games: BracketGame[] = Array.isArray(tournament.games) ? tournament.games : []
    const selectionTeams = Array.isArray(tournament.selection?.allTeams) ? tournament.selection.allTeams : []
    const seasonYear = typeof dynasty.world?.seasonYear === 'number' ? dynasty.world.seasonYear : tournament.seasonYear

    const teams = dynasty.league?.teamsById ?? {}
    const slimTeams: Record<string, { name: string }> = {}
    for (const [id, team] of Object.entries(teams)) {
      const maybeName = (team as any)?.name
      slimTeams[id] = { name: typeof maybeName === 'string' ? maybeName : id }
    }

    postProgress('layout:compute')
    const layout: RegionLayout = buildBracketLayout(games)

    const completePayload: BracketWorkerResponse = {
      type: 'COMPLETE',
      dynastyId: msg.dynastyId,
      payload: {
        bracket: {
          seasonYear,
          games,
          selection: { allTeams: selectionTeams },
        },
        teamsById: slimTeams,
        layout,
      },
      elapsedMs: performance.now() - start,
    }

    ctx.postMessage(completePayload)
  } catch (err: any) {
    postError(err?.message ?? 'Unknown bracket worker error')
  }
}
