# CHANGELOG — resum recent

Aquest fitxer ja no pretén duplicar el document mestre.

Ús correcte:

- per entendre l'estat funcional actual: `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- per veure l'historial ampli anterior: `docs/archive/changelog/CHANGELOG-pre-2026-03-08.md`
- per veure logs de desplegament: `docs/DEPLOY-LOG.md`

## Resum dels canvis recents

### 2026-07-21

- SEO i claredat pública: les novetats tenen una URL oficial inequívoca (`/ca/novetats` i `/es/novetats`), les rutes antigues o internes hi redirigeixen permanentment i el llistat i el detall reforcen títols, copy, navegació i dades estructurades per a cercadors.
- comunicació de producte: les novetats setmanals passen a explicar què pot fer l’usuari, quin benefici obté i on trobar-ho; quan hi ha una ruta segura, el detall intern ofereix accions directes dins de Summa.
- web públic: la portada mostra les dues novetats més recents amb fallback segur i cada detall incorpora una crida clara a demo i funcionalitats.
- novetats de producte: el generador setmanal reconeix els canvis reals de contactes, invitacions, bot d’ajuda i importació bancària sense dependre d’una sessió web.
- monitoratge: les fallades del pipeline s’enregistren com una incidència crítica al sistema existent d’alertes i una execució posterior correcta la resol automàticament.
- recuperació: publicats i verificats els payloads bilingües CA/ES de les setmanes 06–12/07 i 13–19/07.
- desplegament de Functions: el build elimina sortides antigues i comprova que el paquet carrega exactament l’índex compilat que Firebase desplegarà.

### 2026-07-18

- bot d'ajuda: la resposta segueix l'idioma real de cada pregunta en català o castellà, independentment de l'idioma configurat a la interfície, i localitza també les rutes de navegació.
- bot d'ajuda: el context i els registres es vinculen a l'organització visible a la URL, amb validació server-side de l'slug i la membresia; ja no depenen de l'organització legacy del perfil.
- bot d'ajuda: ampliada la cobertura natural de quotes, remeses, despeses fora de banc, permisos de només lectura, diverses organitzacions, mòbil, lentitud, contacte d'empresa, Model 347 i consultes fiscals amb límits segurs.
- qualitat: afegit un gate adversarial de 100 formulacions naturals CA/ES, proves de resolució d'organització i validació real —sense exposar secrets— de la credencial permanent QA guardada al Keychain; el mapa mínim queda en 30/30 fluxos directes.
- operativa: canvis preparats i validats en una branca aïllada; aquest paquet no autoritza cap desplegament ni es barreja amb el desplegament SEO pendent.

### 2026-07-08

- documentació per usuari: els proveïdors es poden guardar sense NIF/CIF quan encara no es disposa de la dada fiscal; el nom continua sent obligatori.
- API/integracions: `POST /api/contacts/import` saneja payloads de contactes abans d'escriure, elimina `undefined` niats, preserva camps d'arxivat i retorna error controlat si falla el batch.
- codi intern: `supplier-manager.tsx` queda alineat amb el flux d'update via API i el sanejament queda cobert per `src/lib/__tests__/contacts-import-payload.test.ts`.

### 2026-06-17

- documentació per usuari: el mòdul de projectes passa a permetre diversos finançadors dins del mateix projecte, amb capa opcional de fonts de finançament, distribució de pressupost i repartiment de despeses imputades.
- documentació per usuari: la pantalla de pressupost del projecte incorpora pestanyes de seguiment, despeses/imputacions i pressupost per visualitzar desviacions, imports rebuts i repartiments per finançador.
- documentació per usuari: la justificació econòmica del projecte afegeix export específic multi-finançador amb resum per partida i finançador, més detall de distribució per despesa.
- codi intern: el càlcul FX de despeses off-bank respecta millor els tipus de canvi manuals, inclosos valors legacy invertits quan hi ha evidència suficient, i evita recalcular imports ja fixats manualment.

### 2026-06-10

- API/integracions: l'obertura de documents d'organització i de moviments passa per rutes server-side que reemeten una URL signada nova quan hi ha `storagePath`, evitant dependre d'enllaços caducats en justificants i adjunts antics.
- codi intern: en desvincular el document principal d'un moviment, el camp legacy ja no ressuscita la mateixa URL esborrada; si queden més comprovants, el següent passa a ser el principal.

### 2026-06-09

- documentació per usuari: els moviments accepten també extractes bancaris en `.xls`, a més de `.xlsx` i `.csv`, sense canviar el flux d'importació.
- documentació per usuari: els documents d'un moviment passen a gestionar-se com a llista de comprovants, amb document principal i obertura en pestanya nova per no sortir de Summa Social.
- codi intern: l'export de justificació de projectes comparteix una sola base d'ordenació entre Excel, ZIP i `manifest.csv`, i tracta múltiples comprovants per despesa amb més robustesa.
- operativa: afegida evidència QA de documents Baruma a `docs/QA/2026-06-09-baruma-documents-moviments-smoke.md`.

### 2026-06-03

- Moviments: el llistat actualitza automàticament els canvis dins la finestra activa de consulta, com documents adjunts, devolucions assignades o remeses processades/desfetes, sense alterar fiscalitat ni model de dades.

### 2026-06-02

- remeses SEPA pain.008: hotfix del rollback d'**Anul·lar i regenerar** perquè també reconegui contactes amb `sepaPain008LastRunId` apuntant a registres legacy `sepaPain008Runs`, quan aquests tenen `collectionRunId` cap a la remesa anul·lada.
- operativa: preparada eina puntual de reparació en `dry-run` per als contactes afectats de la remesa de juny; la reparació real exigeix autorització explícita i no s'executa dins del deploy.

### 2026-05-12

- novetats de producte: corregit el pipeline setmanal perquè la funció programada publiqui via canal server-to-server amb secret, generació editorial determinista CA/ES, filtre de commits interns i verificació post-publicació abans de donar la peça per bona.
- operativa: deploy publicat pel ritual intern; App Hosting passa de `studio-build-2026-05-12-004` a `studio-build-2026-05-12-006`, SHA publicat `a40a49027`, sense publicació manual de cap novetat pendent.
- fiscalitat/permisos: certificats de donació amb API server-side acotada governada per `fiscal.certificats.generar`, sense requerir `moviments.read` ni exposar ledger general.
- API/integracions: afegit pilot controlat `pending_documents.link` per vincular un `pendingDocument` existent amb un moviment concret, amb hash, import/data esperats, scope dedicat i auditoria.
- MCP Summa Agent: nova eina privada `link_pending_document_to_transaction`; no toca imports, dates, categories, fiscalitat ni remeses, i bloqueja moviments que ja tenen document.

### 2026-04-23

- seguretat: lot de 6 fixes d'autoritzacio i aillament desplegat i validat en produccio
- seguretat: blindatge cross-org a `saved-run` i `relink-document`, gate `SuperAdmin` a `danger-zone`, gate admin-only a `bank-accounts/archive`, binding d'email a `invitations/accept` i enforcement de `moviments.editar` a `firestore.rules`
- operativa: verificacio real postdeploy completada amb respostes esperades `403`/`permission-denied` per als 6 casos

### 2026-04-19

- bot d'ajuda: queda integrat i publicat com a funcionalitat viva de producte dins del dashboard
- bot d'ajuda: benchmark top-100 consolidat amb gate `100/100` i smoke real a produccio superat a `baruma` amb `10/10` consultes resoltes de forma util
- operativa: la validacio rellevant del bot passa a ser resposta util a dubtes reals en prod, no nomes cobertura de benchmark o deploy verd
- Stripe/imputacio: l'anti-duplicacio passa a ser forta per payout complet; si qualsevol `stripePaymentId` del payout ja existeix actiu, es rebutja tota la reimputacio i cal fer `Desfer imputacio Stripe` del moviment original
- Stripe/imputacio: no s'accepten imputacions parcials d'un payout i `stripe_adjustment` queda reservat nomes a diferencies reals entre banc i net calculat
- Stripe/API: la llista de payouts paid pagina mes enlla de la primera pagina i el flux actual rebutja explicitament monedes de 3 decimals

### 2026-04-17

- producte: `Imputar Stripe` prioritza `Importar des de Stripe` des d'un abonament bancari; el selector mostra payouts recents en estat `paid` i el CSV/manual queda com a via secundaria
- producte: la imputacio de Stripe escriu a `donations`, no crea filles noves a `transactions`, manté net el ledger de `Moviments` i suporta `undo`
- codi intern: fix critic a `src/lib/stripe/payout-api.ts` per acceptar `balance_transaction.type = payment` quan `reporting_category = charge`
- operativa: App Hosting necessita `STRIPE_SECRET_KEY` declarada i accessible pel backend per activar `/api/stripe/payouts` i `/api/stripe/payout/[payoutId]`
- abast explicitament fora d'aquesta iteracio: auto-suggerir el payout correcte i model de credencial per entitat

### 2026-04-16

- API/integracions: la private integration API v1 queda consolidada i congelada amb abast tancat a `contacts.read`, `transactions.read` i `pending_documents.write`
- API/integracions: el contracte operatiu de v1 queda limitat a `GET /api/integrations/private/contacts/search`, `GET /api/integrations/private/transactions/search` i `POST /api/integrations/private/pending-documents/upload`, sense mes escriptures ni acces al ledger o a fiscalitat
- operativa: validacio real feta en produccio amb `baruma-admin-agent` i `flores-admin-agent`, amb idempotencia i aillament per org validats i latencies orientatives dins d'un rang operable
- operativa: tokens temporals de validacio revocats i artefactes de smoke eliminats despres de la prova

### 2026-04-14

- codi intern: nou panell d'`/admin` integrant mòduls de Growth i Editorial (Control Tower, cues de leads, drafts de blog i hub de contingut), amb noves capes de dades i hooks de suport
- codi intern: el flux de Moviments identifica ingressos elegibles com a donació i permet marcar-los com a donació des de la taula per evitar classificacions ambigües
- API/integracions: el read model d'analítica queda consolidat sota `GET /api/dashboard/*` (balance, monthly-evolution, income-composition, expense-by-category) per eliminar 404 de producció i mantenir contracte únic de dashboard
- API/integracions: afegida ruta tècnica `GET /api/dashboard/ping-new-route` per diagnòstic ràpid de resolució de rutes en entorns productius
- documentació per usuari: completades claus i18n de l'entorn admin (CA/ES/FR/PT) perquè el nou bloc de gestió de contingut i growth mostri copy coherent
- operativa: el check de documentació en pre-commit deixa de bloquejar commits funcionals fora d'abast docs; es reforça també el ritual de deploy exigint verificació de rollout real d'App Hosting

### 2026-03-26

- novetats de producte: web públic més descobrible (enllaç visible a home/header), sitemap amb rutes de detall i publicació/despublicació server-to-server més robusta
- mòdul projectes: les despeses bancàries negatives sense categoria entren al feed com "Categoria pendent" i queden bloquejades per assignació fins recategoritzar
- bot d'ajuda: ampliada cobertura operativa amb noves guies i millor desambiguació/retrieval
- operativa App Hosting: afegit secret `PRODUCT_UPDATES_PUBLISH_SECRET` per al flux oficial `POST /api/product-updates/publish`

### 2026-03-27

- API/integracions: `POST /api/product-updates/publish` admet `locale` base (`ca|es`), `locales.es` opcional i auto-genera variant castellana quan la base és `ca`; el write públic persisteix `web.locale` i `web.locales.es` per servir copy per idioma
- codi intern: nova capa `src/lib/product-updates/localized.ts` per resoldre copy efectiva d'app i web; FR/PT reutilitzen variant ES quan existeix; cobertura de tests ampliada per publicació i lectura localitzada
- documentació per usuari: web pública de novetats (home, llistat i detall) mostra contingut per idioma i elimina blocs redundants de copy per deixar context més net
- operativa: home/llistat/detall de novetats públiques passen a `dynamic = 'force-dynamic'` per evitar HTML congelat després de publish

### 2026-03-17

- Stripe deixa de dividir remeses: nou flux d'imputació sobre abonament bancari amb persistència a `donations`, anti-duplicació per `stripePaymentId` i undo per `parentTransactionId`
- fitxa del donant: les donacions Stripe imputades es llegeixen des de `donations` sense contaminar el ledger visual ni duplicar la lectura legacy
- fiscalitat: informes, certificats i Model 182 incorporen `donations` com a font fiscal nova, exclouen `stripe_adjustment` i eviten doble còmput amb `transactions`
- infra requerida: nou índex compost de `contacts` per `type ASC` + `name ASC`

### 2026-03-16

- importador Stripe: suport per `paid`/`Paid`, parsing d'imports amb coma decimal, files sense `Transfer` ignorades fins que existeixi payout i detecció bancària ampliada amb patrons reals de Stripe

### 2026-03-12

- invariant documental de remeses IN: `parentTransactionId` canònic, `remittanceId` només metadada, checks sobre filles actives reals

### 2026-02-25

- alineació del document mestre amb el contracte real d'import bancari
- correcció del dedupe fort sense fallback
- model de permisos alineat amb `capabilities`

### 2026-02-14

- millora de la capa editorial `guides.*` i de l'assistent d'ajuda
- redisseny de Torre de Control a `/admin`
- correccions operatives en resums i bypass SuperAdmin

### 2026-02-12

- SEPA pain.008 amb periodicitat intel·ligent
- millores d'UI i selecció forçada amb revisió
- suggeriments de renom per documents

### 2026-02-11

- persona de contacte per empreses a Donants
- nous filtres al dashboard de Donants
- accés operatiu unificat i ajustos a Firestore Rules

### 2026-02-10

- helper compartit `admin-sdk`
- pre-selecció SEPA per periodicitat
- gate fort d'i18n i health checks nous

### 2026-01-15

- desactivació dels backups al núvol com a funcionalitat estàndard
- consolidació del backup local com a mecanisme actiu

## Nota

Aquest resum és intencionalment curt.

Quan un canvi quedi consolidat al document mestre, aquest fitxer només n'ha de conservar la traça històrica útil, no la descripció exhaustiva.
