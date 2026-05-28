# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-05-28
- change_scope: integracio privada per pujar documents pendents ja confirmats des de Summa Agent

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: no
- manual_sections: []
- faq_updated: no
- faq_questions: []
- justification_if_no_change: "Canvi privat d'integracio administrativa; no altera pantalles ni instruccions d'usuari final."

## Notes

Què ha canviat

- La ruta privada `pending-documents/upload` continua creant `draft` per defecte.
- La mateixa ruta pot crear un `pendingDocument` en estat `confirmed` quan un agent privat envia `status=confirmed` i tots els camps obligatoris de Summa Social.
- El document confirmat queda preparat per al flux existent de conciliacio amb extractes bancaris; no vincula cap moviment per si sol.

Per què importa a l'usuari

- Permet que Summa Agent alimenti Summa Social amb factures ja validades sense duplicar el motor de conciliacio.
- Summa Social conserva la seva logica: documents pendents confirmats, suggeriments quan entra l'extracte i conciliacio revisable.
- No canvia imports, moviments, fiscalitat, remeses ni saldos.

Com ho notarà

- La UI de Summa Social no canvia.
- Els documents creats per una integracio privada poden aparèixer directament a la pestanya de pendents confirmats si arriben amb camps suficients.
- Si falta algun camp obligatori, la API rebutja la creacio confirmada i manté el contracte existent.

Ha de fer alguna acció?

- No.
- Cal que l'agent extern enviï `supplierId`, `categoryId`, `invoiceNumber`, `invoiceDate` i `amount` quan vulgui crear factures confirmades.
