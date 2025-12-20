# CLAUDE — Context i criteri del projecte Summa Social

Aquest repositori correspon al projecte **Summa Social**.

## 1) Què és Summa Social

Summa Social és una aplicació de gestió econòmica i fiscal per a ONGs petites i mitjanes d'Espanya.

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

- `/docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` (versió actual: v1.8)

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

