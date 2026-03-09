# Minimum Coverage Map

Objectiu: mapar la cobertura mínima obligatòria del bot contra el que ja existeix a `docs/kb/cards/**`, `docs/generated/help-bot.json`, `docs/manual-usuari-summa-social.md`, `docs/FAQ_SUMMA_SOCIAL.md` i `docs/CATALEG-FUNCIONALITATS.md`, abans de crear o reescriure cap card.

Criteri de qualitat:
- `good`: hi ha card dedicada i prou directa per resoldre el flux sense fallback ni desambiguació.
- `weak`: hi ha cobertura parcial o lateral, però no és prou directa per considerar-la cobertura mínima garantida.
- `missing`: no hi ha cap card fiable per al flux.

## Socis / Donants

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com dono d'alta un nou soci | `donor-create` | `weak` | `manual` | La cobertura existent és a `docs/generated/help-bot.json` i parla de crear un donant genèric. No baixa prou al cas de soci amb quota, IBAN i estat. |
| Com dono de baixa un soci | `guide-donor-inactive` | `good` | `manual` | Card dedicada i alineada amb el manual (`3.5`). |
| Com edito les dades d'un soci | `guide-update-donors` | `weak` | `manual` | La card existent està orientada a actualització massiva per importació, no a l'edició directa de fitxa. |
| Com modifico l'IBAN d'un soci | `guide-update-donors` | `weak` | `manual` | Cobreix canvi d'IBAN via importació, però no el flux natural d'edició puntual des de la fitxa. |
| Com veig l'historial d'un soci | `manual-member-paid-quotas` | `weak` | `manual` | Cobreix quotes pagades, però no és una card dedicada a historial complet o resum de fitxa. |
| Com assigno un soci com a contacte d'una empresa donant | `-` | `missing` | `manual` | El concepte "persona de contacte" apareix al manual/export, però no hi ha card procedimental. |

## Quotes i remeses

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com creo una remesa de quotes | `-` | `missing` | `manual` | Hi ha explicació conceptual a `guide-remittances` i el manual del wizard SEPA (`6.a`), però no una card dedicada a generar la remesa. |
| Com reviso una remesa abans d'enviar-la | `-` | `missing` | `manual` | El pas de revisió existeix al wizard del manual, però no hi ha card específica. |
| Com desfaig una remesa | `guide-split-remittance` | `good` | `manual` | La card ja cobreix explícitament "desfer remesa" i errors de processat. |
| Com gestiono rebuts retornats | `guide-returns` | `good` | `manual` | Card dedicada i coherent amb la secció `7` del manual. |
| Com canvio la quota d'un soci | `guide-update-donors` | `weak` | `manual` | Es pot deduir com a actualització de donant, però no hi ha una card centrada en quota. |
| Com poso una quota en pausa | `-` | `missing` | `manual` | No he trobat cobertura clara ni card existent. |

## Certificats i fiscalitat

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com envio el certificat de donació a un soci | `guide-donor-certificate` | `good` | `manual` | El manual (`9.3`) cobreix enviament individual i la card ja inclou intents d'enviament. |
| Com genero tots els certificats de donació | `guide-donor-certificate` | `good` | `manual` | La mateixa card cobreix generació massiva des d'Informes > Certificats. |
| Com reviso les dades fiscals d'un donant | `ts-donor-incomplete-data` | `weak` | `manual` | Hi ha troubleshooting útil per dades incompletes, però no una card de revisió fiscal com a procediment estable. |
| Com genero el Model 182 | `guide-model-182-generate` | `good` | `manual` | Card directa, dedicada i amb ruta clara. |
| Per què un donant no surt al Model 182 | `guide-model-182` | `good` | `manual` | Cobreix explícitament donants exclosos i errors del 182. |

## Banc i conciliació

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com importo un extracte bancari | `guide-import-movements` | `good` | `manual` | Card directa, estable i ja connectada a FAQ/manual. |
| Com detecto duplicats d'un extracte | `guide-import-movements` | `weak` | `faq` | El tema existeix al manual/FAQ, però la card actual és d'importació general, no de duplicats. |
| Com assigno un moviment bancari | `guide-edit-movement` | `weak` | `faq` | Cobreix edició de categoria/contacte, però no està formulada com a card d'assignació de moviment. |
| Com divideixo un moviment | `-` | `missing` | `faq` | No he trobat card específica per dividir un moviment no-remesa. |
| Com adjunto una factura o document a un moviment | `guide-attach-document` | `good` | `manual` | Card clara i directa. |

## Usuaris i configuració

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com canvio la meva contrasenya | `guide-access-security` | `good` | `manual` | La card inclou l'intent "canviar contrasenya" i el manual en dona passos directes. |
| Com convido un nou usuari | `guide-access-security` | `weak` | `manual` | El flux existeix al manual (`2.1 Membres`), però la card és massa genèrica. |
| Com canvio els permisos d'un usuari | `guide-access-security` | `weak` | `manual` | Cobertura genèrica de rols/accessos; falta una card centrada en permisos. |
| Com canvio les dades fiscals de l'entitat | `-` | `missing` | `manual` | El manual cobreix Configuració de l'Organització, però no hi ha card dedicada. |

## Informes i consultes

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com veig el resum de donacions d'un donant | `guide-donors` | `weak` | `manual` | El manual explica la fitxa del donant amb resum anual, però la card actual és massa generalista. |
| Com exporto dades de donants | `guide-donors` | `weak` | `manual` | El flux existeix al manual (`3.9`), però no hi ha card dedicada d'exportació. |
| Com veig els ingressos d'un període | `guide-movement-filters` | `weak` | `manual` | Hi ha filtres i canvi de període, però no una card explícita per consulta d'ingressos per període. |
| Com detecto anomalies o moviments sense assignar | `manual-common-errors` | `weak` | `manual` | Hi ha cobertura lateral via errors comuns, sense contacte i banners, però no una card clara d'anomalies/pendents. |

## Missing cards

- `member-company-contact-link`: com assignar un soci com a contacte d'una empresa donant.
- `remittance-create-sepa`: com crear una remesa de quotes.
- `remittance-review-before-send`: com revisar una remesa abans d'enviar-la al banc.
- `member-fee-pause`: com posar una quota en pausa.
- `movement-split`: com dividir un moviment.
- `organization-fiscal-data`: com editar les dades fiscals i oficials de l'entitat.

## Weak cards

- `donor-create`: cal separar alta de donant genèric d'alta de soci amb quota, IBAN i estat.
- `guide-update-donors`: cal desdoblar edició simple de fitxa, canvi d'IBAN i canvi de quota.
- `manual-member-paid-quotas`: cal una card específica de fitxa/historial/resum del soci.
- `ts-donor-incomplete-data`: cal una card procedimental de revisió fiscal del donant, no només troubleshooting.
- `guide-import-movements`: cal una card específica de detecció de duplicats.
- `guide-edit-movement`: cal una card específica per assignar un moviment bancari.
- `guide-access-security`: cal separar canvi de contrasenya, invitació d'usuari i canvi de permisos.
- `guide-donors`: cal separar resum de donacions i exportació de donants.
- `guide-movement-filters`: cal una card explícita per veure ingressos d'un període.
- `manual-common-errors`: cal una card operativa per detectar pendents, anomalies i moviments sense assignar.

## Already good

- `guide-donor-inactive`: donar de baixa un soci.
- `guide-split-remittance`: desfer una remesa i gestió de remesa dividida.
- `guide-returns`: gestionar rebuts retornats.
- `guide-donor-certificate`: enviar i generar certificats de donació.
- `guide-model-182-generate`: generar el Model 182.
- `guide-model-182`: entendre per què un donant no surt al Model 182.
- `guide-import-movements`: importar extracte bancari.
- `guide-attach-document`: adjuntar factura o document a un moviment.
- `guide-access-security`: canviar la contrasenya.

## Resum operatiu

- Total fluxos analitzats: `30`
- `good`: `10`
- `weak`: `14`
- `missing`: `6`

Ordre recomanat per a la següent iteració:
1. Crear les `missing cards`.
2. Reforçar les `weak cards` que afecten fluxos nuclears de soci, remeses, permisos i consultes.
3. Després ampliar variants i llenguatge real amb `recommendedCoverageCandidates`.
