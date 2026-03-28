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

## Brief de producte per canvis visibles
- visible_user_change: yes|no
- user_scope: qui ho notara
- user_problem_before: quina friccio o dubte hi havia abans
- user_change_now: que canvia de forma visible i entenedora
- user_day_to_day: com ho notara en la feina del dia a dia
- user_action_required: que ha de fer l'usuari, o `cap`

## Regles del brief
- escriu-lo en llenguatge d'usuari, no en llenguatge de commit
- evita noms de fitxer, stack, rutes internes o explicacions de refactor
- si `visible_user_change: yes`, aquest brief es pot reutilitzar per help, FAQ o `novetats`
- si `visible_user_change: no`, justifica-ho a `justification_if_no_change`

## Notes
- Escriu nomes el minim necessari i verificable.
- Si `manual_updated: yes`, el PR ha de tocar `docs/manual-usuari-summa-social.md`.
- Si `faq_updated: yes`, el PR ha de tocar `docs/FAQ_SUMMA_SOCIAL.md`.
- Si el canvi funcional no canvia contingut visible, justifica-ho clarament.
- `guides.*`, `src/help/*` i `help/topics/*` queden congelats com a compatibilitat legacy si el contracte `docs/help/HELP-EDITORIAL-SINGLE-CONTRACT.md` continua vigent.
- Si el canvi afecta l'ajuda visible actual, documenta el toc a la font activa corresponent: `help.*` als JSON, manual runtime o KB cards.
