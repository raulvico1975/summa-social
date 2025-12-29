# CLAUDE — Context i criteri del projecte Summa Social

Aquest repositori correspon al projecte **Summa Social**.

## 1) Què és Summa Social

Summa Social és una aplicació de gestió econòmica i fiscal per a entitats petites i mitjanes d'Espanya.

NO és un ERP genèric ni un gestor de projectes.

El producte se centra exclusivament en:
- conciliació bancària real
- control de saldos i desquadraments
- classificació determinista de moviments
- fiscalitat (Model 182, 347, certificats de donació)
- exports nets per a gestories

La simplicitat, l'estabilitat i la previsibilitat són prioritàries.

## 2) El teu rol com a Claude

El teu rol és **executar canvis petits i segurs**, no dissenyar el producte.

**Respon sempre en català, excepte codi, noms de fitxers, comandes de terminal i literals.**

NO has de:
- prendre decisions arquitectòniques
- refactoritzar codi "per millorar-lo"
- afegir funcionalitats fora de l'abast definit
- introduir dependències noves
- afegir noves llibreries sense preguntar

Prohibit sobreanginyeria: no creis una funció complexa si una solució simple fuciona.

Si una decisió no és òbvia, ATURA'T i demana aclariments.

## 3) Autoritat del projecte

La font d'autoritat absoluta és el document mestre:

- `/docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` (versió actual: v1.10)

Cap altra documentació pot contradir-lo.

Si detectes una contradicció, indica-ho explícitament i proposa una alternativa coherent amb aquest document.

## 4) Criteris no negociables

- Prioritza sempre el canvi mínim viable.
- Mantén el codi explícit, llegible i previsible.
- No modifiquis estructures crítiques de Firestore (transactions, contacts, organizations, members).
- No facis migracions destructives ni canvis massius de dades.
- No reorganitzis carpetes ni moguis fitxers sense permís explícit.
- No canviïs Firestore Rules ni índexos sense permís explícit.

## 5) Com treballar correctament

Quan se't demani una modificació:

1. Confirma l'abast abans de tocar codi.
2. Indica quins fitxers tocaràs i quins NO.
3. Genera sempre codi complet amb paths exactes.
4. Inclou passos de verificació (comandes de terminal o accions a la UI).

Aquest projecte prioritza **estabilitat, senzillesa, criteri i control** per sobre de velocitat.

## 6) Mòdul Projectes — Justificació Assistida

### Pantalla base
- `Gestió Econòmica` és la pantalla central del mòdul
- Cap flux obliga a sortir d'aquesta pantalla
- Ruta: `/dashboard/project-module/projects/[projectId]/budget`

### Mode justificació
- És **partida-cèntric**, no despesa-cèntric
- Prioritza **criteri** per sobre de completitud
- Tot es fa en **memòria** fins a "Aplicar"
- No es modifica cap dada fins que l'usuari confirma

### Suggerències automàtiques
- Són heurístiques (scoring per ressonància semàntica)
- Mai bloquegen el flux
- Mai escriuen dades sense confirmació explícita
- Fitxer: `src/lib/project-module-suggestions.ts`

### Split parcial
- És funcionalitat clau, **no** un edge case
- Permet treure part d'una despesa d'una partida
- La part treta queda al projecte sense partida assignada
- Cas d'ús habitual: quadrar justificacions amb import exacte

### Fitxers principals
- `src/app/[orgSlug]/dashboard/project-module/projects/[projectId]/budget/page.tsx`
- `src/components/project-module/balance-project-modal.tsx`
- `src/lib/project-module-suggestions.ts`
- `src/lib/project-module-types.ts`

### Què NO fer
- NO afegir workflows d'aprovació
- NO crear entitats noves per simular
- NO forçar classificació prèvia de despeses
- NO bloquejar desviacions
- NO obligar a quadrar al cèntim

## 7) Actualitzar novetats del producte

Quan es tanca una funcionalitat significativa (nova pantalla, nou flux, millora visible):

1. Actualitza `src/content/product-updates.ts`:
   - `FEATURE_ANNOUNCEMENT`: Canvia `id` (ex: `v1.18-onboarding`), `text` i `cta.href`
   - `WORKING_ON`: Actualitza la llista amb el que queda pendent

2. L'`id` ha de canviar per forçar que el banner es mostri als usuaris que ja l'havien vist.

3. Format del text: curt, informatiu, sense exclamacions.

