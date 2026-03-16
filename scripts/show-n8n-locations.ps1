$repoRoot = Split-Path -Parent $PSScriptRoot
$versionedWorkflowFolder = Join-Path $repoRoot "n8n\workflows"
$runtimeUserFolder = Join-Path $repoRoot "n8n\.n8n"
$runtimeDb = Join-Path $runtimeUserFolder ".n8n\database.sqlite"

Write-Host "Workflows versionados:" -ForegroundColor Cyan
Write-Host "  $versionedWorkflowFolder"

Write-Host ""
Write-Host "Base local usada por npm run n8n:" -ForegroundColor Cyan
Write-Host "  $runtimeDb"

Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  npm run n8n:import"
Write-Host "  npm run n8n"
