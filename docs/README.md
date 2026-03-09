# Documentacio del projecte

Aquest directori queda ordenat amb un criteri conservador:

- a l'arrel només hi queden documents d'autoritat o fitxers amb ruta estable consumida per scripts
- els runbooks manuals van a subcarpetes tematiques
- el material generat continua a `docs/generated/`
- el soroll temporal o residual va a `docs/archive/`

## Llegeix primer

1. `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` - document mestre del producte
2. `docs/PATRONS-CODI-OBLIGATORIS.md` - invariants i patrons obligatoris
3. `docs/DEV-SOLO-MANUAL.md` - manual operatiu del mantenidor
4. `docs/GOVERN-DE-CODI-I-DEPLOY.md` - model de treball i deploy
5. `docs/DOCS-STATUS-2026-03-08.md` - estat de vigencia de la documentacio

## Mapa rapid

### Arrel de `docs/`

Nomes hi han de viure:

- documents d'autoritat del projecte
- fitxers operatius amb ruta fixa usada per scripts
- documents centrals d'usuari o producte

Exemples:

- `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- `docs/DEV-SOLO-MANUAL.md`
- `docs/QA-FISCAL.md`
- `docs/DEPLOY-LOG.md`
- `docs/DEPLOY-INCIDENTS.md`
- `docs/DEPLOY-ROLLBACK-LATEST.md`
- `docs/manual-usuari-summa-social.md`
- `docs/FAQ_SUMMA_SOCIAL.md`

### Carpetes amb sentit actual

- `docs/operations/` - runbooks manuals i operativa no automatica
- `docs/guardrails/` - fitxes curtes de guardrails i criteris d'implementacio
- `docs/QA/` - proves manuals, cobertura i analisi estatica
- `docs/security/` - auditories i documents de seguretat/privacitat
- `docs/kb/` - base de coneixement estructurada del bot i validacions
- `docs/design/` - contracte visual curt i guardrails d'UI
- `docs/generated/` - artefactes generats per scripts; no editar a ma si venen d'un build
- `docs/governance/`, `docs/contracts/`, `docs/trust/`, `docs/i18n/`, `docs/product-updates/`, `docs/sync/` - documentacio tematica
- `docs/archive/` - material retirat de la navegacio principal o residus conservats

## Regles de manteniment

- Si un fitxer es usat per un script, conserva la ruta estable o actualitza el codi en el mateix canvi.
- Si un document es temporal, d'experiment o brut, no va a l'arrel.
- Si un document deixa de ser operatiu pero pot tenir valor historic, mou-lo a `docs/archive/`.
- No afegir nous pseudo-"skills" a `docs/`; les fitxes curtes van a `docs/guardrails/`.
- No editar `docs/generated/*` manualment si la font real es un script.

## Notes d'aquesta reordenacio

- l'antiga carpeta de pseudo-skills s'ha renombrat a `docs/guardrails/`
- runbooks manuals dispersos s'han mogut a `docs/operations/`
- residus com `.DS_Store` i proves temporals s'han apartat a `docs/archive/_trash/`
- s'ha afegit `docs/DOCS-STATUS-2026-03-08.md` per distingir el que es vigent del que requereix revisio
- `docs/CHANGELOG.md` s'ha deixat com a resum curt i l'historial ampli ha passat a `docs/archive/changelog/`
