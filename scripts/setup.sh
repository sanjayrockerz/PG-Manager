#!/usr/bin/env bash
set -euo pipefail

MODE="local"
DRY_RUN=false
SKIP_SEEDS=false
SKIP_DEPLOY=false
NO_PROMPT=false
CONFIRM_REMOTE_WRITE=false
CONFIRM_PRODUCTION=false

for arg in "$@"; do
  case "$arg" in
    --mode=local) MODE="local" ;;
    --mode=preview) MODE="preview" ;;
    --mode=production) MODE="production" ;;
    --dry-run) DRY_RUN=true ;;
    --skip-seeds) SKIP_SEEDS=true ;;
    --skip-deploy) SKIP_DEPLOY=true ;;
    --no-prompt) NO_PROMPT=true ;;
    --confirm-remote-write) CONFIRM_REMOTE_WRITE=true ;;
    --confirm-production) CONFIRM_PRODUCTION=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

SEED_FILES=(
  "supabase/seed_demo_owner.sql"
  "supabase/seed_demo_tenant_link.sql"
  "supabase/seed_demo_admin_link.sql"
)

step() {
  echo
  echo "==> $1"
}

warn() {
  echo "[WARN] $1"
}

info() {
  echo "[INFO] $1"
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

  echo "Supabase CLI not found in PATH or .tools/supabase." >&2
  exit 1
}

run_cmd() {
  local printable=()
  local skip_next=false
  for arg in "$@"; do
    if [[ "$skip_next" == "true" ]]; then
      printable+=("<redacted>")
      skip_next=false
      continue
    fi
    printable+=("$arg")
    if [[ "$arg" == "--token" || "$arg" == "--password" || "$arg" == "-p" ]]; then
      skip_next=true
    fi
  done

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] ${printable[*]}"
    return 0
  fi
  "$@"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command '$1'. Install it and re-run setup."
    exit 1
  fi
}

confirm_or_exit() {
  local prompt_message="$1"
  local expected_text="$2"
  local preapproved="$3"

  if [[ "$DRY_RUN" == "true" ]]; then
    info "Dry-run mode: confirmation gate skipped for '$expected_text'."
    return 0
  fi

  if [[ "$preapproved" == "true" ]]; then
    return 0
  fi

  if [[ "$NO_PROMPT" == "true" ]]; then
    echo "Non-interactive mode requires explicit confirmation flag for action gated by '$expected_text'." >&2
    exit 1
  fi

  local typed=""
  read -r -p "$prompt_message (type $expected_text to continue): " typed
  if [[ "$typed" != "$expected_text" ]]; then
    echo "Confirmation failed. Expected '$expected_text'." >&2
    exit 1
  fi
}

get_env_or_prompt() {
  local name="$1"
  local secret="${2:-false}"
  local optional="${3:-false}"

  local value="${!name:-}"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return 0
  fi

  if [[ "$NO_PROMPT" == "true" ]]; then
    if [[ "$optional" == "true" ]]; then
      printf ''
      return 0
    fi
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi

  if [[ "$secret" == "true" ]]; then
    read -r -s -p "Enter $name: " value
    echo
  else
    read -r -p "Enter $name: " value
  fi

  printf '%s' "$value"
}

set_vercel_env() {
  local name="$1"
  local value="$2"
  local target="$3"
  local token="$4"
  local scope="$5"

  if [[ -z "$value" ]]; then
    echo "Cannot set Vercel env '$name' for target '$target' because value is empty."
    exit 1
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    if [[ -n "$scope" ]]; then
      echo "[DRY-RUN] vercel env rm $name $target --yes --token <redacted> --scope $scope"
      echo "[DRY-RUN] echo <redacted> | vercel env add $name $target --token <redacted> --scope $scope"
    else
      echo "[DRY-RUN] vercel env rm $name $target --yes --token <redacted>"
      echo "[DRY-RUN] echo <redacted> | vercel env add $name $target --token <redacted>"
    fi
    return 0
  fi

  if [[ -n "$scope" ]]; then
    vercel env rm "$name" "$target" --yes --token "$token" --scope "$scope" >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$target" --token "$token" --scope "$scope"
  else
    vercel env rm "$name" "$target" --yes --token "$token" >/dev/null 2>&1 || true
    printf '%s' "$value" | vercel env add "$name" "$target" --token "$token"
  fi
}

step "Preflight checks (mode: $MODE)"
export CI=1
require_cmd node
require_cmd npm

SUPABASE_CMD="$(resolve_supabase_cmd)"
run_cmd "$SUPABASE_CMD" --version
run_cmd "$SUPABASE_CMD" db query --help

if [[ "$MODE" == "local" ]]; then
  step "Local validation only mode selected"
  echo "No remote-write action will run in local mode."

  if [[ -d "supabase/migrations" ]] && compgen -G "supabase/migrations/*.sql" >/dev/null; then
    info "Repository uses migration flow: supabase/migrations/*.sql found."
  elif [[ -f "supabase/schema.sql" ]]; then
    info "Repository uses schema fallback flow: supabase/schema.sql found."
  else
    echo "No migrations found and supabase/schema.sql is missing." >&2
    exit 1
  fi

  step "Local validation complete"
  echo "Next: run preview mode explicitly when you are ready for remote setup/deploy."
  exit 0
fi

require_cmd vercel

confirm_or_exit "About to perform remote writes in $MODE mode" "APPLY" "$CONFIRM_REMOTE_WRITE"
if [[ "$MODE" == "production" ]]; then
  confirm_or_exit "Production mode selected. This may affect live systems." "PRODUCTION" "$CONFIRM_PRODUCTION"
fi

VERCEL_TOKEN="$(get_env_or_prompt VERCEL_TOKEN true false)"
VERCEL_ORG_ID="$(get_env_or_prompt VERCEL_ORG_ID false true)"
VERCEL_PROJECT_NAME="$(get_env_or_prompt VERCEL_PROJECT_NAME false false)"
SUPABASE_ACCESS_TOKEN="$(get_env_or_prompt SUPABASE_ACCESS_TOKEN true false)"

if [[ "$MODE" == "preview" ]]; then
  SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF_PREVIEW:-${SUPABASE_PROJECT_REF:-}}"
else
  SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF_PRODUCTION:-${SUPABASE_PROJECT_REF:-}}"
fi

if [[ -z "$SUPABASE_PROJECT_REF" ]]; then
  SUPABASE_PROJECT_REF="$(get_env_or_prompt SUPABASE_PROJECT_REF false false)"
fi

VITE_SUPABASE_URL="$(get_env_or_prompt VITE_SUPABASE_URL false false)"
VITE_SUPABASE_ANON_KEY="$(get_env_or_prompt VITE_SUPABASE_ANON_KEY true false)"
PROD_SITE_URL=""
PREVIEW_SITE_URL=""
if [[ "$MODE" == "preview" ]]; then
  PREVIEW_SITE_URL="$(get_env_or_prompt PREVIEW_SITE_URL false false)"
fi
if [[ "$MODE" == "production" ]]; then
  PROD_SITE_URL="$(get_env_or_prompt PROD_SITE_URL false false)"
fi
SUPABASE_DB_PASSWORD="$(get_env_or_prompt SUPABASE_DB_PASSWORD true true)"

step "Linking Vercel project"
if [[ -n "$VERCEL_ORG_ID" ]]; then
  run_cmd vercel link --yes --project "$VERCEL_PROJECT_NAME" --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
else
  run_cmd vercel link --yes --project "$VERCEL_PROJECT_NAME" --token "$VERCEL_TOKEN"
fi

if [[ "$MODE" == "preview" ]]; then
  step "Setting Vercel Preview environment variables"
  set_vercel_env "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "preview" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
  set_vercel_env "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "preview" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
  set_vercel_env "PREVIEW_SITE_URL" "$PREVIEW_SITE_URL" "preview" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
fi

if [[ "$MODE" == "production" ]]; then
  step "Setting Vercel Production environment variables"
  set_vercel_env "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "production" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
  set_vercel_env "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "production" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
  set_vercel_env "PROD_SITE_URL" "$PROD_SITE_URL" "production" "$VERCEL_TOKEN" "$VERCEL_ORG_ID"
fi

step "Authenticating Supabase CLI"
run_cmd "$SUPABASE_CMD" login --token "$SUPABASE_ACCESS_TOKEN"

step "Linking Supabase project"
if [[ -n "$SUPABASE_DB_PASSWORD" ]]; then
  run_cmd "$SUPABASE_CMD" link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
else
  run_cmd "$SUPABASE_CMD" link --project-ref "$SUPABASE_PROJECT_REF"
fi

if [[ -d "supabase/migrations" ]] && compgen -G "supabase/migrations/*.sql" >/dev/null; then
  step "Applying migrations with supabase db push"
  if [[ -n "$SUPABASE_DB_PASSWORD" ]]; then
    run_cmd "$SUPABASE_CMD" db push --linked --password "$SUPABASE_DB_PASSWORD"
  else
    run_cmd "$SUPABASE_CMD" db push --linked
  fi
else
  step "No migrations detected; applying schema file via supabase db query --linked"
  if [[ ! -f "supabase/schema.sql" ]]; then
    echo "Schema file not found at supabase/schema.sql"
    exit 1
  fi
  run_cmd "$SUPABASE_CMD" db query --linked --file "supabase/schema.sql"
fi

if [[ "$SKIP_SEEDS" != "true" ]]; then
  step "Applying baseline seed SQL files"
  for seed in "${SEED_FILES[@]}"; do
    if [[ ! -f "$seed" ]]; then
      echo "Skipping missing seed file: $seed"
      continue
    fi
    run_cmd "$SUPABASE_CMD" db query --linked --file "$seed"
  done
fi

if [[ "$SKIP_DEPLOY" != "true" ]]; then
  if [[ "$MODE" == "preview" ]]; then
    step "Deploying preview build to Vercel"
    if [[ -n "$VERCEL_ORG_ID" ]]; then
      run_cmd vercel deploy --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
    else
      run_cmd vercel deploy --yes --token "$VERCEL_TOKEN"
    fi
  fi

  if [[ "$MODE" == "production" ]]; then
    step "Deploying production build to Vercel"
    if [[ -n "$VERCEL_ORG_ID" ]]; then
      run_cmd vercel deploy --prod --yes --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID"
    else
      run_cmd vercel deploy --prod --yes --token "$VERCEL_TOKEN"
    fi
  fi
else
  warn "Deployment skipped due to --skip-deploy flag."
fi

step "Setup complete"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run completed. Re-run without --dry-run to execute."
fi

echo "Remaining manual Supabase Dashboard steps are documented in SETUP_AUTOMATION.md"
