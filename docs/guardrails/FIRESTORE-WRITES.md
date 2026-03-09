# Skill: Firestore writes - anti-bugs

## Regles no negociables

### 1. Mai `undefined` a Firestore

Firestore no accepta `undefined`.

Correcte:

```ts
{ name: 'foo' }
{ name: 'foo', archivedAt: null }
```

Prohibit:

```ts
{ name: 'foo', archivedAt: undefined }
```

Patrons recomanats al repo:

- Ometre camps opcionals en construir l'objecte
- Fer servir `src/lib/safe-write.ts` (`safeSet`, `safeUpdate`, `safeAdd`) en rutes sensibles
- Fer servir `stripUndefinedDeep` quan prepares payloads grans o nested

### 2. Batch <= 50 operacions

Límit tècnic de Firestore: 500.
Invariant operatiu de Summa Social: `<= 50` per batch.

Per tant:

- No copiïs el límit 500 a fluxos d'app, API o imports normals
- Fragmenta sempre en chunks de 50
- Reutilitza `BATCH_SIZE = 50` quan ja existeixi al mòdul

### 3. Updates sensibles: millor via Admin SDK / API existent

Si el canvi toca camps protegits, arxivat, permisos o importacions massives, evita writes client-side directes.

Rutes i serveis actuals:

- Contactes: `src/services/contacts.ts` -> `POST /api/contacts/import`
- Categories: `src/services/categories.ts` -> `POST /api/categories/update`
- Arxivats/reassignacions: preferir les API routes ja existents abans que escriure directament des del client

### 4. Mantén invariants i metadata d'escriptura

Quan la ruta ja usa `safe-write`, conserva el patró:

- neteja `undefined`
- valida camps obligatoris/imports
- afegeix `writeMeta`

No el saltis amb un `.set()` o `.update()` manual si el mòdul ja té guardrails.
