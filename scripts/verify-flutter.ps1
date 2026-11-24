param(
  [Parameter(Mandatory = $true)]
  [string]$FlutterSdk
)

# Ejecuta comprobaciones fijas; no publica ni modifica el repositorio remoto.
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$flutterExe = Join-Path (Resolve-Path $FlutterSdk).Path 'bin\flutter.bat'
$logDirectory = Join-Path $repoRoot 'tmp\verification'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$env:ZIP_FLUTTER_ROOT = (Resolve-Path $FlutterSdk).Path
$checkResults = [ordered]@{}

function Invoke-FlutterCheck {
  param([string]$CheckName, [string[]]$ToolArguments)
  Write-Host "Running $CheckName..."
  $ErrorActionPreference = 'Continue'
  & $flutterExe @ToolArguments 2>&1 |
    Tee-Object -FilePath (Join-Path $logDirectory "$CheckName.log")
  $checkResults[$CheckName] = $LASTEXITCODE
}

Push-Location (Join-Path $repoRoot 'zip_game_frontend')
try {
  Invoke-FlutterCheck 'flutter-analyze' @('analyze', '--no-pub')
  Invoke-FlutterCheck 'flutter-tests' @('test', '--no-pub', '--coverage', '--reporter', 'expanded')
  Invoke-FlutterCheck 'flutter-build' @('build', 'web', '--release', '--no-pub')
  if ($checkResults['flutter-tests'] -eq 0) {
    Invoke-FlutterCheck 'flutter-evidence' @(
      'test', 'test/evidence_capture_test.dart', '--no-pub',
      '--dart-define=CAPTURE_EVIDENCE=true', '--reporter', 'expanded'
    )
  }
} finally {
  Pop-Location
  $checkResults | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $logDirectory 'results.json')
}

Write-Host "Logs: $logDirectory"
$checkResults
if (@($checkResults.Values | Where-Object { $_ -ne 0 }).Count -gt 0) {
  exit 1
}
