# SUMMA SOCIAL - Manual d'Usuari

**Versió**: 1.8
**Data**: Desembre 2025
**Per a**: Usuaris de l'aplicació

---

## Índex

1. [Primers Passos](#1-primers-passos)
2. [Configuració Inicial](#2-configuració-inicial)
3. [Gestió de Donants](#3-gestió-de-donants)
4. [Gestió de Proveïdors i Treballadors](#4-gestió-de-proveïdors-i-treballadors)
5. [Gestió de Moviments](#5-gestió-de-moviments)
6. [Divisor de Remeses](#6-divisor-de-remeses)
7. [Informes Fiscals](#7-informes-fiscals)
8. [Projectes / Eixos d'Actuació](#8-projectes--eixos-dactuació)
9. [Zona de Perill](#9-zona-de-perill)
10. [Resolució de Problemes](#10-resolució-de-problemes)

---

## 1. Primers Passos

### 1.1 Accedir a l'aplicació

1. Obre el navegador (Chrome, Firefox, Safari o Edge)
2. Ves a **https://summasocial.app**
3. Introdueix el teu **email** i **contrasenya**
4. Clica **"Iniciar sessió"**

> **Primer cop?** L'administrador t'haurà enviat una invitació per email amb les instruccions.

> **Seguretat**: La sessió es tanca automàticament quan tanques el navegador. Si uses un ordinador compartit, tanca sempre la sessió manualment.

---

### 1.2 Canviar l'idioma

L'aplicació està disponible en **Català** i **Espanyol**.

1. Clica **Configuració** al menú lateral
2. A **"Preferències"**, busca **"Idioma"**
3. Selecciona l'idioma desitjat
4. El canvi s'aplica immediatament

---

### 1.3 Navegació bàsica

L'aplicació té un **menú lateral** amb les següents seccions:

| Secció | Què hi trobaràs |
|--------|-----------------|
| **Dashboard** | Resum financer, alertes, gràfics |
| **Moviments** | Transaccions bancàries, importador |
| **Donants** | Gestió de donants i socis |
| **Proveïdors** | Gestió de proveïdors |
| **Treballadors** | Gestió d'empleats |
| **Eixos d'actuació** | Projectes |
| **Informes** | Model 182, Model 347, Certificats |
| **Configuració** | Dades org, categories, membres |

---

### 1.4 Entendre el Dashboard

Quan entres a l'app, veus el **Dashboard** (panell de control) amb la informació financera.

#### Bloc Celebracions

Apareix quan hi ha fites positives:
- Totes les transaccions categoritzades
- Balanç positiu
- X donants han contribuït
- Tot al dia, bona feina!

#### Targetes principals

| Targeta | Què significa |
|---------|---------------|
| **Ingressos** | Total de diners entrants |
| **Despeses operatives** | Diners sortints (excloent contraparts) |
| **Balanç operatiu** | Ingressos - Despeses |
| **Transferències a contraparts** | Enviaments a organitzacions sòcies |

> **Transferències a contraparts**: Fons que envieu a entitats associades per executar activitats de cooperació.

#### Bloc Donacions i Socis

| Mètrica | Comparativa |
|---------|-------------|
| Donacions | vs any anterior |
| Donants actius | vs any anterior |
| Socis actius | vs any anterior |
| Quotes socis | vs any anterior |

**Indicadors:**
- Fletxa amunt verda = Millora
- Fletxa avall vermella = Empitjora

#### Bloc Obligacions Fiscals

Mostra els terminis dels informes fiscals:
- **Model 182**: Límit 31 de gener
- **Model 347**: Límit 28 de febrer

#### Bloc Alertes

Mostra avisos importants que requereixen acció:
- Moviments sense categoritzar
- Moviments sense contacte assignat
- Donants amb dades incompletes (sense DNI o CP)

---

## 2. Configuració Inicial

### 2.1 Dades de l'organització

1. Ves a **Configuració**
2. Omple les dades:
   - Nom de l'organització
   - CIF
   - Adreça fiscal
   - Telèfon i email
   - Lloc web

### 2.2 Logo de l'organització

1. A **Configuració**, busca la secció **Logo**
2. Clica **"Pujar logo"**
3. Selecciona una imatge (PNG o JPG, màx 2MB)
4. El logo apareixerà als certificats de donació

### 2.3 Firma digitalitzada

Per als certificats de donació amb firma:

1. A **Configuració**, busca **"Firma digitalitzada"**
2. Puja una imatge de la firma (PNG amb fons transparent recomanat)
3. Omple el **nom del signant** i el **càrrec**

### 2.4 Categories

Les categories classifiquen els moviments. Ja venen categories per defecte.

**Per afegir una categoria:**
1. Ves a **Configuració > Categories**
2. Clica **"+ Nova categoria"**
3. Escriu el nom i selecciona tipus (Ingrés o Despesa)

**Categories habituals d'ingrés:**
- Donacions
- Quotes de socis
- Subvencions
- Altres ingressos

**Categories habituals de despesa:**
- Nòmines
- Lloguer
- Subministraments
- Material
- Transferències a contraparts

### 2.5 Membres de l'equip

Pots convidar altres persones a gestionar l'organització.

**Rols disponibles:**

| Rol | Permisos |
|-----|----------|
| **SuperAdmin** | Tot + Zona de Perill |
| **Admin** | Tot excepte Zona de Perill |
| **User** | Gestió diària (moviments, contactes) |
| **Viewer** | Només lectura |

**Per convidar algú:**
1. Ves a **Configuració > Membres**
2. Clica **"Convidar membre"**
3. Introdueix l'email i selecciona el rol
4. La persona rebrà un email amb instruccions

---

## 3. Gestió de Donants

### 3.1 Veure la llista de donants

1. Clica **Donants** al menú lateral
2. Veuràs la llista amb tots els donants

**Filtres disponibles:**
- **Actius**: Donants en actiu (per defecte)
- **Baixes**: Donants donats de baixa
- **Tots**: Tots els donants

**Informació mostrada:**
- Nom
- DNI/CIF
- Tipus (Particular/Empresa)
- Modalitat (Soci/Puntual)
- Estat (Actiu/Baixa)
- Quota mensual

### 3.2 Afegir un donant manualment

1. Clica **"+ Nou donant"**
2. Omple les dades:
   - **Nom** (obligatori)
   - **DNI/CIF** (obligatori per Model 182)
   - **Codi postal** (obligatori per Model 182)
   - Adreça, ciutat, província
   - Email, telèfon
   - IBAN
   - Tipus: Particular o Empresa
   - Modalitat: Soci (recurrent) o Puntual
   - Quota mensual (si és soci)
3. Clica **"Guardar"**

### 3.3 Importar donants des d'Excel

Si tens una llista de donants en Excel:

1. Clica **"Importar donants"**
2. Selecciona el fitxer Excel (.xlsx) o CSV
3. L'aplicació detecta automàticament les columnes
4. Revisa el mapejat de columnes:
   - Nom
   - DNI/CIF
   - Codi postal
   - Ciutat, Província
   - Adreça
   - Tipus (Particular/Empresa)
   - Modalitat (Socio/Puntual)
   - **Estat (Actiu/Baixa)** - NOU v1.8
   - IBAN
   - Email, Telèfon
5. Clica **"Previsualitzar"**
6. Revisa les dades i corregeix errors
7. Clica **"Importar"**

### 3.4 Actualitzar donants existents (NOU v1.8)

Si vols actualitzar dades de donants que ja existeixen:

1. Prepara un Excel amb les dades actualitzades (ha de tenir el DNI)
2. Importa el fitxer normalment
3. Els donants amb DNI duplicat es marcaran com **"Duplicat"**
4. Activa el checkbox **"Actualitzar dades de donants existents"**
5. Els duplicats canviaran a **"Actualitzar"** (color blau)
6. Clica **"Importar"**

**Camps que s'actualitzen:**
- Estat (Actiu/Baixa)
- Codi postal
- Adreça
- Email, Telèfon
- IBAN
- Modalitat
- Tipus

**Camps que NO s'actualitzen** (per seguretat):
- Nom
- DNI

### 3.5 Gestió d'estat Actiu/Baixa (NOU v1.8)

Pots marcar donants com a "Baixa" quan deixen de col·laborar.

**Per donar de baixa un donant:**
1. Clica el donant per obrir el formulari d'edició
2. Canvia el camp **"Estat"** de "Actiu" a "Baixa"
3. Es guardarà automàticament la data de baixa
4. Clica **"Guardar"**

**Per reactivar un donant:**
- **Opció 1**: Edita el donant i canvia l'estat a "Actiu"
- **Opció 2**: A la llista, clica el botó **"Reactivar"** (icona de fletxa circular)

**Filtrar per estat:**
- Per defecte es mostren només els **Actius**
- Clica **"Baixes"** per veure els donants de baixa
- Clica **"Tots"** per veure-ho tot

### 3.6 Fitxa del donant

Clica el nom d'un donant per obrir la seva fitxa:

**Informació disponible:**
- Dades personals completes
- Historial de donacions
- Resum per any
- Total donat

**Accions disponibles:**
- Editar dades
- Generar certificat de donació
- Veure moviments associats

### 3.7 Categoria per defecte

Pots assignar una categoria per defecte a cada donant. Quan s'assigni aquest donant a un moviment, la categoria s'aplicarà automàticament.

1. Edita el donant
2. A **"Categoria per defecte"**, selecciona una categoria
3. Guardar

---

## 4. Gestió de Proveïdors i Treballadors

### 4.1 Proveïdors

Funciona igual que els donants, però per a empreses i autònoms que us facturen.

**Camps importants:**
- Nom/Raó social
- CIF (obligatori per Model 347)
- Categoria per defecte

**Per què serveix?**
- Assignar despeses a proveïdors
- Generar el Model 347 (operacions > 3.005,06€)

### 4.2 Treballadors

Per gestionar les nòmines i pagaments a empleats.

**Camps:**
- Nom complet
- DNI
- Categoria per defecte (normalment "Nòmines")

---

## 5. Gestió de Moviments

### 5.1 Veure moviments

1. Clica **Moviments** al menú lateral
2. Veuràs la llista de totes les transaccions

**Columnes:**
- Data
- Descripció (concepte bancari)
- Import (verd = ingrés, vermell = despesa)
- Categoria
- Contacte
- Projecte (opcional)
- Document adjunt
- Nota

### 5.2 Importar extracte bancari

1. Descarrega l'extracte del teu banc (format CSV o Excel)
2. A **Moviments**, clica **"Importar extracte"**
3. Selecciona el fitxer
4. L'app detecta automàticament:
   - Data
   - Concepte/Descripció
   - Import
5. Revisa la previsualització
6. Clica **"Importar"**

**Auto-assignació:**
L'aplicació intenta assignar automàticament:
- El **contacte** (per coincidència de nom a la descripció)
- La **categoria** (si el contacte té categoria per defecte)

### 5.3 Filtres de moviments

**Filtres disponibles:**
- Per data (any, trimestre, mes, personalitzat)
- Per categoria
- Per contacte
- Per projecte
- Sense categoritzar
- Sense contacte
- **Ocultar desglossament de remeses** (NOU v1.8) - Activat per defecte

### 5.4 Editar un moviment

1. Clica el moviment a la taula
2. Modifica els camps:
   - Descripció
   - Import
   - Categoria (selector amb cerca)
   - Contacte (selector amb cerca)
   - Projecte
   - Nota
3. Els canvis es guarden automàticament

### 5.5 Adjuntar documents

Pots adjuntar factures o justificants a cada moviment:

1. Clica la icona de document a la fila del moviment
2. Selecciona el fitxer (PDF, imatge)
3. Es pujarà i quedarà vinculat al moviment

### 5.6 Categorització massiva amb IA

Si tens molts moviments sense categoritzar:

1. Filtra per **"Sense categoritzar"**
2. Clica **"Categoritzar amb IA"**
3. L'aplicació usarà intel·ligència artificial per suggerir categories
4. Revisa i confirma les assignacions

---

## 6. Divisor de Remeses

### 6.1 Què és una remesa?

Una **remesa** és un únic ingrés bancari que agrupa múltiples quotes de socis. Per exemple: "REMESA SANTANDER 4.352€" que conté 303 quotes individuals de 10€, 15€, 20€...

### 6.2 Per què dividir-la?

- Per saber **quant ha donat cada soci**
- Per generar el **Model 182** correctament
- Per emetre **certificats de donació** individuals

### 6.3 Com dividir una remesa

1. Localitza la remesa a **Moviments**
2. Clica el menú **⋮** de la fila
3. Selecciona **"Dividir remesa"**
4. Puja el fitxer de detall del banc (CSV o Excel)
5. Mapeja les columnes:
   - **Import** (obligatori)
   - **Nom** del titular
   - **DNI/CIF**
   - **IBAN**
6. Clica **"Processar"**

### 6.4 Matching de socis

L'aplicació intenta trobar cada soci automàticament:

| Prioritat | Mètode |
|-----------|--------|
| 1 | Per DNI/CIF (exacte) |
| 2 | Per IBAN (exacte) |
| 3 | Per Nom (aproximat) |

**Estats possibles:**
- **Trobat** (verd): Soci existent identificat
- **Trobat (Baixa)** (taronja): Soci trobat però està de baixa - NOU v1.8
- **Nou** (blau): Soci no existent, es crearà
- **Sense DNI** (groc): No es pot crear sense DNI

### 6.5 Socis de baixa detectats (NOU v1.8)

Si la remesa conté quotes de socis que estan donats de baixa:

1. Apareix un **avís taronja** amb el nombre de socis afectats
2. Pots **reactivar-los individualment** clicant el botó "Reactivar"
3. O **reactivar-los tots** clicant "Reactivar tots els de baixa"

> **Per què passa?** El banc segueix passant rebuts de socis que haurien d'estar donats de baixa a la domiciliació bancària.

### 6.6 Guardar configuració

Si sempre uses el mateix banc:

1. Després de mapejar les columnes, clica **"Guardar configuració"**
2. Dona-li un nom (ex: "Santander CORE")
3. La propera vegada, selecciona la configuració guardada

### 6.7 Vista agrupada de remeses (NOU v1.8)

Després de processar una remesa:

- La remesa original queda com **1 sola línia** al llistat
- Mostra un **badge amb el comptador**: "303" (nombre de quotes)
- Les quotes individuals **no apareixen** al llistat (estan ocultes per defecte)

**Per veure el detall:**
1. Clica el badge amb el número (ex: "303")
2. S'obre una **modal** amb totes les quotes
3. Pots **cercar** per nom o DNI
4. Clica el **nom d'un soci** per anar a la seva fitxa

**Per mostrar totes les quotes:**
- Desactiva el filtre **"Ocultar desglossament de remeses"**

---

## 7. Informes Fiscals

### 7.1 Model 182 - Donacions

**Què és?** Declaració informativa de donatius rebuts. Obligatori si reps donacions.

**Termini:** 31 de gener

**Com generar-lo:**

1. Ves a **Informes > Model 182**
2. Selecciona l'any
3. Revisa les **alertes**:
   - Donants sense DNI
   - Donants sense Codi Postal
4. Corregeix els errors (clica el donant per editar-lo)
5. Clica **"Generar Excel"**
6. Envia el fitxer a la teva gestoria

**Columnes de l'Excel:**

| Columna | Descripció |
|---------|------------|
| NIF | DNI o CIF del donant |
| NOMBRE | Nom complet |
| CLAVE | "A" (donació dinerària) |
| PROVINCIA | Codi de 2 dígits (del CP) |
| VALOR | Import donat l'any actual |
| VALOR_1 | Import any anterior |
| VALOR_2 | Import fa 2 anys |
| RECURRENTE | "X" si ha donat 3 anys seguits |
| NATURALEZA | "F" (persona) o "J" (empresa) |

### 7.2 Model 347 - Operacions amb tercers

**Què és?** Declaració d'operacions amb tercers que superen 3.005,06€ anuals.

**Termini:** 28 de febrer

**Com generar-lo:**

1. Ves a **Informes > Model 347**
2. Selecciona l'any
3. Només apareixen proveïdors amb operacions > 3.005,06€
4. Clica **"Generar CSV"**
5. Envia el fitxer a la teva gestoria

### 7.3 Certificats de donació

Els donants poden sol·licitar un certificat per desgravar a la declaració de renda.

**Certificat individual:**
1. Ves a **Donants**
2. Clica el donant
3. A la fitxa, clica **"Generar certificat"**
4. Selecciona l'any
5. Es genera un PDF amb la firma digitalitzada

**Certificats massius:**
1. Ves a **Informes > Certificats**
2. Selecciona l'any
3. Clica **"Generar tots"**
4. Es descarrega un ZIP amb tots els certificats

---

## 8. Projectes / Eixos d'Actuació

### 8.1 Què són els projectes?

Permeten classificar moviments per projecte o àrea d'actuació. Útil per:
- Justificar subvencions
- Controlar pressupostos per projecte
- Informes per a la junta

### 8.2 Crear un projecte

1. Ves a **Eixos d'actuació**
2. Clica **"+ Nou projecte"**
3. Omple:
   - Nom
   - Descripció
   - Finançador (opcional)
4. Clica **"Crear"**

### 8.3 Assignar moviments a projectes

1. Edita un moviment
2. A **"Projecte"**, selecciona el projecte
3. El moviment quedarà vinculat

### 8.4 Veure estadístiques

A la llista de projectes veuràs:
- Total ingressos
- Total despeses
- Balanç

---

## 9. Zona de Perill

### 9.1 Accés

Només accessible per **SuperAdmin**.

1. Ves a **Configuració**
2. Baixa fins a **"Zona de Perill"**

### 9.2 Accions disponibles

| Acció | Què fa |
|-------|--------|
| **Esborrar tots els donants** | Elimina tots els donants |
| **Esborrar tots els proveïdors** | Elimina tots els proveïdors |
| **Esborrar tots els treballadors** | Elimina tots els treballadors |
| **Esborrar tots els moviments** | Elimina totes les transaccions |
| **Esborrar última remesa** (NOU v1.8) | Esborra les quotes i restaura la remesa original |

### 9.3 Esborrar última remesa (NOU v1.8)

Si has processat una remesa incorrectament:

1. Clica **"Esborrar última remesa processada"**
2. L'app mostra la info de la remesa trobada:
   - Data
   - Concepte
   - Import
   - Nombre de quotes
3. Escriu **"BORRAR"** (o "ESBORRAR" en català) per confirmar
4. Es restaura la remesa original per poder tornar-la a processar

---

## 10. Resolució de Problemes

### 10.1 No puc iniciar sessió

- Verifica que l'email és correcte
- Comprova la contrasenya (majúscules/minúscules)
- Clica **"He oblidat la contrasenya"** per recuperar-la

### 10.2 No veig les meves dades

- Comprova que estàs a l'organització correcta
- El filtre de dates pot estar excloent moviments

### 10.3 L'importació falla

- El fitxer ha de ser CSV o Excel (.xlsx)
- Comprova que les columnes tenen capçalera
- Verifica el format de les dates (DD/MM/YYYY)

### 10.4 Donant duplicat

Si intentes importar un donant que ja existeix:
- Activa **"Actualitzar dades de donants existents"**
- O edita manualment el donant existent

### 10.5 Remesa no es divideix correctament

- Verifica que el fitxer del banc té les columnes correctes
- Comprova que els imports coincideixen amb el total
- Assegura't que els DNI/IBAN estan correctes

### 10.6 Model 182 té errors

- Revisa les alertes de donants amb dades incompletes
- Verifica que tots tenen DNI i Codi Postal
- Els codis postals han de tenir 5 dígits

### 10.7 La sessió es tanca sovint

Per seguretat, la sessió es tanca en tancar el navegador. Això és intencionat.

---

## Glossari

| Terme | Definició |
|-------|-----------|
| **Remesa** | Agrupació de quotes de socis en un únic ingrés bancari |
| **Model 182** | Declaració informativa de donatius (límit 31 gener) |
| **Model 347** | Declaració d'operacions amb tercers > 3.005,06€ (límit 28 febrer) |
| **Soci** | Donant recurrent amb quota periòdica |
| **Donant puntual** | Donant amb aportacions esporàdiques |
| **Transferència a contrapart** | Enviament a organitzacions sòcies internacionals |
| **Categoria per defecte** | Categoria que s'aplica automàticament |
| **SuperAdmin** | Rol amb accés total, inclosa Zona de Perill |

---

## Contacte i Suport

Per a dubtes o problemes:
- Contacta l'administrador de la teva organització
- Revisa aquest manual

---

**Summa Social v1.8** - Desembre 2025
