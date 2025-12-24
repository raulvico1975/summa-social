# SUMMA SOCIAL - Manual d'Usuari

**Versió**: 1.8  
**Data**: Desembre 2025  
**Per a**: Usuaris de l'aplicació

---

## Índex

1. [Primers Passos](#1-primers-passos)
2. [Dashboard: Entendre les teves Finances](#2-dashboard-entendre-les-teves-finances)
3. [Gestió de Moviments](#3-gestió-de-moviments)
4. [Divisor de Remeses (Quotes de Socis)](#4-divisor-de-remeses-quotes-de-socis)
5. [Gestió de Devolucions Bancàries](#5-gestió-de-devolucions-bancàries)
6. [Donacions via Stripe](#6-donacions-via-stripe) ← NOU
7. [Gestió de Contactes](#7-gestió-de-contactes)
8. [Informes Fiscals](#8-informes-fiscals)
9. [Projectes / Eixos d'Actuació](#9-projectes--eixos-dactuació)
10. [Configuració](#10-configuració)
11. [Resolució de Problemes](#11-resolució-de-problemes)
12. [Glossari](#12-glossari)

---

## Com llegir aquest manual segons el teu rol

No tots els usuaris fan servir Summa Social de la mateixa manera. Segons el teu rol, **no cal que llegeixis tot el manual**.

### Si ets Administració / Gestió econòmica

Llegeix especialment:
- **1. Primers Passos** (inclòs el Flux recomanat d'ús)
- **2. Dashboard**
- **3. Gestió de Moviments**
- **4. Divisor de Remeses**
- **5. Gestió de Devolucions**
- **6. Donacions via Stripe**
- **8. Informes Fiscals**
- **9. Projectes / Eixos d'Actuació**
- **10. Configuració** (especialment Zona de Perill)
- **11. Resolució de Problemes**

> És el rol que utilitza totes les funcionalitats i pren decisions clau.

---

### Si ets Usuari/a de terreny o suport operatiu

Llegeix només:
- **1. Primers Passos**
- **3. Gestió de Moviments** (ús bàsic)
- **7. Gestió de Contactes** (visió general)
- **9.5 Captura de despeses de terreny** (si escau)

**No cal que entenguis:**
- Informes fiscals
- Projectes complexos
- Zona de perill

> La teva funció és recollir i introduir informació, no justificar-la.

---

### Si ets Direcció / Junta

Llegeix:
- **1. Primers Passos** (inclòs el Flux recomanat d'ús)
- **2. Dashboard** (especialment 2.2-2.5)
- **8. Informes Fiscals**
- **9. Projectes / Eixos d'Actuació** (visió general)

Això et permet:
- Entendre les dades
- Interpretar informes
- Demanar el que toca a l'equip

---

### Si només tens rol Viewer

Aquest manual és principalment informatiu per a tu.
- Pots consultar el Dashboard i informes
- No pots modificar dades

---

## 1. Primers Passos

### 1.1 Accedir a l'aplicació

**Pas a pas:**

1. Obre el navegador (Chrome, Firefox, Safari o Edge)
2. Ves a **https://summasocial.app**
3. Introdueix el teu **email** i **contrasenya**
4. Clica **"Iniciar sessió"**

> 💡 **Primer cop?** L'administrador t'haurà enviat una invitació per email amb les instruccions per crear el teu compte.

> ⚠️ **Seguretat**: La sessió es tanca automàticament quan tanques el navegador. Si uses un ordinador compartit, tanca sempre la sessió manualment clicant el teu nom → "Tancar sessió".

---

### 1.2 Navegació bàsica

L'aplicació té un **menú lateral** amb les següents seccions:

| Icona | Secció | Què hi trobaràs |
|-------|--------|-----------------|
| 📊 | **Dashboard** | Resum financer, alertes, gràfics |
| 💰 | **Moviments** | Transaccions bancàries, importador |
| ❤️ | **Donants** | Gestió de donants i socis |
| 🏢 | **Proveïdors** | Gestió de proveïdors |
| 👷 | **Treballadors** | Gestió d'empleats |
| 📁 | **Eixos d'actuació** | Projectes i àrees de treball |
| 📄 | **Informes** | Model 182, Model 347, Certificats |
| ⚙️ | **Configuració** | Dades org, categories, membres |

---

### 1.3 Canviar l'idioma

L'aplicació està disponible en **Català**, **Espanyol** i **Francès**.

1. Clica ⚙️ **Configuració** al menú lateral
2. A **"Preferències"**, busca **"Idioma"**
3. Selecciona l'idioma desitjat
4. El canvi s'aplica immediatament

> 💡 El canvi d'idioma s'aplica **només al teu usuari**, no a tota l'organització.

---

### 1.4 Tancar sessió

1. Clica el teu **nom** a la part inferior del menú
2. Clica **"Tancar sessió"**

---

### 1.5 Flux recomanat de treball (LLEGIR ABANS DE COMENÇAR)

Summa Social està pensat per treballar de manera **progressiva**. No intentis fer-ho tot el primer dia. Aquest és l'ordre recomanat:

**1. Configuració inicial**
   - Dades de l'organització (nom, CIF, adreça)
   - Categories comptables
   - Membres de l'equip

**2. Importar l'extracte bancari**
   - Importa els moviments del banc
   - No cal categoritzar-ho tot al moment

**3. Revisar i categoritzar moviments**
   - Assigna categoria i contacte
   - Divideix remeses si cal

**4. Crear o completar donants/proveïdors**
   - Només quan sigui necessari
   - Completa DNI i Codi Postal per obligacions fiscals

**5. Assignar projectes (opcional)**
   - Només si treballes amb subvencions o projectes

**6. Revisar alertes del Dashboard**
   - Moviments sense categoritzar
   - Donants amb dades incompletes

**7. Generar informes fiscals**
   - Model 182
   - Model 347
   - Certificats de donació

> 💡 **Consell**: Summa Social està pensat per anar-se ordenant amb l'ús. És millor deixar una dada pendent que inventar-la.

---

### 1.6 El primer mes amb Summa Social (expectatives realistes)

#### Què és normal el primer mes

Durant les primeres setmanes amb Summa Social és habitual que:
- Hi hagi molts moviments pendents de categoritzar
- Apareguin alertes al Dashboard
- Faltin dades de donants (DNI, Codi Postal)
- Algunes remeses s'hagin de repetir
- Tinguis la sensació que "hi ha massa coses"

**Això és normal.** Summa Social no exigeix que tot estigui perfecte des del primer dia.

---

#### Prioritats reals del primer mes

Centra't només en això:

1. **Importar correctament els moviments bancaris**
2. **Categoritzar el gruix dels moviments**
3. **Identificar donants i proveïdors principals**
4. **Dividir remeses correctament**
5. **Entendre les alertes del Dashboard**

La resta pot esperar.

---

#### Errors habituals (i com no preocupar-se)

| Situació | Resposta |
|----------|----------|
| "No tinc tots els justificants" | Puja'ls quan els tinguis. No bloqueja el sistema. |
| "No he assignat projectes" | No és obligatori. Fes-ho només si realment els necessites. |
| "Veig moltes alertes" | Són indicadors, no errors greus. Serveixen per prioritzar. |
| "He fet alguna cosa malament" | Gairebé tot és reversible (especialment remeses). |

---

#### Quan Summa Social comença a "respirar"

Normalment, després de **1-2 mesos**:
- Les alertes baixen
- Les categories ja estan creades
- Els donants principals tenen dades completes
- Els informes fiscals surten nets
- La gestió diària és molt més ràpida

**Aquest és l'objectiu del sistema.**

> 💡 **Idea clau**: Summa Social no és una foto perfecta del passat. És una eina per ordenar el present i arribar bé al futur.

---

## 2. Dashboard: Entendre les teves Finances

El Dashboard és la pantalla principal on veus l'estat financer de la teva organització d'un cop d'ull.

### 2.1 Bloc Celebracions 🎉

Apareix quan hi ha fites positives. Exemples:

- ✅ "Totes les transaccions categoritzades"
- 📈 "Balanç positiu"
- ❤️ "X donants han contribuït"
- 🎯 "Tot al dia, bona feina!"
- 🎁 "Primera donació del mes"

> 💡 **Consell**: Si no veus el bloc de celebracions, revisa les alertes per saber què tens pendent.

---

### 2.2 Targetes principals

| Targeta | Què significa |
|---------|---------------|
| **Ingressos** | Total de diners entrants |
| **Despeses operatives** | Diners sortints (excloent transferències a contraparts) |
| **Balanç operatiu** | Ingressos menys despeses |
| **Transferències a contraparts** | Enviaments a organitzacions sòcies internacionals |

> 💡 **Transferències a contraparts**: Són els fons que envieu a entitats associades per executar activitats de cooperació. No es compten com a despesa operativa perquè són part de la missió.

---

### 2.3 Bloc Donacions i Socis

| Mètrica | Comparativa |
|---------|-------------|
| Donacions rebudes | vs any anterior |
| Donants actius | vs any anterior |
| Socis actius | vs any anterior |
| Quotes de socis | vs any anterior |

**Indicadors:**
- 🟢 Fletxa amunt = Millora respecte l'any passat
- 🔴 Fletxa avall = Empitjora respecte l'any passat

---

### 2.4 Bloc Obligacions Fiscals

| Obligació | Data límit | Què has de fer |
|-----------|------------|----------------|
| **Model 182** | 31 de gener | Declaració de donatius rebuts |
| **Model 347** | 28 de febrer | Operacions amb tercers >3.005€ |

**Colors del compte enrere:**
- 🟢 Verd = Més de 60 dies, tranquil
- 🟡 Groc = 30-60 dies, comença a preparar
- 🔴 Vermell = Menys de 30 dies, urgent!

---

### 2.5 Bloc Alertes

Les alertes t'indiquen què necessita la teva atenció:

| Alerta | Què significa | Acció |
|--------|---------------|-------|
| X moviments sense categoritzar | Transaccions pendents de classificar | Clica → et porta a la taula filtrada |
| X donants amb dades incompletes | Falta NIF o codi postal | Clica → et porta als donants filtrats |
| X moviments sense contacte | Moviments sense assignar | Clica → et porta a la taula filtrada |
| **X devolucions pendents** | Rebuts retornats per assignar | Clica → et porta al gestor de devolucions |

---

### 2.6 Filtrar per dates

El filtre de dates afecta **TOTES** les dades del Dashboard.

| Filtre | Exemple |
|--------|---------|
| Any complet | "Any 2025" |
| Trimestre | "T1 2025" (gener-març) |
| Mes | "Gener 2025" |
| Personalitzat | Del 15/03 al 30/06 |
| Tot | Sense filtre temporal |

---

## 3. Gestió de Moviments

### 3.1 Importar extracte bancari

**Pas a pas:**

1. Ves a 💰 **Moviments**
2. Clica el botó **"Importar"** (a dalt a la dreta)
3. Arrossega el fitxer o clica per seleccionar-lo
4. Revisa que les columnes s'han detectat correctament
5. Clica **"Vista prèvia"**
6. Revisa els moviments i els duplicats detectats
7. Clica **"Importar X moviments"**

**Formats suportats:**
- CSV (detecció automàtica de separador)
- Excel (.xlsx, .xls)

> 💡 **Duplicats**: El sistema detecta automàticament moviments que ja existeixen (mateixa data, descripció i import). Els mostra en gris i no els importa dues vegades.

---

### 3.2 Auto-assignació intel·ligent

Quan importes moviments, Summa Social intenta assignar-los automàticament:

**Fase 1 - Matching per nom (~70% dels casos):**
El sistema busca el nom de cada contacte a la descripció del moviment.

Exemple:
- Descripció: "Recibo ENDESA ENERGIA SAU 12345"
- Contacte existent: "ENDESA"
- Resultat: ✅ Assignat automàticament

**Fase 2 - IA amb Gemini (casos restants):**
Si no troba coincidència per nom, la IA suggereix el contacte més probable.

**Categoria per defecte:**
Si el contacte assignat té una categoria per defecte configurada, el moviment es categoritza automàticament.

---

### 3.3 Editar moviments

Pots editar qualsevol moviment clicant la cel·la corresponent:

| Columna | Com editar |
|---------|------------|
| Data | Clica i selecciona nova data |
| Descripció | Clica i escriu |
| Import | Clica i modifica |
| Categoria | Clica → selector amb cerca |
| Contacte | Clica → selector amb cerca |
| Projecte | Clica → selector |
| Document | Clica 📎 per adjuntar |
| Nota | Clica per afegir comentari intern |

---

### 3.4 Filtrar moviments

Pots combinar múltiples filtres:

- **Per data**: Any, trimestre, mes, rang personalitzat
- **Per categoria**: Selecciona una categoria específica
- **Per contacte**: Busca per nom
- **Per projecte**: Filtra per àrea de treball
- **Sense categoritzar**: Moviments pendents
- **Sense contacte**: Moviments no assignats
- **Devolucions pendents**: Rebuts retornats (NOU v1.8)

> 💡 **Barra de resum**: Quan tens filtres actius, apareix una barra amb el resum dels moviments filtrats (quantitat, ingressos, despeses) i un botó per exportar-los.

---

### 3.5 Ocultar detall de remeses

Quan processes remeses (veure secció 4), per defecte les quotes individuals queden ocultes i només veus la línia de la remesa amb un badge que indica el nombre de quotes.

- **Filtre actiu per defecte**: "Ocultar desglose de remesas"
- **Per veure totes les quotes**: Desactiva el filtre
- **Per veure detall d'una remesa**: Clica el badge (ex: "👁 303")

---

## 4. Divisor de Remeses (Quotes de Socis)

### 4.1 Què és una remesa?

Una remesa és l'agrupació de múltiples quotes de socis en un únic ingrés bancari. Per exemple:
- El banc t'ingressa **5.430€** amb el concepte "REMESA RECIBOS"
- Però aquest import són les quotes de **303 socis** diferents

El divisor de remeses et permet "obrir" aquesta remesa i assignar cada quota al seu soci.

---

### 4.2 Dividir una remesa

**Pas a pas:**

1. Ves a 💰 **Moviments**
2. Busca la remesa (ingrés amb import elevat, concepte tipus "REMESA RECIBOS")
3. Clica el menú **⋮** de la fila
4. Selecciona **"Dividir remesa"**
5. Es descarrega el fitxer de detall del banc:
   - Puja el fitxer CSV o Excel que et proporciona el banc
6. **Mapeja les columnes** (el sistema detecta automàticament):
   - 🟢 **Import**: La quantitat de cada quota
   - 🔵 **Nom**: El nom del soci
   - 🟣 **DNI/CIF**: L'identificador del soci
   - 🔷 **IBAN**: El compte bancari del soci
7. Revisa el **matching**:
   | Estat | Significat |
   |-------|------------|
   | 🟢 **Trobat** | Soci existent, s'assignarà automàticament |
   | 🔵 **Nou amb DNI** | No existeix però té DNI, es pot crear |
   | 🟠 **Nou sense DNI** | No existeix i no té DNI, es pot crear amb avís |
8. Marca els nous donants que vols crear
9. Verifica que la suma coincideix amb la remesa original
10. Clica **"Processar"**

**Resultat:**
- ❌ S'elimina la transacció de remesa original
- ✅ Es creen X transaccions individuals
- ✅ Cada transacció queda vinculada al seu donant
- ✅ S'aplica la categoria per defecte

---

### 4.3 Socis de baixa detectats

Si el sistema detecta socis que estaven marcats com "baixa" al fitxer de remesa:

1. Apareix un avís amb el nombre de socis de baixa detectats
2. Pots **reactivar individualment** cada soci
3. O clica **"Reactivar tots"** per donar-los d'alta de nou

---

### 4.4 Veure el detall d'una remesa processada

Després de processar una remesa:

1. La remesa apareix com **1 sola línia** a Moviments
2. Mostra un badge amb el comptador: **"👁 303"**
3. Clica el badge per obrir el **modal de detall**:
   - Llista de totes les quotes individuals
   - Cerca per nom o DNI
   - Clica el nom d'un soci per obrir la seva fitxa

---

### 4.5 Guardar configuració de columnes

Si sempre uses el mateix banc (Triodos, Santander, La Caixa...):

1. Després de mapejar les columnes, clica **"Guardar configuració"**
2. Dona-li un nom (ex: "Triodos - Remeses")
3. La propera vegada, el sistema carregarà la configuració automàticament

---

## 5. Gestió de Devolucions Bancàries

### 5.1 Què és una devolució?

Una devolució és un rebut que el banc no ha pogut cobrar i retorna a l'ONG. Motius habituals:
- Compte sense fons suficients
- IBAN erroni o inexistent
- Compte tancat
- Ordre de no pagament del titular

**Important:** Les devolucions es resten automàticament del total de donacions quan generes el Model 182 o certificats.

---

### 5.2 Com sé si tinc devolucions pendents?

1. Al **Dashboard** veuràs una alerta: "X devolucions pendents d'assignar"
2. A **Moviments** apareix un banner vermell: "Hi ha devolucions pendents d'assignar"

Clica **"Revisar"** per veure només les devolucions pendents.

---

### 5.3 Assignar devolucions manualment

**Quan usar-ho:** Per devolucions individuals o si no tens el fitxer de detall del banc.

**Pas a pas:**

1. Ves a 💰 **Moviments**
2. Clica el banner **"Devolucions pendents"** → **Revisar**
3. Per cada devolució, clica el botó vermell **"Assignar donant"**
4. Cerca el donant per nom, DNI, IBAN o email
5. Selecciona'l i confirma

---

### 5.4 Importar fitxer de devolucions del banc

**Quan usar-ho:** Si tens múltiples devolucions o el banc t'ha enviat un fitxer amb el detall.

**Pas a pas:**

1. Ves a 💰 **Moviments**
2. Localitza una devolució (moviment negatiu, concepte tipus "DEVOLUCION RECIBO")
3. Clica la icona **📄** a la fila de la devolució
4. Es descarrega el fitxer de detall del banc:
   - Puja el fitxer CSV o Excel que et proporciona el banc
5. **Mapeja les columnes** (detecció automàtica):
   - 🔷 **IBAN**: Obligatori
   - 🟢 **Import**: Obligatori
   - 📅 **Data**: Opcional
   - 🟣 **DNI**: Opcional
   - 🔵 **Nom**: Opcional
6. Revisa els **resultats del matching**:
   | Badge | Significat |
   |-------|------------|
   | 🟢 **Individual** | Donant i transacció trobats |
   | 🔵 **Agrupada** | Part d'una remesa de devolucions |
   | 🟠 **Pendent** | Donant no identificat |
7. Clica **"Processar X devolucions"**

**Bancs suportats:**

| Banc | Format | Particularitat |
|------|--------|----------------|
| Santander | XLSX | Data global a la capçalera |
| Triodos | CSV/XLS | Data per cada línia |
| Altres | CSV/XLSX | Detecció automàtica |

---

### 5.5 Devolucions agrupades (remeses)

Alguns bancs agrupen múltiples devolucions en un sol moviment. Per exemple:
- **Extracte bancari**: -55,00€ "DEVOLUCION RECIBOS"
- **Fitxer detall**: 10€ + 20€ + 15€ + 10€ = 55€

El sistema detecta automàticament aquestes agrupacions:

1. El moviment original (-55€) es manté com a "remesa pare"
2. Es creen transaccions filles per cada devolució identificada
3. El pare queda marcat però no s'esborra

---

### 5.6 Remeses parcials

Si algunes devolucions del grup **NO es poden identificar** (IBAN no trobat):

- ✅ Les devolucions amb donant identificat → Es creen com a filles
- ⚠️ Les devolucions sense donant → Queden pendents

**Visualització:** Badge taronja "2/4 quotes (2 pendents: 25,00€)"

**Per resoldre les pendents:**

1. Ves a **Donants** i busca o crea el donant que falta
2. Assegura't que té l'IBAN correcte
3. Torna a importar el fitxer de devolucions

---

### 5.7 Impacte de les devolucions

| Document | Càlcul |
|----------|--------|
| **Model 182** | Import = Donacions - Devolucions |
| **Certificats** | Import = Donacions - Devolucions |

**Important:**
- Si un donant té més devolucions que donacions, no apareix al Model 182
- No se li genera certificat si el total és zero o negatiu

---

### 5.8 Per què és important categoritzar correctament

Si un moviment:
- **No té categoria** → No apareixerà bé als informes
- **No té contacte** → Pot provocar errors al Model 182 o 347
- **No té justificant** → Pot generar problemes en auditories

Les alertes del Dashboard t'ajuden a detectar aquests casos. Revisa-les regularment.

---

## 6. Donacions via Stripe

### 6.1 Què és un payout de Stripe?

Quan reps donacions a través de Stripe (web, formularis online...), Stripe agrupa diverses donacions i t'envia una única transferència al compte corrent. Aquesta transferència s'anomena **payout**.

Per exemple:
- **Stripe rep**: 15 donacions de diferents persones = 850€ bruts
- **Stripe cobra**: Comissions = 25,50€
- **El banc t'ingressa**: 824,50€ net amb concepte "Transferencia de Stripe..."

El divisor de remeses Stripe et permet "obrir" aquesta transferència i registrar cada donació individualment.

---

### 6.2 Flux pas a pas: Processar un ingrés de Stripe

#### PAS 1 — Localitza el moviment al banc

1. Ves a 💰 **Moviments**
2. A la barra de cerca, escriu **"Stripe"**
3. Identifica el moviment d'ingrés del banc (normalment "Transferencia de Stripe…")
   - Import positiu
   - Data del payout
   - Encara sense dividir

> 💡 Si el moviment ja està dividit, no veuràs l'opció de dividir.

---

#### PAS 2 — Accedeix a "Dividir remesa Stripe"

1. A la fila del moviment, obre el menú d'accions **⋮**
2. Selecciona **"Dividir remesa Stripe"**

Aquesta opció apareix si el moviment compleix:
- És un ingrés positiu
- La descripció conté "Stripe"
- No està ja dividit

---

#### PAS 3 — Exporta el CSV des de Stripe

1. Entra al **panell de Stripe** (dashboard.stripe.com)
2. Ves a **Pagaments** → **Exportar**
3. Exporta amb **Columnes predeterminades** (CSV)
4. Desa el fitxer al teu ordinador

> 💡 El CSV conté totes les donacions, agrupades per payout. Summa Social detectarà automàticament quin payout correspon.

---

#### PAS 4 — Carrega el CSV a Summa Social

1. Al modal de "Dividir remesa Stripe", carrega el CSV
2. El sistema:
   - Agrupa les donacions per payout
   - Calcula brut, comissions i net per a cada payout
3. **Selecciona el payout** que quadra amb l'import del banc

> ⚠️ Si hi ha més d'un payout amb import similar, assegura't de triar el correcte comparant les dates.

---

#### PAS 5 — Assigna donants (si cal)

1. Summa Social intenta **assignar automàticament** donants per email
2. Si alguna donació queda pendent (🟠):
   - Clica per **assignar un donant existent**, o
   - Clica per **crear un donant nou**
3. Totes les donacions han d'estar assignades per continuar

> 💡 **Consell**: Assegura't que els donants tenen l'email correcte a Summa Social. Això facilita el matching automàtic.

---

#### PAS 6 — Revisa el resum

Abans d'importar, comprova que tot quadra:

| Element | Què verificar |
|---------|---------------|
| Nombre de donacions | Coincideix amb Stripe |
| Brut total | Suma de totes les donacions |
| Comissions | Import cobrat per Stripe |
| **Import net** | **Ha de coincidir amb l'ingrés del banc** |
| Payout ID | Identificador únic de Stripe |

> ⚠️ **Si no quadra, no importis!** Revisa el CSV o el payout seleccionat.

---

#### PAS 7 — Importa

1. Clica **"Importar donacions"**
2. El sistema crea:
   - **1 moviment per cada donació** (ingrés, categoria "Donacions")
   - **1 moviment de comissions** (despesa, categoria "Despeses bancàries")
3. El moviment bancari original queda marcat com a remesa dividida

---

#### PAS 8 — Verifica el resultat

1. Torna a 💰 **Moviments**
2. Cerca "Stripe":
   - Les donacions creades inclouen **(via Stripe)** a la descripció
   - Les comissions també són visibles
3. Obre un donant per confirmar que:
   - La donació apareix al seu historial
   - Els totals anuals estan correctes

---

### 6.3 Bones pràctiques amb Stripe

✅ **Què FER:**
- Sempre divideix la remesa amb el CSV corresponent al payout
- Usa la cerca "Stripe" per auditar ràpidament totes les operacions
- Verifica que l'import net coincideix amb el banc abans d'importar
- Assegura't que els donants tenen l'email correcte per facilitar el matching

❌ **Què NO fer:**
- No crear donacions a mà per ingressos Stripe
- No modificar categories abans de dividir la remesa
- No editar manualment l'ingrés del banc
- No duplicar imports

> 💡 Amb aquest flux, totes les donacions via Stripe queden **traçables, cercables i preparades** per a certificats i Model 182.

---

### 6.4 Problemes habituals amb Stripe

| Problema | Solució |
|----------|---------|
| No apareix "Dividir remesa Stripe" | Comprova que el moviment no estigui ja dividit |
| L'import net no quadra | Verifica que has seleccionat el payout correcte |
| Donant no assignat automàticament | L'email del CSV no coincideix amb cap donant. Crea'l o assigna'l manualment |
| El CSV no es carrega | Assegura't d'exportar amb "Columnes predeterminades" des de Stripe |

---

## 7. Gestió de Contactes

### 7.1 Tipus de contactes

| Tipus | Qui són | Per a què |
|-------|---------|-----------|
| **Donants** | Qui us dóna diners | Model 182, Certificats |
| **Proveïdors** | A qui pagueu serveis | Model 347 |
| **Treballadors** | Personal contractat | Nòmines |

---

### 7.2 Donants

#### Camps disponibles

| Camp | Obligatori | Per Model 182 |
|------|------------|---------------|
| Nom | ✅ | ✅ |
| NIF/DNI | ⚠️ | ✅ **Imprescindible** |
| Codi postal | ⚠️ | ✅ **Imprescindible** |
| Ciutat | ❌ | ❌ |
| Província | ❌ | ❌ |
| Adreça | ❌ | ❌ |
| Tipus (Particular/Empresa) | ✅ | ✅ |
| Modalitat (Puntual/Soci) | ✅ | ❌ |
| Estat (Actiu/Baixa) | ❌ | ❌ |
| Quota mensual | ❌ | ❌ |
| IBAN | ❌ | ❌ (però útil per matching) |
| Email | ❌ | ❌ |
| Categoria per defecte | ❌ | ❌ |

> ⚠️ **Important per Model 182**: El NIF i el Codi Postal són obligatoris. Sense ells, el donant no s'inclourà a l'informe fiscal i Hisenda no acceptarà la declaració.

---

#### Afegir un donant manualment

**Pas a pas:**

1. Clica ❤️ **Donants** al menú
2. Clica **"+ Nou donant"**
3. Omple els camps:
   - **Nom**: Obligatori
   - **NIF/DNI**: Molt recomanat
   - **Codi postal**: Molt recomanat
   - **Tipus**: Particular o Empresa
   - **Modalitat**: Puntual o Soci
   - **Categoria per defecte**: Ex: "Quotes socis"
4. Clica **"Guardar"**

> 💡 **Categoria per defecte**: Si poses "Quotes socis" a un soci, cada moviment d'aquest soci es categoritzarà automàticament.

---

#### Importar donants des d'Excel

**Pas a pas:**

1. Ves a ❤️ **Donants**
2. Clica **"Importar"**
3. Arrossega el fitxer Excel o clica per seleccionar-lo
4. Revisa que les columnes s'han detectat correctament
5. Si vols actualitzar donants existents (mateix DNI), activa ✅ "Actualitzar existents"
6. Clica **"Importar X donants"**

**Columnes detectades automàticament:**

| Camp | Noms acceptats |
|------|----------------|
| Nom | nom, nombre, name |
| DNI | dni, nif, cif, taxid, documento |
| Codi postal | cp, codipostal, codigopostal, zipcode |
| Ciutat | ciudad, ciutat, city, localidad, población |
| Província | provincia, province |
| Adreça | direccion, adreça, address, domicilio |
| Tipus | tipus, tipo, type, persona |
| Modalitat | modalitat, modalidad, membership, soci |
| Estat | estado, estat, status, activo, baja |
| Import | import, importe, quota, cuota |
| IBAN | iban, compte, cuenta |
| Email | email, correu, correo, mail |

---

#### Filtrar donants amb dades incompletes

**Pas a pas:**

1. Ves a ❤️ **Donants**
2. Clica el filtre **"Dades incompletes"**
3. Veuràs una columna "Falta" que indica exactament què manca:
   - "NIF" → No té document d'identitat
   - "CP" → No té codi postal
   - "IBAN" → És soci recurrent però no té IBAN

> 💡 **Per què és important?** Sense NIF i CP, el donant no apareixerà al Model 182 i no podràs declarar les seves donacions a Hisenda.

---

#### Panel del donant

Clicant el **nom** d'un donant s'obre un panel lateral amb:

- **Informació completa** del donant
- **Historial de donacions** (paginat)
- **Historial de devolucions** (NOU v1.8)
- **Resum per any** (totals)
- **Generar certificats** (individual o anual)
- **Comptador de devolucions** i data de l'última

---

### 7.3 Proveïdors

| Camp | Obligatori | Per Model 347 |
|------|------------|---------------|
| Nom | ✅ | ✅ |
| NIF/CIF | ⚠️ | ✅ **Imprescindible** |
| Categoria per defecte | ❌ | ❌ |
| Adreça | ❌ | ❌ |
| IBAN | ❌ | ❌ |

> ⚠️ **Important per Model 347**: El NIF és obligatori per als proveïdors amb operacions superiors a 3.005,06€ anuals.

---

### 7.4 Estat Actiu/Baixa

- **Per defecte** es mostren només els contactes actius
- Els donants de baixa mostren un **badge "Baixa"**
- **Per reactivar**: Clica el donant → Editar → Canviar estat a "Actiu"
- **Baixa automàtica**: Si importes un Excel amb columna "Estado" = "Baja", es marca automàticament

---

## 8. Informes Fiscals

### 8.1 Model 182 - Declaració de Donacions

**Què és?**
El Model 182 és la declaració informativa de donatius rebuts. Obligatori per entitats acollides a la Llei 49/2002.

**Data límit:** 31 de gener de l'any següent

**Què inclou?**
- NIF/DNI del donant
- Nom complet
- Codi postal (per determinar província)
- Import total donat (menys devolucions)
- Històric per calcular recurrència

---

#### Generar el Model 182

**Pas a pas:**

1. Ves a 📄 **Informes** → **Model 182**
2. Selecciona l'**any fiscal** (ex: 2025)
3. Clica **"Generar Informe"**
4. Revisa la llista de donants:
   | Columna | Què mostra |
   |---------|------------|
   | Nom | Nom del donant |
   | NIF | DNI o CIF |
   | Codi postal | CP del donant |
   | Import | Total donat a l'any (net de devolucions) |
   | Estat | ✅ Complet o ⚠️ Dades incompletes |
5. **Corregeix dades incompletes** (si n'hi ha):
   - Clica el donant amb ⚠️
   - Afegeix el NIF o codi postal que falti
   - Guarda els canvis
6. Clica **"Exportar Excel (Model 182)"**
7. Es descarrega `Model182_{org}_{any}.xlsx`
8. **Envia aquest fitxer a la teva gestoria**

---

#### Contingut de l'Excel per gestoria

| Columna | Valor | D'on surt |
|---------|-------|-----------|
| NIF | DNI/CIF del donant | Camp taxId |
| NOMBRE | Nom complet | Camp name |
| CLAVE | "A" | Fix (dinerari Llei 49/2002) |
| PROVINCIA | Codi 2 dígits | Primers 2 dígits del CP |
| PORCENTAJE | *(buit)* | La gestoria ho calcula |
| VALOR | Import any actual | Suma donacions - devolucions |
| VALOR_1 | Import any anterior | Històric |
| VALOR_2 | Import any -2 | Històric |
| RECURRENTE | "X" o buit | Marca si ha donat 3 anys seguits |
| NATURALEZA | "F" o "J" | Particular (F) o Empresa (J) |

> 💡 **Devolucions**: Si un soci ha tingut rebuts tornats, l'import es resta automàticament del total.

> 💡 **Recurrència**: El sistema calcula si el donant ha fet aportacions els 2 anys anteriors. Això permet a la gestoria aplicar el percentatge de deducció incrementat.

---

### 8.2 Model 347 - Operacions amb Tercers

**Què és?**
Declaració d'operacions amb tercers que superen 3.005,06€ anuals.

**Data límit:** 28 de febrer de l'any següent

**Llindar:** > 3.005,06€ anuals per proveïdor

---

#### Generar el Model 347

**Pas a pas:**

1. Ves a 📄 **Informes** → **Model 347**
2. Selecciona l'**any fiscal**
3. El sistema filtra automàticament proveïdors > 3.005,06€
4. Revisa els NIF/CIF
5. Clica **"Exportar CSV"**

---

### 8.3 Certificats de Donació

**Què són?**
Documents que acrediten les aportacions. Els donants els necessiten per desgravar a la renda.

**Tipus:**

| Tipus | Descripció |
|-------|------------|
| Individual | Per una donació específica |
| Anual | Agrupa totes les donacions d'un any |

---

#### Generar Certificats

**Opció A: Des del panel del donant**

1. Ves a ❤️ **Donants**
2. Clica el **nom** del donant (s'obre el panel lateral)
3. A "Generar certificats":
   - **Individual**: Selecciona la donació específica
   - **Anual**: Selecciona l'any

**Opció B: Generació massiva**

1. Ves a 📄 **Informes** → **Certificats**
2. Selecciona l'any fiscal
3. Marca els donants (o selecciona tots)
4. Clica **"Descarregar seleccionats"**
5. Es descarrega un ZIP amb tots els certificats

> 💡 **Devolucions**: L'import del certificat ja té en compte les devolucions. Si un donant té més devolucions que donacions, no se li genera certificat.

---

## 9. Projectes / Eixos d'Actuació

### 9.1 Què són?

Els projectes permeten classificar ingressos i despeses segons les àrees de treball de l'organització.

**Exemples:**
- Cooperació internacional
- Sensibilització local
- Administració general
- Captació de fons

> 💡 **Els projectes no són obligatoris.**
>
> Es recomana usar-los quan:
> - Treballes amb subvencions
> - Necessites justificar despeses per projecte
> - Vols control pressupostari separat
>
> Si la teva entitat és petita i no treballa per projectes, pots no usar-los.

---

### 9.2 Crear un projecte

**Pas a pas:**

1. Ves a 📁 **Eixos d'actuació**
2. Clica **"+ Nou projecte"**
3. Omple:
   - Nom (obligatori)
   - Descripció (opcional)
   - Finançador (opcional)
4. Clica **"Guardar"**

---

### 9.3 Assignar moviments a projectes

**Individual:**
1. Ves a 💰 **Moviments**
2. Clica la cel·la de **Projecte**
3. Selecciona el projecte

**Massiva:**
1. Filtra els moviments
2. Selecciona'ls amb les caselles
3. Clica **"Assignar projecte"** a la barra d'accions

---

### 9.4 Estadístiques per projecte

Cada projecte mostra:
- Total d'ingressos imputats
- Total de despeses imputades
- Balanç (ingressos - despeses)

---

### 9.5 Captura de despeses de terreny

#### Què és?

Permet **pujar comprovants (factures, tiquets)** directament des del mòbil, en el moment que es produeix la despesa.

Està pensat per:
- Persones a terreny
- Viatges
- Despeses petites i recurrents
- Evitar perdre comprovants

#### Qui la pot utilitzar?

- Només usuaris amb rol **User**
- No requereix permisos d'administració

#### Com funciona (regla dels 10 segons)

1. Entra a **Projectes** → **Despeses** → **Captura**
2. Prem la icona de la **càmera** 📷
3. Fes una foto del comprovant
4. Prem **Enviar**

**No cal**:
- Assignar categoria
- Assignar projecte
- Omplir imports manualment

#### Què passa després?

- El comprovant queda **pendent de revisió**
- L'equip d'oficina:
  - Revisa la imatge
  - Categoritza la despesa
  - Assigna a projecte si cal

> ⚠️ **Important**: La captura no substitueix la revisió administrativa. És una eina de recollida ràpida, no de justificació final.

---

## 10. Configuració

### 10.1 Dades de l'Organització

> 🔒 Requereix rol Admin o SuperAdmin

| Camp | Obligatori | Ús |
|------|------------|-----|
| Nom | ✅ | Certificats, informes |
| NIF/CIF | ✅ | Model 182 i 347 |
| Adreça | ❌ | Certificats |
| Ciutat | ❌ | Certificats |
| Codi postal | ❌ | Certificats |
| Logo | ❌ | Certificats (PNG o JPG) |

---

### 10.2 Configuració de Certificats

| Camp | Ús |
|------|-----|
| Firma digitalitzada | Apareix als certificats (PNG transparent recomanat) |
| Nom del signant | Ex: "Maria Garcia López" |
| Càrrec del signant | Ex: "Presidenta" |

---

### 10.3 Categories Comptables

**Categories d'ingressos (predefinides):**
- Donacions
- Quotes socis
- Subvencions públiques
- Subvencions privades
- Altres ingressos

**Categories de despeses (predefinides):**
- Nòmines i seguretat social
- Serveis professionals
- Lloguer
- Subministraments
- Despeses bancàries
- Transferències a contraparts
- Altres despeses

**Per afegir una categoria:**
1. Ves a ⚙️ **Configuració** → **Categories**
2. Clica **"+ Nova categoria"**
3. Escriu el nom i selecciona el tipus (Ingrés/Despesa)
4. Clica **"Guardar"**

---

### 10.4 Gestió de Membres

> 🔒 Requereix rol Admin o SuperAdmin

| Rol | Permisos |
|-----|----------|
| **SuperAdmin** | Tot + Zona de Perill |
| **Admin** | Tot excepte Zona de Perill |
| **User** | Crear i editar, no eliminar ni configurar |
| **Viewer** | Només consulta |

**Per convidar un membre:**
1. Ves a ⚙️ **Configuració** → **Membres**
2. Clica **"+ Convidar membre"**
3. Introdueix l'email i selecciona el rol
4. Clica **"Enviar invitació"**

#### Què pot fer cada rol en el dia a dia

| Acció | SuperAdmin | Admin | User | Viewer |
|-------|------------|-------|------|--------|
| Veure dades | ✅ | ✅ | ✅ | ✅ |
| Importar moviments | ✅ | ✅ | ✅ | ❌ |
| Editar moviments | ✅ | ✅ | ✅ | ❌ |
| Dividir remeses | ✅ | ✅ | ❌ | ❌ |
| Gestionar donants | ✅ | ✅ | ✅ | ❌ |
| Assignar projectes | ✅ | ✅ | ❌ | ❌ |
| Generar informes | ✅ | ✅ | ✅ | ✅ |
| Captura de despeses de terreny | ❌ | ❌ | ✅ | ❌ |
| Zona de Perill | ✅ | ❌ | ❌ | ❌ |

> 💡 **Nota**: El rol **User** està pensat per a la gestió operativa i per a persones que treballen sobre el terreny.

---

### 10.5 Zona de Perill

> 🔒 Només SuperAdmin

Accions irreversibles:

| Acció | Descripció |
|-------|------------|
| Esborrar tots els donants | Elimina tots els donants |
| Esborrar tots els proveïdors | Elimina tots els proveïdors |
| Esborrar tots els treballadors | Elimina tots els treballadors |
| Esborrar tots els moviments | Elimina totes les transaccions |
| Esborrar última remesa | Desfà l'última remesa processada |

> ⚠️ **Atenció**: Aquestes accions NO es poden desfer. Demanen confirmació escrivint "BORRAR".

---

## 11. Resolució de Problemes

### 11.1 Preguntes freqüents

#### No puc iniciar sessió

1. Verifica que l'email és correcte (sense espais al final)
2. Comprova majúscules/minúscules de la contrasenya
3. Clica "He oblidat la contrasenya"
4. Si persisteix, contacta amb l'administrador

#### No veig les dades

1. Verifica que estàs a l'organització correcta
2. Comprova el **filtre de dates** (potser estàs veient un altre any)
3. Si ets nou, potser encara no s'han importat dades

#### L'importador no detecta les columnes

1. Verifica que el fitxer té capçalera a la primera fila
2. Prova amb format CSV o Excel
3. Ajusta manualment el mapejat de columnes

#### El Model 182 mostra donants incomplets

1. Clica cada donant amb ⚠️
2. Afegeix NIF i/o codi postal
3. Guarda i regenera l'informe

#### No trobo un donant per assignar una devolució

1. Verifica que l'IBAN del fitxer coincideix amb el de Summa Social
2. Si no coincideix, actualitza l'IBAN del donant
3. Si el donant no existeix, crea'l primer

---

### 11.2 Errors habituals

| Error | Solució |
|-------|---------|
| "No tens permisos" | Demana a un Admin que et canviï el rol |
| "Dades incompletes" | Omple els camps obligatoris |
| "Duplicat detectat" | El registre ja existeix |
| "Fitxer no vàlid" | Usa CSV o Excel (.xlsx) |
| "IBAN no vàlid" | Comprova que té 24 caràcters i comença per ES |

---

### 11.3 Errors habituals amb solució

#### He importat dues vegades el mateix extracte

1. Revisa els moviments duplicats a la taula de Moviments
2. Pots eliminar els duplicats manualment (un a un)
3. Per evitar-ho: no tornis a importar el mateix fitxer

> 💡 El sistema detecta duplicats (mateixa data, import i descripció), però si has modificat l'extracte pot no detectar-los.

#### He dividit una remesa incorrectament

1. Ves a ⚙️ **Configuració** → **Zona de Perill**
2. Usa **"Esborrar última remesa"**
3. Confirma escrivint "BORRAR"
4. Torna a processar la remesa correctament

#### Un donant ha canviat de DNI

1. Ves a ❤️ **Donants**
2. Cerca el donant
3. Edita'l i actualitza el DNI
4. **Important**: Fes-ho abans de generar el Model 182

#### Les comissions de Stripe no apareixen

1. Assegura't d'haver dividit la remesa Stripe correctament
2. Les comissions es creen automàticament com a despesa
3. Si no apareixen, revisa que el payout seleccionat era el correcte

---

### 11.4 Consells per treballar millor

#### Maximitzar l'automatització

1. **Assigna categoria per defecte a tots els contactes**
   - Cada nou moviment es categoritzarà sol
2. **Importa els donants abans que els moviments**
   - L'auto-assignació funcionarà millor
3. **Assegura't que cada soci té l'IBAN**
   - Facilita el matching de remeses i devolucions

#### Mantenir les dades al dia

1. **Importa extractes cada mes** (o com a mínim cada trimestre)
2. **Revisa les alertes del Dashboard** regularment
3. **Prepara informes fiscals amb temps** (no esperis al gener!)

#### Seguretat

1. Usa contrasenyes fortes (mínim 8 caràcters, números i lletres)
2. Tanca la sessió en ordinadors compartits
3. No comparteixis la contrasenya

---

## 12. Glossari

| Terme | Definició |
|-------|-----------|
| **Contacte** | Qualsevol persona o entitat: donant, proveïdor o treballador |
| **Soci** | Donant recurrent amb quota periòdica |
| **Donant puntual** | Donant amb aportacions esporàdiques |
| **Remesa** | Agrupació de quotes en un únic ingrés o de devolucions en un únic càrrec |
| **Devolució** | Rebut retornat pel banc (compte sense fons, IBAN erroni, etc.) |
| **Remesa parcial** | Remesa amb algunes devolucions pendents d'identificar |
| **Payout (Stripe)** | Transferència que Stripe envia al teu banc amb l'import net de diverses donacions |
| **Comissions Stripe** | Import que Stripe cobra per cada donació (aproximadament 1,4% + 0,25€) |
| **Model 182** | Declaració de donatius (límit 31 gener) |
| **Model 347** | Operacions amb tercers >3.005,06€ (límit 28 febrer) |
| **Contrapart** | Organització sòcia internacional a qui enviem fons |
| **Recurrència** | Ha donat els 2 anys anteriors consecutius (permet deducció incrementada) |
| **Matching** | Procés d'assignar un contacte a un moviment per coincidència |
| **Categoria per defecte** | Categoria que s'aplica automàticament quan s'assigna un contacte |
| **Eix d'actuació** | Sinònim de projecte |
| **Gestoria** | Professional extern que presenta els models fiscals a Hisenda |

---

## Historial de Versions del Manual

| Versió | Data | Canvis principals |
|--------|------|-------------------|
| 1.0 | 08/12/2025 | Primera versió |
| 1.7 | 12/12/2025 | Suport Excel remeses, camps ciutat/província, Excel Model 182 per gestoria |
| **1.8** | **14/12/2025** | **Importador devolucions bancàries, remeses parcials, filtres millorats, 77 tests unitaris** |

---

## Necessites ajuda?

Si tens dubtes que no estan resolts en aquest manual:

1. **Revisa la secció de Resolució de Problemes** (secció 11)
2. **Contacta amb l'administrador** de la teva organització
3. **Utilitza el botó 👎** a qualsevol pantalla per reportar un problema

> 💡 Summa Social està pensat per **reduir l'estrès administratiu**, no per afegir-ne. Si tens dubtes, és millor deixar una dada pendent que inventar-la.

---

**Fi del Manual d'Usuari**

*Manual creat per Summa Social - Gestió financera per a ONGs*
