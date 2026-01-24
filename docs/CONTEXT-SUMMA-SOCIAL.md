# Context Complet: SUMMA SOCIAL — Aplicació Sencera

**Document per a ChatGPT — Versió actualitzada: 21 Gener 2026**

> **NOTA:** Aquest document cobreix TOTA l'aplicació Summa Social, no només el mòdul de projectes.

---

## 1. QUÈ ÉS SUMMA SOCIAL

Summa Social és una aplicació de gestió econòmica i fiscal per a entitats petites i mitjanes d'Espanya.

**NO és un ERP genèric ni un gestor de projectes.**

El producte se centra en:
- Conciliació bancària real
- Control de saldos i desquadraments
- Classificació determinista de moviments
- Fiscalitat (Model 182, 347, certificats de donació)
- Exports nets per a gestories

### Stack Tecnològic
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Firebase (Firestore, Auth, Storage, Functions)
- **Hosting:** Firebase Hosting / App Hosting

### Canvis importants Next.js 15
- `searchParams` a les pàgines és ara un `Promise` (cal `await`)
- Tipatge: `searchParams?: Promise<Record<string, string | string[] | undefined>>`

---

## 2. ESTRUCTURA DE CARPETES RELLEVANT

```
src/
├── app/[orgSlug]/dashboard/
│   ├── movimientos/
│   │   ├── page.tsx                    # Pàgina de moviments bancaris
│   │   ├── pendents/page.tsx           # Moviments pendents de classificar
│   │   └── liquidacions/page.tsx       # Liquidacions pendents
│   ├── informes/
│   │   ├── page.tsx                    # Model 182, 347
│   │   └── certificats/page.tsx        # Certificats de donació (PDF)
│   ├── guides/
│   │   └── page.tsx                    # ⭐ HUB DE GUIES (v1.27)
│   ├── quick-expense/
│   │   └── page.tsx                    # Captura ràpida despeses terreny
│   ├── super-admin/
│   │   └── page.tsx                    # Panell SuperAdmin
│   ├── manual/
│   │   └── page.tsx                    # Manual d'usuari integrat
│   ├── donants/page.tsx                # Gestió donants
│   ├── proveidors/page.tsx             # Gestió proveïdors
│   ├── treballadors/page.tsx           # Gestió treballadors
│   ├── projectes/page.tsx              # Projectes simplificat (no mòdul)
│   ├── configuracion/page.tsx          # Configuració organització
│   └── project-module/
│       ├── page.tsx                    # Índex del mòdul projectes
│       ├── admin/page.tsx              # Administració del mòdul (cleanup, etc.)
│       ├── quick-expense/page.tsx      # Captura ràpida dins mòdul
│       ├── expenses/
│       │   ├── page.tsx                # ⭐ LLISTAT DE DESPESES (fitxer principal)
│       │   ├── [txId]/page.tsx         # Detall/edició d'una despesa
│       │   └── capture/page.tsx        # Captura ràpida despesa
│       └── projects/
│           ├── page.tsx                # Llistat projectes
│           ├── new/page.tsx            # Crear projecte
│           └── [projectId]/
│               ├── edit/page.tsx       # Editar projecte
│               └── budget/
│                   └── page.tsx        # Gestió econòmica d'un projecte
│
├── components/
│   ├── project-module/
│   │   ├── add-off-bank-expense-modal.tsx  # Modal crear/editar despeses terreny
│   │   ├── assignment-editor.tsx       # Editor d'assignacions split
│   │   └── expense-attachments-dropzone.tsx
│   ├── transactions/components/
│   │   └── TransactionsFilters.tsx     # Filtres de la pàgina moviments (referència)
│   └── help/
│       └── HelpSheet.tsx               # ⭐ Hub de guies (sheet lateral)
│
├── hooks/
│   └── use-project-module.ts           # ⭐ HOOKS PRINCIPALS (useUnifiedExpenseFeed, etc.)
│
├── i18n/
│   └── locales/
│       ├── ca.json                     # Inclou guides.search.* (sinònims, stopwords)
│       ├── es.json
│       └── fr.json
│
└── lib/
    └── project-module-types.ts         # ⭐ TIPUS TYPESCRIPT
```

---

## 3. MODEL DE DADES FIRESTORE

### 3.1 Despeses Bancàries (read-only feed)
**Path:** `/organizations/{orgId}/exports/projectExpenses/items/{txId}`

```typescript
interface ProjectExpenseExport {
  id: string;
  orgId: string;
  schemaVersion: 1;
  source: 'summa';
  date: string; // YYYY-MM-DD
  amountEUR: number; // negatiu = despesa
  currency: 'EUR';
  categoryId: string | null;
  categoryName: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  description: string | null;
  documents: Array<{
    source: 'summa';
    storagePath: string | null;
    fileUrl: string | null;
    name: string | null;
  }>;
  isEligibleForProjects: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}
```

### 3.2 Despeses Off-Bank (Terreny)
**Path:** `/organizations/{orgId}/projectModule/_/offBankExpenses/{expenseId}`

```typescript
interface OffBankExpense {
  id: string;
  orgId: string;
  source: 'offBank';
  date: string; // YYYY-MM-DD
  concept: string;
  amountEUR: number; // positiu (despesa) - sempre en EUR

  // Moneda original i conversió (opcional)
  currency?: string | null; // ex: "XOF", "EUR"
  amountOriginal?: number | null; // import en moneda local
  fxRateUsed?: number | null; // si l'usuari sobrescriu el del projecte

  counterpartyName: string | null;
  categoryName: string | null; // text lliure
  documentUrl: string | null; // DEPRECATED: usar attachments[]

  // Múltiples comprovants (NOU)
  attachments?: OffBankAttachment[] | null;

  // Estat de revisió (NOU)
  needsReview?: boolean | null; // true si ve de terreny i cal revisar

  // Dades de justificació (opcional)
  invoiceNumber?: string | null;
  issuerTaxId?: string | null;
  invoiceDate?: string | null;
  paymentDate?: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface OffBankAttachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string; // YYYY-MM-DD
}
```

### 3.3 Assignacions de Despeses a Projectes
**Path:** `/organizations/{orgId}/projectModule/_/expenseLinks/{txId}`

```typescript
interface ExpenseLink {
  id: string; // = txId
  orgId: string;

  assignments: ExpenseAssignment[];
  projectIds: string[]; // per queries ràpides (array-contains)
  budgetLineIds?: string[]; // per queries per partida

  note: string | null;
  justification?: ExpenseJustification | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ExpenseAssignment {
  projectId: string;
  projectName: string; // denormalitzat
  amountEUR: number; // part assignada (amb signe -)
  budgetLineId?: string | null;
  budgetLineName?: string | null;
}
```

### 3.4 Projectes
**Path:** `/organizations/{orgId}/projectModule/_/projects/{projectId}`

```typescript
interface Project {
  id: string;
  orgId: string;
  name: string;
  code: string | null;
  status: 'active' | 'closed';
  budgetEUR: number | null;
  startDate: string | null;
  endDate: string | null;
  allowedDeviationPct: number; // default 10

  // Tipus de canvi per despeses offBank
  fxRate?: number | null;
  fxCurrency?: string | null; // ex: "XOF", "DOP"

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.5 Partides de Pressupost
**Path:** `/organizations/{orgId}/projectModule/_/projects/{projectId}/budgetLines/{lineId}`

```typescript
interface BudgetLine {
  id: string;
  name: string;
  code: string | null;
  budgetedAmountEUR: number;
  order: number | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 4. TIPUS UNIFICATS PER A LA UI

El llistat de despeses combina despeses bancàries i off-bank en un tipus unificat:

```typescript
type ExpenseSource = 'bank' | 'offBank';
type ExpenseStatus = 'unassigned' | 'assigned' | 'partial';

interface UnifiedExpense {
  txId: string; // bank: transactionId, offBank: "off_" + expenseId
  source: ExpenseSource;
  date: string;
  description: string | null;
  amountEUR: number; // sempre negatiu per consistència
  categoryName: string | null;
  counterpartyName: string | null;
  documentUrl: string | null;

  // Camps opcionals per offBank amb moneda estrangera
  currency?: string | null;
  amountOriginal?: number | null;
  fxRateUsed?: number | null;

  // Camps justificació
  invoiceNumber?: string | null;
  issuerTaxId?: string | null;
  invoiceDate?: string | null;
  paymentDate?: string | null;

  // Nous camps
  attachments?: OffBankAttachment[] | null;
  needsReview?: boolean | null;
}

interface UnifiedExpenseWithLink {
  expense: UnifiedExpense;
  link: ExpenseLink | null;
  status: ExpenseStatus;
  assignedAmount: number; // suma de tots els assignments
  remainingAmount: number; // diferència respecte amountEUR
}
```

**IMPORTANT - Conversió txId:**
- Despeses bancàries: `txId` = ID del document a Firestore
- Despeses off-bank: `txId` = `"off_" + expenseId`

---

## 5. HOOK PRINCIPAL: useUnifiedExpenseFeed()

**Ubicació:** `src/hooks/use-project-module.ts`

### 5.1 Interfície

```typescript
interface UseUnifiedExpenseFeedOptions {
  projectId?: string | null;
  budgetLineId?: string | null;
}

interface UseUnifiedExpenseFeedResult {
  expenses: UnifiedExpenseWithLink[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isFiltered: boolean;
  usedFallback: boolean;
}
```

### 5.2 Comportament

**Sense filtre (cas normal):**
1. Carrega despeses bancàries amb `where('isEligibleForProjects', '==', true)` + `where('deletedAt', '==', null)`
2. Carrega despeses off-bank
3. Mergeja i ordena per data desc
4. Per cada despesa, carrega el seu `expenseLink` corresponent
5. Calcula estat (assigned/partial/unassigned)

**Amb filtre (projectId o budgetLineId):**
1. Query als `expenseLinks` amb el filtre
2. Carrega les despeses corresponents als IDs trobats
3. NO té paginació (carrega tot)

### 5.3 Paginació

- `PAGE_SIZE = 50`
- Usa cursors (`lastBankDoc`, `lastOffBankDoc`) amb `startAfter`
- `hasMore` indica si hi ha més pàgines
- `loadMore()` carrega la següent pàgina
- La paginació es desactiva quan hi ha filtres actius

### 5.4 Codi Actual (extracte clau)

```typescript
// Carregar expenseLinks en paral·lel (optimitzat)
const linksMap = new Map<string, ExpenseLink>();
const linkDocs = await Promise.all(
  newExpenses.map((exp) => getDoc(doc(linksRef, exp.txId)))
);
for (const linkDoc of linkDocs) {
  if (linkDoc.exists()) {
    linksMap.set(linkDoc.id, { id: linkDoc.id, ...linkDoc.data() } as ExpenseLink);
  }
}

// Fallback per documentUrl en off-bank (NOU)
documentUrl: data.documentUrl ?? data.attachments?.[0]?.url ?? null,
```

---

## 6. PÀGINA PRINCIPAL: expenses/page.tsx

**Ubicació:** `src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx`

### 6.1 Característiques Principals

- **Cerca:** Camp de text per cercar per descripció, contrapart, categoria
- **Filtres ràpids:** Tots, Sense document, Sense categoria, No assignades, Terreny, Seu
- **Punt verd:** Indicador visual de document adjunt
- **Paginació:** Botó "Carregar més" quan hi ha més despeses
- **Assignació ràpida:** Popover per assignar al 100% a un projecte/partida
- **Assignació múltiple:** Modal per dividir entre diversos projectes
- **Selecció massiva:** Checkbox per assignar múltiples despeses de cop

### 6.2 Filtres Locals

```typescript
type ExpenseTableFilter =
  | 'all'
  | 'withDocument'
  | 'withoutDocument'
  | 'uncategorized'
  | 'noContact'
  | 'bank'
  | 'offBank'
  | 'assigned'
  | 'unassigned'
  | 'needsReview';

const [tableFilter, setTableFilter] = React.useState<ExpenseTableFilter>('all');
const [searchQuery, setSearchQuery] = React.useState('');
```

### 6.3 Filtratge Combinat (useMemo)

```typescript
const filteredExpenses = React.useMemo(() => {
  let result = expenses;

  // 1. Filtre per tableFilter
  if (tableFilter !== 'all') {
    result = result.filter(e => {
      const exp = e.expense;
      switch (tableFilter) {
        case 'needsReview': return exp.needsReview === true;
        case 'withDocument': return !!exp.documentUrl;
        case 'withoutDocument': return !exp.documentUrl;
        case 'uncategorized': return !exp.categoryName;
        case 'noContact': return !exp.counterpartyName;
        case 'bank': return exp.source === 'bank';
        case 'offBank': return exp.source === 'offBank';
        case 'assigned': return e.status === 'assigned';
        case 'unassigned': return e.status === 'unassigned';
        default: return true;
      }
    });
  }

  // 2. Filtre per searchQuery
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    result = result.filter(e => {
      const exp = e.expense;
      const searchableText = [
        exp.description,
        exp.counterpartyName,
        exp.categoryName,
        String(exp.amountEUR),
        exp.txId,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(query);
    });
  }

  return result;
}, [expenses, tableFilter, searchQuery]);
```

### 6.4 Estructura de la Taula

| Columna | Camp | Descripció |
|---------|------|------------|
| Checkbox | - | Selecció per assignació massiva |
| Font | `source` | Icona Landmark (bank) o Globe (offBank) |
| Doc | `documentUrl` | Punt verd si té document |
| Data | `date` | Format DD/MM/YYYY |
| Descripció | `description` | Text truncat |
| Categoria | `categoryName` | Traduïda si possible |
| Origen/Destinatari | `counterpartyName` | - |
| Import | `amountEUR` | Format EUR, vermell |
| Estat | `status` | Badge 0%, X%, 100% |
| Accions | - | Botons assignar/editar |

### 6.5 Botons Header (ordre actual)

```tsx
<div className="flex items-center gap-2">
  {/* 1. Botó principal - Afegir despesa */}
  <Button variant="default" size="sm" onClick={() => setAddOffBankOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Afegir despesa (contrapart)
  </Button>

  {/* 2. Link a projectes */}
  <Link href={buildUrl('/dashboard/project-module/projects')}>
    <Button variant="outline" size="sm">
      <FolderKanban className="h-4 w-4 mr-2" />
      Projectes
    </Button>
  </Link>

  {/* 3. Filtre pendents revisió */}
  <Button
    onClick={() => setTableFilter(tableFilter === 'needsReview' ? 'all' : 'needsReview')}
    variant={tableFilter === 'needsReview' ? 'default' : 'outline'}
    size="sm"
  >
    <AlertCircle className="h-4 w-4 mr-2" />
    {t.projectModule.pendingReview}
  </Button>
</div>
```

---

## 7. MODAL: OffBankExpenseModal

**Ubicació:** `src/components/project-module/add-off-bank-expense-modal.tsx`

### 7.1 Props

```typescript
interface OffBankExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode?: 'create' | 'edit';
  expenseId?: string;
  initialValues?: OffBankExpenseInitialValues;
  projectFxRate?: number | null;
  projectFxCurrency?: string | null;
  existingAssignments?: ExpenseAssignment[];
  organizationId: string;
  quickMode?: boolean;
}
```

### 7.2 Camps del Formulari

**Camps bàsics (grid 2 columnes):**
- Data (obligatori)
- Import EUR (obligatori, disabled si FX actiu)

**Toggle moneda estrangera (si projectFxRate definit):**
- Import original + Moneda (3 columnes)
- Override FX rate

**Camps text (full width):**
- Concepte (obligatori)

**Grid 2 columnes:**
- Origen/Destinatari
- Categoria

**Attachments:**
- Dropzone per pujar comprovants
- Múltiples fitxers permesos

**Collapsible - Dades justificació:**
- Núm. factura + NIF emissor
- Data factura + Data pagament

### 7.3 Hooks Usats

```typescript
const { save, isSaving } = useSaveOffBankExpense();
const { update, isUpdating } = useUpdateOffBankExpense();
const { save: saveExpenseLink } = useSaveExpenseLink();
```

### 7.4 Bug Fix Recent: documentUrl

Les despeses off-bank noves guarden els comprovants a `attachments[]`, no a `documentUrl`. El hook `useUnifiedExpenseFeed` fa fallback:

```typescript
documentUrl: data.documentUrl ?? data.attachments?.[0]?.url ?? null,
```

---

## 8. REFERÈNCIA: TransactionsFilters

**Ubicació:** `src/components/transactions/components/TransactionsFilters.tsx`

Aquest component és la **referència** per l'estil de filtres. La pàgina d'expenses ha replicat l'estructura però inline (sense component separat).

### 8.1 Estructura

```tsx
<div className="flex flex-col gap-3 w-full">
  {/* Cercador */}
  <div className="relative max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder="..." value={searchQuery} onChange={...} className="pl-9 pr-9" />
    {searchQuery && (
      <button onClick={() => onSearchChange('')} className="absolute right-3 ...">
        <X className="h-4 w-4" />
      </button>
    )}
  </div>

  {/* Filtres ràpids */}
  <div className="flex gap-2 items-center flex-wrap">
    <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm">
      Tots ({totalCount})
    </Button>
    {/* ... més filtres ... */}
  </div>
</div>
```

### 8.2 Tipus de Filtre (Moviments)

```typescript
type TableFilter =
  | 'all'
  | 'missing'           // Sense document
  | 'returns'           // Devolucions
  | 'pendingReturns'    // Devolucions pendents
  | 'uncategorized'     // Sense categoria
  | 'noContact';        // Sense contacte
```

---

## 9. ALTRES HOOKS RELLEVANTS

### 9.1 useSaveExpenseLink

```typescript
interface UseSaveExpenseLinkResult {
  save: (txId: string, assignments: ExpenseAssignment[], note: string | null, justification?: ExpenseJustification | null) => Promise<void>;
  remove: (txId: string) => Promise<void>;
  isSaving: boolean;
  error: Error | null;
}
```

### 9.2 useProjects

```typescript
interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Ús
const { projects, isLoading, error } = useProjects(true); // onlyActive
```

### 9.3 useProjectBudgetLines

```typescript
interface UseProjectBudgetLinesResult {
  budgetLines: BudgetLine[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Ús
const { budgetLines, isLoading } = useProjectBudgetLines(projectId);
```

---

## 10. CONVENCIONS I PATRONS

### 10.1 Imports

```typescript
// Hooks
import { useUnifiedExpenseFeed, useProjects, useSaveExpenseLink, useProjectBudgetLines } from '@/hooks/use-project-module';
import { useOrgUrl, useCurrentOrganization } from '@/hooks/organization-provider';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Icons (lucide-react)
import { Search, X, Plus, Circle, Landmark, Globe, AlertCircle, ChevronRight, FolderPlus } from 'lucide-react';
```

### 10.2 Format Dates

```typescript
import { formatDateDMY } from '@/lib/normalize';
// formatDateDMY('2024-12-24') => '24/12/2024'
```

### 10.3 Format Amounts

```typescript
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
```

### 10.4 Traduccions

```typescript
import { useTranslations } from '@/i18n';
const { t } = useTranslations();

// Ús
t.projectModule.noEligibleExpenses
t.projectModule.pendingReview
t.categories['transport'] // Tradueix categoria
```

### 10.5 Navegació

```typescript
const { buildUrl } = useOrgUrl();

// buildUrl('/dashboard/project-module/expenses')
// => '/flores-kiskeya/dashboard/project-module/expenses'
```

### 10.6 Tracking UX

```typescript
import { trackUX } from '@/lib/ux/trackUX';

trackUX('expenses.open', { filtered: isFiltered });
trackUX('expenses.offBank.edit.save', { expenseId });
```

---

## 11. CRITERIS DE CODI

### 11.1 Principis

- **Canvi mínim viable:** No afegir funcionalitats no sol·licitades
- **Sense sobreanginyeria:** Si una solució simple funciona, no complicar-la
- **Codi explícit:** Preferir codi llegible i previsible
- **Client-side filtering:** Els filtres locals es fan amb `useMemo`, no recarregant Firestore

### 11.2 Què NO Fer

- No refactoritzar codi "per millorar-lo"
- No afegir noves dependències sense permís
- No modificar estructures crítiques de Firestore
- No crear components nous si es pot reusar o fer inline

### 11.3 Estil Filtres Ràpids

```tsx
{/* Patró estàndard */}
<Button
  variant={filter === 'value' ? 'default' : 'outline'}
  size="sm"
  onClick={() => setFilter('value')}
>
  Text
</Button>
```

### 11.4 Punt Verd Document

```tsx
<TableCell className="text-center">
  {expense.documentUrl ? (
    <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 inline-block" />
  ) : (
    <Circle className="h-2.5 w-2.5 text-muted-foreground/30 inline-block" />
  )}
</TableCell>
```

---

## 12. CANVIS RECENTS

### 12.8 Hub de Guies (v1.27 - Gener 2026)
- **Ruta**: `/dashboard/guides`
- Centre d'autoajuda per usuaris amb guies procedimentals
- Cercador amb scoring determinista (sense IA):
  - Títol: +50 punts
  - Resum: +20 punts
  - Text card: +10 punts
  - Sinònim: +5 a +45 punts
- Diccionari de sinònims a `guides.search.syn.*` (permet cercar "no veig moviments" i trobar guies de "moviments")
- Fitxers clau:
  - `src/app/[orgSlug]/dashboard/guides/page.tsx`
  - `src/i18n/locales/*.json` (claus `guides.search.*`)
  - `scripts/i18n/validate-guides-translations.ts`

### 12.9 Patrons de Layout (v1.27)
- **Problema resolt**: Icones del header (ajuda, notificacions) desapareixien en pantalles estretes
- **Causa**: Contingut amb `min-width` fixa expandia el contenidor
- **Solució a `layout.tsx`**:
  ```tsx
  <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-x-hidden ...">
  ```
- Pattern header responsive: bloc esquerra degradable (`min-w-0 flex-1`), bloc dreta fix (`shrink-0`)

### 12.10 Next.js 15 Migration (v1.27)
- `searchParams` és ara `Promise` a les pàgines
- Afecta qualsevol `page.tsx` que usi searchParams
- Error típic: `TS2344: Type '{ searchParams: Record<...> }' does not satisfy the constraint 'PageProps'`

### 12.11 Guardrails de Remeses (v1.31 - Gener 2026)

**Problema resolt:** Les remeses es podien processar múltiples vegades, creant quotes duplicades amb impacte fiscal.

**Solució implementada:**

| Tipus | Guardrail | Comportament |
|-------|-----------|--------------|
| **Client (UI)** | Bloqueig si `isRemittance === true` | Missatge: "Desfés-la abans de tornar-la a processar" |
| **Servidor IN** | `409 REMITTANCE_ALREADY_PROCESSED` | Rebutja si ja processada |
| **Servidor OUT** | `409 REMITTANCE_ALREADY_PROCESSED` | Rebutja si ja processada (sense bypass) |

**Flux correcte:** Processar → Desfer → Reprocessar

**Fitxers clau:**
- `src/app/api/remittances/in/process/route.ts` — Guardrail servidor
- `src/app/api/remittances/in/undo/route.ts` — Desfer amb soft-delete
- `src/components/remittance-splitter.tsx` — Guardrail client

### 12.12 Sistema de Consistència de Remeses (v1.31 - Gener 2026)

**Endpoints nous:**
- `GET /api/remittances/in/check` — Verifica consistència (només IN)
- `POST /api/remittances/in/sanitize` — Repara remeses legacy

**Verificacions:**
- `COUNT_MISMATCH` — transactionIds.length ≠ filles actives
- `SUM_MISMATCH` — Suma filles ≠ import pare (> 2 cèntims)
- `PARENT_IS_REM_BUT_NO_ACTIVE_CHILDREN` — Marcat remesa però 0 fills

**Banner UI:** Si `/check` detecta problemes, es mostra banner amb botó "Resoldre".

### Històric (Desembre 2024)

#### 12.1 Paginació Implementada
- `PAGE_SIZE = 50`
- Cursors `lastBankDoc` i `lastOffBankDoc`
- `loadMore()` i `hasMore` exposats
- Botó "Carregar més" a la UI

#### 12.2 Cerca i Filtres
- Camp de cerca amb icona Search i botó X
- Filtres ràpids inline (Tots, Sense document, Sense categoria, etc.)
- Filtres de tipus `ExpenseTableFilter`
- Filtratge combinat amb `useMemo`

#### 12.3 Punt Verd
- Nova columna "Doc" a la taula
- Usa `expense.documentUrl` per determinar estat

#### 12.4 Bug Fix documentUrl
- Les despeses off-bank noves usen `attachments[]`
- Hook fa fallback: `data.documentUrl ?? data.attachments?.[0]?.url ?? null`

#### 12.5 Modal Més Ample
- `DialogContent className="sm:max-w-4xl"`
- Layout en 2 columnes: `grid grid-cols-1 md:grid-cols-2 gap-4`

#### 12.6 Botó Principal
- Text: "Afegir despesa (contrapart)"
- Variant: default (primari)
- Posició: primer botó (abans de "Projectes")

#### 12.7 Optimització Promise.all
- Canviat `for...await` a `Promise.all` per carregar expenseLinks en paral·lel

---

## 13. EXEMPLE D'ÚS TÍPIC

```tsx
// Component que usa el hook
export default function ExpensesInboxPage() {
  const { expenses, isLoading, loadMore, hasMore, isLoadingMore, refresh } = useUnifiedExpenseFeed();

  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<ExpenseTableFilter>('all');

  const filteredExpenses = useMemo(() => {
    let result = expenses;

    if (tableFilter !== 'all') {
      result = result.filter(e => {
        switch (tableFilter) {
          case 'withoutDocument': return !e.expense.documentUrl;
          case 'offBank': return e.expense.source === 'offBank';
          default: return true;
        }
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.expense.description?.toLowerCase().includes(q) ||
        e.expense.counterpartyName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [expenses, tableFilter, searchQuery]);

  return (
    <div>
      {/* Cerca */}
      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

      {/* Filtres */}
      <Button onClick={() => setTableFilter('all')}>Tots</Button>
      <Button onClick={() => setTableFilter('offBank')}>Terreny</Button>

      {/* Taula */}
      <Table>
        {filteredExpenses.map(item => (
          <TableRow key={item.expense.txId}>
            <TableCell>{item.expense.date}</TableCell>
            <TableCell>{item.expense.description}</TableCell>
          </TableRow>
        ))}
      </Table>

      {/* Carregar més */}
      {hasMore && (
        <Button onClick={loadMore} disabled={isLoadingMore}>
          Carregar més
        </Button>
      )}
    </div>
  );
}
```

---

## 14. FITXERS COMPLETS DE REFERÈNCIA

### 14.1 project-module-types.ts
Conté tots els tipus TypeScript del mòdul. Consultable a:
`src/lib/project-module-types.ts`

### 14.2 use-project-module.ts
Conté tots els hooks del mòdul. Consultable a:
`src/hooks/use-project-module.ts`

### 14.3 expenses/page.tsx
Pàgina principal del llistat. Consultable a:
`src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx`

### 14.4 add-off-bank-expense-modal.tsx
Modal de crear/editar despeses. Consultable a:
`src/components/project-module/add-off-bank-expense-modal.tsx`

---

## 15. LLISTA EXHAUSTIVA DE FUNCIONALITATS DE L'APP

### 15.1 MOVIMENTS / TRANSACCIONS

#### Gestor de Moviments Bancaris
- **Ruta**: `/dashboard/movimientos`
- **Descripció**: Importació, visualització i categorització de transaccions bancàries
- **Components**:
  - `TransactionImporter` - Importació de CSV/XLSX de bancs
  - `TransactionsTable` - Taula editable amb filtres
  - `EditTransactionDialog` - Diàleg per editar
  - `TransactionsFilters` - Filtres avançats
  - `TransactionRow` - Component d'una fila

#### Sub-pàgines de Moviments
- **`/dashboard/movimientos/pendents`**: Moviments pendents de classificar (sense categoria o contacte)
- **`/dashboard/movimientos/liquidacions`**: Liquidacions pendents de processar

#### Funcionalitats
- Importació bancària (CSV/XLSX de múltiples bancs)
- Auto-categorització intel·ligent amb IA
- Vinculació a contactes (donants, proveïdors, treballadors)
- Assignació a projectes
- Gestió de devolucions
- Remeses (agrupació/desagrupament)
- Adjunció de documents justificants

### 15.2 CONTACTES

#### Gestió de Donants
- **Ruta**: `/dashboard/donants`
- **Components**: `DonorManager`, `DonorImporter`, `DonorDetailDrawer`, `DonorSearchCombobox`

#### Gestió de Proveïdors
- **Ruta**: `/dashboard/proveidors`
- **Components**: `SupplierManager`, `SupplierImporter`

#### Gestió de Treballadors
- **Ruta**: `/dashboard/treballadors`
- **Components**: `EmployeeManager`

#### Funcionalitats Comunes
- Camps: DNI/CIF, codi postal, ciutat, província
- Categoria per defecte (auto-assignació)
- Estat: Actiu, inactiu, pendents de retorn
- Filtratge per estat, tipus, períodes

### 15.3 PROJECTES / MÒDUL DE PROJECTES

#### Llistat de Projectes
- **Ruta**: `/dashboard/project-module/projects`
- **Descripció**: CRUD de projectes amb pressupost i execució

#### Gestió Econòmica (Budget)
- **Ruta**: `/dashboard/project-module/projects/[projectId]/budget`
- **Funcionalitats**:
  - CRUD de partides pressupostàries
  - Visualització execució vs pressupostat
  - Alertes de desviacions
  - Suggeriments automàtics
  - Export justificació (XLSX + ZIP)
  - Gestió FX (moneda estrangera)
  - Despeses off-bank (terreny)

#### Despeses Assignables
- **Ruta**: `/dashboard/project-module/expenses`
- **Funcionalitats**:
  - Taula despeses bancàries + off-bank
  - Filtres múltiples
  - Quick Assign 100%
  - Split parcial
  - Assignació massiva
  - Marcar per revisió

### 15.4 FISCALITAT

#### Gestor d'Informes
- **Ruta**: `/dashboard/informes`
- **Components**: `DonationsReportGenerator`, `SuppliersReportGenerator`

#### Certificats de Donació
- **Ruta**: `/dashboard/informes/certificats`
- **Components**: `DonationCertificateGenerator`
- **Descripció**: Generació massiva o individual de certificats PDF per a donants

#### Funcionalitats
- **Model 182**: Declaració anual de donacions
- **Model 347**: Declaració operacions amb tercers
- **Certificats**: PDF de donació per donants (ruta pròpia)
- **Alertes**: Data límit de presentació

### 15.5 DASHBOARD PRINCIPAL

- **Ruta**: `/dashboard`
- **KPIs**: Ingressos, despeses, transferències, balanç
- **Donants**: Nombre actius, importació total, comparativa
- **Membres**: Nombre socis, quotes
- **Despeses per projecte**: Gràfic i taula amb %
- **Obligacions fiscals**: Dies restants
- **Alertes**: Moviments sense categoritzar, donants incomplets
- **Exportacions**: Excel i CSV

### 15.6 CONFIGURACIÓ

- **Ruta**: `/dashboard/configuracion`
- **Components**:
  - `CategoryManager` - CRUD categories
  - `OrganizationSettings` - Paràmetres org
  - `MembersManager` - Gestió equip
  - `FeatureFlagsSettings` - Activació mòduls
  - `DangerZone` - Operacions destructives

### 15.7 IMPORTADORS

- `TransactionImporter` - Moviments bancaris
- `DonorImporter` - Donants
- `SupplierImporter` - Proveïdors
- `StripeImporter` - Donacions Stripe
- `ReturnImporter` - Devolucions

### 15.8 HUB DE GUIES (v1.27)

- **Ruta**: `/dashboard/guides`
- **Descripció**: Centre d'autoajuda per usuaris amb guies procedimentals
- **Funcionalitats**:
  - Cercador amb scoring determinista (sense IA)
  - Diccionari de sinònims per cerques naturals
  - Guies agrupades per categoria
  - Suggeriments de cerca
- **Fitxers clau**:
  - `src/app/[orgSlug]/dashboard/guides/page.tsx`
  - `src/i18n/locales/*.json` (claus `guides.search.*`)

### 15.9 QUICK EXPENSE (Captura ràpida)

- **Ruta**: `/dashboard/quick-expense`
- **Descripció**: Captura ràpida de despeses de terreny des del mòbil
- **Funcionalitats**:
  - Formulari simplificat (< 10 segons)
  - Captura de foto del tiquet
  - Assignació a projecte
  - Marca `needsReview: true` per revisió posterior

### 15.10 SUPER ADMIN

- **Ruta**: `/dashboard/super-admin`
- **Descripció**: Panell d'administració global (només SuperAdmins)
- **Funcionalitats**:
  - Gestió d'organitzacions
  - Accés cross-org
  - Mode rescat (rescue mode)

### 15.11 MANUAL D'USUARI INTEGRAT

- **Ruta**: `/dashboard/manual`
- **Descripció**: Accés al manual d'usuari des de l'app

### 15.12 PROJECT-MODULE ADMIN

- **Ruta**: `/dashboard/project-module/admin`
- **Descripció**: Administració del mòdul de projectes
- **Funcionalitats**:
  - Neteja de dades òrfenes (expenseLinks sense despesa)
  - Estadístiques d'ús del mòdul
  - Eines de diagnòstic

### 15.13 DETALL DE DESPESA

- **Ruta**: `/dashboard/project-module/expenses/[txId]`
- **Descripció**: Vista detallada i edició d'una despesa individual
- **Funcionalitats**:
  - Visualització completa de la despesa
  - Edició de camps (per off-bank)
  - Gestió d'assignacions

### 15.14 CAPTURA RÀPIDA (DINS PROJECT-MODULE)

- **Ruta**: `/dashboard/project-module/expenses/capture`
- **Descripció**: Formulari simplificat per capturar despeses de terreny
- **Funcionalitats**:
  - Captura amb foto del tiquet
  - Marca `needsReview: true` per defecte

### 15.15 PÀGINES PÚBLIQUES (MULTIIDIOMA)

- **Ruta base**: `/public/[lang]/`
- **Descripció**: Pàgines públiques accessibles sense login
- **Rutes**:
  - `/public/[lang]/` - Landing page
  - `/public/[lang]/funcionalitats` (ca) / `funcionalidades` (es) / `fonctionnalites` (fr)
  - `/public/[lang]/privacy` (en) / `privacitat` (ca) / `privacidad` (es) / `confidentialite` (fr)
  - `/public/[lang]/contact` (en) / `contacte` (ca) / `contacto` (es)
  - `/public/[lang]/novetats` - Bloc de novetats
  - `/public/[lang]/novetats/[slug]` - Article individual
  - `/public/[lang]/login` - Pàgina de login multiidioma

### 15.16 ADMIN GLOBAL

- **Ruta**: `/admin`
- **Descripció**: Panell d'administració global (fora de context d'organització)
- **Accés**: Només SuperAdmins

---

## 16. GUIA D'ESTILS COMPLETA

### 16.1 COMPONENTS UI DISPONIBLES (shadcn/ui)

#### Entrada de dades
- `Button` - Botons amb variants
- `Input` - Camp de text
- `Textarea` - Àrea multilínia
- `Label` - Etiquetes
- `Checkbox` - Caselles verificació
- `Radio Group` - Radiobotó
- `Switch` - Commutador
- `Select` - Desplegable
- `Form` - Sistema formularis amb react-hook-form

#### Informació i feedback
- `Alert` - Alertes contextuals
- `Alert Dialog` - Confirmacions
- `Badge` - Etiquetes/insígnies
- `Progress` - Barra progrés
- `Skeleton` - Placeholder carregament
- `Tooltip` - Consells flotants

#### Layout
- `Card` (CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- `Separator` - Divisors
- `Breadcrumb` - Navegació
- `Sidebar` - Barra lateral

#### Diàlegs i panells
- `Dialog` - Modal estàndard
- `Sheet` - Panell lliscant
- `Popover` - Flotant posicionat
- `Dropdown Menu` - Menú desplegable
- `Command` - Paleta de comandes

#### Navegació
- `Tabs` - Pestanyes
- `Accordion` - Acordió
- `Collapsible` - Col·lapsible

#### Taules
- `Table` (TableHeader, TableBody, TableRow, TableHead, TableCell)

#### Avançats
- `Toast/Toaster` - Notificacions
- `Calendar` - Calendari
- `Avatar` - Avatar usuari
- `Scroll Area` - Scroll personalitzat

### 16.2 VARIANTS DE BUTTON

```typescript
variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
size: "default" | "sm" | "lg" | "icon"
```

- **default**: Botó primari blau
- **destructive**: Botó vermell
- **outline**: Botó amb vora
- **ghost**: Botó transparent
- **secondary**: Botó gris
- **link**: Enllaç subratllat

### 16.3 PALETA DE COLORS (HSL variables)

#### Mode Clar
- **Background**: `hsl(0 0% 98%)` - Blanc trencat
- **Foreground**: `hsl(240 10% 10%)` - Gris fosc
- **Primary**: `hsl(199 89% 48%)` - Blau Sky-500 #0EA5E9
- **Secondary**: `hsl(220 14% 96%)` - Gris clar
- **Muted**: `hsl(220 14% 96%)`
- **Accent**: `hsl(199 89% 96%)` - Blau molt clar

#### Colors Semàntics
- **Success**: `hsl(142 71% 45%)` - Verd
- **Warning**: `hsl(38 92% 50%)` - Taronja
- **Destructive**: `hsl(0 84% 60%)` - Vermell
- **Info**: `hsl(199 89% 48%)` - Blau

#### Interfície
- **Border**: `hsl(220 13% 91%)`
- **Ring** (focus): Blau primary
- **Radius**: `0.5rem` (8px)

### 16.4 PATRONS DE LAYOUT

#### Grid
```tsx
className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
```

#### Flex
```tsx
className="flex flex-col gap-4"
className="flex items-center justify-between gap-2"
className="flex flex-wrap gap-2"
```

#### Spacing
- `gap-1` (4px), `gap-2` (8px), `gap-4` (16px), `gap-6` (24px)

### 16.5 PATRÓ DE TAULA

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[50px]">
        <Checkbox />
      </TableHead>
      <TableHead>Columna</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50">
      <TableCell><Checkbox /></TableCell>
      <TableCell>Valor</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 16.6 PATRÓ DE FORMULARI

```tsx
<FormField
  control={form.control}
  name="camp"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormDescription>Ajuda</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 16.7 PATRÓ DE DIALOG

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Títol</DialogTitle>
      <DialogDescription>Descripció</DialogDescription>
    </DialogHeader>
    {/* contingut */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancellar</Button>
      <Button>Acceptar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 16.8 PATRÓ DE TOAST

```tsx
import { useToast } from '@/hooks/use-toast';
const { toast } = useToast();

// Èxit
toast({
  title: "Èxit",
  description: "Acció completada.",
});

// Error
toast({
  variant: "destructive",
  title: "Error",
  description: "Ha fallat.",
});
```

### 16.9 ICONES (lucide-react)

```tsx
import {
  Search, X, Plus, Trash2, Edit, Copy, Download, Upload,
  Check, AlertTriangle, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, ChevronRight, ArrowLeft,
  Settings, Users, FileText, Calendar, Clock,
  Loader2, MoreHorizontal, Eye, EyeOff,
  Home, LogOut, Menu, Filter,
  Landmark, Globe, FolderKanban, FolderPlus,
  Circle, Square, Sparkles, Info, RefreshCw
} from 'lucide-react';

// Mida estàndard
<Icon className="h-4 w-4" />

// Dins botó icon
<Button size="icon"><Icon className="h-4 w-4" /></Button>

// Amb color
<AlertTriangle className="h-4 w-4 text-warning" />
<CheckCircle className="h-4 w-4 text-success" />
```

### 16.10 RESPONSIVE DESIGN

#### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

#### Patrons
```tsx
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Ocultar en mòbil
<div className="hidden md:block">

// Només mòbil
<div className="md:hidden">

// Columnes taula responsive
<TableHead className="hidden md:table-cell">
```

### 16.11 PATRONS DE FILTRE (com TransactionsFilters)

```tsx
{/* Cercador */}
<div className="relative max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Cerca..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-9 pr-9"
  />
  {searchQuery && (
    <button
      onClick={() => setSearchQuery('')}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  )}
</div>

{/* Filtres ràpids */}
<div className="flex gap-2 items-center flex-wrap">
  <Button
    variant={filter === 'all' ? 'default' : 'outline'}
    size="sm"
    onClick={() => setFilter('all')}
  >
    Tots ({count})
  </Button>
  {/* més filtres... */}
</div>
```

### 16.12 PUNT VERD (DOCUMENT)

```tsx
<TableCell className="text-center">
  {expense.documentUrl ? (
    <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 inline-block" />
  ) : (
    <Circle className="h-2.5 w-2.5 text-muted-foreground/30 inline-block" />
  )}
</TableCell>
```

### 16.13 BADGES D'ESTAT

```tsx
// Percentatge assignació
<Badge variant="default" className="bg-green-600">100%</Badge>
<Badge variant="default" className="bg-yellow-500 text-black">50%</Badge>
<Badge variant="outline">0%</Badge>

// Estats
<Badge variant="success">Actiu</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="secondary">Pendent</Badge>
```

### 16.14 UTILITAT cn()

```tsx
import { cn } from '@/lib/utils';

const className = cn(
  "base-class",
  condition && "conditional-class",
  props.className
);
```

---

## 17. MODEL DE DADES FIRESTORE COMPLET

### 17.1 ORGANITZACIONS

**Path:** `/organizations/{orgId}`

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string; // ex: "flores-kiskeya"
  taxId: string; // CIF
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;

  // Tipus d'entitat
  entityType?: 'fundacion' | 'asociacion' | 'ong' | 'other' | null;

  // Feature flags
  features?: {
    projectModule?: boolean;
    stripeImport?: boolean;
    aiCategorization?: boolean;
    multiCurrency?: boolean;
  } | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 17.2 USUARIS / MEMBRES

**Path:** `/organizations/{orgId}/members/{memberId}`

```typescript
interface Member {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  displayName?: string | null;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited' | 'disabled';

  // SuperAdmin global (no per org)
  isSuperAdmin?: boolean;

  invitedBy?: string | null;
  invitedAt?: Timestamp | null;
  joinedAt?: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 17.3 TRANSACCIONS / MOVIMENTS BANCARIS

**Path:** `/organizations/{orgId}/transactions/{txId}`

```typescript
interface Transaction {
  id: string;
  orgId: string;

  // Dades bancàries (immutables després d'import)
  date: string; // YYYY-MM-DD
  valueDate?: string | null; // Data valor
  amount: number; // EUR (negatiu = sortida)
  currency: 'EUR';
  bankDescription: string; // Concepte original del banc
  bankReference?: string | null; // Referència bancària

  // Classificació (editable)
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;

  // Contacte vinculat
  contactId: string | null;
  contactType: 'donor' | 'supplier' | 'employee' | 'member' | null;
  contactName: string | null;

  // Document justificant
  document?: {
    url: string;
    name: string;
    contentType: string;
    size: number;
    uploadedAt: Timestamp;
  } | null;

  // Projecte (assignació simple)
  projectId?: string | null;
  projectName?: string | null;

  // Devolucions
  isReturn?: boolean;
  returnOf?: string | null; // txId de la transacció original
  returnedBy?: string | null; // txId de la devolució

  // Remeses (pare)
  isRemittance?: boolean; // true si és una remesa processada
  remittanceId?: string | null; // Referència al doc remittances/{id}
  remittanceItemCount?: number; // Nombre de quotes
  remittanceStatus?: 'complete' | 'partial' | 'pending';
  remittanceType?: 'returns' | 'donations' | 'payments';
  remittanceDirection?: 'IN' | 'OUT';

  // Remeses (filla)
  isRemittanceItem?: boolean; // true si és filla d'una remesa
  parentTransactionId?: string | null; // ID del pare

  // Soft-delete (per desfer remeses)
  archivedAt?: string | null; // null = activa, ISO timestamp = arxivada
  archivedByUid?: string | null;
  archivedReason?: string | null; // ex: "undo_remittance"

  // Devolucions
  transactionType?: 'normal' | 'return' | 'return_fee' | 'donation';
  linkedTransactionId?: string | null; // Per vincular devolucions

  // Metadades
  importSource?: string | null; // "csv", "xlsx", "stripe"
  importBatch?: string | null;
  importedAt?: Timestamp | null;

  // Notes
  notes?: string | null;
  internalNotes?: string | null;

  // IA
  aiCategoryId?: string | null;
  aiConfidence?: number | null;
  aiProcessedAt?: Timestamp | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}
```

### 17.4 CATEGORIES

**Path:** `/organizations/{orgId}/categories/{categoryId}`

```typescript
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  group?: 'operating' | 'mission' | 'financial' | 'other' | null;
  isDefault?: boolean; // Categories predefinides
  isSystem?: boolean; // No es pot eliminar

  // Per a Model 182/347
  fiscalCode?: string | null;

  order?: number | null;

  createdBy?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 17.5 DONANTS

**Path:** `/organizations/{orgId}/contacts/donors/{donorId}`

```typescript
interface Donor {
  id: string;
  orgId: string;

  // Identificació
  type: 'individual' | 'company';
  name: string; // Nom complet o raó social
  firstName?: string | null; // Per individuals
  lastName?: string | null;

  // Fiscal
  taxId?: string | null; // DNI/NIE/CIF
  taxIdType?: 'dni' | 'nie' | 'cif' | 'passport' | null;

  // Contacte
  email?: string | null;
  phone?: string | null;

  // Adreça
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  provinceCode?: string | null; // Codi INE (per Model 182)
  country?: string | null;
  countryCode?: string | null;

  // Estat
  status: 'active' | 'inactive' | 'pendingReturn';

  // Donacions
  defaultCategoryId?: string | null;
  donationMethod?: 'bank' | 'cash' | 'stripe' | 'other' | null;
  isRecurring?: boolean;

  // Banc (per domiciliacions)
  iban?: string | null;
  bic?: string | null;
  accountHolder?: string | null;

  // Metadades
  tags?: string[] | null;
  notes?: string | null;

  // Stripe
  stripeCustomerId?: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}
```

### 17.6 PROVEÏDORS

**Path:** `/organizations/{orgId}/contacts/suppliers/{supplierId}`

```typescript
interface Supplier {
  id: string;
  orgId: string;

  name: string;
  taxId?: string | null; // CIF/NIF

  // Contacte
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;

  // Adreça
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;

  // Estat
  status: 'active' | 'inactive';

  // Classificació
  defaultCategoryId?: string | null;
  supplierType?: string | null;

  // Banc
  iban?: string | null;
  bic?: string | null;

  // Fiscal (per Model 347)
  operationType?: 'A' | 'B' | null; // Compres / Vendes

  notes?: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 17.7 TREBALLADORS

**Path:** `/organizations/{orgId}/contacts/employees/{employeeId}`

```typescript
interface Employee {
  id: string;
  orgId: string;

  firstName: string;
  lastName: string;
  name: string; // Computed: firstName + lastName

  taxId?: string | null; // DNI/NIE
  ssNumber?: string | null; // Núm. Seguretat Social

  email?: string | null;
  phone?: string | null;

  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;

  // Contracte
  position?: string | null;
  department?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  contractType?: 'fullTime' | 'partTime' | 'contractor' | null;

  status: 'active' | 'inactive';

  // Banc (per nòmines)
  iban?: string | null;

  defaultCategoryId?: string | null;
  notes?: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 17.8 REMESES

**Path:** `/organizations/{orgId}/remittances/{remittanceId}`

```typescript
interface Remittance {
  id: string;
  orgId: string;

  // Direcció de la remesa
  direction: 'IN' | 'OUT'; // IN = quotes socis, OUT = devolucions

  date: string; // YYYY-MM-DD
  description: string;
  totalAmount: number; // Cèntims
  itemCount: number;

  // IDs de les transaccions filles creades
  transactionIds: string[];

  // Transacció pare (el moviment agregat del banc)
  parentTransactionId: string;

  // Idempotència i control
  inputHash: string; // SHA-256 del input per detectar reprocessaments
  status: 'active' | 'undone'; // undone = desfeta

  // Pendents no resolts
  pendingItems?: RemittancePendingItem[];

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Filles de remesa
interface RemittanceChild {
  // ... camps de Transaction ...
  isRemittanceItem: true;
  parentTransactionId: string; // ID del pare
  contactId: string; // ID del donant
  contactType: 'donor';

  // Soft-delete (quan es desfà la remesa)
  archivedAt?: string | null; // null = activa, ISO timestamp = arxivada
  archivedByUid?: string | null;
  archivedReason?: string | null; // ex: "undo_remittance"
}
```

#### Flux de vida d'una remesa IN

```
PROCESSAR → DESFER → REPROCESSAR
    ↓           ↓           ↓
Crea filles  Arxiva     Crea filles
+ doc        (archivedAt) noves
```

**Invariants:**
- Mai processar dues vegades sense desfer
- Les filles arxivades no compten per Model 182 ni certificats
- `archivedAt = null | undefined | ""` → filla activa

---

## 18. PÀGINES PRINCIPALS DE L'APLICACIÓ

### 18.1 ESTRUCTURA DE RUTES

```
src/app/
├── login/page.tsx                    # Login global
├── registre/page.tsx                 # Registre
├── redirect-to-org/page.tsx          # Redirecció automàtica
├── admin/page.tsx                    # Admin global (SuperAdmin)
├── quick/page.tsx                    # Quick expense (sense org)
│
├── public/[lang]/                    # Pàgines públiques multiidioma
│   ├── page.tsx                      # Landing page
│   ├── login/page.tsx                # Login multiidioma
│   ├── funcionalitats/page.tsx       # Features (ca)
│   ├── funcionalidades/page.tsx      # Features (es)
│   ├── fonctionnalites/page.tsx      # Features (fr)
│   ├── privacy/page.tsx              # Privacitat (en)
│   ├── privacitat/page.tsx           # Privacitat (ca)
│   ├── privacidad/page.tsx           # Privacitat (es)
│   ├── confidentialite/page.tsx      # Privacitat (fr)
│   ├── contact/page.tsx              # Contacte (en)
│   ├── contacte/page.tsx             # Contacte (ca)
│   ├── contacto/page.tsx             # Contacte (es)
│   └── novetats/
│       ├── page.tsx                  # Llistat novetats
│       └── [slug]/page.tsx           # Article individual
│
├── [orgSlug]/
│   ├── page.tsx                      # Redirecció a dashboard
│   ├── login/page.tsx                # Login dins org
│   ├── quick-expense/page.tsx        # Quick expense amb org
│   │
│   └── dashboard/
│       ├── page.tsx                  # Dashboard principal
│       ├── movimientos/
│       │   ├── page.tsx              # Moviments bancaris
│       │   ├── pendents/page.tsx     # Moviments pendents
│       │   └── liquidacions/page.tsx # Liquidacions
│       ├── donants/page.tsx          # Gestió donants
│       ├── proveidors/page.tsx       # Gestió proveïdors
│       ├── treballadors/page.tsx     # Gestió treballadors
│       ├── projectes/page.tsx        # Projectes simplificat
│       ├── informes/
│       │   ├── page.tsx              # Model 182, 347
│       │   └── certificats/page.tsx  # Certificats donació
│       ├── configuracion/page.tsx    # Configuració org
│       ├── guides/page.tsx           # Hub de guies
│       ├── manual/page.tsx           # Manual d'usuari
│       ├── super-admin/page.tsx      # SuperAdmin (dins org)
│       ├── quick-expense/page.tsx    # Quick expense dins dashboard
│       │
│       └── project-module/
│           ├── page.tsx              # Índex del mòdul
│           ├── admin/page.tsx        # Admin del mòdul
│           ├── quick-expense/page.tsx# Quick expense del mòdul
│           ├── expenses/
│           │   ├── page.tsx          # Despeses assignables
│           │   ├── [txId]/page.tsx   # Detall despesa
│           │   └── capture/page.tsx  # Captura ràpida
│           └── projects/
│               ├── page.tsx          # Llistat projectes
│               ├── new/page.tsx      # Crear projecte
│               └── [projectId]/
│                   ├── edit/page.tsx # Editar projecte
│                   └── budget/
│                       └── page.tsx  # Gestió econòmica
```

### 18.2 DASHBOARD PRINCIPAL

**Ruta:** `/[orgSlug]/dashboard`
**Fitxer:** `src/app/[orgSlug]/dashboard/page.tsx`

**Seccions:**
1. **KPIs principals** - Cards amb ingressos, despeses, balanç
2. **Alertes** - Moviments sense categoritzar, donants incomplets
3. **Donants actius** - Recompte i comparativa mensual
4. **Obligacions fiscals** - Model 182/347 amb dies restants
5. **Despeses per projecte** - Gràfic circular i taula

**Hooks usats:**
```typescript
const { organization } = useCurrentOrganization();
const { transactions } = useTransactions({ year: currentYear });
const { donors } = useDonors();
const { projects } = useProjects();
```

### 18.3 MOVIMENTS (TRANSACCIONS)

**Ruta:** `/[orgSlug]/dashboard/movimientos`
**Fitxer:** `src/app/[orgSlug]/dashboard/movimientos/page.tsx`

**Components principals:**
- `TransactionsTable` - Taula principal amb filtres
- `TransactionImporter` - Modal importació CSV/XLSX
- `EditTransactionDialog` - Edició de transacció
- `TransactionsFilters` - Barra de filtres

**Funcionalitats:**
- Importació bancària multi-format
- Categorització automàtica amb IA
- Vinculació a contactes
- Gestió de devolucions
- Remeses (agrupar/desagrupar)
- Adjunció de documents

**Hook principal:**
```typescript
const {
  transactions,
  isLoading,
  filters,
  setFilters,
  categorizeAll,
  isCategorizing
} = useTransactionFilters();
```

### 18.4 DONANTS

**Ruta:** `/[orgSlug]/dashboard/donants`
**Fitxer:** `src/app/[orgSlug]/dashboard/donants/page.tsx`

**Components:**
- `DonorManager` - Gestor principal
- `DonorDetailDrawer` - Panell lateral detall
- `DonorImporter` - Importació massiva
- `DonorSearchCombobox` - Cercador amb autocompletat

**Funcionalitats:**
- CRUD donants
- Importació CSV
- Vincular transaccions
- Filtrar per estat
- Exportar per fiscalitat

**Hook principal:**
```typescript
const { donors, isLoading, refresh, create, update, remove } = useDonors();
```

### 18.5 PROVEÏDORS

**Ruta:** `/[orgSlug]/dashboard/proveidors`
**Fitxer:** `src/app/[orgSlug]/dashboard/proveidors/page.tsx`

**Components:**
- `SupplierManager` - Gestor principal
- `SupplierImporter` - Importació

**Funcionalitats:**
- CRUD proveïdors
- Filtre per estat
- Vincular a transaccions

### 18.6 TREBALLADORS

**Ruta:** `/[orgSlug]/dashboard/treballadors`
**Fitxer:** `src/app/[orgSlug]/dashboard/treballadors/page.tsx`

**Components:**
- `EmployeeManager` - Gestor principal

**Funcionalitats:**
- CRUD treballadors
- Vincular nòmines

### 18.7 INFORMES FISCALS

**Ruta:** `/[orgSlug]/dashboard/informes`
**Fitxer:** `src/app/[orgSlug]/dashboard/informes/page.tsx`

**Components:**
- `DonationsReportGenerator` - Model 182
- `SuppliersReportGenerator` - Model 347
- `DonationCertificateGenerator` - Certificats PDF

**Funcionalitats:**
- **Model 182**: Donacions a l'AEAT
  - Filtra donants amb imports > 0
  - Valida DNI/CIF i adreces
  - Genera fitxer TXT format AEAT

- **Model 347**: Operacions amb tercers
  - Filtra proveïdors amb imports > 3.005,06€
  - Genera fitxer TXT format AEAT

- **Certificats**: PDF individuals per donant
  - Genera PDF amb dades fiscals
  - Enviament per email (opcional)

### 18.8 CONFIGURACIÓ

**Ruta:** `/[orgSlug]/dashboard/configuracion`
**Fitxer:** `src/app/[orgSlug]/dashboard/configuracion/page.tsx`

**Seccions:**
1. **Dades organització** - Nom, CIF, adreça
2. **Categories** - CRUD categories despesa/ingrés
3. **Membres** - Gestió equip i rols
4. **Feature Flags** - Activar mòduls
5. **Danger Zone** - Eliminar dades

**Components:**
- `CategoryManager` - Editor categories
- `MembersManager` - Gestió equip
- `FeatureFlagsSettings` - Toggles

### 18.9 SUPER ADMIN

**Ruta:** `/super-admin`
**Fitxer:** `src/app/super-admin/page.tsx`

**Funcionalitats:**
- Llistat totes les organitzacions
- Crear organització nova
- Impersonar usuaris
- Gestió global de features

**Accés:** Només usuaris amb `isSuperAdmin: true`

---

## 19. HOOKS PRINCIPALS DE L'APLICACIÓ

### 19.1 ORGANITZACIÓ

```typescript
// src/hooks/organization-provider.tsx

// Context de l'organització actual
const { organization, isLoading, error } = useCurrentOrganization();

// Construir URLs amb orgSlug
const { buildUrl, orgSlug } = useOrgUrl();
// buildUrl('/dashboard/expenses') => '/flores-kiskeya/dashboard/expenses'
```

### 19.2 TRANSACCIONS

```typescript
// src/hooks/use-transactions.ts

interface UseTransactionsOptions {
  year?: number;
  month?: number;
  categoryId?: string;
  contactId?: string;
}

const {
  transactions,
  isLoading,
  error,
  refresh
} = useTransactions(options);

// Filtres avançats
const {
  transactions,
  filters,
  setFilters,
  categorizeAll,
  isCategorizing,
  batchProgress
} = useTransactionFilters();
```

### 19.3 CONTACTES

```typescript
// src/hooks/use-donors.ts
const { donors, isLoading, create, update, remove, refresh } = useDonors();

// src/hooks/use-suppliers.ts
const { suppliers, isLoading, create, update, remove } = useSuppliers();

// src/hooks/use-employees.ts
const { employees, isLoading, create, update, remove } = useEmployees();
```

### 19.4 CATEGORIES

```typescript
// src/hooks/use-categories.ts
const {
  categories,
  incomeCategories,
  expenseCategories,
  isLoading,
  create,
  update,
  remove
} = useCategories();
```

### 19.5 PROJECTES (MÒDUL)

```typescript
// src/hooks/use-project-module.ts

// Projectes
const { projects, isLoading, create, update, remove } = useProjects(onlyActive);

// Partides
const { budgetLines, isLoading, create, update, remove } = useProjectBudgetLines(projectId);

// Despeses unificades
const {
  expenses,
  isLoading,
  loadMore,
  hasMore,
  refresh
} = useUnifiedExpenseFeed({ projectId, budgetLineId });

// Assignacions
const { save, remove, isSaving } = useSaveExpenseLink();

// Despeses off-bank
const { save, isSaving } = useSaveOffBankExpense();
const { update, isUpdating } = useUpdateOffBankExpense();
```

### 19.6 AUTENTICACIÓ

```typescript
// src/hooks/use-auth.ts
const {
  user,           // Firebase User
  isLoading,
  isAuthenticated,
  signIn,
  signOut,
  signUp
} = useAuth();

// Membre actual dins organització
const { member, isAdmin, isEditor, isSuperAdmin } = useCurrentMember();
```

### 19.7 TOASTS I FEEDBACK

```typescript
// src/hooks/use-toast.ts
const { toast } = useToast();

toast({ title: "Èxit", description: "Acció completada" });
toast({ variant: "destructive", title: "Error", description: "Ha fallat" });
```

### 19.8 TRADUCCIONS

```typescript
// src/i18n/index.ts
const { t, locale, setLocale } = useTranslations();

// Ús
t.common.save           // "Desar"
t.projectModule.budget  // "Pressupost"
t.categories.transport  // "Transport"
```

---

## 20. COMPONENTS COMPARTITS

### 20.1 LAYOUTS

```typescript
// src/components/dashboard-layout.tsx
<DashboardLayout>
  <DashboardHeader />
  <DashboardSidebar />
  <main>{children}</main>
</DashboardLayout>

// src/components/dashboard-sidebar-content.tsx
<Sidebar>
  <SidebarHeader />
  <SidebarContent>
    <SidebarMenu>{items}</SidebarMenu>
  </SidebarContent>
  <SidebarFooter />
</Sidebar>
```

### 20.2 CERCADORS

```typescript
// src/components/contact-search-combobox.tsx
<ContactSearchCombobox
  type="donor" // | "supplier" | "employee"
  value={selectedId}
  onChange={setSelectedId}
  placeholder="Cerca contacte..."
/>

// src/components/category-select.tsx
<CategorySelect
  type="expense" // | "income"
  value={categoryId}
  onChange={setCategoryId}
/>
```

### 20.3 TAULES

```typescript
// src/components/transactions-table.tsx
<TransactionsTable
  transactions={transactions}
  onEdit={handleEdit}
  onCategorize={handleCategorize}
  onLink={handleLink}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
/>

// Fila individual
// src/components/transactions/components/TransactionRow.tsx
```

### 20.4 MODALS

```typescript
// Edit transaction
<EditTransactionDialog
  transaction={selected}
  open={isOpen}
  onOpenChange={setIsOpen}
  onSave={handleSave}
/>

// Confirm delete
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Eliminar</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 20.5 IMPORTADORS

```typescript
// src/components/transaction-importer.tsx
<TransactionImporter
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={refresh}
/>

// src/components/donor-importer.tsx
<DonorImporter
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={refresh}
/>
```

### 20.6 DRAWERS I SHEETS

```typescript
// src/components/donor-detail-drawer.tsx
<DonorDetailDrawer
  donor={selectedDonor}
  open={isOpen}
  onOpenChange={setIsOpen}
  onUpdate={handleUpdate}
/>
```

---

## 21. UTILITATS I HELPERS

### 21.1 FORMATACIÓ

```typescript
// src/lib/normalize.ts

// Dates
formatDateDMY('2024-12-24')     // '24/12/2024'
formatDateYMD(new Date())       // '2024-12-24'
parseDate('24/12/2024')         // Date object

// Imports
formatAmount(1234.56)           // '1.234,56 €'
formatAmountCompact(-500)       // '-500 €'

// Text
normalizeText('JOSÉ GARCÍA')    // 'José García'
slugify('Flores Kiskeya')       // 'flores-kiskeya'
```

### 21.2 VALIDACIÓ

```typescript
// src/lib/validators.ts

isValidDNI('12345678Z')         // true
isValidNIE('X1234567L')         // true
isValidCIF('B12345678')         // true
isValidIBAN('ES91 2100 ...')    // true
isValidEmail('a@b.com')         // true
```

### 21.3 FIRESTORE

```typescript
// src/lib/firebase/firestore.ts

// Refs
const txRef = doc(db, `organizations/${orgId}/transactions/${txId}`);
const donorsRef = collection(db, `organizations/${orgId}/contacts/donors`);

// Queries
const q = query(
  donorsRef,
  where('status', '==', 'active'),
  orderBy('name'),
  limit(50)
);
const snapshot = await getDocs(q);
```

### 21.4 STORAGE

```typescript
// src/lib/firebase/storage.ts

// Upload
const url = await uploadFile(file, `organizations/${orgId}/documents/${filename}`);

// Download
const url = await getDownloadURL(ref(storage, path));

// Delete
await deleteFile(path);
```

### 21.5 TRACKING UX

```typescript
// src/lib/ux/trackUX.ts

trackUX('transactions.categorize', { count: 5, method: 'ai' });
trackUX('donor.create', { hasEmail: true });
trackUX('report.model182.generate', { donorCount: 150 });
```

---

## 22. MIDDLEWARE I AUTENTICACIÓ

### 22.1 MIDDLEWARE

**Fitxer:** `src/middleware.ts`

```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutes públiques
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  // Redirecció si no té orgSlug
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/redirect-to-org';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 22.2 PROTECCIÓ DE RUTES

```typescript
// src/app/[orgSlug]/dashboard/layout.tsx

export default function DashboardLayout({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const { organization, isLoading: orgLoading } = useCurrentOrganization();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || orgLoading) {
    return <LoadingSpinner />;
  }

  if (!organization) {
    return <OrganizationNotFound />;
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
```

---

## 23. ESTRUCTURA FIRESTORE COMPLETA

```
/organizations/{orgId}
│
├── /transactions/{txId}              # Moviments bancaris
├── /categories/{categoryId}          # Categories despesa/ingrés
├── /remittances/{remittanceId}       # Remeses
│
├── /contacts/
│   ├── /donors/{donorId}             # Donants
│   ├── /suppliers/{supplierId}       # Proveïdors
│   └── /employees/{employeeId}       # Treballadors
│
├── /members/{memberId}               # Membres de l'equip
│
├── /exports/
│   └── /projectExpenses/items/{txId} # Feed read-only per mòdul projectes
│
└── /projectModule/
    └── /_/
        ├── /projects/{projectId}           # Projectes
        │   └── /budgetLines/{lineId}       # Partides pressupostàries
        ├── /expenseLinks/{txId}            # Assignacions despeses
        └── /offBankExpenses/{expenseId}    # Despeses terreny
```

---

## 24. CLOUD FUNCTIONS RELLEVANTS

### 24.1 TRIGGERS

```typescript
// functions/src/exports/projectExpenses.ts
// Trigger: onWrite a /transactions/{txId}
// Acció: Sincronitza a /exports/projectExpenses/items/{txId}

// functions/src/ai/categorize.ts
// Trigger: callable o onWrite
// Acció: Categoritza amb OpenAI/Anthropic

// functions/src/notifications/email.ts
// Trigger: onCreate a certes col·leccions
// Acció: Envia emails via SendGrid
```

### 24.2 CALLABLE FUNCTIONS

```typescript
// Des del client
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const categorizeTransaction = httpsCallable(functions, 'categorizeTransaction');
const result = await categorizeTransaction({ txId, orgId });
```

---

## 25. TESTING I QUALITAT

### 25.1 SCRIPTS

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript
npm test             # Jest tests
```

### 25.2 ESTRUCTURA TESTS

```
__tests__/
├── components/
│   └── TransactionsTable.test.tsx
├── hooks/
│   └── use-transactions.test.ts
├── lib/
│   └── normalize.test.ts
└── pages/
    └── dashboard.test.tsx
```

---

## 26. VARIABLES D'ENTORN

```bash
# .env.local

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# AI (server-side only)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Email
SENDGRID_API_KEY=...

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
```

---

## 27. RESUM D'ARQUITECTURA

| Capa | Tecnologia | Ubicació |
|------|------------|----------|
| UI Components | shadcn/ui + Tailwind | `src/components/ui/` |
| Page Components | React + Next.js | `src/app/[orgSlug]/` |
| Business Logic | Custom Hooks | `src/hooks/` |
| Data Types | TypeScript | `src/lib/*-types.ts` |
| API | Firebase SDK | `src/lib/firebase/` |
| Backend | Cloud Functions | `functions/src/` |
| Database | Firestore | Consola Firebase |
| Auth | Firebase Auth | `src/hooks/use-auth.ts` |
| Storage | Firebase Storage | `src/lib/firebase/storage.ts` |
| i18n | Custom | `src/i18n/` |

---

**Fi del document**
