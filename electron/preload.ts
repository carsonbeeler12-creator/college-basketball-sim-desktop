import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("api", {
  saveDynasty: (dynasty: any) => {
    // Accept either a dynasty object OR a JSON string.
    // Sending a string avoids heavy structured-clone costs for very large dynasties.
    if (!dynasty || (typeof dynasty !== "object" && typeof dynasty !== "string")) {
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
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  getUpdaterStatus: () => ipcRenderer.invoke("updater:getStatus"),
  installDownloadedUpdate: () => ipcRenderer.invoke("updater:install"),
  onUpdaterStatus: (listener: (status: { state: string; message: string; version?: string }) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: { state: string; message: string; version?: string }) => {
      listener(payload)
    }
    ipcRenderer.on("updater:status", wrapped)
    return () => ipcRenderer.removeListener("updater:status", wrapped)
  },
})
