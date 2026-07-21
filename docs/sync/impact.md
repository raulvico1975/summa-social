# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-07-21
- change_scope: reforcar la comunicacio i conversio de les novetats de producte dins de l'app i al web public

## Declaracio obligatoria
- help_topics_updated: ["novetats del producte"]
- manual_updated: no
- manual_sections: []
- faq_updated: yes
- faq_questions: ["7¾. Com em puc assabentar de les novetats i millores de Summa Social?"]
- justification_if_no_change: null

## Notes

- El generador setmanal prioritza resultats i benefici, amb seccions concretes en catala i castella.
- Les rutes reconegudes poden afegir fins a dues accions segures dins de Summa; els canvis desconeguts no inventen botons.
- Obrir el detall intern marca la novetat com a llegida i manté la lectura web com a accio secundaria.
- La home publica mostra les dues novetats mes recents amb fallback segur, i el detall public incorpora CTA a demo i funcionalitats.
- Les novetats anteriors continuen sent compatibles sense migracio.
- No hi ha dependencies noves, migracions ni canvis destructius de Firestore; tampoc s'escriu `undefined`.
