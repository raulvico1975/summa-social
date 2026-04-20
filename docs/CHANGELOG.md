# CHANGELOG — resum recent

Aquest fitxer ja no pretén duplicar el document mestre.

Ús correcte:

- per entendre l'estat funcional actual: `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- per veure l'historial ampli anterior: `docs/archive/changelog/CHANGELOG-pre-2026-03-08.md`
- per veure logs de desplegament: `docs/DEPLOY-LOG.md`

## Resum dels canvis recents

### 2026-04-19

- Stripe/imputacio: l'anti-duplicacio passa a ser forta per payout complet; si qualsevol `stripePaymentId` del payout ja existeix actiu, es rebutja tota la reimputacio i cal fer `Desfer imputacio Stripe` del moviment original
- Stripe/imputacio: no s'accepten imputacions parcials d'un payout i `stripe_adjustment` queda reservat nomes a diferencies reals entre banc i net calculat
- Stripe/API: la llista de payouts paid pagina mes enlla de la primera pagina i el flux actual rebutja explicitament monedes de 3 decimals
- codi intern: la categoritzacio automatica endureix regles deterministes per descripcio (ingressos i despeses) i saneja millor la sortida final abans de fixar categoria/confianca
- API/integracions: `POST /api/ai/categorize-transaction` reforca validacio d'entrada i classifica errors d'IA en codis operables (`INVALID_INPUT`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `TRANSIENT`, `AI_ERROR`)
- codi intern: el bot d'ajuda amplia sinonims/normalitzacio, deteccio de casos especifics i heuristiques de recuperacio per reduir `fallback` i millorar match operatiu
- operativa: s'afegeix benchmark executable `support:eval:top100` per auditar la qualitat del retrieval del bot sobre el lot de 100 preguntes prioritaries
- documentacio per usuari: es separa manteniment editorial entre manuals llargs (`docs/manual-usuari-*`) i runtime (`public/docs/manual-usuari-*`), amb contracte de sincronitzacio explicit a `src/help/README.md`

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
