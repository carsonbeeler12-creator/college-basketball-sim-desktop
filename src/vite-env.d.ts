/// <reference types="vite/client" />
export {}

declare global {
  interface Window {
    api: {
      saveDynasty: (dynasty: unknown) => Promise<{ ok: true }>
      loadDynasties: () => Promise<unknown[]>
      loadDynastyIndex: () => Promise<unknown[]>
      loadDynasty: (dynastyId: string) => Promise<unknown>
      loadDynastyRaw: (dynastyId: string) => Promise<{ dynastyId: string; raw: string; filePath?: string }>
      deleteDynasty: (dynastyId: string) => Promise<{ ok: boolean; dynastyId?: string; error?: string }>
      saveDebug: (data: unknown) => Promise<{ ok: true; filePath: string }>
    }
  }
}
