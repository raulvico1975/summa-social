# CLAUDE — Com Claude treballa dins Summa Social

## 1. Contracte operatiu

**Prohibit:**
- ❌ Inventar comportaments, camps, fluxos o dades no definides
- ❌ Refactoritzar "per millorar" sense petició explícita
- ❌ Afegir dependències o llibreries sense preguntar
- ❌ Modificar estructures crítiques de Firestore sense permís
- ❌ Fer migracions destructives o canvis massius de dades

**Jerarquia de documents (ordre de prioritat):**
1. `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` — Font de veritat absoluta (v1.36)
2. `docs/QA-P0-FISCAL.md` — Checklist fiscal obligatòria
3. `docs/GOVERN-DE-CODI-I-DEPLOY.md` — Ritual de deploy
4. `docs/PATRONS-CODI-OBLIGATORIS.md` — Patrons de codi
5. `docs/DEV-SOLO-MANUAL.md` — Manual operatiu de suport

Si hi ha conflicte entre documents: **aturar-se i demanar aclariment**.

## 2. Mode de treball

**Plan mode obligatori per:**
- Qualsevol tasca >3 passos
- Qualsevol canvi de dades, fiscalitat o conciliació
- Qualsevol modificació d'estructures crítiques

**Ús de subagents:**
- Lectura de documents → subagent
- Exploració de codi → subagent
- Anàlisi paral·lela → subagents múltiples
- El context principal només conté decisions i ordres finals

**Si el pla falla → STOP + replantejar. Prohibit "empènyer".**

## 3. Execució i verificació

No marcar res com a fet sense:
- Tests passats (si n'hi ha)
- Build correcte
- Validació contra invariants (ledger, remeses, fiscal)

**Pregunta obligatòria abans de tancar qualsevol tasca no trivial:**
> "Això passaria una revisió d'un staff engineer?"

## 4. Principis de codi

- Canvi mínim viable sempre
- Codi explícit, llegible i previsible
- Si una solució simple funciona, no crear-ne una de complexa
- **Firestore batch ≤ 50 operacions** (invariant operatiu)
- Consultar `docs/PATRONS-CODI-OBLIGATORIS.md` per a patrons específics

## 5. Àrees crítiques

### Mòdul Projectes (Justificació Assistida)
- Mode **partida-cèntric**, no despesa-cèntric
- Tot es fa en **memòria** fins a "Aplicar"
- Suggerències automàtiques = heurístiques, mai bloquegen

### Remeses de Rebuts
- Flux: `PROCESSAR → DESFER → REPROCESSAR`
- Mai processar si `isRemittance === true`
- Desfer = soft-delete (archivedAt), mai hard-delete

### Fiscalitat
- **Obligatori:** Executar `docs/QA-P0-FISCAL.md` abans de push a master que toqui fiscal
- Invariants A1-A4 definits a REFERENCIA-COMPLETA.md

## 6. Deploy a producció

Claude Code **només pot desplegar** quan el CEO dona ordre explícita:
> "Autoritzo deploy"

Ritual complet a `docs/GOVERN-DE-CODI-I-DEPLOY.md`. No modificar el flux.

## 7. Idioma

- Resposta **sempre en català**
- Excepcions: codi, noms de fitxers, comandes de terminal, literals
