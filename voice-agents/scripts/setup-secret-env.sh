#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VOICE_AGENTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_ENV_PATH="${VOICE_AGENTS_DIR}/server/.env"

google_key="${GOOGLE_API_KEY:-}"
daily_key="${DAILY_API_KEY:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --google-key)
      google_key="${2:-}"
      shift 2
      ;;
    --daily-key)
      daily_key="${2:-}"
      shift 2
      ;;
    --help|-h)
      cat <<'EOF'
Ús:
  ./voice-agents/scripts/setup-secret-env.sh
  ./voice-agents/scripts/setup-secret-env.sh --google-key "..." --daily-key "..."

També pots passar-les per entorn:
  GOOGLE_API_KEY="..." DAILY_API_KEY="..." ./voice-agents/scripts/setup-secret-env.sh
EOF
      exit 0
      ;;
    *)
      echo "Argument desconegut: $1" >&2
      exit 1
      ;;
  esac
done

prompt_secret() {
  local label="$1"
  local value=""
  printf "%s: " "$label" >&2
  read -r -s value
  printf "\n" >&2
  printf "%s" "$value"
}

if [[ -z "${google_key}" ]]; then
  google_key="$(prompt_secret 'Google / Gemini API key')"
fi

if [[ -z "${daily_key}" ]]; then
  daily_key="$(prompt_secret 'Daily API key')"
fi

if [[ -z "${google_key}" || -z "${daily_key}" ]]; then
  echo "Falten claus. No s'ha escrit cap .env." >&2
  exit 1
fi

umask 077

tmp_file="$(mktemp "${SERVER_ENV_PATH}.tmp.XXXXXX")"
cat > "${tmp_file}" <<EOF
GOOGLE_API_KEY=${google_key}
DAILY_API_KEY=${daily_key}
WEB_AGENT_MODEL=gemini-3-pro-preview
DEMO_AGENT_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
WEB_AGENT_HOST=127.0.0.1
WEB_AGENT_PORT=8787
DEMO_AGENT_HOST=127.0.0.1
DEMO_AGENT_PORT=8790
EOF

mv "${tmp_file}" "${SERVER_ENV_PATH}"
chmod 600 "${SERVER_ENV_PATH}"

cat <<EOF
.env secret escrit a:
${SERVER_ENV_PATH}

Claus carregades:
- GOOGLE_API_KEY
- DAILY_API_KEY
EOF
