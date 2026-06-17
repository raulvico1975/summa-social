# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-06-16
- change_scope: projectes amb diversos financadors dins del Modul Projectes

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: yes
- manual_sections:
  - 10.3 Gestio Economica del projecte
- faq_updated: no
- faq_questions: []
- justification_if_no_change: "La funcionalitat s'ha documentat al manual d'usuari i a la referencia completa. No s'actualitza la FAQ perque es una capa operativa interna del modul de projectes, no una pregunta publica general."

## Notes

Que ha canviat

- Els projectes poden activar opcionalment una capa de diversos financadors.
- Un projecte pot tenir fonts de financament, distribucio pressupostaria per partida i distribucio de despeses imputades per font.
- La pantalla de Gestio Economica mostra els controls nomes quan el projecte te el mode actiu.
- L'export multi-financador genera detall per despesa i resum per partida i font activa.

Per que importa a l'usuari

- Permet justificar una mateixa execucio economica davant de diverses fonts sense duplicar projectes ni tocar moviments bancaris.
- Manté la imputacio original de la despesa al projecte com a base i afegeix una capa de repartiment per font.
- Mostra avisos de parcialitat, sobreassignacio o diferencies sense bloquejar la revisio.

Com ho notara

- A **Projectes > (projecte) > Gestio Economica** pot activar **Diversos financadors** si te permisos d'administracio.
- Pot crear fonts, repartir pressupost i distribuir despeses imputades.
- Pot baixar un Excel especific amb el detall multi-financador.

Ha de fer alguna accio?

- No hi ha migracio massiva.
- No hi ha deploy dins d'aquesta tasca.
- Els projectes existents continuen igual fins que s'activi `multiFunderEnabled`.
