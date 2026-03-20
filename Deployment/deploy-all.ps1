# Full Deploy Script for RedPhoenix
# Run from: F:\GIT_Local\RedPhoenix\Deployment\deploy-all.ps1

param(
    [switch]$SkipBackup,
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot

Write-Host "=== RedPhoenix Full Deploy ===" -ForegroundColor Cyan

if ($FrontendOnly) {
    Write-Host "Deploying frontend only..." -ForegroundColor Yellow
    & "$ScriptDir\deploy-frontend.ps1"
} elseif ($BackendOnly) {
    Write-Host "Deploying backend only..." -ForegroundColor Yellow
    if ($SkipBackup) {
        & "$ScriptDir\deploy-backend.ps1" -SkipBackup
    } else {
        & "$ScriptDir\deploy-backend.ps1"
    }
} else {
    Write-Host "Deploying backend and frontend..." -ForegroundColor Yellow
    
    # Backend first
    if ($SkipBackup) {
        & "$ScriptDir\deploy-backend.ps1" -SkipBackup
    } else {
        & "$ScriptDir\deploy-backend.ps1"
    }
    
    # Then frontend
    & "$ScriptDir\deploy-frontend.ps1"
}

Write-Host "`n=== All Deployments Complete ===" -ForegroundColor Green
Write-Host "Frontend: https://redphoenix.app" -ForegroundColor Cyan
Write-Host "Backend:  https://redphoenix.app/api/health" -ForegroundColor Cyan
