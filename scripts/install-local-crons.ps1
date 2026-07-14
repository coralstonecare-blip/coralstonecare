param(
  [switch]$EnablePublishing
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Runner = Join-Path $PSScriptRoot "run-seo-job.ps1"
$EnvFile = Join-Path $RepoRoot ".env.local"
$PowerShell = (Get-Command powershell.exe).Source

function New-SeoTaskAction([string]$Job) {
  $Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -Job $Job"
  New-ScheduledTaskAction -Execute $PowerShell -Argument $Arguments -WorkingDirectory $RepoRoot
}

function Register-SeoTask([string]$Name, [string]$Job, $Trigger, [string]$Description) {
  $Action = New-SeoTaskAction $Job
  $Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskName $Name -Action $Action -Trigger $Trigger -Settings $Settings -Description $Description -Force | Out-Null
}

$Daily = New-ScheduledTaskTrigger -Daily -At 10:00AM
$Weekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 8:00AM
$Token = New-ScheduledTaskTrigger -Daily -At 9:10AM
$Audit1 = New-ScheduledTaskTrigger -Weekly -WeeksInterval 2 -DaysOfWeek Monday -At 8:30AM

Register-SeoTask "CoralStoneCare-SEO-Daily" "daily" $Daily "Generate a review-ready Coral Stone Care SEO article."
Register-SeoTask "CoralStoneCare-SEO-Weekly" "report" $Weekly "Generate the weekly Search Console opportunity report."
Register-SeoTask "CoralStoneCare-SEO-TokenHealth" "token-health" $Token "Verify the Search Console OAuth refresh token."
Register-SeoTask "CoralStoneCare-SEO-Audit" "audit" $Audit1 "Audit production SEO endpoints every two weeks."

$HasOpenAI = $false
$HasGsc = $false
if (Test-Path $EnvFile) {
  $EnvText = Get-Content -Raw $EnvFile
  $HasOpenAI = $EnvText -match "(?m)^OPENAI_API_KEY=.+$"
  $HasGsc = $EnvText -match "(?m)^GSC_REFRESH_TOKEN=.+$" -and $EnvText -match "(?m)^GSC_CLIENT_ID=.+$" -and $EnvText -match "(?m)^GSC_CLIENT_SECRET=.+$"
}

if (-not $HasOpenAI) { Disable-ScheduledTask -TaskName "CoralStoneCare-SEO-Daily" | Out-Null }
if (-not $HasGsc) {
  Disable-ScheduledTask -TaskName "CoralStoneCare-SEO-Weekly" | Out-Null
  Disable-ScheduledTask -TaskName "CoralStoneCare-SEO-TokenHealth" | Out-Null
}
if ($EnablePublishing -and $HasOpenAI) {
  Write-Warning "The local daily task still generates review packages. Use GitHub Actions for unattended production publishing."
}

Get-ScheduledTask -TaskName "CoralStoneCare-SEO-*" | Select-Object TaskName, State
