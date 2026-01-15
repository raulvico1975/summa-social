# CHANGELOG - Summa Social

Historial de canvis del projecte, ordenat de més recent a més antic.

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
