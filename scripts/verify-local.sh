#!/usr/bin/env bash
set -euo pipefail

echo "[verify-local] Checking i18n locale completeness..."
npm run i18n:check

echo "[verify-local] Build..."
npm run build

echo "[verify-local] Checking staged TS/TSX files..."

# Llistar fitxers staged TS/TSX (compatible macOS bash 3.x)
STAGED=$(git diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' || true)

if [ -z "$STAGED" ]; then
  echo "[verify-local] No staged TS/TSX files. OK"
  exit 0
fi

echo "[verify-local] Checking staged files for banned patterns..."

# 1) PROHIBIT: t("...")  → no existeix al sistema i18n
if echo "$STAGED" | xargs grep -nE '(^|[^a-zA-Z0-9_])t\("' -- >/dev/null 2>&1; then
  echo "ERROR: Ús de t(\"...\") detectat en fitxers staged."
  echo "Motiu: t(\"...\") NO existeix. Usa tr(\"...\") o t.xxx.yyy (legacy existent)."
  echo "$STAGED" | xargs grep -nE '(^|[^a-zA-Z0-9_])t\("' -- || true
  exit 1
fi

# 2) PROHIBIT: ': undefined'  → Firestore no accepta undefined
if echo "$STAGED" | xargs grep -nE ':\s*undefined\b' -- >/dev/null 2>&1; then
  echo "ERROR: S'ha detectat ': undefined' en fitxers staged."
  echo "Motiu: Firestore no accepta undefined. Omet el camp o usa null."
  echo "$STAGED" | xargs grep -nE ':\s*undefined\b' -- || true
  exit 1
fi

echo "[verify-local] Checking hardcoded Catalan in projectModule..."
node --import tsx scripts/i18n/check-hardcoded-ca.ts

echo "[verify-local] Checking i18n key consistency for projectModule..."
node --import tsx scripts/i18n/check-keys-scope.ts --scope projectModule

echo "[verify-local] OK"
