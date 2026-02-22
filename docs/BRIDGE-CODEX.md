# BRIDGE CODEX LOCAL

Bridge local per enviar ordres a Codex sense copy/paste, amb govern estricte.

## Ús

```bash
# 1) Executar ordre (auto: desa inbox + llança codex exec)
node scripts/bridge/codex-bridge-local.mjs "Inicia: <ordre>"

# 2) Només cua (desa inbox, no executa Codex)
node scripts/bridge/codex-bridge-local.mjs --queue-only "Inicia: <ordre>"

# 3) Habilitar temporalment execució (recomanat)
node scripts/bridge/codex-bridge-local.mjs --enable-minutes 30

# 4) Desactivar immediatament
node scripts/bridge/codex-bridge-local.mjs --disable
```

Sortides del bridge:
- `tmp/bridge/inbox.txt`
- `tmp/bridge/outbox.txt`
- `tmp/bridge/last-run.json`

## Prova ràpida

```bash
# 1) Validar CLI
node scripts/bridge/codex-bridge-local.mjs --help

# 2) Execució safe
node scripts/bridge/codex-bridge-local.mjs "Inicia: prova bridge control"

# 3) Validar traça
cat tmp/bridge/last-run.json
```

S'espera a `tmp/bridge/last-run.json`:
- `mode: "codex-exec"`
- `codex.exitCode: 0`
- `guardrails.policyViolations: []`
- `guardrails.mandatorySummaryPresent: true`
- `files.lastRun` apuntant al mateix `tmp/bridge/last-run.json`

## Prohibit (guardrails)

- Executar res si el repositori de control no està a `main` o no està net.
- Treballar fora de worktree `codex/*`.
- Fer commit automàtic, push automàtic o deploy automàtic.
- Executar `npm run acabat` sense keyword explícita `CEO_OK_ACABAT`.
- Executar `npm run publica` (o deploy) sense keyword explícita `CEO_OK_PUBLICA`.
- Demanar OK al CEO sense bloc previ:
  - `RESUM CEO (OBLIGATORI)`

## Notes operatives

- El bridge intenta reutilitzar l'últim worktree `codex/*`; si no existeix, en crea un.
- Si `codex exec` no pot executar-se, l'ordre queda en cua i es registra a `last-run.json`.
- Kill switch `tmp/bridge/DISABLED`:
  - Bloqueja execució normal i `--queue-only` amb `BLOCKED_SAFE`.
  - `--help` continua disponible per diagnòstic.
  - `--disable` crea `DISABLED` i esborra `ENABLED_UNTIL`.
- Finestra temporal `tmp/bridge/ENABLED_UNTIL`:
  - `--enable-minutes <N>` habilita execució fins al timestamp guardat.
  - Quan expira, el bridge torna a `BLOCKED_SAFE` i reactiva `DISABLED`.
