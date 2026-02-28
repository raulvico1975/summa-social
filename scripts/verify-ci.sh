#!/usr/bin/env bash
set -e

echo "[verify-ci] Typecheck..."
npm run typecheck

echo "[verify-ci] Validating translated guides..."
npm run i18n:validate-guides

echo "[verify-ci] Validating translated help..."
npm run i18n:validate-help

echo "[verify-ci] Checking hardcoded Catalan in projectModule..."
node --import tsx scripts/i18n/check-hardcoded-ca.ts

echo "[verify-ci] Checking i18n key consistency for projectModule..."
node --import tsx scripts/i18n/check-keys-scope.ts --scope projectModule

echo "[verify-ci] Tests + coverage (report-only)..."
npm run test:coverage

echo "[verify-ci] Support golden set eval..."
npm run support:eval

echo "[verify-ci] Checking build env..."
node scripts/check-build-env.mjs

echo "[verify-ci] Build..."
npm run build

echo "[verify-ci] OK"
