# QA P0 — Verificació Fiscal Pre-Deploy

> **Obligatori** abans de qualsevol push a master que toqui:
> Moviments, Remeses, Devolucions, Donants, Certificats, Imports, Permisos

---

## 1. Propòsit

Aquest checklist assegura que els fluxos fiscals crítics no tenen regressions abans d'anar a producció.

**Quan executar-lo:**
- Abans de qualsevol push a master que toqui codi fiscal
- Després de canvis a `ReturnImporter`, `RemittanceProcessor`, `fiscal-*.ts`, `certificate-*.ts`
- Abans de deploy que afecti moviments o donants

---

## 2. Checklist P0 (PASS/FAIL)

### P0-1 Remesa IN amb IBAN ambigu

**Passos:**
1. Obrir `/{org}/dashboard/movimientos`
2. Localitzar una remesa pare (IN) amb filles pendents
3. Dividir remesa → apareix modal de resolució
4. Seleccionar cas "2 donants amb aquest IBAN"
5. Resoldre assignant a un dels donants
6. Processar

**Expected:**
- [ ] No bloqueig durant el flux
- [ ] Comptadors del pare a 0 després de processar
- [ ] Filles creades amb `contactId` assignat correctament
- [ ] Filles visibles a la fitxa del donant

---

### P0-2 Remesa IN amb IBAN no trobat

**Passos:**
1. Obrir remesa pare amb IBAN desconegut
2. Verificar que es veu l'IBAN complet (no truncat)
3. Copiar IBAN amb botó de còpia
4. Opció A: Assignar a suggerit per DNI
5. Opció B: Deixar pendent

**Expected:**
- [ ] No bloqueja el flux
- [ ] IBAN complet visible i copiable
- [ ] Pendents visibles al llistat amb indicador clar
- [ ] Cap contacte duplicat creat automàticament

---

### P0-3 Devolucions conjuntes (ReturnImporter contextual)

**Passos:**
1. Obrir remesa pare amb devolucions associades
2. Clicar "Importar devolucions" (des del context del pare)
3. Importar fitxer XML/CSV de devolucions
4. Seleccionar opció `FORCE_RECREATE` si s'ofereix
5. Processar

**Expected:**
- [ ] Filles creades amb `transactionType = 'return'`
- [ ] Import negatiu (`amount < 0`)
- [ ] `contactId` present a cada filla
- [ ] Devolucions visibles a la fitxa del donant
- [ ] Net del donant actualitzat correctament

---

### P0-4 Fitxa donant (query per contactId) + net correcte

**Passos:**
1. Obrir fitxa d'un donant amb donacions i devolucions
2. Verificar secció de moviments fiscals

**Expected:**
- [ ] Net = Donacions − Devolucions
- [ ] Càlcul no depèn de l'estat del donant (actiu/inactiu)
- [ ] Tots els moviments amb `contactId` apareixen
- [ ] Ordenació cronològica correcta

---

### P0-5 Certificat 2025

**Passos:**
1. Generar certificat de donació per a un donant amb moviments
2. Verificar import total al certificat

**Expected:**
- [ ] Import del certificat = net de la fitxa donant
- [ ] Usa el mateix motor de càlcul que la fitxa
- [ ] Format fiscal correcte (import en lletres, NIF, etc.)

---

### P0-6 Undo de processament

**Passos:**
1. Localitzar remesa pare processada
2. Clicar "Desfer" (Undo)
3. Confirmar al diàleg
4. Tornar a processar la remesa

**Expected:**
- [ ] Filles passen a estat arxivat (soft-delete)
- [ ] Pare torna a estat inicial (comptadors reset)
- [ ] Reprocessament genera filles noves correctament
- [ ] No hi ha filles duplicades

---

### P0-7 Locks multiusuari

**Passos:**
1. Obrir dues pestanyes/navegadors amb el mateix usuari o usuaris diferents
2. A pestanya A: iniciar processament d'una remesa
3. A pestanya B: intentar processar o desfer la mateixa remesa

**Expected:**
- [ ] Una pestanya guanya (processa correctament)
- [ ] L'altra rep missatge "Operació bloquejada per un altre usuari"
- [ ] No hi ha corrupció de dades
- [ ] El lock s'allibera després de completar/cancel·lar

---

### P0-14 archivedAt exclòs fiscalment (CRÍTIC)

**Passos:**
1. Localitzar un donant amb donacions (anotar net actual)
2. Processar una remesa que crea filles assignades a aquest donant
3. Verificar que el net del donant ha augmentat
4. Executar "Desfer remesa" (Undo)
5. Tornar a obrir fitxa donant
6. Generar certificat de donació (si aplica)

**Expected:**
- [ ] Després de l'undo, les filles tenen `archivedAt` amb timestamp
- [ ] Fitxa donant NO mostra les filles arxivades
- [ ] Net del donant torna a l'import original (abans de processar)
- [ ] Certificat NO inclou les quotes arxivades

---

## 3. Resultat de la sessió

| Data | Executor | P0-1 | P0-2 | P0-3 | P0-4 | P0-5 | P0-6 | P0-7 | P0-14 | Notes |
|------|----------|------|------|------|------|------|------|------|-------|-------|
| YYYY-MM-DD | Nom | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |

---

## 4. Què fer si hi ha FAIL

1. **NO fer push** a master
2. Documentar el FAIL amb detall (passos, error, screenshot)
3. Obrir issue o fix directe
4. Tornar a executar tot el checklist P0 després del fix

---

*Última actualització: 2026-01-19*
