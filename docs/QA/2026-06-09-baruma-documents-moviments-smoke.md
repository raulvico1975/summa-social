# Smoke QA - Baruma documents per moviment

Data: 2026-06-09
Entitat: Baruma
Entorn: local `http://127.0.0.1:9002/baruma/dashboard/movimientos`, codi a `main` integrat, sense deploy.

## Objectiu

Validar en navegador:

- si es pot veure el comprovant inicialment pujat;
- si es pot desfer la conciliacio;
- si es pot pujar un altre document;
- repetir la comprovacio amb un altre document/moviment.

## Moviment principal provat

Moviment:

- Data: 29/04/2026
- Import: -742,00 EUR
- Concepte: Transferencia a Judit jimenez roig
- Contacte: Judit Jimenez Roig
- Document inicial: `26.04.30 Judit Jimenez.pdf`

Resultats:

- El document inicial apareixia dins el dialeg `Documents del moviment`.
- El dialeg indicava `1 documents`, document `Principal` i `Document anterior`.
- El boto `Obrir` no va obrir cap pestanya ni va canviar la URL en el primer intent observat.
- El menu de la fila de Moviments no conte cap accio de desfer conciliacio; la conciliacio es desfà des de `Moviments > Pendents`.
- A `Moviments > Pendents`, pestanya `Conciliats`, el document apareixia com:
  - `26.04.30 Judit Jimenez.pdf`
  - `2026-04-29`
  - `742.00 EUR`
  - estat `Conciliat`
- Des de aquest menu sí apareix `Desfer conciliacio`.
- En confirmar `Desfer conciliacio`, la UI va mostrar el toast:
  - `Conciliacio desfeta`
  - `El document torna a estar pendent de banc i el moviment queda sense aquest comprovant vinculat.`
- Despres de desfer:
  - el comptador de `Pendents` passa a `1`;
  - el comptador de `Conciliats` passa a `46`;
  - el moviment del 29/04/2026 queda amb `Sense documents`;
  - `Despeses sense document` passa a `2`.

Estat deixat:

- El document `26.04.30 Judit Jimenez.pdf` queda desconciliat i pendent de banc.
- No s'ha restaurat la conciliacio en aquesta prova.

## Segon moviment provat

Moviment:

- Data: 31/03/2026
- Import: -742,00 EUR
- Concepte: Transferencia a Judit jimenez roig
- Contacte: Judit Jimenez Roig
- Document inicial: `2026.03.31_judit_jimenez_roig.pdf`

Resultats:

- El document apareix correctament dins el dialeg `Documents del moviment`.
- El dialeg indica `1 documents`, document `Principal` i `Document anterior`.
- El boto `Obrir` sí obre el document, pero substitueix la pestanya de l'app per una URL directa de Firebase Storage:
  - `https://firebasestorage.googleapis.com/.../2026.03.31_judit_jimenez_roig.pdf?...`
- El moviment del 31/03/2026 no s'ha desconciliat ni modificat.

## Prova de pujada d'un altre document

Intent 1: moviment 29/04/2026, despres de desfer conciliacio.

- El dialeg `Documents del moviment` mostra `Aquest moviment no te documents`.
- El boto `Afegir` queda visible.
- En clicar `Afegir`, el navegador integrat no permet seleccionar fitxer ni omplir l'`input[type=file]` per automatitzacio.

Intent 2: moviment 31/03/2026, amb un document existent.

- El dialeg mostra el document existent i el boto `Afegir`.
- En clicar `Afegir`, el navegador integrat tampoc permet completar la seleccio de fitxer.

Evidencia de consola observada durant la sessio:

- `[attachDocumentToTransaction] Error: FirebaseError: Missing or insufficient permissions.`
- Toast: `Error de pujada Missing or insufficient permissions.`
- El log correspon al flux `handleAttachDocumentWithName`.

Lectura tecnica:

- La UI local ja intenta fer servir el nou flux de documents per moviment.
- Com que encara no hi ha deploy, les Firestore Rules remotes poden no estar actualitzades amb la nova subcolleccio `transactions/{transactionId}/documents`.
- Aquest escenari es coherent amb l'error de permisos en pujar justificants.

## Problemes / incidencies

1. `Obrir` no es comporta de forma consistent:
   - 29/04/2026: no va obrir res en el primer intent observat.
   - 31/03/2026: obre el document, pero substitueix la pestanya de l'app per la URL de Firebase Storage.

2. `Desfer conciliacio` no esta al menu del moviment:
   - A Moviments nomes apareixen accions com `Gestionar devolucio`, `Editar`, `Afegir nota`, `Adjuntar justificant`, `Dividir remesa pagaments`, `Eliminar`.
   - L'accio correcta es a `Moviments > Pendents > Conciliats`.
   - No es un error funcional si aquest es el disseny esperat, pero es una friccio d'UX.

3. Pujada de nou document no validada end-to-end:
   - El connector de navegador no pot operar el selector de fitxer del sistema.
   - La consola mostra un error real de permisos en el flux de pujada.
   - Abans de donar-ho per bo cal provar amb les Firestore Rules desplegades o amb emulador/regles locals equivalents.

4. Estat de dada alterat per la prova:
   - El document `26.04.30 Judit Jimenez.pdf` ha quedat pendent de banc despres de desfer conciliacio.
   - Cal re-conciliar-lo si es vol restaurar l'estat inicial.

## Recomanacio abans de publicar

- Desplegar o validar les Firestore Rules que permeten la subcolleccio de documents per moviment.
- Repetir la pujada manual amb un fitxer real de prova:
  - moviment sense documents;
  - moviment amb 1 document existent;
  - comprovar que passa a `2 documents` i que el primer no se substitueix.
- Decidir si `Obrir` ha d'obrir en pestanya nova o en la mateixa pestanya, pero fer-ho consistent.
- Considerar un enllac o accio contextual des del dialeg de documents cap al pending document conciliat, si l'usuari espera desfer conciliacio des del moviment.
