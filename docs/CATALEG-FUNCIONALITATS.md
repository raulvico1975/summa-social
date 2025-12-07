# SUMMA SOCIAL - Catàleg de Funcionalitats

**Versió**: 1.6
**Data**: 7 de desembre de 2025
**Estat**: Producció

**Notes de la versió 1.6**:
- Optimitzacions de rendiment (memoització de components)
- Millora d'estabilitat (gestió de memòria)
- Límits de consulta per a grans volums de dades
- Millor gestió d'errors (toasts informatius)

---

## 1. Visió General

### Què és Summa Social?

Summa Social és una aplicació de gestió financera dissenyada específicament per a **petites i mitjanes ONGs i entitats socials d'Espanya**. Substitueix els fulls de càlcul per una eina intel·ligent, intuïtiva i centralitzada.

### Problema que resol

| Abans (Fulls de càlcul) | Ara (Summa Social) |
|-------------------------|---------------------|
| Dades disperses en múltiples Excel | Tot centralitzat en una aplicació |
| Errors manuals de còpia/enganxa | Importació automàtica d'extractes bancaris |
| Hores categoritzant moviments | Auto-assignació intel·ligent (matching + IA) |
| Preparar Model 182 manualment | Generació automàtica amb un clic |
| Sense visió global | Dashboard amb mètriques en temps real |
| Un sol usuari | Multi-usuari amb rols |

### Característiques principals

- 🏢 **Multi-organització**: Una instal·lació, múltiples ONGs
- 👥 **Multi-usuari**: Rols d'administrador, usuari i visualitzador
- 🤖 **Auto-assignació intel·ligent**: Matching per nom + IA com a fallback
- 🌍 **Multi-idioma**: Català i Espanyol
- 📱 **Responsive**: Funciona en ordinador, tauleta i mòbil
- 🔒 **Segur**: Autenticació Firebase, dades aïllades per organització

---

## 2. Mòduls Principals

### 2.1 Dashboard (Panell de Control)

El dashboard és la pàgina principal que mostra l'estat financer de l'organització d'un cop d'ull.

#### 2.1.1 Filtre de Dates

Permet filtrar totes les dades del dashboard per període:

| Tipus de filtre | Exemple |
|-----------------|---------|
| Any complet | Any 2024 |
| Trimestre | T1 2024, T2 2024... |
| Mes | Gener 2024, Febrer 2024... |
| Personalitzat | Del 15/03/2024 al 30/06/2024 |
| Tots els períodes | Sense filtre temporal |

**Important**: El filtre afecta TOTES les dades mostrades al dashboard (ingressos, despeses, donacions, alertes, gràfics...).

#### 2.1.2 Targetes Estadístiques (StatCards)

Quatre targetes amb les mètriques principals:

| Targeta | Què mostra | Color |
|---------|------------|-------|
| **Ingressos** | Suma de tots els moviments positius | Verd |
| **Despeses operatives** | Suma de despeses (excloent transferències a contraparts) | Vermell |
| **Balanç operatiu** | Ingressos - Despeses operatives | Verd/Vermell segons signe |
| **Transferències a contraparts** | Enviaments a organitzacions sòcies internacionals | Blau |

**Nota sobre Transferències a Contraparts**: Són els fons que s'envien a organitzacions associades (normalment a altres països) per executar activitats de cooperació. Es separen de les despeses operatives perquè representen una categoria especial de sortida de fons que no és despesa directa de l'entitat.

#### 2.1.3 Bloc Donacions i Socis

Mostra 4 mètriques amb **comparativa respecte l'any anterior**:

| Mètrica | Descripció | Comparativa |
|---------|------------|-------------|
| **Donacions** | Import total de donants puntuals | +X € vs 2023 |
| **Donants actius** | Nombre de donants puntuals únics | +X vs 2023 |
| **Socis actius** | Nombre de socis (recurrents) únics | +X vs 2023 |
| **Quotes socis** | Import total aportat pels socis | +X € vs 2023 |

La comparativa mostra:
- 🟢 Fletxa amunt + número verd si millora
- 🔴 Fletxa avall + número vermell si empitjora
- = si és igual

#### 2.1.4 Bloc Despesa per Eix d'Actuació

Mostra la distribució de despeses per projecte/eix:

- Llista de projectes ordenada per import (de major a menor)
- "Sense assignar" sempre al final
- Cada eix mostra:
  - Nom del projecte
  - Import total en €
  - Percentatge respecte al total (ex: 25%)
  - Barra de progrés visual
- Total de despeses al final

#### 2.1.5 Bloc Obligacions Fiscals

Mostra les dates límit de presentació amb compte enrere:

| Obligació | Data límit | Funcionalitat |
|-----------|------------|---------------|
| **Model 182** | 31 de gener | ✅ Generador implementat |
| **Model 347** | 28 de febrer | ✅ Generador implementat |

Per cada obligació:
- Dies restants fins la data límit
- Indicador visual: 🟢 >60 dies, 🟡 30-60 dies, 🔴 <30 dies
- Botó "Preparar" que porta a l'informe corresponent
- Si la data ja ha passat, mostra la del proper any

#### 2.1.6 Bloc Alertes/Atenció

Mostra problemes que requereixen acció:

| Alerta | Descripció | Acció |
|--------|------------|-------|
| **Moviments sense categoritzar** | Transaccions pendents de classificar | Clic → filtra la taula |
| **Donants amb dades incompletes** | Donants sense NIF o codi postal | Clic → filtra donants |
| **Moviments sense contacte** | Transaccions >X€ sense emissor | Clic → filtra la taula |

**Llindar configurable**: L'alerta de "sense contacte" només compta moviments superiors a un llindar configurable (per defecte 50€). Es pot canviar a Configuració: 0€, 50€, 100€ o 500€.

#### 2.1.7 Bloc Celebracions

Mostra fites positives per motivar l'usuari (només quan hi ha alguna cosa a celebrar):

| Celebració | Condició |
|------------|----------|
| ✅ Totes les transaccions categoritzades | 0 moviments sense categoria |
| 📈 Balanç positiu | Balanç del període > 0 |
| ❤️ X donants han contribuït | Més de 5 donants al període |
| 🎯 Tot al dia, bona feina! | 0 alertes actives |
| 🎁 Primera donació del mes | Hi ha donacions al mes actual |

El bloc té un disseny festiu (fons verd clar, icona de festa).

#### 2.1.8 Gràfic de Despeses per Categoria

Gràfic de barres horitzontal que mostra la distribució de despeses per categoria comptable.

#### 2.1.9 Botó Compartir Resum

Genera un text resum per compartir amb la junta directiva:

**Funcionalitats**:
- Text generat automàticament amb les dades del període
- Textarea editable per personalitzar
- Botó "Copiar" al portapapers
- Botó "Enviar per email" (obre el client d'email)

**Format del resum**:
```
📊 Resum [Nom Organització] - [Període]

💰 Ingressos: X.XXX,XX €
💸 Despeses operatives: X.XXX,XX €
📈 Balanç operatiu: +X.XXX,XX €

❤️ Donants actius: X (vs Y l'any anterior)
🎁 Donacions: X.XXX,XX € (vs Y € l'any anterior)
👥 Socis actius: X (vs Y l'any anterior)
💳 Quotes socis: X.XXX,XX € (vs Y € l'any anterior)

Generat amb Summa Social
```

---

### 2.2 Moviments / Transaccions

Gestió completa dels moviments bancaris de l'organització.

#### 2.2.1 Taula de Moviments

Taula interactiva amb totes les transaccions:

| Columna | Descripció | Editable |
|---------|------------|----------|
| Data | Data del moviment | ✅ |
| Descripció | Concepte bancari | ✅ |
| Import | Positiu (ingrés) o negatiu (despesa) | ✅ |
| Categoria | Categoria comptable | ✅ Desplegable amb cerca |
| Contacte | Donant, proveïdor o treballador vinculat | ✅ Combobox |
| Projecte | Eix d'actuació assignat | ✅ Desplegable |
| Nota | Notes internes | ✅ |

**Filtres disponibles**:
- Per categoria
- Per contacte
- Per projecte
- Sense categoritzar (des d'alerta dashboard)
- Sense contacte (des d'alerta dashboard)

#### 2.2.2 Importador de Transaccions

Importa extractes bancaris des de fitxers CSV o Excel:

**Funcionalitats**:
- Arrossegar i deixar anar fitxers
- Detecció automàtica del format
- Mapatge de columnes intel·ligent
- Detecció de duplicats
- Detecció de devolucions bancàries
- Vista prèvia abans d'importar

**Formats suportats**:
- CSV (qualsevol separador)
- Excel (.xlsx, .xls)

#### 2.2.3 Sistema d'Auto-Assignació Intel·ligent

Durant la importació, el sistema assigna automàticament contactes a les transaccions sense necessitat de cridar la IA en la majoria de casos.

**Flux d'auto-assignació (2 fases)**:

```
Transacció nova
      ↓
┌─────────────────────────────────────────┐
│ FASE 1: Matching per nom (instantani)   │
│ - Cerca si el nom del contacte apareix  │
│   a la descripció bancària              │
│ - Gratuït, sense límits                 │
│ - Resol ~70% dels casos                 │
└─────────────────────────────────────────┘
      ↓ No trobat
┌─────────────────────────────────────────┐
│ FASE 2: IA com a fallback               │
│ - Només si queden ≤20 sense match       │
│ - Processa en lots amb espera           │
│ - Gestió de quota excedida              │
└─────────────────────────────────────────┘
```

**FASE 1 - Matching per nom**:

| Característica | Detall |
|----------------|--------|
| Mètode | Cerca el nom del contacte dins la descripció bancària |
| Normalització | Text sense accents, minúscules |
| Tokens | Ignora paraules comunes ("de", "la", "sl", "sa", etc.) |
| Requisit | Mínim 2 tokens coincidents (o 1 si nom curt com "Amazon") |
| Cost | 🟢 Gratuït |
| Velocitat | Instantani |

**Exemple**:
```
Descripció bancària: "Recibo Gtl Consultors S.l. Nº Recibo 00"
Contacte existent: "GTL CONSULTORS"
→ Match automàtic! (tokens "gtl" i "consultors" coincideixen)
```

**FASE 2 - IA (fallback)**:

| Característica | Detall |
|----------------|--------|
| Activació | Només si queden ≤20 transaccions sense match |
| Processament | Lots de 10 amb espera de 60s entre lots |
| Quota excedida | Mostra avís i continua sense IA |
| Cost | ~0.001€ per crida |

**Resultats típics**:

| Fase | Percentatge | Cost |
|------|-------------|------|
| Matching per nom | ~70% | Gratis |
| IA (fallback) | ~16% | Mínim |
| Sense assignar | ~14% | - |
| **Total amb contacte** | **~86%** | Quasi gratis |

**Gestió d'errors d'IA**: Si es supera el límit de peticions a la IA (quota), la importació continua sense assignació automàtica. L'usuari rep un únic avís i pot assignar manualment després.

#### 2.2.4 Categorització

Dues opcions per assignar categoria:

| Mètode | Com funciona |
|--------|--------------|
| **Manual** | Desplegable amb cerca. Escriu per filtrar categories. |
| **IA (Genkit + Gemini)** | Botó "🤖 Suggerir amb IA" analitza la descripció |

El desplegable de categories:
- Mostra categories segons el tipus (ingressos si amount > 0, despeses si < 0)
- Cerca amb autofocus (comences a escriure immediatament)
- "🤖 Suggerir amb IA" sempre visible al final

#### 2.2.5 Assignació Manual de Contactes

Combobox intel·ligent per assignar el contacte relacionat manualment:

- Cerca per nom mentre escrius
- Mostra el tipus (donant, proveïdor, treballador)
- Opció de crear contacte nou directament
- Suggeriment amb IA disponible

#### 2.2.6 Divisor de Remeses

Eina per desglossar una remesa bancària de domiciliacions en transaccions individuals per soci.

**Cas d'ús**: El banc t'ingressa 2.500€ amb concepte "REMESA DOMICILIACIONS 12/2024" però necessites registrar cada quota individualment vinculada a cada soci.

**Flux complet**:

| Pas | Què fa l'usuari | Què fa el sistema |
|-----|-----------------|-------------------|
| **1. Seleccionar remesa** | Clica "Dividir Remesa" a la transacció | - |
| **2. Pujar CSV** | Puja el fitxer del banc amb el detall | Detecta delimitador, columnes i format |
| **3. Configurar mapejat** | Verifica/ajusta columnes (Import, Nom, DNI, IBAN) | Detecta automàticament les columnes |
| **4. Matching** | Revisa les coincidències | Busca socis per DNI, IBAN o nom |
| **5. Nous donants** | Marca quins nous donants crear | Prepara la creació |
| **6. Processar** | Confirma | Elimina remesa original, crea N transaccions |

**Matching automàtic de socis** (per ordre de prioritat):

| Mètode | Prioritat | Com funciona |
|--------|-----------|--------------|
| **Per DNI/CIF** | 🥇 Màxima | Coincidència exacta del DNI del CSV amb donants existents |
| **Per IBAN** | 🥈 Alta | Coincidència exacta de l'IBAN normalitzat |
| **Per Nom** | 🥉 Mitjana | Tots els tokens del nom del CSV han d'estar al nom del donant |

**Detecció automàtica de columnes**:
- 🟢 **Import**: Format monetari (números amb decimals)
- 🔵 **Nom**: Text amb espais i lletres
- 🟣 **DNI/CIF**: Patró 8 dígits + lletra
- 🔷 **IBAN**: Format ES + 22 dígits (o similar per altres països)

**Estats de matching**:

| Estat | Significat |
|-------|------------|
| 🟢 Trobat | Soci existent, s'assignarà automàticament |
| 🔵 Nou amb DNI | No existeix però té DNI, opció de crear-lo |
| 🟠 Nou sense DNI | No existeix i no té DNI, opció de crear-lo (amb avís) |

**Validació crítica**: La suma dels imports del CSV ha de coincidir exactament amb l'import de la remesa original.

**Resultat final**:
- S'elimina la transacció de remesa agrupada
- Es creen N transaccions individuals (una per soci)
- Cada transacció queda vinculada al seu donant
- Els nous donants es creen automàticament si s'ha marcat

**Funcionalitat extra**: Les configuracions de mapejat (incloent columna IBAN) es guarden per organització. Si sempre uses el mateix format de Triodos, guarda'l com "Triodos" i la propera vegada només cal un clic.

---

### 2.3 Contactes

Tres tipus de contactes amb gestió diferenciada:

#### 2.3.1 Donants

Gestió de persones o empreses que fan aportacions.

**Camps**:
| Camp | Obligatori | Descripció |
|------|------------|------------|
| Nom | ✅ | Nom complet o raó social |
| NIF/DNI | ❌ | Necessari per Model 182 |
| Tipus | ✅ | Particular o Empresa |
| Modalitat | ✅ | Puntual o Soci (recurrent) |
| Codi postal | ❌ | Necessari per Model 182 |
| Adreça | ❌ | |
| Email | ❌ | |
| Telèfon | ❌ | |
| IBAN | ❌ | Per domiciliacions |
| Quota mensual | ❌ | Si és soci |
| Data alta soci | ❌ | Si és soci |
| **Categoria per defecte** | ❌ | S'assigna automàticament a les transaccions |
| Notes | ❌ | |

**Funcionalitats especials**:
- Filtre per "Dades incompletes" (sense NIF o codi postal)
- **Importador massiu amb plantilla Excel descarregable**
- Estadístiques de donacions per donant
- Gestió de devolucions bancàries
- **Assignació automàtica de categoria per defecte segons modalitat**:
  - Socis (recurring) → "Quotes socis"
  - Puntuals (one-time) → "Donacions"
- **Selector de donants amb cerca** (per gestió de devolucions):
  - Cerca en temps real mentre escrius
  - Cerca per nom o DNI
  - Mostra DNI per identificar donants amb noms similars
  - Optimitzat per 500+ donants (límit 50 resultats)

**Importador de donants**:

| Funcionalitat | Descripció |
|---------------|------------|
| Plantilla Excel | Descarregable amb totes les columnes i exemples |
| Auto-detecció | Detecta automàticament les columnes del CSV/Excel |
| Columna Categoria | Permet assignar categoria per defecte a cada donant |
| Selector global | "Automàtic segons tipus" o categoria específica per tots |

#### 2.3.2 Proveïdors

Gestió d'empreses o autònoms que presten serveis.

**Camps**:
| Camp | Obligatori | Descripció |
|------|------------|------------|
| Nom | ✅ | Raó social |
| NIF/CIF | ❌ | Necessari per Model 347 |
| Categoria proveïdor | ❌ | Tipus de servei |
| **Categoria per defecte** | ❌ | S'assigna automàticament a les transaccions |
| Adreça | ❌ | |
| Email | ❌ | |
| Telèfon | ❌ | |
| IBAN | ❌ | Per pagaments |
| Condicions pagament | ❌ | |
| Notes | ❌ | |

**Categories de proveïdors disponibles**:
- Serveis professionals
- Subministraments
- Materials
- Lloguer
- Assegurances
- Manteniment
- Transport
- Comunicacions
- Formació
- Altres

#### 2.3.3 Treballadors

Gestió d'empleats de l'organització.

**Camps**:
| Camp | Obligatori | Descripció |
|------|------------|------------|
| Nom | ✅ | Nom complet |
| NIF/DNI | ❌ | |
| Data inici | ❌ | Inici contracte |
| **Categoria per defecte** | ❌ | S'assigna automàticament (ex: "Nòmines") |
| IBAN | ❌ | Per nòmines |
| Email | ❌ | |
| Telèfon | ❌ | |
| Notes | ❌ | |

---

### 2.4 Projectes / Eixos d'Actuació

Gestió de projectes per imputar ingressos i despeses.

**Camps**:
| Camp | Obligatori | Descripció |
|------|------------|------------|
| Nom | ✅ | Nom del projecte |
| Descripció | ❌ | |
| Finançador | ❌ | Contacte que finança el projecte |

**Estadístiques per projecte**:
- Total ingressos imputats
- Total despeses imputades
- Balanç del projecte

---

### 2.5 Informes

#### 2.5.1 Model 182 (Donacions)

Generador de l'informe de donacions per a Hisenda.

**Funcionalitats**:
- Selector d'any fiscal
- Llista de donants amb:
  - NIF
  - Nom
  - Import total donat
  - Indicador si té dades completes
- Gestió de devolucions bancàries
- Alertes per donants sense NIF o codi postal
- Exportació a CSV
- Possibilitat d'excloure donants manualment

**Data límit**: 31 de gener de l'any següent

#### 2.5.2 Model 347 (Proveïdors)

Generador de l'informe d'operacions amb tercers.

**Funcionalitats**:
- Selector d'any fiscal
- Llindar legal: 3.005,06€
- Llista de proveïdors que superen el llindar amb:
  - NIF/CIF
  - Nom
  - Import total pagat
- Alertes per proveïdors sense NIF
- Exportació a CSV
- Possibilitat d'excloure proveïdors manualment

**Data límit**: 28 de febrer de l'any següent

#### 2.5.3 Certificats de Donació

Generador de certificats PDF per a donants.

**Funcionalitats**:
- Selector d'any
- Selector de donant (individual o tots)
- Generació PDF amb:
  - Dades de l'organització
  - Dades del donant
  - Import total donat
  - Text legal per desgravació fiscal
- Descàrrega individual o massiva (ZIP)

---

### 2.6 Configuració

#### 2.6.1 Dades de l'Organització

| Camp | Descripció |
|------|------------|
| Nom | Nom oficial de l'entitat |
| NIF/CIF | Identificador fiscal |
| Adreça | Adreça completa |
| Ciutat | |
| Codi postal | |
| Telèfon | |
| Email | |
| Web | |
| Logo | Imatge (puja i s'emmagatzema) |

#### 2.6.2 Preferències

| Preferència | Opcions | Per defecte |
|-------------|---------|-------------|
| Llindar alertes contacte | 0€, 50€, 100€, 500€ | 50€ |

#### 2.6.3 Categories

CRUD de categories comptables:

- Categories d'ingressos (predefinides: Donacions, Quotes socis, Subvencions...)
- Categories de despeses (predefinides: Nòmines, Lloguer, Serveis professionals...)
- Possibilitat d'afegir categories personalitzades

#### 2.6.4 Membres i Rols

Gestió d'usuaris de l'organització:

| Rol | Permisos |
|-----|----------|
| **Admin** | Tot: editar, eliminar, configurar, convidar |
| **User** | Crear i editar, no pot eliminar ni configurar |
| **Viewer** | Només lectura |

**Funcionalitats**:
- Llistat de membres actuals
- Invitar nous membres per email
- Canviar rol d'un membre
- Eliminar membres

#### 2.6.5 Compte d'Usuari

- Canvi de contrasenya (requereix contrasenya actual)
- Selecció d'idioma (Català / Espanyol)

#### 2.6.6 Zona de Perill (Només Super Admin)

Funcionalitat d'esborrat massiu per reiniciar dades. **Només visible per al Super Admin**.

**Opcions d'esborrat**:

| Tipus | Què esborra |
|-------|-------------|
| **Donants** | Tots els contactes de tipus 'donor' |
| **Proveïdors** | Tots els contactes de tipus 'supplier' |
| **Treballadors** | Tots els contactes de tipus 'employee' |
| **Moviments** | Totes les transaccions bancàries |

**Mesures de seguretat**:

| Mesura | Descripció |
|--------|------------|
| ⚠️ Només Super Admin | El component només apareix si `user.uid === SUPER_ADMIN_UID` |
| ✍️ Confirmació obligatòria | Cal escriure "ESBORRAR" (o "BORRAR" en castellà) |
| 📦 Esborrat en batches | Processa en lots de 500 documents |
| 📊 Feedback clar | Mostra el nombre de registres esborrats |

**Ubicació**: Final de la pàgina de Configuració (només visible per Super Admin).

---

## 3. Funcionalitats Transversals

### 3.1 Intel·ligència Artificial i Auto-Assignació

Summa Social utilitza un **sistema híbrid** que combina matching local amb IA per maximitzar l'eficiència i minimitzar costos.

**Arquitectura del sistema**:

```
┌─────────────────────────────────────────────────────────┐
│           SISTEMA D'AUTO-ASSIGNACIÓ                    │
├─────────────────────────────────────────────────────────┤
│  1. Matching per nom (local, instantani, gratis)       │
│     → Resol ~70% dels casos                            │
├─────────────────────────────────────────────────────────┤
│  2. IA com a fallback (Gemini, amb cost)               │
│     → Resol ~16% addicional                            │
├─────────────────────────────────────────────────────────┤
│  3. Assignació manual (usuari)                         │
│     → ~14% restant                                     │
└─────────────────────────────────────────────────────────┘
```

**Fluxos d'IA (Genkit + Gemini)**:

| Flux | Entrada | Sortida |
|------|---------|---------|
| **categorizeTransactionFlow** | Descripció, import, llista categories | Categoria suggerida + confiança |
| **inferContactFlow** | Descripció, llista contactes | Contacte suggerit |

**Model**: Google AI Gemini 2.0 Flash

**Avantatges del sistema híbrid**:

| Aspecte | Abans (100% IA) | Ara (Híbrid) |
|---------|-----------------|--------------|
| Cost per 100 transaccions | ~0.10€ | ~0.02€ |
| Temps d'importació | 2-3 minuts | 10-15 segons |
| Límits de quota | Es pot esgotar | Quasi impossible |
| Consistència | Variable | Alta (patrons coneguts) |

**Flux complet d'auto-assignació (de principi a fi)**:

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1: IMPORTAR DONANTS (plantilla Excel)                    │
│  ────────────────────────────────────────────────────────────  │
│  • Descarregar plantilla amb columnes predefinides             │
│  • Omplir amb dades: Nom, NIF, Modalitat, Categoria...         │
│  • Importar → Categoria per defecte assignada automàticament   │
│    - Socis → "Quotes socis"                                    │
│    - Puntuals → "Donacions"                                    │
│    - O categoria específica del CSV                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  FASE 2: IMPORTAR TRANSACCIONS (extracte bancari)              │
│  ────────────────────────────────────────────────────────────  │
│  • Matching per nom (70%) → Contacte assignat                  │
│  • IA com a fallback (16%) → Contacte assignat                 │
│  • Categoria per defecte del contacte → Auto-aplicada          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  RESULTAT: 70%+ transaccions amb contacte i categoria          │
│            automàticament, sense intervenció manual             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Multi-idioma

| Idioma | Codi | Completesa |
|--------|------|------------|
| Català | ca | 100% (~1.096 línies) |
| Espanyol | es | 100% (~1.123 línies) |

Seleccionable per l'usuari, es guarda a localStorage.

### 3.3 Multi-organització

- Una instal·lació pot gestionar múltiples ONGs
- Cada organització té un `slug` únic a la URL: `/nom-org/dashboard`
- Dades completament aïllades entre organitzacions
- Un usuari pot pertànyer a múltiples organitzacions

### 3.4 Autenticació i Seguretat

| Característica | Implementació |
|----------------|---------------|
| Autenticació | Firebase Auth (email/password) |
| Autorització | Regles Firestore per organització |
| Rols | Admin, User, Viewer |
| Super Admin | UID específic amb accés total |

### 3.5 Format Numèric

Tots els imports es mostren en format europeu:
- Separador milers: punt (.)
- Separador decimals: coma (,)
- Símbol: € al final
- Exemple: 1.234,56 €

### 3.6 Normalització de Dades

Les dades s'emmagatzemen normalitzades:
- **NIF/DNI**: Majúscules, sense espais ni guions
- **IBAN**: Majúscules, sense espais
- **Noms**: Primera lletra majúscula de cada paraula
- **Codi postal**: 5 dígits

---

## 4. Arquitectura Tècnica

### 4.1 Stack Tecnològic

| Capa | Tecnologia |
|------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Backend | Firebase (Firestore, Auth, Storage) |
| IA | Genkit amb Google Gemini |
| Hosting | Firebase Hosting / Vercel |

### 4.2 Estructura de Fitxers

```
/src
  /app                    → Pàgines (Next.js App Router)
    /[orgSlug]/dashboard  → Totes les pàgines de l'app
  /components             → Components React reutilitzables
  /firebase               → Configuració i hooks Firebase
  /hooks                  → Hooks personalitzats
  /lib                    → Utilitats, tipus i dades
  /ai                     → Fluxos de Genkit (IA)
  /i18n                   → Traduccions (ca.ts, es.ts)
```

### 4.3 Model de Dades (Firestore)

```
organizations/
  └── {orgId}/
      ├── name, slug, taxId, status...
      ├── members/
      │   └── {memberId}/ → role, joinedAt
      ├── transactions/
      │   └── {txId}/ → date, amount, category...
      ├── contacts/
      │   └── {contactId}/ → type, name, taxId...
      ├── categories/
      │   └── {catId}/ → name, type
      ├── projects/
      │   └── {projId}/ → name, description
      └── remittanceMappings/
          └── {mapId}/ → mappings per remeses
```

---

## 5. Roadmap (Funcionalitats Pendents)

| Funcionalitat | Prioritat | Estat |
|---------------|-----------|-------|
| Memòria anual automàtica | Mitjana | 🔲 Pendent |
| Notificacions push | Baixa | 🔲 Pendent |
| App mòbil nativa | Baixa | 🔲 Pendent |
| Integració bancària directa | Alta | 🔲 Pendent |
| Pressupostos per projecte | Mitjana | 🔲 Pendent |
| Exportació comptable (A3, ContaPlus) | Mitjana | 🔲 Pendent |
| Auditoria de canvis | Baixa | 🔲 Pendent |

---

## 6. Informació del Projecte

| Dada | Valor |
|------|-------|
| Repositori | github.com/raulvico1975/summa-social |
| Desplegament | studio--summa-social.us-central1.hosted.app |
| Versió actual | 1.0 |
| Data documentació | 7 de desembre de 2025 |
| Autor | Raul Vico |
| Llicència | Privada |

---

*Document generat per Summa Social - Gestió financera per a ONGs*
