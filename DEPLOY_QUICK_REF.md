# Quick Deploy Reference

## 🚀 Fastest Path to Upload

```powershell
# Show deployment options
npm run itch:deploy

# Then choose one of these:

# Option A: Web UI (click Upload on itch.io dashboard)
# Option B: Butler CLI (if installed)
npm run itch:push

# Option C: Manual - Copy file path from the output
```

---

## 📋 Three Methods

| Method | Command | Speed | Setup |
|--------|---------|-------|-------|
| **Web UI** | Visit https://itch.io/dashboard | Medium | None |
| **Helper Script** | `npm run itch:deploy` | Fast | None |
| **Butler CLI** | `npm run itch:push` | Fastest | Install butler |

---

## 🔧 Setup (One-time)

```powershell
# Set your itch target permanently
[Environment]::SetEnvironmentVariable("ITCH_TARGET", "yourname/college-basketball-dynasty", "User")

# Restart terminal, then verify
$env:ITCH_TARGET
```

---

## 📦 Build Info

- **Version:** 0.9.7-beta
- **File:** College-Basketball-Dynasty-0.9.7-beta-Windows-Portable.zip
- **Size:** 105 MB
- **Location:** `release/0.9.7-beta/`

---

## ✅ Deployment Checklist

```
Pre-Release:
☐ npm run build               (Build everything)
☐ npm run itch:deploy         (Verify artifacts)

Upload (Choose One):
☐ Web UI                      (Easiest)
☐ npm run itch:push           (If butler installed)

Post-Release:
☐ Download on clean machine
☐ Test game launches
☐ Verify saves work
☐ Share release link
```

---

## 💡 Key Commands

```powershell
npm run build               # Full build with installers
npm run build:quick         # Fast build (development)
npm run build:linux         # Linux build
npm run itch:deploy         # Show upload options
npm run itch:push           # Push via butler (if installed)
npm run itch:push:win       # Push Windows only
npm run itch:push:linux     # Push Linux only
```

---

## 🔗 Resources

- **Deployment Guide:** `ITCH_DEPLOYMENT.md`
- **Release Notes:** `RELEASE_NOTES.0.9.7-beta.md`
- **Butler Install:** https://itch.io/docs/butler/installing.html
- **itch.io Dashboard:** https://itch.io/dashboard
- **Your Game Page:** https://itch.io/games/college-basketball-dynasty

---

## 🎯 Start Now

```powershell
# Show your deployment options
npm run itch:deploy
```

That's it! The build is ready to go. 🚀
