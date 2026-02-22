# Resum Operatiu per Raül (No Tècnic)

## Què hem aconseguit
- Tens un entorn de proves separat i operatiu.
- L'agent pot preparar canvis i provar-los en staging.
- Producció continua sota control humà i manual.
- El bridge local ja es pot usar de forma controlada i temporal.
- També el pots usar des del mòbil via Telegram.

## Què et garanteix aquest model
- Els canvis de prova van a un entorn separat, no al sistema real.
- Les credencials de proves i de producció no es barregen.
- Qualsevol execució de l'agent deixa traça verificable.
- Les accions sensibles estan bloquejades si no dones l'autorització explícita.
- Cada ordre crea un espai de feina nou i independent (no reutilitza l'anterior).
- Les respostes de Telegram es mostren en llenguatge planer.

## Què no pot passar (amb la configuració actual)
- L'agent no pot desplegar automàticament a producció.
- L'agent no pot usar secrets de producció en staging.
- L'agent no pot executar `publica` o `acabat` sense keyword explícita.
- Si el bridge no està habilitat temporalment, queda bloquejat per defecte.

## Com s'utilitza, en simple
1. Habilites una finestra curta:
   - `node scripts/bridge/codex-bridge-local.mjs --enable-minutes 15`
2. Llances una ordre:
   - `node scripts/bridge/codex-bridge-local.mjs "Inicia: <ordre>"`
3. Tanques l'accés:
   - `node scripts/bridge/codex-bridge-local.mjs --disable`

## Com s'utilitza des del mòbil (Telegram)
1. Escrius una ordre amb prefix:
   - `Inicia: <ordre>`
   - `Implementa: <ordre>`
   - `Hotfix: <ordre>`
   - `Refactor: <ordre>`
   - `House: <ordre>`
2. El bot et respon amb resum no tècnic.
3. Si l'ordre no té format correcte, et torna la guia curta de format.

## Com saber que ha anat bé
- El bridge respon amb `OK: bridge completat ...`
- Es genera traça a `tmp/bridge/last-run.json`
- No hi ha errors `BLOCKED_SAFE` (excepte si està bloquejat a propòsit)

## Si surt BLOCKED_SAFE, què vol dir
És una protecció activa, no una avaria.
Normalment indica una d'aquestes situacions:
- el bridge està desactivat
- la finestra temporal ha expirat
- el repo no està net o no està a `main`
- s'ha intentat una acció sensible sense keyword

## Estat actual
- Sistema preparat per operar avui mateix amb control fort.
- Punt de treball recomanat: fer servir finestres curtes (`10-30` minuts).

## On anar per detall tècnic
- `docs/AGENT-STAGING-BRIDGE-TECNIC.md`
- `docs/STAGING.md`
- `docs/BRIDGE-CODEX.md`
