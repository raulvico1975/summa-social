# Video Studio Integration

## Objectiu

Integrar Summa Social amb el repositori genèric `video-studio` sense duplicar la lògica
de producte dins del sistema d'orquestració.

`video-studio` ha de ser reusable per altres productes SaaS. Summa només hi aporta:

- contracte demo
- escenaris
- selectors crítics
- seed reproductible
- scripts de gravació UI-específics

## On viu cada cosa

### Al repo genèric `video-studio`

- registre de projectes
- briefs
- quality gates
- validació de màster
- derivats
- paquet de revisió
- delivery

### A Summa Social

- [demo/studio.contract.json](/Users/raulvico/Documents/summa-social/demo/studio.contract.json)
- [demo/scenarios](/Users/raulvico/Documents/summa-social/demo/scenarios)
- [demo/selectors](/Users/raulvico/Documents/summa-social/demo/selectors)
- [demo/seeds](/Users/raulvico/Documents/summa-social/demo/seeds)
- [demo/fixtures](/Users/raulvico/Documents/summa-social/demo/fixtures)
- [scripts/demo/record-bank-reconciliation.mjs](/Users/raulvico/Documents/summa-social/scripts/demo/record-bank-reconciliation.mjs)
- [scripts/demo/video-studio-preflight.mjs](/Users/raulvico/Documents/summa-social/scripts/demo/video-studio-preflight.mjs)

## Flux mínim

1. Arrencar demo:
   `npm run demo:up:work`
2. Al repo `video-studio`, crear brief:
   `node scripts/brief-create.mjs --project summa-social --piece bank-reconciliation-landing-ca`
3. Passar preflight:
   `node scripts/preflight-check.mjs --project summa-social --piece bank-reconciliation-landing-ca`
4. Gravar màster:
   `node scripts/record-master.mjs --project summa-social --piece bank-reconciliation-landing-ca`
5. Validar màster, construir derivats, revisar i tancar delivery.

## Estat inicial

La primera integració contractualitzada és:

- `bank-reconciliation-landing-ca`

La resta de flows existents s'han de baixar a aquesta mateixa estructura abans de donar-los
per integrats a `video-studio`.
