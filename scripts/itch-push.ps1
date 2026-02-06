param(
  [Parameter(Mandatory=$false)] [string]$Target, # e.g. yourname/college-basketball-dynasty
  [Parameter(Mandatory=$false)] [string]$Version,
  [switch]$Win,
  [switch]$Linux,
  [switch]$Mac,
  [switch]$Fallback # Use fallback method if butler not available
)

if (-not $Target) {
  $Target = $env:ITCH_TARGET
}
if (-not $Target) {
  Write-Host "Please provide itch target (e.g. yourname/game) via -Target or ITCH_TARGET env var." -ForegroundColor Red
  exit 1
}

# Read version from package.json when not provided
if (-not $Version) {
  $packageJson = Get-Content "$PSScriptRoot\..\package.json" | ConvertFrom-Json
  $Version = $packageJson.version
}

# Check for butler availability
$butlerAvailable = $null -ne (Get-Command butler -ErrorAction SilentlyContinue)
if (-not $butlerAvailable) {
  if (-not $Fallback) {
    Write-Host "Itch 'butler' CLI not found." -ForegroundColor Yellow
    Write-Host "Install from: https://itch.io/docs/butler/installing.html" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Fallback options:" -ForegroundColor Cyan
    Write-Host "  • Run: npm run itch:deploy (shows upload instructions)" -ForegroundColor Cyan
    Write-Host "  • Upload manually via itch.io web dashboard" -ForegroundColor Cyan
    Write-Host "  • Run this script with -Fallback flag to show instructions" -ForegroundColor Cyan
    exit 1
  }
}

Write-Host "Publishing version $Version to itch target $Target" -ForegroundColor Cyan

$errors = @()
$releaseDir = "$PSScriptRoot\..\release\$Version"

if (-not (Test-Path $releaseDir)) {
  Write-Host "Release directory not found: $releaseDir" -ForegroundColor Red
  Write-Host "Run 'npm run build' first" -ForegroundColor Yellow
  exit 1
}

# If butler not available, show fallback instructions
if (-not $butlerAvailable) {
  Write-Host ""
  Write-Host "Butler not available - showing fallback deployment options:" -ForegroundColor Cyan
  Write-Host ""
  
  # Find artifacts
  $winPortable = Get-ChildItem -Path $releaseDir -Filter "*Windows-Portable.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
  $linuxTarGz = Get-ChildItem -Path $releaseDir -Filter "*.tar.gz" -ErrorAction SilentlyContinue | Select-Object -First 1
  $macDmg = Get-ChildItem -Path $releaseDir -Filter "*.dmg" -ErrorAction SilentlyContinue | Select-Object -First 1
  
  if ($winPortable -or $linuxTarGz -or $macDmg) {
    Write-Host "Web Upload (Easiest):" -ForegroundColor Yellow
    Write-Host "  1. Visit: https://itch.io/dashboard/games" -ForegroundColor White
    Write-Host "  2. Select your game" -ForegroundColor White
    Write-Host ""
    
    if ($winPortable) {
      $size = [math]::Round($winPortable.Length / 1MB, 2)
      Write-Host "  Windows Build:" -ForegroundColor Green
      Write-Host "    1. Click 'Upload new build'" -ForegroundColor White
      Write-Host "    2. Select: $($winPortable.Name) ($size MB)" -ForegroundColor White
      Write-Host "    3. Platform: Windows" -ForegroundColor White
      Write-Host "    4. Check 'Executable'" -ForegroundColor White
      Write-Host "    5. Save" -ForegroundColor White
      Write-Host ""
    }
    
    if ($linuxTarGz) {
      $size = [math]::Round($linuxTarGz.Length / 1MB, 2)
      Write-Host "  Linux Build:" -ForegroundColor Green
      Write-Host "    1. Click 'Upload new build'" -ForegroundColor White
      Write-Host "    2. Select: $($linuxTarGz.Name) ($size MB)" -ForegroundColor White
      Write-Host "    3. Platform: Linux" -ForegroundColor White
      Write-Host "    4. Save" -ForegroundColor White
      Write-Host ""
    }
    
    if ($macDmg) {
      $size = [math]::Round($macDmg.Length / 1MB, 2)
      Write-Host "  macOS Build:" -ForegroundColor Green
      Write-Host "    1. Click 'Upload new build'" -ForegroundColor White
      Write-Host "    2. Select: $($macDmg.Name) ($size MB)" -ForegroundColor White
      Write-Host "    3. Platform: Mac" -ForegroundColor White
      Write-Host "    4. Save" -ForegroundColor White
      Write-Host ""
    }
    
    Write-Host "Install Butler for Automated Uploads:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://itch.io/docs/butler/installing.html" -ForegroundColor White
    Write-Host "  2. Run: butler login" -ForegroundColor White
    Write-Host "  3. Run: npm run itch:push" -ForegroundColor White
    Write-Host ""
  } else {
    Write-Host "No build artifacts found in $releaseDir" -ForegroundColor Red
    Write-Host "Run 'npm run build', 'npm run build:linux', and 'npm run build:mac' first" -ForegroundColor Yellow
  }
  exit 0
}

# Butler is available - proceed with push
Write-Host "Butler CLI found - preparing to push..." -ForegroundColor Green
Write-Host ""

$errors = @()

if ($Win -or (-not $Linux -and -not $Mac -and -not $Win)) {
  # Look for Windows portable zip
  $winZip = Get-ChildItem -Path $releaseDir -Filter "*Windows-Portable*.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
  
  # Or fallback to any .zip
  if (-not $winZip) {
    $winZip = Get-ChildItem -Path $releaseDir -Filter "*.zip" -ErrorAction SilentlyContinue | Select-Object -First 1
  }
  
  if ($winZip) {
    Write-Host "Pushing Windows: $($winZip.Name)" -ForegroundColor Yellow
    & butler.exe push $winZip.FullName "$Target:windows" --userversion=$Version
  } else {
    $errors += "Windows build not found in $releaseDir"
  }
}

if ($Linux -or (-not $Linux -and -not $Mac -and -not $Win)) {
  # Look for Linux AppImage or tar.gz from electron-builder
  $linuxAppImage = Get-ChildItem -Path $releaseDir -Filter "*.AppImage" -ErrorAction SilentlyContinue | Select-Object -First 1
  $linuxTarGz = Get-ChildItem -Path $releaseDir -Filter "*.tar.gz" -ErrorAction SilentlyContinue | Select-Object -First 1
  
  if ($linuxAppImage) {
    Write-Host "Pushing Linux AppImage: $($linuxAppImage.Name)" -ForegroundColor Yellow
    & butler.exe push $linuxAppImage.FullName "$Target:linux" --userversion=$Version
  } elseif ($linuxTarGz) {
    Write-Host "Pushing Linux tar.gz: $($linuxTarGz.Name)" -ForegroundColor Yellow
    & butler.exe push $linuxTarGz.FullName "$Target:linux" --userversion=$Version
  } else {
    $errors += "Linux build not found in $releaseDir"
  }
}

if ($Mac -or (-not $Linux -and -not $Mac -and -not $Win)) {
  # Look for macOS DMG from electron-builder
  $macDmg = Get-ChildItem -Path $releaseDir -Filter "*.dmg" -ErrorAction SilentlyContinue | Select-Object -First 1
  
  if ($macDmg) {
    Write-Host "Pushing macOS DMG: $($macDmg.Name)" -ForegroundColor Yellow
    & butler.exe push $macDmg.FullName "$Target:mac" --userversion=$Version
  } else {
    Write-Host "⚠ macOS build not found (build on macOS with: npm run build:mac)" -ForegroundColor Yellow
  }
}

if ($errors.Count -gt 0) {
  Write-Host "`nCompleted with missing artifacts:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
} else {
  Write-Host "`n✓ Publish complete - all builds pushed to itch.io!`" -ForegroundColor Green
}
