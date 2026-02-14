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
IS_FISCAL=false
FISCAL_TRIGGER_FILES=""
MAIN_SHA=""
MASTER_SHA=""
PROD_SHA=""
DEPLOY_RESULT="OK"

# Patrons area fiscal (gate bloquejant)
FISCAL_PATTERNS=(
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

# Patrons RISC ALT (superset fiscal)
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

  # Detectar area fiscal i guardar fitxers que la disparen
  local fiscal_matches=""
  for pattern in "${FISCAL_PATTERNS[@]}"; do
    local hits
    hits=$(echo "$CHANGED_FILES" | grep "$pattern" || true)
    if [ -n "$hits" ]; then
      if [ -n "$fiscal_matches" ]; then
        fiscal_matches="$fiscal_matches"$'\n'"$hits"
      else
        fiscal_matches="$hits"
      fi
    fi
  done
  if [ -n "$fiscal_matches" ]; then
    IS_FISCAL=true
    FISCAL_TRIGGER_FILES=$(echo "$fiscal_matches" | sort -u)
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
  echo "  Area fiscal: $([ "$IS_FISCAL" = true ] && echo "Si" || echo "No")"
  echo ""
}

# ============================================================
# PAS 4 — Verificacio area fiscal (BLOQUEJANT)
# ============================================================

# Heuristica: patrons que indiquen logica de negoci (NO UI-only)
CALC_RE="calculate|compute|total|sum|balance|ledger|reconcil|model182|model347|certificat"
AMOUNT_RE="amount|currency|rate|fx|tax|iva|irpf"
WRITE_RE="\.set\(|\.update\(|\.add\(|\.delete\(|batch|runTransaction|writeBatch"
FIELD_RE="archivedAt|parentTransactionId|donorId|contactId|bankAccountId|categoryId|isRemittance"
PERM_RE="permission|\.rules|getAuth|verifyIdToken|validateUser"
SEPA_RE="sepa|pain001|pain008|remittance|generateXml"

# Globals de classificacio (set per classify_fiscal_impact)
FISCAL_IS_UI_ONLY=true
FISCAL_IMPACT_TYPE=""
FISCAL_AFFECTS_MONEY=""
FISCAL_RECOMMENDATION=""
FISCAL_KEY_DETAILS=""

classify_fiscal_impact() {
  local has_calc=false has_amount=false has_write=false
  local has_field=false has_perm=false has_sepa=false
  local unclassifiable=false
  FISCAL_IS_UI_ONLY=true
  FISCAL_KEY_DETAILS=""

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    local diff_content changes line_count tags
    diff_content=$(git diff master..main -- "$file" 2>/dev/null)
    [ -z "$diff_content" ] && continue

    # Nomes linies canviades (exclou headers de diff)
    changes=$(printf '%s\n' "$diff_content" | grep -E '^[+-]' | grep -vE '^\+\+\+|^---')

    line_count=$(printf '%s\n' "$changes" | wc -l | tr -d ' ')
    if [ "$line_count" -gt 500 ]; then
      unclassifiable=true
      FISCAL_IS_UI_ONLY=false
      FISCAL_KEY_DETAILS="$FISCAL_KEY_DETAILS    - $file (canvi gran, revisio manual)"$'\n'
      continue
    fi

    tags=""
    if printf '%s\n' "$changes" | grep -qEi "$CALC_RE"; then
      has_calc=true; FISCAL_IS_UI_ONLY=false; tags="${tags}calcul "
    fi
    if printf '%s\n' "$changes" | grep -qEi "$AMOUNT_RE"; then
      has_amount=true; FISCAL_IS_UI_ONLY=false; tags="${tags}imports "
    fi
    if printf '%s\n' "$changes" | grep -qEi "$WRITE_RE"; then
      has_write=true; FISCAL_IS_UI_ONLY=false; tags="${tags}escriptura "
    fi
    if printf '%s\n' "$changes" | grep -qEi "$FIELD_RE"; then
      has_field=true; FISCAL_IS_UI_ONLY=false; tags="${tags}camps-critics "
    fi
    if printf '%s\n' "$changes" | grep -qEi "$PERM_RE"; then
      has_perm=true; FISCAL_IS_UI_ONLY=false; tags="${tags}permisos "
    fi
    if printf '%s\n' "$changes" | grep -qEi "$SEPA_RE"; then
      has_sepa=true; FISCAL_IS_UI_ONLY=false; tags="${tags}SEPA "
    fi

    [ -z "$tags" ] && tags="UI"
    FISCAL_KEY_DETAILS="$FISCAL_KEY_DETAILS    - $file ($tags)"$'\n'
  done <<< "$FISCAL_TRIGGER_FILES"

  # Tipus d'impacte
  if [ "$FISCAL_IS_UI_ONLY" = true ]; then
    FISCAL_IMPACT_TYPE="UI"
  else
    local types=""
    if [ "$has_calc" = true ] || [ "$has_amount" = true ]; then
      types="Calcul"
    fi
    if [ "$has_write" = true ] || [ "$has_field" = true ]; then
      types="${types:+$types / }Dades"
    fi
    if [ "$has_perm" = true ]; then
      types="${types:+$types / }Permisos"
    fi
    if [ "$has_sepa" = true ]; then
      types="${types:+$types / }SEPA-Remeses"
    fi
    if [ "$unclassifiable" = true ]; then
      types="${types:+$types / }No classificable"
    fi
    [ -z "$types" ] && types="Indeterminat"
    FISCAL_IMPACT_TYPE="$types"
  fi

  # Pot afectar diners?
  if [ "$FISCAL_IS_UI_ONLY" = true ]; then
    FISCAL_AFFECTS_MONEY="No. Canvi visual/presentacio. No es modifica cap calcul ni saldo."
  elif [ "$has_calc" = true ] || [ "$has_amount" = true ]; then
    FISCAL_AFFECTS_MONEY="Si. Es modifiquen calculs o imports."
  elif [ "$has_sepa" = true ]; then
    FISCAL_AFFECTS_MONEY="Si. Es modifica logica de remeses o SEPA."
  elif [ "$has_write" = true ] || [ "$has_field" = true ]; then
    FISCAL_AFFECTS_MONEY="Possible. Es modifiquen dades o camps critics."
  elif [ "$has_perm" = true ]; then
    FISCAL_AFFECTS_MONEY="No directament. Es modifiquen permisos."
  else
    FISCAL_AFFECTS_MONEY="No classificable. Revisar manualment."
  fi

  # Recomanacio
  if [ "$FISCAL_IS_UI_ONLY" = true ]; then
    FISCAL_RECOMMENDATION="green"
  elif [ "$has_calc" = true ] || [ "$has_sepa" = true ] || [ "$has_amount" = true ] || [ "$unclassifiable" = true ]; then
    FISCAL_RECOMMENDATION="red"
  else
    FISCAL_RECOMMENDATION="yellow"
  fi
}

fiscal_impact_gate() {
  if [ "$IS_FISCAL" != true ]; then
    return 0
  fi

  echo "[4/9] Analitzant area fiscal..."
  echo ""

  classify_fiscal_impact

  # Resum huma (sempre)
  echo "  ┌─────────────────────────────────────────────┐"
  echo "  │         IMPACTE DEL CANVI (RESUM)           │"
  echo "  └─────────────────────────────────────────────┘"
  echo ""
  echo "  Tipus: $FISCAL_IMPACT_TYPE"
  echo "  Pot afectar diners, saldos o fiscalitat?"
  echo "    $FISCAL_AFFECTS_MONEY"
  if [ "$FISCAL_RECOMMENDATION" = "green" ]; then
    echo "  Recomanacio: 🟢 Desplegar"
  elif [ "$FISCAL_RECOMMENDATION" = "yellow" ]; then
    echo "  Recomanacio: 🟡 Provar abans amb un cas real"
  else
    echo "  Recomanacio: 🔴 Verificar amb docs/QA-FISCAL.md abans de desplegar"
  fi
  echo ""
  echo "  Fitxers clau:"
  printf '%s' "$FISCAL_KEY_DETAILS"
  echo ""

  # Si UI-only → no bloquejar
  if [ "$FISCAL_IS_UI_ONLY" = true ]; then
    echo "  Detectat fitxer en zona sensible, pero canvi UI-only."
    echo "  Continuo sense bloquejar."
    echo ""
    return 0
  fi

  # Bloqueig per canvis no-UI
  echo "  Verificacio fiscal requerida."
  echo "  Mes detalls a: docs/QA-FISCAL.md"
  echo ""

  read -r -p "  Has completat la verificacio fiscal amb PASS als punts aplicables? (s/n): " answer
  if [ "$answer" != "s" ]; then
    echo ""
    echo "  Deploy aturat. Completa la verificacio fiscal primer"
    echo "  i torna a executar el deploy."
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
  echo "  Fiscal:   $([ "$IS_FISCAL" = true ] && echo "Si" || echo "No")"
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
  local fiscal_str
  fiscal_str=$([ "$IS_FISCAL" = true ] && echo "Si" || echo "No")

  local log_line="| $deploy_date | $deploy_sha | $RISK_LEVEL | $fiscal_str | $CHANGED_COUNT | $DEPLOY_RESULT |"

  # Crear DEPLOY-LOG.md si no existeix
  if [ ! -f "$PROJECT_DIR/$DEPLOY_LOG" ]; then
    mkdir -p "$(dirname "$PROJECT_DIR/$DEPLOY_LOG")"
    cat > "$PROJECT_DIR/$DEPLOY_LOG" << 'HEADER'
# Deploy Log — Summa Social

Registre cronologic de desplegaments a produccio.

| Data | SHA | Risc | Fiscal | Fitxers | Resultat |
|------|-----|------|--------|---------|----------|
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
  fiscal_impact_gate         # Pas 4
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
