# Sistema de Permisos (Projectes + Moviments)

## Persistència Firestore

- Document per usuari i organització: `organizations/{orgId}/members/{userId}`
- Els permisos granulars s'emmagatzemen al mateix document de membre (no a `users/{uid}` global).
- Això garanteix separació multi-org per disseny.

### Esquema

```json
{
  "role": "user",
  "userOverrides": {
    "deny": [
      "sections.moviments",
      "projectes.manage"
    ]
  },
  "userGrants": [
    "projectes.expenseInput"
  ],
  "updatedAt": "<Firestore serverTimestamp()>"
}
```

- `userOverrides.deny`: `string[]` de claus conegudes (deny explícit).
- `userGrants`: `string[]` de claus grantables per usuari.
- `updatedAt`: timestamp de servidor Firestore (`FieldValue.serverTimestamp()`).
- Defaults implícits:
  - si `userOverrides` no existeix: `deny = []`
  - si `userGrants` no existeix: `grants = []`
  - `effectivePermissions` sempre parteix de `roleDefaults`.

## Compatibilitat enrere i migració

- No cal migració/backfill.
- Membres sense `userOverrides` i/o `userGrants` hereten 100% `roleDefaults`.
- Comportament retrocompatible per documents antics.

## Validació d'escriptura server-side

- Ruta d'escriptura: `POST /api/members/user-permissions`
- Fitxer: `src/app/api/members/user-permissions/route.ts`
- Enforça:
  - autenticació Firebase ID token
  - actor membre admin de l'org (o SuperAdmin global)
  - target amb `role === "user"` (Admin/SuperAdmin no passen per aquest flux)
  - claus conegudes (rebutja desconegudes)
  - famílies no grantables (rebutja escriptures, no filtra silenciosament)
  - exclusió mútua persistent `projectes.manage` vs `projectes.expenseInput`

## Famílies no grantables a User

- `configuracio.*`
- `membres.*`
- `categories.*`

On s'enforça:

- Motor: `src/lib/permissions.ts` (`sanitizeUserGrants` + `isUserGrantablePermission`)
- Validació d'escriptura: `src/lib/permissions-write.ts` + `POST /api/members/user-permissions`

## Distinció formal: secció vs acció

- `sections.moviments` controla accés a la ruta/menu de `/moviments`.
- `moviments.read` controla lectura de dades bancàries.
- Regla Moviments: `sections.moviments AND moviments.read`.
- Regla banc dins Projectes: `projectes.manage AND moviments.read` (independent de `sections.moviments`).
- Exemple explícit (Criteri #4):
  - `moviments.read = true`
  - `sections.moviments = false`
  - `projectes.manage = true`
  - Resultat: `/moviments` inaccesible, però banc visible dins Projectes.

## Guards d'API (condicions literals)

- `GET /moviments` -> `sections.moviments && moviments.read`
- `GET /projectes/:id/moviments` -> `projectes.manage && moviments.read`

## Índex Firestore obligatori

Per evitar `500` a `GET /api/projectes/:id/moviments` (query amb `where('projectId','==', ...)` + `orderBy('date','desc')`), cal un índex compost:

- Collection: `transactions`
- Scope: `COLLECTION`
- Camps:
  - `projectId` `ASCENDING`
  - `date` `DESCENDING`

## Matriu Projectes (capacitats excloents)

- `projectes.manage`
  - gestió completa de projecte
  - banc visible només amb `moviments.read`
- `projectes.expenseInput`
  - alta quick/off-bank i justificants
  - no veu banc mai

Exclusió mútua persistent:

- mode `expenseInput` es desa com:
  - `userOverrides.deny` inclou `projectes.manage`
  - `userGrants` inclou `projectes.expenseInput`
- mode `manage` elimina aquests dos overrides/grants anteriors.

## Catàleg tancat

- No es poden afegir permisos fora del catàleg tancat sense actualitzar:
  - `src/lib/permissions.ts`
  - `docs/PERMISSIONS-SYSTEM.md`
  - tests de permisos (`src/lib/__tests__/permissions*.test.ts`)
