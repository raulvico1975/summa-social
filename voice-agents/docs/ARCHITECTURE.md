# Architecture

## Objectiu

Descriure l'arquitectura activa del pilot aillat de `web-agent` i `demo-agent`.

## Arquitectura activa

```text
Fase 1
Next.js client del pilot
  -> contracte JSON explicit
  -> backend Python del web-agent
  -> model text
  -> resposta JSON estricta
  -> render de components rich UI

Fase 2
Ruta /live del client
  -> Daily WebRTC per audio
  -> websocket lleuger per context DOM i tools
  -> backend Python del demo-agent
  -> Gemini Live + function calling
```

## Decisions congelades

- El `web-agent` public no es dissenya `voice-first`.
- El client no veu mai la clau de Gemini.
- El backend viu separat del client i parla amb Gemini via REST.
- El contracte entre client i server es fixa a `voice-agents/contracts/`.
- El criteri principal es comercial: qualificar, desqualificar i deixar senyal util.
- El futur `support-agent`, quan existeixi, tindra la KB real de Summa com a font d'autoritat.
- El `demo-agent` utilitza un patro DOM no invasiu amb `data-ai-*` i no introdueix cap store global nou.

## Fora d'abast explicit

- mode directe `Client -> Gemini`
- support-agent
- integracio al build o deploy principal
- qualsevol integracio real amb l'app principal fora de `/live`

## Estat actual del codi

- La implementacio activa correspon a una Fase 1 text-first i una Fase 2 Live aillada.
- `voice-agents/contracts/` fixa el contracte JSON entre client i server.
- `voice-agents/client/` renderitza conversa text-first i `rich UI`.
- `voice-agents/server/` exposa `POST /api/web-agent` i `GET /health`.
- `voice-agents/client/app/live/` instrumenta una demo falsa amb `data-ai-view`, `data-ai-action` i `data-ai-state`.
- `voice-agents/server/demo_bot.py` crea sessions Daily i escolta context DOM per websocket.
