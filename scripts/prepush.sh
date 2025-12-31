#!/usr/bin/env bash
set -euo pipefail

echo "[prepush] Running checks..."
bash scripts/check.sh
echo "[prepush] OK. You can push."
