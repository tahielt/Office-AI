$repoRoot = Split-Path -Parent $PSScriptRoot
$n8nUserFolder = Join-Path $repoRoot "n8n"

$env:N8N_USER_FOLDER = $n8nUserFolder
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "false"
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = "false"

Write-Host "Usando N8N_USER_FOLDER=$n8nUserFolder" -ForegroundColor Cyan
Write-Host "Para reinyectar y limpiar los 4 workflows de Office AI, corré antes: npm run n8n:sync:office" -ForegroundColor DarkGray
Write-Host "Si necesitás importar todos los JSON versionados como copias nuevas, usá: npm run n8n:import" -ForegroundColor DarkGray

npx n8n
