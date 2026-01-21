import { app, BrowserWindow, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, "..")

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

let win: BrowserWindow | null = null

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getDynastyDir() {
  const dir = path.join(app.getPath("userData"), "dynasties")
  ensureDir(dir)
  return dir
}

function getDynastyFilePath(dynastyId: string) {
  return path.join(getDynastyDir(), `${dynastyId}.json`)
}

type DynastyIndexEntry = {
  dynastyId: string
  coachName: string
  userTeamId: string
  seasonYear: number
  createdAtISO: string
  lastSavedAtISO: string
  filePath: string
}

function buildIndexEntry(parsed: any, filePath: string): DynastyIndexEntry {
  const dynasty = normalizeDynasty(parsed)
  return {
    dynastyId: dynasty.dynastyId,
    coachName: dynasty.coach?.name ?? 'Coach',
    userTeamId: dynasty.league?.userTeamId ?? 'unknown',
    seasonYear: dynasty.world?.seasonYear ?? 0,
    createdAtISO: dynasty.createdAtISO,
    lastSavedAtISO: dynasty.lastSavedAtISO,
    filePath,
  }
}

function readDynastyById(dynastyId: string) {
  const filePath = getDynastyFilePath(dynastyId)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dynasty file not found for id ${dynastyId}`)
  }
  const raw = fs.readFileSync(filePath, "utf-8")
  const parsed = JSON.parse(raw)
  return { raw, parsed, filePath }
}

function normalizeDynasty(input: any) {
  if (typeof input === "string") {
    try {
      input = JSON.parse(input)
    } catch {
      throw new Error("Invalid dynasty payload: string (not JSON)")
    }
  }

  const d = input?.dynasty ?? input

  if (!d || typeof d !== "object" || Array.isArray(d)) {
    throw new Error("Invalid dynasty payload: not an object")
  }

  if (!d.dynastyId && d.id) d.dynastyId = d.id
  if (!d.dynastyId) throw new Error("Invalid dynasty object: missing dynastyId")

  if (!d.createdAtISO) d.createdAtISO = new Date().toISOString()
  d.lastSavedAtISO = new Date().toISOString()

  if (!d.league) d.league = { userTeamId: "", teamsById: {}, gamesById: {}, standingsBySeason: {} }
  if (!d.playersById) d.playersById = {}
  if (!d.recruiting) d.recruiting = { seasonYear: d.world?.seasonYear ?? 2026, boardsByTeamId: {} }

  return d
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"))
  }
}

/* -----------------------------
   IPC: Save / Load
------------------------------ */

ipcMain.handle("dynasty:save", async (_event, payload) => {
  const dynasty = normalizeDynasty(payload)
  const dir = getDynastyDir()
  const filePath = path.join(dir, `${dynasty.dynastyId}.json`)

  fs.writeFileSync(filePath, JSON.stringify(dynasty, null, 2), "utf-8")
  return { ok: true, dynastyId: dynasty.dynastyId }
})

ipcMain.handle("dynasty:index", async () => {
  const dir = getDynastyDir()
  ensureDir(dir)

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"))
  const out: DynastyIndexEntry[] = []

  for (const f of files) {
    const filePath = path.join(dir, f)
    try {
      const raw = fs.readFileSync(filePath, "utf-8")
      const parsed = JSON.parse(raw)
      out.push(buildIndexEntry(parsed, filePath))
    } catch (err) {
      console.warn(`Failed to read dynasty index for ${f}:`, err)
    }
  }

  return out
})

ipcMain.handle("dynasty:loadOne", async (_event, dynastyId: string) => {
  const { parsed } = readDynastyById(dynastyId)
  return normalizeDynasty(parsed)
})

ipcMain.handle("dynasty:loadRaw", async (_event, dynastyId: string) => {
  const { raw, filePath } = readDynastyById(dynastyId)
  return { dynastyId, raw, filePath }
})

ipcMain.handle("dynasty:loadAll", async () => {
  const dir = getDynastyDir()
  ensureDir(dir)

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"))

  const out: any[] = []
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), "utf-8")
    const parsed = JSON.parse(raw)
    out.push(normalizeDynasty(parsed))
  }
  return out
})

ipcMain.handle("debug:save", async (_event, data: any) => {
  const debugDir = path.join(app.getPath("userData"), "debug")
  ensureDir(debugDir)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(debugDir, `bracket-debug-${timestamp}.json`)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
  return { ok: true, filePath }
})

ipcMain.handle("dynasty:delete", async (_event, dynastyId: string) => {
  const dir = getDynastyDir()
  const filePath = path.join(dir, `${dynastyId}.json`)
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
    return { ok: true, dynastyId }
  }
  
  return { ok: false, error: "File not found" }
})

/* -----------------------------
   App lifecycle
------------------------------ */

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
    win = null
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(createWindow)
