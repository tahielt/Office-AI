$repoRoot = Split-Path -Parent $PSScriptRoot
$n8nUserFolder = Join-Path $repoRoot "n8n"
$workflowFolder = Join-Path $repoRoot "n8n\workflows"

$env:N8N_USER_FOLDER = $n8nUserFolder
$env:N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "false"

if (!(Test-Path $workflowFolder)) {
  Write-Error "No existe la carpeta de workflows en $workflowFolder"
  exit 1
}

Write-Host "Importando workflows desde $workflowFolder" -ForegroundColor Cyan
Write-Host "Este import crea copias nuevas en n8n. Si despues queres volver a una sola copia activa de Office AI, corré: npm run n8n:sync:office" -ForegroundColor DarkGray
npx n8n import:workflow --separate --input $workflowFolder
