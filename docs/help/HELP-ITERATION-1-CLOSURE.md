# Help Iteration 1 Closure

## Objectiu

Tancar la iteració 1 sense ampliar cobertura ni tocar retrieval o UX gran.

## 1. Causa exacta del bloqueig

Les auditories `npm run help:audit` i `npm run kb:audit` fallaven per la mateixa causa d'entorn:

- `package.json` invocava `node --import tsx ...`
- `tsx` no estava declarat a `devDependencies`
- en conseqüència, Node fallava amb `ERR_MODULE_NOT_FOUND: Cannot find package 'tsx'`

No era un error del contingut editorial ni de la semàntica de les auditories.

## 2. Correcció aplicada

Correcció mínima aplicada:

- s'ha afegit `tsx` a `devDependencies` de `package.json`
- s'ha actualitzat `package-lock.json`
- no s'han modificat els scripts d'auditoria ni la seva semàntica

## 3. Impacte sobre el projecte

Impacte mínim:

- es restaura una dependència que el repo ja pressuposa en múltiples scripts
- no canvia el comportament funcional del producte
- no canvia el runtime del bot
- no canvia cap pipeline editorial

## 4. Congelació documental del legacy

Per evitar contradiccions amb el contracte editorial vigent, queda documentat com a material congelat:

- `src/help/*`
- `help/topics/*`
- `guides.*` com a capa editorial interna o de compatibilitat, no com a capa visible del producte

Documents ajustats en aquest tancament:

- `docs/guardrails/I18N.md`
- `src/help/README.md`
- `help/topics/README.md`

## 5. Abast confirmat

No s'ha ampliat cobertura més enllà dels 8 microfluxos actius:

1. Importar extracte bancari
2. Detectar duplicats en importar
3. Editar dades d'un donant
4. Canviar quota d'un soci
5. Dividir remesa
6. Desfer remesa
7. Importar devolucions del banc
8. Generar Model 182
