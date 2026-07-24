param(
  [int]$Port = 8083
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($listener) {
  exit 0
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$logDirectory = Join-Path $env:LOCALAPPDATA 'Fieberwache'
$stdoutLog = Join-Path $logDirectory 'lan-server.log'
$stderrLog = Join-Path $logDirectory 'lan-server-error.log'

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

Start-Process `
  -FilePath $npm `
  -ArgumentList @('run', 'start:lan', '--', '--port', $Port) `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog
