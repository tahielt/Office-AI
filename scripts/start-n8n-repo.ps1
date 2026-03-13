$repoRoot = Split-Path -Parent $PSScriptRoot
$n8nUserFolder = Join-Path $repoRoot "n8n"

$env:N8N_USER_FOLDER = $n8nUserFolder
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "false"

Write-Host "Usando N8N_USER_FOLDER=$n8nUserFolder" -ForegroundColor Cyan
Write-Host "Si queres ver los workflows del repo, corré antes: npm run n8n:import" -ForegroundColor DarkGray

npx n8n
