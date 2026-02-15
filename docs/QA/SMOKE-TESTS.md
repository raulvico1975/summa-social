# Smoke Tests - Summa Social

**Temps estimat:** 5–10 minuts
**Quan executar:** Abans de cada deploy a producció, abans d'onboarding de nova org
**Requisits:** NO crear ni eliminar dades. Només verificar que funciona.

---

## Checklist ràpid (15 checks)

### Autenticació (3 checks)
- [ ] **S1** Login: `/{orgSlug}/login` carrega sense errors
- [ ] **S2** Login OK: Credencials vàlides redirigeixen a dashboard
- [ ] **S3** Logout: Clic a "Tancar sessió" redirigeix a login immediatament

### Navegació bàsica (4 checks)
- [ ] **S4** Dashboard: `/dashboard` mostra cards de resum (saldo, moviments recents)
- [ ] **S5** Moviments: `/dashboard/movimientos` carrega llista de transaccions
- [ ] **S6** Donants: `/dashboard/donants` carrega llista (o empty state)
- [ ] **S7** Configuració: `/dashboard/configuracion` carrega sense error

### Funcionalitat core (4 checks)
- [ ] **S8** Detall moviment: Clic a un moviment obre modal/drawer amb detalls
- [ ] **S9** Cerca: Cercar un text a Moviments filtra resultats
- [ ] **S10** Filtre dates: Aplicar filtre de dates funciona
- [ ] **S11** Saldo: Dashboard mostra saldo numèric (no NaN, no "undefined")

### Exports (2 checks)
- [ ] **S12** Export donants: Botó "Exportar" a Donants descarrega fitxer
- [ ] **S12b** Export moviments filtrats (WYSIWYG): Aplicar filtres a Moviments → clic icona descàrrega → Excel amb mateixes files i ordre que la taula

### Errors (2 checks)
- [ ] **S13** Consola neta: DevTools Console no mostra errors greus (vermells) en navegació normal
- [ ] **S14** 404 controlat: Anar a ruta inexistent mostra pàgina d'error (no pantalla blanca)

---

## Resultat

| # | Check | OK |
|---|-------|-----|
| S1 | Login carrega | ☐ |
| S2 | Login OK | ☐ |
| S3 | Logout | ☐ |
| S4 | Dashboard | ☐ |
| S5 | Moviments | ☐ |
| S6 | Donants | ☐ |
| S7 | Configuració | ☐ |
| S8 | Detall moviment | ☐ |
| S9 | Cerca | ☐ |
| S10 | Filtre dates | ☐ |
| S11 | Saldo | ☐ |
| S12 | Export donants | ☐ |
| S12b | Export moviments filtrats | ☐ |
| S13 | Consola neta | ☐ |
| S14 | 404 controlat | ☐ |

**Total:** ___/15

**Data:** _______________
**Entorn:** ☐ Local / ☐ Producció
**Org testada:** _______________
