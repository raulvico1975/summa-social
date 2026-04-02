# Video Studio Contract

Aquest directori publica el contracte mínim que el repositori genèric `video-studio`
espera perquè Summa Social es pugui gravar amb un flux rígid i reusable.

## Estructura

- `studio.contract.json`
  Contracte global del producte.
- `scenarios/*.json`
  Escenaris canònics per peça (`{feature}-{channel}-{locale}`).
- `selectors/*.json`
  Selectors crítics de cada ruta gravable.
- `seeds/`
  Referència de la demo reproductible.
- `fixtures/`
  Fixtures de fitxers i artefactes compartits.

## Regles

- Cada idioma es grava com una peça diferent.
- Els màsters són font de clips reutilitzables, no el vídeo final.
- Els scripts de `scripts/demo/record-*.mjs` continuen sent la capa d'execució UI-específica.
- `video-studio` només orquestra, valida i empaqueta.

## Naming

Els `pieceId` segueixen la norma:

- `{feature}-{channel}-{locale}`

Exemple:

- `bank-reconciliation-landing-ca`

## Estat inicial

El primer escenari normalitzat és:

- `bank-reconciliation-landing-ca`

La resta de flows actuals de Summa ja tenen scripts de gravació, però encara s'han de
baixar un a un a aquesta mateixa estructura contractual.
