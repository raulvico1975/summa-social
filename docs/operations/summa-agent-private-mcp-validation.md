# Validacio MCP privat per Summa Agent

Registre operatiu de validacions controlades del MCP privat de Summa Agent.

## Validacio read-only - 2026-05-11

Resultat: SUPERADA.

S'ha validat el MCP privat Summa Agent amb tokens temporals read-only per Baruma i Flores.

### Scopes utilitzats

- `contacts.read`
- `transactions.read`

### Eines validades

Baruma:

- `search_contacts`: OK, 5 resultats
- `search_transactions`: OK, 5 resultats
- `get_entity_operational_summary`: OK, 10 moviments recents
- cross-org isolation: OK, `ORG_NOT_ALLOWED`

Flores:

- `search_contacts`: OK, 5 resultats
- `search_transactions`: OK, 5 resultats
- `get_entity_operational_summary`: OK, 10 moviments recents
- cross-org isolation: OK, `ORG_NOT_ALLOWED`

### Escriptures

Cap.

No s'ha executat:

- `upload_pending_document`
- `pending_documents.write`
- `npm run mcp:summa-agent:verify`

### Tokens

- Tokens temporals creats nomes per a la prova.
- Tokens no impresos.
- Tokens no guardats en fitxers.
- Tokens revocats al final del flux.

### Deploy

Cap deploy.

No s'ha executat:

- `npm run publica`
- canvi d'App Hosting
- canvi de secrets
- canvi de Firestore rules

### Conclusio

La part read-only del MCP privat Summa Agent queda validada en entorn real per Baruma i Flores.

La validacio d'`upload_pending_document` queda pendent i requereix OK explicit perque implica escriptura real controlada a `pendingDocuments`.
