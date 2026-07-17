# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-07-17
- change_scope: desacoblar el build de les lectures Firestore del blog public i del sitemap

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: no
- manual_sections: []
- faq_updated: no
- faq_questions: []
- justification_if_no_change: "El canvi no modifica cap flux, text ni ajuda visible. Només evita que el build executi consultes remotes del blog i del sitemap; aquestes rutes continuen llegint les mateixes dades en temps de peticio."

## Notes

- Les rutes de blog localitzades i legacy es renderitzen en temps de peticio, igual que les novetats publiques ja existents.
- El sitemap conserva les mateixes entrades, pero deixa de consultar Firestore durant el build.
- No hi ha dependencies noves, migracions ni canvis de Firestore.
