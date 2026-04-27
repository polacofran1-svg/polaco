# Saturn - Setup completo (DB + Discord + digest diario)
# Correr una sola vez como Administrador:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-digest.ps1

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$paperclipDir = "$repoRoot\.paperclip"
$envFile = "$paperclipDir\.env"
$configFile = "$paperclipDir\config.json"

# Credenciales del equipo
$DATABASE_URL = "postgresql://neondb_owner:npg_yCR6A3hZeFob@ep-shy-grass-amgu3gx1.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
$DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1497610678947807406/u8HVw1fEMZp8eKDXCGxknKBJ1b90ntHctmMSSDwGZJ0TEF0tpqhFwVcm8XH3XxfZ0BfS"

# Crear carpeta .paperclip si no existe
if (-not (Test-Path $paperclipDir)) {
    New-Item -ItemType Directory -Path $paperclipDir | Out-Null
}

# Crear config.json si no existe
if (-not (Test-Path $configFile)) {
    '{"database":{"mode":"postgres"}}' | Out-File -FilePath $configFile -Encoding utf8
    Write-Host "OK - config.json creado" -ForegroundColor Green
}

# Crear o sobreescribir .env con las credenciales del equipo
@"
DATABASE_URL=$DATABASE_URL
DISCORD_WEBHOOK_URL=$DISCORD_WEBHOOK_URL
"@ | Out-File -FilePath $envFile -Encoding utf8
Write-Host "OK - .env configurado con DB y Discord" -ForegroundColor Green

# Configurar Task Scheduler para las 00:00
$taskName = "OrbitDigest"
$taskAction = "cmd /c cd /d `"$repoRoot`" && npm run digest >> `"$paperclipDir\digest.log`" 2>&1"

schtasks /delete /tn $taskName /f 2>$null
schtasks /create /tn $taskName /tr $taskAction /sc daily /st 00:00 /f

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Digest programado todos los dias a las 00:00" -ForegroundColor Green
    Write-Host ""
    Write-Host "Todo listo. Corre 'npm run dev' para arrancar." -ForegroundColor Cyan
} else {
    Write-Host "Error al crear la tarea. Intentalo como Administrador." -ForegroundColor Red
}
