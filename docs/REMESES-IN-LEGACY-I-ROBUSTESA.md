# Remeses IN: Legacy i Robustesa

**Versió:** 1.1
**Data:** 2026-01-21
**Autor:** Raül Vico (CEO/CTO)

---

## 1. Context i causa

### Diferència entre remeses IN i remeses OUT

| Tipus | Descripció | Import | Impacte fiscal |
|-------|------------|--------|----------------|
| **IN (cobrament)** | Quotes de socis via SEPA | Positiu | Model 182, certificats donació |
| **OUT (devolució)** | Devolucions de quotes | Negatiu | Cap (es reflecteix com a devolució) |

### Dades legacy amb desalineació

El sistema antic podia generar incoherències entre:

- `transactions` (filles reals a Firestore)
- `remittances/{id}.transactionIds[]` (llista de referència al doc)
- `transactions/{parentId}.remittanceItemCount` (comptador del pare)

**Causes:**
- Undo incomplet (no arxivava totes les filles)
- Reprocessament sense undo previ
- Camp `archivedAt` absent o mal format

**Impacte:**
- Fitxa donant amb imports inflats (duplicats)
- Model 182 incorrecte
- Duplicats visibles al modal de detall

---

## 2. Criteris de veritat

### Definició de "filla activa"

Una transacció filla és **activa** si:

```
archivedAt == null || archivedAt == undefined || archivedAt == ""
```

Tota altra filla (amb `archivedAt` vàlid) es considera **arxivada** i s'exclou.

### Model 182 i certificats

Només compten les filles **actives**:

- La suma de donacions d'un donant és la suma de filles actives amb `contactId` del donant
- Les devolucions (`transactionType === 'return'`) resten del total
- Filles arxivades **no** apareixen ni sumen

### Remeses OUT excloses

El sistema de consistència (check, sanitize, banner) **només s'aplica a remeses IN**.

Per a OUT / devolucions:
- No hi ha invariants de filles actives
- No es mostra banner d'inconsistència
- No hi ha "reparació" possible ni necessària

---

## 3. Flux correcte

### Remeses IN: Processar → Desfer → Reprocessar

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PROCESSAR  │ ──► │   DESFER    │ ──► │ REPROCESSAR │
│  /process   │     │   /undo     │     │  /process   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Crea filles        Arxiva filles       Crea filles
  + doc remesa       (archivedAt)        noves
```

**Regles:**
- Mai processar dues vegades sense desfer
- Desfer sempre arxiva, mai esborra
- Reprocessar parteix de zero (filles noves)

### Remeses OUT: sense flux de reparació

Les devolucions (imports negatius) es reflecteixen directament:
- No es "reparen"
- No es reprocessen
- Simplement es registren com a sortida

---

## 4. Sanejament legacy

### Quan usar `/sanitize` (endpoint)

L'endpoint `/api/remittances/in/sanitize` serveix per reconstruir metadades d'una remesa legacy **sense crear quotes noves**.

**Casos d'ús:**
- `remittances/{id}.transactionIds[]` desalineat amb filles reals
- Doc remesa absent però filles existents
- Comptadors (`remittanceItemCount`, `totalAmount`) incorrectes

### Resultats esperats

| Acció | Descripció |
|-------|------------|
| `REBUILT_DOC` | S'ha reconstruït el doc remesa amb les filles actives reals |
| `MARKED_UNDONE_LEGACY` | No hi havia filles actives; s'ha marcat la remesa com a `undone` |

### Quan usar l'script (CLI)

L'script `scripts/archive-orphan-remittance-children.ts` serveix per arxivar filles òrfenes **quan el doc remesa no existeix o és irrecuperable**.

**Casos d'ús:**
- Filles actives sense doc `remittances/{id}`
- Filles que haurien d'estar arxivades però no ho estan
- Neteja prèvia a un reprocessament

### Logs i traçabilitat

Totes les accions deixen traça:

| Camp | Valor |
|------|-------|
| `archivedAt` | ISO timestamp |
| `archivedReason` | `'undo_remittance'` o `'legacy_orphan_cleanup'` |
| `archivedFromAction` | `'undo_remittance_in'`, `'undo_remittance_in_legacy_fallback'`, `'script_orphan_cleanup'` |
| `archivedByUid` | UID de l'usuari o `'script'` |

---

## 5. QA de validació

### Checks mínims abans de donar per bo

#### 1. Fitxa donant

- [ ] Import total de l'any correcte (sense duplicats)
- [ ] Nombre de donacions coherent
- [ ] Devolucions reflectides correctament

#### 2. Model 182

- [ ] Suma de donacions = suma de filles actives
- [ ] Donants amb DNI vàlid apareixen
- [ ] Recurrència calculada correctament (2 anys anteriors)

#### 3. Moviments (UI)

- [ ] Modal de remesa mostra quotes úniques (no duplicats)
- [ ] Total del modal coincideix amb import del pare
- [ ] No apareix banner d'inconsistència (si és IN) o no aplica (si és OUT)

#### 4. Firestore (si cal verificar)

```
Query: organizations/{orgId}/transactions
  where parentTransactionId == {parentTxId}

Verificar:
- Filles actives (sense archivedAt): 0 si està desfeta, N si processada
- Filles arxivades: totes tenen archivedAt vàlid
- No hi ha duplicats (mateix contactId + date + amount actius)
```

---

## 6. Components del sistema

| Component | Funció |
|-----------|--------|
| `remittance-splitter.tsx` | UI client per processar remeses |
| `/api/remittances/in/process` | Crea filles i doc remesa |
| `/api/remittances/in/undo` | Soft-delete de totes les filles + reset pare |
| `/api/remittances/in/check` | Read-only, verifica consistència (només IN) |
| `/api/remittances/in/sanitize` | Reconstrueix metadades sense crear quotes |
| `archive-orphan-remittance-children.ts` | Script CLI per arxivar filles òrfenes |

### Guardrails

**Client:**
- Bloqueja si `isRemittance === true` i hi ha filles actives
- Mostra banner si `/check` detecta problemes (només IN)

**Server (`/undo`):**
1. Arxiva per `transactionIds[]` si existeix doc
2. Fallback: arxiva per `parentTransactionId`
3. Post-check: exigeix 0 filles actives

**Server (`/check`):**
- Retorna `skipped: true` per imports negatius (OUT)
- Només valida invariants per IN

---

## 7. Procediment per remesa legacy

### Prerequisits

- Accés admin a l'organització
- `gcloud auth application-default login` (per script CLI)
- Identificar `orgId` i `parentTxId`

### Passos

1. **Verificar símptomes**: duplicats, import inflat, banner d'inconsistència
2. **Dry-run script**: `--dry-run` per veure què s'arxivarà
3. **Aplicar neteja**: `--apply` si dry-run és correcte
4. **Verificar**: filles actives = 0
5. **Reprocessar** (si cal): des de la UI
6. **QA final**: fitxa donant, Model 182, UI sense duplicats

### Exemple

```bash
# Dry-run
node --import tsx scripts/archive-orphan-remittance-children.ts \
  --org SkQjWvCRDJhSf1OeJAw9 \
  --parent 0giJNWxjd9XjRZOMJW7L \
  --dry-run

# Apply
node --import tsx scripts/archive-orphan-remittance-children.ts \
  --org SkQjWvCRDJhSf1OeJAw9 \
  --parent 0giJNWxjd9XjRZOMJW7L \
  --apply
```

---

## 8. Decisions conscients

| Decisió | Motiu |
|---------|-------|
| **No migració massiva** | Risc alt, cada cas és diferent |
| **`/sanitize` no automàtic** | Requereix verificació humana |
| **Control cas a cas** | Dades fiscals són crítiques |
| **OUT exclòs** | No té invariants de filles actives |

---

## 9. Estat final del sistema

| Àmbit | Estat |
|-------|-------|
| **Remeses IN noves** | Robustes. Guardrails + post-check. |
| **Remeses IN legacy** | Resoltes cas a cas amb script/sanitize. |
| **Remeses OUT** | Excloses del sistema de consistència. |
| **Risc residual** | Nul per a noves. Controlat per a legacy. |

---

## Checklist ràpida

```
REMESA LEGACY - VALIDACIÓ

[ ] 1. Identificar orgId i parentTxId
[ ] 2. Verificar símptomes (duplicats, import inflat)
[ ] 3. Executar dry-run (script o /check)
[ ] 4. Aplicar neteja si cal
[ ] 5. Verificar filles actives = 0 (o coherent)
[ ] 6. Reprocessar si cal
[ ] 7. QA: fitxa donant correcta
[ ] 8. QA: Model 182 correcte
[ ] 9. QA: UI sense duplicats
[ ] 10. Confirmar: /check consistent (només IN)
```

---

**Aquest document és norma del projecte per a remeses.**
