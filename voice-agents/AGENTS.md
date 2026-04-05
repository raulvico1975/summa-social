# Voice Agents Guardrails

Aquest directori segueix aquestes regles locals:

- Tot canvi ha de quedar dins `voice-agents/`.
- No es toca `src/`, `functions/`, `apphosting.yaml`, `firebase.json` ni el pipeline principal.
- Cada fase necessita validacio explicita del `product-director-agent`.
- No es dona una fase per bona sense evidencia minima de valor per Summa.
- En aquest worktree nomes existeix la Fase 1 del `web-agent`.
- El `web-agent` public es text-first i no depen de veu per convertir.
- El `web-agent` pot descobrir necessitats, pero no pot prometre funcionalitats no documentades al producte.
- El `web-agent` ha de qualificar, desqualificar i deixar senyal util per a una demo comercial.
- El pilot no implementa `Client -> Gemini` directe.
- No queda codi preparatori de veu, demo o suport dins aquesta fase.

## Definition of done per fase

1. Objectiu de producte explicit.
2. Scope acotat i documentat.
3. Risc principal identificat.
4. Evidencia minima definida i recollida.
5. Decisio `GO`, `GO WITH TRIM`, `HOLD` o `NO-GO` registrada pel `product-director-agent`.
