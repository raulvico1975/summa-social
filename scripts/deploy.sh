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
HUMAN_QUESTION_REASON=""
BUSINESS_IMPACT=""
DECISION_TAKEN="NONE"

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
FISCAL_HAS_CALC=false
FISCAL_HAS_AMOUNT=false
FISCAL_HAS_WRITE=false
FISCAL_HAS_FIELD=false
FISCAL_HAS_PERM=false
FISCAL_HAS_SEPA=false
FISCAL_UNCLASSIFIABLE=false

contains_technical_terms() {
  local text_lower
  text_lower=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  local banned=(
    "git"
    "merge"
    "flag"
    "--no-verify"
    "branca"
    "branch"
    "commit"
    "push"
    "sha"
    "log tecnic"
  )
  local term
  for term in "${banned[@]}"; do
    if printf '%s' "$text_lower" | grep -q -- "$term"; then
      return 0
    fi
  done
  return 1
}

derive_business_impact_message() {
  if [ "$FISCAL_HAS_CALC" = true ] || [ "$FISCAL_HAS_AMOUNT" = true ]; then
    printf '%s' "podria alterar imports de donacions o devolucions, i l'entitat podria veure totals incorrectes en certificats o informes fiscals."
    return
  fi
  if [ "$FISCAL_HAS_SEPA" = true ]; then
    printf '%s' "podria afectar el processament de remeses, i l'entitat podria veure cobraments o assignacions que no toquen."
    return
  fi
  if [ "$FISCAL_HAS_WRITE" = true ] || [ "$FISCAL_HAS_FIELD" = true ]; then
    printf '%s' "podria desalinear dades econòmiques sensibles, i l'entitat podria veure informació inconsistent en moviments o fitxes."
    return
  fi
  if [ "$FISCAL_HAS_PERM" = true ]; then
    printf '%s' "podria canviar qui veu o edita informació sensible, i l'entitat podria tenir accessos no esperats."
    return
  fi
  if echo "$CHANGED_FILES" | grep -q "firestore.rules\|storage.rules"; then
    printf '%s' "podria afectar l'accés a dades sensibles, i l'entitat podria veure restriccions incorrectes o exposició de dades."
    return
  fi
  if echo "$CHANGED_FILES" | grep -q "project-module\|fx\|exchange\|budget"; then
    printf '%s' "podria afectar càlculs econòmics de projectes, i l'entitat podria veure imports o desviacions incorrectes."
    return
  fi
  printf '%s' ""
}

assess_residual_alt_risk() {
  if [ "$RISK_LEVEL" != "ALT" ]; then
    return 1
  fi
  if [ "$FISCAL_RECOMMENDATION" = "red" ] || [ "$FISCAL_UNCLASSIFIABLE" = true ]; then
    return 0
  fi
  if echo "$CHANGED_FILES" | grep -q "firestore.rules\|storage.rules\|project-module\|fx\|exchange\|budget"; then
    return 0
  fi
  return 1
}

handle_business_decision_for_residual_risk() {
  if ! assess_residual_alt_risk; then
    return 0
  fi

  HUMAN_QUESTION_REASON="Risc ALT residual després de verificacions automàtiques."
  BUSINESS_IMPACT=$(derive_business_impact_message)

  if [ -z "$BUSINESS_IMPACT" ]; then
    DECISION_TAKEN="AUTO_BLOCKED_NO_BUSINESS_MESSAGE"
    DEPLOY_RESULT="BLOCKED_SAFE"
    echo "ERROR: No es pot formular impacte de negoci clar. Deploy bloquejat per seguretat (BLOCKED_SAFE)."
    append_deploy_log
    exit 1
  fi

  local line1
  local line2
  local line3
  local line4
  line1="Hem detectat un canvi que podria afectar dades sensibles o fiscals."
  line2="Impacte possible: $BUSINESS_IMPACT"
  line3="Opcio A (recomanada): no publicar encara i validar amb un cas real."
  line4="Opcio B: publicar igual assumint un risc temporal visible per l'entitat."

  local full_question
  full_question="$line1 $line2 $line3 $line4"
  if contains_technical_terms "$full_question"; then
    DECISION_TAKEN="AUTO_BLOCKED_TECHNICAL_QUESTION"
    DEPLOY_RESULT="BLOCKED_SAFE"
    echo "ERROR: La pregunta inclou termes tècnics. Deploy bloquejat per seguretat (BLOCKED_SAFE)."
    append_deploy_log
    exit 1
  fi

  echo "[6b/9] Decisio de negoci requerida (nomes risc ALT residual)..."
  echo ""
  echo "  $line1"
  echo "  $line2"
  echo "  Si falla, l'entitat podria veure dades econòmiques o fiscals incorrectes."
  echo "  $line3"
  echo "  $line4"
  echo ""
  read -r -p "  Quina opcio prefereixes? (A/B): " business_answer

  case "$business_answer" in
    B|b)
      DECISION_TAKEN="B_DEPLOY_WITH_VISIBLE_RISK"
      ;;
    A|a|"")
      DECISION_TAKEN="A_BLOCK_UNTIL_REAL_CASE"
      DEPLOY_RESULT="BLOCKED_SAFE"
      echo ""
      echo "  Deploy bloquejat segons decisio de negoci (BLOCKED_SAFE)."
      append_deploy_log
      exit 1
      ;;
    *)
      DECISION_TAKEN="A_BLOCK_INVALID_INPUT"
      DEPLOY_RESULT="BLOCKED_SAFE"
      echo ""
      echo "  Opcio no valida. Per seguretat, deploy bloquejat (BLOCKED_SAFE)."
      append_deploy_log
      exit 1
      ;;
  esac
  echo ""
}

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
  FISCAL_HAS_CALC=$has_calc
  FISCAL_HAS_AMOUNT=$has_amount
  FISCAL_HAS_WRITE=$has_write
  FISCAL_HAS_FIELD=$has_field
  FISCAL_HAS_PERM=$has_perm
  FISCAL_HAS_SEPA=$has_sepa
  FISCAL_UNCLASSIFIABLE=$unclassifiable

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

  # No es pregunta aquí: la decisió humana, si cal, es formula en clau de negoci
  # només per risc ALT residual (després de verificacions automàtiques).
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
# PAS 6 — Resum + decisio de negoci si hi ha risc ALT residual
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
# PAS 8 — Post-deploy check (automatic; sense preguntes tecniques)
# ============================================================
post_deploy_check() {
  local prod_sha
  local remote_sha
  prod_sha=$(git rev-parse --short prod)

  echo "[8/9] Post-deploy check..."
  echo ""
  echo "  Verificant publicacio remota..."
  remote_sha=$(git ls-remote origin prod | awk '{print substr($1,1,7)}')
  if [ "$remote_sha" != "$prod_sha" ]; then
    DEPLOY_RESULT="PENDENT"
    echo "  SHA remot no confirmat encara. Estat: PENDENT."
  else
    echo "  SHA remot confirmat: $prod_sha"
  fi
  echo ""

  if [ -n "${DEPLOY_SMOKE_PUBLIC_URL:-}" ] && [ -n "${DEPLOY_SMOKE_DASHBOARD_URL:-}" ]; then
    echo "  Executant smoke checks automatitzats..."
    if ! curl -fsS --max-time 20 "$DEPLOY_SMOKE_PUBLIC_URL" >/dev/null; then
      DEPLOY_RESULT="PENDENT"
      echo "  Smoke públic no confirmat. Estat: PENDENT."
    fi
    if ! curl -fsS --max-time 20 "$DEPLOY_SMOKE_DASHBOARD_URL" >/dev/null; then
      DEPLOY_RESULT="PENDENT"
      echo "  Smoke dashboard no confirmat. Estat: PENDENT."
    fi
  else
    DEPLOY_RESULT="PENDENT"
    echo "  Smoke automàtic no configurat (DEPLOY_SMOKE_PUBLIC_URL / DEPLOY_SMOKE_DASHBOARD_URL)."
    echo "  Estat del deploy: PENDENT."
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

  # Afegir línia a la taula principal. Si existeix secció de decisions,
  # inserim la línia abans d'aquesta secció per no trencar la taula.
  if grep -q "^## Decisions humanes (negoci)" "$PROJECT_DIR/$DEPLOY_LOG"; then
    local tmp_file
    tmp_file=$(mktemp)
    awk -v line="$log_line" '
      BEGIN { inserted = 0 }
      /^## Decisions humanes \(negoci\)/ && inserted == 0 {
        print line
        inserted = 1
      }
      { print }
      END {
        if (inserted == 0) print line
      }
    ' "$PROJECT_DIR/$DEPLOY_LOG" > "$tmp_file"
    mv "$tmp_file" "$PROJECT_DIR/$DEPLOY_LOG"
  else
    echo "$log_line" >> "$PROJECT_DIR/$DEPLOY_LOG"
  fi

  if [ "$DECISION_TAKEN" != "NONE" ]; then
    if ! grep -q "^## Decisions humanes (negoci)" "$PROJECT_DIR/$DEPLOY_LOG"; then
      cat >> "$PROJECT_DIR/$DEPLOY_LOG" << 'HUMAN_HEADER'

## Decisions humanes (negoci)

| Data | SHA | human_question_reason | business_impact | decision_taken |
|------|-----|-----------------------|-----------------|----------------|
HUMAN_HEADER
    fi
    local human_line
    human_line="| $deploy_date | $deploy_sha | $HUMAN_QUESTION_REASON | $BUSINESS_IMPACT | $DECISION_TAKEN |"
    echo "$human_line" >> "$PROJECT_DIR/$DEPLOY_LOG"
  fi

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
  handle_business_decision_for_residual_risk
  execute_merge_ritual       # Pas 7
  post_deploy_check          # Pas 8
  append_deploy_log          # Pas 9

  echo "  DEPLOY COMPLETAT ($DEPLOY_RESULT)."
  echo ""
}

cd "$PROJECT_DIR"
main "$@"
