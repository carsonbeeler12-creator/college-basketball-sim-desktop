param(
  [Parameter(Mandatory=$false)] [string]$Target, # e.g. yourname/college-basketball-dynasty
  [Parameter(Mandatory=$false)] [string]$Version,
  [switch]$Win,
  [switch]$Linux
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

# Validate butler availability
if (-not (Get-Command butler -ErrorAction SilentlyContinue)) {
  Write-Host "Itch 'butler' CLI not found. Install from https://itch.io/docs/butler/installing.html" -ForegroundColor Yellow
  exit 1
}

Write-Host "Publishing version $Version to itch target $Target" -ForegroundColor Cyan

$errors = @()

if ($Win -or (-not $Linux -and -not $Win)) {
  $winZip = "$PSScriptRoot\..\release\College-Basketball-Dynasty-$Version-Windows.zip"
  if (Test-Path $winZip) {
    Write-Host "Pushing Windows zip..." -ForegroundColor Yellow
    butler push $winZip "$Target:windows" | Write-Host
  } else {
    $errors += "Windows zip not found: $winZip"
  }
}

if ($Linux -or (-not $Linux -and -not $Win)) {
  $linuxAppImage = "$PSScriptRoot\..\release\$Version\College Basketball Dynasty (BETA)-Linux-$Version.tar.gz"
  if (-not (Test-Path $linuxAppImage)) {
    $candidate = Get-ChildItem -Path "$PSScriptRoot\..\release" -Recurse -Filter "*.tar.gz" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($candidate) { $linuxAppImage = $candidate.FullName }
  }
  if (Test-Path $linuxAppImage) {
    Write-Host "Pushing Linux tar.gz: $linuxAppImage" -ForegroundColor Yellow
    butler push $linuxAppImage "$Target:linux" | Write-Host
  } else {
    $errors += "Linux tar.gz not found under release/"
  }
}

if ($errors.Count -gt 0) {
  Write-Host "\nCompleted with missing artifacts:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
} else {
  Write-Host "\nPublish complete." -ForegroundColor Green
}
