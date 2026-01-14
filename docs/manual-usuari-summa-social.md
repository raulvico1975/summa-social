# SUMMA SOCIAL - Manual d'Usuari Complet

**Versió**: 1.31
**Última actualització**: 14 Gener 2026

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
6c. [Liquidacions de Despeses de Viatge](#107-liquidacions-de-despeses-de-viatge-v128)
7. [Gestió de Devolucions Bancàries](#7-gestió-de-devolucions-bancàries)
8. [Donacions via Stripe](#8-donacions-via-stripe)
9. [Informes Fiscals](#9-informes-fiscals)
10. [Projectes i Justificació de Subvencions](#10-projectes-i-justificació-de-subvencions)
11. [Zona de Perill](#11-zona-de-perill)
12. [Resolució de Problemes](#12-resolució-de-problemes)
13. [Glossari](#13-glossari)

---

# 1. Primers Passos

**Aquesta secció t'ajudarà a...**

Orientar-te dins l'aplicació els primers dies. Sabem que quan s'obre una eina nova, la primera sensació pot ser de "per on començo?". Aquí t'expliquem com entrar, com moure't per les diferents pantalles, i què significen els números i alertes que veuràs al Dashboard.

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
- ✅ Si uses un **ordinador compartit**, recorda tancar sessió manualment quan acabis

**Com tancar sessió:** Clica el teu nom (a dalt a la dreta) → "Tancar sessió"

---

## 1.2 Canviar l'idioma de l'aplicació

L'aplicació està disponible en **3 idiomes**:
- 🇨🇦 Català
- 🇪🇸 Espanyol  
- 🇫🇷 Francès

### Com canviar-lo

1. Clica el teu **nom** (a dalt a la dreta)
2. Veuràs les opcions d'idioma
3. Selecciona l'idioma que prefereixis
4. El canvi s'aplica immediatament

> 💡 Cada persona de l'equip pot tenir el seu propi idioma configurat. El teu canvi no afecta els altres.

---

## 1.3 Navegació per l'aplicació

A la part esquerra de la pantalla tens el **menú de navegació**. Aquí tens un mapa de què trobaràs a cada lloc:

| Icona | Secció | Què hi trobaràs |
|:-----:|--------|-----------------|
| 📊 | **Dashboard** | El resum de com van les finances: números clau, alertes, gràfics |
| 💰 | **Moviments** | Els extractes bancaris i totes les transaccions |
| ❤️ | **Donants** | La base de dades de donants i socis |
| 🏢 | **Proveïdors** | Empreses i professionals als quals pagueu |
| 👷 | **Treballadors** | El personal contractat |
| 📁 | **Projectes** | Per organitzar per àrees de treball i justificar subvencions |
| 📄 | **Informes** | Model 182, Model 347 i certificats de donació |
| ⚙️ | **Configuració** | Dades de l'entitat, categories, membres de l'equip |

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

### 📅 Obligacions Fiscals

Et recorda les dates límit dels models fiscals:

| Model | Data límit |
|-------|------------|
| **Model 182** | 31 de gener |
| **Model 347** | 28 de febrer |

El color t'indica la urgència: 🟢 Tens temps · 🟡 Prepara-ho · 🔴 Urgent

---

## 1.5 El teu primer mes amb Summa Social

### Què és normal els primers dies

- ❓ Veure molts moviments sense categoritzar
- ❓ Tenir moltes alertes al Dashboard
- ❓ Trobar que falten dades de donants
- ❓ Sentir que hi ha "massa coses per fer"

**Tot això és completament normal.** L'aplicació t'està mostrant tot el que abans estava amagat en fulls de càlcul dispersos. No intentis fer-ho tot el primer dia.

### En què centrar-te primer

1. ✅ Configurar les dades bàsiques de l'entitat
2. ✅ Importar l'extracte bancari del mes actual
3. ✅ Categoritzar els moviments principals
4. ✅ Identificar els donants més habituals

### Després d'1-2 mesos

- Les alertes baixaran dràsticament
- La gestió mensual et portarà **menys d'una hora**
- Els informes fiscals sortiran nets a la primera
- Et preguntaràs com ho feies abans sense Summa Social

---

# 2. Configuració Inicial

**Aquesta secció t'ajudarà a...**

Deixar l'aplicació a punt perquè els documents que generis (certificats de donació, informes) tinguin les dades correctes de la teva entitat. És com posar els fonaments d'una casa: ho fas una vegada i després no t'has de preocupar.

La bona notícia és que aquesta configuració **només cal fer-la una vegada**. Després, tot funciona sol.

---

## 2.1 Configurar les dades de l'entitat

Aquestes dades apareixeran automàticament als certificats de donació i altres documents oficials.

### Pas a pas

1. Ves a ⚙️ **Configuració**
2. Busca la secció **"Dades de l'organització"**
3. Omple tots els camps:

| Camp | Exemple |
|------|---------|
| Nom de l'entitat | Fundació Exemple |
| CIF | G12345678 |
| Adreça fiscal | Carrer Major, 15 |
| Ciutat | Barcelona |
| Codi postal | 08001 |
| Telèfon | 93 123 45 67 |
| Email | info@entitat.org |
| Web | www.entitat.org |

4. Clica **"Guardar"**

---

## 2.2 Pujar el logo de l'entitat

El logo apareixerà als certificats de donació, donant-los un aspecte professional.

### Requisits

- Format: PNG (preferit) o JPG
- Mida màxima: 2 MB
- Recomanació: Fons transparent (PNG)

### Pas a pas

1. A Configuració, busca la secció **"Logo"**
2. Clica **"Pujar logo"**
3. Selecciona la imatge
4. Veuràs una previsualització

> 💡 **Consell:** Si el teu logo té fons blanc i vols que quedi més bonic, pots usar [remove.bg](https://remove.bg) per eliminar el fons gratuitament.

---

## 2.3 Configurar la firma digitalitzada

La firma apareixerà als certificats de donació, fent que semblin signats a mà sense haver de signar-los físicament un per un.

### Què necessites

1. Una imatge de la firma (PNG amb fons transparent, idealment)
2. El nom del signant (ex: "Maria Garcia López")
3. El càrrec (ex: "Presidenta")

### Com crear una imatge de la firma

1. Signa en un paper blanc amb bolígraf negre
2. Fes-li una foto amb el mòbil (bona il·luminació, sense ombres)
3. Retalla la imatge perquè només es vegi la firma
4. Si vols, elimina el fons amb una eina online

### Pas a pas per pujar-la

1. A Configuració, busca **"Firma digitalitzada"**
2. Clica **"Pujar firma"**
3. Selecciona la imatge
4. Omple el **nom del signant**
5. Omple el **càrrec**
6. Clica **"Guardar"**

---

## 2.4 Configurar categories comptables

Les categories serveixen per classificar els moviments (ingressos i despeses). Summa Social ja ve amb categories predefinides, però pots afegir-ne més segons les necessitats de la teva entitat.

### Categories habituals

| Ingressos | Despeses |
|-----------|----------|
| Donacions | Nòmines i Seguretat Social |
| Quotes de socis | Lloguer |
| Subvencions | Subministraments |
| Loteries i sorteigs | Serveis professionals |
| Ingressos voluntariat | Material d'oficina |
| Altres ingressos | Transferències a contraparts |
| | Comissions bancàries |

### Com afegir una categoria nova

1. Ves a ⚙️ **Configuració > Categories**
2. Clica **"+ Nova categoria"**
3. Escriu el **nom** (ex: "Cursos i formació")
4. Selecciona el **tipus**: Ingrés o Despesa
5. Clica **"Crear"**

> 💡 **Un consell:** Millor tenir 10-15 categories clares que 50 de massa específiques. Les categories molt granulars acaben sent difícils de mantenir i no aporten gaire valor.

### Importar categories des d'Excel (v1.28)

1. Ves a ⚙️ **Configuració > Categories**
2. Clica **"Importar categories"**
3. Dins el modal, clica **"Descarregar plantilla"** per obtenir el format correcte
4. Omple la plantilla amb les teves categories
5. Arrossega el fitxer omplert
6. Revisa la previsualització (els duplicats es marquen com "Omesa")
7. Clica **"Importar"**

### Eliminar categories

Quan elimines una categoria, els moviments que la tenien assignada **no s'esborren**, simplement perden la categoria. Veuràs un avís amb el nombre de moviments afectats.

> ⚠️ **Zona de perill:** Si necessites esborrar TOTES les categories i tornar a començar, hi ha un botó especial a "Configuració > Zona de Perill". Les categories per defecte es regeneraran automàticament.

---

## 2.5 Configurar comptes bancaris

Si la teva entitat té **més d'un compte bancari**, pots registrar-los aquí per després poder filtrar moviments per compte.

### Quan cal fer-ho?

- Si tens un compte corrent i un d'estalvi
- Si tens comptes en diferents bancs
- Si vols saber exactament d'on ve cada transacció

Si només tens un compte, pots saltar-te aquest pas.

### Pas a pas

1. Ves a ⚙️ **Configuració > Comptes bancaris**
2. Clica **"+ Nou compte"**
3. Omple:
   - **Nom identificatiu**: "Compte principal La Caixa"
   - **IBAN**: ES12 3456 7890 1234 5678 90
   - **Nom del banc**: CaixaBank
4. Clica **"Crear"**

---

## 2.6 Convidar membres de l'equip

Si altres persones de l'entitat necessiten accedir a Summa Social, pots convidar-les i assignar-los diferents nivells de permisos.

### Rols disponibles

| Rol | Què pot fer |
|-----|-------------|
| **SuperAdmin** | Tot, inclosa la Zona de Perill |
| **Admin** | Configurar, però no esborrar massivament |
| **User** | Gestió diària (importar, categoritzar) |
| **Viewer** | Només veure, no modificar res |

### Pas a pas per convidar algú

1. Ves a ⚙️ **Configuració > Membres**
2. Clica **"Convidar membre"**
3. Introdueix l'**email** de la persona
4. Selecciona el **rol** apropiat
5. Clica **"Enviar invitació"**

La persona rebrà un email amb instruccions.

> 💡 **Consell de seguretat:** Dona sempre el rol mínim necessari. Si algú només ha de consultar dades, fes-lo Viewer.

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
| Quota mensual | Si és soci | 15,00 € |
| Categoria per defecte | Opcional | Quotes de socis |

4. Clica **"Guardar"**

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
| Quota mensual | Import en € | Opcional |
| IBAN | Compte bancari | Opcional |
| Adreça | Domicili | Opcional |
| Codi postal | CP | Per Model 182 |
| Ciutat, Província | Localització | Opcional |
| Telèfon, Email | Contacte | Opcional |
| Categoria | Categoria per defecte | Opcional |

### Categoria per defecte

Si l'Excel porta una columna "Categoria", el sistema intentarà trobar-la entre les categories existents. Si no la troba, s'usarà la categoria de fallback configurada (sense bloquejar la importació).

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
- Historial de donacions
- Historial de devolucions
- Resum per any
- Accions: Editar, Generar certificat

---

## 3.7 Exportar la llista de donants a Excel

Si necessites les dades fora de Summa Social:

1. Ves a ❤️ **Donants**
2. Clica **"Exportar"**
3. Es descarrega un Excel amb: Nom, NIF, Quota, IBAN, Estat

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
2. Arrossega el fitxer sobre la fila
3. Apareix un overlay: "Deixa anar per adjuntar"
4. Deixa anar el fitxer
5. El document es puja i s'assigna

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

## 6.7 Què fer si surt malament

Si has processat una remesa incorrectament:

1. Ves a ⚙️ **Configuració > Zona de Perill** (cal ser SuperAdmin)
2. Clica **"Esborrar última remesa processada"**
3. Escriu "BORRAR" per confirmar
4. La remesa es restaura i pots tornar-la a processar

---

## 6.a Remeses SEPA de cobrament (domiciliacions)

Aquesta funcionalitat serveix per **generar el fitxer SEPA de cobrament (pain.008)** per cobrar quotes de socis per domiciliació bancària.

**És un flux PRE-BANC:** Summa genera un fitxer que després s'ha de **pujar al portal del banc**.

**Ruta del wizard:** Donants → Remeses de cobrament
(URL típica: `/{orgSlug}/dashboard/donants/remeses-cobrament`)

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
2. Selecciona:
   - **Compte bancari** (el que té l'ICS configurat)
   - **Data de cobrament**
3. Revisa la previsualització:
   - nombre de socis inclosos
   - import total
4. Clica **"Generar"** i descarrega el fitxer **XML pain.008**
5. Puja el fitxer al teu banc a l'apartat de **Remeses / Domiciliacions / SEPA Direct Debit**

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

> **Nota:** Aquesta funcionalitat és experimental i només està disponible per a administradors.

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

Quan importes l'extracte, el sistema detecta automàticament si aquest moviment coincideix amb una remesa SEPA pendent:
- Mateix import (amb tolerància de 0,02€)
- Mateix compte bancari
- Data propera a l'execució (±3 dies)

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
6. El moviment pare queda amb `isRemittance = true` (no compta als totals)

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

- 📊 **Dashboard:** Alerta "X devolucions pendents d'assignar"
- 💰 **Moviments:** Banner vermell amb botó "Revisar"

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

### Pas a pas

1. Ves a 📄 **Informes > Model 182**
2. Selecciona l'any
3. Revisa les alertes (donants amb dades incompletes)
4. Corregeix els errors
5. Clica **"Generar Excel"**
6. Envia el fitxer a la teva gestoria

> 💡 Les devolucions es resten automàticament.

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

Per a qui justifica subvencions (ACCD, Fons Català, Ajuntaments...).

### Navegació

Al menú lateral, **Projectes** té un submenú:
- Gestió de projectes
- Assignació de despeses

### Pantalla de Gestió Econòmica

| Targeta | Descripció |
|---------|------------|
| **Pressupostat** | Import previst |
| **Executat** | Suma de despeses assignades |
| **Pendent** | Pressupostat − Executat |

---

## 10.3 Importar pressupost des d'Excel

1. A la Gestió Econòmica del projecte
2. Clica **"Importar pressupost"**
3. Segueix el wizard de 5 passos
4. Clica **"Importar"**

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

Per al personal de camp que genera despeses petites.

### Des del mòbil

1. Ves a **Projectes > Despeses > Captura**
2. Fes foto del tiquet
3. Introdueix import i data
4. Clica **"Enviar"**

**Temps objectiu:** < 10 segons

L'administració revisa i categoritza després.

---

## 10.6 Drag & Drop de documents

A la pantalla d'assignació de despeses, pots arrossegar fitxers directament sobre cada fila per adjuntar justificants.

---

## 10.7 Liquidacions de Despeses de Viatge (v1.28)

Per gestionar despeses de viatge: tiquets, quilometratge i reemborsaments.

### Dues maneres de treballar

**Opció A: Des del terreny (viatge)**
1. Puja els tiquets a **Moviments > Pendents** (via mòbil o drag & drop)
2. Quan tornis, ves a **Moviments > Liquidacions**
3. Crea una nova liquidació
4. Selecciona els tiquets pujats i afegeix quilometratge
5. Genera el PDF

**Opció B: Des de l'oficina (directe)**
1. Ves a **Moviments > Liquidacions**
2. Crea una nova liquidació
3. Arrossega els tiquets directament sobre la card de "Tiquets"
4. Afegeix quilometratge si cal
5. Genera el PDF

### Afegir tiquets amb drag & drop (v1.28)

Dins la liquidació, la card de "Tiquets" accepta drag & drop:
1. Arrossega els fitxers sobre la card
2. Veuràs un overlay blau
3. Deixa anar i s'obrirà el modal d'upload
4. Els tiquets nous es vinculen automàticament a la liquidació

**Formats admesos:** PDF, XML, JPG, JPEG, PNG

### Quilometratge

Pots afegir múltiples línies de quilometratge amb:
- Data del desplaçament
- Quilòmetres
- Tarifa (per defecte 0,26 €/km)
- Notes (ruta o motiu)

### Generar PDF

El PDF inclou:
- Dades de la liquidació i beneficiari
- Llista de tiquets amb imports
- Línies de quilometratge
- Total desglossat

---

# 11. Zona de Perill

**Aquesta secció t'ajudarà a...**

Entendre les accions destructives que només pot fer el SuperAdmin. Aquestes accions són irreversibles, però a vegades necessàries per corregir errors greus o reiniciar dades.

Pensa-hi com el "reset" definitiu. Usa-ho amb precaució.

---

## 11.1 Com accedir

1. Ves a ⚙️ **Configuració**
2. Baixa fins al final
3. Veuràs la secció "Zona de Perill" en vermell

> 💡 Si no la veus, és perquè no tens rol de SuperAdmin.

---

## 11.2 Accions disponibles

| Acció | Descripció |
|-------|------------|
| **Esborrar tots els donants** | Elimina tots |
| **Esborrar tots els proveïdors** | Elimina tots |
| **Esborrar tots els treballadors** | Elimina tots |
| **Esborrar tots els moviments** | Elimina tots |
| **Esborrar última remesa** | Desfà l'última remesa processada |

---

## 11.3 Com esborrar l'última remesa

1. Clica **"Esborrar última remesa processada"**
2. Revisa la informació mostrada
3. Escriu **"BORRAR"** per confirmar
4. La remesa es restaura

---

# 12. Resolució de Problemes

**Aquesta secció t'ajudarà a...**

Trobar respostes ràpides als problemes més comuns. Si et trobes encallat, mira aquí abans de demanar ajuda.

---

## 12.0 El Hub de Guies: el teu primer recurs

Abans de buscar ajuda externa, prova el **Hub de Guies** integrat a l'aplicació. El trobaràs clicant la icona **?** (interrogant) que apareix a la cantonada superior dreta de qualsevol pantalla.

### Què hi trobaràs

- **Guies pas a pas** per a les funcionalitats principals
- **Respostes a preguntes freqüents** sobre cada tema
- **Un cercador intel·ligent** que entén com parles

### Com usar el cercador

No cal que sàpigues els termes tècnics. Pots buscar coses com:

| El que escrius | El que troba |
|----------------|--------------|
| "no veig els meus moviments" | Guies d'importació d'extractes |
| "182" | Guies fiscals del Model 182 |
| "stripe comissions" | Guies de donacions online |
| "remesa no quadra" | Guies de divisió de remeses |

El sistema reconeix sinònims i expressions comunes, així que no et preocupis per encertar el terme exacte.

> 💡 **Consell:** Abans de contactar amb suport, fes una ullada al Hub de Guies. Moltes vegades la resposta ja hi és, i et pot estalviar temps d'espera.

---

## 12.1 Problemes d'accés

| Problema | Solució |
|----------|---------|
| "Email o contrasenya incorrectes" | Revisa majúscules i espais |
| "Usuari no trobat" | Contacta l'administrador |
| No recordo la contrasenya | Clica "He oblidat la contrasenya" |
| La sessió es tanca sovint | És intencionat per seguretat |

---

## 12.2 Problemes amb dades

| Problema | Solució |
|----------|---------|
| He importat moviments dues vegades | El sistema detecta duplicats. Si n'hi ha, elimina manualment |
| Un donant ha canviat de DNI | Edita el donant i actualitza |
| No veig les meves dades | Revisa el filtre de dates |

---

## 12.3 Problemes amb remeses

| Problema | Solució |
|----------|---------|
| La remesa no es divideix correctament | Comprova que el fitxer correspon a la remesa |
| No troba socis | Actualitza IBAN o DNI dels donants |
| He processat malament | Zona de Perill → Esborrar última remesa |

---

## 12.4 Problemes amb informes

| Problema | Solució |
|----------|---------|
| Model 182 mostra errors | Completa DNI i CP dels donants |
| Les devolucions no es resten | Verifica que estan assignades al donant |
| Certificat no es genera | El donant té total ≤ 0 |

---

## 12.5 Missatges d'error habituals

| Missatge | Solució |
|----------|---------|
| "No tens permisos" | Demana canvi de rol |
| "Dades incompletes" | Revisa camps en vermell |
| "Duplicat detectat" | Activa "Actualitzar existents" |
| "IBAN no vàlid" | 24 caràcters, comença per ES |

---

# 13. Glossari

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
| **SuperAdmin** | Rol amb accés total |
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

**Summa Social v1.31** — Gener 2026

*Gestió financera pensada per a entitats que volen dedicar el seu temps al que realment importa.*
