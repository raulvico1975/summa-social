#!/usr/bin/env bash
set -e

echo "[verify-ci] Typecheck..."
npm run typecheck

echo "[verify-ci] Tests..."
npm test

echo "[verify-ci] Build..."
npm run build

echo "[verify-ci] OK"
