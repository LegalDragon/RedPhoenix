# Backend Deploy Script for RedPhoenix
# Run from: F:\GIT_Local\RedPhoenix\Deployment\deploy-backend.ps1

param(
    [string]$SiteName = "redphoenix.app",
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
Import-Module WebAdministration

Write-Host "=== RedPhoenix Backend Deploy ===" -ForegroundColor Cyan
Write-Host "Site: $SiteName" -ForegroundColor Yellow

# Paths
$RepoRoot = "F:\GIT_Local\RedPhoenix"
$BackendPath = "$RepoRoot\backend\RedPhoenix.Api"
$DeployPath = "F:\New_WWW\RedPhoenix\API"
$AppPool = "RedPhoenix"

# Step 1: Git pull
Write-Host "`n[1/6] Pulling latest code..." -ForegroundColor Green
Set-Location $RepoRoot
git pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull failed. Continue anyway? (Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y") { exit 1 }
}

# Step 2: Database backup
if (-not $SkipBackup) {
    Write-Host "`n[2/6] Backing up database..." -ForegroundColor Green
    $backupScript = @"
EXEC master.dbo.sp_fxbackup 
    @databaseName = 'RedPhoenix',
    @backupType = 'F'
"@
    Invoke-Sqlcmd -ServerInstance "localhost" -Query $backupScript -QueryTimeout 300
    Write-Host "Backup completed" -ForegroundColor Cyan
} else {
    Write-Host "`n[2/6] Skipping database backup (--SkipBackup)" -ForegroundColor Yellow
}

# Step 3: Build backend
Write-Host "`n[3/6] Building backend..." -ForegroundColor Green
Set-Location $BackendPath
dotnet build RedPhoenix.Api.csproj --configuration Release
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

dotnet publish RedPhoenix.Api.csproj --configuration Release --output "$RepoRoot\publish\backend" --no-build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Stop app pool
Write-Host "`n[4/6] Stopping app pool: $AppPool..." -ForegroundColor Green
Stop-WebAppPool -Name $AppPool -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Step 5: Deploy backend files
Write-Host "`n[5/6] Deploying backend files..." -ForegroundColor Green
if (Test-Path $DeployPath) {
    # Preserve config files
    $preserveFiles = @("appsettings.Production.json", "web.config")
    Get-ChildItem -Path $DeployPath -Recurse -Exclude ($preserveFiles + "logs") | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item -Path "$RepoRoot\publish\backend\*" -Destination $DeployPath -Recurse -Force -Exclude "appsettings.Production.json"

# Step 6: Start app pool
Write-Host "`n[6/6] Starting app pool: $AppPool..." -ForegroundColor Green
Start-WebAppPool -Name $AppPool
Start-Sleep -Seconds 2

# Verify
$poolState = (Get-WebAppPoolState -Name $AppPool).Value
if ($poolState -eq "Started") {
    Write-Host "App pool is running" -ForegroundColor Cyan
} else {
    Write-Host "Warning: App pool state is $poolState" -ForegroundColor Yellow
}

Write-Host "`n=== Backend Deploy Complete ===" -ForegroundColor Green
Write-Host "Test at: https://$SiteName/api/health" -ForegroundColor Cyan
