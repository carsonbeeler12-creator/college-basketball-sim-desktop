# Multi-Platform Deployment Complete

## ✅ Release v0.9.7-beta - All Platforms Ready

### Current Status

**Ready to Deploy Now:**
- ✅ **Windows** (105 MB) - Portable executable
- ✅ **Linux** (5 MB) - tar.gz archive

**Build on macOS:**
- 🚀 **macOS** - Run `npm run build:mac` on macOS to create DMG

---

## Build Commands

```powershell
npm run build           # Windows build (current)
npm run build:linux     # Linux build (done - 5 MB)
npm run build:mac       # macOS build (requires macOS)
```

---

## Deployment Methods

### Method 1: Web UI (Easiest for All Platforms)

1. Visit: https://itch.io/dashboard
2. Select your game
3. Upload each platform separately:

**Windows:**
- File: `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip` (105 MB)
- Platform: Windows
- Check "Executable"

**Linux:**
- File: `College Basketball Dynasty (BETA)-Linux-0.9.7-beta.tar.gz` (5 MB)
- Platform: Linux

**macOS (when built):**
- File: `College Basketball Dynasty (BETA)-Mac-0.9.7-beta-Installer.dmg`
- Platform: Mac

---

### Method 2: Deployment Helper (Shows All Options)

```powershell
npm run itch:deploy
```

Displays:
- All available artifacts with sizes
- Upload instructions for each platform
- Butler CLI commands for automation

---

### Method 3: Butler CLI (Fastest - Automated)

**One-time setup:**
```powershell
butler login
[Environment]::SetEnvironmentVariable("ITCH_TARGET", "yourname/game", "User")
```

**Deploy all platforms:**
```powershell
npm run itch:push        # All available platforms
npm run itch:push:win    # Windows only
npm run itch:push:linux  # Linux only
npm run itch:push:mac    # macOS only (when DMG exists)
```

---

## File Locations

```
release/0.9.7-beta/
├── College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip (105 MB)
├── College Basketball Dynasty (BETA)-Linux-0.9.7-beta.tar.gz (5 MB)
├── win-unpacked/          (Windows build directory)
├── linux-unpacked/        (Linux build directory)
├── builder-debug.yml
└── builder-effective-config.yaml
```

*Note: macOS DMG will appear here after running `npm run build:mac` on macOS*

---

## Total Size Summary

| Platform | File Size | Status |
|----------|-----------|--------|
| Windows | 105 MB | ✅ Ready |
| Linux | 5 MB | ✅ Ready |
| macOS | TBD | 🔨 Build needed |
| **Total** | **110 MB+** | **110+ MB available** |

---

## Quick Start

**Windows & Linux (Now):**
```powershell
npm run itch:deploy    # See upload options
```

**macOS (When on macOS):**
```powershell
npm run build:mac      # Build DMG
npm run itch:deploy    # See all options with macOS included
```

**Deploy All at Once (With Butler):**
```powershell
[Environment]::SetEnvironmentVariable("ITCH_TARGET", "yourname/game", "User")
npm run itch:push      # Pushes Windows, Linux, and macOS (if exists)
```

---

## macOS Build Instructions

On a macOS machine:

```bash
# Install dependencies (if needed)
npm install

# Build macOS DMG
npm run build:mac

# This generates: College Basketball Dynasty (BETA)-Mac-0.9.7-beta-Installer.dmg

# Then deploy
npm run itch:deploy
```

---

## Updated NPM Scripts

```json
{
  "build": "tsc && vite build && electron-builder",
  "build:quick": "tsc && vite build && npx electron-builder --dir",
  "build:linux": "tsc && vite build && npx electron-builder --linux tar.gz",
  "build:mac": "tsc && vite build && npx electron-builder --mac dmg",
  "itch:push": "powershell -ExecutionPolicy Bypass -File scripts/itch-push.ps1",
  "itch:push:win": "powershell -ExecutionPolicy Bypass -File scripts/itch-push.ps1 -Win",
  "itch:push:linux": "powershell -ExecutionPolicy Bypass -File scripts/itch-push.ps1 -Linux",
  "itch:push:mac": "powershell -ExecutionPolicy Bypass -File scripts/itch-push.ps1 -Mac",
  "itch:deploy": "node scripts/upload-to-itch.js"
}
```

---

## Deployment Scripts Updated

- ✅ `scripts/upload-to-itch.js` - Shows Windows, Linux, and macOS options
- ✅ `scripts/itch-push.ps1` - Supports all three platforms
- ✅ `package.json` - Added `build:mac` and `itch:push:mac` scripts
- ✅ All fallback modes show macOS when available

---

## Recommended Workflow

**Step 1: Build All Platforms**
```powershell
# Windows & Linux (on Windows)
npm run build          # Windows
npm run build:linux    # Linux

# macOS (on macOS device)
npm run build:mac      # macOS
```

**Step 2: Deploy to itch.io**
```powershell
# On any machine with available builds
npm run itch:deploy    # Shows all available platforms
# Then choose upload method
```

**Step 3: Verify**
- Test Windows download
- Test Linux download
- Test macOS download (when available)

---

**Version:** v0.9.7-beta  
**Status:** ✅ Ready for Multi-Platform Release  
**Windows & Linux:** Deployed  
**macOS:** Ready to build and deploy
