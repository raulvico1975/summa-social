#!/usr/bin/env bash

# Helper compartit per detectar canvis de web públic amb perfil ràpid.
# Només activa FAST_PUBLIC quan TOTS els fitxers canviats són de web/landings/blog públic.

FAST_PUBLIC_SCOPE_PATTERNS=(
  '^src/app/public/'
  '^src/components/public/'
  '^src/app/blog/'
  '^src/app/contacte/'
  '^src/app/funcionalitats/'
  '^src/app/privacitat/'
  '^src/app/privacy/'
  '^src/app/login/'
  '^src/i18n/public\.ts$'
  '^public/'
  '^docs/'
  '\.md$'
  '\.txt$'
)

summa_all_files_match_patterns() {
  local files="$1"
  shift
  local file pattern matched

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    matched=false
    for pattern in "$@"; do
      if printf '%s\n' "$file" | grep -Eq "$pattern"; then
        matched=true
        break
      fi
    done
    if [ "$matched" = false ]; then
      return 1
    fi
  done <<EOF2
$files
EOF2

  return 0
}

summa_is_fast_public_scope() {
  local files="$1"
  [ -n "$files" ] || return 1
  summa_all_files_match_patterns "$files" "${FAST_PUBLIC_SCOPE_PATTERNS[@]}"
}

summa_change_profile() {
  local files="$1"
  if summa_is_fast_public_scope "$files"; then
    printf '%s' "FAST_PUBLIC"
    return
  fi
  printf '%s' "STANDARD"
}
