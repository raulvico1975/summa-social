# Raül — Checklist 60 segons

## 1) Estat del sistema (30 segons)
- Staging: `bot.summasocial.app` (separat de prod)
- Prod: no automatitzat
- Bridge: bloquejat per defecte (`DISABLED`)
- Paraules CEO per accions sensibles:
  - `CEO_OK_ACABAT`
  - `CEO_OK_PUBLICA`

## 2) Activar el sistema (15 segons)
```bash
node scripts/bridge/codex-bridge-local.mjs --enable-minutes 15
```

## 3) Executar una ordre (10 segons)
```bash
node scripts/bridge/codex-bridge-local.mjs "Inicia: <ordre>"
```

## 4) Tornar a bloquejar (5 segons)
```bash
node scripts/bridge/codex-bridge-local.mjs --disable
```

## 5) Confirmació ràpida que prod no s'ha tocat
```bash
git status --short --branch
```

Ha de mostrar:
```text
## main...origin/main
```
