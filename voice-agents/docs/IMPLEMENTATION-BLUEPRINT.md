# Implementation Blueprint

## Fase 1 activa

Aquest blueprint descriu nomes la implementacio activa del `web-agent` text-first.

## Web-agent

- model text via backend Python
- contracte JSON petit i estable
- UI minima amb `ChoiceSelector`, `FeatureCard`, `LeadCaptureForm` i `QualificationSummaryCard`
- objectiu: qualificar, desqualificar i deixar senyal util per a una demo comercial

## Contracte minim

### Request

- `locale`
- `messages`
- `known_profile`
- `ui_capabilities`

### Response

- `agent_message`
- `fit_assessment`
- `signals_collected`
- `next_question`
- `qualification_summary`
- `recommended_next_step`
- `ui_action`

## Logica de producte

- si el cas apunta a ERP, comptabilitat formal, RRHH, nomines o voluntariat, es marca `low_fit`
- si el dolor entra a quotes, remeses, donacions, fiscalitat o tresoreria, el bot pot aportar valor abans de fer una ultima pregunta curta
- si hi ha prou senyal, la sortida acaba en `good_fit`, `uncertain_fit` o `low_fit`
- nomes es porta a demo o contacte quan toca

## Fora d'abast

- support-agent

## Demo-agent Live

- backend separat a `server/demo_bot.py`
- model Live actual configurable per entorn
- audio per Daily WebRTC
- context de pantalla enviat via `MutationObserver`
- function calling limitat a `highlight_element` i `Maps_to`
- sandbox falsa a `client/app/live/page.tsx` per provar remeses i donants
