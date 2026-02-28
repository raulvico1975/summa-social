#!/usr/bin/env bash
set -e

echo "[verify-ci] Typecheck..."
npm run typecheck

echo "[verify-ci] Tests..."
npm test

echo "[verify-ci] Support golden set eval..."
npm run support:eval

echo "[verify-ci] Checking build env..."
node scripts/check-build-env.mjs

echo "[verify-ci] Build..."
npm run build

echo "[verify-ci] OK"
