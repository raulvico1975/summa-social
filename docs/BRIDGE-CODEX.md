# BRIDGE CODEX LOCAL

Bridge local per enviar ordres a Codex sense copy/paste, amb govern estricte.

## Ús (màxim 3 comandes)

```bash
# 1) Executar ordre (auto: desa inbox + llança codex exec)
node scripts/bridge/codex-bridge-local.mjs "Inicia: <ordre>"

# 2) Només cua (desa inbox, no executa Codex)
node scripts/bridge/codex-bridge-local.mjs --queue-only "Inicia: <ordre>"

# 3) Kill switch (desactivar/activar)
touch tmp/bridge/DISABLED   # desactiva
rm -f tmp/bridge/DISABLED   # reactiva
```

Sortides del bridge:
- `tmp/bridge/inbox.txt`
- `tmp/bridge/outbox.txt`
- `tmp/bridge/last-run.json`

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
