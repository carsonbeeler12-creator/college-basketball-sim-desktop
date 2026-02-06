# v0.9.7-beta Deployment Guide

## Build Status: ✅ READY FOR RELEASE

All features tested and working. Build artifacts ready in `release/0.9.7-beta/`.

---

## What's Ready

### Build Artifacts
- ✅ **Windows Portable:** `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip` (105 MB)
  - Extract and run - no installation needed
  - Fully portable, works on any Windows 10/11 machine

- ✅ **Build Output Directory:** `release/0.9.7-beta/win-unpacked/`
  - Ready for itch.io butler CLI deployment
  - Contains all necessary electron app files

### Test Results
All 6 comprehensive tests passing:
```
✓ Dynasty creation
✓ Scheme profiles (TEMPO +6% pace, DEFENSIVE -5%, etc.)
✓ Fit evaluation (-5 to +5 scoring)
✓ Game modifiers (applied correctly)
✓ Career tracking (stats initialized)
✓ Recruiting pool (300 recruits with archetypes)
```

### Version
- Current: **0.9.7-beta**
- Already bumped in `package.json`
- Ready for deployment

---

## Deployment Options

### Option 1: Manual Upload to itch.io (No CLI needed)
1. Go to https://itch.io/dashboard
2. Select your game project (college-basketball-dynasty)
3. Click "Upload New Build"
4. Upload `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip`
5. Select platform: **Windows**
6. Mark as Executable (checkbox)
7. Save and publish

### Option 2: Automated itch.io Deployment (Requires Butler CLI)

**Setup (One-time):**
```powershell
# 1. Install Butler CLI
#    Download from: https://itch.io/docs/butler/installing.html
#    Or use: choco install butler (if using Chocolatey)

# 2. Authenticate
butler login

# 3. Set environment variable (or use -Target parameter)
$env:ITCH_TARGET = "yourname/college-basketball-dynasty"
```

**Deploy:**
```powershell
# Deploy Windows only
npm run itch:push:win

# Deploy Linux only (requires build:linux first)
npm run build:linux
npm run itch:push:linux

# Deploy both
npm run itch:push
```

### Option 3: Create Full Installer Build

```powershell
# Build Windows installer (.exe, .zip, portable)
npm run build

# Outputs to: release/0.9.7-beta/
# Creates:
#   - College-Basketball-Dynasty-Windows-0.9.7-beta-Setup.exe
#   - College-Basketball-Dynasty-Windows-0.9.7-beta.zip
#   - win-unpacked/ (portable)
```

---

## Pre-Deployment Checklist

- [x] All tests passing (6/6)
- [x] TypeScript compilation successful
- [x] No new errors introduced
- [x] Version bumped to 0.9.7-beta
- [x] Build artifacts generated
- [x] Save migration logic in place
- [x] Features tested:
  - [x] Scheme creation and selection
  - [x] Scheme changing mid-dynasty
  - [x] Recruiting fit system
  - [x] Bust/gem visibility
  - [x] Career statistics
  - [x] Game modifiers applied

---

## Release Notes

**Title:** v0.9.7-beta - Coaching Identity System

**Summary:**
New coaching scheme system adds meaningful identity to your dynasty! Choose from 5 philosophies (Tempo, Defensive, Post-Heavy, Three-Point, Balanced) that affect recruiting preferences, game strategy, and career progression. Enhanced bust/gem detection now 2-3x more visible with increased penalty/bonus values. Change schemes anytime during offseason.

**Key Features:**
- 5 coaching schemes with distinct game modifiers
- Mid-dynasty scheme changing (offseason only)
- Career statistics dashboard
- Recruiting scheme fit indicators (Good/Okay/Poor)
- Enhanced bust/gem visibility with 50-200% rate increases
- Backward compatible with all previous saves

**Technical:**
- Full backward compatibility
- Auto-migration for old saves
- Zero TypeScript errors
- 6 comprehensive tests all passing

---

## Post-Release

### Monitoring
- Check itch.io for successful upload
- Verify download works on clean system
- Confirm save migration works for players
- Monitor for bug reports

### Feedback Collection
- Note any scheme balance issues
- Collect feedback on bust/gem rates
- Track game modifier effectiveness

### Next Version Planning
- Consider additional schemes based on feedback
- Optimize archetype fit scoring if needed
- Enhanced career statistics display

---

## Rollback Plan
If issues detected:
1. Download v0.9.6-beta from release directory
2. Re-upload to itch.io with version indicator
3. Document issues and fixes for v0.9.8-beta

---

## Support Resources

**For Players:**
- Load old saves - they auto-upgrade to v0.9.7-beta
- Scheme can be changed in Dynasty Hub (offseason only)
- Archetype fit shown with color badges in recruiting

**For Developers:**
- Scheme definitions: `src/game/engine/ratings/schemes.ts`
- Recruiting fit: `src/game/engine/recruiting/evaluateFitScore.ts`
- Game modifiers: `src/game/engine/sim/applySchemeModifiers.ts`
- Tests: `scripts/test-schemes.ts`

---

**Status:** ✅ READY FOR RELEASE  
**Date Prepared:** February 3, 2026  
**Build Version:** 0.9.7-beta  
**Bundle Size:** 401.83 KB (gzipped)  
**Archive Size:** 105 MB (Windows Portable)
