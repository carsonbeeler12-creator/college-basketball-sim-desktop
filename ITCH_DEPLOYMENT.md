# itch.io Deployment Guide - Seamless Upload Setup

## Status: ✅ READY FOR DEPLOYMENT

v0.9.7-beta build is ready. Three deployment methods available:

---

## Customer Update Experience (Recommended)

To make updates seamless for players, use this setup every release:

1. Push builds to the same itch channel via butler (`windows`, `linux`, `mac`)
2. Publish matching GitHub release artifacts (used by in-app updater)
3. Ship installer builds for desktop users (avoid ZIP-only messaging)

### Copy for your itch page

```text
Automatic updates are available when you install through the itch app.
If you download a ZIP manually from the web page, you'll need to download future updates manually.
```

### Copy for release notes

```text
Update note:
- itch app installs: update automatically
- in-app updater (installer builds): check from Home -> App Updates
- manual ZIP installs: re-download the latest version from itch
```

---

## Method 1: Web UI Upload (Easiest - No Installation)

**Best for:** One-time uploads, quick releases

1. Go to: https://itch.io/dashboard/games
2. Select your game: `college-basketball-dynasty`
3. Click **"Upload new build"**
4. Select file: `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip` (105 MB)
5. Platform: Select **Windows**
6. Check **"Executable"** checkbox
7. Set Release name (optional): "v0.9.7-beta"
8. Click **Save**

✅ **Pros:** Simple, no CLI needed, intuitive
❌ **Cons:** Manual process

---

## Method 2: Deployment Helper Script (Recommended)

**Best for:** Getting quick upload instructions and verifying build is ready

```powershell
npm run itch:deploy
```

This shows:
- Build artifacts status
- File sizes and locations
- Upload instructions
- Next steps

---

## Method 3: Automated Upload with Butler CLI (Fastest)

**Best for:** Automated CI/CD, frequent releases

### Setup (One-time)

```powershell
# 1. Install butler
#    - Windows: Download from https://itch.io/docs/butler/installing.html
#    - Or use package manager (brew, apt, etc.)

# 2. Authenticate
butler login

# 3. Set your itch.io target (or set as env var permanently)
$env:ITCH_TARGET = "yourname/college-basketball-dynasty"
```

### Deploy

```powershell
# Push with butler (after authentication)
npm run itch:push

# Or push specific platform
npm run itch:push:win
```

✅ **Pros:** Fully automated, fast, can be scripted
❌ **Cons:** Requires butler CLI installation and authentication

---

## Complete Deployment Workflow

### Before Every Release

```powershell
# 1. Build the app
npm run build

# 2. Verify artifacts
npm run itch:deploy

# 3. Choose your upload method (see above)
```

### After Upload

1. Wait for itch.io to process the build (usually seconds)
2. Go to game page: https://itch.io/games/college-basketball-dynasty
3. Test download on a clean machine
4. Check game starts properly
5. Verify saves load correctly

---

## Environment Setup for Seamless Uploads

### Windows - Permanent Environment Variables

**For automated butler uploads:**

```powershell
# PowerShell (as Admin)
[Environment]::SetEnvironmentVariable("ITCH_TARGET", "yourname/college-basketball-dynasty", "User")
```

Then verify:
```powershell
$env:ITCH_TARGET
# Should output: yourname/college-basketball-dynasty
```

### Session-Only (Current Terminal Only)

```powershell
$env:ITCH_TARGET = "yourname/college-basketball-dynasty"
npm run itch:push
```

---

## NPM Scripts Available

```bash
npm run build              # Full build with installers
npm run build:quick        # Quick build (unpacked only)
npm run build:linux        # Linux build (AppImage + tar.gz)

npm run itch:push          # Deploy to itch.io (needs butler)
npm run itch:push:win      # Deploy Windows only
npm run itch:push:linux    # Deploy Linux only

npm run itch:deploy        # Show deployment options & verify build
```

---

## Troubleshooting

### Build not found error
```
Release directory not found: release/0.9.7-beta
```
**Solution:** Run `npm run build` first

### Butler not found
```
Itch 'butler' CLI not found.
```
**Solutions:**
- Use Method 1 (Web UI) instead
- Install butler from: https://itch.io/docs/butler/installing.html
- Run `npm run itch:deploy` for alternatives

### Authentication failed
```
butler: error: not logged in
```
**Solution:** Run `butler login` and follow prompts

### Wrong target format
```
Invalid target format. Use: username/game-name
```
**Solution:** Set correctly: `$env:ITCH_TARGET = "yourname/college-basketball-dynasty"`

---

## Build Artifacts Location

```
release/0.9.7-beta/
├── College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip (105 MB)
├── win-unpacked/                          (Build directory)
├── builder-debug.yml                      (Build info)
└── builder-effective-config.yaml          (Build config)
```

---

## Release Checklist

- [x] Build complete: `npm run build`
- [x] Artifacts generated: 105 MB portable zip
- [x] All tests passing: 6/6
- [x] Version updated: 0.9.7-beta
- [x] Documentation created

**Before Publishing:**
- [ ] Choose upload method above
- [ ] Upload to itch.io
- [ ] Test on clean machine
- [ ] Verify game launches
- [ ] Check saves load
- [ ] Confirm version displays correctly
- [ ] Share release link

---

## Quick Start for Your Setup

**First time:**
```powershell
# Set your itch target permanently
[Environment]::SetEnvironmentVariable("ITCH_TARGET", "yourname/college-basketball-dynasty", "User")

# Install butler (optional, for automation)
# Download from https://itch.io/docs/butler/installing.html

# Authenticate with butler (if installing)
butler login
```

**Every release:**
```powershell
npm run build              # Build
npm run itch:deploy        # Check it's ready
# Choose your upload method above
```

---

**Version:** 0.9.7-beta  
**Build Date:** February 3, 2026  
**Status:** ✅ Ready for deployment  
**File Size:** 105 MB (Windows Portable)  
**Methods Available:** 3 (Web UI, Helper Script, CLI)
