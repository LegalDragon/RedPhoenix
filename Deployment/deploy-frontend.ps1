# Frontend Deploy Script for RedPhoenix
# Run from: F:\GIT_Local\RedPhoenix\Deployment\deploy-frontend.ps1

param(
    [string]$SiteName = "redphoenix.app"
)

$ErrorActionPreference = "Stop"

Write-Host "=== RedPhoenix Frontend Deploy ===" -ForegroundColor Cyan
Write-Host "Site: $SiteName" -ForegroundColor Yellow

# Paths
$RepoRoot = "F:\GIT_Local\RedPhoenix"
$FrontendPath = "$RepoRoot\frontend"
$DeployPath = "F:\New_WWW\RedPhoenix\WWW"

# Step 1: Git pull
Write-Host "`n[1/4] Pulling latest code..." -ForegroundColor Green
Set-Location $RepoRoot
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull failed. Continue anyway? (Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y") { exit 1 }
}

# Step 2: Build frontend
Write-Host "`n[2/4] Building frontend..." -ForegroundColor Green
Set-Location $FrontendPath
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy files (no IIS restart needed for frontend)
Write-Host "`n[3/4] Deploying files..." -ForegroundColor Green
Copy-Item -Path "$FrontendPath\dist\*" -Destination $DeployPath -Recurse -Force

# Also copy logo.svg from public if it exists
if (Test-Path "$FrontendPath\public\logo.svg") {
    Copy-Item -Path "$FrontendPath\public\logo.svg" -Destination $DeployPath -Force
}

# Step 4: Verify
Write-Host "`n[4/4] Verifying deployment..." -ForegroundColor Green
$indexFile = Get-Item "$DeployPath\index.html" -ErrorAction SilentlyContinue
if ($indexFile) {
    Write-Host "index.html updated: $($indexFile.LastWriteTime)" -ForegroundColor Cyan
} else {
    Write-Host "Warning: Could not find index.html" -ForegroundColor Yellow
}

Write-Host "`n=== Frontend Deploy Complete ===" -ForegroundColor Green
Write-Host "Test at: https://$SiteName" -ForegroundColor Cyan
