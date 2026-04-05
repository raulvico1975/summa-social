# Voice Agents Pilot

Pilot aillat dins del repo de Summa Social per validar, en aquesta iteracio, nomes el `web-agent` text-first sense tocar el core funcional de l'app principal.

## Principis

- Tot el treball viu sota `voice-agents/`.
- El repositori de control continua net; la feina es fa en worktree.
- El valor per Summa es revisa a cada fase pel `product-director-agent`.
- El `web-agent` public es `text-first` amb `rich UI`.
- El `demo-agent` Live viu separat del `web-agent` i nomes existeix com a prova de concepte dins `/live`.
- El `support-agent` continua fora d'abast.

## Estructura

```text
voice-agents/
  AGENTS.md
  README.md
  agents/
  client/
  contracts/
  docs/
  server/
```

## Ordre de lectura

1. `voice-agents/docs/PHASES.md`
2. `voice-agents/docs/ARCHITECTURE.md`
3. `voice-agents/docs/IMPLEMENTATION-BLUEPRINT.md`
4. `voice-agents/docs/AGENTS.md`
5. `voice-agents/docs/WEB-AGENT-CONTRACT.md`

## Comandes base

Des del repo de control:

```bash
npm run inicia -- voice-agents
```

Des del worktree del pilot:

```bash
cd voice-agents/server
python3 bot.py
```

```bash
cd voice-agents/client
cp .env.example .env.local
npm install
npm run dev
```

## Estat del pilot

Fase implementada ara:

- `server/bot.py` com a backend Python minim del `web-agent`
- `server/demo_bot.py` com a backend aillat del `demo-agent` Live
- `contracts/` amb contracte JSON explicit entre client i server
- `client/` amb conversa text-first i `rich UI` minima
- `client/app/live/` amb sandbox instrumentat per provar guia de veu contextual
- qualificacio i desqualificacio explicites sense tocar el core de Summa

Fora d'abast explicit de la fase actual:

- support-agent
- context visual
