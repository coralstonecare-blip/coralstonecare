param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("daily", "report", "audit", "token-health")]
  [string]$Job
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $RepoRoot "seo-engine\logs"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCommand) {
  $Node = $NodeCommand.Source
}
else {
  $Node = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (-not (Test-Path $Node)) { throw "Node.js 20+ was not found. Install Node.js or update scripts/run-seo-job.ps1." }
}
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "$Job-$Timestamp.log"

$Script = switch ($Job) {
  "daily" { "seo-engine\src\daily.js" }
  "report" { "seo-engine\src\report.js" }
  "audit" { "seo-engine\src\audit.js" }
  "token-health" { "seo-engine\src\token-health.js" }
}

Push-Location $RepoRoot
try {
  & $Node $Script --review *>&1 | Tee-Object -FilePath $LogFile
  $ExitCode = $LASTEXITCODE
  if ($ExitCode -eq 2) { exit 0 }
  exit $ExitCode
}
finally {
  Pop-Location
}
