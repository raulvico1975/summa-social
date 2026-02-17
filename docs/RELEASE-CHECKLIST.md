# Release checklist (manual, 5 minuts)

## Abans de push
- `node scripts/check-build-env.mjs` (credencials mínimes per build)
- `npm run check` (tsc + tests + build) → ha de donar `CHECK_OK`
- `git diff --stat` revisat

## Després de deploy a producció (incògnit, sense extensions)
1) `/admin`
   - Carrega
   - 0 `permission-denied` a consola

2) `/{orgSlug}/dashboard`
   - Carrega
   - 0 errors greus a consola

3) `/{orgSlug}/quick-expense`
   - Carrega (sense 404)
   - Flux mínim operatiu

4) `/{orgSlug}/dashboard/super-admin`
   - Accés correcte per superadmin
   - Cap `permission-denied`

5) `/{orgSlug}/dashboard/movimientos/pendents`
   - Provar pujada d'un fitxer
   - 0 `storage/unauthorized`

## Regla
Si apareix qualsevol:
- `permission-denied`
- `storage/unauthorized`
- 404 a rutes que haurien d'existir

→ STOP. No es dona la release per bona.
