#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Aquest script requereix macOS perquè usa Keychain." >&2
  exit 1
fi

if ! command -v security >/dev/null 2>&1; then
  echo "No s'ha trobat la comanda 'security'." >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Ús: scripts/cloudflare/with-keychain-cloudflare-env.sh <comanda> [args...]" >&2
  exit 1
fi

SERVICE_PREFIX="summa-social.cloudflare"
ACCOUNT_SERVICE="${SERVICE_PREFIX}.account-id"
TOKEN_SERVICE="${SERVICE_PREFIX}.api-token"
ACCOUNT_NAME="${USER}"

CF_ACCOUNT_ID="$(security find-generic-password -a "${ACCOUNT_NAME}" -s "${ACCOUNT_SERVICE}" -w 2>/dev/null || true)"
CF_API_TOKEN="$(security find-generic-password -a "${ACCOUNT_NAME}" -s "${TOKEN_SERVICE}" -w 2>/dev/null || true)"

if [[ -z "${CF_ACCOUNT_ID}" || -z "${CF_API_TOKEN}" ]]; then
  echo "No he trobat credencials de Cloudflare al Keychain." >&2
  echo "Executa primer: scripts/cloudflare/setup-keychain-credentials.sh" >&2
  exit 1
fi

export CF_ACCOUNT_ID="${CF_ACCOUNT_ID}"
export CLOUDFLARE_ACCOUNT_ID="${CF_ACCOUNT_ID}"
export CF_API_TOKEN="${CF_API_TOKEN}"
export CLOUDFLARE_API_TOKEN="${CF_API_TOKEN}"

exec "$@"
