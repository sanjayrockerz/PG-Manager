param(
  [ValidateSet('local', 'preview', 'production')]
  [string]$Mode = 'local',
  [switch]$RequireAll,
  [switch]$NoColor
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Write-Info([string]$message) {
  if ($NoColor) { Write-Host $message; return }
  Write-Host $message -ForegroundColor Cyan
}

function Write-Warn([string]$message) {
  if ($NoColor) { Write-Host $message; return }
  Write-Host $message -ForegroundColor Yellow
}

function Write-Err([string]$message) {
  if ($NoColor) { Write-Host $message; return }
  Write-Host $message -ForegroundColor Red
}

function Test-CommandAvailable([string]$name) {
  if (Get-Command $name -ErrorAction SilentlyContinue) {
    Write-Info "[OK] Command available: $name"
    return $true
  }
  Write-Err "[MISSING] Command not found: $name"
  return $false
}

function Resolve-SupabaseCommand {
  $installed = Get-Command 'supabase' -ErrorAction SilentlyContinue
  if ($installed) {
    return 'supabase'
  }

  $fallback = Join-Path $repoRoot '.tools\supabase\supabase.exe'
  if (Test-Path $fallback) {
    Write-Info "[OK] Using repository-local Supabase CLI: $fallback"
    return $fallback
  }

  Write-Err "[MISSING] Supabase CLI not found in PATH or at $fallback"
  return $null
}

$commands = @('node', 'npm')
if ($Mode -ne 'local') {
  $commands += @('vercel')
}

$allCommandsOk = $true
foreach ($cmd in $commands) {
  if (-not (Test-CommandAvailable $cmd)) {
    $allCommandsOk = $false
  }
}

$supabaseCommand = Resolve-SupabaseCommand
if ($Mode -ne 'local' -and -not $supabaseCommand) {
  $allCommandsOk = $false
}

if ($supabaseCommand) {
  try {
    & $supabaseCommand '--version' | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Info '[OK] Supabase CLI executable works.'
    }

    & $supabaseCommand 'db' 'query' '--help' | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Info '[OK] Supabase command supported: db query'
    } else {
      Write-Err '[MISSING] Supabase command not supported: db query'
      $allCommandsOk = $false
    }

    & $supabaseCommand 'db' 'push' '--help' | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Info '[OK] Supabase command supported: db push'
    } else {
      Write-Err '[MISSING] Supabase command not supported: db push'
      $allCommandsOk = $false
    }
  } catch {
    Write-Err "[MISSING] Supabase CLI invocation failed: $($_.Exception.Message)"
    $allCommandsOk = $false
  }
}

$requiredVars = @()
if ($Mode -eq 'preview' -or $Mode -eq 'production') {
  $requiredVars += @(
    'VERCEL_TOKEN',
    'VERCEL_PROJECT_NAME',
    'SUPABASE_ACCESS_TOKEN',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SITE_URL'
  )
}

if ($Mode -eq 'preview') {
  $requiredVars += @('PREVIEW_SITE_URL')
}

if ($Mode -eq 'production') {
  $requiredVars += @('PROD_SITE_URL')
}

$optionalVars = @(
  'VERCEL_ORG_ID',
  'SUPABASE_PROJECT_REF_PREVIEW',
  'SUPABASE_PROJECT_REF_PRODUCTION',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_DB_PASSWORD'
)

$missingRequired = @()
foreach ($name in $requiredVars) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missingRequired += $name
  }
}

if ($missingRequired.Count -eq 0) {
  Write-Info "[OK] Required environment variables are present for mode '$Mode'."
} else {
  Write-Warn ('[WARN] Missing required environment variables: ' + ($missingRequired -join ', '))
  Write-Warn '       Setup scripts can prompt for missing values unless --NoPrompt is used.'
}

if ($Mode -eq 'preview' -or $Mode -eq 'production') {
  $selectedProjectRef = if ($Mode -eq 'preview') {
    [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_REF_PREVIEW')
  } else {
    [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_REF_PRODUCTION')
  }

  if ([string]::IsNullOrWhiteSpace($selectedProjectRef)) {
    $selectedProjectRef = [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_REF')
  }

  if ([string]::IsNullOrWhiteSpace($selectedProjectRef)) {
    Write-Warn '[WARN] No Supabase project ref pre-set for selected mode. Script will prompt unless -NoPrompt is used.'
  } else {
    Write-Info "[OK] Supabase project ref resolved for mode '$Mode'."
  }
}

$presentOptional = @()
foreach ($name in $optionalVars) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    $presentOptional += $name
  }
}
if ($presentOptional.Count -gt 0) {
  Write-Info ('[OK] Optional environment variables found: ' + ($presentOptional -join ', '))
}

$expectedFiles = @(
  'supabase/seed_demo_owner.sql',
  'supabase/seed_demo_tenant_link.sql',
  'supabase/seed_demo_admin_link.sql'
)

$missingFiles = @()

$migrationsPath = Join-Path $repoRoot 'supabase\migrations'
$hasMigrations = (Test-Path $migrationsPath) -and ((Get-ChildItem -Path $migrationsPath -Filter '*.sql' -File | Measure-Object).Count -gt 0)
$hasSchema = Test-Path 'supabase/schema.sql'

if ($hasMigrations) {
  Write-Info '[OK] Migration flow detected: supabase/migrations/*.sql'
} elseif ($hasSchema) {
  Write-Info '[OK] Schema fallback detected: supabase/schema.sql'
} else {
  Write-Err '[MISSING] Neither migrations nor supabase/schema.sql found.'
  $missingFiles += 'supabase/migrations/*.sql or supabase/schema.sql'
}

foreach ($path in $expectedFiles) {
  if (-not (Test-Path $path)) {
    $missingFiles += $path
  }
}

if ($missingFiles.Count -eq 0) {
  Write-Info '[OK] Required SQL files found.'
} else {
  Write-Err ('[MISSING] Required files not found: ' + ($missingFiles -join ', '))
}

if ($RequireAll) {
  if (-not $allCommandsOk -or $missingRequired.Count -gt 0 -or $missingFiles.Count -gt 0) {
    Write-Err 'Environment check failed in strict mode.'
    exit 1
  }
}

Write-Host ''
Write-Host 'Next:'
Write-Host "  - Run scripts/setup.ps1 -Mode $Mode -DryRun to preview actions."
if ($Mode -eq 'preview') {
  Write-Host '  - Then run scripts/setup.ps1 -Mode preview -ConfirmRemoteWrite.'
}
if ($Mode -eq 'production') {
  Write-Host '  - Then run scripts/setup.ps1 -Mode production -ConfirmRemoteWrite -ConfirmProduction.'
}
if ($Mode -eq 'local') {
  Write-Host '  - Local mode does not execute remote writes.'
}
