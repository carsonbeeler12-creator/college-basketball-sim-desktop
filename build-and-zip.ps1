param(
    [ValidateSet('win','linux')]
    [string]$Platform = 'win'
)

# Build and package the game for distribution
Write-Host "Building College Basketball Dynasty for $Platform..." -ForegroundColor Cyan

# Get version from package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Version: $version" -ForegroundColor Green

# Build TypeScript and Vite
Write-Host "`nCompiling TypeScript..." -ForegroundColor Yellow
tsc
vite build

if ($Platform -eq 'win') {
    # Build Windows unpacked directory
    Write-Host "`nPackaging Windows (unpacked dir)..." -ForegroundColor Yellow
    npx electron-builder --dir --win

    $unpackedPath = "release\$version\win-unpacked"
    if (-not (Test-Path $unpackedPath)) {
        Write-Host "`nBuild failed - Windows unpacked directory not found!" -ForegroundColor Red
        exit 1
    }

    # Create zip file from unpacked dir
    $sourcePath = "$unpackedPath\*"
    $zipPath = "release\College-Basketball-Dynasty-$version-Windows.zip"
    Write-Host "`nCreating Windows zip..." -ForegroundColor Yellow
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path $sourcePath -DestinationPath $zipPath -Force

    if (Test-Path $zipPath) {
        $fileInfo = Get-Item $zipPath
        $sizeMB = [math]::Round($fileInfo.Length/1MB, 2)
        Write-Host "`nBuild successful!" -ForegroundColor Green
        Write-Host "  File: $zipPath" -ForegroundColor Cyan
        Write-Host "  Size: $sizeMB MB" -ForegroundColor Cyan
        Write-Host "  Ready to upload to itch.io!" -ForegroundColor Green
    } else {
        Write-Host "`nFailed to create Windows zip" -ForegroundColor Red
        exit 1
    }
}
elseif ($Platform -eq 'linux') {
    # Build Linux AppImage
    Write-Host "`nPackaging Linux (AppImage)..." -ForegroundColor Yellow
    npx electron-builder --linux AppImage

    $artifactName = "College Basketball Dynasty (BETA)-Linux-$version.AppImage"
    $artifactPath = Join-Path -Path "release\$version" -ChildPath $artifactName
    if (-not (Test-Path $artifactPath)) {
        Write-Host "`nBuild failed - AppImage not found: $artifactPath" -ForegroundColor Red
        exit 1
    }

    $fileInfo = Get-Item $artifactPath
    $sizeMB = [math]::Round($fileInfo.Length/1MB, 2)
    Write-Host "`nLinux build successful!" -ForegroundColor Green
    Write-Host "  File: $artifactPath" -ForegroundColor Cyan
    Write-Host "  Size: $sizeMB MB" -ForegroundColor Cyan
    Write-Host "  Upload the .AppImage directly (no zip needed)." -ForegroundColor Green
}
