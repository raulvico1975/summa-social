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
    "exclusion_reason": null
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
  "agent_message": "Entenc perfectament la càrrega de treball que suposa gestionar quotes i la conciliació manual amb el banc. Summa Social està dissenyat precisament per resoldre aquests dolors en associacions petites.",
  "fit_assessment": "uncertain_fit",
  "signals_collected": {
    "entity_type": "associacio",
    "team_size": null,
    "primary_pain": "tresoreria i conciliacio",
    "exclusion_reason": null
  },
  "next_question": "Quantes persones toqueu aquest flux en el dia a dia?",
  "qualification_summary": "La vostra associació petita, amb la necessitat de simplificar la gestió de quotes i la conciliació bancària, és un candidat ideal per a Summa Social. La nostra aplicació està optimitzada per reduir la feina manual i millorar la vostra tresoreria.",
  "recommended_next_step": "show_value",
  "ui_action": {
    "type": "render_component",
    "component": "FeatureCard",
    "props": {
      "title": "Valor clar en tresoreria i conciliació",
      "body": "Si la fricció està al banc i a la conciliació, el valor acostuma a aparèixer en claredat operativa i menys feina manual.",
      "bullets": [
        "Importació i conciliació bancària",
        "Seguiment de moviments",
        "Menys dispersió entre fulls i correus"
      ]
    }
  }
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
    "exclusion_reason": null
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
- La sortida ha de poder qualificar, desqualificar o deixar una pregunta curta pendent.
- `fit_assessment`, `qualification_summary` i `recommended_next_step` han de portar la conversa cap a una conclusio clara.
