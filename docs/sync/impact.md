# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-07-21
- change_scope: reparar la publicacio setmanal de novetats i recuperar les peces pendents de juliol

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: no
- manual_sections: []
- faq_updated: no
- faq_questions: []
- justification_if_no_change: "El flux visible no canvia d'ubicacio: la campaneta interna i /novetats continuen llegint productUpdates. El canvi repara el generador i prepara dues peces CA/ES encara no publicades; no cal modificar manual o FAQ."

## Notes

- La funcio setmanal deixa de dependre d'una sessio web per generar el contingut.
- Els commits reals de les setmanes 06-12/07 i 13-19/07 generen copy concret i validat en catala i castella.
- Una fallada crea o actualitza una unica incidencia a `systemIncidents`; una execucio correcta posterior la resol.
- Els dos payloads de recuperacio queden preparats localment i no s'escriuen a produccio sense autoritzacio explicita.
- No hi ha dependencies noves, migracions ni canvis destructius de Firestore; tampoc s'escriu `undefined`.
