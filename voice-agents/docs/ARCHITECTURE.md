# Architecture

## Objectiu

Descriure nomes l'arquitectura activa de la Fase 1 del `web-agent`.

## Arquitectura activa

```text
Next.js client del pilot
  -> contracte JSON explicit
  -> backend Python del web-agent
  -> model text
  -> resposta JSON estricta
  -> render de components rich UI
```

## Decisions congelades

- El `web-agent` public no es dissenya `voice-first`.
- El client no veu mai la clau de Gemini.
- El backend viu separat del client i parla amb Gemini via REST.
- El contracte entre client i server es fixa a `voice-agents/contracts/`.

## Fora d'abast explicit

- mode directe `Client -> Gemini`
- veu o Gemini Live
- demo-agent
- support-agent
- integracio al build o deploy principal
- qualsevol context visual o tool use

## Estat actual del codi

- La implementacio activa correspon nomes a la Fase 1.
- `voice-agents/contracts/` fixa el contracte JSON entre client i server.
- `voice-agents/client/` renderitza conversa text-first i `rich UI`.
- `voice-agents/server/` exposa `POST /api/web-agent` i `GET /health`.
- No queda codi de veu, WebRTC ni streaming dins la implementacio activa.
