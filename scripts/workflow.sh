#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

STATUS_NO="No en producció"
STATUS_READY="Preparat per producció"
STATUS_PROD="A producció"

LOW_RISK_PATTERNS=(
  "^docs/"
  "^src/i18n/"
  "^public/"
  "\\.md$"
  "\\.txt$"
)

HIGH_RISK_PATTERNS=(
  "^src/app/api/"
  "^src/lib/fiscal/"
  "^src/lib/remittances/"
  "^src/lib/sepa/"
  "project-module"
  "fx"
  "exchange"
  "budget"
  "^firestore.rules$"
  "^storage.rules$"
  "^scripts/"
)

WORK_BRANCH=""
LAST_FETCH_OK=true

say() {
  printf '%s\n' "$1"
}

current_branch() {
  git rev-parse --abbrev-ref HEAD
}

refresh_origin() {
  if git fetch origin --quiet >/dev/null 2>&1; then
    LAST_FETCH_OK=true
    return 0
  fi

  LAST_FETCH_OK=false
  return 0
}

matches_any_pattern() {
  local value="$1"
  shift
  local pattern
  for pattern in "$@"; do
    if printf '%s\n' "$value" | grep -Eq "$pattern"; then
      return 0
    fi
  done
  return 1
}

collect_changed_files() {
  (
    git diff --name-only HEAD
    git ls-files --others --exclude-standard
  ) | awk 'NF' | sort -u
}

has_local_changes() {
  local files
  files=$(
    (
      git diff --name-only
      git diff --cached --name-only
      git ls-files --others --exclude-standard
    ) | awk 'NF' | sort -u
  )

  if [ -z "$files" ]; then
    return 1
  fi

  local file
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    return 0
  done <<EOF
$files
EOF

  return 1
}

classify_risk() {
  local files="$1"

  if [ -z "$files" ]; then
    printf '%s' "BAIX"
    return
  fi

  local has_high=false
  local all_low=true
  local file

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    if matches_any_pattern "$file" "${HIGH_RISK_PATTERNS[@]}"; then
      has_high=true
    fi

    if ! matches_any_pattern "$file" "${LOW_RISK_PATTERNS[@]}"; then
      all_low=false
    fi
  done <<EOF
$files
EOF

  if [ "$has_high" = true ]; then
    printf '%s' "ALT"
    return
  fi

  if [ "$all_low" = true ]; then
    printf '%s' "BAIX"
    return
  fi

  printf '%s' "MITJA"
}

main_has_remote_changes() {
  refresh_origin
  if [ "$LAST_FETCH_OK" != true ]; then
    # Sense remot no es pot garantir estat de main; triem el cami segur.
    return 0
  fi

  if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    return 1
  fi

  if git merge-base --is-ancestor refs/remotes/origin/main HEAD; then
    return 1
  fi

  return 0
}

build_auto_branch_name() {
  local base candidate counter
  base="codex/work-$(date '+%Y%m%d-%H%M%S')"
  candidate="$base"
  counter=1

  while git show-ref --verify --quiet "refs/heads/$candidate"; do
    candidate="${base}-${counter}"
    counter=$((counter + 1))
  done

  printf '%s' "$candidate"
}

decide_work_branch() {
  local risk="$1"
  local branch
  branch="$(current_branch)"

  if [ "$branch" = "HEAD" ]; then
    say "$STATUS_NO"
    say "No puc continuar en estat detached HEAD."
    exit 1
  fi

  if [ "$branch" = "prod" ]; then
    say "$STATUS_NO"
    say "No treballo mai directament a prod."
    exit 1
  fi

  if [ "$branch" = "main" ]; then
    if [ "$risk" = "BAIX" ] && ! main_has_remote_changes; then
      WORK_BRANCH="main"
      return
    fi

    WORK_BRANCH="$(build_auto_branch_name)"
    git checkout -b "$WORK_BRANCH" >/dev/null
    say "S'ha creat una branca segura: $WORK_BRANCH"
    return
  fi

  WORK_BRANCH="$branch"
}

run_inicia() {
  local mode="${1:-auto}"
  local branch
  branch="$(current_branch)"

  if [ "$branch" = "HEAD" ]; then
    say "$STATUS_NO"
    say "No puc començar en estat detached HEAD."
    exit 1
  fi

  if [ "$branch" = "prod" ]; then
    say "$STATUS_NO"
    say "No es pot començar feina directament a prod."
    exit 1
  fi

  if [ "$branch" != "main" ]; then
    say "$STATUS_NO"
    say "Ja estem treballant en una branca segura: $branch"
    return
  fi

  if [ "$mode" = "main" ]; then
    WORK_BRANCH="main"
    say "$STATUS_NO"
    say "Feina iniciada a main per canvi trivial."
    return
  fi

  WORK_BRANCH="$(build_auto_branch_name)"
  git checkout -b "$WORK_BRANCH" >/dev/null
  say "$STATUS_NO"
  say "Feina iniciada en branca segura: $WORK_BRANCH"
}

stage_changes() {
  git add -A
  if git diff --cached --quiet; then
    return 1
  fi
  return 0
}

run_checks() {
  bash "$SCRIPT_DIR/verify-local.sh"
  bash "$SCRIPT_DIR/verify-ci.sh"
}

commit_changes() {
  local risk="$1"
  local stamp
  stamp=$(TZ="Europe/Madrid" date '+%Y-%m-%d %H:%M')
  git commit -m "chore(workflow): acabat $stamp (risc $risk)"
}

push_branch() {
  local branch="$1"
  git push -u origin "$branch"
}

integrate_to_main() {
  local branch="$1"

  if [ "$branch" = "main" ]; then
    if ! git push origin main; then
      say "$STATUS_NO"
      say "No s'ha pogut pujar main. Mantinc el canvi segurament guardat en local."
      exit 1
    fi
    return
  fi

  git checkout main >/dev/null
  if ! git pull --ff-only origin main; then
    say "$STATUS_NO"
    say "No puc actualitzar main automàticament. El canvi queda guardat a $branch."
    git checkout "$branch" >/dev/null || true
    exit 1
  fi

  if ! git merge --no-ff "$branch" -m "chore(merge): integra $branch"; then
    git merge --abort || true
    say "$STATUS_NO"
    say "Hi ha conflicte d'integració. El canvi queda guardat a $branch."
    git checkout "$branch" >/dev/null || true
    exit 1
  fi

  if ! git push origin main; then
    say "$STATUS_NO"
    say "No s'ha pogut pujar main després de la integració."
    git checkout "$branch" >/dev/null || true
    exit 1
  fi
}

compute_repo_status() {
  refresh_origin

  if has_local_changes; then
    printf '%s' "$STATUS_NO"
    return
  fi

  local main_sha prod_sha head_sha
  main_sha=$(git rev-parse --verify refs/remotes/origin/main 2>/dev/null || true)
  prod_sha=$(git rev-parse --verify refs/remotes/origin/prod 2>/dev/null || true)
  head_sha=$(git rev-parse HEAD)

  if [ -z "$main_sha" ] || [ -z "$prod_sha" ]; then
    printf '%s' "$STATUS_NO"
    return
  fi

  if [ "$main_sha" = "$prod_sha" ]; then
    if git merge-base --is-ancestor "$head_sha" "$main_sha" 2>/dev/null; then
      printf '%s' "$STATUS_PROD"
      return
    fi
    printf '%s' "$STATUS_NO"
    return
  fi

  if git merge-base --is-ancestor "$head_sha" "$main_sha" 2>/dev/null; then
    printf '%s' "$STATUS_READY"
    return
  fi

  printf '%s' "$STATUS_NO"
}

require_clean_tree_for_publica() {
  if has_local_changes; then
    say "$STATUS_NO"
    say "Abans de publicar, cal tancar els canvis pendents amb 'acabat'."
    exit 1
  fi
}

run_acabat() {
  local changed_files risk final_status
  changed_files="$(collect_changed_files)"

  if [ -z "$changed_files" ]; then
    final_status="$(compute_repo_status)"
    say "$final_status"
    say "No hi ha canvis nous per tancar."
    return
  fi

  risk="$(classify_risk "$changed_files")"
  # Fallback segur: si no s'ha fet 'inicia', rescatem els canvis en una branca.
  decide_work_branch "$risk"
  say "Risc detectat: $risk"

  if ! stage_changes; then
    final_status="$(compute_repo_status)"
    say "$final_status"
    say "No hi ha canvis per commitejar."
    return
  fi

  run_checks
  commit_changes "$risk"
  push_branch "$WORK_BRANCH"
  integrate_to_main "$WORK_BRANCH"

  final_status="$(compute_repo_status)"
  say "$final_status"
}

run_publica() {
  local final_status
  require_clean_tree_for_publica

  if [ "$(current_branch)" != "main" ]; then
    git checkout main >/dev/null
  fi

  if ! git pull --ff-only origin main; then
    say "$STATUS_NO"
    say "No s'ha pogut actualitzar main abans de publicar."
    exit 1
  fi

  if ! bash "$SCRIPT_DIR/deploy.sh"; then
    final_status="$(compute_repo_status)"
    say "$final_status"
    exit 1
  fi

  say "$STATUS_PROD"
}

run_estat() {
  local final_status
  final_status="$(compute_repo_status)"
  say "$final_status"
}

main() {
  local cmd="${1:-}"
  local arg1="${2:-}"

  if [ -z "$cmd" ]; then
    say "Us: bash scripts/workflow.sh [inicia|acabat|publica|estat]"
    exit 1
  fi

  cd "$PROJECT_DIR"

  case "$cmd" in
    inicia)
      run_inicia "$arg1"
      ;;
    acabat)
      run_acabat
      ;;
    publica)
      run_publica
      ;;
    estat)
      run_estat
      ;;
    *)
      say "Comanda desconeguda: $cmd"
      say "Us: bash scripts/workflow.sh [inicia|acabat|publica|estat]"
      exit 1
      ;;
  esac
}

main "$@"
