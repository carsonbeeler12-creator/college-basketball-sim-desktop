import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("api", {
  saveDynasty: (dynasty: any) => {
    if (!dynasty || typeof dynasty !== "object") {
      return Promise.reject(new Error("saveDynasty called with invalid dynasty"))
    }
    return ipcRenderer.invoke("dynasty:save", dynasty)
  },
  loadDynasties: () => ipcRenderer.invoke("dynasty:loadAll"),
  loadDynastyIndex: () => ipcRenderer.invoke("dynasty:index"),
  loadDynasty: (dynastyId: string) => ipcRenderer.invoke("dynasty:loadOne", dynastyId),
  loadDynastyRaw: (dynastyId: string) => ipcRenderer.invoke("dynasty:loadRaw", dynastyId),
  deleteDynasty: (dynastyId: string) => ipcRenderer.invoke("dynasty:delete", dynastyId),
  saveDebug: (data: any) => ipcRenderer.invoke("debug:save", data),
})
