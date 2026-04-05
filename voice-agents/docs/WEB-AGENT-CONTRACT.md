# Web-Agent Contract

Contracte executable entre `voice-agents/client/` i `voice-agents/server/` per a la Fase 1.

## Rutes

- `GET /health`
- `POST /api/web-agent`

## Schemas d'autoritat

- `voice-agents/contracts/web-agent-request.schema.json`
- `voice-agents/contracts/web-agent-response.schema.json`

## Request minim

```json
{
  "locale": "ca",
  "messages": [
    {
      "role": "user",
      "text": "Som una associacio petita amb moltes quotes i feina manual amb el banc."
    }
  ],
  "known_profile": {
    "entity_type": null,
    "team_size": null,
    "primary_pain": null,
    "urgency": null,
    "fit_band": null
  },
  "ui_capabilities": [
    "choice_selector",
    "feature_card",
    "lead_capture_form",
    "qualification_summary"
  ]
}
```

## Response minima real validada

Exemple obtingut a la validacio local de Fase 1:

```json
{
  "agent_message": "Gracies per compartir-ho! Sembla que Summa Social podria ser de gran ajuda per la vostra associacio, especialment amb la gestio de quotes i remeses. Per fer-me una idea mes precisa, em podries dir quantes persones sou a l'equip que gestiona aquestes tasques?",
  "qualification_status": "evaluating",
  "collected_signals": {
    "entity_type": "Associacio petita",
    "team_size": null,
    "primary_pain": "Gestio manual de quotes, remeses i tasques bancaries",
    "urgency": null,
    "fit_band": null
  },
  "ui_action": {
    "type": "render_component",
    "component": "ChoiceSelector",
    "props": {
      "field": "team_size",
      "label": "Quantes persones esteu implicades en aquesta gestio?",
      "options": [
        { "id": "1", "label": "Una persona" },
        { "id": "2-3", "label": "Dues o tres persones" },
        { "id": "4-8", "label": "Entre quatre i vuit" },
        { "id": "8+", "label": "Mes de vuit" }
      ]
    }
  },
  "next_step": "continue_diagnosis"
}
```

## Prova rapida amb curl

```bash
curl -s -X POST http://127.0.0.1:8787/api/web-agent \
  -H 'Content-Type: application/json' \
  --data @- <<'JSON'
{
  "locale": "ca",
  "messages": [
    {
      "role": "user",
      "text": "Som una associacio petita amb moltes quotes i feina manual amb el banc."
    }
  ],
  "known_profile": {
    "entity_type": null,
    "team_size": null,
    "primary_pain": null,
    "urgency": null,
    "fit_band": null
  },
  "ui_capabilities": [
    "choice_selector",
    "feature_card",
    "lead_capture_form",
    "qualification_summary"
  ]
}
JSON
```

## Invariants del contracte

- El client no envia cap clau de Gemini.
- El backend sempre retorna JSON.
- `ui_action` ha de ser usable, no nomes formalment valid.
- `qualification_status` i `next_step` han de portar la conversa cap a una conclusio clara.
