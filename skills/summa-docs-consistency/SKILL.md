---
name: summa-docs-consistency
description: En PRs de Summa Social, verifica i proposa un patch per mantenir alineada la REFERÈNCIA COMPLETA amb els canvis reals (sense inventar). Detecta contradiccions, omissions i claims no suportats.
---

# Summa Social — Docs Consistency (Referència completa)

## Objectiu
Quan hi ha un PR que canvia comportament, dades, invariants o UX significativa, aquesta skill produeix un **patch/diff** per actualitzar `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` de forma mínima i precisa.

## Contracte anti-invenció (obligatori)
- Prohibit inventar funcionalitats, camps, fluxos, errors o comportaments.
- Només es poden afirmar coses que estiguin explícitament suportades per:
  1) el diff del PR, o
  2) codi existent al repo referenciat amb fitxer + línies (si se't dona context).
- Si falta evidència: ho marques com a **PENDENT** i no ho escrius al doc.

## Inputs esperats
- Resum del canvi (PR description).
- Diff o llista de fitxers tocats.
- (Opcional) fragments de codi rellevants.

## Sortida obligatòria
1) **Claims map** (taula curta):
   - Claim (frase exacta que el doc dirà)
   - Evidència (fitxer + línies / secció del PR)
   - Risc si s'omet
2) **Patch** en format diff (unified diff) que edita només:
   - `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
3) **No-go list**:
   - Llista de coses que NO has tocat perquè no estaven demostrades pel PR.

## Heurística de "cal tocar la referència?"
Actualitza la referència completa si el PR toca almenys una d'aquestes àrees:
- invariants fiscals, remeses, devolucions, Stripe
- model de dades Firestore (nous camps / semàntica)
- guardrails (idempotència, bloquejos, exclusió archivedAt)
- canvis de rutes o arquitectura
- feature flags, permisos, rols

## Estil de redacció
- Precís, curt, sense marketing.
- Enumeracions, taules, i "què és / què no és".
- Evita duplicar text: només el mínim necessari per reflectir el canvi.
