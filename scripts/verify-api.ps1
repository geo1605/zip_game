param(
  [Parameter(Mandatory = $true)]
  [string]$FlutterSdk
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$apiDirectory = Join-Path $repoRoot 'zip_game_api'
$logDirectory = Join-Path $repoRoot 'tmp\verification'
$flutterExe = Join-Path (Resolve-Path $FlutterSdk).Path 'bin\flutter.bat'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$checkResults = [ordered]@{}
$savedEnvironment = @{}
$serverProcess = $null

function Invoke-Check {
  param([string]$CheckName, [string]$Executable, [string[]]$ToolArguments)
  Write-Host "Running $CheckName..."
  $ErrorActionPreference = 'Continue'
  & $Executable @ToolArguments 2>&1 |
    Tee-Object -FilePath (Join-Path $logDirectory "$CheckName.log")
  $checkResults[$CheckName] = $LASTEXITCODE
}

Push-Location $apiDirectory
try {
  if (-not (Test-Path -LiteralPath '.env.test')) {
    Copy-Item -LiteralPath '.env.test.example' -Destination '.env.test'
  }
  $allowedKeys = @('TZ', 'PORT', 'HOST', 'LOG_LEVEL', 'APP_KEY', 'NODE_ENV',
    'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE')
  foreach ($line in Get-Content -LiteralPath '.env.test') {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2 -and $allowedKeys -contains $parts[0]) {
      $savedEnvironment[$parts[0]] = [Environment]::GetEnvironmentVariable($parts[0], 'Process')
      [Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
  }
  if ($env:NODE_ENV -ne 'test' -or -not $env:DB_DATABASE.EndsWith('_test')) {
    throw 'Use NODE_ENV=test and a dedicated database ending in _test.'
  }
  Invoke-Check 'api-typecheck' 'node' @('node_modules/typescript/bin/tsc', '--noEmit')
  Invoke-Check 'api-lint' 'node' @('node_modules/eslint/bin/eslint.js', '.')
  Invoke-Check 'api-tests' 'node' @('ace', 'test')
  Invoke-Check 'api-build' 'node' @('ace', 'build')
  if ($checkResults['api-tests'] -eq 0) {
    Invoke-Check 'api-migrations' 'node' @('ace', 'migration:run', '--force')
    if ($checkResults['api-migrations'] -ne 0) { throw 'Test migrations failed.' }
    $serverProcess = Start-Process -FilePath (Get-Command node.exe).Source `
      -ArgumentList @('--import=ts-node-maintained/register/esm', 'bin/server.ts') -WorkingDirectory $apiDirectory `
      -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $logDirectory 'api-server.log') `
      -RedirectStandardError (Join-Path $logDirectory 'api-server-error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      if ($serverProcess.HasExited) { throw 'The test API exited. Read api-server-error.log.' }
      try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$env:PORT/" -TimeoutSec 2 | Out-Null
        $ready = $true
        break
      } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw 'The test API did not become ready.' }
    Set-Location (Join-Path $repoRoot 'zip_game_frontend')
    Invoke-Check 'flutter-live-api' $flutterExe @(
      'test', 'test/live_api_test.dart', '--no-pub', '--reporter', 'expanded',
      '--dart-define=RUN_LIVE_API=true', "--dart-define=API_URL=http://127.0.0.1:$env:PORT/api"
    )
  }
} finally {
  if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
    Stop-Process -Id $serverProcess.Id
  }
  foreach ($entry in $savedEnvironment.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
  }
  Pop-Location
  $checkResults | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $logDirectory 'api-results.json')
}

Write-Host "Logs: $logDirectory"
$checkResults
if (@($checkResults.Values | Where-Object { $_ -ne 0 }).Count -gt 0) { exit 1 }
