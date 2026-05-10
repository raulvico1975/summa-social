# MCP privat per Summa Agent

Estat: local v0.1.

Aquest adaptador exposa a Summa Agent una capa MCP privada sobre la `private integration API v1` existent de Summa Social. No és una funcionalitat pública per clients i no amplia permisos.

## Abast

Eines exposades:

- `search_contacts`: lectura de contactes.
- `search_transactions`: lectura de moviments.
- `upload_pending_document`: pujada idempotent de document pendent per revisió humana.
- `get_entity_operational_summary`: resum curt derivat de moviments recents i, opcionalment, cerca de contactes.

Límit explícit: `get_entity_operational_summary` no llegeix documents pendents perquè la v1 no exposa `pending_documents.read`.

## Prohibicions

- No modifica moviments bancaris.
- No toca remeses.
- No toca Model 182, Model 347 ni certificats.
- No escriu directament a Firestore.
- No crea donants automàticament.
- No fa matching fiscal automàtic.
- No afegeix endpoints nous a la private integration API v1.

## Configuració local

Variables d'entorn:

```bash
SUMMA_BASE_URL=http://localhost:9002
SUMMA_PRIVATE_INTEGRATION_TOKEN=...
SUMMA_ORG_ID=...
SUMMA_SOURCE_REPO=summa-agent-mcp
```

Arrencada:

```bash
npm run mcp:summa-agent
```

El transport és stdio JSON-RPC MCP. Els tokens continuen governats pel contracte `docs/contracts/private-admin-integrations-v1.md`.

## Evidència mínima

Proves locals:

```bash
npm run test:node
```

Cobertura afegida:

- llista exacta de les 4 eines MCP;
- ús de rutes privades existents amb `Authorization`;
- resum operatiu sense endpoints fiscals, remeses ni lectura no autoritzada de pending documents;
- upload amb `Idempotency-Key` i sense tocar ledger.

## Validació real controlada

La validació real no s'executa si no hi ha tokens explícits a l'entorn. No crea tokens ni desa secrets.

Variables requerides:

```bash
SUMMA_BARUMA_PRIVATE_INTEGRATION_TOKEN=...
SUMMA_BARUMA_ORG_ID=...
SUMMA_BARUMA_FORBIDDEN_ORG_ID=...
SUMMA_FLORES_PRIVATE_INTEGRATION_TOKEN=...
SUMMA_FLORES_ORG_ID=...
SUMMA_FLORES_FORBIDDEN_ORG_ID=...
```

Opcional:

```bash
SUMMA_BASE_URL=https://studio--summa-social.us-central1.hosted.app
SUMMA_MCP_DATE_FROM=2026-04-01
SUMMA_MCP_DATE_TO=2026-04-30
SUMMA_BARUMA_CONTACT_QUERY=de
SUMMA_FLORES_CONTACT_QUERY=la
```

Execució:

```bash
npm run mcp:summa-agent:verify
```

La prova fa:

- `search_contacts` per Baruma i Flores;
- `search_transactions` amb rang curt;
- `upload_pending_document` amb un fitxer dummy innocu;
- `get_entity_operational_summary`;
- comprovació cross-org: cada token ha de fallar contra l'altra org amb `ORG_NOT_ALLOWED`.

Sortida:

- `tmp/verification/summa-agent-mcp-YYYYMMDD.md`

El log queda redaccionat i no inclou tokens, emails complets, NIFs, IBANs ni payloads sensibles.
