param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourcePath)) {
    throw "OpenAI key file not found."
}

$raw = (Get-Content -LiteralPath $SourcePath -Raw).Trim()
if ($raw -match '^OPENAI_API_KEY\s*=\s*(.+)$') {
    $key = $Matches[1].Trim().Trim('"').Trim("'")
} else {
    $key = $raw.Trim('"').Trim("'")
}

if ($key -notmatch '^sk-[A-Za-z0-9_-]{20,}$') {
    throw "The file does not contain a recognizable OpenAI API key."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $repoRoot '.env.local'
$lines = @()

if (Test-Path -LiteralPath $envPath) {
    $lines = @(Get-Content -LiteralPath $envPath | Where-Object {
        $_ -notmatch '^\s*OPENAI_API_KEY\s*='
    })
}

$lines += "OPENAI_API_KEY=$key"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $envPath,
    (($lines -join [Environment]::NewLine) + [Environment]::NewLine),
    $utf8NoBom
)

Write-Output "OpenAI key imported into the ignored local environment file."
