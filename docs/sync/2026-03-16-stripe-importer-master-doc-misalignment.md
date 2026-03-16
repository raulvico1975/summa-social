# Incidencia documental — Stripe importer vs document mestre

## Estat
- date: 2026-03-16
- status: RESOLVED
- resolved_at: 2026-03-16
- merge_status: CLEARED
- scope: Stripe importer

## Resum
El contracte real del codi de l'importador Stripe havia quedat desalineat amb `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`.

El codi actual accepta CSV mixt:
- files amb `Transfer` -> entren al flux de payout
- files sense `Transfer` -> s'ignoren perquè encara no formen part d'un payout

El document mestre deia que `Transfer` era un camp CSV obligatori a nivell de fitxer complet i descrivia l'agrupació com si totes les files haguessin de portar payout.

## Resolució aplicada
S'ha actualitzat `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` per alinear-lo amb el contracte real del codi en dos punts:
- secció 3.10 Stripe importer
- secció 4.6 Contracte CSV Stripe

Ara el mestre reflecteix que:
- el CSV Stripe pot contenir files sense `Transfer`
- aquestes files s'ignoren perquè encara no formen part d'un payout
- només les files amb `Transfer` entren a agrupació i conciliació
- si no queda cap fila amb `Transfer`, l'error és `ERR_NO_PAYOUT_ROWS`

## Contracte real validat al codi
- La conciliació Stripe només treballa contra payouts reals (`Transfer = po_xxx`)
- Les files sense `Transfer` s'ignoren i no bloquegen el CSV
- Si no queda cap fila amb `Transfer`, l'error és `ERR_NO_PAYOUT_ROWS`
- El match amb banc continua sent per import net amb tolerància `±0,02`
- No canvia el matching per email
- No hi ha creació automàtica de donants
- No es processen pagaments encara no liquidats com si fossin banc

## Estat de la documentació
Coherent entre:
- `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- `docs/manual-usuari-summa-social.md`
- `docs/FAQ_SUMMA_SOCIAL.md`
- `docs/SPEC-IMPORTADOR-STRIPE.md`

## Validació tècnica feta
- `npm run typecheck` -> OK
- tests Stripe rellevants -> OK
- verificació funcional manual dels 4 casos -> OK

## Tancament
Incidència documental resolta. El bloqueig de merge per contradicció entre mestre i codi queda aixecat.
