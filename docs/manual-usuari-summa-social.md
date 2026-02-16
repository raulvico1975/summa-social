# SUMMA SOCIAL - Manual d'Usuari Complet

**Versió**: 1.42
**Última actualització**: 16 Febrer 2026

---

## Hola! 👋

Si estàs llegint això, probablement portes els comptes d'una entitat sense ànim de lucre. Saps perfectament el que és passar hores amb fulls de càlcul, perdre't entre extractes bancaris, o estressar-te quan arriba el gener i toca preparar el Model 182.

**Bona notícia: això s'acaba aquí.**

Summa Social existeix per alliberar-te d'aquesta càrrega. L'objectiu és que dediquis el teu temps a allò que realment importa: la missió de la teva entitat.

Aquest manual t'acompanyarà pas a pas. No cal que el llegeixis tot d'una tirada — consulta'l quan tinguis un dubte concret. I recorda: si t'equivoques, gairebé tot es pot corregir.

Endavant!

---

## Índex

1. [Primers Passos](#1-primers-passos)
2. [Configuració Inicial](#2-configuració-inicial)
3. [Gestió de Donants](#3-gestió-de-donants)
4. [Gestió de Proveïdors i Treballadors](#4-gestió-de-proveïdors-i-treballadors)
5. [Gestió de Moviments](#5-gestió-de-moviments)
6. [Divisor de Remeses](#6-divisor-de-remeses)
6b. [Documents Pendents i Remeses SEPA OUT](#6b-documents-pendents-i-remeses-sepa-out)
6c. [Liquidacions de Despeses de Viatge](#6c-liquidacions-de-despeses-de-viatge-v128)
7. [Gestió de Devolucions Bancàries](#7-gestió-de-devolucions-bancàries)
8. [Donacions via Stripe](#8-donacions-via-stripe)
9. [Informes Fiscals](#9-informes-fiscals)
10. [Projectes i Justificació de Subvencions](#10-projectes-i-justificació-de-subvencions)
10b. [Paquet de Tancament](#10b-paquet-de-tancament)
11. [Resolució de Problemes](#11-resolució-de-problemes)
12. [Glossari](#12-glossari)

---

# 1. Primers Passos

**Aquesta secció t'ajudarà a...**

Orientar-te dins l'aplicació els primers dies. Sabem que quan s'obre una eina nova, la primera sensació pot ser de "per on començo?". Aquí t'expliquem com entrar, com moure't per les diferents pantalles, i com interpretar els números clau que veuràs al Dashboard.

Després de llegir aquesta secció, et sentiràs còmode navegant per Summa Social i sabràs interpretar la informació que et mostra.

---

## 1.1 Com accedir a l'aplicació

### Pas a pas

1. Obre el teu navegador preferit (Chrome, Firefox, Safari o Edge)
2. Escriu a la barra d'adreces: **https://summasocial.app**
3. Introdueix el teu **email**
4. Introdueix la teva **contrasenya**
5. Clica el botó **"Iniciar sessió"**

### Si és el teu primer cop

L'administrador de la teva entitat t'haurà enviat un email d'invitació. Busca un correu amb l'assumpte **"Invitació a Summa Social"** i segueix les instruccions per crear el teu compte.

**No trobes l'email?** Mira a la carpeta de spam o correu brossa. Si no hi és, demana a l'administrador que et torni a enviar la invitació.

### Sobre la seguretat

Per protegir les dades de l'entitat, hem configurat algunes mesures de seguretat:

- ✅ **La sessió es tanca** quan tanques el navegador
- ✅ **La sessió es tanca** després de **30 minuts sense activitat** (rebràs un avís 1 minut abans per si vols continuar)
- ✅ **Reautenticació cada 12 hores** encara que hi hagi activitat (per seguretat)
- ✅ Si uses un **ordinador compartit**, recorda tancar sessió manualment quan acabis

**Com tancar sessió:** Clica el teu nom (a dalt a la dreta) → "Tancar sessió"

### Sobre les còpies de seguretat

Les còpies de seguretat de les dades de l'entitat les gestiona l'administrador del sistema de Summa Social. No cal que facis res: les teves dades estan protegides.

Si necessites una còpia de les dades de la teva entitat (per exemple, per a una auditoria o migració), contacta amb l'administrador del sistema.

---

## 1.2 Configuració d'Usuari: Idioma de l'aplicació

L'aplicació està disponible en **3 idiomes**:
- 🇨🇦 Català
- 🇪🇸 Espanyol  
- 🇫🇷 Francès

### Com canviar-lo

1. Ves a ⚙️ **Configuració**
2. A l'apartat **Configuració d'Usuari**, busca **"Idioma de l'aplicació"**
3. Tria l'idioma que prefereixis
4. El canvi s'aplica immediatament

> 💡 Cada persona de l'equip pot tenir el seu propi idioma configurat. El teu canvi no afecta els altres.

---

## 1.3 Navegació per l'aplicació

A la part esquerra de la pantalla tens el **menú de navegació**. Aquí tens un mapa de què trobaràs a cada lloc:

| Icona | Secció | Què hi trobaràs |
|:-----:|--------|-----------------|
| 📊 | **Dashboard** | El resum de com van les finances: números clau, gràfics i resum compartible |
| 💰 | **Moviments** | Els extractes bancaris i totes les transaccions |
| ❤️ | **Donants** | La base de dades de donants i socis |
| 🏢 | **Proveïdors** | Empreses i professionals als quals pagueu |
| 👷 | **Treballadors** | El personal contractat |
| 📁 | **Projectes** | Per organitzar per àrees de treball i justificar subvencions |
| 📄 | **Informes** | Model 182, Model 347 i certificats de donació |
| ⚙️ | **Configuració** | Preferències d'usuari, dades de l'entitat i mòduls |

---

## 1.4 Entendre el Dashboard

El Dashboard és la primera pantalla que veus en entrar. Pensa-hi com el **tauler de control** de les finances de l'entitat.

### 💰 Bloc "Diners"

Mostra la **veritat bancària** — el que diu l'extracte del banc.

| Targeta | Què et diu |
|---------|------------|
| **Ingressos** | Tot el que ha entrat al compte |
| **Despeses operatives** | Tot el que ha sortit (sense comptar terreny) |
| **Terreny** | Diners enviats a entitats sòcies o projectes de cooperació |
| **Saldo operatiu** | La suma de tot: Ingressos + Despeses + Terreny |

> 💡 **Què és el Terreny?** Són transferències a organitzacions associades o projectes internacionals. No són "despesa" en el sentit clàssic — són part de la vostra missió.

### ❤️ Bloc "Qui ens sosté"

Mostra les **persones** que us donen suport — socis i donants.

| Targeta | Què et diu |
|---------|------------|
| **Quotes de socis** | Import de les persones que paguen regularment |
| **Donacions puntuals** | Import de les persones que fan donatius esporàdics |
| **Altres ingressos** | Subvencions, loteria, reintegraments... (tot el que no ve de persones) |
| **Socis actius** | Quants socis han pagat en el període |
| **Donants actius** | Quants donants han aportat en el període |

> 🔍 **Nota:** Si sumes Quotes + Donacions + Altres ingressos, el resultat hauria de coincidir amb els Ingressos totals del bloc "Diners". Això et permet reconciliar mentalment el Dashboard amb l'extracte bancari.

### 📊 Bloc "Despeses principals per categoria"

Aquest bloc et mostra on se'n van els diners del període seleccionat.

| Categoria | Import | % del total | ∆ vs anterior | Acció |
|-----------|--------|-------------|---------------|-------|
| Comunicació i màrqueting | 14.429,86 € | 84,8% | — | Veure |
| Salaris i seguretat social | 2.119,62 € | 12,5% | — | Veure |
| Serveis professionals | 471,90 € | 2,8% | — | Veure |

Si cliques **"Veure"** a una categoria, obres directament el detall dels moviments d'aquella categoria.

### 🗓️ Selector de període

El període que triïs afecta tot el Dashboard alhora.

Opcions habituals:
- Tot
- Mes
- Trimestre
- Any
- Rang personalitzat

> 💡 Si vols comparar bé, utilitza períodes equivalents (per exemple, trimestre actual vs trimestre anterior).

### 🔗 "Compartir resum"

Aquest botó obre una finestra amb un resum del període, pensada per compartir amb junta o equip de manera ràpida i clara.

Pas a pas recomanat:
1. Tria el període
2. Clica **"Compartir resum"**
3. Revisa el text generat (i edita'l si ho necessites)
4. Tria com el vols compartir: **Copiar** el text, **Enviar per email** o **Exportar Excel/CSV**
5. Comparteix-lo amb qui correspongui

> 💡 Aquest botó no crea un enllaç públic: comparteixes un resum en format text o fitxer.
> 💡 Abans de compartir, val la pena revisar si tens moviments sense categoritzar o sense contacte.

### 📅 Obligacions Fiscals

Et recorda les dates límit dels models fiscals:

| Model | Data límit |
|-------|------------|
| **Model 182** | 31 de gener |
| **Model 347** | 28 de febrer |

El color t'indica la urgència: 🟢 Tens temps · 🟡 Prepara-ho · 🔴 Urgent

---

# 2. Configuració Inicial

**Aquesta secció t'ajudarà a...**

Deixar Summa Social preparada perquè tothom treballi amb criteri comú i amb les dades ben informades.

Per fer-ho fàcil, seguim sempre aquest ordre:
- **A. Configuració d'Usuari**: Idioma de l'aplicació, Canviar contrasenya, Membres
- **B. Configuració de l'Organització**: Dades de l'organització, Gestionar categories, Comptes bancaris, Mòduls opcionals

---

## 2.1 Configuració d'Usuari

### Idioma de l'aplicació

1. Ves a ⚙️ **Configuració**
2. A **Configuració d'Usuari**, tria l'idioma de la interfície
3. El canvi s'aplica immediatament

> 💡 Cada membre pot tenir el seu idioma. No afecta la resta de l'equip.

### Canviar contrasenya

1. Ves a ⚙️ **Configuració**
2. A **Canviar contrasenya**, informa:
   - Contrasenya actual
   - Nova contrasenya
   - Confirmació de la nova contrasenya
3. Clica **"Guardar nova contrasenya"**

Si no recordes la contrasenya actual, fes servir la recuperació des de la pantalla de login (ho tens explicat a la secció 11.1).

### Membres

Si tens rol d'administrador, des d'aquí pots convidar persones de l'equip i ajustar rols.

Pas a pas:
1. Ves a ⚙️ **Configuració > Membres**
2. Clica **"Convidar membre"**
3. Escriu l'email
4. Tria el rol
5. Envia la invitació

Rols disponibles:
- **Administrador** (`admin`): gestió operativa i de configuració de l'entitat
- **Usuari** (`user`): operativa diària
- **Només lectura** (`viewer`): consulta, sense edició

Altres accions útils en aquest bloc:
- Importar invitacions en bloc (icona de pujada)
- Exportar la llista de membres (icona de descàrrega)
- Canviar rol o cancel·lar invitacions pendents

> 💡 Recomanació: dona sempre el rol mínim necessari.

---

## 2.2 Configuració de l'Organització: Dades de l'organització

Aquestes dades surten als documents oficials de l'entitat (certificats, informes, etc.).

### Què convé revisar

| Camp | Exemple |
|------|---------|
| Nom de l'organització | Associació Exemple |
| CIF | G12345678 |
| Adreça | Carrer Major, 15 |
| Codi postal / Ciutat / Província | 08001 · Barcelona · Barcelona |
| Telèfon | 93 123 45 67 |
| Email | info@entitat.org |
| Pàgina web | https://entitat.org |
| Llindar mínim per alertes | 50 € |

També pots pujar el **logo** de l'entitat (PNG o JPG, màxim 2 MB).

### Certificats de donació (dins de Configuració)

En aquest bloc pots deixar a punt:
- l'**idioma dels certificats**
- la **firma digitalitzada** (imatge)
- el **nom del signant**
- el **càrrec del signant**

> 💡 Si això està ben configurat ara, quan arribi la campanya de certificats aniràs molt més ràpid.

---

## 2.3 Configuració de l'Organització: Gestionar categories

Les categories t'ajuden a tenir dades netes per al dia a dia i per als informes fiscals.

### Accions habituals

- Crear categoria nova
- Editar categories existents
- Arxivar categories que ja no faràs servir
- Importar o exportar categories
- Reassignar moviments si arxives una categoria que encara estava en ús

Pas a pas per crear-ne una:
1. Ves a ⚙️ **Configuració > Gestionar Categories**
2. Clica **"Afegir categoria"**
3. Escriu el nom i el tipus (ingrés o despesa)
4. Desa

> 💡 Millor poques categories clares que moltes categories difícils de mantenir.

---

## 2.4 Configuració de l'Organització: Comptes bancaris

Si tens més d'un compte, registra'ls aquí per poder filtrar bé moviments i remeses.

Pas a pas:
1. Ves a ⚙️ **Configuració > Comptes bancaris**
2. Clica **"Afegir compte"**
3. Informa nom, IBAN i banc
4. Desa

Des d'aquest mateix bloc també pots:
- Editar un compte existent
- Marcar un compte com a **Per defecte**
- Desactivar o reactivar comptes
- Importar/exportar comptes en Excel

Si l'entitat genera remeses de cobrament, comprova també que el compte tingui informat l'**Identificador de creditor SEPA (ICS)**.

> 💡 Per seguretat, no es pot desactivar l'últim compte actiu ni un compte que tingui moviments associats.

---

## 2.5 Configuració de l'Organització: Mòduls opcionals

Si tens rol d'administrador, aquí pots activar o desactivar funcionalitats addicionals de l'entitat.

Exemples habituals:
- **Mòdul Projectes**
- **Documents pendents** (experimental)

Punt important:
- **Documents pendents** i **Liquidacions** solen venir activats per defecte
- L'entitat pot decidir desactivar-los en qualsevol moment des d'aquí (administradors)

---

# 3. Gestió de Donants

**Aquesta secció t'ajudarà a...**

Mantenir una base de donants ordenada i completa. Això és fonamental perquè al gener, quan toqui generar el Model 182, tot surti correcte sense haver de córrer d'última hora.

Pensa en aquesta secció com la teva "agenda de donants". Quan més completa estigui, menys maldecaps tindràs amb la fiscalitat.

---

## 3.1 Per què és important tenir les dades completes?

El Model 182 (la declaració de donatius) exigeix certes dades de cada donant. Si falten, el donant **no apareixerà** a la declaració i podríeu tenir problemes amb Hisenda.

### Dades obligatòries per al Model 182

| Dada | Si falta... |
|------|-------------|
| **Nom complet** | El donant no apareix |
| **DNI o CIF** | El donant no apareix |
| **Codi postal** | Error de província |

### Dades molt recomanades

| Dada | Per a què serveix |
|------|-------------------|
| **IBAN** | Identificar-lo automàticament a les remeses |
| **Email** | Identificar-lo automàticament a Stripe |

---

## 3.2 Afegir un donant manualment

### Pas a pas

1. Ves a ❤️ **Donants**
2. Clica **"+ Nou donant"**
3. Omple el formulari:

| Camp | Obligatori? | Exemple |
|------|:-----------:|---------|
| **Nom** | ✅ | Maria Garcia López |
| **DNI/CIF** | ⚠️ Per al Model 182 | 12345678A |
| **Codi postal** | ⚠️ Per al Model 182 | 08001 |
| Adreça | No | Carrer Major, 15 |
| Email | Recomanat | maria@example.com |
| IBAN | Recomanat | ES12 3456 7890... |
| **Tipus** | ✅ | Particular o Empresa |
| **Modalitat** | ✅ | Soci o Puntual |
| Quota | Si és soci | 15,00 € |
| Periodicitat | Si és soci | Mensual, Trimestral, Semestral o Anual |
| Persona de contacte | No (només Empresa) | Pere Martí |
| Categoria per defecte | Opcional | Quotes de socis |

4. Clica **"Guardar"**

### Persona de contacte (v1.41)

Quan el donant és de tipus **Empresa**, apareix un camp addicional: **Persona de contacte**. Serveix per apuntar el nom de la persona amb qui tracteu dins l'empresa (per exemple, la responsable de RSC). És un camp opcional i purament informatiu — no afecta cap càlcul ni informe fiscal.

### Què és la "Categoria per defecte"?

Si assignes una categoria per defecte a un donant, tots els seus moviments es **categoritzaran automàticament**. Per exemple, si en Joan és soci i la seva categoria per defecte és "Quotes de socis", cada cop que importis un pagament seu, es categoritzarà sol.

Això t'estalvia molta feina repetitiva.

---

## 3.3 Importar donants des d'Excel (v1.28)

Si ja tens una llista de donants en un full de càlcul, no cal que els introdueixis un per un.

### Pas a pas (amb plantilla oficial)

1. Ves a ❤️ **Donants**
2. Clica **"Importar donants"**
3. Clica **"Descarregar plantilla"** per obtenir el format oficial
4. Omple la plantilla amb les teves dades
5. Arrossega el fitxer omplert
6. L'aplicació **detecta automàticament** totes les columnes (100% sense mapeig)
7. Revisa les dades (🟢 OK · 🟡 Avís · 🔴 Error)
8. Clica **"Importar"**

> 💡 **Consell:** La plantilla oficial garanteix detecció al 100%. Si uses un altre format, potser caldrà mapejar columnes manualment.

### Columnes de la plantilla oficial

| Columna | Descripció | Obligatori |
|---------|------------|------------|
| Nom | Nom complet | ✅ |
| NIF | Document d'identitat | Per Model 182 |
| Tipus | Particular o Empresa | ✅ |
| Modalitat | Puntual o Soci | ✅ |
| Estat | Alta o Baixa | Opcional |
| Quota | Import en € | Opcional |
| Periodicitat | Mensual, Trimestral, Semestral, Anual | Opcional |
| Persona de contacte | Nom (només per empreses) | Opcional |
| IBAN | Compte bancari | Opcional |
| Adreça | Domicili | Opcional |
| Codi postal | CP | Per Model 182 |
| Ciutat, Província | Localització | Opcional |
| Telèfon, Email | Contacte | Opcional |
| Categoria | Categoria per defecte | Opcional |

### Categoria per defecte

Si l'Excel porta una columna "Categoria", el sistema intentarà trobar-la entre les categories existents. Si no la troba, s'usarà la categoria alternativa configurada (sense bloquejar la importació).

---

## 3.4 Actualitzar donants existents

Si vols actualitzar dades de donants que ja tens registrats (per exemple, canvis d'adreça o IBAN), pots fer-ho massivament.

### Pas a pas

1. Prepara un Excel amb les dades actualitzades (ha de tenir el DNI)
2. Importa el fitxer normalment
3. Els donants amb DNI duplicat es marcaran en **gris**
4. Activa el checkbox **"Actualitzar dades de donants existents"**
5. Canviaran a **blau** (s'actualitzaran)
6. Clica **"Importar"**

### Què s'actualitza i què no

| ✅ S'actualitza | ❌ NO s'actualitza |
|-----------------|-------------------|
| Estat, CP, Adreça | Nom |
| Email, Telèfon, IBAN | DNI (és la clau) |
| Modalitat, Tipus | |

---

## 3.5 Gestionar l'estat dels donants (Actiu/Baixa)

Quan un donant deixa de col·laborar, **no l'esborris**. Marca'l com a "Baixa". Així conserves tot el seu historial per a informes d'anys anteriors.

### Com donar de baixa un donant

1. Ves a ❤️ **Donants**
2. Clica el nom del donant
3. Clica **"Editar"**
4. Canvia l'estat a **"Baixa"**
5. Clica **"Guardar"**

### Com reactivar un donant

A la llista de donants (filtra per "Baixes"), clica la icona de **fletxa circular** al costat del donant.

---

## 3.6 La fitxa del donant

Clica el **nom** de qualsevol donant per obrir la seva fitxa lateral. Hi trobaràs:

- Dades personals completes
- Historial de quotes i donacions (incloent les que venen de remeses)
- Historial de devolucions
- Resum per any
- Accions: Editar, Generar certificat

---

## 3.7 Assignació automàtica de quotes i aportacions

Quan divideixes una remesa des de **Moviments**, Summa reparteix automàticament les quotes/aportacions a cada soci o donant identificat.

Això aplica tant a:
- remeses SEPA de cobrament
- remeses de Stripe

> 💡 Això et evita haver d'entrar donant per donant per registrar manualment cada aportació.

---

## 3.8 Devolucions: com impacten al donant

També es registra automàticament quan:
- processos una remesa de devolucions
- assignes una devolució individual des de Moviments

El resultat és que la fitxa del donant queda actualitzada amb el net real:
- aportacions
- devolucions
- total anual resultant

---

## 3.9 Exportar la llista de donants a Excel

Si necessites les dades fora de Summa Social:

1. Ves a ❤️ **Donants**
2. Clica **"Exportar"**
3. Es descarrega un Excel amb: Nom, NIF, Quota, IBAN, Estat, Persona de contacte (si és empresa), etc.

---

## 3.10 Filtrar donants a la llista (v1.41)

A la llista de donants pots combinar diversos filtres per trobar exactament el que busques. Els filtres funcionen amb lògica "i" — és a dir, si actives dos filtres, es mostren els donants que compleixen **tots dos** alhora.

### Filtres disponibles

| Filtre | Opcions | Per a què serveix |
|--------|---------|-------------------|
| **Estat** | Alta / Baixa | Veure donants actius o donats de baixa |
| **Tipus** | Particular / Empresa | Separar persones físiques de jurídiques |
| **Modalitat** | Soci / Puntual | Distingir socis recurrents de donants puntuals |
| **Periodicitat** | Mensual / Trimestral / Semestral / Anual | Filtrar socis segons la freqüència de quota |
| **Cerca** | Text lliure | Buscar per nom, NIF o qualsevol dada |
| **Incomplets** | Sí / No | Veure donants als quals els falta alguna dada per al Model 182 |
| **Devolucions** | Sí / No | Veure donants amb devolucions bancàries |

Cada opció de filtre mostra un **comptador** amb el nombre de donants que coincideixen, perquè sempre sàpigues quants n'hi ha sense haver de comptar.

### Com funciona

1. Ves a ❤️ **Donants**
2. Clica les opcions de filtre que vulguis (es poden combinar)
3. Per desactivar un filtre, clica'l de nou

> 💡 **Consell:** El filtre de Periodicitat és útil per preparar remeses SEPA: pots filtrar els socis mensuals, trimestrals, etc. segons el que toqui cobrar.

---

## 3.11 Dinàmica de donants

La secció **Dinàmica de donants** a la pantalla de Donants permet analitzar el comportament de la base social per períodes.

### Com funciona

1. Ves a ❤️ **Donants**
2. Desplega la secció **"Dinàmica de donants"** (és col·lapsable)
3. Selecciona un període (Tot, Any, Trimestre, Mes o rang lliure)
4. El sistema calcula automàticament cinc llistes basades en moviments reals

**Nota sobre "Tot":** Quan selecciones "Tot", el rang es calcula automàticament com el mínim i màxim de les dates de les transaccions carregades. Si no hi ha moviments amb donant, la secció no mostrarà resultats.

### Llistes disponibles

| Llista | Descripció |
|--------|------------|
| **Altes** | Donants que han fet el seu primer moviment dins el període |
| **Baixes** | Donants amb històric previ que no han fet cap aportació al període actual. Això no implica una baixa administrativa; simplement no s'ha registrat cap moviment |
| **Aportació a l'alça** | Donants que han aportat més que al període anterior |
| **Aportació a la baixa** | Donants que han aportat menys que al període anterior |
| **Top 15** | Els 15 donants amb major aportació al període, separant persones físiques i empreses/entitats |

### Ús pràctic

- **Preparació del Model 182:** Identificar donants actius per any fiscal
- **Seguiment intern:** Detectar canvis de comportament de la base social
- **Informes fiscals:** Preparar dades abans de tancar l'any
- **Agraïment personalitzat:** El Top 15 facilita identificar els donants principals per agrair-los personalment

### Com funciona cada llista

Clica el nom de qualsevol donant de les llistes per obrir la seva fitxa lateral. Les llistes mostren un màxim de 20 elements per defecte; clica "Veure tots" per expandir-les.

> **Persones físiques vs empreses:** El Top 15 separa automàticament les persones físiques de les persones jurídiques (empreses, fundacions, associacions) per donar-te una visió més clara de la composició de la base social.

---

# 4. Gestió de Proveïdors i Treballadors

**Aquesta secció t'ajudarà a...**

Tenir controlats els proveïdors i treballadors de l'entitat. Això és especialment important si pagues més de 3.005,06€ anuals a algun proveïdor, perquè haurà d'aparèixer al Model 347.

---

## 4.1 Gestionar proveïdors

### Quan és important?

Si pagues **més de 3.005,06€ anuals** a un proveïdor, ha d'aparèixer al **Model 347**. Si tens els proveïdors registrats amb el seu NIF, l'informe es genera sol.

### Pas a pas per afegir un proveïdor

1. Ves a 🏢 **Proveïdors**
2. Clica **"+ Nou proveïdor"**
3. Omple: Nom, NIF/CIF, Categoria per defecte
4. Clica **"Guardar"**

### Importar proveïdors des d'Excel (v1.28)

1. Ves a 🏢 **Proveïdors**
2. Clica **"Importar proveïdors"**
3. Clica **"Descarregar plantilla"** per obtenir el format oficial
4. Omple la plantilla amb les teves dades
5. Arrossega el fitxer omplert
6. Revisa les dades (🟢 OK · 🟡 Avís · 🔴 Error)
7. Clica **"Importar"**

### Categoria per defecte

Si l'Excel porta una columna "Categoria", el sistema buscarà entre TOTES les categories (ingressos i despeses).

> ⚠️ **Avís d'ambigüitat:** Si existeix una categoria "Altres" com a ingrés i una altra com a despesa, veuràs un warning groc. En aquest cas, revisa manualment i assigna la correcta després d'importar.

### Proveïdors eliminats i reimportació

Si havies eliminat un proveïdor i el reimportes, es crearà com a nou (no es considera duplicat).

---

## 4.2 Gestionar treballadors

Registra el personal contractat per tenir controlats els pagaments de nòmina.

### Pas a pas

1. Ves a 👷 **Treballadors**
2. Clica **"+ Nou treballador"**
3. Omple: Nom, DNI, Categoria per defecte
4. Clica **"Guardar"**

---

# 5. Gestió de Moviments

**Aquesta secció t'ajudarà a...**

Importar i gestionar els moviments bancaris de l'entitat. Aquesta és la tasca que faràs amb més freqüència: cada mes (o cada setmana, si prefereixes), importaràs l'extracte del banc i categoritzaràs els moviments.

La bona notícia és que Summa Social fa gran part de la feina automàticament. La majoria de moviments es categoritzen sols gràcies al sistema d'auto-assignació.

---

## 5.1 Importar l'extracte del banc

### Formats suportats

- CSV (.csv, .txt)
- Excel (.xlsx, .xls)

### Pas a pas

1. Descarrega l'extracte del teu banc (des de la banca online)
2. Ves a 💰 **Moviments**
3. Clica **"Importar"**
4. Arrossega el fitxer o clica per seleccionar-lo
5. Revisa les columnes detectades (Data, Descripció, Import)
6. Si tens més d'un compte bancari, selecciona'l
7. Clica **"Importar X moviments"**

### Sobre els duplicats

El sistema **detecta automàticament** els moviments que ja existeixen. Pots importar el mateix extracte diverses vegades sense por de duplicar dades.

---

## 5.2 Com funciona l'auto-assignació intel·ligent

Quan importes moviments, Summa Social intenta assignar-los automàticament:

### Fase 1: Matching per nom (~70% dels moviments)

El sistema busca el nom de cada contacte a la descripció del moviment.

**Exemple:** 
- Descripció: "REBUT ENDESA SA 123456"
- Proveïdor registrat: "ENDESA"
- Resultat: ✅ S'assigna automàticament

### Fase 2: Intel·ligència Artificial (~16% més)

Si no troba cap nom, la IA suggereix el contacte més probable. Però tranquil: la IA **només suggereix**, mai s'aplica automàticament. Sempre has de validar tu.

### Fase 3: Categoria per defecte

Si el contacte té una categoria per defecte, s'aplica automàticament.

### Regles automàtiques de categorització

Alguns patrons es categoritzen automàticament sense necessitat de contacte:

| Si la descripció conté... | Categoria assignada |
|---------------------------|---------------------|
| "loteria", "sorteig", "rifa" | Loteries i sorteigs |
| "voluntari", "voluntariat" | Ingressos voluntariat |

---

## 5.3 La taula de moviments

### El botó "Filtres"

Obre un panell lateral amb tots els filtres disponibles:

- Per data (any, trimestre, mes, rang personalitzat)
- Per categoria
- Per contacte
- Per projecte
- Per compte bancari
- Per origen (bank, remittance, stripe, manual)
- Sense categoritzar
- Sense contacte
- Devolucions pendents

Els filtres aplicats apareixen com a "pills" sota el header. Pots eliminar-los clicant la X.

### El menú d'opcions (⋮)

| Opció | Descripció |
|-------|------------|
| Ocultar desglossament remeses | Agrupa les quotes dins la remesa |
| Mostrar columna projecte | Afegeix columna de projecte |

---

## 5.4 Editar moviments

Clica **directament sobre qualsevol cel·la** per editar-la. Els canvis es guarden automàticament.

| Camp | Com editar |
|------|------------|
| Data | Calendari desplegable |
| Descripció | Text lliure |
| Import | Número |
| Categoria | Selector amb cerca |
| Contacte | Selector amb cerca |
| Projecte | Selector |
| Document | Icona 📎 per pujar |
| Nota | Text lliure |

---

## 5.5 Adjuntar documents amb Drag & Drop

Pots arrossegar fitxers (factures, tiquets) directament sobre una fila de la taula per adjuntar-los al moviment.

### Pas a pas

1. Localitza el moviment a la taula
2. Arrossega el fitxer sobre la fila (o clica la icona de document)
3. Apareix un overlay: "Deixa anar per adjuntar"
4. Deixa anar el fitxer
5. El sistema et suggerirà un **nom estandarditzat** per al fitxer (per exemple, `2026.01.15_Vodafone.pdf`), construït a partir de la data i el contacte del moviment. Pots acceptar-lo o mantenir el nom original.
6. El document es puja i s'assigna

**Tipus acceptats:** PDF, JPG, PNG, GIF, WEBP, XML
**Mida màxima:** 15 MB

---

## 5.6 Selecció múltiple i accions en bloc

Si tens molts moviments per categoritzar, pots fer-ho d'un cop.

### Pas a pas

1. Activa les caselles de selecció (columna esquerra)
2. Marca els moviments que vulguis
3. Apareix una barra: "N seleccionats"
4. Selecciona l'acció:
   - **Assignar categoria...**: Aplica una categoria a tots
   - **Treure categoria**: Buida la categoria de tots

---

## 5.7 Banner de devolucions pendents

Quan hi ha devolucions sense assignar, apareix un banner vermell:

> ⚠️ Hi ha devolucions pendents d'assignar **[Revisar]**

Clicant "Revisar" es filtren automàticament. Més detalls a la secció 7.

---

# 6. Divisor de Remeses

**Aquesta secció t'ajudarà a...**

Gestionar les remeses de quotes de socis. Si la teva entitat cobra quotes per domiciliació bancària, el banc t'ingressa un import gran que agrupa totes les quotes. Per saber quant ha pagat cada soci (i poder fer el Model 182), cal "dividir" aquesta remesa.

Sona complicat, però amb Summa Social és qüestió de minuts.

---

## 6.1 Què és una remesa?

El banc et mostra un únic ingrés:
```
15/01/2024  REMESA RECIBOS TRIODOS  +5.430,00€
```

Però dins hi ha moltes quotes individuals:
```
Maria García     →  15,00€
Joan Martínez    →  20,00€
Anna López       →  10,00€
... (303 socis)  →  5.430,00€ TOTAL
```

### Per què cal dividir-la?

Sense dividir:
- ❌ No saps quant ha donat cada soci
- ❌ No pots generar el Model 182
- ❌ No pots emetre certificats individuals

---

## 6.2 Què necessites abans de començar

1. ✅ El moviment de la remesa ja importat a Summa Social
2. ✅ El fitxer de detall que proporciona el banc (CSV o Excel)

> 💡 **On trobar el fitxer de detall?** A la banca online, secció "Remeses" o "Cobraments". Descarrega el detall de la remesa concreta.

---

## 6.3 Com dividir una remesa pas a pas

### Pas 1: Localitzar la remesa

1. Ves a 💰 **Moviments**
2. Busca un ingrés gran amb concepte tipus "REMESA RECIBOS..."

### Pas 2: Obrir el divisor

1. Clica el menú **⋮** a la dreta de la fila
2. Selecciona **"Dividir remesa"**

### Pas 3: Pujar el fitxer de detall

Arrossega el fitxer CSV o Excel del banc.

### Pas 4: Mapejar les columnes

El sistema intentarà detectar-les automàticament, però revisa:

| Columna | Obligatori? | Descripció |
|---------|:-----------:|------------|
| 🟢 **Import** | ✅ | Quantitat de cada quota |
| 🔵 **Nom** | Recomanat | Nom del titular |
| 🟣 **DNI/CIF** | Recomanat | Per identificar millor |
| 🔷 **IBAN** | Recomanat | Per identificar millor |

### Pas 5: Revisar el matching

El sistema intenta trobar cada soci:

| Color | Significat |
|-------|------------|
| 🟢 Verd | Soci trobat |
| 🟠 Taronja | Soci de baixa (pots reactivar-lo) |
| 🔵 Blau | Soci nou (es crearà) |
| 🟡 Groc | No identificat (falta DNI) |

### Pas 6: Processar

Clica **"Processar"** i es creen les quotes individuals.

---

## 6.4 Socis de baixa detectats

Si la remesa conté quotes de socis que estan donats de baixa:

1. Apareix un avís taronja
2. Pots **reactivar-los individualment** o **tots alhora**

> 💡 Això passa quan el banc segueix passant rebuts de socis que haurien d'estar donats de baixa a la domiciliació bancària.

---

## 6.5 Vista agrupada de remeses

Després de processar:

- La remesa apareix com **1 sola línia** a la taula
- Badge verd: **"✓ Remesa processada · 303/303 quotes"**
- Fons lleugerament verd per identificar-la

### Com veure el detall de les quotes

1. Clica el badge verd
2. S'obre una finestra amb totes les quotes
3. Pots cercar per nom o DNI
4. Clica el nom d'un soci per anar a la seva fitxa

---

## 6.6 Guardar la configuració de columnes

Si sempre uses el mateix banc:

1. Després de mapejar correctament les columnes
2. Clica **"Guardar configuració"**
3. Dona-li un nom (ex: "Triodos - Remeses mensuals")

La propera vegada es detectarà automàticament.

---

## 6.7 Què fer si surt malament (desfer una remesa)

Si has processat una remesa incorrectament (fitxer equivocat, matching incorrecte, mes equivocat...), **ara pots desfer-la directament des del modal de detall**:

### Pas a pas

1. Ves a 💰 **Moviments**
2. Localitza la remesa processada (té un badge verd "✓ Remesa processada · X quotes")
3. **Clica el badge** → S'obre el modal de detall de la remesa
4. A la part inferior del modal, clica **"Desfer remesa"**
5. Confirma l'acció quan el sistema t'ho demani
6. La remesa es restaura a l'estat original
7. Ja pots tornar a processar-la amb el fitxer correcte

### Què passa quan desfàs una remesa?

- Les quotes individuals **no s'esborren** — queden arxivades (soft-delete)
- El moviment pare torna a l'estat de "remesa sense processar"
- Pots tornar a processar-la amb un fitxer diferent
- Les dades històriques es conserven per traçabilitat

### Quan cal desfer una remesa?

| Situació | Acció |
|----------|-------|
| Has carregat el fitxer del mes equivocat | Desfer → Processar amb el fitxer correcte |
| Alguns socis no s'han identificat bé | Actualitza les seves dades → Desfer → Processar |
| Hi ha errors en els imports | Desfer → Processar amb el fitxer corregit |
| Has triat el moviment equivocat | Desfer |

> 💡 **Consell de seguretat:** El sistema no permet processar una remesa que ja està processada. Si intentes dividir-la de nou, veuràs el missatge "Aquesta remesa ja està processada. Desfés-la abans de tornar-la a processar."

---

## 6.a Remeses SEPA de cobrament (domiciliacions)

Aquesta funcionalitat serveix per **generar el fitxer SEPA de cobrament (pain.008)** per cobrar quotes de socis per domiciliació bancària.

**És un flux PRE-BANC:** Summa genera un fitxer que després s'ha de **pujar al portal del banc**.

**Ruta del wizard:** Donants → Remeses de cobrament

---

### Abans de començar (requisit obligatori)

Per generar una remesa, el **compte bancari seleccionat** ha de tenir configurat l'**Identificador de creditor SEPA (ICS)**.

1. Ves a **Configuració → Comptes bancaris**
2. Edita el compte des del qual faràs els cobraments
3. Omple el camp **"Creditor ID SEPA (ICS)"**
4. Desa

Si l'ICS no està informat, el wizard mostra l'error:
> "La cuenta seleccionada no tiene identificador de acreedor SEPA configurado."

i **bloqueja la generació**.

---

### Com generar la remesa (wizard)

1. Ves a **Donants → Remeses de cobrament**
2. **Pas 1 — Configuració:** Selecciona:
   - **Compte bancari** (el que té l'ICS configurat)
   - **Data de cobrament**
   - **Periodicitat** (mensual, trimestral, semestral, anual o totes)
3. **Pas 2 — Selecció de socis:**
   - El sistema **pre-selecciona automàticament** els socis que "toca cobrar" segons la periodicitat escollida. Per exemple, si selecciones "Mensual", es marcaran els socis mensuals que encara no s'hagin cobrat aquest mes.
   - Els socis que **no toca cobrar encara** apareixen amb un badge gris "No toca encara". Pots seleccionar-los igualment si ho necessites: el sistema et demanarà confirmació i els marcarà per revisió al fitxer generat.
   - Pots afegir o treure socis manualment de la selecció
   - Els socis sense IBAN o amb quota = 0 queden fora automàticament
   - Si hi ha socis no-mensuals (trimestrals, semestrals, anuals) sense data d'últim cobrament, veuràs un avís recomanant informar-la a la fitxa del donant o via importació Excel.
4. **Pas 3 — Revisió:** Revisa el nombre de socis inclosos i l'import total
5. Clica **"Generar"** i descarrega el fitxer **XML pain.008**
6. Puja el fitxer al teu banc a l'apartat de **Remeses / Domiciliacions / SEPA Direct Debit**

> **Com sap el sistema quins socis "toca cobrar"?** Per a socis **mensuals**, mira si ja s'ha cobrat aquest mes: si no, el marca com a candidat. Per a socis **trimestrals, semestrals o anuals**, calcula quan tocaria el proper cobrament a partir de la data de l'últim (per exemple, un soci trimestral cobrat al gener no tornarà a aparèixer fins a l'abril). Es compara per mes, sense importar el dia exacte.
>
> **Últim cobrament SEPA:** Pots informar la data de l'últim cobrament de cada donant a la seva fitxa, o importar-la massivament amb la columna "Últim cobrament SEPA" de l'Excel de donants.

---

### Compatibilitat bancària

Summa genera fitxers SEPA compatibles amb banca espanyola.
Si el teu banc rebutja un fitxer, contacta amb suport indicant el missatge exacte d'error.

---

### Validacions i casos habituals

- **Soci sense IBAN**: el soci queda fora de la remesa. Cal editar el soci i informar l'IBAN.
- **Compte sense ICS**: el wizard bloqueja la generació fins que s'informi l'ICS.
- **Import de quota = 0**: el soci no es pot incloure (no té sentit bancari).

---

### Després del cobrament (POST-BANC)

Quan el banc executa el cobrament:
1. Importa l'extracte bancari a **Moviments**
2. Localitza l'ingrés agregat de la remesa
3. Utilitza el **Divisor de Remeses** (secció 6) per desagregar quotes i tenir traçabilitat per soci

---

# 6b. Documents Pendents i Remeses SEPA OUT

**Aquesta secció t'ajudarà a...**

Gestionar factures de proveïdors que has rebut però encara no has pagat, i a generar remeses SEPA per pagar-les totes d'un cop des del banc. Després, quan el banc executi el pagament, podràs conciliar-lo automàticament.

> **Nota:** **Documents pendents** i **Liquidacions** solen venir activats per defecte. Si l'entitat no els vol utilitzar, els administradors els poden desactivar a **Configuració > Mòduls opcionals**.

---

## 6b.1 Què són els "Documents Pendents"?

Són factures o rebuts que:
- Has rebut del proveïdor
- Encara no has pagat
- Vols controlar abans de pagar

**Flux típic:**
1. Puges la factura PDF a "Documents Pendents"
2. La confirmes amb les dades correctes
3. Generes una remesa SEPA amb totes les factures pendents
4. Puges el fitxer SEPA al banc
5. El banc executa el pagament
6. Importes l'extracte amb el moviment agregat
7. Desagregues i concilies automàticament

---

## 6b.2 Pujar documents pendents

Hi ha **dues maneres** de pujar documents pendents:

### Opció A: Amb el botó "Pujar"

1. Ves a 💰 **Moviments > Pendents**
2. Clica **"Pujar documents"**
3. Selecciona o arrossega els fitxers
4. El sistema extrau automàticament: import, proveïdor, data, número de factura
5. Revisa i corregeix si cal
6. Clica **"Pujar"**

### Opció B: Arrossegant fitxers a la pàgina (v1.28)

1. Ves a 💰 **Moviments > Pendents**
2. Arrossega els fitxers directament sobre la pàgina
3. Veuràs un overlay blau "Deixa anar per pujar"
4. Deixa anar i s'obrirà el modal d'upload amb els fitxers precarregats
5. Continua com a l'opció A

**Formats admesos:** PDF, XML, JPG, JPEG, PNG

> 💡 Si arrossegues fitxers d'un format no admès (ex: .doc, .txt), veuràs un missatge d'error i no s'obrirà el modal.

### Renom suggerit de documents (v1.42)

Quan el sistema extreu automàticament la data de factura i el nom del proveïdor d'un document pendent, et suggerirà **renombrar el fitxer** amb un format estàndard: `YYYY.MM.DD_proveïdor.ext` (per exemple, `2026.01.15_Vodafone.pdf`).

- El suggeriment apareix dins la targeta expandida del document
- Pots acceptar-lo o ignorar-lo
- El renom és cosmètic: canvia el nom que veus a la llista, però no modifica el fitxer original al servidor

> 💡 Renombrar els documents amb un format consistent ajuda a localitzar-los ràpidament.

### Estats d'un document

| Estat | Significat |
|-------|------------|
| 🔵 **Esborrany** | Acabat de pujar, cal revisar |
| 🟢 **Confirmat** | Dades correctes, llest per SEPA |
| 🟣 **SEPA generat** | Inclòs en una remesa SEPA |
| ✅ **Conciliat** | Vinculat a un moviment bancari |
| 📥 **Arxivat** | Fora de circulació |

---

## 6b.3 Generar remesa SEPA (pain.001)

### Requisits

Per incloure un document a la remesa cal:
- Estat = Confirmat
- Proveïdor assignat amb IBAN
- Import > 0
- Número de factura present
- Data de factura present

### Pas a pas

1. A **Pendents**, selecciona els documents a pagar
2. Clica **"Generar remesa SEPA"**
3. Selecciona el compte bancari emissor
4. Indica la data d'execució
5. Revisa els documents vàlids i invàlids
6. Clica **"Generar"**
7. Es descarrega el fitxer XML (pain.001.001.03)

### Què fer amb el fitxer XML

1. Accedeix a la banca online
2. Ves a la secció de remeses o transferències massives
3. Puja el fitxer XML
4. Confirma l'operació

---

## 6b.4 Desagregar i conciliar

Quan el banc executa la remesa, veuràs un únic moviment negatiu a l'extracte.

**Exemple:**
```
18/01/2025  TRANSFER REMESA SEPA  -5.430,00€
```

### Com funciona la detecció

Quan importes l'extracte, el sistema intenta detectar automàticament si un moviment correspon a una remesa SEPA pendent i et proposa la conciliació.

### Pas a pas per conciliar

1. Importa l'extracte del banc normalment
2. Si es detecta una remesa, veuràs un badge **"Remesa SEPA (N)"** a la fila
3. Clica el menú **⋮** → **"Desagregar i conciliar"**
4. Revisa el resum: imports, nombre de pagaments
5. Confirma que els imports coincideixen
6. Clica **"Confirmar"**

### Què passa en clicar "Confirmar"

El sistema fa tot això automàticament:
1. Crea N transaccions fill (una per cada pagament)
2. Vincula cada document pendent al seu fill
3. Adjunta les factures a cada transacció
4. Aplica categories i proveïdors
5. Marca els documents com a conciliats
6. El moviment pare queda marcat com a remesa processada (no compta dues vegades als totals)

### Resultat final

A la taula de moviments:
- El moviment agregat apareix com **"Remesa OUT (N pagaments)"**
- Clicant-hi s'obre el detall amb tots els pagaments
- Cada pagament té el document adjunt

---

## 6b.5 Casos especials

### Documents que falten dades

Si un proveïdor no té IBAN, apareixerà a "Invàlids" quan generes la remesa. Edita el proveïdor i afegeix l'IBAN.

### Remesa parcialment executada

Si el banc rebutja algun pagament, cal gestionar-ho manualment. La remesa SEPA es marca com a conciliada però algunes factures podrien quedar pendents.

### Arxivar documents

Si decideixes no pagar un document, pots arxivar-lo per treure'l de circulació sense esborrar-lo.

---

# 6c. Liquidacions de Despeses de Viatge (v1.28)

**Aquesta secció t'ajudarà a...**

Agrupar tiquets i quilometratge d'un viatge en una sola liquidació, generar el PDF i deixar el reemborsament ben documentat.

> **Nota:** La pantalla de **Liquidacions** forma part del mòdul de **Documents pendents**. Normalment ve activat per defecte. Si no et surt al menú, un administrador el pot activar/desactivar a **Configuració > Mòduls opcionals**.

---

## 6c.1 Dues maneres de treballar

**Opció A: Primer tiquets, després liquidació**
1. Ves a **Moviments > Pendents** i puja els tiquets (mòbil o drag & drop)
2. Ves a **Moviments > Liquidacions**
3. Crea una nova liquidació
4. Assigna-hi els tiquets i afegeix quilometratge si cal
5. Genera el PDF

**Opció B: Liquidació directa**
1. Ves a **Moviments > Liquidacions**
2. Crea una nova liquidació
3. Arrossega els tiquets directament dins la liquidació
4. Afegeix quilometratge si cal
5. Genera el PDF

## 6c.2 Com s'organitza la pantalla

A dalt tens 3 pestanyes principals:
- **Liquidacions**: llistat de liquidacions creades
- **Tiquets**: safata de tiquets pendents d'assignar
- **Quilometratge**: accés ràpid per editar km dins de liquidacions obertes

Dins de **Liquidacions**, cada registre passa per aquests estats:
- **Esborrany**: encara l'estàs preparant
- **Enviada**: llesta per tramitar el reemborsament
- **Conciliada**: ja vinculada al moviment bancari
- **Arxivada**: tancada i fora del circuit operatiu

## 6c.3 Afegir tiquets amb drag & drop

Dins la liquidació, la card de **Tiquets** accepta arrossegar fitxers:
1. Arrossega els fitxers sobre la card
2. Veuràs un overlay blau
3. Deixa anar i s'obrirà el modal de pujada
4. Els tiquets nous quedaran vinculats automàticament a la liquidació

**Formats admesos:** PDF, XML, JPG, JPEG, PNG

## 6c.4 Quilometratge

Pots afegir múltiples línies de quilometratge amb:
- Data del desplaçament
- Quilòmetres
- Tarifa €/km (**configurable per la teva entitat**)
- Notes (ruta o motiu)

## 6c.5 Generar PDF

El PDF inclou:
- Dades de la liquidació i beneficiari
- Llista de tiquets amb imports
- Línies de quilometratge
- Total desglossat

---

# 7. Gestió de Devolucions Bancàries

**Aquesta secció t'ajudarà a...**

Gestionar els rebuts que el banc no ha pogut cobrar i t'ha retornat. Això és més important del que sembla: si no assignes les devolucions al soci correcte, el Model 182 mostrarà imports incorrectes.

No et preocupis, el procés és senzill un cop l'entens.

---

## 7.1 Què és una devolució?

És un rebut que el banc no ha pogut cobrar i retorna a l'entitat.

### Motius habituals

| Motiu | Descripció |
|-------|------------|
| **Fons insuficients** | El compte del soci no tenia prou diners |
| **IBAN incorrecte** | L'IBAN que tens registrat té un error |
| **Ordre de no pagament** | El soci ha ordenat al banc no pagar |
| **Compte tancat** | El compte ja no existeix |

### Per què és important gestionar-les?

**Exemple concret:**
- En Joan ha pagat 12 quotes de 15€ = 180€
- Però 2 quotes han estat retornades = −30€
- Import REAL = 150€
- Si no assignes les devolucions, el Model 182 dirà 180€ ❌

---

## 7.2 Com saber si tinc devolucions pendents

- 💰 **Moviments:** veuràs un banner amb el botó **"Revisar"**
- També pots filtrar directament els moviments per devolucions pendents

---

## 7.3 Assignar devolucions manualment

Quan tens poques devolucions o saps de qui són:

### Pas a pas

1. Ves a 💰 **Moviments**
2. Clica el banner "Devolucions pendents" → **"Revisar"**
3. Per cada devolució, clica el botó vermell **"Assignar donant"**
4. Cerca el donant per nom, DNI, IBAN o email
5. Selecciona'l i confirma

---

## 7.4 Importar fitxer de devolucions del banc

Quan tens moltes devolucions:

### Bancs suportats

| Banc | Format |
|------|--------|
| **Santander** | Excel (.xlsx) |
| **Triodos** | CSV o XLS |
| **Altres** | Detecció automàtica |

### Pas a pas

1. Localitza una devolució a 💰 **Moviments**
2. Clica la icona **📄** (pujar fitxer)
3. Puja el fitxer CSV o Excel del banc
4. Mapeja les columnes (IBAN és la prioritària)
5. Revisa els resultats
6. Clica **"Processar"**

### Com fa el matching

| Ordre | Criteri |
|:-----:|---------|
| 1 | IBAN (exacte) |
| 2 | DNI (exacte) |
| 3 | Nom (exacte) |

> ⚠️ **Important:** NO es fa matching aproximat. Si no coincideix exactament, no s'assigna.

---

## 7.5 Devolucions agrupades (remeses)

A vegades el banc agrupa múltiples devolucions en un sol moviment:

```
Extracte del banc:   -55,00€ "DEVOLUCION RECIBOS"
Fitxer de detall:    10€ + 20€ + 15€ + 10€ = 55€
```

El sistema detecta l'agrupació i crea transaccions filles per cada devolució.

---

## 7.6 Remeses parcials

Quan només algunes devolucions es poden identificar:

- Les identificades → Es creen com a filles i es resten al Model 182
- Les no identificades → Queden pendents

**Com completar-les:**
1. Actualitza l'IBAN o DNI del donant
2. Torna a importar el fitxer

---

## 7.7 Impacte als informes

```
Import al Model 182 = Donacions − Devolucions
```

Si el total és ≤ 0, el donant **no apareix** al Model 182.

---

## 7.8 Desfer una remesa de devolucions

Si t'has equivocat processant una remesa de devolucions (per exemple, has assignat un donant incorrecte), pots desfer-la i tornar-la a processar:

### Pas a pas

1. Ves a 💰 **Moviments**
2. Localitza la remesa de devolucions processada
3. Clica el badge de la remesa → S'obre el modal de detall
4. Clica **"Desfer remesa"**
5. Confirma l'acció
6. Les filles s'arxiven (no s'esborren)
7. Pots tornar a processar amb les correccions

> ⚠️ **Important:** El sistema no permet processar directament una remesa de devolucions que ja està processada. Has de desfer-la primer. Això és per seguretat: les devolucions tenen impacte fiscal i el sistema vol evitar duplicacions accidentals.

---

## 7.9 Checklist mensual de devolucions

Per tenir les devolucions ben gestionades, segueix aquest flux cada mes:

### Flux mensual

1. ☐ Importa l'extracte del banc del mes
2. ☐ Mira si apareix el banner "Devolucions pendents d'assignar"
3. ☐ Si hi ha devolucions, descarrega el fitxer de detall del banc
4. ☐ Importa el fitxer per fer matching automàtic
5. ☐ Revisa les devolucions que no s'han identificat
6. ☐ Actualitza l'IBAN dels donants si cal
7. ☐ Processa el fitxer
8. ☐ Comprova que les devolucions apareixen a la fitxa dels donants

### Abans del gener (Model 182)

**Molt important:** Abans de generar el Model 182, assegura't que:

1. ☐ Totes les devolucions de l'any estan assignades
2. ☐ No queden devolucions pendents
3. ☐ El total de cada donant és correcte (donacions − devolucions)

> 💡 Si un donant té més devolucions que donacions (total ≤ 0), no apareixerà al Model 182. Això és correcte: si no ha aportat res efectivament, no cal declarar-lo.

---

# 8. Donacions via Stripe

**Aquesta secció t'ajudarà a...**

Processar les donacions que rebeu online a través de Stripe. Quan Stripe us envia diners al banc, agrupa diverses donacions i resta les comissions. Amb Summa Social pots "obrir" aquesta transferència i saber exactament qui ha donat i quant.

---

## 8.1 Què és Stripe i com funciona?

Stripe és una plataforma de pagaments online. Si la teva entitat rep donacions a través de la web, probablement usa Stripe.

### El problema

El que veus al banc:
```
"Transferencia de Stripe" +95,65€
```

Però realment són:
```
50€ + 30€ + 20€ = 100€ bruts
− 4,35€ comissions
= 95,65€ nets
```

No saps qui ha donat què!

---

## 8.2 Com dividir un payout de Stripe

### Pas 1: Localitza el moviment

Ves a 💰 **Moviments** i cerca "Stripe".

### Pas 2: Obre el divisor

Menú **⋮** → **"Dividir remesa Stripe"**

### Pas 3: Exporta el CSV de Stripe

1. Entra a **dashboard.stripe.com**
2. Ves a **Pagaments → Exportar**
3. Selecciona **"Columnes predeterminades"**
4. Descarrega el CSV

> ⚠️ **Molt important:** NO obris el CSV amb Excel abans de pujar-lo!

### Pas 4: Carrega el CSV

Arrossega el fitxer. El sistema agrupa per payout.

### Pas 5: Selecciona el payout correcte

Busca el que coincideix amb l'import del banc.

### Pas 6: Revisa el matching

El sistema identifica donants per **email**.

| Estat | Significat |
|-------|------------|
| ✅ Identificat | El donant existeix |
| ⚠️ Pendent | Cal assignar manualment |

### Pas 7: Verifica que quadra

L'import net ha de coincidir amb l'ingrés del banc.

### Pas 8: Processa

Clica **"Importar donacions"**. Es creen:
- N donacions (import brut)
- 1 despesa de comissions (agregada)

---

## 8.3 Bones pràctiques

| ✅ Fer | ❌ No fer |
|--------|----------|
| Processar cada payout amb el seu CSV | Crear donacions a mà |
| Verificar que l'import quadra | Processar si no quadra |
| Assegurar que els donants tenen email | Obrir el CSV amb Excel |

---

# 9. Informes Fiscals

**Aquesta secció t'ajudarà a...**

Generar els informes fiscals obligatoris (Model 182 i 347) i els certificats de donació. Quan arribi el gener, només hauràs de clicar un botó i enviar el fitxer a la gestoria.

Tot el treball de categorització i gestió de devolucions que has fet durant l'any serveix per això: que els informes surtin correctes a la primera.

---

## 9.1 Model 182 — Declaració de Donacions

### Què és

El Model 182 és la declaració informativa de donatius rebuts. És obligatori si la teva entitat rep donacions.

### Termini

**31 de gener** de l'any següent

### Requisits per donant

| Dada | Si falta... |
|------|-------------|
| **Nom** | No apareix al model |
| **DNI/CIF** | No apareix al model |
| **Codi postal** | Error de província |

### Pas a pas (Excel per gestoria)

1. Ves a 📄 **Informes > Model 182**
2. Selecciona l'any
3. Revisa les alertes (donants amb dades incompletes)
4. Corregeix els errors
5. Clica **"Generar Excel"**
6. Envia el fitxer a la teva gestoria

> 💡 Les devolucions es resten automàticament.

### Exportació directa a l'AEAT (fitxer oficial)

A més de l'Excel per a la gestoria, Summa permet exportar el Model 182 en **format oficial AEAT** (.txt). Aquest fitxer es pot pujar directament a la Seu Electrònica de l'AEAT.

**Pas a pas:**

1. Genera l'informe (selecciona l'any)
2. Clica **"Export AEAT (fitxer oficial)"**
3. Si tot està correcte → Es descarrega el fitxer `.txt`
4. Puja el fitxer a la Seu Electrònica de l'AEAT → "Presentació mitjançant fitxer"

**Què passa si hi ha donants amb dades incompletes?**

Summa detecta automàticament els donants que no es poden declarar (per exemple: sense DNI, sense codi postal, o sense tipus de donant informat). Quan això passa:

1. Apareix una finestra d'avís amb el resum
2. Pots triar entre:
   - **Descarregar CSV d'exclosos** → Per contactar-los i corregir les dades
   - **Exportar igualment** → Genera el fitxer sense els donants amb errors
   - **Cancel·lar i revisar dades** → Torna enrere per corregir

**Què conté el CSV d'exclosos?**

| Camp | Descripció |
|------|------------|
| Nom | Nom del donant |
| NIF/CIF | El que tingui informat (pot estar buit o incorrecte) |
| Incidència | Què falta o està malament |
| Email | Si el tens registrat, per contactar |
| Telèfon | Si el tens registrat, per contactar |

> ⚠️ **Important:** Els donants exclosos **no seran declarats a l'AEAT**. És responsabilitat de l'entitat corregir les dades i regenerar el fitxer abans de presentar-lo.

---

## 9.2 Model 347 — Operacions amb Tercers

### Què és

Declaració d'operacions amb tercers que superen **3.005,06€ anuals**.

### Termini

**28 de febrer**

### Pas a pas

1. Ves a 📄 **Informes > Model 347**
2. Selecciona l'any
3. Revisa que tots tinguin NIF
4. Clica **"Generar CSV"**
5. Envia a la gestoria

---

## 9.3 Certificats de Donació

### Certificat individual

1. Ves a ❤️ **Donants** → Clica el donant
2. Clica **"Generar certificat"**
3. Selecciona l'any
4. Es descarrega un PDF

### Certificats massius

1. Ves a 📄 **Informes > Certificats**
2. Selecciona l'any
3. Clica **"Generar tots"**
4. Es descarrega un ZIP amb tots els PDFs

> 💡 Si el total d'un donant és ≤ 0 (per devolucions), no es genera certificat.

---

# 10. Projectes i Justificació de Subvencions

**Aquesta secció t'ajudarà a...**

Organitzar les finances per projectes i, si treballes amb subvencions, preparar la justificació econòmica sense haver de fer-ho en fulls de càlcul externs.

Si la teva entitat no treballa amb subvencions ni necessita control per projectes, pots saltar-te aquesta secció.

---

## 10.1 Eixos d'actuació (ús bàsic)

### Quan usar-los

- Treballes amb subvencions
- Vols control per àrea de treball
- Necessites informes per a la junta

### Crear un projecte

1. Ves a 📁 **Eixos d'actuació**
2. Clica **"+ Nou projecte"**
3. Omple: Nom, Descripció, Finançador
4. Clica **"Crear"**

### Assignar moviments

Edita un moviment → Columna "Projecte" → Selecciona

---

## 10.2 Mòdul de Projectes (avançat)

Per a entitats que necessiten justificar subvencions amb traçabilitat econòmica real (ACCD, Fons Català, ajuntaments, etc.).

> Aquesta part del manual correspon a la pantalla d'**Assignació de despeses** del Mòdul de Projectes, no a **Eixos d'actuació**.

### Abans de començar

Per veure aquesta pantalla, l'entitat ha de tenir activat el **Mòdul Projectes** a:
**Configuració > Mòduls opcionals**.

### Navegació

Al menú lateral:
1. Entra a **Projectes** (mòdul)
2. Clica **Assignació de despeses**

### Què hi trobaràs en aquesta pantalla

La safata barreja dues fonts de despesa:
- **Seu**: despeses bancàries elegibles per projectes
- **Terreny**: despeses pujades manualment

Per cada despesa, veuràs:
- Data, concepte, contrapart i import
- Estat d'imputació:
  - **No imputada**
  - **Parcial**
  - **Imputada**
- Accions ràpides d'assignació i edició

### Cercador i filtres (per anar de pressa)

Pots filtrar per:
- **Tots**
- **Sense document**
- **No assignades**
- **Terreny**
- **Seu**
- **Pendents de revisió** (botó superior)

També pots cercar per text (concepte, contrapart, categoria...).

### Imputar una despesa a projecte

Tens 3 maneres de treballar:

**Opció A: Assignació ràpida (100%)**
1. Clica la icona d'assignar a la fila
2. Selecciona el projecte
3. (Opcional) selecciona partida pressupostària
4. La despesa queda imputada

**Opció B: Assignació múltiple (dividir despesa)**
1. Obre **Assignació múltiple**
2. Reparteix imports o percentatges entre projectes
3. Desa els canvis

**Opció C: Assignació massiva**
1. Selecciona diverses files (checkbox)
2. Clica **Assignar a projecte...**
3. Tria el projecte
4. El sistema aplica assignació 100% a totes les seleccionades

> 💡 Si una despesa està en moneda local i el projecte encara no té tipus de canvi operatiu, la imputació pot quedar parcial/pendent en EUR fins que es configuri.

### Quan una despesa va a diversos projectes

Si divideixes una despesa entre 2 o més projectes:
- es guarda una assignació per a cada projecte
- cada assignació pot tenir la seva partida pressupostària
- l'import imputat a cada projecte queda separat (no es duplica)

### Com es veu al llistat general (Assignació de despeses)

A la fila de la despesa veuràs:
- estat **Imputada** o **Parcial**
- un resum del repartiment (projectes i percentatges)

Exemples habituals:
- `1 proj. (100%)`
- `2 proj. (70/30%)`

Si passes el cursor pel resum, veuràs el detall per projecte.

Si entres amb filtre d'un projecte concret (`?projectId=...`), el resum indica el percentatge **dins d'aquell projecte**.

### Com es veu a cada projecte

En cada projecte només computa la seva part:
- a la targeta de projecte (Pressupost / Executat / Pendent) suma només l'import imputat a aquell projecte
- a la pantalla de pressupost del projecte, l'execució per partida també compta només la part imputada

Per tant, una mateixa despesa repartida no infla imports: cada projecte veu només el seu tros.

### Què passa si canvies el % d'imputació

> En despeses en EUR, el mateix efecte s'aconsegueix canviant **imports** (no percentatges).

Quan edites el repartiment:
- el llistat general s'actualitza amb el nou resum
- es recalculen els imports imputats de cada projecte
- es recalculen també els totals de cada projecte (executat i pendent)

Regles importants:
- no es pot guardar per sobre del **100%**
- si deixes el total per sota del 100%, la despesa queda en estat **Parcial** (queda part pendent d'imputar)

### Crear i editar despeses de terreny

Des de **Assignació de despeses** pots clicar **Afegir despesa**.

Camps principals:
- Data
- Concepte
- Import (EUR o moneda local)
- Origen/destinatari
- Comprovants
- Dades de justificació (opcional)

Quan treballes en moneda local:
- pots informar moneda + import local
- l'EUR es pot deixar buit perquè es resolgui en imputar al projecte

### Gestió de documents a la mateixa taula

Pots arrossegar un fitxer directament sobre la fila d'una despesa per adjuntar-lo.

També pots:
- Obrir un comprovant ja pujat
- En despeses de terreny, eliminar el comprovant si t'has equivocat

### Detall d'una despesa bancària

A les files de **Seu**, el botó de detall obre una pantalla específica on pots:
- revisar la informació original de la despesa
- editar l'assignació a projectes
- completar dades de justificació (núm. factura, NIF emissor, dates, núm. justificant)

---

## 10.3 Gestió Econòmica del projecte (pressupost)

És la pantalla on controles si el projecte va bé econòmicament i on prepares la justificació amb seguretat.

Et respon, de forma molt clara:
1. quant estava pressupostat
2. quant portes executat
3. quant et queda pendent (o si hi ha sobreexecució)

### On la trobaràs

**Projectes > (projecte) > Gestió Econòmica**

### Què hi trobaràs

| Bloc | Per a què serveix |
|------|-------------------|
| Resum econòmic | Veure pressupost, executat i pendent/sobreexecució |
| Partides | Fer seguiment detallat per línia |
| Tipus de canvi (FX) | Gestionar conversió de moneda local a EUR |
| Exportacions | Preparar Excel i ZIP de justificació |

### Si encara no tens partides

No passa res: pots començar amb control global.

Veuràs:
- pressupost global
- import executat
- pendent o sobreexecució

Quan necessitis més detall, pots crear partides manualment o importar-les.

### Crear partides manualment

1. Clica **"Afegir partida"**
2. Omple com a mínim:
   - Nom
   - Import pressupostat (positiu)
3. Opcionalment afegeix codi i ordre
4. Desa

### Importar partides des d'Excel

1. Clica **"Importar pressupost"**
2. Puja el fitxer `.xlsx` o `.xls`
3. Tria pestanya, mapeja columnes i revisa previsualització
4. Clica **"Importar i substituir"**

> ⚠️ Aquesta acció substitueix les partides actuals del projecte.

### Entendre cada partida

A cada fila veuràs:
- **Pressupostat**
- **Executat**
- **% executat**
- **Pendent** (o sobreexecució)
- **Estat**: OK, Sense execució o ALERTA

ALERTA apareix quan se supera la desviació permesa del projecte.

### Editar o eliminar partides

- **Llapis**: edites la partida
- **Paperera**: elimines la partida

> ⚠️ Si una partida té despeses assignades, no es pot eliminar fins que les desassignis o reubiquis.

### Moneda local i tipus de canvi (FX)

Aquesta pantalla aplica la prioritat següent:
1. tipus de canvi propi de la despesa (si existeix)
2. tipus de canvi calculat per transferències del projecte
3. tipus de canvi manual del projecte (valor de reserva)

### Transferències FX

Pots registrar transferències reals amb:
- data
- EUR enviats
- moneda local
- import local rebut

Amb això, Summa calcula un tipus de canvi ponderat del projecte.

### Re-aplicar tipus de canvi

Si canvies el context FX (transferències o TC), pot aparèixer el botó **"Re-aplicar tipus de canvi"**.

Quan el fas servir:
- recalcula imports EUR de les imputacions afectades
- manté intactes les despeses que ja tenen TC manual

### Veure despeses del projecte o d'una partida

- Botó **"Veure despeses"**: obre totes les despeses imputades al projecte
- Clicant una partida: obre les despeses filtrades d'aquella partida

És la manera més ràpida de passar del resum a la revisió detallada.

---

## 10.4 Mode "Quadrar justificació"

Per distribuir despeses entre partides fins que quadri.

### Dos modes

| Mode | Acció |
|------|-------|
| **Infraexecució** | Afegir despeses |
| **Sobreexecució** | Treure despeses |

El sistema suggereix despeses ordenades per rellevància. Els canvis es fan en memòria fins que cliques "Aplicar".

---

## 10.5 Captura de despeses de terreny

Pensada per al personal de camp: pujar comprovants al moment i deixar la revisió per després.

### Com funciona (flux recomanat)

1. Des d'**Assignació de despeses**, clica la icona de càmera (**Despesa ràpida**)
2. Fes foto del tiquet o puja un PDF/imatge
3. Revisa els camps suggerits (si cal)
4. Desa la despesa

Resultat:
- La despesa entra com a **Terreny**
- Queda marcada com a **pendent de revisió**
- L'equip d'oficina la pot completar i imputar des d'**Assignació de despeses**

> 💡 No cal tenir-ho tot perfecte en el moment de pujar. L'important és no perdre el comprovant.

### Com pujar comprovants (factures, rebuts, nòmines)

Tens dues maneres de fer-ho:
1. des de **Captura (Terreny)** amb **"Fer foto i enviar"**
2. des de **Assignació de despeses**, arrossegant el fitxer sobre la fila de la despesa

### Com eliminar comprovants

- En despeses de **Terreny**, pots eliminar el comprovant des de la taula o des de l'edició de la despesa.
- En despeses de **Seu**, des d'aquesta taula pots pujar i obrir documents, però no eliminar-los directament des del mateix control.

### Què passa si guardes una despesa ràpida sense import

Es pot guardar igualment (si hi ha comprovant adjunt).

Queda:
- com a **pendent**
- preparada perquè l'equip la completi després

### Com completar una despesa pendent

1. Ves a **Projectes > Assignació de despeses**
2. Filtra per **"Pendents de revisió"**
3. Obre la despesa (icona de llapis)
4. Completa camps (import, concepte, categoria, moneda, etc.)
5. Desa

---

## 10.6 Exportar justificació a Excel

Des de la pantalla de pressupost d'un projecte, pots descarregar un Excel amb totes les despeses assignades.

### Com fer-ho

1. Ves a **Projectes > (el teu projecte) > Gestió Econòmica**
2. Clica el botó d'exportació Excel (icona de descàrrega o menú **⋮** → **"Exportar justificació (Excel)"**)
3. S'obre un diàleg on pots triar l'ordre de les files:

| Opció | Què fa |
|-------|--------|
| **Per partida i data** | Agrupa les despeses per partida pressupostària, i dins de cada partida les ordena per data |
| **Cronològic** | Ordena totes les despeses per data, sense agrupar per partida |

4. Clica **"Descarregar"**

### Què conté l'Excel

Cada fila és una despesa assignada al projecte. Les columnes són:

| Columna | Què mostra |
|---------|------------|
| Núm. | Número correlatiu |
| Data | Data de la despesa |
| Concepte | Descripció de la despesa |
| Proveïdor | Nom del proveïdor o contrapart |
| Núm. factura | Número de factura (si s'ha introduït) |
| Partida | Codi i nom de la partida pressupostària |
| Tipus de canvi aplicat | Si la despesa és en moneda estrangera, el TC usat per convertir a EUR |
| Import total (moneda despesa) | Import original de la despesa, en la seva moneda |
| Moneda | Codi de la moneda (EUR, XOF, USD...) |
| Import total (EUR) | Import total convertit a euros |
| Import imputat (moneda local) | Part imputada al projecte, en moneda local |
| Import imputat (EUR) | Part imputada al projecte, en euros |

Les capçaleres de l'Excel surten traduïdes a l'idioma que tinguis configurat.

Al final del document hi ha una fila de **totals**.

---

## 10.7 Drag & Drop de documents

A **Assignació de despeses**, pots arrossegar fitxers directament sobre una fila per adjuntar justificants.

### Què és útil saber

- Funciona tant per despeses de **Seu** com de **Terreny**
- Si la pujada va bé, el document queda vinculat a la despesa
- El comprovant es pot obrir des de la mateixa taula
- L'eliminació ràpida de comprovant des d'aquesta taula està disponible per a despeses de **Terreny**

Aquest gest és especialment pràctic quan estàs revisant moltes despeses seguides.

---

# 10b. Paquet de Tancament

**Aquesta secció t'ajudarà a...**

Generar un paquet complet amb tots els moviments i documents d'un període. És ideal per a tancaments d'exercici, auditories, o per enviar a comptabilitat extern un recull ordenat de tota l'activitat econòmica.

---

## 10b.1 Què és el Paquet de Tancament?

És un ZIP que conté:
- Un Excel amb tots els moviments del període
- Els documents adjunts (factures, tiquets) numerats
- Un resum econòmic

**Cas d'ús típic:** Al final de l'any, generes el paquet i l'envies a comptabilitat. Ells tenen tot el que necessiten sense haver d'accedir a Summa Social.

---

## 10b.2 Com generar-lo

### Pas a pas

1. Ves a 💰 **Moviments**
2. Clica el menú **⋮** → **"Paquet de tancament"**
3. Selecciona el **període** (data inici i data fi)
4. Clica **"Generar"**
5. Es descarrega un fitxer ZIP

### Límits

| Límit | Valor |
|-------|-------|
| Màxim de documents | 120 |
| Mida total màxima | 350 MB |

Si superes els límits, prova amb un període més curt (trimestre o mes).

---

## 10b.3 Contingut del ZIP

El paquet té una estructura pensada per ser autoexplicativa:

```
paquet_tancament_{org}_{periode}.zip
├── README.txt          ← Què conté el paquet
├── resum.txt           ← Resum econòmic
├── moviments.xlsx      ← Llistat de moviments
├── documents/          ← Fitxers adjunts
│   ├── 0001_2025-01-15_150,00_quota_soci_abc12345.pdf
│   ├── 0002_2025-01-16_75,50_factura_xyz98765.pdf
│   └── ...
└── debug/              ← Diagnòstic tècnic (només si cal)
    ├── resum_debug.txt
    └── debug.xlsx
```

---

## 10b.4 moviments.xlsx (el fitxer principal)

L'Excel conté una fila per cada moviment del període:

| Columna | Descripció |
|---------|------------|
| **Ordre** | Número correlatiu (1, 2, 3...) |
| **Data** | Data del moviment (DD/MM/YYYY) |
| **Import** | Quantitat amb format europeu (coma decimal) |
| **Concepte** | Descripció del moviment |
| **Categoria** | Nom de la categoria (no IDs) |
| **Contacte** | Nom del donant/proveïdor (no IDs) |
| **Document** | Nom del fitxer a documents/ (o buit) |

### Com relacionar moviments amb documents

La columna **Ordre** correspon al **prefix numèric** del nom dels fitxers a la carpeta `documents/`.

**Exemple:**
- Fila amb Ordre = 1 → El document és `0001_...`
- Fila amb Ordre = 15 → El document és `0015_...`

Si la columna "Document" està buida, significa que el moviment no té document adjunt.

---

## 10b.5 La carpeta debug/

Aquesta carpeta conté informació tècnica per diagnosticar problemes. **Normalment no cal mirar-la.**

Quan sí que és útil:
- Si veus que falten documents que esperaves
- Si vols entendre per què un document no s'ha inclòs

El fitxer `debug.xlsx` mostra per cada transacció:
- L'estat del document (OK, NO_DOCUMENT, NOT_FOUND...)
- La URL original del document
- El path extret

---

## 10b.6 Què enviar a comptabilitat

Per a un tancament normal, envia:
1. ✅ `moviments.xlsx` → El llistat de moviments
2. ✅ `resum.txt` → El resum econòmic
3. ✅ Carpeta `documents/` → Els justificants

**NO cal enviar:**
- ❌ `README.txt` (és explicatiu per a tu)
- ❌ Carpeta `debug/` (és tècnic)

---

## 10b.7 Preguntes freqüents

### Per què falten documents?

Mira la columna "Document" a l'Excel. Si està buida, és que:
- El moviment no té document adjunt a Summa Social
- O el document no s'ha pogut descarregar

Per saber el motiu exacte, consulta `debug/debug.xlsx`.

### Puc generar paquets de períodes anteriors?

Sí. El sistema guarda tots els documents històrics. Pots generar un paquet de qualsevol any passat.

### El ZIP triga molt a generar-se

És normal si tens molts documents. El sistema ha de descarregar cada fitxer i comprimir-lo. Per a un any complet amb 100+ documents, pot trigar 1-2 minuts.

### Els imports apareixen com a text a Excel

El format europeu (coma decimal) pot fer que Excel no els reconegui com a números. Si necessites fer càlculs, pots convertir-los amb:
- Selecciona la columna
- "Trobar i substituir": `,` per `.`
- Canvia el format a "Número"

---

# 11. Resolució de Problemes

**Aquesta secció t'ajudarà a...**

Trobar respostes ràpides als problemes més comuns. Si et trobes encallat, mira aquí abans de demanar ajuda.

---

## 11.0 El Hub de Guies: el teu primer recurs

Abans de buscar ajuda externa, prova el **Hub de Guies** integrat a l'aplicació. El trobaràs clicant la icona **?** (interrogant) que apareix a la cantonada superior dreta de qualsevol pantalla.

### Què hi trobaràs

- **Guies pas a pas** per a les funcionalitats principals
- **Respostes a preguntes freqüents** sobre cada tema
- **Un cercador que entén llenguatge natural** (com ho diries a una companya)
- **Enllaços directes clicables** per anar a la pantalla correcta sense perdre temps
- **Ajuda per aclarir dubtes ambigus** (si cal, et demana triar opció 1 o 2)

### Com usar el cercador

No cal que sàpigues els termes tècnics. Pots buscar coses com:

| El que escrius | El que troba |
|----------------|--------------|
| "vull canviar el logo de l'entitat" | Explicació de com fer-ho des de configuració |
| "com puc saber les quotes que un soci ha pagat?" | Guia del detall de donants i historial |
| "com pujo una factura o rebut o nòmina?" | Guia per adjuntar documents i ruta directa |
| "m'apareix un missatge d'error que no entenc" | Resolució de problemes + passos de comprovació |
| "remesa no quadra" | Guies de divisió i revisió de remeses |

El sistema reconeix sinònims i expressions comunes, així que no et preocupis per encertar el terme exacte. Si tens un error a pantalla, copiar el text exacte sol donar-te una resposta més precisa.

> 💡 **Consell:** Abans de contactar amb suport, fes una ullada al Hub de Guies. Moltes vegades la resposta ja hi és, i et pot estalviar temps d'espera.

---

## 11.1 Problemes d'accés

| Problema | Solució |
|----------|---------|
| "Email o contrasenya incorrectes" | Revisa majúscules i espais |
| "Usuari no trobat" | Contacta l'administrador |
| No recordo la contrasenya | A la pantalla de login, clica **"Has oblidat la contrasenya?"** |
| La sessió es tanca sovint | És intencionat per seguretat |

### Recuperar la contrasenya (pas a pas)

1. A la pantalla d'accés, clica **"Has oblidat la contrasenya?"**
2. Rebràs un correu per restablir-la
3. Defineix la nova contrasenya
4. Torna al login i accedeix amb la nova

---

## 11.2 Problemes amb dades

| Problema | Solució |
|----------|---------|
| He importat moviments dues vegades | El sistema detecta duplicats. Si n'hi ha, elimina manualment |
| Un donant ha canviat de DNI | Edita el donant i actualitza |
| No veig les meves dades | Revisa el filtre de dates |

---

## 11.3 Problemes amb remeses

| Problema | Solució |
|----------|---------|
| La remesa no es divideix correctament | Comprova que el fitxer correspon a la remesa |
| No troba socis | Actualitza IBAN o DNI dels donants |
| He processat malament | Obre el detall de la remesa i desfés el processat abans de tornar-la a dividir |

## 11.3b Problemes amb remeses SEPA (pain.008)

| Problema | Solució |
|----------|---------|
| No puc generar la remesa SEPA | Comprova que el compte bancari té l'ICS (Identificador de creditor SEPA) configurat. Ves a Configuració → Comptes bancaris → Edita el compte |
| Cap soci apareix pre-seleccionat | Comprova que els socis tenen periodicitat informada (mensual, trimestral...) i que no s'han cobrat ja dins el període actual |
| Un soci no apareix a la llista | El soci necessita IBAN vàlid i import de quota > 0. Edita el soci i completa les dades |
| El banc rebutja el fitxer XML | Contacta amb suport indicant el missatge exacte d'error del banc. Els motius més freqüents: IBAN incorrecte d'algun soci, ICS no vàlid, o format incompatible |
| He generat la remesa però no la vull enviar | No passa res. El fitxer XML no s'envia sol; l'has de pujar tu manualment al banc. Si no el puges, no es cobra res |

---

## 11.4 Problemes amb informes

| Problema | Solució |
|----------|---------|
| Model 182 mostra errors | Completa DNI i CP dels donants |
| Les devolucions no es resten | Verifica que estan assignades al donant |
| Certificat no es genera | El donant té total ≤ 0 |

---

## 11.5 Missatges d'error habituals

| Missatge | Solució |
|----------|---------|
| "No tens permisos" | Demana canvi de rol |
| "Dades incompletes" | Revisa camps en vermell |
| "Duplicat detectat" | Activa "Actualitzar existents" |
| "IBAN no vàlid" | 24 caràcters, comença per ES |

---

# 12. Glossari

| Terme | Definició |
|-------|-----------|
| **Remesa** | Agrupació de quotes de socis en un únic ingrés bancari |
| **Devolució** | Rebut que el banc no ha pogut cobrar |
| **Payout** | Transferència que Stripe envia al banc |
| **Model 182** | Declaració de donatius (límit 31 gener) |
| **Model 347** | Operacions amb tercers > 3.005,06€ (límit 28 febrer) |
| **Soci** | Donant recurrent |
| **Donant puntual** | Donant esporàdic |
| **Contrapart** | Entitat sòcia internacional |
| **Admin** | Rol d'administració de l'organització |
| **Matching** | Identificació automàtica de contactes |
| **Recurrència** | Ha donat 3 anys seguits |
| **Partida** | Línia del pressupost |
| **Infraexecució** | Gastar menys del pressupostat |
| **Sobreexecució** | Gastar més del pressupostat |

---

# Una nota final

Arriba un moment en què tot flueix. Els primers dies poden ser aclaparadors, però després d'un parell de mesos:

- La gestió mensual et portarà menys d'una hora
- Els informes fiscals sortiran nets
- Les alertes seran mínimes
- Et preguntaràs com ho feies abans

**Recorda:**
- Si tens dubtes, deixa la dada pendent. Sempre pots completar-la després.
- Gairebé tot es pot corregir. Summa Social està pensat per humans que s'equivoquen.
- Les alertes són amigues, no errors greus.

L'objectiu és que dediquis el teu temps a la missió de l'entitat, no a barallar-te amb fulls de càlcul.

Molta sort! 🍀

---

**Summa Social v1.41** — Febrer 2026

*Gestió financera pensada per a entitats que volen dedicar el seu temps al que realment importa.*
