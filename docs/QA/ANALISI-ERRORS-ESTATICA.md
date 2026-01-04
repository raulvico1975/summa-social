# Anàlisi d'Errors Estàtica - Summa Social

**Temps estimat:** 2–3 hores
**Objectiu:** Detectar patrons de risc P0/P1 mitjançant grep i lectura ràpida
**Abast:** `src/` (components, hooks, firebase, lib)

---

## Patrons a cercar

### P0-1: onSnapshot sense cleanup

**Risc:** Memory leak, listeners zombies, errors post-unmount
**Comanda:**
```bash
rg "onSnapshot" src/ --type ts --type tsx -l
```

**Verificació manual:**
Per cada fitxer trobat, verificar que:
1. `onSnapshot` està dins un `useEffect`
2. Retorna `unsubscribe` al cleanup: `return () => unsubscribe()`

**Fitxers coneguts (ja revisats):**
- `src/firebase/firestore/use-doc.tsx` - OK (cleanup a línia 98)
- `src/firebase/firestore/use-collection.tsx` - OK (cleanup a línia 118)

**Trobades pendents de revisar:**

| Fitxer | Línia | Té cleanup? | Fix |
|--------|-------|-------------|-----|
| | | | |

---

### P0-2: writeBatch dins loops sense chunking

**Risc:** Error "batch limit exceeded" amb >500 operacions
**Comanda:**
```bash
rg "writeBatch" src/ --type ts --type tsx -A 10 | head -100
```

**Verificació manual:**
Buscar patrons com:
```typescript
items.forEach(item => {
  batch.set(...) // PERILL si items > 500
})
```

**Fitxers coneguts (ja corregits):**
- `src/components/transaction-importer.tsx` - OK (chunking implementat)

**Trobades pendents:**

| Fitxer | Línia | Chunking? | Fix |
|--------|-------|-----------|-----|
| | | | |

---

### P0-3: permission-denied no gestionat

**Risc:** Pantalla d'error genèrica o crash durant logout
**Comanda:**
```bash
rg "permission-denied|PERMISSION_DENIED" src/ --type ts --type tsx
```

**Verificació manual:**
Verificar que errors de permisos:
1. No mostren pàgina d'error si `auth === null` (logout en curs)
2. Mostren missatge útil a l'usuari si autenticat

**Fitxers coneguts (ja corregits):**
- `src/firebase/firestore/use-doc.tsx` - OK (guard auth === null)
- `src/firebase/firestore/use-collection.tsx` - OK (guard auth === null)

---

### P1-1: Redirects que perden orgSlug

**Risc:** Usuari acaba a `/login` genèric en lloc de `/{org}/login`
**Comanda:**
```bash
rg "router\.(push|replace).*login" src/ --type ts --type tsx
rg "window\.location.*login" src/ --type ts --type tsx
```

**Verificació manual:**
Tot redirect a login ha d'incloure `orgSlug`:
- OK: `router.push(\`/${orgSlug}/login\`)`
- MALAMENT: `router.push('/login')`

**Fitxers coneguts (ja corregits):**
- `src/components/AuthRedirectGuard.tsx` - OK (usa orgSlug)

**Trobades pendents:**

| Fitxer | Línia | Inclou orgSlug? | Fix |
|--------|-------|-----------------|-----|
| | | | |

---

### P1-2: console.error sense feedback UI

**Risc:** Error silenciós, usuari no sap què ha passat
**Comanda:**
```bash
rg "console\.error" src/ --type ts --type tsx -B 2 -A 5 | head -200
```

**Verificació manual:**
Per cada `console.error`, verificar si:
1. Hi ha `toast` o `setError` proper
2. És una operació crítica (save, delete, import)

**Patró correcte:**
```typescript
} catch (error) {
  console.error('Error saving:', error);
  toast({ variant: 'destructive', title: 'Error', description: '...' });
}
```

**Trobades pendents:**

| Fitxer | Línia | Té toast/UI? | Crític? | Fix |
|--------|-------|--------------|---------|-----|
| | | | | |

---

### P1-3: Promeses sense catch

**Risc:** Unhandled promise rejection
**Comanda:**
```bash
rg "\.then\(" src/ --type ts --type tsx -B 1 -A 3 | rg -v "\.catch" | head -100
```

**Verificació manual:**
Buscar `.then()` sense `.catch()` corresponent.
Acceptable si està dins try/catch o és fire-and-forget intencional.

**Trobades pendents:**

| Fitxer | Línia | Gestionat? | Fix |
|--------|-------|------------|-----|
| | | | |

---

### P1-4: Accessos a propietats potencialment undefined

**Risc:** Runtime error "Cannot read property of undefined"
**Comanda:**
```bash
rg "\?\." src/components --type tsx -c | sort -t: -k2 -nr | head -20
```

**Verificació manual:**
Fitxers amb molts `?.` poden tenir accessos arriscats.
Prioritzar revisar components que reben props de Firestore.

---

## Resum de Trobades

### P0 (Crítics - Arreglar abans de deploy)

| ID | Patró | Fitxer | Status |
|----|-------|--------|--------|
| | | | |

### P1 (Importants - Arreglar aquesta setmana)

| ID | Patró | Fitxer | Status |
|----|-------|--------|--------|
| | | | |

---

## Comandes útils addicionals

```bash
# Buscar TODOs/FIXMEs pendents
rg "TODO|FIXME|HACK|XXX" src/ --type ts --type tsx

# Buscar console.log que s'haurien d'eliminar
rg "console\.log" src/ --type ts --type tsx -l

# Buscar any explícit (potencial type safety issue)
rg ": any" src/ --type ts --type tsx -c | sort -t: -k2 -nr | head -10

# Buscar imports no utilitzats
npx eslint src/ --rule "no-unused-vars: warn" --format compact 2>/dev/null | head -30
```

---

**Data revisió:** _______________
**Revisor:** _______________
**Commit base:** _______________
