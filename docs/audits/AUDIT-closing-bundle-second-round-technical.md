# AUDIT — Closing Bundle — Second Round Technical

Abast efectiu: lectura estricta del codi del repo dins aquest worktree, sense canvis funcionals.

Nota de mètode: no s'ha localitzat al repo cap document explícit del briefing "Segona ronda — Validació tècnica del Closing Bundle". Aquesta auditoria respon únicament al codi verificable i marca `NO VERIFICABLE` allò que requereix execució real o material extern no present al worktree.

## 0. Verificació prèvia de paths

[0.1] CONFIRMAT
- Evidència: functions/src/exports/closingBundleZip.ts:1; functions/src/exports/closing-bundle/build-closing-data.ts:1; functions/src/exports/closing-bundle/build-closing-xlsx.ts:1; functions/src/exports/closing-bundle/closing-types.ts:1; functions/src/exports/closing-bundle/normalize-filename.ts:1; src/app/api/exports/closing-bundle-zip/route.ts:1; src/app/[orgSlug]/dashboard/informes/page.tsx:1; src/components/reports/closing-bundle-card.tsx:1; src/components/reports/closing-bundle-dialog.tsx:1; src/lib/closing-bundle/closing-bundle-types.ts:1
- Resposta: Els 10 paths indicats existeixen al repo actual. Dins l'scope inspeccionat no s'ha detectat cap migració de la lògica equivalent cap a un altre path.

## 1. Estat actual

[1.1] CONFIRMAT
- Evidència: src/app/[orgSlug]/dashboard/informes/page.tsx:24-25; src/app/[orgSlug]/dashboard/informes/page.tsx:41-50; src/components/reports/closing-bundle-card.tsx:11-15; src/components/reports/closing-bundle-card.tsx:27-37
- Resposta: El Closing Bundle està integrat a la pàgina d'informes, es renderitza com una `Card` pròpia i el CTA d'obertura del diàleg queda condicionat per `informes.exportar`.

[1.2] CONFIRMAT
- Evidència: src/components/reports/closing-bundle-dialog.tsx:47-71; src/components/reports/closing-bundle-dialog.tsx:103-117; src/lib/closing-bundle/closing-bundle-types.ts:16-31
- Resposta: El contracte client actual és `orgId`, `dateFrom`, `dateTo`, amb tres modes de període (`current_year`, `previous_year`, `custom`) i enviament per `POST` cap a `/api/exports/closing-bundle-zip`.

[1.3] CONFIRMAT
- Evidència: src/app/api/exports/closing-bundle-zip/route.ts:13-18; src/app/api/exports/closing-bundle-zip/route.ts:45-52; src/app/api/exports/closing-bundle-zip/route.ts:62-72; functions/src/exports/closingBundleZip.ts:64-70; functions/src/exports/closingBundleZip.ts:88-105; functions/src/exports/closingBundleZip.ts:117-155
- Resposta: El flux productiu actual és client -> Next API Route -> Cloud Function HTTP. La route valida token i permís granular; la Cloud Function torna a validar token i comprova membership/rol abans de generar el ZIP.

[1.4] CONFIRMAT
- Evidència: functions/src/exports/closingBundleZip.ts:223-235; functions/src/exports/closingBundleZip.ts:337-392; functions/src/exports/closing-bundle/build-closing-data.ts:592-624; functions/src/exports/closing-bundle/build-closing-data.ts:631-739
- Resposta: El ZIP actual es construeix per streaming i inclou `README.txt`, `moviments.xlsx`, `resum.txt`, `debug/resum_debug.txt`, `debug/debug.xlsx` i `documents/{fitxer}` per als adjunts que s'han pogut descarregar.

[1.5] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:283-287; functions/src/exports/closing-bundle/build-closing-data.ts:294-330; functions/src/exports/closing-bundle/build-closing-data.ts:364-421
- Resposta: La selecció actual és `ledger-only`: exclou transaccions amb `deletedAt`, filles (`parentTransactionId`), `isRemittanceItem`, `source === 'remittance'` i els childs de Stripe (`transactionType === 'donation'` o `fee`). Les incidències derivades es calculen després sobre aquest conjunt filtrat.

## 2. Traçabilitat de dades

[2.1] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:276-287; functions/src/exports/closing-bundle/build-closing-data.ts:314-333; functions/src/exports/closing-bundle/build-closing-data.ts:342-358
- Resposta: La font primària és `organizations/{orgId}/transactions`, filtrada per rang de dates sobre el camp `date`, transformada a `ClosingTransaction` i ordenada de forma determinista per `date`, `abs(amount)` i `id`.

[2.2] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:140-177; functions/src/exports/closing-bundle/build-closing-data.ts:183-188; scripts/backfill-project-expenses-documents.ts:4-6; scripts/backfill-project-expenses-documents.ts:47-53
- Resposta: La referència documental es resol avui admetent quatre formes històriques: `document` string, `documentUrl`, `document.url` i `document.storagePath`. Això està alineat amb evidència al repo que el model ha tingut com a mínim una migració `documentUrl -> document`.

[2.3] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/normalize-filename.ts:95-160; functions/src/exports/closing-bundle/build-closing-data.ts:197-254
- Resposta: La traça `transaction.document` passa per `extractStorageRef`, que accepta `gs://`, `firebasestorage.googleapis.com/v0`, `*.firebasestorage.app`, `storage.googleapis.com`, paths directes `organizations/...` o URLs genèriques amb `/o/`. El diagnòstic conserva `rawDocumentValue`, `extractedPath`, `bucketConfigured`, `bucketInUrl` i `status`.

[2.4] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:429-469; functions/src/exports/closing-bundle/normalize-filename.ts:32-49; functions/src/exports/closingBundleZip.ts:266-281
- Resposta: Quan un document és elegible, el nom final al ZIP es construeix amb `ordre`, `date`, `abs(amount)`, `concept` normalitzat, últims 8 caràcters del `txId` i extensió inferida. Si hi ha `contentType`, la Cloud Function recalcula l'extensió abans d'afegir-lo al ZIP.

[2.5] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:57-78; functions/src/exports/closing-bundle/build-closing-data.ts:84-101; functions/src/exports/closing-bundle/build-closing-data.ts:521-574; functions/src/exports/closing-bundle/build-closing-xlsx.ts:77-110
- Resposta: `moviments.xlsx` no exposa IDs ni status tècnics. Les categories i contactes es resolen cap a noms humans a partir de mapes carregats de Firestore i només s'hi escriu el nom final del document si la descàrrega s'ha completat.

## 3. Punts d'injecció reals

[3.1] CONFIRMAT
- Evidència: src/components/reports/closing-bundle-dialog.tsx:39-45; src/components/reports/closing-bundle-dialog.tsx:73-117
- Resposta: El client injecta `organizationId`, `dateFrom` i `dateTo` directament al body del `POST`, i injecta també el `Bearer` token al header `Authorization`.

[3.2] CONFIRMAT
- Evidència: src/app/api/exports/closing-bundle-zip/route.ts:15-18; src/app/api/exports/closing-bundle-zip/route.ts:36-52; src/lib/api/admin-sdk.ts:130-160; src/lib/api/require-permission.ts:18-37
- Resposta: La route és un punt d'injecció backend real sobre `orgId` i el context de permisos. Accepta JSON arbitrari, extreu `orgId` del body i resol permisos efectius a partir de `role`, `userOverrides` i `userGrants`.

[3.3] CONFIRMAT
- Evidència: functions/src/exports/closingBundleZip.ts:70-85; functions/src/exports/closingBundleZip.ts:88-117; functions/src/exports/closingBundleZip.ts:135-155
- Resposta: La Cloud Function HTTP és un altre punt d'entrada real. Té CORS obert (`*`), accepta `POST` amb `Authorization: Bearer ...`, parseja `orgId/dateFrom/dateTo` del body i aplica la seva pròpia política d'autorització basada només en membership i rol.

[3.4] CONFIRMAT
- Evidència: src/lib/files/attach-document.ts:72-113; functions/src/exports/closing-bundle/build-closing-data.ts:148-177; functions/src/exports/closing-bundle/normalize-filename.ts:105-160
- Resposta: L'origen funcional habitual del camp `document` és una URL de Firebase Storage escrita al moviment. El Closing Bundle no llegeix cap metadada intermèdia: consumeix directament el valor emmagatzemat a la transacció i en deriva bucket/path per parser.

[3.5] CONFIRMAT
- Evidència: functions/src/exports/closingBundleZip.ts:194-206; functions/src/exports/closingBundleZip.ts:237-246; functions/src/exports/closing-bundle/build-closing-data.ts:486-497; functions/src/index.ts:1-5
- Resposta: Hi ha dos punts de resolució de bucket diferents: la Cloud Function calcula `bucketName` explícit per descarregar, però `validateLimits()` obté metadata via `admin.storage().bucket()` sense passar-li aquest bucket resolt.

## 4. Riscos tècnics

[4.1] CONFIRMAT
- Evidència: src/lib/permissions.ts:76-90; src/app/api/exports/closing-bundle-zip/route.ts:45-52; functions/src/exports/closingBundleZip.ts:145-150
- Resposta: El model d'autorització no és coherent entre capes. La route permet el flux segons `informes.exportar`, però la Cloud Function el restringeix a `admin` o `superadmin`. Conseqüència tècnica observable des del codi: un membre amb rol `user` i permisos efectius vàlids a l'app pot passar la route i ser rebutjat per la Function; i, a l'inrevés, un `admin` amb override que li negui `informes.exportar` quedaria bloquejat a la route però podria invocar la Function directament si té URL i token.

[4.2] CONFIRMAT
- Evidència: src/lib/api/require-permission.ts:22-34; src/lib/closing-bundle/closing-bundle-types.ts:11-13; src/components/reports/closing-bundle-dialog.tsx:121-138
- Resposta: El contracte d'error entre la route i el client està desalineat. La route pot retornar `NOT_MEMBER` o `PERMISSION_DENIED` sense camp `message`, però el client tipa la resposta com `ClosingBundleError` i llegeix `error.message`. Això deixa el toast sense descripció fiable per a aquests casos.

[4.3] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:283-287; src/components/transaction-importer.tsx:96-100; functions/src/exports/closing-bundle/build-closing-xlsx.ts:27-34; functions/src/exports/closing-bundle/build-closing-xlsx.ts:58-67
- Resposta: El límit superior del rang de dates no és robust davant dates amb component horària. El Closing Bundle consulta `date <= YYYY-MM-DD`, però al repo ja hi ha un altre flux que usa `maxDate + '\uf8ff'` per incloure valors `YYYY-MM-DDT...`, i el mateix Closing Bundle ja tracta dates amb `T...` a la capa d'Excel. Si hi ha transaccions amb ISO complet l'últim dia del període, poden quedar fora de la query.

[4.4] CONFIRMAT
- Evidència: functions/src/exports/closingBundleZip.ts:194-206; functions/src/exports/closingBundleZip.ts:237-246; functions/src/exports/closing-bundle/build-closing-data.ts:486-497; functions/src/index.ts:1-5
- Resposta: La validació prèvia de mida i `contentType` no està ancorada al mateix bucket que la descàrrega final. `validateLimits()` llegeix metadata al bucket per defecte, mentre que el `download()` usa el `bucketName` resolt explícitament. Si ambdós bucket divergeixen, els límits, extensions inferides i fins i tot la viabilitat prèvia del paquet poden avaluar-se sobre un bucket diferent del que després es descarrega.

[4.5] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:533-550; functions/src/exports/closing-bundle/build-closing-data.ts:552-559
- Resposta: La resolució de noms humans per categoria/contacte depèn d'heurístiques de longitud/format. Un `categoryName` alfanumèric llarg o un `contactName` alfanumèric llarg es poden tractar com si fossin IDs i re-resoldre's contra mapes; si no hi ha match, el valor pot acabar buit tot i existir un nom original.

[4.6] CONFIRMAT
- Evidència: functions/src/exports/closing-bundle/build-closing-data.ts:570-572; functions/src/exports/closing-bundle/build-closing-xlsx.ts:78-91; functions/src/exports/closing-bundle/build-closing-data.ts:720-737
- Resposta: El full d'usuari no incorpora l'estat tècnic del document. `moviments.xlsx` només mostra si hi havia referència (`Document` = nom o buit), mentre que `URL_NOT_PARSEABLE`, `BUCKET_MISMATCH`, `NOT_FOUND` o `DOWNLOAD_ERROR` només queden visibles al material de `debug/`. Això deixa omissions silencioses si algú consumeix només `moviments.xlsx`.

[4.7] CONFIRMAT
- Evidència: functions/src/exports/closingBundleZip.ts:66-69; functions/src/exports/closing-bundle/closing-types.ts:116-117; functions/src/exports/closing-bundle/build-closing-data.ts:479-513; functions/src/exports/closingBundleZip.ts:240-298
- Resposta: El cost d'I/O és estrictament seqüencial i bufferitzat per document. El codi permet fins a 120 documents i 350 MB totals, però fa `exists()`, `download()` i `archive.append(buffer)` un a un, amb timeout global de 360 segons i memòria de 1 GB. Tècnicament això deixa exposat el flux a degradació o timeout en períodes grans o buckets lents.

## 5. Verificació amb dades reals

[5.1] NO VERIFICABLE
- Motiu: l'execució real del bundle requereix un `Bearer` token Firebase vàlid, membership a una organització existent, `projectId` resoluble, Cloud Function desplegada, dades reals a Firestore i objectes reals a Storage. El flux productiu del repo depèn explícitament d'aquests components externs.
- Evidència: src/components/reports/closing-bundle-dialog.tsx:103-117; src/app/api/exports/closing-bundle-zip/route.ts:53-72; functions/src/exports/closingBundleZip.ts:88-105; functions/src/exports/closingBundleZip.ts:194-206; functions/src/exports/closingBundleZip.ts:237-263
- El que sí es pot afirmar des del codi: el paquet es genera només després de validar auth, org i bucket; la descàrrega d'adjunts depèn de referències documentals i objectes reals a Storage, de manera que sense infraestructura viva no es pot certificar el comportament final del ZIP.
