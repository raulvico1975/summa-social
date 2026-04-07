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

SERVICE_PREFIX="summa-social.cloudflare"
ACCOUNT_SERVICE="${SERVICE_PREFIX}.account-id"
TOKEN_SERVICE="${SERVICE_PREFIX}.api-token"
ACCOUNT_NAME="${USER}"

echo "Guardaré les credencials de Cloudflare al Keychain de macOS."
echo "No s'escriuran a cap fitxer del repo."
echo

read -r -p "Cloudflare Account ID: " CF_ACCOUNT_ID
if [[ -z "${CF_ACCOUNT_ID}" ]]; then
  echo "L'Account ID no pot ser buit." >&2
  exit 1
fi

read -r -s -p "Cloudflare API Token: " CF_API_TOKEN
echo
if [[ -z "${CF_API_TOKEN}" ]]; then
  echo "L'API token no pot ser buit." >&2
  exit 1
fi

security add-generic-password \
  -U \
  -a "${ACCOUNT_NAME}" \
  -s "${ACCOUNT_SERVICE}" \
  -l "Summa Social Cloudflare Account ID" \
  -w "${CF_ACCOUNT_ID}" >/dev/null

security add-generic-password \
  -U \
  -a "${ACCOUNT_NAME}" \
  -s "${TOKEN_SERVICE}" \
  -l "Summa Social Cloudflare API Token" \
  -w "${CF_API_TOKEN}" >/dev/null

echo
echo "Credencials desades correctament al Keychain."
echo "Per usar-les en una comanda:"
echo "scripts/cloudflare/with-keychain-cloudflare-env.sh <comanda>"
