# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-07-11
- change_scope: estandard QA d'usuari i correccio del rol del compte QA permanent

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: no
- manual_sections: []
- faq_updated: no
- faq_questions: []
- justification_if_no_change: "El canvi no altera cap flux ni text d'usuari. Elimina raul@semillasl.com de l'allowlist SuperAdmin perquè el compte QA sigui un administrador ordinari i afegeix eines internes de QA documentades a docs/QA/."

## Notes

- `raul@semillasl.com` deixa de veure superfícies reservades a SuperAdmin.
- El preflight bloqueja qualsevol futura contradiccio entre el compte QA i l'allowlist SuperAdmin.
- `qa:user` aporta execucio, evidencia, auditoria i neteja exacta de proves sintetiques.
- No hi ha dependències noves, migracions ni canvis destructius de Firestore.
