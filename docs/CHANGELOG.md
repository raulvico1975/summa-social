# CHANGELOG - Summa Social

Historial de canvis del projecte, ordenat de més recent a més antic.

---

## [1.41.0] - 2026-02-11

### Donants: filtres per Tipus i Modalitat

- Filtres per Tipus (Particular / Empresa) i Modalitat (Puntual / Soci) al dashboard de donants
- Lògica AND amb tots els filtres existents (estat, cerca, incomplets, devolucions)
- Comptadors visibles per cada opció de filtre
- i18n complet (ca, es, fr)

---

## [1.40.0] - 2026-02-10

### Admin SDK Compartit + Registre via API

- **Helper centralitzat** `src/lib/api/admin-sdk.ts`: singleton cached amb `getAdminApp()`, `getAdminDb()`, `getAdminAuth()`, `verifyIdToken()`, `validateUserMembership()`, `BATCH_SIZE`
- ~500 línies de codi duplicat eliminades de 6 rutes API existents
- **Noves rutes API per registre:**
  - `POST /api/invitations/resolve` — llegeix invitació per codi (Admin SDK)
  - `POST /api/invitations/accept` — crea membre + accepta invitació (Admin SDK)
- Resolució del bug de registre on les Firestore Rules bloquejaven l'escriptura del document `members/{uid}` per a usuaris acabats de crear

### SEPA pain.008 — Pre-selecció automàtica per periodicitat

- **Pre-selecció automàtica** de donants al wizard SEPA basada en períodes naturals del calendari
- Nou mòdul `src/lib/sepa/donor-collection-status.ts` amb `isDueForCollection()` que determina si un donant "toca cobrar" segons la seva periodicitat i `lastSepaRunDate`
- Períodes naturals: mes, trimestre (Q1-Q4), semestre (H1-H2), any
- Eliminat el concepte "overdue" (vençut) — simplificació: si no s'ha cobrat al període actual, es marca

### Dinàmica de Donants — Redisseny complet

- **5 blocs uniformes:** Altes, Baixes, Aportació a l'alça, Aportació a la baixa, Top 15
- **Separació PF/PJ:** Top 15 mostra dues llistes (Persones Físiques / Persones Jurídiques)
- Detecció de baixes (donants amb històric previ sense moviments al període)
- Periodicitat: mostra "sense periodicitat" quan null, persisteix monthly explícitament

### i18n — Gate pre-commit + Dashboard/SEPA traduïbles

- **Gate hard-block:** Script `validate-tr-keys-exist-in-ca.mjs` bloqueja commits si falten claus `tr()` a `ca.json`
- Integrat a `.husky/pre-commit` i `scripts/verify-local.sh`
- Dashboard migrat a `tr()` complet (31 claus noves, suport PT)
- Components SEPA wizard migrats a `tr()` (12 claus noves)
- Strings residuals del splitter de remeses i SEPA traduïts
- Merge Storage + local corregit: fallback correcte quan clau local nova no existeix a Storage

### Health Check — Blocs K i L

- **Bloc K:** `checkOrphanRemittances()` — fills de remesa amb `parentTransactionId` inexistent
- **Bloc L:** `checkOrphanExpenseLinks()` — expenseLinks amb `txId` inexistent
- K integrat al dashboard de health; L exportat com a funció independent

### UI — SafeSelect guard

- Nou helper `safeSelectOptions()` a `src/lib/ui/safe-select-options.ts`
- Filtra valors invàlids (`""`, null, undefined) abans de renderitzar `Select.Item` (Radix UI)
- Aplicat a: donor-importer, donor-manager, employee-manager, supplier-manager, transactions-table
- Fix periodicitat quota: evita `Select.Item` amb valor buit

### Higiene

- Neteja massiva de `console.log` en producció (~336 línies eliminades)
- Eliminació de debug logs temporals del registre
- Documentació evidència smoke tests cross-org Storage

**Fitxers principals modificats:**
- `src/lib/api/admin-sdk.ts` (NOU)
- `src/app/api/invitations/resolve/route.ts` (NOU)
- `src/app/api/invitations/accept/route.ts` (NOU)
- `src/lib/sepa/donor-collection-status.ts` (NOU)
- `src/lib/ui/safe-select-options.ts` (NOU)
- `src/lib/donor-dynamics.ts` (redisseny)
- `src/components/donor-manager.tsx` (dinàmica + periodicitat)
- `src/components/sepa-collection/SepaCollectionWizard.tsx` (pre-selecció)
- `src/components/sepa-collection/StepSelection.tsx` (pre-selecció)
- `src/i18n/json-runtime.ts` (merge fix)
- `src/app/registre/page.tsx` (migració Admin API)

---

## [1.33.0] - 2026-02-06

### Documents Pendents — Relink i Robustesa

- **Acció "Re-vincular document"** per documents que havien perdut l'storage path (`relink-document`)
- Upload context diagnostic guard per diagnòstic d'errors de pujada
- Gestió idempotent de documents no existents a Firestore
- Gestió de transaccions orfenes en `deleteMatchedPendingDocument`
- Bloqueig eliminació de document si prové de pendent + permetre desfer conciliació
- Hard reset d'estat drag/upload amb force remount de la llista
- Comptadors per tab a la pantalla de pendents + etiquetes de categoria i18n

### Mòdul Projectes — Hard Delete Off-Bank

- **Eliminació permanent** de despeses off-bank de forma atòmica (batch Firestore ≤50 ops + cleanup Storage)
- Confirmació destructiva amb `AlertDialog` abans d'eliminar

### Sistema FX Complet (Mòdul Projectes)

- **Sub-col·lecció `fxTransfers`** per projecte: registre de transferències EUR→moneda local
- **TC ponderat** calculat automàticament (`Σ eurSent / Σ localReceived`)
- **Fallback chain** per tipus de canvi: TC manual despesa → TC ponderat projecte → project.fxRate → null
- **Conversió EUR en moment d'assignació** amb prioritat TC manual i FX split proporcional
- Bloqueig d'assignació per despeses off-bank amb `pendingConversion` (falta TC)
- Modal de creació/edició off-bank simplificat amb camps FX nous (migrat de deprecated)
- **Doble badge** a llistat despeses: estat (assignada/pendent) + desglossament (moneda/EUR)
- Popover millorat amb detall FX a cada despesa
- UI fxTransfers integrada a la pantalla de pressupost del projecte

**Fitxers principals modificats:**
- `src/hooks/use-project-module.ts` (hooks fxTransfers, hard delete, TC ponderat)
- `src/lib/project-module-types.ts` (FxTransfer interface, camps FX)
- `src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx` (llistat + assignació)
- `src/components/project-module/assignment-editor.tsx` (FX split + conversió)
- `src/components/project-module/add-off-bank-expense-modal.tsx` (modal simplificat)
- `src/app/[orgSlug]/dashboard/project-module/projects/[projectId]/budget/page.tsx` (UI fxTransfers)

---

## [1.31.0] - 2026-01-15

### Desactivació Backups al Núvol

Els backups al núvol (Dropbox / Google Drive) han estat **desactivats per defecte**.

**Raó:**
- Funcionalitat mai verificada en producció
- Complexitat operativa sense valor afegit demostrat
- El backup local cobreix les necessitats actuals

**Canvis:**
- UI de configuració de backups eliminada de `/{orgSlug}/dashboard/configuracion`
- Banner d'avís de backup eliminat del Dashboard
- Rutes OAuth retornen 404
- Scheduler `runWeeklyBackup` fa early-return
- Documentació actualitzada (secció 3.10.8)

**Mecanisme oficial de backup:** Backup local des de `/admin` (SuperAdmin only)

**Com reactivar:** Canviar constants `CLOUD_BACKUPS_ENABLED` a `true` en els fitxers documentats a la secció 3.10.8.

**Fitxers modificats:**
- `src/components/backups-settings.tsx`
- `src/components/backup-alert-banner.tsx` (no renderitzat)
- `src/app/[orgSlug]/dashboard/page.tsx`
- `functions/src/backups/runWeeklyBackup.ts`
- `functions/src/backups/runBackupForOrg.ts`
- `src/app/api/integrations/backup/*/route.ts` (5 fitxers)

---

## [1.28.1] - 2026-01-08

### P0 Fix: Matching de Remeses Robust

**Problema detectat:**
El motor de matching de remeses IN (donants) tenia tres defectes crítics:
1. Contactes arxivats/eliminats apareixien com a match i es recreaven incorrectament
2. Noms purament numèrics (referències bancàries) generaven falsos positius
3. No hi havia traçabilitat de com s'havia fet el match

**Solució implementada:**

#### Filtratge centralitzat
- Nou helper `filterActiveContacts()` a `src/lib/contacts/filterActiveContacts.ts`
- Exclou: `archivedAt`, `deletedAt`, `status === 'inactive'`
- Aplicat a `transactions-table.tsx` i `remittance-splitter.tsx`

#### Bloqueig de noms numèrics
- Nova funció `isNumericLikeName()`
- El matching per nom s'omet si el valor és purament numèric
- Evita falsos positius amb referències bancàries

#### Traçabilitat del match
- Nous camps: `matchMethod` (`iban | taxId | name | null`) i `matchValueMasked`
- Badge visual a la UI: "IBAN ···1234", "DNI ···78Z", "Nom Maria Garcia"
- Permet auditar qualsevol remesa a posteriori

**Fitxers modificats:**
- `src/lib/contacts/filterActiveContacts.ts` (NOU)
- `src/components/transactions-table.tsx`
- `src/components/remittance-splitter.tsx`

**Impacte:**
- Elimina duplicats fantasma
- Evita recrear donants incorrectes
- Permet auditoria completa del matching
- Compatible amb neteges "començar de zero"

---

## [1.28.0] - 2026-01-08

### SEPA Direct Debit pain.008 CORE

Nova funcionalitat per generar fitxers SEPA de cobrament directe (pain.008.001.08).

**Funcionalitats:**
- Wizard de 3 passos: Config → Selecció → Revisió
- Generació XML pain.008.001.08 ISO 20022
- Separació automàtica per SeqTp (FRST/RCUR)
- EndToEndId determinista (UMR-DATE)
- Validació IBAN i Creditor ID
- Persistència de runs a Firestore

**Fitxers nous:**
- `src/lib/sepa/pain008/generate-pain008.ts`
- `src/lib/sepa/pain008/index.ts`
- `src/components/sepa-collection/SepaCollectionWizard.tsx`
- `src/components/sepa-collection/StepConfig.tsx`
- `src/components/sepa-collection/StepSelection.tsx`
- `src/components/sepa-collection/StepReview.tsx`
- `tests/sepa-pain008/generate-pain008.test.ts`

**Tipus afegits a data.ts:**
- `SepaMandate`
- `SepaScheme`
- `SepaSequenceType`
- `SepaCollectionItem`
- `SepaCollectionRun`

---

## [1.27.x] - Anteriors

Consultar commits anteriors al repositori per a l'historial complet.
