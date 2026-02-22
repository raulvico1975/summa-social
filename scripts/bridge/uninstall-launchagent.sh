#!/usr/bin/env bash
set -euo pipefail

LABEL="com.summa.codexbridge"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
RUNTIME_SCRIPT="$HOME/Library/Application Support/summa-codexbridge/codex-bridge-daemon.mjs"
GUI_DOMAIN="gui/$(id -u)"

launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
launchctl bootout "$GUI_DOMAIN" "$PLIST_PATH" >/dev/null 2>&1 || true
rm -f "$PLIST_PATH"
rm -f "$RUNTIME_SCRIPT"

echo "LaunchAgent desactivat i eliminat: $LABEL"
echo "Plist eliminat: $PLIST_PATH"
echo "Runtime script eliminat: $RUNTIME_SCRIPT"
