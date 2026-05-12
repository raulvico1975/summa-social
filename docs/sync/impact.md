# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-05-12
- change_scope: certificats fiscals amb accés acotat sense lectura general del ledger

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: yes
- manual_sections:
  - certificats de donacio
- faq_updated: yes
- faq_questions:
  - Puc donar permis per generar certificats sense donar acces a Moviments?
- justification_if_no_change: ""

## Notes

Què ha canviat

- Els certificats de donació poden generar-se amb el permís `fiscal.certificats.generar` sense concedir `moviments.read`.
- El generador massiu d'Informes i la fitxa del donant passen per una API server-side acotada que retorna només dades fiscals mínimes per al certificat.
- Els perfils restringits no llegeixen directament `transactions` ni `donations` des del client i no veuen el ledger general.

Per què importa a l'usuari

- La persona que gestiona donants pot generar, baixar i enviar certificats anuals sense accedir a Moviments.
- Es manté la separació entre finalitat fiscal i accés econòmic general.
- Es redueix exposició de dades sensibles com factures, transferències, conceptes bancaris, categories, documents, IBAN o notes internes.

Com ho notarà

- Un perfil amb `fiscal.certificats.generar` i sense `moviments.read` podrà carregar certificats a Informes.
- Des de la fitxa del donant podrà generar el certificat anual sense obrir l'històric de moviments.
- Moviments i l'històric econòmic general continuaran bloquejats si no té els permisos corresponents.

Ha de fer alguna acció?

- No.
- Cal mantenir configurats els permisos de perfils restringits sense `moviments.read` si no han de veure el ledger.
