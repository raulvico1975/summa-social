# Skill: Firestore writes — Anti-bugs

## Regles

### 1. Mai `undefined` a Firestore

Firestore no accepta `undefined`. Dues opcions:

```ts
// Ometre el camp (correcte)
{ name: "foo" }

// Posar null explícitament (correcte)
{ name: "foo", archived: null }

// PROHIBIT — dona error o comportament imprevisible
{ name: "foo", archived: undefined }
```

### 2. Batch ≤ 50 operacions

Firestore limita cada `writeBatch` a 500 operacions, però el nostre invariant operatiu és **≤ 50** per batch per seguretat i mantenibilitat.

### 3. Updates de contactes — preferir Admin SDK

Quan l'update pot tocar camps sensibles (arxivat, permisos, imports massius), preferir la ruta API existent amb Admin SDK:

```
/api/contacts/import
```

No fer updates client-side si poden interferir amb camps d'arxivat o permisos.
