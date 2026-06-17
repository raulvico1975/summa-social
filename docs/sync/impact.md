# Impacte funcional i sincronitzacio documental

## Metadata
- date: 2026-06-02
- change_scope: anul-lar i regenerar remeses SEPA pain.008 de cobrament

## Declaracio obligatoria
- help_topics_updated: []
- manual_updated: no
- manual_sections: []
- faq_updated: no
- faq_questions: []
- justification_if_no_change: "El canvi actualitza la pantalla operativa i la referencia completa interna, pero no modifica el manual d'usuari canonica docs/manual-usuari-summa-social.md ni la FAQ publica. La UI incorpora els textos necessaris i docs/QA-FISCAL.md afegeix el checklist VF-17."

## Notes

Que ha canviat

- L'historial de `Donants -> Remeses de cobrament` separa XML vigents i XML anul-lats.
- Un run pain.008 vigent es pot marcar com anul-lat amb **Anul-lar i regenerar**.
- L'anul-lacio restaura la memoria SEPA dels socis inclosos via API/Admin SDK i batches de maxim 50 operacions.
- Les noves remeses generades des d'una anul-lada guarden `correctedFromRunId`; la remesa anul-lada pot guardar `correctedByRunId`.
- Els elements `included[]` guarden snapshot previ de `sepaPain008LastRunAt|Id` per permetre rollback exacte en futures anul-lacions.

Per que importa a l'usuari

- Permet corregir una remesa de cobrament ja exportada abans d'usar-la, sense eliminar l'evidencia ni manipular Firestore a ma.
- Evita que els socis mensuals quedin bloquejats artificialment quan cal regenerar el mateix mes excloent alguns socis.
- Manté l'XML antic descarregable però clarament marcat com **No utilitzar**.

Com ho notara

- A Historial veu el boto **Anul-lar i regenerar** en els XML vigents.
- Les anul-lades passen a la seccio plegada **Remeses anul-lades**.
- En anul-lar correctament, la UI torna a **Nova remesa** amb compte i data preomplerts si existien al run.
- Una remesa substituta mostra **Substitueix una remesa anul-lada**.

Ha de fer alguna accio?

- No hi ha migracio massiva.
- Per al cas legacy de juny, el flux general d'anul-lacio restaura per mateix mes o execucio anterior si no hi havia snapshot.
- Abans de produccio cal mantenir l'evidencia automatica i el checklist fiscal VF-17 documentat.
