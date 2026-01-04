# Onboarding Playbook

**Procediment complet d'incorporació d'ONGs**  
*Versió 1.0 · ÚS INTERN*

---

## 1. Propòsit d'aquest document

Aquest playbook estableix **el procediment pas a pas** per incorporar una nova ONG a Summa Social.

És un document **operatiu i executable**, no normatiu.

S'ha d'utilitzar literalment amb cada nova ONG per garantir:
* Coherència en el servei
* Detecció primerenca de problemes
* Formació completa dels usuaris
* Estabilitat des del primer dia

---

## 2. Fases del procés

```
PRE-QUALIFICACIÓ (2-3h)
    ↓
QUALIFICACIÓ FORMAL (1h)
    ↓
PREPARACIÓ TÈCNICA (3-4h)
    ↓
SESSIÓ 1: Revisió dades (2-3h)
    ↓
SESSIÓ 2: Importació (3-4h)
    ↓
SESSIÓ 3: Formació (2-3h)
    ↓
PRIMERA SETMANA: Suport intensiu
    ↓
SESSIÓ 4: Seguiment al mes (1-2h)
    ↓
PAS A MANTENIMENT
```

**Temps total estimat:** 20-25 hores (distribuïdes en 6-8 setmanes)

---

## 3. PRE-QUALIFICACIÓ

**Objectiu:** Determinar si l'ONG encaixa amb Summa Social abans d'invertir temps.

### 3.1 Primera conversa (30-45 min)

**Temes a tractar:**

1. **Situació actual de l'ONG**
   * Quin sistema utilitzen ara (Excel, altre software)
   * Qui gestiona la comptabilitat
   * Quines són les principals dificultats
   * Volum aproximat de moviments/mes

2. **Expectatives**
   * Què esperen aconseguir amb Summa Social
   * Quin nivell d'autonomia volen tenir
   * Quina disponibilitat tenen per a formació

3. **Presentació honest de Summa Social**
   * Què fa i què NO fa
   * Model de servei (consultoria + eina)
   * Creixement controlat (places limitades)
   * Atenció directa i personalitzada
   * Exportació garantida

**Atenció:** NO posicionar com "eina miracle", sinó com **solució sòlida amb limitacions clares**.

---

### 3.2 Validació de criteris bàsics

**Criteris d'acceptació (TOTS obligatoris):**

✅ Pressupost anual < 300.000 €  
✅ Volum de moviments < 1.000/mes (orientatiu)  
✅ Disponibilitat per a 4 sessions de formació  
✅ Mínim 2 persones implicades en gestió econòmica  
✅ Accés a dades històriques (Excel o sistema anterior)  
✅ Capacitat de presa de decisions (qui signa és qui decideix)

**Criteris de descart (qualsevol d'aquests):**

❌ ONG amb pressupost > 500.000 €  
❌ Necessiten ERP complet (gestió de projectes, RRHH, etc.)  
❌ Volen self-service total sense acompanyament  
❌ No accepten limitacions funcionals  
❌ Pressa extrema (necessiten estar operatius en < 2 setmanes)  
❌ Expectatives de disponibilitat 24/7

---

### 3.3 Decisió de continuar

**Si tots els criteris s'acompleixen:**
→ Passar a **Qualificació Formal**

**Si algun criteri falla:**
→ Explicar amb honestedat per què no encaixen  
→ Recomanar alternatives (si escau)  
→ Deixar porta oberta per al futur

---

## 4. QUALIFICACIÓ FORMAL

**Objectiu:** Validació final i signatura de condicions.

### 4.1 Enviament de documentació (precontractual)

**Documents a enviar:**

1. **Descripció de Summa Social** (1-2 pàgines)
   * Què fa
   * Abast funcional
   * Limitacions

2. **Condicions de servei** (resum executiu)
   * Model de creixement controlat
   * Temps de resposta orientatius
   * Dret a exportació i sortida
   * Pricing

3. **Procés d'onboarding** (resum)
   * 4 sessions + suport intensiu
   * Temps estimat
   * Implicació necessària de l'ONG

**Termini de resposta:** 7 dies

---

### 4.2 Reunió de confirmació (1h)

**Agenda:**

1. Revisió de documentació enviada
2. Resolució de dubtes
3. Validació de calendari (dates aproximades de sessions)
4. Identificació de persones clau de l'ONG
5. Signatura de Service Agreement

**Lliurables d'aquesta reunió:**

* Contracte signat
* Calendari d'onboarding acordat
* Contactes principals identificats
* Accés a dades actuals garantit

---

## 5. PREPARACIÓ TÈCNICA

**Objectiu:** Tenir l'entorn tècnic llest abans de la Sessió 1.

**Responsable:** Raül  
**Temps estimat:** 3-4 hores  
**Quan:** Entre signatura i Sessió 1

### 5.1 Creació de instància Firebase

```bash
# Crear nou project Firebase
# Configurar Firestore
# Configurar Authentication
# Configurar Hosting (si escau)
# Configurar Security Rules específiques per l'ONG
```

---

### 5.2 Configuració inicial a Firestore

**Col·leccions a crear:**

* `organizations/{orgId}` → Document de l'organització
* `organizations/{orgId}/users` → Usuaris de l'ONG
* `organizations/{orgId}/movements` → (buida, es poblarà a Sessió 2)
* `organizations/{orgId}/contacts` → (buida, es poblarà a Sessió 2)
* `organizations/{orgId}/accounts` → (buida, es poblarà a Sessió 2)

**Camps bàsics del document d'organització:**

```javascript
{
  name: "Nom de l'ONG",
  nif: "G12345678",
  createdAt: timestamp,
  status: "onboarding",
  settings: {
    fiscalYear: 2026,
    currency: "EUR",
    // ...
  }
}
```

---

### 5.3 Creació d'usuaris inicials

**Mínim 2 usuaris:**

1. **Administrador principal** (rol: admin)
2. **Usuari secundari** (rol: user o admin segons cas)

**Enviament de credencials:**

* Email amb link d'activació
* Instruccions per configurar contrasenya
* Recordatori de reunió Sessió 1

---

### 5.4 Configuració de backup automàtic

**Activar backup setmanal:**

* Destinació: Google Drive de l'ONG
* Freqüència: Cada diumenge 23:00h
* Retenció: 4 setmanes
* Format: Excel amb tots els fulls

**Validar que funciona:**
* Executar backup manual
* Verificar que arriba a Drive de l'ONG

---

## 6. SESSIÓ 1: Revisió de dades actuals

**Durada:** 2-3 hores  
**Participants:** Raül + responsable econòmic ONG + (opcional) comptable  
**Format:** Videoconferència o presencial

### 6.1 Inventari de dades (60 min)

**Comptes bancàries:**

* IBAN de cada compte
* Nom/àlies del compte
* Entitat bancària
* Saldo inicial (data de referència)

**Exemple de taula a emplenar:**

| IBAN | Nom | Entitat | Saldo inicial | Data |
|------|-----|---------|---------------|------|
| ES12... | Compte corrent | Triodos | 12.345,67 € | 01/01/2025 |
| ES34... | Compte estalvi | BBVA | 5.000,00 € | 01/01/2025 |

---

**Moviments històrics:**

* Període a migrar (recomanat: últims 12 mesos mínim)
* Format actual (Excel, CSV, extractes PDF)
* Volum aproximat de moviments
* Qualitat de les dades (completes, incompletes, duplicades)

---

**Contactes existents:**

* Donants principals (amb NIF si disponible)
* Proveïdors habituals (amb NIF/CIF)
* Treballadors (si escau)

---

**Categories utilitzades:**

* Quines categories fan servir actualment
* Si cal adaptar-les o crear-ne de noves
* Mapeig entre categories antigues i noves

---

### 6.2 Identificació de problemes (30 min)

**Problemes habituals a detectar:**

* Dades duplicades (mateix moviment 2 cops)
* Formats inconsistents (dates en diferents formats)
* Informació incompleta (moviments sense concepte)
* Desquadraments existents (saldos que no quadren)
* Necessitats específiques (categories personalitzades)

**Decisió conjunta:**
* Què es migra tal qual
* Què es neteja abans de migrar
* Què es deixa enrere (dades massa antigues o problemàtiques)

---

### 6.3 Definició d'abast (30 min)

**Acordar:**

1. **Període històric a importar**
   * Exemple: "01/01/2025 fins avui"

2. **Dades a migrar**
   * Comptes bancàries: SÍ
   * Moviments: SÍ (període acordat)
   * Contactes: SÍ (els principals)
   * Models fiscals anteriors: NO (es generaran de nou si cal)

3. **Categories personalitzades**
   * Quines categories calen
   * Subcategories específiques

4. **Configuració de regles d'assignació**
   * Si volen assignació automàtica o manual

---

### 6.4 Lliurables de Sessió 1

**Document compartit amb:**

* Inventari de comptes bancàries
* Període de migració acordat
* Llista de contactes principals
* Categories personalitzades a crear
* Problemes detectats i com es resoldran

**Accions abans de Sessió 2:**

**Raül:**
* Preparar script d'importació
* Crear categories personalitzades a Firestore
* Netejar dades si escau

**ONG:**
* Enviar fitxers amb dades a migrar (Excel, CSV)
* Validar que no falten dades crítiques

---

## 7. SESSIÓ 2: Importació i configuració

**Durada:** 3-4 hores  
**Participants:** Raül + responsable econòmic ONG  
**Format:** Videoconferència (amb compartició de pantalla)

### 7.1 Importació de dades (90-120 min)

**Ordre d'importació:**

**1. Comptes bancàries**
* Crear cada compte manualment a la UI
* Validar IBAN i nom
* Introduir saldo inicial

**2. Categories i subcategories**
* Crear categories personalitzades
* Configurar tipus (ingrés/despesa)
* Assignar colors (opcionals)

**3. Contactes**
* Importar donants principals
* Importar proveïdors habituals
* Importar treballadors (si escau)
* Assignar categoria per defecte a cadascun

**4. Moviments històrics**
* Importar via script o manualment (segons volum)
* Validar que tots els moviments apareixen
* Comprovar que les dates són correctes

---

**Validació post-importació:**

✅ Número de moviments importats = número de moviments originals  
✅ Saldos finals calculats = saldos reals dels extractes  
✅ Tots els contactes principals presents  
✅ Categories assignades correctament

**Si hi ha desquadraments:**
→ Revisar origen del problema abans de continuar

---

### 7.2 Configuració d'usuaris (30 min)

**Validar que tots els usuaris poden accedir:**

* Login amb credencials
* Canvi de contrasenya (si escau)
* Assignació de rols correcta
* Permisos validats

**Provar accions bàsiques:**
* Veure moviments
* Crear un moviment de prova
* Exportar dades (validar que funciona)

---

### 7.3 Configuració específica (30-60 min)

**Regles d'assignació automàtica (si escau):**

* Configurar matching per nom de contacte
* Provar amb moviments reals
* Ajustar threshold si cal

**Categories per defecte:**

* Assignar categoria a cada contacte principal
* Provar que funciona en crear moviment nou

**Remeses (si l'ONG les utilitza):**

* Explicar concepte
* Configurar primera remesa de prova

---

### 7.4 Lliurables de Sessió 2

**Estat del sistema:**

* Comptes bancàries creades ✅
* Moviments històrics importats ✅
* Contactes principals creats ✅
* Categories configurades ✅
* Usuaris operatius ✅
* Backup funcionant ✅

**Document de migració:**

* Resum de dades importades
* Problemes resolts durant la importació
* Configuracions aplicades
* Validacions realitzades

---

## 8. SESSIÓ 3: Formació d'usuaris

**Durada:** 2-3 hores  
**Participants:** Raül + tots els usuaris de l'ONG (2-4 persones)  
**Format:** Videoconferència o presencial (preferiblement presencial)

### 8.1 Operativa diària (45 min)

**Pujar extracte bancari:**

* Descarregar extracte del banc (Excel o CSV)
* Pujar a Summa Social
* Processar moviments nous
* Validar que tots els moviments s'han importat

**Assignar moviments:**

* Revisar moviments pendents
* Assignar contacte (donant, proveïdor, treballador)
* Assignar categoria/subcategoria
* Marcar com assignat

**Revisar desquadraments:**

* Què és un desquadrament
* Com detectar-lo
* Com resoldre'l (buscar moviment perdut, corregir import, etc.)

---

### 8.2 Operativa mensual (45 min)

**Conciliació bancària:**

* Comparar saldo Summa vs. saldo extracte
* Detectar diferències
* Corregir si escau

**Revisió de saldos:**

* Validar que tots els comptes quadren
* Comprovar que no hi ha moviments duplicats
* Revisar moviments sense assignar

**Generació d'informes:**

* Informe de moviments per període
* Informe per categories
* Informe per contacte (donant/proveïdor)

---

### 8.3 Operativa anual (45 min)

**Model 182:**

* Què és i quan es presenta
* Com generar-lo des de Summa Social
* Validar dades abans de generar
* Exportar fitxer per a presentació

**Model 347:**

* Què és i quan es presenta
* Threshold de 3.005,06 €
* Com generar-lo des de Summa Social
* Validar operacions abans de generar

**Certificats de donació:**

* Quan es fan
* Com generar-los (individual o massiu)
* Personalització (si escau)
* Enviament a donants

**Tancament d'exercici (si està implementat):**

* Concepte de tancament
* Com executar-lo
* Validacions prèvies

---

### 8.4 Gestió de contactes (30 min)

**Crear/editar donants:**

* Camps obligatoris vs. opcionals
* NIF/NIE/Passaport
* Adreça per a certificats
* Categoria per defecte

**Crear/editar proveïdors:**

* Camps obligatoris
* NIF/CIF
* Categoria per defecte
* Notes internes

**Historial de donacions:**

* Com veure donacions d'un donant
* Exportar historial
* Generar certificat històric

---

### 8.5 Lliurables de Sessió 3

**Usuaris formats en:**

* Operativa diària ✅
* Operativa mensual ✅
* Operativa anual ✅
* Gestió de contactes ✅

**Documents lliurats:**

* **Checklist d'operacions mensuals** (A4, 1 pàgina)
* **Checklist d'operacions anuals** (A4, 1 pàgina)
* **Contactes de suport** (email, telèfon, horaris)
* **Accés a documentació** (manual d'usuari)

---

## 9. PRIMERA SETMANA: Suport intensiu

**Objectiu:** Garantir que l'ONG pot operar de manera autònoma.

### 9.1 Contacte diari

**Dies 1-7 després de Sessió 3:**

* Email cada dia: "Com va el dia? Algun dubte?"
* Disponibilitat per a consultes immediates
* Resolució reactiva de problemes

**Temes habituals:**

* "No trobo com fer X"
* "He fet una cosa i no sé si està bé"
* "Aquest moviment no sé com assignar-lo"

---

### 9.2 Validació de primers processos

**Validar que l'ONG fa correctament:**

* Pujar extracte bancari
* Assignar moviments nous
* Revisar saldos
* Generar informe simple

**Si detectes errors:**
→ Corregir immediatament  
→ Explicar per què era erroni  
→ Assegurar que ho entenen

---

## 10. SESSIÓ 4: Seguiment al mes

**Durada:** 1-2 hores  
**Participants:** Raül + responsable econòmic ONG  
**Format:** Videoconferència  
**Quan:** 4-6 setmanes després de Sessió 3

### 10.1 Revisió de primers processos reals (45 min)

**Validar que han fet:**

* Primer tancament mensual (si escau)
* Primers informes generats
* Primers certificats de donació (si escau)
* Conciliació bancària

**Revisar qualitat:**

* Moviments ben assignats?
* Categories coherents?
* Saldos quadren?
* Algun desquadrament detectat i resolt?

---

### 10.2 Ajustos de configuració (30 min)

**Possibles ajustos:**

* Categories massa granulars o massa àmplies
* Regles d'assignació que no funcionen bé
* Contactes que falten
* Millores en el flux de treball

**Implementar ajustos en directe:**

* Crear noves categories
* Ajustar regles d'assignació
* Afegir contactes que falten

---

### 10.3 Resolució de dubtes (30 min)

**Preguntes habituals:**

* "Com faig X que no vam veure a formació?"
* "Això que he fet està bé?"
* "Què passa si...?"

**Validar autonomia:**

* L'ONG pot operar sense suport diari? ✅/❌
* Entenen els processos mensuals? ✅/❌
* Saben on buscar ajuda? ✅/❌

---

### 10.4 Decisió de pas a manteniment

**Si tot està OK:**

➡️ **Passar a fase de manteniment**
* Contacte mensual proactiu
* Disponibilitat reactiva
* Revisió trimestral (opcional)

**Si encara hi ha dubtes:**

➡️ **Allargar suport setmanal 2-4 setmanes més**  
➡️ **Nova sessió de seguiment**

---

## 11. PAS A MANTENIMENT

**Estat final:**

* ONG operativa de manera autònoma ✅
* Tots els usuaris formats ✅
* Processos mensuals clars ✅
* Backup setmanal funcionant ✅
* Contactes de suport coneguts ✅

---

**Calendari de manteniment:**

* **Contacte mensual proactiu:**  
  Email/trucada 1 cop al mes: "Com va tot? Cap incidència?"

* **Disponibilitat reactiva:**  
  Email/telèfon per a consultes o incidències

* **Revisió trimestral (opcional):**  
  Sessió de 30-60 min per revisar estat general

---

**Canal de comunicació preferent:**

* Email principal: suport@summasocial.cat
* WhatsApp/Telegram: només incidències crítiques
* Trucada: només si acordat prèviament

---

**Expectatives de suport:**

* Temps de resposta segons SLA
* No disponibilitat 24/7
* Manteniment evolutiu (millores contínues)

---

## 12. Feedback i millora contínua

**Després de cada onboarding:**

**Què documentar:**

* Problemes detectats durant la migració
* Preguntes freqüents dels usuaris
* Ajustos de configuració necessaris
* Temps real dedicat vs. estimat
* Satisfacció de l'ONG (qualitativa)

**Què millorar:**

* Aquest playbook (afegir casos no contemplats)
* Documentació per a usuaris (FAQ)
* Scripts d'importació (automatitzar més)
* Funcionalitats (segons feedback)

---

**FI DE L'ONBOARDING PLAYBOOK**
