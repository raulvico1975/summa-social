# Minimum Coverage Map

Objectiu: mapar la cobertura mínima obligatòria del bot contra el que ja existeix a `docs/kb/cards/**`, `docs/manual-usuari-summa-social.md`, `docs/FAQ_SUMMA_SOCIAL.md` i `docs/CATALEG-FUNCIONALITATS.md`, abans de crear o reescriure cap card.

Criteri de qualitat:
- `good`: hi ha card dedicada i prou directa per resoldre el flux sense fallback ni desambiguació.
- `weak`: hi ha cobertura parcial o lateral, però no és prou directa per considerar-la cobertura mínima garantida.
- `missing`: no hi ha cap card fiable per al flux.

## Socis / Donants

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com dono d'alta un nou soci | `howto-member-create` | `good` | `manual` | Card dedicada a l'alta des de Donants. |
| Com dono de baixa un soci | `guide-donor-inactive` | `good` | `manual` | Card dedicada i alineada amb el manual (`3.5`). |
| Com edito les dades d'un soci | `howto-donor-update-details` | `good` | `manual` | Edició directa de la fitxa sense crear duplicats. |
| Com modifico l'IBAN d'un soci | `howto-donor-update-iban` | `good` | `manual` | Flux puntual des de la fitxa. |
| Com veig l'historial d'un soci | `howto-donor-history-summary` | `good` | `manual` | Card dedicada al resum i historial del donant. |
| Com informo el contacte d'una empresa donant | `howto-company-contact-person` | `good` | `manual` | Explica el camp informatiu i que no crea una relació entre fitxes. |

## Quotes i remeses

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com creo una remesa de quotes | `howto-remittance-create-sepa` | `good` | `manual` | Card dedicada al wizard i l'XML pain.008. |
| Com reviso una remesa abans d'enviar-la | `howto-remittance-review-before-send` | `good` | `manual` | Checklist previ a la generació i enviament. |
| Com desfaig una remesa | `howto-remittance-undo` | `good` | `manual` | Flux verificat per tornar una remesa processada al punt anterior. |
| Com gestiono rebuts retornats | `guide-returns` | `good` | `manual` | Card dedicada i coherent amb la secció `7` del manual. |
| Com canvio la quota d'un soci | `howto-donor-update-fee` | `good` | `manual` | Card dedicada a import i periodicitat. |
| Com poso una quota en pausa | `howto-donor-pause-fee` | `good` | `manual` | Explica el mecanisme verificat de quota zero i l'efecte sobre remeses noves. |

## Certificats i fiscalitat

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com envio el certificat de donació a un soci | `guide-donor-certificate` | `good` | `manual` | El manual (`9.3`) cobreix enviament individual i la card ja inclou intents d'enviament. |
| Com genero tots els certificats de donació | `guide-donor-certificate` | `good` | `manual` | La mateixa card cobreix generació massiva des d'Informes > Certificats. |
| Com reviso les dades fiscals d'un donant | `howto-donor-fiscal-review` | `good` | `manual` | Procediment estable de revisió prèvia. |
| Com genero el Model 182 | `guide-model-182-generate` | `good` | `manual` | Card directa, dedicada i amb ruta clara. |
| Per què un donant no surt al Model 182 | `ts-model-182-donor-missing` | `good` | `manual` | Checklist específic de dades, estat i inclusió fiscal. |

## Banc i conciliació

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com importo un extracte bancari | `guide-import-movements` | `good` | `manual` | Card directa, estable i ja connectada a FAQ/manual. |
| Com detecto duplicats d'un extracte | `howto-import-safe-duplicates` | `good` | `faq` | Card dedicada a prevenció i detecció de solapaments. |
| Com assigno un moviment bancari | `howto-assign-bank-movement` | `good` | `faq` | Card dedicada per assignar o corregir categoria i contacte des del moviment. |
| Com divideixo un moviment | `howto-movement-split-amount` | `good` | `faq` | Card específica per repartir imports d'un moviment. |
| Com adjunto una factura o document a un moviment | `guide-attach-document` | `good` | `manual` | Card clara i directa. |

## Usuaris i configuració

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com canvio la meva contrasenya | `guide-access-security` | `good` | `manual` | La card inclou l'intent "canviar contrasenya" i el manual en dona passos directes. |
| Com convido un nou usuari | `howto-member-invite` | `good` | `manual` | Card dedicada al flux de Membres. |
| Com canvio els permisos d'un usuari | `howto-member-user-permissions` | `good` | `manual` | Inclou lectura, seccions, accions crítiques i projectes. |
| Com canvio les dades fiscals de l'entitat | `howto-organization-fiscal-data` | `good` | `manual` | Card dedicada a la configuració oficial de l'entitat. |

## Informes i consultes

| flux | existingCardId | quality | source | notes |
| --- | --- | --- | --- | --- |
| Com veig el resum de donacions d'un donant | `howto-donor-history-summary` | `good` | `manual` | Resum i historial des de la fitxa. |
| Com exporto dades de donants | `howto-donor-export` | `good` | `manual` | Card dedicada a l'exportació. |
| Com veig els ingressos d'un període | `howto-dashboard-income-period` | `good` | `manual` | Consulta explícita per període. |
| Com detecto anomalies o moviments sense assignar | `howto-movement-unassigned-alerts` | `good` | `manual` | Card dedicada a pendents i moviments sense categoritzar. |

## Missing cards

Cap dels 30 fluxos mínims queda sense card.

## Weak cards

Cap dels 30 fluxos mínims depèn de cobertura lateral.

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
- `manual-mobile-usage`: ús des de mòbil o tauleta.
- `ts-slow-app`: diagnòstic de lentitud.
- `howto-donor-pause-fee`: pausa segura amb quota zero.
- `howto-company-contact-person`: contacte informatiu d'empresa.

## Resum operatiu

- Total fluxos analitzats: `30`
- `good`: `30`
- `weak`: `0`
- `missing`: `0`

Ordre recomanat per a la següent iteració:
1. Mantenir el gate adversarial CA/ES amb variants reals i zero desviacions de domini sensible.
2. Revisar periòdicament preguntes amb feedback negatiu i reformulacions.
