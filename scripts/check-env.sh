#!/usr/bin/env bash
set -euo pipefail

REQUIRE_ALL=false
MODE="local"

for arg in "$@"; do
  case "$arg" in
    --require-all) REQUIRE_ALL=true ;;
    --mode=local) MODE="local" ;;
    --mode=preview) MODE="preview" ;;
    --mode=production) MODE="production" ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

check_command() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "[OK] Command available: $cmd"
    return 0
  fi
  echo "[MISSING] Command not found: $cmd"
  return 1
}

resolve_supabase_cmd() {
  if command -v supabase >/dev/null 2>&1; then
    echo "supabase"
    return 0
  fi

  if [[ -x ".tools/supabase/supabase" ]]; then
    echo ".tools/supabase/supabase"
    return 0
  fi

  if [[ -f ".tools/supabase/supabase.exe" ]]; then
    echo ".tools/supabase/supabase.exe"
    return 0
  fi

  echo ""
}

all_commands_ok=true
for cmd in node npm; do
  if ! check_command "$cmd"; then
    all_commands_ok=false
  fi
done

if [[ "$MODE" != "local" ]]; then
  if ! check_command "vercel"; then
    all_commands_ok=false
  fi
fi

SUPABASE_CMD="$(resolve_supabase_cmd)"
if [[ -z "$SUPABASE_CMD" ]]; then
  if [[ "$MODE" != "local" ]]; then
    echo "[MISSING] Supabase CLI not found in PATH or .tools/supabase."
    all_commands_ok=false
  else
    echo "[WARN] Supabase CLI not found; install it to validate command compatibility."
  fi
else
  echo "[OK] Supabase command resolved: $SUPABASE_CMD"
  if "$SUPABASE_CMD" --version >/dev/null 2>&1; then
    echo "[OK] Supabase CLI executable works."
  else
    echo "[MISSING] Supabase CLI invocation failed."
    all_commands_ok=false
  fi

  if "$SUPABASE_CMD" db query --help >/dev/null 2>&1; then
    echo "[OK] Supabase command supported: db query"
  else
    echo "[MISSING] Supabase command not supported: db query"
    all_commands_ok=false
  fi

  if "$SUPABASE_CMD" db push --help >/dev/null 2>&1; then
    echo "[OK] Supabase command supported: db push"
  else
    echo "[MISSING] Supabase command not supported: db push"
    all_commands_ok=false
  fi
fi

required_vars=()

if [[ "$MODE" == "preview" || "$MODE" == "production" ]]; then
  required_vars+=(
    VERCEL_TOKEN
    VERCEL_PROJECT_NAME
    SUPABASE_ACCESS_TOKEN
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY
    VITE_SITE_URL
  )
fi

if [[ "$MODE" == "preview" ]]; then
  required_vars+=(PREVIEW_SITE_URL)
fi

if [[ "$MODE" == "production" ]]; then
  required_vars+=(PROD_SITE_URL)
fi

optional_vars=(
  VERCEL_ORG_ID
  SUPABASE_PROJECT_REF_PREVIEW
  SUPABASE_PROJECT_REF_PRODUCTION
  SUPABASE_PROJECT_REF
  SUPABASE_DB_PASSWORD
)

missing_required=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    missing_required+=("$var")
  fi
done

if [[ ${#missing_required[@]} -eq 0 ]]; then
  echo "[OK] Required environment variables are present for mode '$MODE'."
else
  echo "[WARN] Missing required environment variables: ${missing_required[*]}"
  echo "       Setup scripts can prompt for missing values unless --no-prompt is used."
fi

if [[ "$MODE" == "preview" || "$MODE" == "production" ]]; then
  resolved_ref=""
  if [[ "$MODE" == "preview" ]]; then
    resolved_ref="${SUPABASE_PROJECT_REF_PREVIEW:-${SUPABASE_PROJECT_REF:-}}"
  else
    resolved_ref="${SUPABASE_PROJECT_REF_PRODUCTION:-${SUPABASE_PROJECT_REF:-}}"
  fi

  if [[ -n "$resolved_ref" ]]; then
    echo "[OK] Supabase project ref resolved for mode '$MODE'."
  else
    echo "[WARN] No Supabase project ref pre-set for selected mode. Script will prompt unless --no-prompt is used."
  fi
fi

present_optional=()
for var in "${optional_vars[@]}"; do
  if [[ -n "${!var:-}" ]]; then
    present_optional+=("$var")
  fi
done
if [[ ${#present_optional[@]} -gt 0 ]]; then
  echo "[OK] Optional environment variables found: ${present_optional[*]}"
fi

expected_files=(
  "supabase/seed_demo_owner.sql"
  "supabase/seed_demo_tenant_link.sql"
  "supabase/seed_demo_admin_link.sql"
)

missing_files=()

if [[ -d "supabase/migrations" ]] && compgen -G "supabase/migrations/*.sql" >/dev/null; then
  echo "[OK] Migration flow detected: supabase/migrations/*.sql"
elif [[ -f "supabase/schema.sql" ]]; then
  echo "[OK] Schema fallback detected: supabase/schema.sql"
else
  echo "[MISSING] Neither migrations nor supabase/schema.sql found."
  missing_files+=("supabase/migrations/*.sql or supabase/schema.sql")
fi

for path in "${expected_files[@]}"; do
  if [[ ! -f "$path" ]]; then
    missing_files+=("$path")
  fi
done

if [[ ${#missing_files[@]} -eq 0 ]]; then
  echo "[OK] Required SQL files found."
else
  echo "[MISSING] Required files not found: ${missing_files[*]}"
fi

if [[ "$REQUIRE_ALL" == "true" ]]; then
  if [[ "$all_commands_ok" != "true" || ${#missing_required[@]} -gt 0 || ${#missing_files[@]} -gt 0 ]]; then
    echo "Environment check failed in strict mode."
    exit 1
  fi
fi

echo
echo "Next:"
echo "  - Run scripts/setup.sh --mode=$MODE --dry-run to preview actions."
if [[ "$MODE" == "preview" ]]; then
  echo "  - Then run scripts/setup.sh --mode=preview --confirm-remote-write."
fi
if [[ "$MODE" == "production" ]]; then
  echo "  - Then run scripts/setup.sh --mode=production --confirm-remote-write --confirm-production."
fi
if [[ "$MODE" == "local" ]]; then
  echo "  - Local mode does not execute remote writes."
fi
