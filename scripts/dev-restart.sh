#!/usr/bin/env bash
# scripts/dev-restart.sh
# Dev server amb restart automàtic si cau.
# Ús: npm run dev:restart

set -euo pipefail

export PORT="${PORT:-9002}"

# Matar procés zombie al port si existeix
kill_port() {
  local pids
  pids=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "[dev-restart] Matant procés(os) al port $PORT: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

# Augmentar memòria per evitar OOM
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

while true; do
  kill_port
  echo "[dev-restart] Starting Next dev on port $PORT (NODE_OPTIONS: $NODE_OPTIONS)..."
  npm run dev -- --port "$PORT" || true
  code=$?
  echo ""
  echo "[dev-restart] ⚠️ Dev server exited with code $code. Restarting in 2s..."
  echo ""
  sleep 2
done
