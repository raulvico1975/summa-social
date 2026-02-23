#!/usr/bin/env bash
set -euo pipefail

LABEL="com.summa.codexbridge"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_BIN="$(command -v node || true)"
RUNTIME_DIR="$HOME/Library/Application Support/summa-codexbridge"
RUNTIME_SCRIPT="$RUNTIME_DIR/codex-bridge-daemon.mjs"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"
LOG_OUT="$HOME/Library/Logs/summa-codexbridge.log"
LOG_ERR="$HOME/Library/Logs/summa-codexbridge.err.log"
GUI_DOMAIN="gui/$(id -u)"

if [ -z "$NODE_BIN" ]; then
  echo "No s'ha trobat 'node' al PATH."
  exit 1
fi

mkdir -p "$PLIST_DIR"
mkdir -p "$HOME/Library/Logs"
mkdir -p "$RUNTIME_DIR"
cp "$ROOT_DIR/scripts/bridge/codex-bridge-daemon.mjs" "$RUNTIME_SCRIPT"
chmod 755 "$RUNTIME_SCRIPT"

cat >"$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$RUNTIME_SCRIPT</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$LOG_OUT</string>

  <key>StandardErrorPath</key>
  <string>$LOG_ERR</string>
</dict>
</plist>
EOF

launchctl bootout "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
launchctl bootout "$GUI_DOMAIN" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "$GUI_DOMAIN" "$PLIST_PATH"
launchctl enable "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
launchctl kickstart -k "$GUI_DOMAIN/$LABEL"

echo "LaunchAgent instal.lat i actiu: $LABEL"
echo "Plist: $PLIST_PATH"
echo "Runtime script: $RUNTIME_SCRIPT"
echo "Logs:"
echo "  $LOG_OUT"
echo "  $LOG_ERR"
