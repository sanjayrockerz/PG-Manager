# Setup Automation (Scalable Working PG SaaS Model)

This repository ships hardened, rerunnable setup scripts for a professionally built scalable working PG SaaS model. The scripts enforce explicit mode selection, confirmation gates, and production-safe defaults.

## Files

- `scripts/check-env.ps1`
- `scripts/check-env.sh`
- `scripts/setup.ps1`
- `scripts/setup.sh`
- `.env.setup.example`

## Security and execution model

- Default mode is `local` (no remote writes).
- Remote writes require explicit mode (`preview` or `production`).
- A confirmation gate is enforced before remote-write actions.
- Production mode requires an additional production confirmation gate.
- Dry-run is supported in every mode.
- Secrets are sourced from environment variables or secure prompts only.

## Windows prerequisites (exact)

1. Install Node.js LTS and verify:

```powershell
node --version
npm --version
```

2. Install Vercel CLI and verify:

```powershell
npm install -g vercel
vercel --version
```

If you want to run `.sh` scripts on Windows, install either Git Bash or WSL with a working `/bin/bash`.

3. Install Supabase CLI.

Preferred attempt via winget:

```powershell
winget source update
winget search supabase
winget install <Supabase-package-id>
```

If winget catalog does not contain Supabase CLI in your environment, use official release binary:

```powershell
$release=Invoke-RestMethod -Uri "https://api.github.com/repos/supabase/cli/releases/latest"
$asset=$release.assets | Where-Object { $_.name -match 'windows_amd64\.tar\.gz$' } | Select-Object -First 1
New-Item -ItemType Directory -Force -Path .tools\supabase | Out-Null
$archivePath = Join-Path .tools\supabase $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archivePath
tar -xzf $archivePath -C .tools\supabase
```

Verify Supabase CLI:

```powershell
./.tools/supabase/supabase.exe --version
./.tools/supabase/supabase.exe db query --help
```

## Prepare environment values

1. Copy `.env.setup.example` to `.env.setup`.
2. Fill values for your target environment(s).
3. Load variables into your shell.

PowerShell:

```powershell
Get-Content .env.setup | ForEach-Object {
  if ($_ -match '^[A-Za-z_][A-Za-z0-9_]*=') {
    $key, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($key, $value)
  }
}
```

Bash:

```bash
set -a
source .env.setup
set +a
```

## Mode-specific checks

PowerShell:

```powershell
./scripts/check-env.ps1 -Mode local
./scripts/check-env.ps1 -Mode preview -RequireAll
./scripts/check-env.ps1 -Mode production -RequireAll
```

Bash:

```bash
./scripts/check-env.sh --mode=local
./scripts/check-env.sh --mode=preview --require-all
./scripts/check-env.sh --mode=production --require-all
```

## Mode behavior

### Local mode (validation only)

- No Vercel env updates
- No Supabase remote DB writes
- No deployment
- Verifies CLI support and repo structure (migrations vs schema fallback)

### Preview mode (remote setup + preview deploy)

- Updates only preview-scoped Vercel env vars
- Applies Supabase schema/migrations and optional seed files to linked preview project
- Runs preview deployment (`vercel deploy`)

### Production mode (remote setup + production deploy)

- Updates only production-scoped Vercel env vars
- Applies Supabase schema/migrations and optional seed files to linked production project
- Runs production deployment (`vercel deploy --prod`)
- Requires both remote-write and production confirmation gates

## Schema handling (repo-structure aware)

Scripts follow this order:

1. If `supabase/migrations/*.sql` exists:
   - `supabase db push --linked`
2. Otherwise, if `supabase/schema.sql` exists:
   - `supabase db query --linked --file supabase/schema.sql`
3. Seed files (unless skipped):
   - `supabase db query --linked --file supabase/seed_demo_owner.sql`
   - `supabase db query --linked --file supabase/seed_demo_tenant_link.sql`
   - `supabase db query --linked --file supabase/seed_demo_admin_link.sql`

Note: seed file names retain legacy `demo` naming, but they are used here as baseline initialization datasets.

## Commands by mode

PowerShell:

```powershell
# Local validation only
./scripts/setup.ps1 -Mode local -DryRun

# Preview setup/deploy (dry-run then execute)
./scripts/setup.ps1 -Mode preview -DryRun
./scripts/setup.ps1 -Mode preview -ConfirmRemoteWrite

# Production setup/deploy (dry-run then execute)
./scripts/setup.ps1 -Mode production -DryRun
./scripts/setup.ps1 -Mode production -ConfirmRemoteWrite -ConfirmProduction
```

Bash:

```bash
# Local validation only
./scripts/setup.sh --mode=local --dry-run

# Preview setup/deploy (dry-run then execute)
./scripts/setup.sh --mode=preview --dry-run
./scripts/setup.sh --mode=preview --confirm-remote-write

# Production setup/deploy (dry-run then execute)
./scripts/setup.sh --mode=production --dry-run
./scripts/setup.sh --mode=production --confirm-remote-write --confirm-production
```

Optional flags:

- Skip seed SQL: `-SkipSeeds` / `--skip-seeds`
- Skip deployment: `-SkipDeploy` / `--skip-deploy`
- Non-interactive prompts disabled: `-NoPrompt` / `--no-prompt`

## Expected environment variables

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID` (optional)
- `VERCEL_PROJECT_NAME`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` (generic fallback)
- `SUPABASE_PROJECT_REF_PREVIEW` (recommended)
- `SUPABASE_PROJECT_REF_PRODUCTION` (recommended)
- `SUPABASE_DB_PASSWORD` (optional but recommended for non-interactive DB writes)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `PREVIEW_SITE_URL` (preview mode)
- `PROD_SITE_URL` (production mode)

## Remaining manual Supabase Dashboard steps

These steps remain manual due to ownership-sensitive or dashboard-specific controls:

1. Storage setup
   - Create bucket `tenant-files`
   - Add required `storage.objects` policies in Dashboard policy editor
2. Realtime enrollment
   - Database -> Replication (Realtime)
   - Enable realtime for: `properties`, `rooms`, `tenants`, `payments`, `payment_charges`, `maintenance_tickets`, `maintenance_notes`, `announcements`, `notifications`
3. Auth settings
   - Enable Email OTP
   - Configure production Site URL and preview redirect URLs
4. Optional trigger attach on `auth.users`
   - Run only if your project role has required ownership permissions

## Source control hygiene

- `.env.setup` is gitignored.
- Do not commit populated secrets.
- Scripts mask token/password arguments in dry-run logs.
