# Impacte funcional i sincronitzacio documental

## Metadata
- date: YYYY-MM-DD
- change_scope: breu descripcio del canvi funcional

## Declaracio obligatoria
- help_topics_updated:
  - topic-id-1
  - topic-id-2
- manual_updated: yes|no
- manual_sections:
  - seccio-1
- faq_updated: yes|no
- faq_questions:
  - pregunta-1
- justification_if_no_change: text obligatori si manual_updated=no i faq_updated=no i no hi ha help topics

## Notes
- Escriu nomes el minim necessari i verificable.
- Si `manual_updated: yes`, el PR ha de tocar `docs/manual-usuari-summa-social.md`.
- Si `faq_updated: yes`, el PR ha de tocar `docs/FAQ_SUMMA_SOCIAL.md`.
- Si el canvi funcional no canvia contingut visible, justifica-ho clarament.
- `guides.*`, `src/help/*` i `help/topics/*` queden congelats com a compatibilitat legacy si el contracte `docs/help/HELP-EDITORIAL-SINGLE-CONTRACT.md` continua vigent.
- Si el canvi afecta l'ajuda visible actual, documenta el toc a la font activa corresponent: `help.*` als JSON, manual runtime o KB cards.
