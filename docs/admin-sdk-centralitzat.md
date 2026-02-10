# Admin SDK centralitzat (v1.40)

## Què era
Cada ruta API (`/api/categories/archive`, `/api/projects/archive`, etc.) tenia el seu propi codi d'inicialització de Firebase Admin SDK, verificació de token i validació de membership. Unes 100 línies duplicades per fitxer, en 14 fitxers.

## Què és ara
Un fitxer compartit `src/lib/api/admin-sdk.ts` amb:
- `getAdminApp()` / `getAdminDb()` / `getAdminAuth()` — inicialització singleton cached
- `verifyIdToken(request)` — extreu i verifica el Bearer token
- `validateUserMembership(db, uid, orgId)` — comprova membership i retorna rol
- `BATCH_SIZE = 50` — invariant Summa (mai superar 50 operacions per batch Firestore)

## Rutes migrades
- `/api/categories/archive`
- `/api/projects/archive`
- `/api/bank-accounts/archive`
- `/api/expense-reports/archive`
- `/api/contacts/archive`
- `/api/contacts/import`

## Impacte
- Cap canvi de comportament per l'usuari
- Mateixa lògica exacta, moguda a un mòdul compartit
- Manteniment més fàcil: qualsevol canvi d'autenticació es fa en un sol lloc

## Health Check nous blocs
- **Bloc K:** Remeses òrfenes (fills amb pare inexistent)
- **Bloc L:** ExpenseLinks orfes (links a transaccions inexistents)
- Només diagnòstic, sense autocorrecció
