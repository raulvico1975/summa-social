#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
. "$SCRIPT_DIR/change-profile.sh"

cd "$PROJECT_DIR"

GIT_COMMON_DIR="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [ -z "$GIT_COMMON_DIR" ]; then
  echo "No s'ha pogut detectar el repositori git." >&2
  exit 1
fi

CONTROL_REPO_DIR="${WORKFLOW_CONTROL_REPO_DIR:-$(cd "$GIT_COMMON_DIR/.." && pwd)}"
PUBLICA_TARGET_BRANCH="${DEPLOY_TARGET_BRANCH:-main}"

say() {
  printf '%s\n' "$1"
}

append_reason() {
  local current="${1:-}"
  local item="${2:-}"

  if [ -z "$item" ]; then
    printf '%s' "$current"
    return
  fi

  if [ -z "$current" ]; then
    printf '%s' "$item"
    return
  fi

  printf '%s\n%s' "$current" "$item"
}

limit_reasons() {
  local max_items="${1:-3}"
  local items="${2:-}"

  if [ -z "$items" ]; then
    return
  fi

  printf '%s\n' "$items" | awk 'NF { print; count++; if (count >= '"$max_items"') exit }'
}

join_reasons_inline() {
  local items="${1:-}"
  local first=true
  local item

  while IFS= read -r item; do
    [ -z "$item" ] && continue
    if [ "$first" = true ]; then
      printf '%s' "$item"
      first=false
    else
      printf '\n- %s' "$item"
    fi
  done <<EOF
$items
EOF
}

collect_scope_files() {
  local files=""
  local branch=""
  local merge_base=""

  files=$(
    (
      git diff --name-only
      git diff --cached --name-only
      git ls-files --others --exclude-standard
    ) | awk 'NF' | sort -u
  )

  if [ -n "$files" ]; then
    printf '%s' "$files"
    return
  fi

  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || printf '%s' "")"
  if [ "$branch" = "main" ] && git rev-parse prod >/dev/null 2>&1; then
    git diff --name-only "prod..$branch" --diff-filter=ACMRT | awk 'NF' | sort -u
    return
  fi

  if [ "$branch" != "HEAD" ] && [ "$branch" != "main" ] && [ "$branch" != "prod" ] \
    && git rev-parse main >/dev/null 2>&1; then
    merge_base="$(git merge-base HEAD main 2>/dev/null || true)"
    if [ -n "$merge_base" ]; then
      git diff --name-only "$merge_base..HEAD" --diff-filter=ACMRT | awk 'NF' | sort -u
      return
    fi
  fi
}

load_worktree_report() {
  eval "$(bash "$SCRIPT_DIR/worktree.sh" report --format shell)"
}

current_control_branch() {
  git -C "$CONTROL_REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || printf '%s' "-"
}

control_repo_clean_label() {
  if [ -n "$(git -C "$CONTROL_REPO_DIR" status --short 2>/dev/null || true)" ]; then
    printf '%s' "NO"
    return
  fi
  printf '%s' "SI"
}

main_aligned_label() {
  local local_main remote_main
  local_main="$(git -C "$CONTROL_REPO_DIR" rev-parse refs/heads/main 2>/dev/null || true)"
  remote_main="$(git -C "$CONTROL_REPO_DIR" rev-parse refs/remotes/origin/main 2>/dev/null || true)"
  if [ -n "$local_main" ] && [ -n "$remote_main" ] && [ "$local_main" = "$remote_main" ]; then
    printf '%s' "SI"
    return
  fi
  printf '%s' "NO"
}

target_aligned_label() {
  local target_branch="$1"
  local local_target remote_target
  local_target="$(git -C "$CONTROL_REPO_DIR" rev-parse "refs/heads/$target_branch" 2>/dev/null || true)"
  remote_target="$(git -C "$CONTROL_REPO_DIR" rev-parse "refs/remotes/origin/$target_branch" 2>/dev/null || true)"
  if [ -n "$local_target" ] && [ -n "$remote_target" ] && [ "$local_target" = "$remote_target" ]; then
    printf '%s' "SI"
    return
  fi
  printf '%s' "NO"
}

prod_aligned_with_main_label() {
  local local_main remote_prod
  local_main="$(git -C "$CONTROL_REPO_DIR" rev-parse refs/heads/main 2>/dev/null || true)"
  remote_prod="$(git -C "$CONTROL_REPO_DIR" rev-parse refs/remotes/origin/prod 2>/dev/null || true)"
  if [ -n "$local_main" ] && [ -n "$remote_prod" ] && [ "$local_main" = "$remote_prod" ]; then
    printf '%s' "SI"
    return
  fi
  printf '%s' "NO"
}

prod_ahead_of_main_label() {
  if git -C "$CONTROL_REPO_DIR" rev-parse refs/remotes/origin/prod >/dev/null 2>&1 \
    && git -C "$CONTROL_REPO_DIR" rev-parse refs/heads/main >/dev/null 2>&1 \
    && ! git -C "$CONTROL_REPO_DIR" merge-base --is-ancestor refs/remotes/origin/prod refs/heads/main >/dev/null 2>&1; then
    printf '%s' "SI"
    return
  fi
  printf '%s' "NO"
}

prod_ahead_of_target_label() {
  local target_branch="$1"
  if git -C "$CONTROL_REPO_DIR" rev-parse refs/remotes/origin/prod >/dev/null 2>&1 \
    && git -C "$CONTROL_REPO_DIR" rev-parse "refs/heads/$target_branch" >/dev/null 2>&1 \
    && ! git -C "$CONTROL_REPO_DIR" merge-base --is-ancestor refs/remotes/origin/prod "refs/heads/$target_branch" >/dev/null 2>&1; then
    printf '%s' "SI"
    return
  fi
  printf '%s' "NO"
}

collect_task_reasons() {
  local reasons=""

  if [ "${WORKTREE_DIRTY_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha tasques amb canvis locals pendents")"
  fi
  if [ "${WORKTREE_UNPUSHED_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha tasques amb canvis tancats però no pujats")"
  fi

  printf '%s' "$reasons"
}

collect_integra_reasons() {
  local control_branch="$1"
  local control_clean="$2"
  local main_aligned="$3"
  local reasons=""

  if [ "$control_branch" != "main" ]; then
    reasons="$(append_reason "$reasons" "el repositori de control no està a main")"
  fi
  if [ "$control_clean" != "SI" ]; then
    reasons="$(append_reason "$reasons" "main té canvis locals pendents")"
  fi
  if [ "$main_aligned" != "SI" ]; then
    reasons="$(append_reason "$reasons" "main no està alineada")"
  fi
  if [ "${WORKTREE_RESIDUE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha worktrees residuals o ambigus")"
  fi
  if [ "${WORKTREE_DIRTY_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha tasques amb canvis locals pendents")"
  fi
  if [ "${WORKTREE_UNPUSHED_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha tasques amb canvis tancats però no pujats")"
  fi
  if [ "${WORKTREE_READY_COUNT:-0}" -eq 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "no hi ha cap tasca llesta per integrar")"
  fi
  if [ "${WORKTREE_READY_COUNT:-0}" -gt 1 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha més d'una tasca llesta per integrar")"
  fi

  printf '%s' "$reasons"
}

collect_publica_reasons() {
  local control_branch="$1"
  local control_clean="$2"
  local target_aligned="$3"
  local prod_ahead="$4"
  local reasons=""

  if [ "$control_branch" != "$PUBLICA_TARGET_BRANCH" ]; then
    reasons="$(append_reason "$reasons" "el repositori de control no està a $PUBLICA_TARGET_BRANCH")"
  fi
  if [ "$control_clean" != "SI" ]; then
    reasons="$(append_reason "$reasons" "main té canvis locals pendents")"
  fi
  if [ "$target_aligned" != "SI" ]; then
    reasons="$(append_reason "$reasons" "main no està alineada")"
  fi
  if [ "$prod_ahead" = "SI" ]; then
    reasons="$(append_reason "$reasons" "prod no surt de main")"
  fi
  if [ "${WORKTREE_RESIDUE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha worktrees residuals o ambigus")"
  fi
  if [ "${WORKTREE_ACTIVE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    reasons="$(append_reason "$reasons" "hi ha worktrees oberts pendents")"
  fi

  printf '%s' "$reasons"
}

print_status() {
  local branch task_state main_state publish_state ceo_decision global_status
  local control_branch control_clean main_aligned target_aligned prod_aligned prod_ahead
  local task_reasons integra_reasons publish_reasons visible_publish_reasons
  local scope_files scope scope_risk deploy_mode scope_eval

  git -C "$CONTROL_REPO_DIR" fetch origin --prune --quiet >/dev/null 2>&1 || true
  load_worktree_report
  scope_files="$(collect_scope_files)"
  scope="EDGE"
  scope_risk="BAIX"
  deploy_mode="RAPID"

  if [ -n "$scope_files" ]; then
    scope_eval="$(summa_scope_eval "$scope_files")"
    eval "$scope_eval"
    scope="$(printf '%s' "$SCOPE" | tr '[:lower:]' '[:upper:]')"
    scope_risk="$RISK"
    deploy_mode="$DEPLOY_MODE"
  fi

  control_branch="$(current_control_branch)"
  control_clean="$(control_repo_clean_label)"
  main_aligned="$(main_aligned_label)"
  target_aligned="$(target_aligned_label "$PUBLICA_TARGET_BRANCH")"
  prod_aligned="$(prod_aligned_with_main_label)"
  prod_ahead="$(prod_ahead_of_main_label)"
  branch="${WORKTREE_ACTIVE_BRANCH:-"-"}"

  task_reasons="$(collect_task_reasons)"
  integra_reasons="$(collect_integra_reasons "$control_branch" "$control_clean" "$main_aligned")"
  publish_reasons="$(collect_publica_reasons "$control_branch" "$control_clean" "$target_aligned" "$prod_ahead")"
  visible_publish_reasons="$(limit_reasons 3 "$publish_reasons")"

  if [ -z "$task_reasons" ]; then
    task_state="NETA"
  else
    task_state="NO NETA"
  fi

  if [ -z "$integra_reasons" ]; then
    main_state="LLESTA PER INTEGRAR"
  else
    main_state="NO LLESTA"
  fi

  if [ -z "$publish_reasons" ]; then
    publish_state="LLESTA PER PUBLICAR"
    ceo_decision='POTS DIR "AUTORITZO DEPLOY"'
  else
    publish_state="NO LLESTA"
    ceo_decision='NO POTS DIR "AUTORITZO DEPLOY"'
  fi

  if [ -z "$publish_reasons" ]; then
    global_status="OK"
  else
    global_status="BLOQUEJAT"
  fi

  say "RESUM OPERATIU"
  say "- TASCA: $task_state"
  say "- MAIN: $main_state"
  say "- PUBLICACIÓ: $publish_state"
  say ""
  say "DECISIÓ CEO: $ceo_decision"

  if [ -n "$visible_publish_reasons" ]; then
    say ""
    say "MOTIUS CURTS:"
    say "- $(join_reasons_inline "$visible_publish_reasons")"
  fi

  say ""
  say "------------------------"
  say "SCOPE: $scope"
  say "RISC: $scope_risk"
  say "DEPLOY MODE: $deploy_mode"
  say "------------------------"
  say ""
  say "CONTEXT OPERATIU:"
  say "- branca activa: $branch"
  say "- main alineada amb origin: $main_aligned"
  say "- prod alineada amb main: $prod_aligned"
  say "- actius: ${WORKTREE_ACTIVE_COUNT:-0}"
  say "- residus: ${WORKTREE_RESIDUE_COUNT:-0}"
  say ""
  say "ESTAT GLOBAL:"
  say "- $global_status"
}

gate_integra() {
  local control_branch control_clean main_aligned

  bash "$SCRIPT_DIR/worktree.sh" gc --quiet >/dev/null 2>&1 || true
  git -C "$CONTROL_REPO_DIR" fetch origin --prune --quiet >/dev/null 2>&1 || true
  load_worktree_report

  control_branch="$(current_control_branch)"
  control_clean="$(control_repo_clean_label)"
  main_aligned="$(main_aligned_label)"
  local integra_reasons
  integra_reasons="$(collect_integra_reasons "$control_branch" "$control_clean" "$main_aligned")"

  if [ -n "$integra_reasons" ]; then
    say "NO LLESTA PER INTEGRAR: $(printf '%s\n' "$integra_reasons" | awk 'NF { print; exit }')"
    return 1
  fi

  return 0
}

gate_publica() {
  local control_branch control_clean target_aligned prod_ahead

  bash "$SCRIPT_DIR/worktree.sh" gc --quiet >/dev/null 2>&1 || true
  git -C "$CONTROL_REPO_DIR" fetch origin --prune --quiet >/dev/null 2>&1 || true
  load_worktree_report

  control_branch="$(current_control_branch)"
  control_clean="$(control_repo_clean_label)"
  target_aligned="$(target_aligned_label "$PUBLICA_TARGET_BRANCH")"
  prod_ahead="$(prod_ahead_of_target_label "$PUBLICA_TARGET_BRANCH")"
  local publish_reasons
  publish_reasons="$(collect_publica_reasons "$control_branch" "$control_clean" "$target_aligned" "$prod_ahead")"

  if [ -n "$publish_reasons" ]; then
    say "NO POTS DIR \"AUTORITZO DEPLOY\": $(printf '%s\n' "$publish_reasons" | awk 'NF { print; exit }')"
    return 1
  fi

  return 0
}

main() {
  local cmd="${1:-print}"
  case "$cmd" in
    print|status|"")
      print_status
      ;;
    gate)
      case "${2:-}" in
        integra)
          gate_integra
          ;;
        publica)
          gate_publica
          ;;
        *)
          say "Ús: bash scripts/status.sh gate [integra|publica]"
          return 1
          ;;
      esac
      ;;
    *)
      say "Ús: bash scripts/status.sh [print|gate integra|gate publica]"
      return 1
      ;;
  esac
}

main "$@"
