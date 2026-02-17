#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

GIT_COMMON_DIR="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [ -z "$GIT_COMMON_DIR" ]; then
  echo "No s'ha pogut detectar el repositori git." >&2
  exit 1
fi

CONTROL_REPO_DIR="${WORKFLOW_CONTROL_REPO_DIR:-$(cd "$GIT_COMMON_DIR/.." && pwd)}"
DEFAULT_WORKTREE_ROOT="${WORKTREE_ROOT_DIR:-$(cd "$CONTROL_REPO_DIR/.." && pwd)/summa-social-worktrees}"
TTL_DAYS_DEFAULT=14

say() {
  printf '%s\n' "$1"
}

git_control() {
  git -C "$CONTROL_REPO_DIR" "$@"
}

current_repo_dir() {
  pwd
}

is_control_repo() {
  [ "$(current_repo_dir)" = "$CONTROL_REPO_DIR" ]
}

has_changes_in_repo() {
  local repo_dir="$1"
  if [ -n "$(git -C "$repo_dir" status --porcelain --untracked-files=normal)" ]; then
    return 0
  fi
  return 1
}

current_branch_in_repo() {
  local repo_dir="$1"
  git -C "$repo_dir" rev-parse --abbrev-ref HEAD
}

ensure_control_main_clean() {
  if ! is_control_repo; then
    say "Aquest pas s'ha d'executar des del repositori de control: $CONTROL_REPO_DIR"
    return 1
  fi

  local branch
  branch="$(current_branch_in_repo "$CONTROL_REPO_DIR")"
  if [ "$branch" != "main" ]; then
    say "El repositori de control ha d'estar a main (ara: $branch)."
    return 1
  fi

  if has_changes_in_repo "$CONTROL_REPO_DIR"; then
    say "El repositori de control ha d'estar net abans d'obrir una tasca nova."
    return 1
  fi

  if ! git_control pull --ff-only origin main >/dev/null; then
    say "No s'ha pogut actualitzar main al repositori de control."
    return 1
  fi

  if has_changes_in_repo "$CONTROL_REPO_DIR"; then
    say "Després de sincronitzar, el repositori de control no ha quedat net."
    return 1
  fi

  return 0
}

build_auto_branch_name() {
  local base candidate counter
  base="codex/work-$(date '+%Y%m%d-%H%M%S')"
  candidate="$base"
  counter=1

  while git_control show-ref --verify --quiet "refs/heads/$candidate"; do
    candidate="${base}-${counter}"
    counter=$((counter + 1))
  done

  printf '%s' "$candidate"
}

sanitize_branch_for_path() {
  printf '%s' "$1" | tr '/[:space:]' '-' | tr -cd '[:alnum:]_.-'
}

build_worktree_path() {
  local branch="$1"
  local sanitized base candidate counter
  sanitized="$(sanitize_branch_for_path "$branch")"
  base="$DEFAULT_WORKTREE_ROOT/$sanitized"
  candidate="$base"
  counter=1

  while [ -e "$candidate" ]; do
    candidate="${base}-${counter}"
    counter=$((counter + 1))
  done

  printf '%s' "$candidate"
}

safe_stat_mtime() {
  local target="$1"
  if stat -f %m "$target" >/dev/null 2>&1; then
    stat -f %m "$target"
    return
  fi
  stat -c %Y "$target"
}

age_days_for_path() {
  local target="$1"
  local now mtime
  now="$(date +%s)"
  mtime="$(safe_stat_mtime "$target")"
  if [ "$now" -lt "$mtime" ]; then
    printf '%s' 0
    return
  fi
  printf '%s' $(((now - mtime) / 86400))
}

is_branch_integrated_to_main() {
  local branch="$1"
  if ! git_control show-ref --verify --quiet "refs/heads/$branch"; then
    return 1
  fi
  if git_control merge-base --is-ancestor "$branch" main; then
    return 0
  fi
  return 1
}

branch_for_worktree_path() {
  local target_path="$1"
  git_control worktree list --porcelain | awk -v p="$target_path" '
    $1=="worktree" { wt=$2; next }
    $1=="branch" && wt==p {
      sub("refs/heads/", "", $2)
      print $2
      exit
    }
  '
}

worktree_exists() {
  local target_path="$1"
  git_control worktree list --porcelain | awk -v p="$target_path" '
    $1=="worktree" && $2==p { found=1 }
    END { exit(found ? 0 : 1) }
  '
}

link_control_env_file() {
  local worktree_path="$1"
  local file_name="$2"
  local control_file="$CONTROL_REPO_DIR/$file_name"
  local worktree_file="$worktree_path/$file_name"

  if [ ! -f "$control_file" ]; then
    return 0
  fi

  if [ -e "$worktree_file" ]; then
    return 0
  fi

  if ln -s "$control_file" "$worktree_file"; then
    say "Enllaç d'entorn creat: $file_name"
    return 0
  fi

  say "Avís: no s'ha pogut enllaçar $file_name al worktree."
  return 0
}

create_cmd() {
  local branch=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --branch)
        branch="${2:-}"
        shift 2
        ;;
      *)
        say "Paràmetre desconegut: $1"
        return 1
        ;;
    esac
  done

  ensure_control_main_clean || return 1

  if [ -z "$branch" ]; then
    branch="$(build_auto_branch_name)"
  fi

  if [[ "$branch" != codex/* ]]; then
    say "La branca de tasca ha de començar per codex/"
    return 1
  fi

  if git_control show-ref --verify --quiet "refs/heads/$branch"; then
    say "La branca ja existeix: $branch"
    return 1
  fi

  mkdir -p "$DEFAULT_WORKTREE_ROOT"

  local worktree_path
  worktree_path="$(build_worktree_path "$branch")"

  git_control worktree add -b "$branch" "$worktree_path" main >/dev/null
  link_control_env_file "$worktree_path" ".env.local"
  link_control_env_file "$worktree_path" ".env.demo"

  say "Branca de tasca creada: $branch"
  say "Worktree creat: $worktree_path"
  say "Treballa dins del worktree per implementar aquesta tasca."
}

list_cmd() {
  local control_abs
  control_abs="$(cd "$CONTROL_REPO_DIR" && pwd)"

  say "CONTROL: $control_abs"
  say "ROOT TASQUES: $DEFAULT_WORKTREE_ROOT"
  say ""
  printf '%-10s %-8s %-10s %-8s %s\n' "TIPUS" "BRANCA" "EDAT(d)" "NET" "PATH"

  while IFS=$'\t' read -r wt_path wt_branch; do
    local wt_abs wt_kind age_days clean
    wt_abs="$(cd "$wt_path" && pwd)"

    if [ "$wt_abs" = "$control_abs" ]; then
      wt_kind="CONTROL"
    elif [[ "$wt_abs" == "$DEFAULT_WORKTREE_ROOT"/* ]]; then
      wt_kind="TASK"
    else
      wt_kind="EXTERN"
    fi

    age_days="$(age_days_for_path "$wt_abs/.git")"

    if has_changes_in_repo "$wt_abs"; then
      clean="NO"
    else
      clean="SI"
    fi

    printf '%-10s %-8s %-10s %-8s %s\n' "$wt_kind" "${wt_branch:--}" "$age_days" "$clean" "$wt_abs"
  done < <(git_control worktree list --porcelain | awk '
    BEGIN { RS=""; FS="\n" }
    {
      wt=""; br=""
      for (i=1;i<=NF;i++) {
        if ($i ~ /^worktree /) wt=substr($i,10)
        if ($i ~ /^branch /) {
          br=substr($i,8)
          sub("refs/heads/", "", br)
        }
      }
      if (wt != "") print wt "\t" br
    }
  ')
}

close_cmd() {
  local target="${1:-}"
  local target_path target_branch current_abs

  current_abs="$(current_repo_dir)"

  if [ -z "$target" ]; then
    if is_control_repo; then
      say "Indica una branca o ruta de worktree per tancar."
      return 1
    fi
    target_path="$current_abs"
  elif [ -d "$target" ]; then
    target_path="$(cd "$target" && pwd)"
  elif [ -d "$PROJECT_DIR/$target" ]; then
    target_path="$(cd "$PROJECT_DIR/$target" && pwd)"
  else
    target_branch="$target"
    target_path="$(git_control worktree list --porcelain | awk -v b="$target_branch" '
      $1=="worktree" { wt=$2; next }
      $1=="branch" {
        branch=$2
        sub("refs/heads/", "", branch)
        if (branch==b) {
          print wt
          exit
        }
      }
    ')"
    if [ -z "$target_path" ]; then
      say "No s'ha trobat cap worktree per la branca: $target_branch"
      return 1
    fi
    target_path="$(cd "$target_path" && pwd)"
  fi

  local control_abs
  control_abs="$(cd "$CONTROL_REPO_DIR" && pwd)"
  if [ "$target_path" = "$control_abs" ]; then
    say "No es pot tancar el worktree de control."
    return 1
  fi

  if ! worktree_exists "$target_path"; then
    say "La ruta indicada no és un worktree registrat: $target_path"
    return 1
  fi

  target_branch="$(branch_for_worktree_path "$target_path")"
  if [ -z "$target_branch" ]; then
    say "No s'ha pogut determinar la branca del worktree: $target_path"
    return 1
  fi

  if has_changes_in_repo "$target_path"; then
    say "No es pot tancar: hi ha canvis pendents a $target_path"
    return 1
  fi

  if ! is_branch_integrated_to_main "$target_branch"; then
    say "No es pot tancar: la branca $target_branch encara no està integrada a main."
    return 1
  fi

  git_control worktree remove "$target_path"

  if ! git_control worktree list --porcelain | grep -q "branch refs/heads/$target_branch"; then
    git_control branch -d "$target_branch" >/dev/null 2>&1 || true
  fi

  say "Worktree tancat: $target_path"
  say "Branca validada i integrada: $target_branch"
}

gc_cmd() {
  local ttl_days="$TTL_DAYS_DEFAULT"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --ttl-days)
        ttl_days="${2:-}"
        shift 2
        ;;
      *)
        say "Paràmetre desconegut: $1"
        return 1
        ;;
    esac
  done

  if ! [[ "$ttl_days" =~ ^[0-9]+$ ]]; then
    say "ttl-days ha de ser un enter positiu."
    return 1
  fi

  local removed_count skipped_count
  removed_count=0
  skipped_count=0

  local control_abs
  control_abs="$(cd "$CONTROL_REPO_DIR" && pwd)"

  while IFS=$'\t' read -r wt_path wt_branch; do
    local wt_abs age_days
    wt_abs="$(cd "$wt_path" && pwd)"

    if [ "$wt_abs" = "$control_abs" ]; then
      continue
    fi

    if [[ "$wt_abs" != "$DEFAULT_WORKTREE_ROOT"/* ]]; then
      skipped_count=$((skipped_count + 1))
      continue
    fi

    if [[ "$wt_branch" != codex/* ]]; then
      skipped_count=$((skipped_count + 1))
      continue
    fi

    age_days="$(age_days_for_path "$wt_abs/.git")"
    if [ "$age_days" -lt "$ttl_days" ]; then
      skipped_count=$((skipped_count + 1))
      continue
    fi

    if has_changes_in_repo "$wt_abs"; then
      skipped_count=$((skipped_count + 1))
      continue
    fi

    if ! is_branch_integrated_to_main "$wt_branch"; then
      skipped_count=$((skipped_count + 1))
      continue
    fi

    git_control worktree remove "$wt_abs"
    if ! git_control worktree list --porcelain | grep -q "branch refs/heads/$wt_branch"; then
      git_control branch -d "$wt_branch" >/dev/null 2>&1 || true
    fi

    removed_count=$((removed_count + 1))
    say "Eliminat: $wt_abs ($wt_branch, ${age_days}d)"
  done < <(git_control worktree list --porcelain | awk '
    BEGIN { RS=""; FS="\n" }
    {
      wt=""; br=""
      for (i=1;i<=NF;i++) {
        if ($i ~ /^worktree /) wt=substr($i,10)
        if ($i ~ /^branch /) {
          br=substr($i,8)
          sub("refs/heads/", "", br)
        }
      }
      if (wt != "") print wt "\t" br
    }
  ')

  say "GC completat. Eliminats: $removed_count. Omesos: $skipped_count. TTL: ${ttl_days} dies."
}

usage() {
  say "Us: bash scripts/worktree.sh [create|list|close|gc]"
  say "  create [--branch codex/xxx]"
  say "  list"
  say "  close [<branch|path>]"
  say "  gc [--ttl-days 14]"
}

main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    create)
      create_cmd "$@"
      ;;
    list)
      list_cmd
      ;;
    close)
      close_cmd "$@"
      ;;
    gc)
      gc_cmd "$@"
      ;;
    *)
      usage
      return 1
      ;;
  esac
}

main "$@"
