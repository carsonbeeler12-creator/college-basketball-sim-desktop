// sim-desktop/src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

// The Electron-Vite template sometimes tries to use window.ipcRenderer here.
// If preload does not expose it under that name, it will crash the renderer.
// This guard prevents the crash and keeps the app working.
try {
  const anyWindow = window as any
  if (anyWindow?.ipcRenderer?.on) {
    anyWindow.ipcRenderer.on("main-process-message", (_event: any, message: any) => {
      console.log("[main-process-message]", message)
    })
  }
} catch (e) {
  console.warn("ipcRenderer not available in renderer. Skipping listener.", e)
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
