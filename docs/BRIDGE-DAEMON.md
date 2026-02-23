# BRIDGE DAEMON (macOS)

## Com funciona

- Servei LaunchAgent: `com.summa.codexbridge`
- Arrenca automàticament en iniciar sessió (`RunAtLoad`) i es reinicia si cau (`KeepAlive`).
- Procés daemon: `scripts/bridge/codex-bridge-daemon.mjs`
- Polling d'entrada: `tmp/bridge/inbox.txt` (cada ~1.5s)
- Quan detecta ordre:
  - valida govern (`main` + repo net)
  - bloqueja ordres prohibides (`npm run acabat`, `npm run publica`, `git push`)
  - bloqueja risc `ALT` detectat per patró
  - crea un worktree `codex/*` nou per cada ordre
  - executa `codex exec`
  - escriu resultats a:
    - `tmp/bridge/outbox.txt`
    - `tmp/bridge/last-run.json`
  - neteja `tmp/bridge/inbox.txt`

## Telegram

- Polling Telegram actiu (interval curt) amb `getUpdates`.
- Només processa missatges del xat autoritzat al daemon.
- Ordres acceptades amb prefix: `Inicia`, `Implementa`, `Hotfix`, `Refactor`, `House` (amb `:` opcional).
- Si el missatge no és una ordre vàlida, respon amb instruccions d'ús.
- La resposta enviada a Telegram es transforma a llenguatge no tècnic.

Comandes internes (auditoria):
- `git -C /Users/raulvico/Documents/summa-social rev-parse --abbrev-ref HEAD`
- `git -C /Users/raulvico/Documents/summa-social status --porcelain --untracked-files=normal`
- `bash scripts/worktree.sh create`
- `codex exec -C <worktree-codex> --sandbox workspace-write -o tmp/bridge/outbox.txt -`

## Instal.lar / activar

```bash
bash scripts/bridge/install-launchagent.sh
```

Plist instal.lat:
- `~/Library/LaunchAgents/com.summa.codexbridge.plist`

Runtime script carregat pel LaunchAgent:
- `~/Library/Application Support/summa-codexbridge/codex-bridge-daemon.mjs`

Logs:
- `~/Library/Logs/summa-codexbridge.log`
- `~/Library/Logs/summa-codexbridge.err.log`

## Com verificar que esta actiu

```bash
launchctl print gui/$(id -u)/com.summa.codexbridge | head -n 40
tail -n 40 ~/Library/Logs/summa-codexbridge.log
cat tmp/bridge/last-run.json
```

Si veus `EPERM` als logs sobre `Documents`, macOS TCC esta bloquejant acces no interactiu.
Opcio conservadora: donar Full Disk Access al binari `node` usat pel LaunchAgent.

## Kill switch (desactivar LaunchAgent)

```bash
bash scripts/bridge/uninstall-launchagent.sh
```

Aquest kill switch atura el servei i elimina el plist de `~/Library/LaunchAgents`.
