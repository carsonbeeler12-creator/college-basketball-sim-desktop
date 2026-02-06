#!/usr/bin/env pwsh
<#
.SYNOPSIS
Deploy College Basketball Dynasty to itch.io using direct HTTP upload
.PARAMETER Target
itch.io game target (e.g., yourname/college-basketball-dynasty)
.PARAMETER ApiKey
itch.io API key (get from https://itch.io/user/settings/api-keys)
#>

param(
  [Parameter(Mandatory=$false)] [string]$Target,
  [Parameter(Mandatory=$false)] [string]$ApiKey,
  [Parameter(Mandatory=$false)] [string]$Version
)

# Colors for output
$colors = @{
  Success = 'Green'
  Error = 'Red'
  Warning = 'Yellow'
  Info = 'Cyan'
}

function Write-Status {
  param([string]$Message, [string]$Status = 'Info')
  Write-Host $Message -ForegroundColor $colors[$Status]
}

# Get target from env var if not provided
if (-not $Target) {
  $Target = $env:ITCH_TARGET
}

if (-not $Target) {
  Write-Status "Usage: ./deploy-to-itch.ps1 -Target 'yourname/game' -ApiKey 'your-api-key'" -Status Error
  Write-Status "Or set environment variables: ITCH_TARGET, ITCH_API_KEY" -Status Warning
  exit 1
}

# Get API key from env var if not provided
if (-not $ApiKey) {
  $ApiKey = $env:ITCH_API_KEY
}

if (-not $ApiKey) {
  Write-Status "itch.io API key required. Get one at: https://itch.io/user/settings/api-keys" -Status Error
  exit 1
}

# Read version from package.json
if (-not $Version) {
  $packageJson = Get-Content "$PSScriptRoot\..\package.json" | ConvertFrom-Json
  $Version = $packageJson.version
}

Write-Status "========================================" -Status Info
Write-Status "   itch.io Deployment: v$Version" -Status Info
Write-Status "========================================" -Status Info
Write-Host ""

# Verify build artifacts exist
$releaseDir = "$PSScriptRoot\..\release\$Version"
$winPortable = "$releaseDir\College-Basketball-Dynasty-$Version-Windows-Portable.zip"

if (-not (Test-Path $winPortable)) {
  Write-Status "Build artifact not found: $winPortable" -Status Error
  Write-Status "Run 'npm run build' first to generate release artifacts" -Status Warning
  exit 1
}

Write-Status "✓ Build artifact found: $(Split-Path $winPortable -Leaf)" -Status Success
Write-Host ""

# Parse target into user/game
$targetParts = $Target -split '/'
if ($targetParts.Count -ne 2) {
  Write-Status "Invalid target format. Use: username/game-name" -Status Error
  exit 1
}

$ItchUser = $targetParts[0]
$ItchGame = $targetParts[1]

Write-Status "Target: $ItchUser/$ItchGame" -Status Info
Write-Status "Version: $Version" -Status Info
Write-Status "File: $(Split-Path $winPortable -Leaf)" -Status Info
Write-Status "Size: $([math]::Round((Get-Item $winPortable).Length / 1MB, 2)) MB" -Status Info
Write-Host ""

Write-Status "Deployment ready! You can now:" -Status Info
Write-Host ""
Write-Host "Option 1: Use itch.io Web UI (Easiest)"
Write-Host "  1. Go to: https://itch.io/dashboard/games/$ItchGame"
Write-Host "  2. Click 'Upload new build'"
Write-Host "  3. Select file: $(Split-Path $winPortable -Leaf)"
Write-Host "  4. Platform: Windows"
Write-Host "  5. Mark as 'Executable'"
Write-Host "  6. Save"
Write-Host ""
Write-Host "Option 2: Use Butler CLI (Automated)"
Write-Host "  1. Install butler: https://itch.io/docs/butler/installing.html"
Write-Host "  2. Login: butler login"
Write-Host "  3. Push: butler push '$winPortable' '$Target:windows' --userversion=$Version"
Write-Host ""
Write-Host "Option 3: Use this script with API key"
Write-Host "  (Advanced - would require custom API integration)"
Write-Host ""

Write-Status "Build ready at: $winPortable" -Status Success
