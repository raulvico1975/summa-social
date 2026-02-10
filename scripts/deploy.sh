#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# SUMMA SOCIAL — DEPLOY VERIFICAT
# Script determinista i bloquejant per desplegar a produccio.
# Execucio: bash scripts/deploy.sh  (o npm run deploy)
# ============================================================

DEPLOY_LOG="docs/DEPLOY-LOG.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Globals (set per funcions)
CHANGED_FILES=""
CHANGED_COUNT=0
RISK_LEVEL="BAIX"
IS_P0=false
P0_TRIGGER_FILES=""
MAIN_SHA=""
MASTER_SHA=""
PROD_SHA=""
DEPLOY_RESULT="OK"

# Patrons P0 (area fiscal — gate bloquejant)
P0_PATTERNS=(
  "src/lib/remittances/"
  "src/lib/sepa/"
  "src/lib/fiscal/"
  "src/app/api/remittances/"
  "src/components/donor-"
  "src/components/return-"
  "src/components/remittance-"
  "src/components/transaction-"
  "/movimientos/"
)

# Patrons RISC ALT (superset de P0)
HIGH_RISK_PATTERNS=(
  "src/app/api/"
  "src/lib/fiscal/"
  "src/lib/remittances/"
  "src/lib/sepa/"
  "project-module"
  "fx"
  "exchange"
  "budget"
  "firestore.rules"
  "storage.rules"
)

# Patrons RISC BAIX (nomes docs/i18n/static)
LOW_RISK_PATTERNS=(
  "^docs/"
  "^src/i18n/"
  "^public/"
  "\.md$"
  "\.txt$"
)

# ============================================================
# PAS 1 — Preflight git (BLOQUEJANT)
# ============================================================
preflight_git_checks() {
  echo ""
  echo "[1/9] Comprovacions previes de git..."

  # 1a. Branca actual ha de ser main
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$branch" != "main" ]; then
    echo "ERROR: Has d'estar a la branca 'main' per desplegar."
    echo "  Branca actual: $branch"
    echo "  Executa: git checkout main"
    exit 1
  fi

  # 1b. Working tree net
  if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Hi ha canvis sense commitejar o fitxers sense seguiment."
    echo "  Fes commit o stash dels canvis abans de desplegar."
    git status --short
    exit 1
  fi

  # 1c. Fetch
  echo "  Descarregant canvis del servidor..."
  git fetch origin

  # 1d. Pull ff-only a main
  echo "  Actualitzant main..."
  if ! git pull --ff-only origin main 2>/dev/null; then
    echo "ERROR: La branca 'main' ha divergit del remot."
    echo "  Cal resoldre manualment abans de desplegar."
    exit 1
  fi

  # 1e. Pull ff-only a master
  echo "  Actualitzant master..."
  git checkout master --quiet
  if ! git pull --ff-only origin master 2>/dev/null; then
    echo "ERROR: La branca 'master' ha divergit del remot."
    echo "  Cal resoldre manualment abans de desplegar."
    git checkout main --quiet
    exit 1
  fi

  # 1f. Pull ff-only a prod
  echo "  Actualitzant prod..."
  git checkout prod --quiet
  if ! git pull --ff-only origin prod 2>/dev/null; then
    echo "ERROR: La branca 'prod' ha divergit del remot."
    echo "  Cal resoldre manualment abans de desplegar."
    git checkout main --quiet
    exit 1
  fi

  # Tornar a main
  git checkout main --quiet

  MAIN_SHA=$(git rev-parse --short HEAD)
  MASTER_SHA=$(git rev-parse --short master)
  PROD_SHA=$(git rev-parse --short prod)

  echo "  Comprovacions OK."
  echo ""
}

# ============================================================
# PAS 2 — Detectar canvis (BLOQUEJANT si 0)
# ============================================================
detect_changed_files() {
  echo "[2/9] Detectant fitxers canviats (main vs master)..."

  CHANGED_FILES=$(git diff --name-only master..main --diff-filter=ACMRT)

  if [ -z "$CHANGED_FILES" ]; then
    echo "  Res a desplegar (main == master)."
    exit 0
  fi

  CHANGED_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
  echo "  $CHANGED_COUNT fitxers canviats:"
  echo ""
  while IFS= read -r f; do
    echo "    $f"
  done <<< "$(echo "$CHANGED_FILES" | head -20)"
  if [ "$CHANGED_COUNT" -gt 20 ]; then
    echo "    ... i $((CHANGED_COUNT - 20)) mes."
  fi
  echo ""
}

# ============================================================
# PAS 3 — Classificar risc (INFORMATIU)
# ============================================================
classify_risk() {
  echo "[3/9] Classificant nivell de risc..."

  # Detectar P0 i guardar fitxers que el disparen
  local p0_matches=""
  for pattern in "${P0_PATTERNS[@]}"; do
    local hits
    hits=$(echo "$CHANGED_FILES" | grep "$pattern" || true)
    if [ -n "$hits" ]; then
      if [ -n "$p0_matches" ]; then
        p0_matches="$p0_matches"$'\n'"$hits"
      else
        p0_matches="$hits"
      fi
    fi
  done
  if [ -n "$p0_matches" ]; then
    IS_P0=true
    P0_TRIGGER_FILES=$(echo "$p0_matches" | sort -u)
  fi

  # Detectar HIGH RISK
  local is_high=false
  for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
    if echo "$CHANGED_FILES" | grep -q "$pattern"; then
      is_high=true
      break
    fi
  done

  if [ "$is_high" = true ]; then
    RISK_LEVEL="ALT"
  else
    # Comprovar si TOTS els fitxers son BAIX
    local all_low=true
    while IFS= read -r file; do
      local matched_low=false
      for pattern in "${LOW_RISK_PATTERNS[@]}"; do
        if echo "$file" | grep -qE "$pattern"; then
          matched_low=true
          break
        fi
      done
      if [ "$matched_low" = false ]; then
        all_low=false
        break
      fi
    done <<< "$CHANGED_FILES"

    if [ "$all_low" = true ]; then
      RISK_LEVEL="BAIX"
    else
      RISK_LEVEL="MITJA"
    fi
  fi

  echo "  Risc detectat: $RISK_LEVEL"
  echo "  Area P0: $([ "$IS_P0" = true ] && echo "Si" || echo "No")"
  echo ""
}

# ============================================================
# PAS 4 — Gate P0 fiscal (BLOQUEJANT)
# ============================================================
p0_fiscal_gate() {
  if [ "$IS_P0" != true ]; then
    return 0
  fi

  echo "[4/9] Gate P0 fiscal..."
  echo ""
  echo "  ATENCIO: AREA FISCAL DETECTADA"
  echo ""
  echo "  Aquest deploy toca codi que afecta moviments,"
  echo "  remeses, donants, certificats o imports fiscals."
  echo ""
  echo "  Abans de continuar, cal haver executat la"
  echo "  verificacio manual QA P0 descrita a:"
  echo "    docs/QA-P0-FISCAL.md"
  echo ""
  echo "  Fitxers que han activat el gate P0:"
  while IFS= read -r f; do
    echo "    - $f"
  done <<< "$P0_TRIGGER_FILES"
  echo ""

  read -r -p "  Has completat QA-P0-FISCAL amb PASS als punts aplicables? (s/n): " answer
  if [ "$answer" != "s" ]; then
    echo ""
    echo "  Deploy aturat. Executa QA P0 primer i torna a executar el deploy."
    exit 1
  fi
  echo ""
}

# ============================================================
# PAS 5 — Verificacions (BLOQUEJANT)
# ============================================================
run_verifications() {
  echo "[5/9] Executant verificacions..."
  echo ""

  echo "  --- verify-local.sh ---"
  if ! bash "$SCRIPT_DIR/verify-local.sh"; then
    echo ""
    echo "ERROR: verify-local.sh ha fallat."
    echo "  Corregeix els errors i torna a executar el deploy."
    exit 1
  fi
  echo ""

  if [ -f "$SCRIPT_DIR/verify-ci.sh" ]; then
    echo "  --- verify-ci.sh ---"
    if ! bash "$SCRIPT_DIR/verify-ci.sh"; then
      echo ""
      echo "ERROR: verify-ci.sh ha fallat."
      echo "  Corregeix els errors i torna a executar el deploy."
      exit 1
    fi
  else
    echo "  verify-ci.sh: skip (no existeix)"
  fi

  echo ""
  echo "  Totes les verificacions OK."
  echo ""
}

# ============================================================
# PAS 6 — Resum final + confirmacio (BLOQUEJANT)
# ============================================================
display_deploy_summary() {
  echo "[6/9] Resum del deploy..."
  echo ""
  echo "  Branques:"
  echo "    main:   $MAIN_SHA"
  echo "    master: $MASTER_SHA"
  echo "    prod:   $PROD_SHA"
  echo ""
  echo "  Risc:     $RISK_LEVEL"
  echo "  Area P0:  $([ "$IS_P0" = true ] && echo "Si" || echo "No")"
  echo "  Fitxers:  $CHANGED_COUNT"
  echo ""

  read -r -p "  Confirmes executar deploy main -> master -> prod i push a produccio? (s/n): " answer
  if [ "$answer" != "s" ]; then
    echo ""
    echo "  Deploy cancel·lat."
    exit 1
  fi
  echo ""
}

# ============================================================
# PAS 7 — Merge ritual + push (BLOQUEJANT)
# ============================================================
execute_merge_ritual() {
  echo "[7/9] Executant merge ritual..."

  # main -> master (--no-ff per preservar historial)
  echo "  main -> master..."
  git checkout master --quiet
  if ! git merge --no-ff main -m "chore(deploy): merge main -> master"; then
    echo ""
    echo "ERROR: Conflicte de merge a master."
    git merge --abort || true
    git checkout main --quiet
    echo "  Resol el conflicte manualment i torna a executar el deploy."
    exit 1
  fi
  git push origin master
  echo "  master actualitzat i pujat."

  # master -> prod
  echo "  master -> prod..."
  git checkout prod --quiet
  if ! git merge master -m "chore(deploy): merge master -> prod"; then
    echo ""
    echo "ERROR: Conflicte de merge a prod."
    git merge --abort || true
    git checkout main --quiet
    echo "  Resol el conflicte manualment."
    exit 1
  fi
  git push origin prod
  echo "  prod actualitzat i pujat."

  # Tornar a main
  git checkout main --quiet
  echo "  Tornat a main."
  echo ""
}

# ============================================================
# PAS 8 — Post-deploy check (BLOQUEJANT)
# ============================================================
post_deploy_check() {
  local prod_sha
  prod_sha=$(git rev-parse --short prod)

  echo "[8/9] Post-deploy check..."
  echo ""

  read -r -p "  Has verificat a Firebase App Hosting que el SHA $prod_sha s'ha desplegat? (s/n): " answer1
  if [ "$answer1" != "s" ]; then
    DEPLOY_RESULT="PENDENT"
  fi

  read -r -p "  Has fet smoke test (1 ruta publica + 1 ruta dashboard) i tot respon correctament? (s/n): " answer2
  if [ "$answer2" != "s" ]; then
    DEPLOY_RESULT="PENDENT"
  fi

  echo ""
  if [ "$DEPLOY_RESULT" = "PENDENT" ]; then
    echo "  Post-deploy no confirmat. El log es registrara com a PENDENT."
  else
    echo "  Post-deploy confirmat."
  fi
  echo ""
}

# ============================================================
# PAS 9 — Deploy log (NO commit automatic)
# ============================================================
append_deploy_log() {
  echo "[9/9] Registrant al deploy log..."

  local deploy_date
  deploy_date=$(TZ="Europe/Madrid" date '+%Y-%m-%d %H:%M')
  local deploy_sha
  deploy_sha=$(git rev-parse --short prod)
  local p0_str
  p0_str=$([ "$IS_P0" = true ] && echo "Si" || echo "No")

  local log_line="| $deploy_date | $deploy_sha | $RISK_LEVEL | $p0_str | $CHANGED_COUNT | $DEPLOY_RESULT |"

  # Crear DEPLOY-LOG.md si no existeix
  if [ ! -f "$PROJECT_DIR/$DEPLOY_LOG" ]; then
    mkdir -p "$(dirname "$PROJECT_DIR/$DEPLOY_LOG")"
    cat > "$PROJECT_DIR/$DEPLOY_LOG" << 'HEADER'
# Deploy Log — Summa Social

Registre cronologic de desplegaments a produccio.

| Data | SHA | Risc | P0 | Fitxers | Resultat |
|------|-----|------|----|---------|----------|
HEADER
  fi

  # Afegir linia
  echo "$log_line" >> "$PROJECT_DIR/$DEPLOY_LOG"

  # Stage (no commit)
  git add "$PROJECT_DIR/$DEPLOY_LOG"

  echo "  Registrat a $DEPLOY_LOG"
  echo "  $log_line"
  echo ""
  echo "  El fitxer queda staged. Per commitejar:"
  echo "    git commit -m \"docs(deploy-log): $deploy_date $deploy_sha risc=$RISK_LEVEL\""
  echo ""
}

# ============================================================
# MAIN
# ============================================================
main() {
  echo ""
  echo "======================================"
  echo "  SUMMA SOCIAL — DEPLOY VERIFICAT"
  echo "======================================"

  preflight_git_checks      # Pas 1
  detect_changed_files       # Pas 2
  classify_risk              # Pas 3
  p0_fiscal_gate             # Pas 4
  run_verifications          # Pas 5
  display_deploy_summary     # Pas 6
  execute_merge_ritual       # Pas 7
  post_deploy_check          # Pas 8
  append_deploy_log          # Pas 9

  echo "  DEPLOY COMPLETAT ($DEPLOY_RESULT)."
  echo ""
}

cd "$PROJECT_DIR"
main "$@"
