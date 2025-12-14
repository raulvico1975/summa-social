# ═══════════════════════════════════════════════════════════════════════════════
# SUMMA SOCIAL - REFERÈNCIA COMPLETA DEL PROJECTE
# Versió 1.8 - Desembre 2025
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# 0. AQUEST DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════

Aquest document és la **REFERÈNCIA MESTRA** de Summa Social.

Defineix:
- La visió del producte
- L'arquitectura funcional
- El model de dades
- Les funcionalitats existents i previstes
- Els límits i l'àmbit del producte

**Jerarquia de documents:**
- Aquest document té **PRIORITAT ABSOLUTA**
- Qualsevol altre document (guies de desenvolupament, prompts per IA, manuals d'usuari, etc.) és complementari
- En cas de conflicte entre documents, aquest text **SEMPRE** té prioritat
- Cap LLM ni desenvolupador pot contradir el que està escrit aquí

**Quan usar aquest document:**
- Per entendre què fa i què NO fa Summa Social
- Per prendre decisions de producte
- Per validar si una nova funcionalitat encaixa amb la visió
- Per donar context a qualsevol IA que treballi amb el projecte

**Estructura de la documentació:**
```
/docs
├── SUMMA-SOCIAL-REFERENCIA-COMPLETA.md   # Aquest document (mestre)
├── CHANGELOG.md                           # Historial de canvis detallat
├── manual-usuari-summa-social.md          # Per a usuaris finals
└── CATALEG-FUNCIONALITATS.md              # Referència ràpida de funcionalitats
```

# ═══════════════════════════════════════════════════════════════════════════════
# 1. INFORMACIÓ GENERAL
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 Què és Summa Social?

Summa Social és una aplicació web de gestió financera dissenyada específicament per a petites i mitjanes ONGs i entitats sense ànim de lucre d'Espanya. L'aplicació substitueix els fulls de càlcul (Excel/Google Sheets) per una eina intel·ligent i centralitzada.

## 1.2 Problema que Resol

Les ONGs espanyoles gestionen les seves finances amb fulls de càlcul, cosa que provoca:
- Errors humans en la categorització de moviments
- Dificultat per generar informes fiscals obligatoris (Model 182, Model 347)
- Impossibilitat de tenir una visió consolidada de les finances
- Pèrdua de temps en tasques repetitives
- Dificultats per fer seguiment de donants i proveïdors
- Problemes per emetre certificats de donació
- Conciliació bancària manual i propensa a errors

## 1.3 Solució

Eina centralitzada amb:
- Importació automàtica d'extractes bancaris (CSV/XLSX)
- Categorització intel·ligent amb IA (Gemini)
- Auto-assignació de contactes als moviments
- Generació automàtica d'informes fiscals (Excel per gestoria)
- Certificats de donació PDF amb firma digitalitzada
- Dashboard amb mètriques en temps real
- Multi-organització amb sistema de rols
- Divisor de remeses amb matching intel·ligent

## 1.4 URLs i Recursos

| Recurs | URL |
|--------|-----|
| **Producció** | https://summasocial.app |
| **Hosting Firebase** | https://studio--summa-social.us-central1.hosted.app |
| **Repositori** | https://github.com/raulvico1975/summa-social |
| **Entorn desenvolupament** | VS Code + Claude Code |

## 1.5 Stack Tecnològic

| Component | Tecnologia | Versió |
|-----------|------------|--------|
| Frontend | Next.js (App Router) | 14.x |
| Llenguatge | TypeScript | 5.x |
| UI Components | shadcn/ui | - |
| Estils | Tailwind CSS | 3.x |
| Base de dades | Firebase Firestore | - |
| Autenticació | Firebase Auth | - |
| Emmagatzematge | Firebase Storage | - |
| IA | Genkit + Google Gemini | - |
| Idiomes | Català i Espanyol | i18n |
| Excel/CSV | SheetJS (xlsx) | - |
| PDF | jsPDF | - |

## 1.6 Sobre l'Usuari Desenvolupador

- **Nom**: Raul
- **Perfil**: NO programador - Assessor d'ONGs que porta els comptes de diverses entitats
- **Entorn**: VS Code + Claude Code
- **Necessitats**: Codi COMPLET (mai fragments), passos verificables, respostes en CATALÀ

## 1.7 Prioritats Estratègiques 2025-2026

Per a les properes versions, Summa Social se centra en **dos blocs principals**:

### Bloc 1: Conciliació Bancària Real

| Funcionalitat | Descripció | Estat |
|---------------|------------|-------|
| **Saldos per compte** | Saldo inicial, moviments, saldo final per compte bancari | 🔲 Pendent |
| **Detecció desquadraments** | Alertes quan el saldo calculat no coincideix amb l'extracte | 🔲 Pendent |
| **Regles deterministes** | Categorització automàtica per patrons de text | 🔲 Pendent |
| **Memòria de classificació** | Reutilitzar decisions prèvies | 🔲 Pendent |
| **Detecció d'anomalies** | Duplicats, moviments sense contacte, imports inusuals | 🔲 Pendent |

### Bloc 2: Fiscalitat Fina Orientada a Gestoria

| Funcionalitat | Descripció | Estat |
|---------------|------------|-------|
| **Validació estricta NIF/CIF** | Algorisme oficial, no permetre dades invàlides | 🔲 Pendent |
| **Dades mínimes obligatòries** | CP i adreça per Model 182 | ✅ Implementat |
| **Consolidació anual** | Import total per donant/proveïdor amb devolucions aplicades | ✅ Implementat |
| **Checklist pre-informe** | Llista d'errors a corregir abans de generar 182/347 | 🔲 Pendent |
| **Excel net per gestoria** | Format estàndard Model 182 amb recurrència | ✅ Implementat v1.7 |

### Criteri de Priorització

> ⚠️ **Qualsevol nova funcionalitat s'ha de valorar segons si contribueix a aquests dos objectius.**
>
> Si una funcionalitat no millora la conciliació bancària ni la preparació fiscal, **NO és prioritària**.


## 1.8 Millores Transversals

A més dels dos blocs prioritaris, Summa Social incorpora un conjunt de **millores transversals** que són sempre admissibles i prioritzables.

> ✅ Aquestes línies de millora es poden implementar en **qualsevol moment**, sense necessitat d'avaluació estratègica addicional.

### 1.8.1 Millores de Robustesa
- Correcció d'errors o comportaments inesperats
- Validacions addicionals per evitar dades incompletes
- Maneig d'errors més predictible i informatiu

### 1.8.2 Millores de Rendiment
- Optimització de consultes i paginació a Firestore
- Reducció de renders innecessaris en components React
- Simplificació de fluxos intensius en memòria o càlcul

### 1.8.3 Millores de Seguretat
- Reforç de la protecció de dades sensibles
- Validació estricta de l'input de l'usuari
- Millora i revisió del sistema de permisos i rols

### 1.8.4 Millores d'Experiència d'Usuari (UX/UI)
- Simplificació d'interfícies o formularis sense alterar funcionalitats
- Clarificació de textos, etiquetes i missatges
- Reducció de passos innecessaris en fluxos d'ús actuals

### 1.8.5 Millores de Mantenibilitat
- Refactors orientats a reduir complexitat o duplicació
- Reorganització de fitxers o components per guanyar llegibilitat
- Eliminació de dependències innecessàries o obsoletes

### 1.8.6 Millores de Diagnòstic i Observabilitat
- Logs més clars i estructurats
- Avisos o mecanismes per facilitar la depuració
- Indicadors interns per detectar problemes

### Principi General

> 💡 Aquestes millores són sempre compatibles amb la visió del producte i contribueixen directament a la seva estabilitat i longevitat.


# ═══════════════════════════════════════════════════════════════════════════════
# 2. ARQUITECTURA TÈCNICA
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Estructura de Fitxers

```
/src
  /app                          → Pàgines (Next.js App Router)
    /[orgSlug]                   → Rutes per organització
      /dashboard
        /page.tsx                → Dashboard principal
        /movimientos             → Gestió de transaccions
        /donantes                → Gestió de donants
        /proveedores             → Gestió de proveïdors
        /trabajadores            → Gestió de treballadors
        /ejes-de-actuacion       → Gestió de projectes/eixos
        /informes                → Informes fiscals (182, 347)
          /certificats           → Certificats de donació
        /configuracion           → Configuració de l'organització
      /login                     → Login per organització
    /admin                       → Panel SuperAdmin global
  /components                    → Components React reutilitzables
    /ui                          → Components shadcn/ui
    donor-manager.tsx            → Gestió de donants
    donor-importer.tsx           → Importador massiu de donants
    supplier-manager.tsx         → Gestió de proveïdors
    supplier-importer.tsx        → Importador massiu de proveïdors
    transaction-table.tsx        → Taula de moviments
    transaction-importer.tsx     → Importador d'extractes
    remittance-splitter.tsx      → Divisor de remeses
    donations-report-generator.tsx → Generador Model 182
    donation-certificate-generator.tsx → Generador certificats
    dashboard-*.tsx              → Components del dashboard
  /firebase                      → Configuració i hooks de Firebase
  /hooks                         → Hooks personalitzats de React
  /lib                           → Utilitats, tipus i dades
    /data.ts                     → Definicions de tipus (Donor, Supplier, etc.)
  /i18n                          → Traduccions
    /ca.ts                       → Català
    /es.ts                       → Espanyol
  /ai                            → Fluxos de Genkit (IA)
```

## 2.2 Model de Dades Firestore

```
organizations/
  └── {orgId}/
      │
      ├── name: string                    # Nom de l'organització
      ├── taxId: string                   # CIF de l'entitat
      ├── slug: string                    # Identificador URL únic
      ├── address: string                 # Adreça fiscal
      ├── city: string                    # Ciutat
      ├── zipCode: string                 # Codi postal
      ├── phone: string                   # Telèfon
      ├── email: string                   # Email de contacte
      ├── website: string                 # Pàgina web
      ├── logoUrl: string | null          # URL del logo
      ├── signatureUrl: string | null     # URL de la firma digitalitzada
      ├── signerName: string | null       # Nom del signant
      ├── signerRole: string | null       # Càrrec del signant
      │
      ├── settings/
      │   └── preferences/
      │       └── contactAlertThreshold: number
      │
      ├── members/
      │   └── {userId}/
      │       ├── role: "superadmin" | "admin" | "user" | "viewer"
      │       ├── email: string
      │       └── displayName: string
      │
      ├── transactions/
      │   └── {transactionId}/
      │       ├── date: string                    # Data (YYYY-MM-DD)
      │       ├── description: string             # Concepte bancari
      │       ├── amount: number                  # Import (+ ingrés, - despesa)
      │       ├── category: string | null         # ID de categoria
      │       ├── categoryName: string | null     # Nom (desnormalitzat)
      │       ├── emisorId: string | null         # ID del contacte
      │       ├── emisorName: string | null       # Nom (desnormalitzat)
      │       ├── projectId: string | null        # ID del projecte
      │       ├── projectName: string | null      # Nom (desnormalitzat)
      │       ├── documentUrl: string | null      # URL document adjunt
      │       ├── notes: string | null            # Notes internes
      │       ├── isCounterpartTransfer: boolean  # Transferència a contrapart?
      │       ├── transactionType: string | null  # 'return' si és devolució
      │       ├── donationStatus: string | null   # 'returned' si marcada
      │       │
      │       # Camps de remeses (NOU v1.8):
      │       ├── isRemittance: boolean | null    # És una remesa agrupada?
      │       ├── remittanceItemCount: number | null  # Nombre de quotes
      │       ├── source: 'bank' | 'remittance' | 'manual' | null  # Origen
      │       ├── parentTransactionId: string | null  # ID remesa pare
      │       │
      │       ├── createdAt: timestamp
      │       └── updatedAt: timestamp
      │
      ├── categories/
      │   └── {categoryId}/
      │       ├── name: string
      │       ├── type: "income" | "expense"
      │       └── order: number
      │
      ├── emissors/
      │   └── {emisorId}/
      │       ├── name: string                    # Nom del contacte
      │       ├── taxId: string                   # NIF/CIF
      │       ├── zipCode: string                 # Codi postal
      │       ├── address: string                 # Adreça (carrer, número)
      │       ├── city: string                    # Ciutat (NOU v1.7)
      │       ├── province: string                # Província (NOU v1.7)
      │       ├── email: string                   # Email
      │       ├── phone: string                   # Telèfon
      │       ├── iban: string                    # IBAN
      │       ├── type: "donor" | "supplier" | "employee"
      │       │
      │       # Camps específics per DONANTS:
      │       ├── donorType: "individual" | "company"
      │       ├── membershipType: "one-time" | "recurring"
      │       ├── monthlyAmount: number           # Quota mensual
      │       ├── memberSince: string             # Data alta soci
      │       ├── status: "active" | "inactive"   # Estat (ACTUALITZAT v1.8)
      │       ├── inactiveSince: string | null    # Data de baixa (NOU v1.8)
      │       ├── returnCount: number             # Comptador devolucions
      │       ├── lastReturnDate: string          # Última devolució
      │       │
      │       # Camps comuns:
      │       ├── defaultCategoryId: string | null
      │       ├── notes: string
      │       ├── createdAt: timestamp
      │       └── updatedAt: timestamp
      │
      └── projects/
          └── {projectId}/
              ├── name: string
              ├── description: string
              ├── funderId: string | null
              ├── isActive: boolean
              ├── createdAt: timestamp
              └── updatedAt: timestamp
```

## 2.3 Sistema d'Autenticació i Rols

### Rols disponibles

| Rol | Descripció | Permisos |
|-----|------------|----------|
| **SuperAdmin** | Creador de l'organització | Tot + Zona de Perill |
| **Admin** | Administrador | Tot excepte Zona de Perill |
| **User** | Usuari estàndard | Crear i editar, no eliminar ni configurar |
| **Viewer** | Només lectura | Veure dades, no modificar |

### Permisos detallats

| Acció | SuperAdmin | Admin | User | Viewer |
|-------|------------|-------|------|--------|
| Veure dashboard | ✅ | ✅ | ✅ | ✅ |
| Veure moviments | ✅ | ✅ | ✅ | ✅ |
| Crear moviments | ✅ | ✅ | ✅ | ❌ |
| Editar moviments | ✅ | ✅ | ✅ | ❌ |
| Eliminar moviments | ✅ | ✅ | ❌ | ❌ |
| Importar extractes | ✅ | ✅ | ✅ | ❌ |
| Gestionar contactes | ✅ | ✅ | ✅ | ❌ |
| Gestionar categories | ✅ | ✅ | ❌ | ❌ |
| Gestionar membres | ✅ | ✅ | ❌ | ❌ |
| Configurar organització | ✅ | ✅ | ❌ | ❌ |
| Generar informes | ✅ | ✅ | ✅ | ✅ |
| Zona de Perill | ✅ | ❌ | ❌ | ❌ |

### Persistència de sessió

- **Tipus**: `browserSessionPersistence`
- La sessió caduca automàticament en tancar el navegador
- Implementat a v1.7 per seguretat

## 2.4 Multi-Organització

- Cada usuari pot pertànyer a múltiples organitzacions
- Les dades estan completament aïllades entre organitzacions
- L'URL inclou el slug de l'organització: `/[orgSlug]/dashboard/...`
- Un usuari pot tenir rols diferents a cada organització
- Sistema centralitzat de slugs per evitar duplicats


# ═══════════════════════════════════════════════════════════════════════════════
# 3. FUNCIONALITATS DETALLADES
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 DASHBOARD

### 3.1.1 Bloc Celebracions
Apareix quan hi ha fites positives:
- ✅ "Totes les transaccions categoritzades"
- 📈 "Balanç positiu"
- ❤️ "X donants han contribuït"
- 🎯 "Tot al dia, bona feina!"
- 🎁 "Primera donació del mes"

### 3.1.2 Targetes Principals (StatCards)

| Targeta | Càlcul |
|---------|--------|
| **Ingressos** | Suma moviments amount > 0 |
| **Despeses operatives** | Suma amount < 0 EXCLOENT contraparts |
| **Balanç operatiu** | Ingressos - Despeses operatives |
| **Transferències a contraparts** | Suma isCounterpartTransfer = true |

### 3.1.3 Bloc Donacions i Socis

| Mètrica | Comparativa |
|---------|-------------|
| Donacions | vs any anterior |
| Donants actius | vs any anterior |
| Socis actius | vs any anterior |
| Quotes socis | vs any anterior |

### 3.1.4 Bloc Obligacions Fiscals

| Obligació | Data límit | Acció |
|-----------|------------|-------|
| Model 182 | 31 gener | Botó "Preparar" |
| Model 347 | 28 febrer | Botó "Preparar" |

### 3.1.5 Bloc Alertes

| Alerta | Descripció |
|--------|------------|
| X moviments sense categoritzar | Transaccions pendents |
| X donants amb dades incompletes | Sense NIF o CP |
| X moviments sense contacte | Per sobre del llindar |

### 3.1.6 Filtre de Dates
- Any complet
- Trimestre
- Mes
- Personalitzat
- Tot


## 3.2 GESTIÓ DE MOVIMENTS

### 3.2.1 Importació d'Extractes Bancaris

**Formats suportats:**
- CSV (detecció automàtica de separador)
- XLSX / XLS (Excel)

**Procés:**
1. Pujar fitxer (drag & drop o selecció)
2. Detecció automàtica de columnes
3. Vista prèvia
4. Detecció de duplicats
5. Importació amb auto-assignació

### 3.2.2 Sistema d'Auto-Assignació Intel·ligent

**FASE 1: Matching per Nom (instantani)**
- Cerca el nom de cada contacte a la descripció
- ~70% dels moviments assignats automàticament

**FASE 2: IA amb Gemini (si cal)**
- Envia descripció a Gemini
- Suggereix contacte més probable
- ~16% addicional

**Aplicació de Categoria per Defecte:**
- Si contacte té defaultCategoryId → s'aplica automàticament

### 3.2.3 Taula de Moviments

| Columna | Editable |
|---------|----------|
| Data | ✅ |
| Descripció | ✅ |
| Import | ✅ |
| Categoria | ✅ (selector amb cerca) |
| Contacte | ✅ (selector amb cerca) |
| Projecte | ✅ |
| Document | ✅ (upload) |
| Nota | ✅ |

### 3.2.4 Filtres
- Per data (any, trimestre, mes, personalitzat)
- Per categoria
- Per contacte
- Per projecte
- Sense categoritzar
- Sense contacte


## 3.3 DIVISOR DE REMESES (ACTUALITZAT v1.8)

### 3.3.1 Què és una Remesa?
Agrupació de múltiples quotes de socis en un únic ingrés bancari.

### 3.3.2 Formats suportats
- **CSV** amb detecció de separador
- **XLSX / XLS** (Excel)
- Detecció automàtica de fila inicial de dades

### 3.3.3 Procés de Divisió

1. **Seleccionar remesa** → Menú ⋮ → "Dividir remesa"
2. **Pujar detall** → Fitxer CSV o Excel del banc
3. **Mapejat columnes**:
   - 🟢 Import
   - 🔵 Nom
   - 🟣 DNI/CIF
   - 🔷 IBAN
4. **Matching de socis** (prioritat):
   - Per DNI/CIF (màxima)
   - Per IBAN (alta)
   - Per Nom (mitjana)
5. **Detecció de socis de baixa** (NOU v1.8):
   - Avís visual si es detecten socis marcats com "baixa"
   - Opció de reactivar individualment o tots alhora
6. **Processar**

### 3.3.4 Vista Agrupada de Remeses (NOU v1.8)

- La remesa processada queda com **1 sola línia** al llistat de moviments
- Badge amb comptador de quotes: "👁 303"
- **Filtre**: "Ocultar desglose de remesas" (activat per defecte)
- **Modal de detall**: Clicar el badge obre una modal amb:
  - Llista de totes les quotes individuals
  - Cerca per nom o DNI
  - Link directe al donant (clicar nom)
  - Resum del donant (hover)

### 3.3.5 Model de Dades de Remeses (NOU v1.8)

**Transacció pare (remesa):**
```
isRemittance: true
remittanceItemCount: 303
```

**Transaccions filles (quotes):**
```
source: 'remittance'
parentTransactionId: '{id_remesa}'
```

### 3.3.6 Guardar Configuració
Es pot guardar el mapejat per banc (Triodos, La Caixa, Santander, etc.)


## 3.4 GESTIÓ DE CONTACTES

### 3.4.1 Tipus de Contactes

| Tipus | Subtipus |
|-------|----------|
| **Donants** | Particular, Empresa |
| **Proveïdors** | Per categoria |
| **Treballadors** | - |

### 3.4.2 Donants - Camps (ACTUALITZAT v1.8)

| Camp | Obligatori | Model 182 |
|------|------------|-----------|
| Nom | ✅ | ✅ |
| NIF/DNI | ⚠️ | ✅ Obligatori |
| Codi postal | ⚠️ | ✅ Obligatori |
| Ciutat | ❌ | ❌ |
| Província | ❌ | ❌ |
| Adreça | ❌ | ❌ |
| Tipus (Particular/Empresa) | ✅ | ✅ NATURALEZA |
| Modalitat (Puntual/Soci) | ✅ | ❌ |
| **Estat (Actiu/Baixa)** | ❌ | ❌ | NOU v1.8 |
| **Data de baixa** | ❌ | ❌ | NOU v1.8 |
| Quota mensual | ❌ | ❌ |
| IBAN | ❌ | ❌ |
| Email | ❌ | ❌ |
| Telèfon | ❌ | ❌ |
| Categoria per defecte | ❌ | ❌ |

### 3.4.2.1 Gestió d'Estat Actiu/Baixa (NOU v1.8)

- **Filtre per estat**: Per defecte es mostren només actius
- **Badge visual**: Els donants de baixa mostren badge "Baixa"
- **Reactivar**: Botó per tornar a donar d'alta un soci
- **Edició**: Es pot canviar l'estat des del formulari d'edició
- **Importador**: Detecta columna "Estado/Estat" automàticament

### 3.4.3 Importador de Donants (ACTUALITZAT v1.8)

**Columnes detectades automàticament:**

| Camp | Patrons de detecció |
|------|---------------------|
| Nom | nom, nombre, name |
| DNI/CIF | dni, nif, cif, taxid, documento |
| Codi postal | cp, codipostal, codigopostal, zipcode |
| Ciutat | ciudad, ciutat, city, localidad, población |
| Província | provincia, province, comunidad, región |
| Adreça | direccion, adreça, address, domicilio, calle |
| Tipus | tipus, tipo, type, persona |
| Modalitat | modalitat, modalidad, membership, soci |
| **Estat** | estado, estat, status, activo, baja, baixa | NOU v1.8 |
| Import | import, importe, quota, cuota, amount |
| IBAN | iban, compte, cuenta, banc |
| Email | email, correu, correo, mail |
| Telèfon | telefon, telefono, phone |
| Categoria | categoria, category |

**Funcionalitat "Actualitzar existents" (NOU v1.8):**

- Checkbox opcional a la previsualització
- Si un DNI ja existeix i el checkbox està activat → Actualitza en lloc d'ometre
- Camps actualitzables: status, zipCode, address, email, phone, iban, membershipType, donorType
- NO actualitza: name, taxId, createdAt (per seguretat)

### 3.4.4 Proveïdors - Camps

| Camp | Obligatori | Model 347 |
|------|------------|-----------|
| Nom | ✅ | ✅ |
| NIF/CIF | ⚠️ | ✅ Obligatori |
| Categoria per defecte | ❌ | ❌ |
| Adreça | ❌ | ❌ |
| IBAN | ❌ | ❌ |

### 3.4.5 DonorDetailDrawer

Panel lateral que s'obre clicant el nom d'un donant:
- Informació completa del donant
- Historial de donacions (paginat)
- Resum per any
- Generació de certificats


## 3.5 PROJECTES / EIXOS D'ACTUACIÓ

| Camp | Obligatori |
|------|------------|
| Nom | ✅ |
| Descripció | ❌ |
| Finançador | ❌ |
| Actiu | ✅ |

Estadístiques per projecte:
- Total ingressos
- Total despeses
- Balanç


## 3.6 INFORMES FISCALS

### 3.6.1 Model 182 - Declaració de Donacions (ACTUALITZAT v1.7)

**Data límit:** 31 de gener

**Exportació Excel per Gestoria:**

| Columna | Valor | Font |
|---------|-------|------|
| NIF | DNI/CIF | donor.taxId |
| NOMBRE | Nom complet | donor.name |
| CLAVE | "A" | Fix (dinerari Llei 49/2002) |
| PROVINCIA | Codi 2 dígits | donor.zipCode.substring(0,2) |
| PORCENTAJE | *(buit)* | Gestoria ho calcula |
| VALOR | Import any actual | Suma donacions - devolucions |
| VALOR_1 | Import any -1 | Històric |
| VALOR_2 | Import any -2 | Històric |
| RECURRENTE | "X" o buit | Si VALOR_1 > 0 AND VALOR_2 > 0 |
| NATURALEZA | "F" o "J" | individual → F, company → J |

**Gestió de devolucions:**
- `transactionType === 'return'` → Es resta automàticament
- `donationStatus === 'returned'` → Es resta automàticament

**Fitxer generat:** `Model182_{org}_{any}.xlsx`

### 3.6.2 Model 347 - Operacions amb Tercers

**Data límit:** 28 de febrer

**Llindar:** > 3.005,06€ anuals per proveïdor

**Exportació:** CSV amb NIF, Nom, Import total

### 3.6.3 Certificats de Donació

**Tipus:**
- Individual (per donació)
- Anual (totes les donacions d'un any)
- Massiu (ZIP amb tots)

**Format PDF:**
- Logo de l'organització
- Firma digitalitzada
- Text legal Llei 49/2002


## 3.7 CONFIGURACIÓ

### 3.7.1 Dades de l'Organització
Nom, CIF, adreça, ciutat, CP, telèfon, email, web, logo

### 3.7.2 Configuració de Certificats
Firma digitalitzada, nom signant, càrrec

### 3.7.3 Preferències
Llindar alertes contacte: 0€, 50€, 100€, 500€

### 3.7.4 Categories Comptables
Categories d'ingressos i despeses personalitzables

### 3.7.5 Gestió de Membres
Convidar, canviar rol, eliminar

### 3.7.6 Zona de Perill (SuperAdmin) (ACTUALITZAT v1.8)

Accions irreversibles només per SuperAdmin:

| Acció | Descripció |
|-------|------------|
| Esborrar tots els donants | Elimina tots els donants de l'organització |
| Esborrar tots els proveïdors | Elimina tots els proveïdors |
| Esborrar tots els treballadors | Elimina tots els treballadors |
| Esborrar tots els moviments | Elimina totes les transaccions |
| **Esborrar última remesa** (NOU v1.8) | Esborra les transaccions filles i restaura la remesa original |

**Esborrar última remesa:**
- Busca l'última remesa processada (isRemittance === true)
- Mostra info: data, concepte, import, nombre de quotes
- Demana confirmació escrivint "BORRAR"
- Esborra totes les transaccions filles
- Restaura la transacció original per tornar-la a processar


# ═══════════════════════════════════════════════════════════════════════════════
# 4. FORMATS D'IMPORTACIÓ I EXPORTACIÓ
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 Importació d'Extractes Bancaris

| Format | Extensions | Detecció |
|--------|------------|----------|
| CSV | .csv, .txt | Separador auto (;,\t) |
| Excel | .xlsx, .xls | SheetJS |

**Columnes detectades:** Data, Concepte/Descripció, Import/Quantitat

## 4.2 Importació de Donants

| Format | Extensions |
|--------|------------|
| Excel | .xlsx, .xls |
| CSV | .csv |

**Columnes:** Veure secció 3.4.3

## 4.3 Importació de Proveïdors

| Format | Extensions |
|--------|------------|
| Excel | .xlsx, .xls |
| CSV | .csv |

## 4.4 Divisor de Remeses

| Format | Extensions | NOU v1.7 |
|--------|------------|----------|
| CSV | .csv, .txt | ✅ |
| Excel | .xlsx, .xls | ✅ |

## 4.5 Exportacions

| Informe | Format | Nom fitxer |
|---------|--------|------------|
| Model 182 | Excel (.xlsx) | Model182_{org}_{any}.xlsx |
| Model 347 | CSV | Model347_{org}_{any}.csv |
| Certificats | PDF / ZIP | certificat_{donant}_{any}.pdf |


# ═══════════════════════════════════════════════════════════════════════════════
# 5. CAMPS REQUERITS PER INFORME FISCAL
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 Model 182 - Donants

| Camp Summa Social | Camp Model 182 | Obligatori |
|-------------------|----------------|------------|
| taxId | NIF DECLARADO | ✅ |
| name | APELLIDOS Y NOMBRE | ✅ |
| zipCode (2 primers) | PROVINCIA | ✅ |
| donorType | NATURALEZA (F/J) | ✅ |
| - | CLAVE | ✅ (fix "A") |
| Suma transaccions | VALOR | ✅ |
| Suma any -1 | VALOR_1 | ❌ |
| Suma any -2 | VALOR_2 | ❌ |
| Històric | RECURRENTE | ❌ |

## 5.2 Model 347 - Proveïdors

| Camp Summa Social | Camp Model 347 | Obligatori |
|-------------------|----------------|------------|
| taxId | NIF | ✅ |
| name | NOMBRE/RAZON SOCIAL | ✅ |
| Suma transaccions | IMPORTE | ✅ |

## 5.3 Certificats de Donació

| Camp | Obligatori |
|------|------------|
| Nom donant | ✅ |
| NIF donant | ✅ |
| Import | ✅ |
| Data | ✅ |
| Nom organització | ✅ |
| CIF organització | ✅ |
| Nom signant | ✅ |
| Càrrec signant | ✅ |


# ═══════════════════════════════════════════════════════════════════════════════
# 6. TERMINOLOGIA IMPORTANT
# ═══════════════════════════════════════════════════════════════════════════════

| Terme | Definició |
|-------|-----------|
| **Transferències a contraparts** | Enviaments a organitzacions sòcies internacionals |
| **Remesa** | Agrupació de quotes de socis en un únic ingrés |
| **Matching** | Assignació automàtica de contactes per coincidència |
| **Categoria per defecte** | Categoria que s'aplica automàticament |
| **Model 182** | Declaració de donatius - límit 31 gener |
| **Model 347** | Operacions amb tercers >3.005,06€ - límit 28 febrer |
| **Soci** | Donant recurrent amb quota periòdica |
| **Donant puntual** | Donant amb aportacions esporàdiques |
| **Emissor** | Terme intern per qualsevol contacte |
| **Eix d'actuació** | Sinònim de projecte |
| **Gestoria** | Professional extern que presenta models fiscals |
| **Recurrència** | Ha donat els 2 anys anteriors consecutius |


# ═══════════════════════════════════════════════════════════════════════════════
# 7. OPTIMITZACIONS TÈCNIQUES
# ═══════════════════════════════════════════════════════════════════════════════

## 7.1 Rendiment
- Memoització de contexts Firebase
- Cleanup de timeouts i subscripcions
- Límits a queries Firestore (màx 500)
- CollectionGroup queries
- AbortController per cancel·lar peticions

## 7.2 Firebase Storage
- CORS configurat per càrrega d'imatges
- Logo i firma als PDFs generats al client

## 7.3 Autenticació
- Session persistence (caduca en tancar navegador)


# ═══════════════════════════════════════════════════════════════════════════════
# 8. FLUX DE TREBALL RECOMANAT
# ═══════════════════════════════════════════════════════════════════════════════

## 8.1 Configuració Inicial

1. Configurar dades de l'organització
2. Pujar logo
3. Configurar firma i signant
4. Revisar categories
5. Importar contactes des d'Excel
6. Assignar categoria per defecte a cada contacte
7. Crear projectes/eixos

## 8.2 Dia a Dia

1. Descarregar extracte del banc (mensual)
2. Importar a Summa Social
3. Revisar alertes al Dashboard
4. Corregir moviments pendents
5. Dividir remeses si n'hi ha

## 8.3 Fi d'Any

1. Revisar donants amb dades incompletes
2. Generar Excel Model 182 (abans 31 gener)
3. Enviar a gestoria
4. Generar Model 347 (abans 28 febrer)
5. Emetre certificats als donants


# ═══════════════════════════════════════════════════════════════════════════════
# 9. SINCRONITZACIÓ I DESPLEGAMENT
# ═══════════════════════════════════════════════════════════════════════════════

## 9.1 Entorn
- IDE: VS Code
- Assistent IA: Claude Code
- Control de versions: Git + GitHub

## 9.2 Flux
```
1. Demanar canvis a Claude Code
2. Claude Code modifica fitxers
3. git add . && git commit -m "descripció"
4. git push
5. Desplegament automàtic
```

## 9.3 URLs
- Producció: https://summasocial.app
- Firebase: https://studio--summa-social.us-central1.hosted.app


# ═══════════════════════════════════════════════════════════════════════════════
# 10. ROADMAP / FUNCIONALITATS PENDENTS
# ═══════════════════════════════════════════════════════════════════════════════

## Completades recentment (v1.8)
- ✅ Estat actiu/baixa per donants
- ✅ Importador actualitza donants existents
- ✅ Vista agrupada de remeses (1 línia + modal detall)
- ✅ Detecció i reactivació de socis de baixa a remeses
- ✅ Link al donant des de modal de remesa
- ✅ Eina per esborrar última remesa (Zona Perill)

## Completades (v1.7)
- ✅ Suport Excel per divisor de remeses
- ✅ Camps city/province a l'importador de donants
- ✅ Exportació Excel Model 182 per gestoria (amb recurrència)
- ✅ Session persistence (seguretat)

## Pendents prioritàries
- 🔲 Tancaments mensuals/anuals
- 🔲 Saldos per compte bancari
- 🔲 Regles deterministes de categorització
- 🔲 Validació estricta NIF/CIF
- 🔲 Checklist pre-informe fiscal

## Pendents secundàries
- 🔲 Detecció d'anomalies (duplicats)
- 🔲 Memòria de classificació
- 🔲 Notificacions per email
- 🔲 Importació web (Stripe, altres)

## Futures (sense data)
- 🔲 Integració Open Banking
- 🔲 App mòbil


# ═══════════════════════════════════════════════════════════════════════════════
# 11. HISTORIAL DE VERSIONS
# ═══════════════════════════════════════════════════════════════════════════════

| Versió | Data | Canvis principals |
|--------|------|-------------------|
| 1.0 | Nov 2024 | Versió inicial, single-user |
| 1.5 | Nov 2024 | Multi-organització, sistema de rols |
| 1.6 | Des 2024 | DonorDetailDrawer, certificats amb firma, Zona Perill, divisor remeses |
| 1.7 | Des 2025 | Excel Model 182 per gestoria, suport Excel remeses, camps city/province, session persistence |
| **1.8** | **Des 2025** | **Gestió estat actiu/baixa donants, vista agrupada remeses, importador actualitza existents, detecció socis baixa a remeses** |


# ═══════════════════════════════════════════════════════════════════════════════
# 12. ÀMBIT I LÍMITS DEL PRODUCTE
# ═══════════════════════════════════════════════════════════════════════════════

## 12.1 Què NO Farà Summa Social (Per Disseny)

| Funcionalitat Exclosa | Motiu |
|-----------------------|-------|
| **Generació de fitxers BOE** | Les ONGs deleguen a gestories |
| **Presentació telemàtica AEAT** | Complexitat legal elevada |
| **Integració directa APIs bancàries** | Requereix certificacions |
| **Comptabilitat doble entrada** | NO és programa de comptabilitat |
| **Facturació electrònica** | Fora d'àmbit |
| **Models d'IA opacs** | Tota IA ha de ser determinista o supervisada |

## 12.2 Focus del Producte

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. GESTIONAR MOVIMENTS BANCARIS                              │
│      Importar, categoritzar, assignar contactes                │
│                                                                 │
│   2. RECONCILIAR BANC                                          │
│      Saldos, detecció d'errors, control                        │
│                                                                 │
│   3. PREPARAR FISCALITAT                                       │
│      Model 182, Model 347, certificats de donació              │
│      → Output: Excel net per enviar a la gestoria              │
│                                                                 │
│   4. ORDENAR DONANTS / PROVEÏDORS / PROJECTES                  │
│      Base de dades centralitzada i actualitzada                │
│                                                                 │
│   5. DASHBOARD PER A LA JUNTA                                  │
│      Mètriques clares per prendre decisions                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 12.3 Públic Objectiu

| Sí | No |
|----|----|
| ONGs petites i mitjanes d'Espanya | Grans ONGs amb ERP propi |
| Entitats sense ànim de lucre | Empreses amb ànim de lucre |
| Fundacions petites | Administracions públiques |
| Associacions culturals, socials | Entitats fora d'Espanya |

## 12.4 Filosofia de Desenvolupament

> **"Menys és més"**
>
> Summa Social resol **molt bé** uns problemes concrets (conciliació + fiscalitat) en lloc de resoldre **regular** molts problemes diferents.
>
> Cada funcionalitat nova ha de passar el filtre:
> - Redueix errors a l'ONG? ✅
> - Estalvia temps real? ✅
> - És mantenible per una sola persona? ✅
> - Contribueix als objectius estratègics? ✅


# ═══════════════════════════════════════════════════════════════════════════════
# 13. REGLES PER A L'ÚS DE LLMs
# ═══════════════════════════════════════════════════════════════════════════════

| # | Regla |
|---|-------|
| 1 | Cap proposta pot contradir l'Àmbit i Límits (Secció 12) |
| 2 | No modificar l'esquema Firestore existent |
| 3 | No eliminar ni renomenar camps |
| 4 | Només afegir camps opcionals si és imprescindible |
| 5 | No afegir dependències noves sense justificació |
| 6 | Només funcions pures i codi modular |
| 7 | Prioritat per simplicitat i manteniment baix |
| 8 | No IA que "aprengui" automàticament |
| 9 | Tot alineat amb Bloc 1 (Conciliació) o Bloc 2 (Fiscalitat) |
| 10 | Millores Transversals sempre admissibles |

## 13.1 Comportament Esperat

**Quan se li demani codi:**
- Proporcionar codi COMPLET
- Indicar path del fitxer
- Incloure passos de verificació
- Respondre en CATALÀ

## 13.2 Patrons de Codi Obligatoris

### Firestore: `null` vs `undefined`

> ⚠️ **CRÍTIC**: Firestore **NO accepta `undefined`** com a valor de camp.

**MAL** (provoca error):
```typescript
const newTxData = {
  contactType: contactId ? 'donor' : undefined,  // ❌ ERROR
  projectId: transaction.projectId,               // ❌ ERROR si és undefined
};
batch.set(docRef, newTxData);
```

**BÉ** (patró correcte):
```typescript
const newTxData = {
  contactType: contactId ? 'donor' : null,        // ✅ null acceptat
  projectId: transaction.projectId ?? null,       // ✅ converteix undefined a null
};
batch.set(docRef, newTxData);
```

**Alternativa** (ometre camp si no existeix):
```typescript
const newTxData = {
  ...(contactId && { contactType: 'donor' }),     // ✅ només afegeix si existeix
  ...(transaction.projectId && { projectId: transaction.projectId }),
};
```

**Regla general**: Tots els camps opcionals han de ser `string | null`, mai `undefined`.

**Quan se li demani nova funcionalitat:**
- Validar si encaixa amb blocs estratègics
- Si no encaixa, informar i suggerir alternatives


# ═══════════════════════════════════════════════════════════════════════════════
# 14. PARAULES CLAU I INTENCIONS
# ═══════════════════════════════════════════════════════════════════════════════

| Terme | Interpretació Correcta | ⚠️ NO significa |
|-------|------------------------|-----------------|
| "Conciliació bancària" | Saldos, desquadraments, regles | Integració amb bancs |
| "Fiscalitat" | Model 182, 347, certificats, Excel | Presentació a AEAT |
| "Excel net" | Fitxer simple per gestoria | Fitxer BOE oficial |
| "Determinista" | Regla fixa, mateix resultat | IA autònoma |
| "Auto-assignació" | Matching + categoria defecte | IA sense supervisió |
| "Remesa" | Agrupació quotes socis | Qualsevol ingrés |
| "Gestoria" | Professional extern | L'ONG mateixa |


# ═══════════════════════════════════════════════════════════════════════════════
# ANNEX A — DECISIONS IRREVERSIBLES
# ═══════════════════════════════════════════════════════════════════════════════

| # | Decisió | Estat |
|---|---------|-------|
| 1 | **Base de dades**: Firestore | 🔒 TANCAT |
| 2 | **Model de dades**: Collections estables | 🔒 TANCAT |
| 3 | **Rol**: Conciliació + Fiscalitat | 🔒 TANCAT |
| 4 | **Arquitectura**: Next.js 14 + Firebase | 🔒 TANCAT |
| 5 | **IA**: Només Genkit + Gemini | 🔒 TANCAT |
| 6 | **Àmbit**: No ERP, CRM, facturació | 🔒 TANCAT |

> ⛔ **Cap LLM pot proposar:**
> - Migrar a SQL, MongoDB, Supabase
> - Canviar Next.js per altre framework
> - Afegir backend separat
> - Fine-tuning de models IA
> - Funcionalitats CRM, ERP, facturació
> - Integració directa APIs bancàries

> ✅ **Un LLM SÍ pot proposar:**
> - Millores dins l'arquitectura actual
> - Nous camps opcionals a Firestore
> - Noves subcollections si imprescindible
> - Optimitzacions de rendiment
> - Millores UX sense canviar funcionalitat


# ═══════════════════════════════════════════════════════════════════════════════
# FI DEL DOCUMENT
# Última actualització: Desembre 2025 - Versió 1.8
# ═══════════════════════════════════════════════════════════════════════════════
