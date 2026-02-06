# College Basketball Dynasty v0.9.7-beta Release Notes

## Release Date
February 3, 2026

## Major Features

### 1. 🏀 Coaching Scheme System
Choose from 5 distinct coaching philosophies that affect recruiting, gameplay, and career progression:
- **TEMPO** - Fast-paced offense (+6% game speed, +8% 3PT volume)
- **DEFENSIVE** - Defensive-oriented (-5% pace, +3.5% defensive accuracy)
- **POST_HEAVY** - Paint-focused offense (-3% pace, -6% 3PT volume)
- **THREE_POINT** - Three-ball dominant (+2% pace, +5% 3PT volume)
- **BALANCED** - No modifiers, neutral approach

### 2. 🔄 Change Coaching Scheme
- New "⚙️ Change Coaching Scheme" button in Dynasty Hub
- Only available during offseason
- Switch between all 5 schemes with instant effect
- Career stats tracked across all scheme changes

### 3. 📊 Career Statistics Dashboard
New career record display showing:
- Season record (Wins-Losses)
- Total seasons coached
- Prestige tier (with visual indicator)
- Years at current school

### 4. 🎯 Recruiting Scheme Fit System
- Color-coded fit badges on recruits:
  - ✓ **Fits** (Archetype matches scheme, +2 to +5 bonus)
  - ~ **Okay** (Neutral fit, -1 to +1 modifier)
  - ✗ **Mismatch** (Poor fit, -3 to -5 penalty)
- New **Scheme Fit** filter dropdown (All / Good / Okay / Poor)
- Instantly identify ideal recruits for your coaching style

### 5. 💎 Improved Bust/Gem Detection
**Significantly increased visibility and impact:**
- Bust rates increased 50-200%:
  - 5★: 5% → 12%
  - 4★: 6% → 15%
  - 3★: 8% → 18%
  - 2★: 5% → 12%
  - 1★: 3% → 8%
- Bust penalties doubled: -3 to -7 → -5 to -10 overall
- Gem bonuses increased: +2 to +5 → +3 to +7 overall
- **Visible badges (💎 gem, ⚠️ bust) in both recruit lists and detail panels**

### 6. 📈 Enhanced Game Display
- Box scores now show "Your Team Name + {Scheme} System"
- Visual reinforcement of scheme identity in gameplay

## Technical Improvements
- ✅ Full backward compatibility with save files from v0.9.6-beta
- ✅ Auto-migration: Old saves default to BALANCED scheme with calculated career stats
- ✅ Zero TypeScript compilation errors
- ✅ All 6 comprehensive feature tests passing

## Build Artifacts
**v0.9.7-beta Release:**
- `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip` (105 MB)
  - Portable Windows executable (no installation required)
  - Extract and run `college-basketball-dynasty.exe`
- `win-unpacked/` directory (for itch.io distribution)

## Installation

### Windows (Portable)
1. Download `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip`
2. Extract the archive
3. Run `college-basketball-dynasty.exe`

### Loading Old Saves
- All saves from v0.9.6-beta and earlier automatically upgrade
- Your dynasty retains all data with BALANCED scheme applied
- Career statistics preserved and recalculated

## Known Issues
- None specific to this release
- Pre-existing: Minor lint warnings in test scripts (non-critical)

## Testing Summary
✅ Dynasty Creation: Schemes initialize with correct modifiers  
✅ Recruiting Pool: 300 recruits with archetype assignments  
✅ Scheme Fit: Scoring system working (-5 to +5 range)  
✅ Game Modifiers: All schemes apply correct pace/accuracy/3PT adjustments  
✅ Career Tracking: Stats accumulate and display correctly  
✅ Save Migration: Old saves load without data loss  

## Next Steps / Deployment

### To Deploy to itch.io:
```powershell
# Requires Butler CLI (https://itch.io/docs/butler/installing.html)
# And ITCH_TARGET environment variable set (e.g., "yourname/college-basketball-dynasty")

npm run itch:push
```

Or manually:
1. Download `College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip`
2. Upload to itch.io under the "windows" platform

### For Linux Distribution:
```powershell
npm run build:linux
# Creates .tar.gz in release/0.9.7-beta/
```

## Changelog
- **New:** Coaching scheme system with 5 distinct philosophies
- **New:** Mid-game scheme changing (offseason only)
- **New:** Career statistics dashboard
- **New:** Recruiting scheme fit indicators
- **Enhanced:** Bust/gem visibility (50-200% rate increase, doubled penalties)
- **Fixed:** Prestige tier initialization (was undefined)
- **Fixed:** Archetype field properly added to Recruit type definition
- **Improved:** Save migration logic for backward compatibility

## Credits
- Feature implementation: Scheme architecture, UI integration, recruiting enhancements
- Testing: Comprehensive test suite with 6 feature tests
- Build system: Electron-builder integration with proper versioning

---

**Version:** 0.9.7-beta  
**Build Date:** February 3, 2026  
**Status:** ✅ Ready for Release
