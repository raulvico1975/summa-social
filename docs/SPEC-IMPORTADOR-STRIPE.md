# Especificació Tècnica: Importador Stripe

> Versió 1.0 — Desembre 2025

Aquest document és la **font única** per implementar l'importador de donacions web de Stripe a Summa Social.

---

## 1. Criteris d'Acceptació

L'importador es considera complet quan:

- [ ] L'import net calculat (brut - comissions) quadra amb el moviment bancari (±0,02 €)
- [ ] Es creen N transaccions filles (ingressos bruts) + 1 transacció de despesa (comissions agregades)
- [ ] El matching és només per email, sense crear donants automàticament
- [ ] Les files amb `Amount Refunded > 0` s'exclouen i es mostra avís
- [ ] Les files amb `Status !== 'succeeded'` s'exclouen silenciosament

---

## 2. Entrada

**Punt d'entrada:**
- Moviments → seleccionar moviment d'ingrés amb descripció que conté "Stripe" → menú ⋮ → "Dividir remesa Stripe"

**Input acceptat:**
- CSV exportat de Stripe: "Pagos → Columnes predeterminades (23)"

**Camps mínims requerits:**

| Camp | Ús | Obligatori |
|------|-----|------------|
| `id` | Traçabilitat (`stripePaymentId`) | Sí |
| `Created date (UTC)` | Data de la donació | Sí |
| `Amount` | Import brut | Sí |
| `Fee` | Comissió Stripe | Sí |
| `Customer Email` | Matching amb donant | Sí |
| `Status` | Filtrar només `succeeded` | Sí |
| `Transfer` | Agrupació per payout | Sí |
| `Amount Refunded` | Detectar reemborsos | Sí |
| `Description` | Concepte (opcional) | No |

---

## 3. Parsing

**Parser CSV propi** (sense dependències externes):
- Separador: `,`
- Quotes: `"..."`
- Decimals: `,` → `.` (format europeu Stripe)

**Algorisme de parsing:**
```typescript
function parseStripeAmount(value: string): number {
  return parseFloat(value.replace(',', '.'));
}
```

---

## 4. Filtratge

| Condició | Acció |
|----------|-------|
| `Status !== 'succeeded'` | Excloure silenciosament |
| `Amount Refunded > 0` | Excloure + mostrar avís |

---

## 5. Agrupació

**Per camp `Transfer`** (po_xxx):

```typescript
interface PayoutGroup {
  transferId: string;
  rows: StripeRow[];
  gross: number;      // Σ Amount
  fees: number;       // Σ Fee
  net: number;        // gross - fees
}
```

---

## 6. Match amb Banc

**Criteri:** Per import net (NO per `Transfer`)

```typescript
const tolerance = 0.02; // euros
const match = Math.abs(payoutGroup.net - bankTransaction.amount) <= tolerance;
```

**Finestra temporal:** Opcional, desactivada per defecte.
- Si s'activa: ±5 dies entre data payout i data moviment bancari.

---

## 7. Matching de Donants

**Ordre de prioritat:**

| # | Criteri | Implementació |
|---|---------|---------------|
| 1 | Email | `donor.email.toLowerCase() === stripeRow.customerEmail.toLowerCase()` |

**Regles:**
- NO fuzzy matching
- NO crear donants automàticament
- Si no hi ha match → fila queda "Pendent d'assignar"

---

## 8. Transaccions Generades

**Per cada donació individual (N ingressos):**

```typescript
{
  date: stripeRow.createdDate,        // UTC → local
  description: stripeRow.description || `Donació Stripe - ${stripeRow.customerEmail}`,
  amount: stripeRow.amount,           // Import BRUT (positiu)
  contactId: matchedDonor?.id || null,
  contactType: matchedDonor ? 'donor' : null,
  contactName: matchedDonor?.name || null,
  source: 'stripe',
  parentTransactionId: bankTransaction.id,
  stripePaymentId: stripeRow.id,      // Camp nou
  category: matchedDonor?.defaultCategoryId || null
}
```

**Per les comissions (1 despesa agregada):**

```typescript
{
  date: bankTransaction.date,
  description: `Comissions Stripe - ${count} donacions`,
  amount: -totalFees,                 // Negatiu (despesa)
  source: 'stripe',
  parentTransactionId: bankTransaction.id,
  categoryId: bankFeesCategoryId      // Obtingut per nameKey === 'bankFees'
}
```

**Obtenció de `categoryId` per comissions:**

```typescript
// Buscar categoria per nameKey (NO per nom visible)
const bankFeesCategory = categories.find(c => c.name === 'bankFees' && c.type === 'expense');
const bankFeesCategoryId = bankFeesCategory?.id;

// Si no existeix → ERR_NO_BANK_FEES_CATEGORY (bloquejant)
```

---

## 9. Model de Dades

**Camp nou a Transaction (opcional):**

| Camp | Tipus | Descripció |
|------|-------|------------|
| `stripePaymentId` | `string \| null` | ID del pagament Stripe (`ch_xxx`) |

**NO s'afegeix:**
- `transactionType` nou (usar `source: 'stripe'`)
- Subcol·leccions noves

**Coherència amb el mestre:**
- Segueix patró de remeses: `source`, `parentTransactionId`
- El moviment bancari pare queda immutable

---

## 10. Estructura de Fitxers

```
/src/components/stripe-importer/
  ├── useStripeImporter.ts    # Hook amb lògica de parsing i matching
  ├── StripeImporter.tsx      # Component UI (modal)
  └── index.ts                # Exports
```

**Punt de connexió:**
- `transaction-table.tsx` → afegir opció al menú si descripció conté "STRIPE"

---

## 11. UI Proposada

**Pas 1: Pujar fitxer**
```
┌─────────────────────────────────────────┐
│ Dividir remesa Stripe                   │
│                                         │
│ Import al banc: 115,55 €                │
│                                         │
│ [Arrossega el CSV aquí]                 │
│                                         │
│ ⚠️ No obrir el CSV amb Excel abans      │
└─────────────────────────────────────────┘
```

**Pas 2: Revisió**
```
┌─────────────────────────────────────────────────────────────┐
│ 3 donacions trobades                                        │
│                                                             │
│ Brut:        120,00 €                                       │
│ Comissions:   -4,45 €                                       │
│ Net:         115,55 € ✅ (quadra amb banc)                  │
│                                                             │
│ ─────────────────────────────────────────────────────────   │
│ ✅ lourdeshoyal@hotmail.com → Lourdes Hoyal     120,00 €    │
│ ⚠️ nou@email.com           → [Assignar]         50,00 €    │
│                                                             │
│                              [Cancel·lar] [Processar]       │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Errors i Missatges

| Codi | Condició | Missatge |
|------|----------|----------|
| `ERR_NO_COLUMNS` | Falten columnes obligatòries | "El CSV no té les columnes necessàries: {columnes}" |
| `ERR_PARSE_DECIMAL` | Format decimal incorrecte | "No s'ha pogut interpretar l'import: {valor}" |
| `ERR_NO_MATCH` | Cap grup quadra amb el banc | "No s'ha trobat cap payout que coincideixi amb l'import {amount} €" |
| `ERR_AMOUNT_MISMATCH` | Import no quadra (> tolerància) | "L'import no quadra. Esperats {expected} €, calculats {actual} €" |
| `ERR_NO_BANK_FEES_CATEGORY` | No existeix categoria `bankFees` | "No s'ha trobat la categoria de despeses bancàries (bankFees) a aquesta organització." |
| `WARN_REFUNDED` | Files amb reemborsament | "S'han exclòs {count} donacions reemborsades. Import exclòs: {amount} €" |
| `WARN_NO_DONOR` | Donació sense match | "{count} donacions pendents d'assignar donant" |

---

## 13. Toleràncies

| Paràmetre | Valor | Nota |
|-----------|-------|------|
| Tolerància import | ±0,02 € | Arrodoniments bancaris |
| Finestra temporal | Desactivada (opcional: ±5 dies) | Per a futurs usos |

---

## 14. Casos Especials

| Cas | Comportament |
|-----|--------------|
| Payout amb múltiples donacions | Agrupar per `Transfer`, mostrar totes |
| Donació sense match email | Mostrar com "Pendent", permetre assignació manual |
| Email duplicat a donants | Mostrar primer match (o llista si ambigüitat) |
| Import no quadra | Error bloquejant, no permetre processar |
| `Amount Refunded > 0` | Excloure + avís amb import exclòs |
| CSV buit o només capçalera | Error: "El fitxer no conté donacions" |

---

## 15. Fora d'Abast (MVP)

- Connexió directa API Stripe
- Sincronització automàtica
- Gestió de subscripcions recurrents
- Processament automàtic de reemborsos
- Creació automàtica de donants

---

## 16. Dependències

**NO afegir:**
- papaparse
- csv-parser
- Qualsevol llibreria CSV externa

**Parser propi minimal** integrat al hook.

---

## Historial de Versions

| Versió | Data | Canvis |
|--------|------|--------|
| 1.0 | Desembre 2025 | Versió inicial |
| 1.1 | Desembre 2025 | Afegit ERR_NO_BANK_FEES_CATEGORY, categoryId per nameKey |
