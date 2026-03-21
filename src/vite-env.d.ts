/// <reference types="vite/client" />
export {}

declare global {
  type UpdaterStatusPayload = {
    state: string
    message: string
    version?: string
  }

  interface Window {
    api: {
      saveDynasty: (dynasty: unknown) => Promise<{ ok: boolean; dynastyId?: string; error?: string }>
      loadDynasties: () => Promise<unknown[]>
      loadDynastyIndex: () => Promise<unknown[]>
      loadDynasty: (dynastyId: string) => Promise<unknown>
      loadDynastyRaw: (dynastyId: string) => Promise<{ dynastyId: string; raw: string; filePath?: string }>
      deleteDynasty: (dynastyId: string) => Promise<{ ok: boolean; dynastyId?: string; error?: string }>
      saveDebug: (data: unknown) => Promise<{ ok: true; filePath: string }>
      checkForUpdates: () => Promise<{ ok: boolean; reason?: string }>
      getUpdaterStatus: () => Promise<UpdaterStatusPayload>
      installDownloadedUpdate: () => Promise<{ ok: boolean; reason?: string }>
      onUpdaterStatus: (listener: (status: UpdaterStatusPayload) => void) => () => void
    }
  }
}
