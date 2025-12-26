# SUMMA SOCIAL - Manual d'Usuari

**Versió**: 1.17
**Última actualització**: Desembre 2025

---

## Benvinguda 👋

Summa Social existeix per fer-te la vida més fàcil.

Si has arribat fins aquí, probablement portes els comptes d'una entitat sense ànim de lucre i saps el que és passar hores amb fulls de càlcul, perdre't entre extractes bancaris i estressar-te quan s'acosta el gener amb el Model 182.

**Bona notícia:** Això s'ha acabat.

Aquest manual t'acompanyarà pas a pas. No cal que el llegeixis tot d'una tirada — consulta'l quan ho necessitis.

---

## Com llegir aquest manual segons el teu rol

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUIN ÉS EL TEU ROL?                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📊 ADMINISTRACIÓ / GESTIÓ ECONÒMICA                                │
│     → Llegeix TOT el manual                                         │
│     → Especialment: 5, 6, 7, 8, 9, 12                               │
│                                                                     │
│  🌍 TERRENY / SUPORT OPERATIU                                       │
│     → Llegeix: 1, 3 (visió general), 10.5                           │
│                                                                     │
│  👔 DIRECCIÓ / JUNTA DIRECTIVA                                      │
│     → Llegeix: 1.4 (Dashboard), 9, 10                               │
│                                                                     │
│  👁️ VIEWER (només lectura)                                          │
│     → Aquest manual és informatiu per a tu                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Índex

1. [Primers Passos](#1-primers-passos)
2. [Configuració Inicial](#2-configuració-inicial)
3. [Gestió de Donants](#3-gestió-de-donants)
4. [Gestió de Proveïdors i Treballadors](#4-gestió-de-proveïdors-i-treballadors)
5. [Gestió de Moviments](#5-gestió-de-moviments)
6. [Divisor de Remeses](#6-divisor-de-remeses)
7. [Gestió de Devolucions Bancàries](#7-gestió-de-devolucions-bancàries)
8. [Donacions via Stripe](#8-donacions-via-stripe)
9. [Informes Fiscals](#9-informes-fiscals)
10. [Projectes i Justificació](#10-projectes-i-justificació)
11. [Zona de Perill](#11-zona-de-perill)
12. [Resolució de Problemes](#12-resolució-de-problemes)
13. [Glossari](#13-glossari)

---

# 1. Primers Passos

> **Què és aquesta secció?**  
> Aquí aprendràs a entrar a l'aplicació, orientar-te per les diferents pantalles i entendre com funciona el flux de treball bàsic. És el punt de partida per a qualsevol persona que comenci a usar Summa Social.

---

## 1.1 Accedir a l'aplicació

> **Què fa:** Et permet entrar al teu compte de Summa Social.  
> **En què t'ajuda:** Sense accedir, no pots fer res. Aquest és el primer pas cada cop que vulguis treballar amb les finances de l'entitat.

### Pas a pas

1. Obre el navegador (Chrome, Firefox, Safari o Edge)
2. Escriu: **https://summasocial.app**
3. Introdueix el teu **email** i **contrasenya**
4. Clica **"Iniciar sessió"**

> 💡 **Primer cop?** L'administrador de la teva entitat t'haurà enviat una invitació per email. Busca un correu amb l'assumpte "Invitació a Summa Social".

> 🔒 **Seguretat**: La sessió es tanca automàticament quan tanques el navegador. Això protegeix les dades de l'entitat si uses un ordinador compartit.

### Tancament per inactivitat

> **Què fa:** Tanca la sessió automàticament si no fas cap acció durant 30 minuts.  
> **En què t'ajuda:** Evita que algú altre accedeixi a les dades si t'oblides de tancar sessió.

Un minut abans del tancament rebràs un avís per si vols continuar treballant.

**Què es considera activitat:** Moure el ratolí, escriure, fer scroll, clicar, tocar la pantalla.

✅ **Verificació:** Si tot ha anat bé, veuràs el Dashboard amb el nom de la teva entitat a dalt.

---

## 1.2 Canviar l'idioma

> **Què fa:** Permet canviar la llengua de la interfície entre Català, Espanyol i Francès.  
> **En què t'ajuda:** Cada persona de l'equip pot treballar en l'idioma que li sigui més còmode, sense afectar als altres.

### Com fer-ho

1. Clica el teu **nom** (a dalt a la dreta)
2. Selecciona l'idioma que prefereixis
3. El canvi s'aplica immediatament, sense recarregar

---

## 1.3 Navegació bàsica

> **Què fa:** El menú lateral et permet accedir a totes les seccions de l'aplicació.  
> **En què t'ajuda:** Pots saltar ràpidament a qualsevol àrea sense perdre't.

| Icona | Secció | Per a què serveix |
|-------|--------|-------------------|
| 📊 | **Dashboard** | Veure l'estat general de les finances d'un cop d'ull |
| 💰 | **Moviments** | Gestionar els extractes bancaris i transaccions |
| ❤️ | **Donants** | Mantenir la base de dades de donants actualitzada |
| 🏢 | **Proveïdors** | Registrar proveïdors per al Model 347 |
| 📁 | **Projectes** | Organitzar per eixos d'actuació i justificar subvencions |
| 📄 | **Informes** | Generar Model 182, 347 i certificats de donació |
| ⚙️ | **Configuració** | Ajustar dades de l'entitat, categories i membres |

---

## 1.4 Entendre el Dashboard

> **Què fa:** Mostra un resum visual de l'estat financer de l'entitat amb mètriques, alertes i recordatoris fiscals.  
> **En què t'ajuda:** D'un cop d'ull saps si hi ha coses pendents, com van els números i si s'acosta alguna obligació fiscal.

### Bloc de celebracions 🎉

> **Què fa:** Mostra missatges positius quan les coses van bé.  
> **En què t'ajuda:** Et motiva i et confirma que vas pel bon camí.

Missatges possibles:
- "Totes les transaccions categoritzades"
- "Balanç positiu"
- "Tot al dia, bona feina!"
- "Primera donació del mes"

### Targetes principals

> **Què fan:** Mostren les xifres clau de l'entitat en temps real.  
> **En què t'ajuden:** Tens una visió immediata de la salut financera.

| Targeta | Què mesura | Com es calcula |
|---------|------------|----------------|
| **Ingressos** | Tot el que ha entrat | Suma de moviments positius |
| **Despeses operatives** | Tot el que ha sortit (sense contraparts) | Suma de moviments negatius |
| **Balanç operatiu** | Diferència | Ingressos − Despeses |
| **Transferències a contraparts** | Fons a entitats sòcies | Moviments marcats com contrapart |

> 💡 **Què són les contraparts?** Són organitzacions associades amb qui executeu projectes de cooperació internacional. Els diners que els envieu no són "despesa operativa" sinó part de la vostra missió.

### Bloc d'alertes

> **Què fa:** T'avisa de coses que necessiten la teva atenció.  
> **En què t'ajuda:** No has de revisar tot manualment — el sistema et diu exactament on hi ha problemes.

| Alerta | Què significa | Què fer |
|--------|---------------|---------|
| "X moviments sense categoritzar" | Hi ha transaccions pendents de classificar | Clica per anar-hi |
| "X donants amb dades incompletes" | Falta DNI o codi postal | Completa-les abans del Model 182 |
| "X devolucions pendents" | Rebuts retornats sense identificar | Revisa la secció 7 |

> 🧘 **No t'espantis si veus moltes alertes al principi.** És completament normal. A mesura que vagis ordenant les dades, aniran desapareixent.

### Obligacions fiscals

> **Què fa:** Et recorda les dates límit dels models fiscals.  
> **En què t'ajuda:** No et pillarà el gener per sorpresa.

| Model | Data límit | Per a què serveix |
|-------|------------|-------------------|
| **Model 182** | 31 de gener | Declarar tots els donatius rebuts l'any anterior |
| **Model 347** | 28 de febrer | Declarar operacions amb tercers > 3.005,06€ |

**Semàfor de colors:**
- 🟢 Verd: Tens temps (més de 30 dies)
- 🟡 Groc: Comença a preparar-ho (menys de 30 dies)
- 🔴 Vermell: Urgent (menys de 7 dies)

### Filtre de dates

> **Què fa:** Permet canviar el període que estàs visualitzant.  
> **En què t'ajuda:** Pots veure les dades d'un any, trimestre, mes o rang personalitzat.

---

## 1.5 El flux de treball recomanat

> **Què fa:** T'indica l'ordre òptim per fer les tasques a Summa Social.  
> **En què t'ajuda:** Evita que et perdis o facis les coses en un ordre que generi problemes.

```
┌────────────────────────────────────────────────────────────┐
│              FLUX DE TREBALL MENSUAL                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. CONFIGURACIÓ INICIAL  ← Només el primer cop            │
│           ↓                                                │
│  2. IMPORTAR EXTRACTE  ← Cada mes quan el tens             │
│           ↓                                                │
│  3. CATEGORITZAR MOVIMENTS  ← Després d'importar           │
│           ↓                                                │
│  4. COMPLETAR CONTACTES  ← Quan detectis dades que falten  │
│           ↓                                                │
│  5. DIVIDIR REMESES  ← Si tens remeses de quotes           │
│           ↓                                                │
│  6. GESTIONAR DEVOLUCIONS  ← Si hi ha rebuts retornats     │
│           ↓                                                │
│  7. REVISAR ALERTES  ← Verificar que tot està OK           │
│           ↓                                                │
│  8. INFORMES FISCALS  ← Gener (182) i Febrer (347)         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

> 💡 **Consell d'or:** És millor deixar una dada pendent que inventar-la. Sempre podràs completar-la més tard.

---

## 1.6 El primer mes amb Summa Social

> **Què fa:** Et prepara mentalment per al període d'adaptació.  
> **En què t'ajuda:** Saber què és normal evita l'estrès i la frustració.

### Què és completament normal

| Situació | Per què passa |
|----------|---------------|
| Molts moviments sense categoritzar | Encara no has tingut temps |
| Moltes alertes al Dashboard | El sistema detecta tot el que falta |
| Falten dades de donants | No tenies aquesta info abans |
| Sensació de "massa coses" | És un canvi respecte al que feies |

### En què centrar-te

1. ✅ Importar correctament els moviments bancaris
2. ✅ Categoritzar el gruix dels moviments (~80%)
3. ✅ Identificar els donants i proveïdors principals
4. ✅ Dividir les remeses si en tens
5. ✅ Entendre què volen dir les alertes

### Després d'1-2 mesos

- Les alertes baixen dràsticament
- Les categories ja estan creades i es reutilitzen
- Els informes fiscals surten nets a la primera
- La gestió mensual es fa en **menys d'una hora**

---

# 2. Configuració Inicial

> **Què és aquesta secció?**  
> Aquí configuraràs les dades bàsiques de l'entitat que apareixeran als documents oficials (certificats, informes). Aquesta configuració només cal fer-la una vegada.

---

## 2.1 Dades de l'organització

> **Què fa:** Guarda les dades fiscals i de contacte de la teva entitat.  
> **En què t'ajuda:** Aquestes dades apareixen automàticament als certificats de donació i altres documents, estalviant-te escriure-les cada cop.

### Com configurar-les

1. Ves a ⚙️ **Configuració**
2. Busca la secció **"Dades de l'organització"**
3. Omple tots els camps:

| Camp | Exemple | On apareix |
|------|---------|------------|
| **Nom de l'entitat** | Fundació Exemple | Certificats, informes |
| **CIF** | G12345678 | Certificats, Model 182 |
| **Adreça fiscal** | Carrer Major, 15 | Certificats |
| **Ciutat** | Barcelona | Certificats |
| **Codi postal** | 08001 | Certificats |
| Telèfon | 93 123 45 67 | Opcional |
| Email | info@entitat.org | Opcional |
| Web | www.entitat.org | Opcional |

4. Clica **"Guardar"**

---

## 2.2 Logo de l'entitat

> **Què fa:** Afegeix el logo de l'entitat als documents generats.  
> **En què t'ajuda:** Els certificats de donació tenen un aspecte professional i oficial.

### Requisits

| Característica | Recomanació |
|----------------|-------------|
| Format | PNG (preferit) o JPG |
| Mida màxima | 2 MB |
| Fons | Transparent (PNG) queda millor |

### Com pujar-lo

1. A Configuració, busca **"Logo"**
2. Clica **"Pujar logo"**
3. Selecciona el fitxer
4. Veuràs una previsualització

> 💡 Pots usar eines gratuïtes com [remove.bg](https://remove.bg) per eliminar el fons blanc del teu logo.

---

## 2.3 Firma digitalitzada

> **Què fa:** Afegeix una firma als certificats de donació.  
> **En què t'ajuda:** Els certificats semblen signats a mà, donant-los més oficialitat sense haver de signar-los físicament.

### Què necessites

1. Imatge de la firma (PNG amb fons transparent recomanat)
2. Nom del signant (ex: "Maria Garcia López")
3. Càrrec (ex: "Presidenta")

### Com crear una firma digitalitzada

1. Signa en un paper blanc amb bolígraf negre
2. Fes-li una foto amb el mòbil (bona il·luminació)
3. Retalla la imatge perquè només es vegi la firma
4. Elimina el fons amb una eina online (opcional)

---

## 2.4 Categories comptables

> **Què fa:** Defineix les categories per classificar moviments (ingressos i despeses).  
> **En què t'ajuda:** Permet organitzar les finances i generar informes per tipus de moviment.

### Categories predefinides

Summa Social ja ve amb categories bàsiques:

| Ingressos | Despeses |
|-----------|----------|
| Donacions | Nòmines i Seguretat Social |
| Quotes de socis | Lloguer |
| Subvencions | Subministraments |
| Loteries i sorteigs | Serveis professionals |
| Ingressos voluntariat | Transferències a contraparts |
| Altres ingressos | Comissions bancàries |

### Afegir una categoria nova

1. **Configuració > Categories**
2. Clica **"+ Nova categoria"**
3. Escriu el nom
4. Selecciona el tipus: Ingrés o Despesa
5. Clica **"Crear"**

> 💡 **Consell:** Millor 10-15 categories clares que 50 de massa específiques. Les categories massa granulars acaben sent difícils de mantenir.

---

## 2.5 Membres de l'equip

> **Què fa:** Permet convidar altres persones de l'entitat a usar Summa Social amb diferents nivells de permisos.  
> **En què t'ajuda:** Pots delegar tasques a altres membres de l'equip sense donar-los accés a tot.

### Rols disponibles

| Rol | Descripció | Accés Zona Perill |
|-----|------------|:-----------------:|
| **SuperAdmin** | Control total de l'organització | ✅ |
| **Admin** | Pot configurar però no esborrar massivament | ❌ |
| **User** | Gestió diària (importar, categoritzar) | ❌ |
| **Viewer** | Només pot veure, no modificar | ❌ |

### Permisos detallats

| Acció | SuperAdmin | Admin | User | Viewer |
|-------|:----------:|:-----:|:----:|:------:|
| Veure totes les dades | ✅ | ✅ | ✅ | ✅ |
| Crear/editar moviments | ✅ | ✅ | ✅ | ❌ |
| Importar extractes | ✅ | ✅ | ✅ | ❌ |
| Eliminar moviments | ✅ | ✅ | ❌ | ❌ |
| Gestionar categories | ✅ | ✅ | ❌ | ❌ |
| Configurar organització | ✅ | ✅ | ❌ | ❌ |
| Gestionar membres | ✅ | ✅ | ❌ | ❌ |
| **Zona de Perill** | ✅ | ❌ | ❌ | ❌ |

### Convidar un membre

1. **Configuració > Membres**
2. Clica **"Convidar membre"**
3. Introdueix l'email
4. Selecciona el rol
5. Clica **"Enviar invitació"**

La persona rebrà un email amb instruccions per crear el seu compte.

> 💡 **Seguretat:** Dona sempre el rol mínim necessari. Si algú només ha de consultar dades, fes-lo Viewer.

---

## 2.6 Comptes bancaris

> **Què fa:** Permet registrar múltiples comptes bancaris de l'entitat.  
> **En què t'ajuda:** Pots filtrar moviments per compte i saber exactament d'on ve o on va cada transacció.

### Quan usar-ho

Si la teva entitat té **més d'un compte bancari** (per exemple, un compte corrent i un d'estalvi, o comptes en diferents bancs).

### Afegir un compte

1. **Configuració > Comptes bancaris**
2. Clica **"+ Nou compte"**
3. Omple:

| Camp | Exemple | Obligatori |
|------|---------|:----------:|
| Nom identificatiu | "Compte principal La Caixa" | ✅ |
| IBAN | ES12 3456 7890 1234 5678 90 | Recomanat |
| Nom del banc | CaixaBank | Opcional |

4. Clica **"Crear"**

### Compte per defecte

Si tens més d'un compte, pots marcar-ne un com a "Per defecte". Els nous moviments s'assignaran a aquest compte si no n'especifiques cap.

> 💡 Si només tens un compte bancari, no cal que configuris res aquí.

---

# 3. Gestió de Donants

> **Què és aquesta secció?**  
> Aquí gestionaràs la base de dades de donants: les persones i empreses que fan aportacions a la teva entitat. Tenir les dades completes és essencial per generar el Model 182 i els certificats de donació.

---

## 3.1 Per què és important tenir dades completes?

> **Què fa:** Explica la importància de cada camp del donant.  
> **En què t'ajuda:** Entens per què el sistema insisteix tant en certes dades i què passa si falten.

### Conseqüències de tenir dades incompletes

| Dada que falta | Conseqüència |
|----------------|--------------|
| **DNI/CIF** | ❌ El donant NO apareix al Model 182 |
| **Codi postal** | ❌ El Model 182 no sap la província → Error |
| **Nom complet** | ❌ El certificat serà incorrecte |
| Email | ⚠️ No podràs identificar-lo a Stripe |
| IBAN | ⚠️ No podràs identificar-lo a remeses |

### Dades mínimes per al Model 182

```
✅ Nom complet ─────── "Maria Garcia López"
✅ DNI o CIF ────────── "12345678A" o "B12345678"
✅ Codi postal ─────── "08001"
```

> ⚠️ **Sense aquestes 3 dades, el donant NO apareix al Model 182.**

---

## 3.2 Afegir un donant

> **Què fa:** Crea un nou registre de donant a la base de dades.  
> **En què t'ajuda:** Un cop creat, pots assignar-li moviments i generar-li certificats.

### Pas a pas

1. Ves a ❤️ **Donants**
2. Clica **"+ Nou donant"**
3. Omple el formulari
4. Clica **"Guardar"**

### Camps del formulari

| Camp | Obligatori | Per a què serveix |
|------|:----------:|-------------------|
| **Nom** | ✅ | Identificar el donant |
| **DNI/CIF** | ⚠️ Model 182 | Declaració fiscal |
| **Codi postal** | ⚠️ Model 182 | Determina província |
| Adreça | Opcional | Correspondència |
| Email | Opcional | Identificar-lo a Stripe |
| Telèfon | Opcional | Contacte |
| IBAN | Opcional | Identificar-lo a remeses |
| **Tipus** | ✅ | Particular o Empresa |
| **Modalitat** | ✅ | Soci (recurrent) o Puntual |
| Quota mensual | Si és soci | Seguiment |
| Categoria per defecte | Opcional | Auto-categorització |

### El poder de la categoria per defecte

> **Què fa:** Assigna automàticament una categoria als moviments d'aquest donant.  
> **En què t'ajuda:** Estalvies feina repetitiva. Si en Joan sempre paga "Quotes de socis", el sistema ho categoritza sol.

---

## 3.3 Importar donants des d'Excel

> **Què fa:** Permet pujar una llista de donants des d'un fitxer Excel o CSV.  
> **En què t'ajuda:** Si ja tens els donants en un full de càlcul, no cal que els introdueixis un per un.

### Columnes detectades automàticament

El sistema reconeix columnes amb noms com:

| El sistema reconeix... | Per al camp... |
|------------------------|----------------|
| nom, nombre, name | Nom |
| dni, nif, cif | DNI/CIF |
| cp, codipostal, zipcode | Codi postal |
| email, correu | Email |
| iban, cuenta, compte | IBAN |
| tipo, tipus | Tipus |
| estado, estat | Estat |

### Pas a pas

1. Ves a ❤️ **Donants**
2. Clica **"Importar donants"**
3. Arrossega el fitxer o clica per seleccionar-lo
4. Revisa el mapejat de columnes
5. Clica **"Previsualitzar"**
6. Revisa les dades (verd=OK, groc=avís, vermell=error)
7. Clica **"Importar"**

---

## 3.4 Actualitzar donants existents

> **Què fa:** Permet actualitzar dades de donants que ja existeixen quan importes un Excel.  
> **En què t'ajuda:** Si un donant ha canviat d'adreça o IBAN, pots actualitzar-ho massivament.

### Com funciona

Quan importes un Excel amb donants que **ja existeixen** (tenen el mateix DNI):

1. **Per defecte:** S'ignoren (marcats en gris)
2. **Amb checkbox activat:** S'actualitzen (marcats en blau)

Activa el checkbox **"Actualitzar dades de donants existents"** per sobreescriure.

**S'actualitzen:** Estat, CP, Adreça, Email, Telèfon, IBAN, Modalitat, Tipus  
**NO s'actualitzen:** Nom, DNI (per seguretat)

---

## 3.5 Estat: Actiu o Baixa

> **Què fa:** Permet marcar un donant com a "Baixa" sense esborrar-lo.  
> **En què t'ajuda:** Conserves l'historial de donacions per a informes d'anys anteriors.

### Per què no esborrar?

- Perdries tot l'historial de donacions
- Els informes fiscals d'anys anteriors quedarien incomplets
- No podries emetre certificats d'anys passats

### Donar de baixa un donant

1. Ves a ❤️ **Donants**
2. Clica el nom del donant
3. Clica **"Editar"**
4. Canvia l'estat a **"Baixa"**
5. Clica **"Guardar"**

### Filtrar per estat

Per defecte la llista mostra només **Actius**. Usa el filtre per veure baixes o tots.

---

## 3.6 La fitxa del donant

> **Què fa:** Mostra tota la informació d'un donant en un panell lateral.  
> **En què t'ajuda:** Tens una visió completa del donant sense sortir de la pàgina.

### Què inclou

- **Dades personals** completes
- **Historial de donacions** (paginat)
- **Historial de devolucions**
- **Resum per any**
- Accions: Editar, Generar certificat

### Com obrir-la

Clica el **nom** de qualsevol donant a la llista.

---

## 3.7 Exportar donants a Excel

> **Què fa:** Descarrega la llista de donants en format Excel.  
> **En què t'ajuda:** Pots treballar amb les dades fora de Summa Social o compartir-les amb altres sistemes.

### Com fer-ho

1. A la llista de donants, clica **"Exportar"**
2. Es descarrega un fitxer Excel

**Columnes exportades:** Nom, NIF, Quota mensual, IBAN, Estat

**Nom del fitxer:** `donants_YYYY-MM-DD.xlsx`

---

# 4. Gestió de Proveïdors i Treballadors

> **Què és aquesta secció?**  
> Aquí gestionaràs els proveïdors (empreses o professionals als quals pagueu) i els treballadors contractats. Són importants per al Model 347 i per tenir control de les despeses.

---

## 4.1 Proveïdors

> **Què fa:** Permet registrar les empreses i professionals als quals l'entitat paga per serveis o productes.  
> **En què t'ajuda:** Si pagues més de 3.005,06€ anuals a un proveïdor, ha d'aparèixer al Model 347. Tenir-los registrats t'estalvia feina.

### Dades importants

| Camp | Per a què serveix |
|------|-------------------|
| **Nom / Raó social** | Identificació |
| **NIF/CIF** | Obligatori per Model 347 |
| Categoria per defecte | Auto-categorització |
| IBAN | Identificar pagaments |

### Afegir un proveïdor

1. Ves a 🏢 **Proveïdors**
2. Clica **"+ Nou proveïdor"**
3. Omple les dades
4. Clica **"Guardar"**

---

## 4.2 Treballadors

> **Què fa:** Permet registrar el personal contractat per l'entitat.  
> **En què t'ajuda:** Pots controlar tots els pagaments de nòmina i tenir-los categoritzats automàticament.

### Afegir un treballador

1. Ves a 👷 **Treballadors**
2. Clica **"+ Nou treballador"**
3. Omple: Nom, DNI, Categoria per defecte
4. Clica **"Guardar"**

---

# 5. Gestió de Moviments

> **Què és aquesta secció?**  
> Els moviments són el cor de Summa Social. Representen cada entrada i sortida de diners del compte bancari. Aquí aprendràs a importar-los, categoritzar-los i gestionar-los.

---

## 5.1 Importar l'extracte del banc

> **Què fa:** Carrega els moviments bancaris des d'un fitxer Excel o CSV exportat del teu banc.  
> **En què t'ajuda:** No has d'introduir les transaccions a mà — el sistema les llegeix directament de l'extracte.

### Formats suportats

| Format | Extensions |
|--------|------------|
| CSV | .csv, .txt |
| Excel | .xlsx, .xls |

### Pas a pas

1. Descarrega l'extracte del teu banc (banca online)
2. Ves a 💰 **Moviments**
3. Clica **"Importar"**
4. Arrossega el fitxer o clica per seleccionar-lo
5. Revisa les columnes detectades (Data, Descripció, Import)
6. Si tens més d'un compte, selecciona'l
7. Clica **"Importar X moviments"**

✅ **Verificació:** Veuràs "X moviments importats correctament"

### Detecció de duplicats

> **Què fa:** Identifica moviments que ja existeixen i no els importa dues vegades.  
> **En què t'ajuda:** Pots importar el mateix extracte diverses vegades sense por de duplicar dades.

---

## 5.2 L'auto-assignació intel·ligent

> **Què fa:** Quan importes moviments, el sistema intenta assignar-los automàticament a contactes i categories.  
> **En què t'ajuda:** La majoria de moviments queden categoritzats sense que hagis de fer res.

### Com funciona (3 fases)

```
┌───────────────────────────────────────────────────────────┐
│              AUTO-ASSIGNACIÓ                              │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  FASE 1: MATCHING PER NOM (~70%)                          │
│  El sistema busca el nom de cada contacte a la descripció │
│  Exemple: "REBUT ENDESA SA" → Proveïdor "ENDESA"          │
│                                                           │
│  FASE 2: INTEL·LIGÈNCIA ARTIFICIAL (~16% més)             │
│  Si no troba nom, la IA suggereix el contacte             │
│  (La suggerència sempre requereix validació humana)       │
│                                                           │
│  FASE 3: CATEGORIA PER DEFECTE                            │
│  Si el contacte té categoria → s'aplica automàticament    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Regles automàtiques de categorització

> **Què fan:** Detecten certs patrons i assignen categories forçades.  
> **En què t'ajuden:** Alguns ingressos es categoritzen sense necessitat de contacte.

| Si la descripció conté... | Categoria assignada |
|---------------------------|---------------------|
| "loteria", "sorteig", "rifa" | Loteries i sorteigs |
| "voluntari", "voluntariat" | Ingressos voluntariat |

---

## 5.3 La taula de moviments

> **Què fa:** Mostra tots els moviments en format de taula editable.  
> **En què t'ajuda:** Pots veure, filtrar i editar els moviments de manera ràpida.

### Estructura de la pantalla

```
┌─────────────────────────────────────────────────────────────────────┐
│  MOVIMENTS                    [+ Nou] [Filtres ▼] [⋮ Opcions]       │
├─────────────────────────────────────────────────────────────────────┤
│  [2024 ×] [Quotes de socis ×] [Sense contacte ×]   [Neteja filtres] │
├─────────────────────────────────────────────────────────────────────┤
│  ☐ │ Data │ Descripció │ Import │ Categoria │ Contacte │ 📎        │
│  ☐ │ 15/12│ REMESA ... │ 5.430€ │ Quotes    │ —        │           │
│  ☐ │ 14/12│ ENDESA SA  │  -85€  │ Subminist.│ Endesa   │ ✓         │
└─────────────────────────────────────────────────────────────────────┘
```

### Botó "Filtres" (Sheet lateral)

> **Què fa:** Obre un panell lateral amb tots els filtres disponibles.  
> **En què t'ajuda:** Pots trobar exactament els moviments que busques.

**Filtres disponibles:**
- Per data (any, trimestre, mes, personalitzat)
- Per categoria
- Per contacte
- Per projecte
- Per **compte bancari**
- Per **origen**: bank, remittance, stripe, manual
- Sense categoritzar
- Sense contacte
- Devolucions pendents

Els filtres aplicats apareixen com a "pills" sota el header.

### Menú d'opcions de la taula (⋮)

> **Què fa:** Controla opcions de visualització de la taula.  
> **En què t'ajuda:** Pots personalitzar què veus.

| Opció | Descripció |
|-------|------------|
| Ocultar desglossament remeses | Agrupa les quotes dins la remesa |
| Mostrar columna projecte | Afegeix columna de projecte |

---

## 5.4 Editar moviments

> **Què fa:** Permet modificar qualsevol camp d'un moviment.  
> **En què t'ajuda:** Pots corregir errors o afegir informació que falta.

### Com fer-ho

Clica directament sobre qualsevol cel·la per editar-la. Els canvis es guarden **automàticament**.

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

## 5.5 Adjuntar documents (Drag & Drop)

> **Què fa:** Permet arrossegar fitxers directament sobre una fila per adjuntar-los al moviment.  
> **En què t'ajuda:** Pots guardar els justificants (factures, rebuts) juntament amb cada moviment sense haver d'obrir cap diàleg.

### Com funciona

1. Arrossega el fitxer sobre la fila del moviment
2. Apareix un overlay "Deixa anar per adjuntar"
3. Deixa anar el fitxer
4. El document es puja i s'assigna

### Tipus acceptats

PDF, JPG, PNG, GIF, WEBP, XML

### Mida màxima

15 MB per fitxer

---

## 5.6 Selecció múltiple i accions en bloc

> **Què fa:** Permet seleccionar diversos moviments i aplicar una acció a tots alhora.  
> **En què t'ajuda:** Pots categoritzar 50 moviments en un sol clic en lloc de fer-ho un per un.

### Com funciona

1. Activa les caselles de selecció (columna esquerra)
2. Marca els moviments que vulguis (o usa el checkbox de la capçalera per tots)
3. Apareix una **barra d'accions**: "N seleccionats"

### Accions disponibles

| Acció | Descripció |
|-------|------------|
| **Assignar categoria...** | Aplica una categoria a tots els seleccionats |
| **Treure categoria** | Posa categoria buida a tots els seleccionats |

> 💡 Només disponible per rols Admin i User. Els Viewers no veuen els checkboxes.

---

## 5.7 Banner de devolucions pendents

> **Què fa:** Mostra un avís quan hi ha devolucions sense assignar a cap donant.  
> **En què t'ajuda:** No oblidaràs gestionar les devolucions, que afecten el Model 182.

Quan hi ha devolucions pendents, apareix un banner vermell:

> ⚠️ Hi ha devolucions pendents d'assignar **[Revisar]**

Clicant "Revisar" es filtren automàticament les devolucions.

---

# 6. Divisor de Remeses

> **Què és aquesta secció?**  
> Les remeses són ingressos grans que agrupen moltes quotes de socis. Aquí aprendràs a "dividir-les" per saber quant ha pagat cada soci individualment, cosa imprescindible per al Model 182.

---

## 6.1 Què és una remesa?

> **Què fa:** Explica el concepte de remesa bancària.  
> **En què t'ajuda:** Entens per què cal dividir-la i què passa si no ho fas.

### El problema

El banc t'ingressa un import gran que en realitat són moltes quotes agrupades:

```
El banc mostra:    15/01/2024  REMESA RECIBOS TRIODOS  +5.430€

Però dins hi ha:   Maria García   →  15€
                   Joan Martínez  →  20€
                   Anna López     →  10€
                   ...
                   (303 socis)    → 5.430€ TOTAL
```

### Per què és un problema?

Sense dividir la remesa:
- ❌ No saps quant ha donat cada soci
- ❌ No pots generar el Model 182 (necessites l'import per persona)
- ❌ No pots emetre certificats individuals
- ❌ Les estadístiques per donant són incorrectes

### La solució

El **Divisor de Remeses** t'ajuda a "obrir" aquest ingrés i assignar cada quota al seu soci.

---

## 6.2 Què necessites abans de començar

1. ✅ El **moviment de la remesa** ja importat a Summa Social
2. ✅ El **fitxer de detall** que et proporciona el banc (CSV o Excel)

> 💡 **On trobar el fitxer de detall?** A la banca online del teu banc, secció "Remeses" o "Cobraments".

---

## 6.3 Com dividir una remesa

> **Què fa:** Processa una remesa i crea un moviment per cada quota individual.  
> **En què t'ajuda:** Cada soci queda amb el seu import correcte per al Model 182.

### Pas a pas

1. Ves a 💰 **Moviments**
2. Localitza la remesa (ingrés gran, concepte "REMESA RECIBOS...")
3. Menú **⋮** → **"Dividir remesa"**
4. Puja el fitxer de detall del banc
5. **Mapeja les columnes**:
   - 🟢 Import (obligatori)
   - 🔵 Nom
   - 🟣 DNI/CIF
   - 🔷 IBAN
6. Revisa el matching
7. Clica **"Processar"**

### Colors del matching

| Color | Significat | Acció necessària |
|-------|------------|------------------|
| 🟢 Verd | Soci trobat | Cap |
| 🟠 Taronja | Soci de baixa detectat | Decidir si reactivar |
| 🔵 Blau | Soci nou (es crearà) | Revisar dades |
| 🟡 Groc | No es pot identificar | Afegir DNI o assignar manualment |

---

## 6.4 Socis de baixa detectats

> **Què fa:** Detecta si alguna quota correspon a un soci marcat com "Baixa".  
> **En què t'ajuda:** Pots reactivar socis que encara paguen però estaven donats de baixa per error.

Si es detecten socis de baixa:
- Apareix un **avís taronja**
- Pots **reactivar-los individualment** o **tots alhora**

---

## 6.5 Vista agrupada de remeses

> **Què fa:** Mostra les remeses processades com una sola línia amb indicador visual.  
> **En què t'ajuda:** La taula no queda plena de 300 línies per cada remesa.

Després de processar:
- La remesa apareix com **1 sola línia**
- Badge verd: **"✓ Remesa processada · 303/303 quotes"**
- Fons verd molt suau per identificar-la ràpidament

### Veure el detall de les quotes

1. Clica el badge verd
2. S'obre una **finestra** amb totes les quotes
3. Pots cercar per nom o DNI
4. Clica un nom per anar a la fitxa del donant

---

## 6.6 Modal de revisió

> **Què fa:** Mostra una previsualització de les quotes abans de processar.  
> **En què t'ajuda:** Pots revisar i corregir errors abans que es guardin.

### Estructura del modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  REVISIÓ DE LA REMESA                                               │
├─────────────────────────────────────────────────────────────────────┤
│  [303 donacions] [✓ 280 trobats] [+ 15 nous] [⚠ 8 sense DNI]       │
│  [1.234,56€ / 1.234,56€]                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TAULA AMB SCROLL (95% viewport)                                    │
│  - Header sticky                                                    │
│  - Cerca integrada                                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                      [Enrere] [Processar]           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6.7 Guardar configuració de columnes

> **Què fa:** Guarda el mapejat de columnes per no haver de fer-lo cada vegada.  
> **En què t'ajuda:** Si sempre uses el mateix banc, el procés és molt més ràpid.

### Com guardar

1. Després de mapejar correctament
2. Clica **"Guardar configuració"**
3. Dona-li un nom (ex: "Triodos - Remeses mensuals")

### Com usar-la

La propera vegada, el sistema detectarà el format i carregarà la configuració automàticament.

---

## 6.8 Què fer si surt malament

> **Què fa:** Permet desfer una remesa processada incorrectament.  
> **En què t'ajuda:** Pots corregir errors sense perdre dades.

1. ⚙️ **Configuració > Zona de Perill** (cal ser SuperAdmin)
2. Clica **"Esborrar última remesa processada"**
3. Escriu "BORRAR" per confirmar
4. La remesa es restaura a l'estat original
5. Pots tornar-la a processar correctament

---

## 6.9 Remeses de pagaments (OUT / SEPA)

> **Què fa:** Permet dividir una remesa de pagaments (despeses) en transferències individuals a proveïdors o treballadors.
> **En què t'ajuda:** Pots desgranar una despesa agregada i opcionalment generar un fitxer SEPA per al banc.

### Què és una remesa de pagaments?

Quan el banc executa una remesa de transferències (nòmines, pagaments a proveïdors), apareix al teu extracte com una sola línia negativa:

```
El banc mostra:    15/01/2024  REMESA PAGAMENTS TRIODOS  -3.200€

Però dins hi ha:   Nòmina Joan    →  -1.200€
                   Proveïdor ABC  →    -800€
                   Proveïdor XYZ  →    -600€
                   Autònom Maria  →    -600€
                                     -3.200€ TOTAL
```

### Pas a pas

1. Ves a 💰 **Moviments**
2. Localitza la remesa de pagaments (despesa gran negativa)
3. Menú **⋮** → **"Dividir remesa"**
4. Puja el fitxer de detall del banc (CSV o Excel)
5. **Mapeja les columnes**:
   - 🟢 Import (obligatori)
   - 🔵 Nom beneficiari
   - 🔷 IBAN beneficiari
6. Revisa el matching amb proveïdors/treballadors
7. Verifica que la suma quadra (diferència màxima: ±0,02€)
8. Clica **"Processar"**

### Exportar fitxer SEPA (opcional)

Si la teva entitat prepara les remeses de pagament internament, pots:

1. Després de processar, clica **"Exportar SEPA"**
2. Introdueix la data d'execució desitjada
3. Es descarrega un fitxer XML (pain.001)
4. Puja'l a la banca online del teu banc

> 💡 **Requisit:** Tots els pagaments han de tenir IBAN vàlid per poder exportar SEPA.

### Indicadors visuals

| Element | Significat |
|---------|------------|
| Badge verd "✓ Remesa · 15 pagaments" | Remesa processada correctament |
| Fons verd suau | Identifica ràpidament les remeses processades |
| Banner taronja | La suma no quadra exactament (revisa els imports) |

### Desfer una remesa de pagaments

Si t'has equivocat, pots desfer la remesa:

1. Localitza el moviment pare (la remesa processada)
2. Menú **⋮** → **"Desfer remesa"**
3. Confirma l'acció
4. Es restaura el moviment original

> ⚠️ Aquesta acció elimina tots els pagaments individuals i el fitxer de remesa associat.

---

# 7. Gestió de Devolucions Bancàries

> **Què és aquesta secció?**
> Les devolucions són rebuts que el banc no ha pogut cobrar i retorna. Si no les gestionem, el Model 182 mostrarà imports incorrectes. Aquí aprendràs a identificar-les i assignar-les al donant corresponent.

---

## 7.1 Què és una devolució?

> **Què fa:** Explica el concepte de devolució bancària.  
> **En què t'ajuda:** Entens per què cal gestionar-les i l'impacte que tenen.

### Motius habituals

| Motiu | Descripció |
|-------|------------|
| **Fons insuficients** | El compte del soci no tenia prou diners |
| **IBAN incorrecte** | L'IBAN registrat té un error |
| **Ordre de no pagament** | El soci ha ordenat al banc no pagar |
| **Compte tancat** | El compte ja no existeix |

### Per què és important?

```
┌─────────────────────────────────────────────────────────────────────┐
│  IMPACTE DE LES DEVOLUCIONS                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Si NO assignes les devolucions al soci correcte:                   │
│                                                                     │
│  ❌ Model 182 → Import declarat serà INCORRECTE                      │
│  ❌ Certificat → Import serà INCORRECTE                              │
│                                                                     │
│  Exemple:                                                           │
│  • Joan ha pagat 12 quotes de 15€ = 180€                            │
│  • Però 2 quotes han estat retornades = -30€                        │
│  • Import REAL = 150€                                               │
│  • Si no assignes les devolucions, el Model 182 dirà 180€ ❌        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7.2 Com sé si tinc devolucions pendents?

> **Què fa:** T'indica on trobar les alertes de devolucions.  
> **En què t'ajuda:** No les passaràs per alt.

- **Dashboard:** Alerta "X devolucions pendents d'assignar"
- **Moviments:** Banner vermell amb botó "Revisar"

---

## 7.3 Assignar devolucions manualment

> **Què fa:** Permet assignar una devolució a un donant cercant-lo.  
> **En què t'ajuda:** Ideal quan tens poques devolucions o saps de qui són.

### Pas a pas

1. **Moviments** → Banner "Devolucions pendents" → **Revisar**
2. Per cada devolució, clica **"Assignar donant"**
3. Cerca per nom, DNI, IBAN o email
4. Confirma l'assignació

✅ **Verificació:** El botó vermell desapareix i apareix el nom del donant.

---

## 7.4 Importar fitxer de devolucions del banc

> **Què fa:** Processa un fitxer del banc amb el detall de les devolucions i les assigna automàticament.  
> **En què t'ajuda:** Quan tens moltes devolucions, és molt més ràpid que fer-ho una a una.

### Bancs suportats

| Banc | Format | Particularitat |
|------|--------|----------------|
| **Santander** | Excel (.xlsx) | Data global a la capçalera |
| **Triodos** | CSV o XLS | Cada línia té data pròpia |
| **Altres** | CSV o Excel | Detecció automàtica |

### Pas a pas

1. Localitza una devolució a **Moviments**
2. Clica la icona **📄** (pujar fitxer)
3. Puja el fitxer CSV o Excel del banc
4. Mapeja columnes: **IBAN** (prioritari), Import, Data, Nom
5. Revisa resultats
6. Clica **"Processar"**

### Matching de transaccions

| Criteri | Tolerància |
|---------|------------|
| Import | ±0,02€ |
| Data | ±5 dies |
| IBAN | Exacte |

### Matching de donants

| Prioritat | Criteri | Normalització |
|-----------|---------|---------------|
| 1 | IBAN | Sense espais, majúscules |
| 2 | DNI/NIF | Sense guions, majúscules |
| 3 | Nom | Sense accents, minúscules, exacte |

> ⚠️ **NO es fa matching aproximat.** Si no coincideix exactament, no s'assigna.

---

## 7.5 Devolucions agrupades (remeses)

> **Què fa:** Gestiona quan el banc agrupa múltiples devolucions en un sol moviment.  
> **En què t'ajuda:** Pots dividir la remesa de devolucions igual que les de quotes.

### Exemple

```
Extracte del banc:  -55€ "DEVOLUCION RECIBOS"
Fitxer de detall:   10€ + 20€ + 15€ + 10€ = 55€
```

### Comportament del sistema

1. Detecta l'agrupació
2. Crea transaccions filles per cada devolució
3. Manté el pare intacte

---

## 7.6 Remeses parcials

> **Què fa:** Gestiona quan algunes devolucions d'una remesa no es poden identificar.  
> **En què t'ajuda:** Les que sí es poden identificar queden resoltes, i pots completar la resta més tard.

| Element | Estat |
|---------|-------|
| Devolucions identificades | Es creen com a filles |
| Devolucions no identificades | Queden pendents |
| Remesa | `remittanceStatus: partial` |

**Visualització:** Badge taronja "2/4 quotes (2 pendents: 25€)"

### Per completar

1. Busca el donant i actualitza el seu IBAN
2. Torna a importar el fitxer

---

## 7.7 Impacte als informes

> **Què fa:** Explica com afecten les devolucions al Model 182 i certificats.  
> **En què t'ajuda:** Entens el càlcul fiscal.

| Document | Càlcul |
|----------|--------|
| **Model 182** | Σ Donacions − Σ Devolucions |
| **Certificat** | Σ Donacions − Σ Devolucions |

**Important:**
- Si total ≤ 0 → El donant **no apareix** al Model 182
- Les filles amb contactId sempre compten, independentment de l'estat de la remesa

---

## 7.8 Mode SuperAdmin: recreació de devolucions

> **Què fa:** Permet esborrar totes les filles d'una remesa de devolucions i tornar-les a crear.  
> **En què t'ajuda:** Útil per corregir errors de matching massivament.

### Quan usar-la

- Migracions de dades històriques
- Correcció massiva d'errors
- Sincronització després de canvis a la base de donants

### Com fer-ho

1. A l'importador de devolucions
2. Activa **"Forçar recreació de devolucions"**
3. Confirma
4. S'eliminen les filles existents i es recreen

> ⚠️ **Només per SuperAdmin.** No és el flux normal d'usuari.

---

# 8. Donacions via Stripe

> **Què és aquesta secció?**  
> Si rebeu donacions online amb Stripe, aquesta secció t'explica com "dividir" les liquidacions de Stripe per saber quant ha donat cada persona i separar les comissions.

---

## 8.1 Què és un payout de Stripe?

> **Què fa:** Explica com funciona el flux de donacions amb Stripe.  
> **En què t'ajuda:** Entens per què cal processar les liquidacions.

### El flux

```
┌─────────────────────────────────────────────────────────────────────┐
│  FLUX STRIPE                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Donant fa donació a la web:     50€                             │
│  2. Stripe cobra comissió:          -1,70€                          │
│  3. Stripe agrupa amb altres donacions i envia al banc              │
│                                                                     │
│  El que veus al banc:                                               │
│  "Transferencia de Stripe"  +95,65€                                 │
│  (50€ + 30€ + 20€ = 100€ bruts - 4,35€ comissions = 95,65€ net)    │
│                                                                     │
│  PROBLEMA: El banc només veu 95,65€, no saps qui ha donat què      │
│  SOLUCIÓ: Importador Stripe                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8.2 Pas a pas

> **Què fa:** T'explica el procés complet per dividir un payout de Stripe.  
> **En què t'ajuda:** Cada donant queda amb el seu import correcte.

### PAS 1 — Localitza el moviment

1. **Moviments** → Cerca "Stripe"
2. Identifica l'ingrés

### PAS 2 — Obre el divisor

Menú **⋮** → **"Dividir remesa Stripe"**

> 💡 L'opció apareix si: és ingrés + conté "Stripe" a la descripció + no és remesa

### PAS 3 — Exporta el CSV de Stripe

1. Entra a **dashboard.stripe.com**
2. **Pagaments → Exportar**
3. Selecciona **"Columnes predeterminades"** (important!)
4. Descarrega CSV

> ⚠️ **No obris el CSV amb Excel abans de pujar-lo!** Excel pot modificar el format de dates i números.

### PAS 4 — Carrega i selecciona el payout

1. Puja el CSV
2. El sistema agrupa per payout (po_xxx)
3. Selecciona el que coincideix amb l'import del banc

### PAS 5 — Revisa el matching

El sistema identifica donants per **email** (exacte, case insensitive).

| Estat | Significat |
|-------|------------|
| ✅ Identificat | El donant existeix amb aquest email |
| ⚠️ Pendent | Cal assignar manualment |

### PAS 6 — Verifica que quadra

| Element | Ha de coincidir amb... |
|---------|------------------------|
| **Import net** | L'ingrés del banc |

> ⚠️ **Si no quadra, no processeu!** Potser has seleccionat el payout equivocat.

### PAS 7 — Processa

1. Clica **"Importar donacions"**
2. Es creen:
   - **N donacions** (import brut, amb "(via Stripe)")
   - **1 despesa de comissions** (agregada)

---

## 8.3 Camps CSV requerits

> **Què fa:** Llista els camps que el sistema necessita del CSV de Stripe.  
> **En què t'ajuda:** Saps quines columnes buscar si hi ha problemes.

| Camp Stripe | Ús |
|-------------|-----|
| id | Traçabilitat (ch_xxx) |
| Created date (UTC) | Data de la donació |
| Amount | Import brut |
| Fee | Comissió Stripe |
| Customer Email | Matching amb donant |
| Status | Filtrar només succeeded |
| Transfer | Agrupar per payout (po_xxx) |
| Amount Refunded | Detectar reemborsos |

---

## 8.4 Filtratge automàtic

> **Què fa:** Exclou automàticament certes donacions del procés.  
> **En què t'ajuda:** No has de netejar el CSV manualment.

| Condició | Acció |
|----------|-------|
| Status ≠ succeeded | S'exclou silenciosament |
| Amount Refunded > 0 | S'exclou + avís |

---

## 8.5 Bones pràctiques

| ✅ Fer | ❌ No fer |
|--------|----------|
| Processar cada payout amb el seu CSV | Crear donacions a mà |
| Assegurar emails correctes als donants | Obrir CSV amb Excel |
| Verificar import net abans de processar | Modificar moviment bancari |
| Assignar pendents manualment | Ignorar-los |

---

# 9. Informes Fiscals

> **Què és aquesta secció?**  
> Aquí aprendràs a generar els informes fiscals obligatoris (Model 182 i 347) i els certificats de donació per als teus donants.

---

## 9.1 Model 182 — Declaració de Donacions

> **Què fa:** Genera un fitxer Excel amb totes les donacions rebudes per enviar a la gestoria.  
> **En què t'ajuda:** La gestoria pot presentar el model a Hisenda sense haver de fer càlculs.

### Termini

**31 de gener** de l'any següent

### Requisits per donant

| Dada | Obligatòria | Conseqüència si falta |
|------|:-----------:|----------------------|
| **Nom complet** | ✅ | No apareix al model |
| **DNI/CIF** | ✅ | No apareix al model |
| **Codi postal** | ✅ | Error de província |

### Com generar-lo

1. **Informes > Model 182**
2. Selecciona l'any
3. Revisa alertes de dades incompletes
4. Corregeix errors clicant cada donant
5. Clica **"Generar Excel"**
6. Envia a la gestoria

### Columnes de l'Excel

| Columna | Descripció | Exemple |
|---------|------------|---------|
| NIF | DNI/CIF del donant | 12345678A |
| NOMBRE | Nom complet | MARIA GARCIA LOPEZ |
| CLAVE | Tipus de donatiu | A (fix) |
| PROVINCIA | 2 primers dígits del CP | 08 |
| VALOR | Import any actual | 150,00 |
| VALOR_1 | Import any anterior | 180,00 |
| VALOR_2 | Import fa 2 anys | 180,00 |
| RECURRENTE | Ha donat 3 anys seguits | X |
| NATURALEZA | Persona física o jurídica | F o J |

> 💡 Les devolucions es resten automàticament del VALOR.

---

## 9.2 Model 347 — Operacions amb tercers

> **Què fa:** Genera un fitxer amb els proveïdors als quals heu pagat més de 3.005,06€ anuals.  
> **En què t'ajuda:** Compliu amb l'obligació d'informar operacions significatives.

### Termini

**28 de febrer**

### Llindar

Proveïdors amb operacions > **3.005,06€ anuals**

### Com generar-lo

1. **Informes > Model 347**
2. Selecciona l'any
3. Revisa que tots tinguin NIF
4. Clica **"Generar CSV"**
5. Envia a la gestoria

---

## 9.3 Certificats de donació

> **Què fa:** Genera certificats PDF per als donants perquè puguin desgravar a la renda.  
> **En què t'ajuda:** Els donants reben un document oficial sense que hagis de fer-los a mà.

### Certificat individual

1. **Donants** → Clica un donant
2. A la fitxa, clica **"Generar certificat"**
3. Selecciona l'any
4. Es descarrega PDF

### Certificats massius

1. **Informes > Certificats**
2. Selecciona l'any
3. Clica **"Generar tots"**
4. Es descarrega ZIP amb tots els PDFs

### El certificat inclou

- Logo de l'entitat
- Dades del donant
- Import total (descomptant devolucions)
- Text legal Llei 49/2002
- Firma digitalitzada

### Impacte de les devolucions

| Situació | Certificat |
|----------|------------|
| Donacions 180€, Devolucions 30€ | **150€** |
| Donacions 50€, Devolucions 50€ | **No es genera** (total = 0) |

---

# 10. Projectes i Justificació

> **Què és aquesta secció?**  
> Aquí aprendràs a organitzar les finances per projectes i a usar el mòdul de justificació assistida si treballes amb subvencions.

---

## 10.1 Eixos d'actuació (bàsic)

> **Què fa:** Permet crear projectes o àrees de treball per assignar-hi moviments.  
> **En què t'ajuda:** Pots veure ingressos i despeses per projecte i generar informes específics.

### Quan usar-los?

| Situació | Usar projectes? |
|----------|:---------------:|
| Treballes amb subvencions | ✅ |
| Vols control per àrea | ✅ |
| Necessites informes per a la junta | ✅ |
| Entitat petita sense projectes | ❌ No cal |

> 💡 Si no necessites projectes, ignora aquesta secció.

### Crear un projecte

1. **Eixos d'actuació** → **"+ Nou projecte"**
2. Omple: Nom, Descripció, Finançador
3. Clica **"Crear"**

### Assignar moviments

Edita un moviment → Columna "Projecte" → Selecciona

### Estadístiques per projecte

| Mètrica | Descripció |
|---------|------------|
| Ingressos | Suma de moviments positius |
| Despeses | Suma de moviments negatius |
| Balanç | Ingressos − Despeses |

---

## 10.2 Mòdul de Projectes — Justificació Assistida

> **Què fa:** Permet quadrar la justificació econòmica d'un projecte subvencionat.  
> **En què t'ajuda:** Pots assignar despeses a partides pressupostàries i veure si estàs dins del pressupost aprovat.

> ⚠️ Aquest mòdul és **avançat** i està pensat per a qui justifica subvencions (ACCD, Fons Català, etc.).

### Navegació

Al menú lateral, **Projectes** té un submenú:

| Opció | Descripció |
|-------|------------|
| Gestió de projectes | Crear i editar projectes |
| Assignació de despeses | Vincular despeses a projectes i partides |

### Pantalla de Gestió Econòmica

Per cada projecte veuràs:

| Element | Descripció |
|---------|------------|
| **Pressupostat** | Import previst (del projecte o suma de partides) |
| **Executat** | Suma de despeses assignades |
| **Pendent** | Pressupostat − Executat |
| CTA | "Quadrar justificació" |

---

## 10.3 Importar pressupost des d'Excel

> **Què fa:** Carrega les partides pressupostàries des d'un fitxer Excel.  
> **En què t'ajuda:** No has d'introduir les partides a mà.

### Wizard de 5 passos

| Pas | Descripció |
|-----|------------|
| 1. Fitxer | Puja Excel (.xlsx) |
| 2. Pestanya | Selecciona sheet (si n'hi ha vàries) |
| 3. Columnes | Mapeja: nom, import, codi |
| 4. Agrupació | Agrupar subpartides o importar tal qual |
| 5. Revisió | Checkboxes per incloure/excloure |

### Característiques

- Auto-detecta columnes per patrons
- Parseja formats EU (1.234,56) i EN (1234.56)
- Exclou files de totals automàticament

---

## 10.4 Mode "Quadrar justificació"

> **Què fa:** Ajuda a distribuir despeses entre partides fins que quadri amb el pressupost.  
> **En què t'ajuda:** No has de fer els càlculs a mà ni en un Excel separat.

### Dos modes

| Mode | Quan s'usa |
|------|------------|
| **Infraexecució** | Has gastat menys del pressupostat → Afegir despeses |
| **Sobreexecució** | Has gastat més → Treure despeses |

### Infraexecució: afegir despeses

El sistema **suggereix** despeses del pool ordenades per rellevància:

| Factor | Punts |
|--------|-------|
| Categoria coincident | +3 |
| Descripció coincident | +2 |
| Import encaixa | +1 |
| Assignada altre projecte | −3 |

### Sobreexecució: treure despeses

- Treure **tota** la despesa de la partida
- Treure **part** de l'import (split parcial)

### Simulació

> **Què fa:** Els canvis es fan en memòria fins que confirmes.  
> **En què t'ajuda:** Pots provar diferents combinacions sense por de trencar res.

Clica **"Aplicar"** per guardar els canvis.

---

## 10.5 Assignació de despeses

> **Què fa:** Pantalla per vincular despeses a projectes i partides.  
> **En què t'ajuda:** Centralitza tota la gestió de justificació.

### Drag & Drop de documents

Pots arrossegar fitxers directament sobre cada fila de despesa:
- Feedback visual: ring blau
- Nom automàtic: `YYYY.MM.DD_concepte.ext`
- Tipus: PDF, imatges, Word, Excel
- Màxim: 10 MB

### Renomenar documents

1. Clica el llapis al costat del document
2. Edita el nom
3. Enter per guardar, Escape per cancel·lar

---

## 10.6 Captura de despeses de terreny

> **Què fa:** Permet al personal de camp pujar tiquets des del mòbil en menys de 10 segons.  
> **En què t'ajuda:** Les despeses petites (taxi, dietes, material) queden registrades sense esperar a tornar a l'oficina.

### Filosofia

**Captura ara, assignació després.**

L'usuari de terreny fa foto i envia. L'administració revisa després.

### Com funciona

1. Entra des del **mòbil** a Summa Social
2. **Projectes > Despeses > Captura**
3. Foto del tiquet
4. Import i data (mínim imprescindible)
5. **"Enviar"**

**Temps objectiu:** < 10 segons

### Rols

| Rol | Veu | Pot fer |
|-----|-----|---------|
| Viewer | Res | Res |
| User (Editor) | Les seves pujades | Pujar comprovants |
| Admin | Totes les pujades | Revisar, classificar, assignar |

---

# 11. Zona de Perill

> **Què és aquesta secció?**  
> Accions destructives que només pot fer el SuperAdmin. Són irreversibles, però necessàries per corregir errors greus o reiniciar dades.

---

## 11.1 Accés

La Zona de Perill és **exclusiva per a SuperAdmin**.

1. Ves a ⚙️ **Configuració**
2. Baixa fins al final
3. Veuràs la secció en vermell

---

## 11.2 Accions disponibles

| Acció | Descripció | Quan usar-la |
|-------|------------|--------------|
| **Esborrar tots els donants** | Elimina TOTS els donants | Reiniciar des de zero |
| **Esborrar tots els proveïdors** | Elimina TOTS els proveïdors | Reiniciar des de zero |
| **Esborrar tots els treballadors** | Elimina TOTS els treballadors | Reiniciar des de zero |
| **Esborrar tots els moviments** | Elimina TOTES les transaccions | Reiniciar des de zero |
| **Esborrar última remesa** | Desfà l'última remesa processada | Corregir error de remesa |

---

## 11.3 Desfer una remesa

> **Què fa:** Elimina les quotes individuals d'una remesa i restaura el moviment original.  
> **En què t'ajuda:** Pots tornar a processar una remesa que vas fer malament.

1. Clica **"Esborrar última remesa processada"**
2. El sistema mostra: data, concepte, import, nombre de quotes
3. Escriu **"BORRAR"** per confirmar
4. La remesa es restaura

---

# 12. Resolució de Problemes

> **Què és aquesta secció?**  
> Respostes ràpides als problemes més comuns que pots trobar usant Summa Social.

---

## 12.1 Problemes d'accés

| Problema | Solució |
|----------|---------|
| No puc iniciar sessió | Revisa email/contrasenya. Usa "He oblidat la contrasenya" |
| "Usuari no trobat" | Potser no t'han convidat. Contacta l'administrador |
| La sessió es tanca sovint | Normal. Caduca en tancar navegador o 30 min d'inactivitat |

---

## 12.2 Problemes amb dades

| Problema | Solució |
|----------|---------|
| He importat dues vegades | El sistema detecta duplicats. Si no, elimina manualment |
| Un donant ha canviat de DNI | Edita el donant i actualitza el DNI |
| No veig les meves dades | Revisa el filtre de dates |

---

## 12.3 Problemes amb remeses

| Problema | Solució |
|----------|---------|
| He dividit una remesa incorrectament | Zona Perill → Esborrar última remesa |
| La remesa no quadra | Verifica que el fitxer correspon a la remesa |
| No troba socis | Verifica que tenen IBAN o DNI correctes |

---

## 12.4 Problemes amb informes

| Problema | Solució |
|----------|---------|
| Model 182 mostra donants amb errors | Completa DNI i CP dels donants afectats |
| Les devolucions no es resten | Verifica que estan assignades (columna Contacte plena) |
| Certificat no es genera | El donant té total ≤ 0 després de devolucions |

---

## 12.5 Missatges d'error habituals

| Missatge | Significat | Solució |
|----------|------------|---------|
| "No tens permisos" | El teu rol no permet fer això | Demana canvi de rol |
| "Dades incompletes" | Falta informació obligatòria | Revisa camps vermells |
| "Duplicat detectat" | El registre ja existeix | Activa "Actualitzar existents" |
| "IBAN no vàlid" | Format incorrecte | 24 caràcters, comença per ES |
| "Import no quadra" | La suma no coincideix | Revisa el fitxer de detall |

---

# 13. Glossari

> **Què és aquesta secció?**  
> Definicions dels termes més importants que trobaràs a Summa Social.

| Terme | Definició |
|-------|-----------|
| **Remesa (IN)** | Agrupació de quotes de socis en un únic ingrés bancari |
| **Remesa (OUT)** | Agrupació de pagaments a proveïdors/treballadors en una única despesa |
| **SEPA pain.001** | Fitxer XML estàndard europeu per a ordres de transferència |
| **Devolució** | Rebut que el banc no ha pogut cobrar i retorna |
| **Remesa parcial** | Remesa amb algunes devolucions pendents d'identificar |
| **Payout** | Transferència que Stripe envia al banc amb l'import net |
| **Model 182** | Declaració informativa de donatius (límit 31 gener) |
| **Model 347** | Declaració d'operacions amb tercers > 3.005,06€ (límit 28 febrer) |
| **Soci** | Donant recurrent amb quota periòdica |
| **Donant puntual** | Donant amb aportacions esporàdiques |
| **Contrapart** | Entitat sòcia internacional a qui envieu fons |
| **SuperAdmin** | Rol amb accés total, inclosa Zona de Perill |
| **Matching** | Procés automàtic d'identificar contactes |
| **dateConfidence** | Fiabilitat de la data: line (per fila), file (global), none |
| **Recurrència** | Indicador de donant que ha contribuït 3 anys seguits |
| **Eix d'actuació** | Sinònim de projecte |
| **Gestoria** | Professional extern que presenta els models fiscals |
| **Off-bank** | Despesa fora del banc (captura de terreny) |
| **Partida** | Línia del pressupost d'un projecte |
| **Infraexecució** | Gastar menys del pressupostat |
| **Sobreexecució** | Gastar més del pressupostat |

---

# Una nota final

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  🧘 RECORDA...                                                       │
│                                                                     │
│  • Si tens dubtes, deixa la dada pendent.                           │
│    Sempre pots completar-la més tard.                               │
│                                                                     │
│  • Gairebé tot es pot desfer o corregir.                            │
│    Summa Social està pensat per humans que s'equivoquen.            │
│                                                                     │
│  • Les alertes són amigues, no errors greus.                        │
│    T'ajuden a saber què falta per fer.                              │
│                                                                     │
│  • Després d'1-2 mesos, tot flueix.                                 │
│    La paciència inicial té recompensa.                              │
│                                                                     │
│  • L'objectiu és dedicar el temps a la missió de l'entitat,         │
│    no a barallar-te amb fulls de càlcul.                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Molta sort! 🍀

---

**Summa Social v1.17** — Desembre 2025

*Gestió financera pensada per a entitats que volen dedicar el seu temps al que realment importa.*
