# Checklist Manual QA - Summa Social

**Temps estimat:** 60–90 minuts
**Prerequisits:** Accés a org de prova o org real amb dades existents (NO crear dades noves)
**Navegador:** Chrome/Safari (mòbil + desktop)

---

## Flux 1: Login + Logout (10 min)

### 1.1 Login scoped per organització
- [ ] Navegar a `/{orgSlug}/login`
- [ ] Introduir credencials vàlides
- [ ] **PASS:** Redirigeix a `/{orgSlug}/dashboard`
- [ ] **PASS:** Sidebar mostra nom de l'organització correcte
- [ ] **PASS:** No hi ha errors a la consola del navegador

### 1.2 Logout determinista
- [ ] Fer clic a "Tancar sessió" al sidebar
- [ ] **PASS:** Redirigeix immediatament a `/{orgSlug}/login`
- [ ] **PASS:** No es mostra dashboard buit durant la transició
- [ ] **PASS:** Tornar enrere (browser back) no mostra dades
- [ ] Intentar accedir a `/{orgSlug}/dashboard` directament
- [ ] **PASS:** Redirigeix a login

### 1.3 Login amb credencials incorrectes
- [ ] Introduir email vàlid + contrasenya incorrecta
- [ ] **PASS:** Mostra missatge d'error clar (no "undefined")
- [ ] **PASS:** No queda en estat de càrrega infinit

**Resultat Flux 1:** ☐ PASS / ☐ FAIL

---

## Flux 2: Importar extracte bancari (15 min)

### 2.1 Import petit (<50 moviments)
- [ ] Anar a Moviments
- [ ] Clicar "Importar"
- [ ] Seleccionar fitxer Excel/CSV amb <50 files
- [ ] Mapear columnes (data, descripció, import)
- [ ] **PASS:** Preview mostra moviments correctament
- [ ] Confirmar import (mode "Afegir")
- [ ] **PASS:** Toast confirma X moviments importats
- [ ] **PASS:** Moviments apareixen a la llista

### 2.2 Import gran (>500 moviments)
- [ ] Repetir amb fitxer de >500 files
- [ ] **PASS:** No error "batch limit exceeded"
- [ ] **PASS:** Log mostra "X lots" processats
- [ ] **PASS:** Tots els moviments apareixen (verificar count)

### 2.3 Import amb duplicats
- [ ] Reimportar el mateix fitxer
- [ ] **PASS:** Sistema detecta duplicats
- [ ] **PASS:** Mostra avís amb count de duplicats
- [ ] **PASS:** Permet continuar o cancel·lar

**Resultat Flux 2:** ☐ PASS / ☐ FAIL

---

## Flux 3: Assignar moviment existent (10 min)

### 3.1 Assignar contacte
- [ ] Obrir detall d'un moviment existent (clic a la fila)
- [ ] Al selector de contacte, cercar un donant/proveïdor existent
- [ ] Seleccionar-lo
- [ ] **PASS:** Contacte queda assignat (badge visible)
- [ ] **PASS:** Canvi es guarda (refrescar pàgina i verificar)

### 3.2 Assignar categoria
- [ ] En el mateix moviment, seleccionar categoria del dropdown
- [ ] **PASS:** Categoria queda assignada
- [ ] **PASS:** Color/badge correspon al tipus (ingrés/despesa)

### 3.3 Editar nota
- [ ] Afegir/modificar nota al moviment
- [ ] **PASS:** Nota es guarda correctament
- [ ] **PASS:** Icona de nota apareix a la llista

**Resultat Flux 3:** ☐ PASS / ☐ FAIL

---

## Flux 4: Verificació de saldos (15 min)

### 4.1 Saldo al dashboard
- [ ] Anar a Dashboard
- [ ] **PASS:** Mostra saldo total coherent (no NaN, no undefined)
- [ ] **PASS:** Desglossament per compte bancari si n'hi ha múltiples

### 4.2 Comparació amb extracte real
- [ ] Obrir extracte bancari real (PDF/web del banc)
- [ ] Comparar saldo final de l'extracte amb saldo a Summa
- [ ] **PASS:** Diferència < 1€ (o 0€ si tot quadra)
- [ ] Si hi ha diferència, verificar:
  - [ ] Moviments pendents d'importar
  - [ ] Duplicats
  - [ ] Dates fora de rang

### 4.3 Filtre per dates
- [ ] Aplicar filtre de dates (últim mes)
- [ ] **PASS:** Moviments es filtren correctament
- [ ] **PASS:** Saldos es recalculen segons filtre

**Resultat Flux 4:** ☐ PASS / ☐ FAIL

---

## Flux 5: Model 182 (15 min)

### 5.1 Generació
- [ ] Anar a Configuració > Fiscal
- [ ] Clicar "Generar Model 182"
- [ ] Seleccionar any fiscal (amb dades existents)
- [ ] **PASS:** Mostra preview amb donants i imports

### 5.2 Descàrrega
- [ ] Clicar "Descarregar"
- [ ] **PASS:** Es descarrega fitxer .txt
- [ ] **PASS:** Fitxer no està buit (> 100 bytes)
- [ ] **PASS:** Nom del fitxer conté any fiscal

### 5.3 Validació bàsica del contingut
- [ ] Obrir fitxer amb editor de text
- [ ] **PASS:** Format sembla correcte (registres amb longitud fixa)
- [ ] **PASS:** NIFs tenen format vàlid (8 dígits + lletra o B/similar)

**Resultat Flux 5:** ☐ PASS / ☐ FAIL

---

## Flux 6: Exportació Excel completa (10 min)

### 6.1 Exportar moviments
- [ ] Anar a Moviments
- [ ] Clicar botó "Exportar"
- [ ] **PASS:** Es descarrega fitxer .xlsx
- [ ] Obrir amb Excel/Numbers
- [ ] **PASS:** Conté dades (no full buit)
- [ ] **PASS:** Columnes: Data, Descripció, Import, Categoria, Contacte

### 6.2 Exportar donants
- [ ] Anar a Donants
- [ ] Clicar "Exportar"
- [ ] **PASS:** Es descarrega fitxer .xlsx
- [ ] **PASS:** Conté llista de donants amb NIF, nom, tipus

### 6.3 Exportar proveïdors
- [ ] Anar a Proveïdors
- [ ] Clicar "Exportar"
- [ ] **PASS:** Es descarrega fitxer .xlsx
- [ ] **PASS:** Conté llista de proveïdors

**Resultat Flux 6:** ☐ PASS / ☐ FAIL

---

## Resum Final

| Flux | Resultat |
|------|----------|
| 1. Login + Logout | ☐ PASS / ☐ FAIL |
| 2. Import extracte | ☐ PASS / ☐ FAIL |
| 3. Assignar moviment | ☐ PASS / ☐ FAIL |
| 4. Saldos | ☐ PASS / ☐ FAIL |
| 5. Model 182 | ☐ PASS / ☐ FAIL |
| 6. Exportació | ☐ PASS / ☐ FAIL |

**Resultat Global:** ☐ PASS (6/6) / ☐ FAIL

**Data:** _______________
**Tester:** _______________
**Versió/Commit:** _______________
**Notes:**

