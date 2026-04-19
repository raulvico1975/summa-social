# Importacio extracte conciliacio

## Brief id

`importacio-extracte-conciliacio`

## Feature domain

Importació d'extractes bancaris i conciliació operativa dins de Moviments.

## Real user problem

Una persona administrativa o de gestió necessita passar l'extracte del banc a
Summa, verificar que el fitxer s'ha importat bé i veure de seguida què queda
conciliat, què queda pendent i si hi ha duplicats o solapaments.

## Audience

- gestors i gestores d'entitats socials
- persones administratives que revisen moviments bancaris
- equips que volen entendre el flux d'importació abans de desplegar-lo

## Promise

La peça ha de demostrar que Summa permet importar l'extracte i convertir-lo en
un estat operatiu de conciliació sense perdre traçabilitat ni obligar l'usuari
a reconstruir el flux a mà.

## What the piece must prove

- l'entrada real al flux d'importació
- la selecció o validació del compte correcte
- la previsualització de l'extracte abans de confirmar
- la detecció de solapaments, duplicats o alertes rellevants
- l'estat resultant després de la conciliació

## Approved captures needed

The explainer should be built from captures that show the actual product path:

- entry point to `Moviments > Importar extracte bancari`
- file selection or upload state
- import preview with mapping or column review
- warning state for overlap, duplicate, or invalid data
- reconciliation result or settled state after import

## Target master format

`proof-first-master-16x9`

This is the proof-first master for the first canonical workflow.
It should stay product-led, readable in normal playback, and backed by real
captures rather than illustrative stand-ins.

## Later derived channels

- `9:16` social cut for short-form distribution
- support or help-center embed cut
- short sales preview cut if the same master is reused for outreach

## Constraints

- Do not treat the old research pilot as precedent.
- Do not use abstract visuals where a real capture is available.
- Keep the narrative focused on what changes in the product, not on generic
  banking imagery.

## Existing repo sources

These existing assets should be treated as upstream material for the first
canonical master:

- `docs/operations/demo-storyboards/bank-reconciliation-feature.md`
- `scripts/demo/record-bank-reconciliation.mjs`
- `scripts/demo/video-storyboards/bank-reconciliation-intelligent.mjs`

They are not the final explainer contract on their own, but they already
capture workflow truth, recording steps, and the product language that this
brief should preserve.

## Brief note

This brief is intentionally narrow. It should be the first workflow that proves
the new proof-first video system can be built from a brief, a capture set, and
an approved master contract.
