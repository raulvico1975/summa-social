# PERFORMANCE DASHBOARD SPLIT v1

## Context

- Data: 2026-02-17
- Rutes objectiu:
  - `/[orgSlug]/dashboard/informes`
  - `/[orgSlug]/dashboard/movimientos`
- Estratègia: lazy-load de llibreries d'export (`xlsx`, `jspdf`) només quan s'executa l'acció; code-splitting de components no crítics d'export.
- Guardrails complerts: sense canvis de lògica de negoci, sense canvis de dades, sense dependències noves.

## Abans vs Després

Font de mesura:
- Abans: `tmp/dashboard-split-baseline-build.log`
- Després: `tmp/dashboard-split-after-build.log`

| Ruta | First Load JS abans | First Load JS després | Reducció |
|---|---:|---:|---:|
| `/[orgSlug]/dashboard/informes` | 707 kB | 411 kB | -41.87% |
| `/[orgSlug]/dashboard/movimientos` | 722 kB | 544 kB | -24.65% |

## Imports convertits a lazy

### Llibreries pesades carregades sota demanda

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/donations-report-generator.tsx`
  - `import('xlsx')` dins `loadXlsx()`
  - ús lazy a `handleExportExcel()`
  - ús lazy a `handleExportGestoria()`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/transaction-importer.tsx`
  - `import('xlsx')` dins `parseXlsx()`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/remittance-splitter.tsx`
  - `import('xlsx')` dins `parseExcelFile()`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/return-importer/useReturnImporter.ts`
  - `import('xlsx')` dins `parseFiles()` (només per fitxers Excel)

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/transactions-table.tsx`
  - `import('xlsx')` dins `handleExportFilteredTransactions()`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/donation-certificate-generator.tsx`
  - `import('jspdf')` dins `loadJsPdf()`
  - ús lazy en generació de PDF: preview, descàrrega i enviament email

### Components separats amb `next/dynamic`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/app/[orgSlug]/dashboard/informes/page.tsx`
  - `DonationsReportGenerator`
  - `SuppliersReportGenerator`
  - `DonationCertificateGenerator`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/app/[orgSlug]/dashboard/movimientos/page.tsx`
  - `TransactionImporter`

- `/Users/raulvico/Documents/summa-social-worktrees/codex-dashboard-export-split-v1/src/components/transactions-table.tsx`
  - `RemittanceSplitter`
  - `ReturnImporter`
  - `ReturnImporter` només es renderitza quan `isReturnImporterOpen === true`

## Verificació d'impacte en chunks

- Anàlisi de sourcemaps per rutes objectiu (després de canvis):
  - `/[orgSlug]/dashboard/informes`: cap hit directe de `xlsx`, `jspdf`, `html2canvas`, `canvg` als chunks inicials.
  - `/[orgSlug]/dashboard/movimientos`: cap hit directe de `xlsx`, `jspdf`, `html2canvas`, `canvg` als chunks inicials.

- Chunk màxim actual: `static/chunks/9318-eb309d2d943949b5.js` (`465.88 kB`)
- Confirmació: cap chunk > `1 MB`.

## Validació

- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run i18n:check` ✅
