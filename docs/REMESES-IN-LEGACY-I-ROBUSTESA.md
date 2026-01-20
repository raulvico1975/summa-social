# Remeses IN: Legacy i Robustesa

**Versió:** 1.0
**Data:** 2026-01-20
**Autor:** Raül Vico (CEO/CTO)

---

## 1. Context i problema històric

### Què va passar

El sistema antic de processament de remeses IN tenia deficiències:

- **Duplicació de quotes**: processar dues vegades una remesa podia crear filles duplicades
- **Desalineació de dades**: incoherència entre:
  - `transactions` (filles reals a Firestore)
  - `remittances/{id}.transactionIds[]` (llista de referència)
  - `transactions/{parentId}.remittanceItemCount` (comptador del pare)
- **Soft-delete incomplet**: l'undo no sempre arxivava totes les filles

### Impacte

- Fitxa donant amb imports inflats
- Model 182 incorrecte
- Duplicats visibles al modal de detall de remesa

---

## 2. Principis NO negociables

| Principi | Descripció |
|----------|------------|
| **Una vegada** | Una remesa només es processa una vegada. Mai acumula. |
| **Undo = soft-delete** | Desfer una remesa arxiva filles (`archivedAt`), no les esborra. |
| **Repair ≠ reprocess** | Reparar és corregir quotes existents, no crear-ne de noves. |
| **Dades bones no es toquen** | Si una remesa funciona, no s'hi aplica cap script ni sanitize. |
| **Control humà** | Les remeses legacy es resolen cas a cas, mai en massa. |

---

## 3. Flux actual de remeses IN

### Components

| Component | Funció |
|-----------|--------|
| `remittance-splitter.tsx` | UI client per processar remeses |
| `/api/remittances/in/process` | Crea filles i doc remesa |
| `/api/remittances/in/undo` | Soft-delete de totes les filles + reset pare |
| `/api/remittances/in/repair` | No implementat (recuperació via Desfer → Processar) |
| `/api/remittances/in/check` | Read-only, verifica consistència |
| `/api/remittances/in/sanitize` | Només legacy: reconstrueix metadades sense crear quotes |

### Guardrails

**Client (`remittance-splitter.tsx`):**
- Bloqueja si `isRemittance === true` i hi ha filles actives
- Mostra banner d'inconsistència si `/check` detecta problemes

**Server (`/undo`):**
1. Arxiva per `transactionIds[]` si existeix doc remesa
2. **Fallback legacy**: arxiva qualsevol filla activa per `parentTransactionId`
3. **Post-check**: verifica 0 filles actives o retorna error `UNDO_INCOMPLETE_ACTIVE_CHILDREN`

### Invariants

| Codi | Descripció |
|------|------------|
| R-SUM-1 | Suma filles ≈ import pare (tolerància 2 cèntims) |
| R-COUNT-1 | Nombre filles = `remittanceItemCount` |

---

## 4. Què és una remesa "legacy corrupta"

### Definició

Remesa processada amb el sistema antic que presenta incoherències de dades.

### Símptomes

- **Duplicats visibles**: el modal mostra la mateixa quota dues vegades
- **Import inflat**: fitxa donant mostra el doble del que hauria de ser
- **`/check` inconsistent**: pot dir "consistent" però UI mostra duplicats (per filles arxivades sense `archivedAt`)
- **Doc `remittances/{id}` absent**: les filles existeixen però no hi ha document de referència

### Causa comuna

- Undo incomplet (no va arxivar totes les filles)
- Reprocessament sense undo previ
- Camp `archivedAt` absent o mal format (legacy)

---

## 5. Procediment oficial per remesa legacy

### Prerequisits

- Accés admin a l'organització
- `gcloud auth application-default login` executat
- Identificar `orgId` i `parentTxId` de la remesa afectada

### Passos

#### 1. Verificar estat actual

A Firestore, comprovar quantes filles actives hi ha:

```
organizations/{orgId}/transactions
  where parentTransactionId == {parentTxId}
  where archivedAt == null (o absent)
```

#### 2. Executar script de neteja (dry-run)

```bash
node --import tsx scripts/archive-orphan-remittance-children.ts \
  --org {orgId} \
  --parent {parentTxId} \
  --dry-run
```

Revisar sortida:
- `activeCount` total
- Exemples de filles (verificar que són les correctes)
- Guardrail OK (`isRemittanceItem === true`, `source === "remittance"`)

#### 3. Aplicar neteja

```bash
node --import tsx scripts/archive-orphan-remittance-children.ts \
  --org {orgId} \
  --parent {parentTxId} \
  --apply
```

#### 4. Verificar post-neteja

- Filles actives = 0
- Pare ja no té `isRemittance === true` (o si el té, és coherent)

#### 5. Reprocessar (si cal)

A la UI:
1. Moviments → seleccionar la transacció pare
2. Processar com a remesa IN
3. Verificar:
   - Modal mostra quotes úniques
   - Fitxa donant amb import correcte
   - Total coherent amb import pare

#### 6. Validació final

- Model 182 (si aplica)
- Cap duplicat visible
- `/check` retorna `consistent: true`

---

## 6. Scripts disponibles

### `scripts/archive-orphan-remittance-children.ts`

**Finalitat**: Arxivar (soft-delete) filles òrfenes d'una remesa legacy.

**Quan usar**:
- Remesa legacy amb filles actives que no haurien d'existir
- Després d'un undo incomplet
- Abans de reprocessar una remesa corrupta

**Quan NO usar**:
- Remeses noves (el sistema ja és robust)
- Remeses sense problemes visibles
- En massa (sempre cas a cas)

**Exemple real**:

```bash
# Cas: Remesa Febrer 2025 - Flores de Kiskeya
# orgId: SkQjWvCRDJhSf1OeJAw9
# parentTxId: 0giJNWxjd9XjRZOMJW7L

# 1. Dry-run
node --import tsx scripts/archive-orphan-remittance-children.ts \
  --org SkQjWvCRDJhSf1OeJAw9 \
  --parent 0giJNWxjd9XjRZOMJW7L \
  --dry-run

# 2. Apply (després de verificar dry-run)
node --import tsx scripts/archive-orphan-remittance-children.ts \
  --org SkQjWvCRDJhSf1OeJAw9 \
  --parent 0giJNWxjd9XjRZOMJW7L \
  --apply
```

---

## 7. Decisions conscients

### Per què NO hi ha migració massiva

- Risc alt d'efectes secundaris
- Cada remesa legacy té un context diferent
- Preferim control humà sobre automatització cega

### Per què `/sanitize` no és automàtic

- Només reconstrueix metadades, no arregla filles duplicades
- Útil per casos concrets, no com a solució universal
- Requereix verificació manual post-execució

### Per què preferim control humà

- Les dades fiscals són crítiques
- Un error massiu és pitjor que resoldre cas a cas
- El volum de remeses legacy és finit i manejable

---

## 8. Estat final del sistema

| Àmbit | Estat |
|-------|-------|
| **Remeses noves** | Robustes. Guardrails client + server. Post-check obligatori. |
| **Remeses legacy** | Es resolen manualment cas a cas amb script + verificació. |
| **Risc residual** | Nul per a remeses noves. Controlat per a legacy. |
| **Documentació** | Aquest document. |

---

## Checklist ràpida (1 pàgina)

```
REMESA LEGACY CORRUPTA - CHECKLIST

[ ] 1. Identificar orgId i parentTxId
[ ] 2. Verificar símptomes (duplicats, import inflat)
[ ] 3. gcloud auth application-default login
[ ] 4. Executar dry-run del script
[ ] 5. Revisar sortida (activeCount, exemples, guardrail OK)
[ ] 6. Executar --apply
[ ] 7. Verificar filles actives = 0
[ ] 8. Reprocessar remesa (si cal)
[ ] 9. Verificar fitxa donant
[ ] 10. Verificar Model 182 (si aplica)
[ ] 11. Confirmar: cap duplicat, /check consistent
```

---

**Aquest document és norma del projecte per a remeses IN.**
