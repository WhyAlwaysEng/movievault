# ==============================================================================
# MovieVault - Automated Sync to Orange Pi
# ==============================================================================
# Usage:
#   .\scripts\deploy-to-orangepi.ps1 -OrangePiIP "192.168.1.50"
# ==============================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$OrangePiIP,

    [string]$User = "orangepi",
    [string]$RemoteAppDir = "/home/orangepi/movievault",
    [string]$RemoteStorageDir = "/mnt/storage/movievault/data"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 [1/4] Preparing MovieVault package for Orange Pi ($OrangePiIP)..." -ForegroundColor Cyan

$tempArchive = "$PSScriptRoot\..\temp_movievault_deploy.tar.gz"

if (Test-Path $tempArchive) {
    Remove-Item $tempArchive -Force
}

# Archive project files while excluding node_modules, .next, and temporary files
tar --exclude="node_modules" `
    --exclude=".next" `
    --exclude=".git" `
    --exclude="data" `
    --exclude="*.tar.gz" `
    -czf $tempArchive -C "$PSScriptRoot\.." .

Write-Host "📦 [2/4] Uploading application code to $User@$OrangePiIP..." -ForegroundColor Cyan
scp $tempArchive "${User}@${OrangePiIP}:~/temp_movievault_deploy.tar.gz"
Remove-Item $tempArchive -Force

Write-Host "📂 Extracting on Orange Pi..." -ForegroundColor DarkGray
ssh "${User}@${OrangePiIP}" "mkdir -p $RemoteAppDir && tar -xzf ~/temp_movievault_deploy.tar.gz -C $RemoteAppDir && rm ~/temp_movievault_deploy.tar.gz"

Write-Host "💾 [3/4] Syncing SQLite Database to External Harddisk ($RemoteStorageDir/db)..." -ForegroundColor Cyan
ssh "${User}@${OrangePiIP}" "mkdir -p $RemoteStorageDir/db $RemoteStorageDir/media $RemoteStorageDir/actresses $RemoteStorageDir/backups"

$dbPath = "$PSScriptRoot\..\data\db\movievault.db"
if (Test-Path $dbPath) {
    scp $dbPath "${User}@${OrangePiIP}:${RemoteStorageDir}/db/movievault.db"
    Write-Host " Database synced successfully." -ForegroundColor Green
} else {
    Write-Host "⚠️ Local database not found at $dbPath (skipping DB upload)." -ForegroundColor Yellow
}

$envPath = "$PSScriptRoot\..\.env.local"
if (Test-Path $envPath) {
    Write-Host "🔑 Uploading .env.local..." -ForegroundColor DarkGray
    scp $envPath "${User}@${OrangePiIP}:${RemoteAppDir}/.env.local"
}

Write-Host "`n✅ [4/4] Transfer complete!" -ForegroundColor Green
Write-Host "Next steps on Orange Pi:" -ForegroundColor Yellow
Write-Host "  1. ssh ${User}@${OrangePiIP}" -ForegroundColor White
Write-Host "  2. cd $RemoteAppDir" -ForegroundColor White
Write-Host "  3. npm install" -ForegroundColor White
Write-Host "  4. npm run build" -ForegroundColor White
Write-Host "  5. pm2 restart movievault || pm2 start npm --name 'movievault' -- start" -ForegroundColor White
