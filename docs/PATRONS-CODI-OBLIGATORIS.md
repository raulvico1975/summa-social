# PATRONS-CODI-OBLIGATORIS

Aquest document defineix patrons **obligatoris** a Summa Social per mantenir estabilitat, consistència i mantenibilitat.

## 1) Firestore: mai escriure `undefined`
- Firestore no accepta `undefined`.
- Regla: **o bé omets el camp**, o bé escrius `null` quan el valor és desconegut.

Exemple:
- ✅ `contactId: donorId ?? null`
- ✅ (millor) no incloure `contactId` si no hi ha valor
- ❌ `contactId: donor?.id` (pot acabar sent `undefined`)

## 2) Camps opcionals: construir objectes de forma explícita
Quan hi ha camps opcionals, construir l'objecte i afegir-los només si existeixen.

Exemple:
```typescript
const item: { iban: string; amount: number; date?: string; originalName?: string } = {
  iban,
  amount,
  date: date ? toISODate(date) : undefined,
};
if (originalName) item.originalName = originalName;
```

## 3) Batching a Firestore: màxim 50 operacions per batch

- Regla: no superar 50 writes per batch.
- Regla: si hi ha molts elements, fragmentar en batches.
- Regla: afegir un petit delay entre batches si hi ha UI/UX sensible (imports llargs).

## 4) Matching: transaccions "consumides" amb `Set<string>`

Quan es fa matching (p. ex. retorns/remeses):

- Regla: per evitar dobles assignacions, usar `Set<string>` per marcar IDs ja utilitzats.
- Prohibit: reutilitzar una transacció "pending" per més d'un match.

Patró:
```typescript
const used = new Set<string>();
const match = list.find(tx => !used.has(tx.id));
if (match) used.add(match.id);
```

## 5) Dates: criteri únic i conversió defensiva quan cal

- Regla funcional: la data de transacció s'emmagatzema com a `string` YYYY-MM-DD.
- Regla pràctica: si en algun flux pot arribar `Date`/`Timestamp`, s'accepta un helper defensiu (`getTxDate`) per convertir-ho de forma consistent.
- Evitar duplicar conversió en múltiples llocs: si un mateix patró es repeteix, extreure a una utilitat compartida.

## 6) Normalització abans de comparar o deduplicar

- Regla: normalitzar abans de fer matching/deduplicació.
- Aplicar com a mínim a:
  - IBAN
  - DNI/NIE
  - emails
  - noms (si s'usen per matching)

---

## Canvis i excepcions

Qualsevol excepció a aquests patrons ha d'estar justificada dins del PR (nota curta al description o comentari al codi).
