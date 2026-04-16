param(
  [ValidateSet('local', 'preview', 'production')]
  [string]$Mode = 'local',
  [switch]$DryRun,
  [switch]$SkipSeeds,
  [switch]$SkipDeploy,
  [switch]$NoPrompt,
  [switch]$ConfirmRemoteWrite,
  [switch]$ConfirmProduction,
  [string[]]$SeedFiles = @('supabase/seed_demo_owner.sql', 'supabase/seed_demo_tenant_link.sql', 'supabase/seed_demo_admin_link.sql')
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

function Write-Step([string]$message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Write-Warn([string]$message) {
  Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Info([string]$message) {
  Write-Host "[INFO] $message" -ForegroundColor Gray
}

function Format-ArgsForLog([string[]]$arguments) {
  $masked = @()
  for ($i = 0; $i -lt $arguments.Count; $i++) {
    $arg = $arguments[$i]
    $masked += $arg
    if ($arg -in @('--token', '--password', '-p') -and ($i + 1) -lt $arguments.Count) {
      $masked += '<redacted>'
      $i++
    }
  }
  return $masked
}

function Invoke-Run([string]$command, [string[]]$arguments) {
  $previewArgs = Format-ArgsForLog $arguments
  $preview = "$command $($previewArgs -join ' ')"
  if ($DryRun) {
    Write-Host "[DRY-RUN] $preview" -ForegroundColor Yellow
    return
  }

  & $command @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $preview"
  }
}

function Assert-CommandAvailable([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing command '$name'. Install it and re-run setup."
  }
}

function Resolve-SupabaseCommand {
  $installed = Get-Command 'supabase' -ErrorAction SilentlyContinue
  if ($installed) {
    return 'supabase'
  }

  $fallback = Join-Path $repoRoot '.tools\supabase\supabase.exe'
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "Supabase CLI not found in PATH or at $fallback"
}

function Confirm-Or-Throw([string]$promptMessage, [string]$expectedText, [switch]$preApproved) {
  if ($DryRun) {
    Write-Info "Dry-run mode: confirmation gate skipped for '$expectedText'."
    return
  }

  if ($preApproved) {
    return
  }

  if ($NoPrompt) {
    throw "Non-interactive mode requires explicit confirmation flag for action gated by '$expectedText'."
  }

  $typed = Read-Host -Prompt "$promptMessage (type $expectedText to continue)"
  if ($typed -ne $expectedText) {
    throw "Confirmation failed. Expected '$expectedText'."
  }
}

function Get-EnvOrPrompt([string]$name, [switch]$Secure, [switch]$Optional) {
  $existing = [Environment]::GetEnvironmentVariable($name)
  if (-not [string]::IsNullOrWhiteSpace($existing)) {
    return $existing
  }

  if ($NoPrompt) {
    if ($Optional) {
      return ''
    }
    throw "Missing required environment variable: $name"
  }

  if ($Secure) {
    $secureValue = Read-Host -Prompt "Enter $name" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
      return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }

  return (Read-Host -Prompt "Enter $name")
}

function Set-VercelEnvVar([string]$name, [string]$value, [string]$target, [string]$token, [string]$scope) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Cannot set Vercel env '$name' for target '$target' because value is empty."
  }

  $baseArgs = @('env', 'rm', $name, $target, '--yes', '--token', $token)
  if (-not [string]::IsNullOrWhiteSpace($scope)) {
    $baseArgs += @('--scope', $scope)
  }

  if ($DryRun) {
    $maskedRmArgs = @('env', 'rm', $name, $target, '--yes', '--token', '<redacted>')
    if (-not [string]::IsNullOrWhiteSpace($scope)) {
      $maskedRmArgs += @('--scope', $scope)
    }
    Write-Host "[DRY-RUN] vercel $($maskedRmArgs -join ' ')" -ForegroundColor Yellow
  } else {
    & vercel @baseArgs 2>$null | Out-Null
  }

  $addArgs = @('env', 'add', $name, $target, '--token', $token)
  if (-not [string]::IsNullOrWhiteSpace($scope)) {
    $addArgs += @('--scope', $scope)
  }

  if ($DryRun) {
    $maskedAddArgs = @('env', 'add', $name, $target, '--token', '<redacted>')
    if (-not [string]::IsNullOrWhiteSpace($scope)) {
      $maskedAddArgs += @('--scope', $scope)
    }
    Write-Host "[DRY-RUN] echo <redacted> | vercel $($maskedAddArgs -join ' ')" -ForegroundColor Yellow
    return
  }

  $value | & vercel @addArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set Vercel env '$name' for target '$target'."
  }
}

Write-Step "Preflight checks (mode: $Mode)"

$env:CI = '1'
Assert-CommandAvailable 'node'
Assert-CommandAvailable 'npm'

$supabaseCommand = Resolve-SupabaseCommand
Invoke-Run $supabaseCommand @('--version')
Invoke-Run $supabaseCommand @('db', 'query', '--help')

if ($Mode -eq 'local') {
  Write-Step 'Local validation only mode selected'
  Write-Host 'No remote-write action will run in local mode.' -ForegroundColor Green

  $migrationsPath = Join-Path $repoRoot 'supabase\migrations'
  $hasMigrations = (Test-Path $migrationsPath) -and ((Get-ChildItem -Path $migrationsPath -Filter '*.sql' -File | Measure-Object).Count -gt 0)
  $hasSchema = Test-Path 'supabase/schema.sql'

  if ($hasMigrations) {
    Write-Info 'Repository uses migration flow: supabase/migrations/*.sql found.'
  } elseif ($hasSchema) {
    Write-Info 'Repository uses schema fallback flow: supabase/schema.sql found.'
  } else {
    throw 'No migrations found and supabase/schema.sql is missing.'
  }

  Write-Step 'Local validation complete'
  Write-Host 'Next: run preview mode explicitly when you are ready for remote setup/deploy.' -ForegroundColor Green
  exit 0
}

Assert-CommandAvailable 'vercel'

Confirm-Or-Throw -promptMessage "About to perform remote writes in $Mode mode" -expectedText 'APPLY' -preApproved:$ConfirmRemoteWrite
if ($Mode -eq 'production') {
  Confirm-Or-Throw -promptMessage 'Production mode selected. This may affect live systems.' -expectedText 'PRODUCTION' -preApproved:$ConfirmProduction
}

$VERCEL_TOKEN = Get-EnvOrPrompt 'VERCEL_TOKEN' -Secure
$VERCEL_ORG_ID = Get-EnvOrPrompt 'VERCEL_ORG_ID' -Optional
$VERCEL_PROJECT_NAME = Get-EnvOrPrompt 'VERCEL_PROJECT_NAME'
$SUPABASE_ACCESS_TOKEN = Get-EnvOrPrompt 'SUPABASE_ACCESS_TOKEN' -Secure

if ($Mode -eq 'preview') {
  $SUPABASE_PROJECT_REF = [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_REF_PREVIEW')
  if ([string]::IsNullOrWhiteSpace($SUPABASE_PROJECT_REF)) {
    $SUPABASE_PROJECT_REF = Get-EnvOrPrompt 'SUPABASE_PROJECT_REF'
  }
} else {
  $SUPABASE_PROJECT_REF = [Environment]::GetEnvironmentVariable('SUPABASE_PROJECT_REF_PRODUCTION')
  if ([string]::IsNullOrWhiteSpace($SUPABASE_PROJECT_REF)) {
    $SUPABASE_PROJECT_REF = Get-EnvOrPrompt 'SUPABASE_PROJECT_REF'
  }
}

$VITE_SUPABASE_URL = Get-EnvOrPrompt 'VITE_SUPABASE_URL'
$VITE_SUPABASE_ANON_KEY = Get-EnvOrPrompt 'VITE_SUPABASE_ANON_KEY' -Secure
$PROD_SITE_URL = ''
$PREVIEW_SITE_URL = ''
if ($Mode -eq 'preview') {
  $PREVIEW_SITE_URL = Get-EnvOrPrompt 'PREVIEW_SITE_URL'
}
if ($Mode -eq 'production') {
  $PROD_SITE_URL = Get-EnvOrPrompt 'PROD_SITE_URL'
}
$SUPABASE_DB_PASSWORD = Get-EnvOrPrompt 'SUPABASE_DB_PASSWORD' -Secure -Optional

Write-Step 'Linking Vercel project'
$vercelLinkArgs = @('link', '--yes', '--project', $VERCEL_PROJECT_NAME, '--token', $VERCEL_TOKEN)
if (-not [string]::IsNullOrWhiteSpace($VERCEL_ORG_ID)) {
  $vercelLinkArgs += @('--scope', $VERCEL_ORG_ID)
}
Invoke-Run 'vercel' $vercelLinkArgs

if ($Mode -eq 'preview') {
  Write-Step 'Setting Vercel Preview environment variables'
  Set-VercelEnvVar -name 'VITE_SUPABASE_URL' -value $VITE_SUPABASE_URL -target 'preview' -token $VERCEL_TOKEN -scope $VERCEL_ORG_ID
  Set-VercelEnvVar -name 'VITE_SUPABASE_ANON_KEY' -value $VITE_SUPABASE_ANON_KEY -target 'preview' -token $VERCEL_TOKEN -scope $VERCEL_ORG_ID
  Set-VercelEnvVar -name 'PREVIEW_SITE_URL' -value $PREVIEW_SITE_URL -target 'preview' -token $VERCEL_TOKEN -scope $VERCEL_ORG_ID
} elseif ($Mode -eq 'production') {
  Write-Step 'Setting Vercel Production environment variables'
  Set-VercelEnvVar -name 'VITE_SUPABASE_URL' -value $VITE_SUPABASE_URL -target 'production' -token $VERCEL_TOKEN -scope $VERCEL_ORG_ID
  Set-VercelEnvVar -name 'VITE_SUPABASE_ANON_KEY' -value $VITE_SUPABASE_ANON_KEY -target 'production' -token $VERCEL_TOKEN -scope $VERCEL_ORG_ID
  Set-VercelEnvVar -name 'PROD_SITE_URL' -value $PROD_SITE_URL -target 'production' -token $VERCEL_TOKEN -scope $VERCEL_ORG_ID
}

Write-Step 'Authenticating Supabase CLI'
Invoke-Run $supabaseCommand @('login', '--token', $SUPABASE_ACCESS_TOKEN)

Write-Step 'Linking Supabase project'
$supabaseLinkArgs = @('link', '--project-ref', $SUPABASE_PROJECT_REF)
if (-not [string]::IsNullOrWhiteSpace($SUPABASE_DB_PASSWORD)) {
  $supabaseLinkArgs += @('--password', $SUPABASE_DB_PASSWORD)
}
Invoke-Run $supabaseCommand $supabaseLinkArgs

$migrationsPath = Join-Path $repoRoot 'supabase\migrations'
$hasMigrations = (Test-Path $migrationsPath) -and ((Get-ChildItem -Path $migrationsPath -Filter '*.sql' -File | Measure-Object).Count -gt 0)

if ($hasMigrations) {
  Write-Step 'Applying migrations with supabase db push'
  $pushArgs = @('db', 'push', '--linked')
  if (-not [string]::IsNullOrWhiteSpace($SUPABASE_DB_PASSWORD)) {
    $pushArgs += @('--password', $SUPABASE_DB_PASSWORD)
  }
  Invoke-Run $supabaseCommand $pushArgs
} else {
  Write-Step 'No migrations detected; applying schema file via supabase db query --linked'
  if (-not (Test-Path 'supabase/schema.sql')) {
    throw 'Schema file not found at supabase/schema.sql'
  }
  Invoke-Run $supabaseCommand @('db', 'query', '--linked', '--file', 'supabase/schema.sql')
}

if (-not $SkipSeeds) {
  Write-Step 'Applying baseline seed SQL files'
  foreach ($seedFile in $SeedFiles) {
    if (-not (Test-Path $seedFile)) {
      Write-Host "Skipping missing seed file: $seedFile" -ForegroundColor Yellow
      continue
    }
    Invoke-Run $supabaseCommand @('db', 'query', '--linked', '--file', $seedFile)
  }
}

if (-not $SkipDeploy) {
  if ($Mode -eq 'preview') {
    Write-Step 'Deploying preview build to Vercel'
    $deployArgs = @('deploy', '--yes', '--token', $VERCEL_TOKEN)
    if (-not [string]::IsNullOrWhiteSpace($VERCEL_ORG_ID)) {
      $deployArgs += @('--scope', $VERCEL_ORG_ID)
    }
    Invoke-Run 'vercel' $deployArgs
  }

  if ($Mode -eq 'production') {
    Write-Step 'Deploying production build to Vercel'
    $deployArgs = @('deploy', '--prod', '--yes', '--token', $VERCEL_TOKEN)
    if (-not [string]::IsNullOrWhiteSpace($VERCEL_ORG_ID)) {
      $deployArgs += @('--scope', $VERCEL_ORG_ID)
    }
    Invoke-Run 'vercel' $deployArgs
  }
} else {
  Write-Warn 'Deployment skipped due to -SkipDeploy flag.'
}

Write-Step 'Setup complete'
if ($DryRun) {
  Write-Host 'Dry run completed. Re-run without -DryRun to execute.' -ForegroundColor Yellow
}
Write-Host 'Remaining manual Supabase Dashboard steps are documented in SETUP_AUTOMATION.md'
