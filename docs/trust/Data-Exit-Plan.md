# Data Exit Plan (Pla B)

**Procediment d'exportació i sortida**  
*Versió 1.0 · ÚS INTERN*

---

## 1. Propòsit

Aquest document descriu **el procediment tècnic i operatiu** per executar el Pla B: exportació completa de dades i sortida d'una ONG de Summa Social.

---

## 2. Escenaris d'activació

**El Pla B s'activa en qualsevol d'aquests casos:**

1. **Sortida voluntària de l'ONG**
   * Decisió de migrar a altre sistema
   * Decisió de tornar a Excel
   * Qualsevol altre motiu

2. **Error crític irresoluble**
   * Problema tècnic no resoluble en 30 dies
   * Pèrdua de confiança de l'ONG

3. **Creixement de l'ONG**
   * Pressupost > 500.000 €
   * Necessitat de funcionalitats que Summa no ofereix

4. **Tancament del producte Summa Social**
   * Decisió de Raül de tancar el servei
   * Impossibilitat de continuar mantenint-lo

---

## 3. Principi fonamental

> **Cap ONG pot quedar atrapada dins Summa Social.**

Per tant:

* L'exportació ha de ser **completa**
* L'exportació ha de ser **comprensible** (sense coneixements tècnics)
* L'exportació ha de ser **usable** (directament a Excel o importable a altre sistema)
* El procés ha de ser **ràpid** (màxim 7 dies)
* El cost ha de ser **zero**

---

## 4. Què s'exporta

### 4.1 Contingut de l'exportació

**Fitxer principal: Excel (.xlsx) amb múltiples fulls**

**Full 1: Moviments**

Tots els moviments bancaris registrats.

Camps:
* ID moviment
* Data
* Concepte
* Import
* Tipus (ingrés/despesa)
* Compte bancària (IBAN)
* Categoria
* Subcategoria
* Contacte assignat (nom + NIF)
* Estat (pendent/assignat)
* Data de creació
* Data de modificació
* Notes (si existeixen)

---

**Full 2: Contactes**

Tots els contactes (donants, proveïdors, treballadors).

Camps:
* ID contacte
* Tipus (donant/proveïdor/treballador)
* Nom / Raó social
* NIF/CIF/NIE/Passaport
* Email
* Telèfon
* Adreça completa
* Codi postal
* Població
* Província
* País
* Categoria per defecte
* Notes
* Data de creació
* Actiu (sí/no)

---

**Full 3: Comptes bancàries**

Totes les comptes bancàries de l'ONG.

Camps:
* IBAN
* Nom del compte
* Entitat bancària
* Saldo actual
* Data d'últim moviment
* Estat (actiu/inactiu)

---

**Full 4: Remeses**

Totes les remeses creades (si l'ONG utilitza aquesta funcionalitat).

Camps:
* ID remesa
* Data
* Import total
* Número de moviments inclosos
* Moviments inclosos (llista d'IDs)
* Estat
* Notes

---

**Full 5: Categories**

Totes les categories i subcategories.

Camps:
* Nom categoria
* Tipus (ingrés/despesa)
* Subcategories associades (llista)
* Color (si assignat)

---

**Full 6: Models fiscals generats**

Històric de models fiscals generats.

Camps:
* Any
* Model (182/347)
* Data de generació
* Número de registres
* Link al fitxer generat (si disponible)

---

**Full 7: Configuració**

Configuració general de l'ONG.

Camps:
* Nom de l'organització
* NIF
* Any fiscal
* Moneda
* Regles d'assignació automàtica (si configurades)
* Altres paràmetres personalitzats

---

### 4.2 Fitxers addicionals

**README.txt** (text pla)

Explicació en català de:
* Contingut del fitxer Excel
* Com interpretar les dades
* Següents passos recomanats
* Contacte per a dubtes

**validation.json** (validació tècnica)

```json
{
  "exportDate": "2026-01-04T10:30:00Z",
  "organizationId": "org_abc123",
  "organizationName": "Fundació Exemple",
  "totalMovements": 1523,
  "totalContacts": 234,
  "totalAccounts": 3,
  "totalRemittances": 12,
  "checksum": "a3f2c9d8..."
}
```

---

## 5. Com executar l'exportació

### 5.1 Mètode actual (manual via UI)

**Pas 1: Accedir a Summa Social**

* Login com a SuperAdmin o Admin de l'ONG

**Pas 2: Anar a Configuració > Exportar dades**

* Seleccionar "Exportació completa"
* Confirmar acció

**Pas 3: Generar exportació**

* El sistema genera el fitxer Excel
* Pot trigar 1-5 minuts segons volum de dades

**Pas 4: Descarregar fitxer**

* Descarregar fitxer .xlsx
* Guardar en lloc segur

**Pas 5: Validar exportació**

* Obrir Excel
* Comprovar que hi ha tots els fulls
* Validar número de moviments (comparar amb últim informe)
* Validar saldos finals (comparar amb extractes)

---

### 5.2 Mètode futur (script automatitzat)

**NOTA:** Aquest mètode encara NO està implementat. S'implementarà abans d'arribar a 5 ONGs.

**Esbós del script:**

```bash
# Script a crear: /scripts/export-full.js

# Execució:
npm run export:full -- --orgId=<ID_ORGANIZACIO>

# Output:
# - export_<ORGID>_<TIMESTAMP>.xlsx
# - export_<ORGID>_<TIMESTAMP>_README.txt
# - export_<ORGID>_<TIMESTAMP>_validation.json
```

**Funcionalitats del script:**

* Exportar totes les col·leccions de Firestore de l'ONG
* Generar Excel amb múltiples fulls
* Generar README automàtic
* Generar validació amb checksum
* Pujar fitxers a Google Drive de l'ONG (opcional)

**Prioritat d'implementació:** ALTA (abans de Fase 2)

---

## 6. Procés complet de sortida

### 6.1 Timeline estàndard

**Dia 0: Notificació de sortida**

* ONG notifica voluntat de sortir (email formal)
* Raül confirma rebuda en 24h
* Acordar data d'exportació

**Dia 1-3: Preparació de l'exportació**

* Raül revisa que totes les dades estan correctes
* Executa exportació completa
* Valida fitxers generats

**Dia 3-7: Lliurament i validació**

* Raül envia fitxers a l'ONG (email + Drive)
* ONG descarrega i revisa
* Sessió de validació (opcional, 1h):
  * Revisar junts les dades exportades
  * Resoldre dubtes sobre camps
  * Validar que tot està present

**Dia 7-14: Període de transició**

* ONG pot accedir a Summa Social (només lectura)
* ONG migra dades a nou sistema
* Raül disponible per a consultes

**Dia 14-30: Confirmació de migració**

* ONG confirma que té totes les dades al nou sistema
* ONG confirma que ja no necessita accés a Summa

**Dia 30-90: Període de conservació**

* Dades mantingudes a Firestore (només accessible per Raül)
* ONG pot sol·licitar nova exportació si cal
* Backup setmanal segueix actiu (opcional)

**Dia 90: Esborrat definitiu**

* Notificació a l'ONG 15 dies abans
* Esborrat complet de Firestore
* Confirmació d'esborrat enviada a l'ONG
* Tancament definitiu

---

### 6.2 Excepcions al timeline

**Si l'ONG vol esborrat immediat:**

* Exportació en 3 dies
* Esborrat en 7 dies (en lloc de 90)
* Però avisar que és irreversible

**Si hi ha obligacions legals de conservació:**

* Factures emeses (6 anys per llei espanyola)
* Models fiscals presentats (4 anys)
* Conservació anonimitzada si escau
* Notificar a l'ONG els terminis legals

---

## 7. Documentació lliurada amb l'exportació

### 7.1 README.txt (plantilla)

```
EXPORTACIÓ COMPLETA - SUMMA SOCIAL
===================================

Organització: [Nom de l'ONG]
NIF: [NIF]
Data d'exportació: [Data i hora]
Període de dades: [Data inici] - [Data fi]

---

CONTINGUT DEL FITXER EXCEL
---------------------------

Aquest fitxer conté totes les dades de la vostra organització
que estaven emmagatzemades a Summa Social.

Fulls del document:

1. MOVIMENTS
   - Tots els moviments bancaris registrats
   - Ordenats per data (més recent primer)
   - Inclou: data, concepte, import, compte, categoria, contacte

2. CONTACTES
   - Donants, proveïdors, treballadors
   - Inclou: nom, NIF, adreça, email, telèfon, categoria per defecte

3. COMPTES BANCÀRIES
   - IBAN i saldo actual de cada compte
   - Hauria de coincidir amb els extractes bancaris

4. REMESES
   - Remeses creades (si n'heu utilitzat)
   - Inclou: data, import total, moviments inclosos

5. CATEGORIES
   - Categories i subcategories utilitzades
   - Tipus: ingrés o despesa

6. MODELS FISCALS
   - Històric de models 182/347 generats
   - Data de generació i número de registres

7. CONFIGURACIÓ
   - Paràmetres generals de l'organització
   - Regles d'assignació automàtica (si configurades)

---

COM VALIDAR LES DADES
----------------------

1. Comparar número de moviments amb el vostre últim informe
2. Validar saldos finals amb els extractes bancaris
3. Comprovar que els contactes principals hi són tots
4. Revisar que les categories són correctes

Si detecteu alguna diferència o falta alguna dada,
contacteu amb Raül en els propers 30 dies.

---

SEGÜENTS PASSOS RECOMANATS
---------------------------

1. Guardar aquest fitxer en lloc segur (amb còpia de seguretat)
2. Validar que totes les dades són correctes
3. Importar a nou sistema (si escau):
   - Per a Excel: ja està llest per utilitzar
   - Per a altre software: utilitzar fulls CSV
4. Conservar aquest fitxer almenys 6 anys (obligació legal)

---

SUPORT POST-EXPORTACIÓ
-----------------------

Durant els propers 30 dies, podeu contactar per:
- Dubtes sobre les dades exportades
- Aclariments sobre camps o formats
- Orientació per a migració a altre sistema

Contacte: raul@summasocial.cat
Horari: Dilluns-divendres, 9-18h

---

ATENCIÓ: DADES SENSIBLES
-------------------------

Aquest fitxer conté informació sensible de la vostra organització
(dades financeres, dades personals de donants i proveïdors).

Recomanacions de seguretat:
- Guardar en carpeta protegida amb contrasenya
- No compartir per email sense xifrar
- No pujar a núvols públics sense protecció
- Esborrar còpies innecessàries

---

Gràcies per haver confiat en Summa Social.

Raül Vico
Summa Social
2026
```

---

### 7.2 Guia de migració (segons destí)

**Si l'ONG va a Excel:**

* El fitxer ja està llest per utilitzar
* Poden filtrar i pivotar segons necessitats
* Recomanar mantenir backups

**Si l'ONG va a altre software:**

* Explicar com exportar cada full a CSV
* Orientar sobre camps obligatoris del nou sistema
* Recomanar validar saldos després d'importar

**Si l'ONG va a sistema comptable:**

* El full "Moviments" és la base
* Hauran d'associar categories a pla comptable del nou sistema
* Recomanar recalcular saldos

---

## 8. Suport post-exportació

### 8.1 Què ofereix Raül (inclòs)

**Sessió de revisió (1 hora):**

* Validació conjunta de dades exportades
* Aclariments sobre camps
* Orientació per a migració (general)

**Suport per email (30 dies):**

* Consultes sobre dades exportades
* Dubtes sobre formats
* Aclariments tècnics

---

### 8.2 Què NO ofereix Raül

**Importació a nou sistema:**

* No és responsabilitat de Raül
* Pot orientar, però no executar

**Formació en nou sistema:**

* Fora de l'abast del servei

**Manteniment de dades després d'exportació:**

* Les dades són responsabilitat de l'ONG

---

## 9. Checklist d'execució del Pla B

**Per utilitzar cada cop que s'activa el Pla B:**

### ☐ FASE 1: NOTIFICACIÓ I PREPARACIÓ

- [ ] Rebuda notificació de sortida de l'ONG
- [ ] Confirmació enviada en 24h
- [ ] Data d'exportació acordada
- [ ] Motiu de sortida documentat (intern)

---

### ☐ FASE 2: EXPORTACIÓ

- [ ] Revisió prèvia de dades (coherència, saldos)
- [ ] Execució d'exportació completa
- [ ] Validació de fitxers generats:
  - [ ] Excel amb tots els fulls
  - [ ] README.txt generat
  - [ ] validation.json generat
- [ ] Validació de contingut:
  - [ ] Número de moviments correcte
  - [ ] Saldos finals correctes
  - [ ] Contactes principals presents
  - [ ] Categories completes

---

### ☐ FASE 3: LLIURAMENT

- [ ] Fitxers enviats a l'ONG (email + Drive)
- [ ] Sessió de validació agendada (si escau)
- [ ] ONG confirma recepció
- [ ] ONG valida contingut

---

### ☐ FASE 4: TRANSICIÓ

- [ ] Accés de l'ONG canviat a només lectura
- [ ] Disponibilitat per a consultes durant 30 dies
- [ ] ONG confirma migració completa
- [ ] ONG confirma que ja no necessita accés

---

### ☐ FASE 5: CONSERVACIÓ I ESBORRAT

- [ ] Dades mantingudes a Firestore (30-90 dies segons cas)
- [ ] Notificació d'esborrat enviada 15 dies abans
- [ ] Esborrat complet de Firestore executat
- [ ] Confirmació d'esborrat enviada a l'ONG
- [ ] Documentació interna actualitzada (ONG ja no activa)

---

### ☐ DOCUMENTACIÓ POST-SORTIDA

- [ ] Motiu de sortida documentat
- [ ] Feedback recollit (què va bé, què no)
- [ ] Lliçons apreses documentades
- [ ] Millores proposades (si escau)

---

**FI DEL DATA EXIT PLAN**
