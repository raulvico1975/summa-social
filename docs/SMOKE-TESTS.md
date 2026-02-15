# Smoke Tests - Editorial (Pre-deploy)

Document de referència ràpida per llançament editorial.
Per checklist global de producte, consulta també `docs/QA/SMOKE-TESTS.md`.

## Editorial (3 checks obligatoris)

- [ ] **S15 Draft invisible**: guardar una guia en `guidesDraft.*` no la fa visible al Hub ni al bot.
- [ ] **S16 Publish visible + version bump**: publicar guia la fa visible al Hub/bot i incrementa `system/i18n.version`.
- [ ] **S17 Checklist (omesa amb motiu)**: si marques una tasca com `ajornat` o `descartat`, cal motiu; sense motiu no es pot tancar setmana.

## Pre-deploy funcional (10 min)

- [ ] Guia nova: crear draft només en CA i confirmar invisibilitat al Hub/bot.
- [ ] Publicar: confirmar visibilitat i resposta del bot amb `cardText` esperat.
- [ ] Concurrència: doble publish ràpid per forçar `409 CONCURRENT_EDIT` i verificar missatge d'error + no publicació parcial.
