# ═══════════════════════════════════════════════════════════════════════════════
# SUMMA SOCIAL - REFERÈNCIA COMPLETA DEL PROJECTE
# Versió 1.9 - Desembre 2025
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
- Gestió manual de devolucions bancàries

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
- **Importador de devolucions del banc (NOU v1.8)**
- **Importador de donacions Stripe (NOU v1.9)**

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
| **Gestió de devolucions** | Importador de fitxers del banc, remeses parcials | ✅ Implementat v1.8 |

### Bloc 2: Fiscalitat Fina Orientada a Gestoria

| Funcionalitat | Descripció | Estat |
|---------------|------------|-------|
| **Validació estricta NIF/CIF** | Algorisme oficial, no permetre dades invàlides | 🔲 Pendent |
| **Dades mínimes obligatòries** | CP i adreça per Model 182 | ✅ Implementat |
| **Consolidació anual** | Import total per donant/proveïdor amb devolucions aplicades | ✅ Implementat |
| **Checklist pre-informe** | Llista d'errors a corregir abans de generar 182/347 | 🔲 Pendent |
| **Excel net per gestoria** | Format estàndard Model 182 amb recurrència | ✅ Implementat v1.7 |
| **Importador Stripe** | Dividir remeses Stripe amb traçabilitat completa (donacions + comissions) | ✅ Implementat v1.9 |

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
    /return-importer             → Importador de devolucions (NOU v1.8)
      useReturnImporter.ts       → Hook amb lògica de matching
      ReturnImporter.tsx         → Modal UI de l'importador
      index.ts                   → Exports
    /stripe-importer             → Importador de donacions Stripe (NOU v1.9)
      useStripeImporter.ts       → Hook amb lògica de parsing i matching
      StripeImporter.tsx         → Modal UI de l'importador
      index.ts                   → Exports
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
    /__tests__                   → Tests unitaris (NOU v1.8)
      normalize.test.ts          → 35 tests
      auto-match.test.ts         → 24 tests
      model182.test.ts           → 18 tests
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
      │       ├── contactId: string | null        # ID contacte (alias emisorId)
      │       ├── contactType: string | null      # 'donor' | 'supplier' | 'employee'
      │       ├── contactName: string | null      # Nom contacte (desnormalitzat)
      │       ├── projectId: string | null        # ID del projecte
      │       ├── projectName: string | null      # Nom (desnormalitzat)
      │       ├── documentUrl: string | null      # URL document adjunt
      │       ├── notes: string | null            # Notes internes
      │       ├── isCounterpartTransfer: boolean  # Transferència a contrapart?
      │       ├── transactionType: string | null  # 'return' si és devolució
      │       ├── donationStatus: string | null   # 'returned' si marcada
      │       │
      │       # Camps de remeses:
      │       ├── isRemittance: boolean | null    # És una remesa agrupada?
      │       ├── remittanceItemCount: number | null  # Nombre total de quotes
      │       ├── source: 'bank' | 'remittance' | 'manual' | 'stripe' | null  # Origen
      │       ├── parentTransactionId: string | null  # ID remesa pare
      │       │
      │       # Camps de remeses de devolucions (NOU v1.8):
      │       ├── remittanceType: 'returns' | null    # Tipus de remesa
      │       ├── remittanceStatus: 'complete' | 'partial' | 'pending' | null
      │       ├── remittanceResolvedCount: number | null   # Filles creades
      │       ├── remittancePendingCount: number | null    # Pendents d'identificar
      │       ├── remittancePendingTotalAmount: number | null  # Import pendent €
      │       │
      │       # Camps de donacions Stripe (NOU v1.9):
      │       ├── stripePaymentId: string | null      # ID pagament (ch_xxx)
      │       ├── stripeTransferId: string | null     # ID payout (po_xxx)
      │       ├── transactionType: 'donation' | 'fee' | 'return' | null  # Tipus específic
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
      ├── emissors/  (també anomenats "contacts")
      │   └── {emisorId}/
      │       ├── name: string                    # Nom del contacte
      │       ├── taxId: string                   # NIF/CIF
      │       ├── zipCode: string                 # Codi postal
      │       ├── address: string                 # Adreça (carrer, número)
      │       ├── city: string                    # Ciutat
      │       ├── province: string                # Província
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
      │       ├── status: "active" | "inactive"   # Estat
      │       ├── inactiveSince: string | null    # Data de baixa
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

## 2.5 Tests Unitaris (NOU v1.8)

**77 tests unitaris** per funcions pures:

| Fitxer | Tests | Cobertura |
|--------|-------|-----------|
| `normalize.test.ts` | 35 | normalizeTaxId, normalizeIBAN, normalizeZipCode, formatNumberEU, parseNumberEU |
| `auto-match.test.ts` | 24 | normalizeForMatching, extractNameTokens, findMatchingContact |
| `model182.test.ts` | 18 | calculateModel182Totals, calculateTransactionNetAmount, isReturnTransaction |

**Hook pre-commit (Husky):** Els tests s'executen automàticament abans de cada commit.


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
| **X devolucions pendents** (NOU v1.8) | Devolucions sense assignar |

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
- **Devolucions pendents** (NOU v1.8)

### 3.2.5 Banner de Devolucions Pendents (NOU v1.8)

Quan hi ha devolucions sense assignar, apareix un banner vermell:

> ⚠️ Hi ha devolucions pendents d'assignar [Revisar]

El botó "Revisar" filtra la taula per mostrar només devolucions pendents.


## 3.3 DIVISOR DE REMESES (INGRESSOS)

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
5. **Detecció de socis de baixa**:
   - Avís visual si es detecten socis marcats com "baixa"
   - Opció de reactivar individualment o tots alhora
6. **Processar**

### 3.3.4 Vista Agrupada de Remeses

- La remesa processada queda com **1 sola línia** al llistat de moviments
- Badge amb comptador de quotes: "👁 303"
- **Filtre**: "Ocultar desglose de remesas" (activat per defecte)
- **Modal de detall**: Clicar el badge obre una modal amb:
  - Llista de totes les quotes individuals
  - Cerca per nom o DNI
  - Link directe al donant (clicar nom)
  - Resum del donant (hover)

### 3.3.5 Model de Dades de Remeses (Ingressos)

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


## 3.4 GESTIÓ DE DEVOLUCIONS (NOU v1.8)

### 3.4.1 Visió general

Les devolucions bancàries (rebuts retornats) es gestionen sense modificar el moviment bancari original.

| Mètode | Quan usar-lo |
|--------|--------------|
| **Assignació manual** | Devolucions individuals, una a una |
| **Importador de fitxer** | Devolucions massives o agrupades |

**Principi fonamental:** El moviment bancari original MAI es modifica ni s'esborra.

### 3.4.2 Assignació manual

1. Ves a **Moviments** → Banner "Devolucions pendents" → **Revisar**
2. Per cada devolució: botó **"Assignar donant"**
3. Cerca per nom, DNI, IBAN o email
4. Confirma l'assignació

### 3.4.3 Importador de fitxer del banc

#### Ubicació
- Moviments → Fila de devolució → Icona 📄 (pujar fitxer)
- O des del filtre "Devolucions pendents"

#### Bancs suportats

| Banc | Format | Particularitat |
|------|--------|----------------|
| Santander | XLSX | Data global a capçalera, agrupa per fitxer |
| Triodos | CSV/XLS | Data per línia, agrupa per dia |
| Altres | CSV/XLSX | Detecció automàtica columnes |

#### Flux tècnic

```
1. PARSEJAR FITXER → Extreure IBAN, Import, Data, Nom
2. NORMALITZAR → Imports positius, dateConfidence (line/file/none)
3. MATCHING DONANTS → IBAN → DNI → Nom exacte (sense tocar transaccions)
4. DETECTAR AGRUPACIONS → Suma = moviment bancari (±0.02€, ±5 dies)
5. MATCHING INDIVIDUAL → Només per les NO agrupades
6. PROCESSAR → Crear filles, marcar pare, actualitzar donants
```

#### Matching de donants

| Prioritat | Criteri | Normalització |
|-----------|---------|---------------|
| 1 | IBAN | Sense espais, majúscules |
| 2 | DNI/NIF | Sense guions, majúscules |
| 3 | Nom | Sense accents, minúscules, exacte |

**NO es fa matching aproximat ni fuzzy.**

#### Detecció automàtica de columnes

| Camp | Patrons detectats |
|------|-------------------|
| IBAN | cuenta de adeudo, cuenta destino, iban, account |
| Import | importe, cantidad, amount, monto |
| Data | fecha de liquidación, fecha rechazo, date |
| DNI | referencia externa, dni, nif |
| Nom | nombre cliente, nombre, titular |
| Motiu | motivo devolución, motivo, reason |

### 3.4.4 Devolucions agrupades (remeses)

Alguns bancs agrupen múltiples devolucions en un sol moviment:

```
Extracte bancari:  -55,00€ "DEVOLUCION RECIBOS"
Fitxer detall:     10€ + 20€ + 15€ + 10€ = 55€
```

#### Comportament

1. El moviment original (-55€) es marca com a "remesa pare"
2. Es creen transaccions filles per cada devolució identificada
3. El pare manté `amount`, `date`, `description` intactes

#### Model de dades (Remeses de devolucions)

**Transacció pare:**
```typescript
isRemittance: true
remittanceType: 'returns'
remittanceStatus: 'complete' | 'partial' | 'pending'
remittanceItemCount: number           // Total devolucions
remittanceResolvedCount: number       // Amb donant
remittancePendingCount: number        // Sense donant
remittancePendingTotalAmount: number  // Suma pendents €
// contactId: null (MAI s'assigna al pare)
```

**Transaccions filles:**
```typescript
source: 'remittance'
parentTransactionId: string    // ID del pare
transactionType: 'return'
amount: number                 // Negatiu
contactId: string              // ID donant
contactType: 'donor'
contactName: string            // Nom (desnormalitzat)
```

### 3.4.5 Remeses parcials

Si algunes devolucions no es poden identificar:

| Element | Estat |
|---------|-------|
| Devolucions amb donant | → Es creen com a filles |
| Devolucions sense donant | → Queden pendents |
| Remesa | → `remittanceStatus: 'partial'` |

**Visualització:** Badge taronja "2/4 quotes (2 pendents: 25€)"

**Per completar una remesa parcial:**
1. Buscar el donant a Summa Social i actualitzar el seu IBAN
2. O crear el donant nou si no existeix
3. Tornar a importar el fitxer del banc

### 3.4.6 Impacte fiscal

| Document | Càlcul |
|----------|--------|
| Model 182 | Total = Σ donacions - Σ devolucions |
| Certificats | Import = Σ donacions - Σ devolucions |

**Important:**
- El pare (remesa) NO té `contactId` → No es compta
- Les filles SÍ tenen `contactId` → Es compten com devolucions
- Si total ≤ 0 → Donant no apareix al Model 182

### 3.4.7 UI de devolucions

#### Banner (Moviments)
- Un sol banner vermell: "Hi ha devolucions pendents d'assignar"
- CTA "Revisar" → Filtra per devolucions pendents

#### Accions per fila

| Botó | Acció |
|------|-------|
| "Assignar donant" (vermell) | Diàleg assignació manual |
| 📄 (icona) | Obre importador fitxer |

#### Badge remesa

| Estat | Visualització |
|-------|---------------|
| Completa | "4 quotes" |
| Parcial | Badge taronja "2/4 quotes (2 pendents: 25€)" |

#### Modal importador - Resultats del matching

| Badge | Significat |
|-------|------------|
| 🟢 **Individual** | Donant i transacció trobats |
| 🔵 **Agrupada** | Part d'una remesa |
| 🟠 **Pendent** | Donant no identificat |

### 3.4.8 Límits del sistema

| Permès | NO permès |
|--------|-----------|
| Matching IBAN/DNI/Nom exacte | Fuzzy matching noms |
| Assignació amb confirmació | Assignació automàtica |
| Remeses parcials | Forçar remesa completa |
| Crear donant nou | Inventar dades |

### 3.4.9 Millores pendents

| Millora | Prioritat | Descripció |
|---------|-----------|------------|
| Botons funcionals "Buscar donant" / "Crear donant" | Alta | Ara són stubs UI |
| Completar remesa parcial | Alta | Flux per reassignar pendents |
| Suggeriments passius | Mitjana | Coincidències exactes sense auto-assignar |
| Exportar pendents | Baixa | Llista offline per revisar |
| Suport més bancs | Baixa | CaixaBank, BBVA, Sabadell... |


## 3.5 GESTIÓ DE CONTACTES

### 3.5.1 Tipus de Contactes

| Tipus | Subtipus |
|-------|----------|
| **Donants** | Particular, Empresa |
| **Proveïdors** | Per categoria |
| **Treballadors** | - |

### 3.5.2 Donants - Camps

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
| Estat (Actiu/Baixa) | ❌ | ❌ |
| Data de baixa | ❌ | ❌ |
| Quota mensual | ❌ | ❌ |
| IBAN | ❌ | ❌ |
| Email | ❌ | ❌ |
| Telèfon | ❌ | ❌ |
| Categoria per defecte | ❌ | ❌ |
| **Comptador devolucions** | ❌ | ❌ |
| **Data última devolució** | ❌ | ❌ |

### 3.5.3 Gestió d'Estat Actiu/Baixa

- **Filtre per estat**: Per defecte es mostren només actius
- **Badge visual**: Els donants de baixa mostren badge "Baixa"
- **Reactivar**: Botó per tornar a donar d'alta un soci
- **Edició**: Es pot canviar l'estat des del formulari d'edició
- **Importador**: Detecta columna "Estado/Estat" automàticament

### 3.5.4 Importador de Donants

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
| Estat | estado, estat, status, activo, baja, baixa |
| Import | import, importe, quota, cuota, amount |
| IBAN | iban, compte, cuenta, banc |
| Email | email, correu, correo, mail |
| Telèfon | telefon, telefono, phone |
| Categoria | categoria, category |

**Funcionalitat "Actualitzar existents":**

- Checkbox opcional a la previsualització
- Si un DNI ja existeix i el checkbox està activat → Actualitza en lloc d'ometre
- Camps actualitzables: status, zipCode, address, email, phone, iban, membershipType, donorType
- NO actualitza: name, taxId, createdAt (per seguretat)

### 3.5.5 Proveïdors - Camps

| Camp | Obligatori | Model 347 |
|------|------------|-----------|
| Nom | ✅ | ✅ |
| NIF/CIF | ⚠️ | ✅ Obligatori |
| Categoria per defecte | ❌ | ❌ |
| Adreça | ❌ | ❌ |
| IBAN | ❌ | ❌ |

### 3.5.6 DonorDetailDrawer

Panel lateral que s'obre clicant el nom d'un donant:
- Informació completa del donant
- Historial de donacions (paginat)
- **Historial de devolucions** (NOU v1.8)
- Resum per any
- Generació de certificats


## 3.6 PROJECTES / EIXOS D'ACTUACIÓ

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


## 3.7 INFORMES FISCALS

### 3.7.1 Model 182 - Declaració de Donacions

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
- Les filles de remeses amb `contactId` → Es compten
- Els pares de remeses sense `contactId` → S'ignoren

**Fitxer generat:** `Model182_{org}_{any}.xlsx`

### 3.7.2 Model 347 - Operacions amb Tercers

**Data límit:** 28 de febrer

**Llindar:** > 3.005,06€ anuals per proveïdor

**Exportació:** CSV amb NIF, Nom, Import total

### 3.7.3 Certificats de Donació

**Tipus:**
- Individual (per donació)
- Anual (totes les donacions d'un any)
- Massiu (ZIP amb tots)

**Format PDF:**
- Logo de l'organització
- Firma digitalitzada
- Text legal Llei 49/2002

**Càlcul de l'import:**
- Import = Σ donacions - Σ devolucions
- Si import ≤ 0 → No es genera certificat


## 3.8 CONFIGURACIÓ

### 3.8.1 Dades de l'Organització
Nom, CIF, adreça, ciutat, CP, telèfon, email, web, logo

### 3.8.2 Configuració de Certificats
Firma digitalitzada, nom signant, càrrec

### 3.8.3 Preferències
Llindar alertes contacte: 0€, 50€, 100€, 500€

### 3.8.4 Categories Comptables
Categories d'ingressos i despeses personalitzables

### 3.8.5 Gestió de Membres
Convidar, canviar rol, eliminar

### 3.8.6 Zona de Perill (SuperAdmin)

Accions irreversibles només per SuperAdmin:

| Acció | Descripció |
|-------|------------|
| Esborrar tots els donants | Elimina tots els donants de l'organització |
| Esborrar tots els proveïdors | Elimina tots els proveïdors |
| Esborrar tots els treballadors | Elimina tots els treballadors |
| Esborrar tots els moviments | Elimina totes les transaccions |
| Esborrar última remesa | Esborra les transaccions filles i restaura la remesa original |

**Esborrar última remesa:**
- Busca l'última remesa processada (isRemittance === true)
- Mostra info: data, concepte, import, nombre de quotes
- Demana confirmació escrivint "BORRAR"
- Esborra totes les transaccions filles
- Restaura la transacció original per tornar-la a processar


## 3.9 IMPORTADOR STRIPE (NOU v1.9)

### 3.9.1 Visió general

L'importador Stripe permet dividir les liquidacions (payouts) de Stripe en transaccions individuals, identificant cada donació i separant les comissions.

| Característica | Valor |
|----------------|-------|
| **Format entrada** | CSV exportat de Stripe ("Pagos → Columnes predeterminades") |
| **Matching donants** | Per email (exacte, case insensitive) |
| **Creació automàtica donants** | NO |
| **Gestió comissions** | Despesa agregada per payout |

**Principi fonamental:** El moviment bancari original (payout) MAI es modifica.

### 3.9.2 Flux d'ús

```
1. L'usuari veu un ingrés de Stripe al llistat de moviments
2. Menú ⋮ → "Dividir remesa Stripe"
3. Puja el CSV exportat de Stripe
4. El sistema agrupa per Transfer (payout) i cerca el que quadra amb l'import bancari
5. Previsualització: donacions + comissions + matching donants
6. L'usuari revisa i assigna manualment els pendents
7. Confirma → Es creen les transaccions filles
```

### 3.9.3 Condició per mostrar l'acció

L'opció "Dividir remesa Stripe" apareix si:

```typescript
const canSplitStripeRemittance = (tx: Transaction): boolean => {
  const isIncome = tx.amount > 0;
  const isNotAlreadyDivided = tx.transactionType !== 'donation' && tx.transactionType !== 'fee';
  const isNotRemittance = !tx.isRemittance;
  
  if (!isIncome || !isNotAlreadyDivided || !isNotRemittance) return false;
  
  // Transaccions noves (ja tenen source)
  if (tx.source === 'stripe') return true;
  
  // Fallback legacy (backward compatibility)
  const descUpper = tx.description?.toUpperCase() || '';
  return descUpper.includes('STRIPE') || descUpper.includes('TRANSFERENCIA DE STRIPE');
};
```

### 3.9.4 Camps CSV requerits

| Camp Stripe | Ús a Summa Social | Obligatori |
|-------------|-------------------|------------|
| `id` | Traçabilitat (`stripePaymentId`) | ✅ |
| `Created date (UTC)` | Data de la donació | ✅ |
| `Amount` | Import brut | ✅ |
| `Fee` | Comissió Stripe | ✅ |
| `Customer Email` | Matching amb donant | ✅ |
| `Status` | Filtrar només `succeeded` | ✅ |
| `Transfer` | Agrupació per payout (`po_xxx`) | ✅ |
| `Amount Refunded` | Detectar reemborsos | ✅ |
| `Description` | Concepte (opcional) | ❌ |

### 3.9.5 Filtratge automàtic

| Condició | Acció |
|----------|-------|
| `Status !== 'succeeded'` | Excloure silenciosament |
| `Amount Refunded > 0` | Excloure + mostrar avís |

### 3.9.6 Agrupació per payout

Les donacions s'agrupen pel camp `Transfer` (po_xxx):

```typescript
interface PayoutGroup {
  transferId: string;    // po_xxx
  rows: StripeRow[];     // Donacions del payout
  gross: number;         // Σ Amount
  fees: number;          // Σ Fee
  net: number;           // gross - fees
}
```

### 3.9.7 Match amb el banc

**Criteri:** Per import net (±0,02€ de tolerància)

```typescript
const tolerance = 0.02;
const match = Math.abs(payoutGroup.net - bankTransaction.amount) <= tolerance;
```

> ⚠️ El banc NO porta el `Transfer` (po_xxx). El match és exclusivament per import.

### 3.9.8 Matching de donants

| Prioritat | Criteri | Implementació |
|-----------|---------|---------------|
| 1 | Email | `donor.email.toLowerCase() === stripeRow.customerEmail.toLowerCase()` |

**Regles estrictes:**
- NO fuzzy matching
- NO crear donants automàticament
- Si no hi ha match → fila queda "Pendent d'assignar"

### 3.9.9 Transaccions generades

**Per cada donació (N ingressos):**

```typescript
{
  date: stripeRow.createdDate,
  description: ensureStripeInDescription(stripeRow.description, stripeRow.customerEmail),
  amount: stripeRow.amount,              // Import BRUT (positiu)
  contactId: matchedDonor?.id || null,
  contactType: matchedDonor ? 'donor' : null,
  contactName: matchedDonor?.name || null,
  source: 'stripe',
  transactionType: 'donation',
  parentTransactionId: bankTransaction.id,
  stripePaymentId: stripeRow.id,         // ch_xxx
  stripeTransferId: selectedGroup.transferId,  // po_xxx
  categoryId: matchedDonor?.defaultCategoryId || null
}
```

**Per les comissions (1 despesa agregada):**

```typescript
{
  date: bankTransaction.date,
  description: `Comissions Stripe - ${count} donacions`,
  amount: -totalFees,                    // Negatiu (despesa)
  source: 'stripe',
  transactionType: 'fee',
  parentTransactionId: bankTransaction.id,
  stripeTransferId: selectedGroup.transferId,
  categoryId: bankFeesCategoryId         // Categoria 'bankFees'
}
```

**Cercabilitat (sufix automàtic):**

```typescript
function ensureStripeInDescription(desc: string | null, email: string): string {
  const base = desc || `Donació Stripe - ${email}`;
  if (base.toUpperCase().includes('STRIPE')) return base;
  return `${base} (via Stripe)`;
}
```

### 3.9.10 Model de dades

**Camps específics Stripe a Transaction:**

| Camp | Tipus | Descripció |
|------|-------|------------|
| `source` | `'stripe'` | Identifica origen |
| `transactionType` | `'donation' \| 'fee'` | Tipus de transacció |
| `stripePaymentId` | `string \| null` | ID pagament (`ch_xxx`) - Idempotència |
| `stripeTransferId` | `string \| null` | ID payout (`po_xxx`) - Correlació |
| `parentTransactionId` | `string` | ID del moviment bancari pare |

### 3.9.11 Impacte fiscal

| Document | Tractament |
|----------|------------|
| **Model 182** | Només compten les filles amb `contactId` i `transactionType: 'donation'` |
| **Certificats** | Import = Σ donacions Stripe del donant |
| **Comissions** | NO afecten fiscalitat donants (són despeses de l'entitat) |

### 3.9.12 UI

**Pas 1: Pujar fitxer**
```
┌─────────────────────────────────────────┐
│ Dividir remesa Stripe                   │
│                                         │
│ Import al banc: 115,55 €                │
│                                         │
│ [Arrossega el CSV aquí]                 │
│                                         │
│ ⚠️ No obrir el CSV amb Excel abans      │
└─────────────────────────────────────────┘
```

**Pas 2: Revisió**
```
┌─────────────────────────────────────────────────────────────────┐
│ 3 donacions trobades                                            │
│                                                                 │
│ Brut:        120,00 €                                           │
│ Comissions:   -4,45 €                                           │
│ Net:         115,55 € ✅ (quadra amb banc)                      │
│                                                                 │
│ ─────────────────────────────────────────────────────────────   │
│ ✅ lourdes@example.com    → Lourdes Hoyal       50,00 €         │
│ ✅ pere@example.com       → Pere Martí          30,00 €         │
│ ⚠️ nou@email.com          → [Assignar]          40,00 €         │
│                                                                 │
│                              [Cancel·lar] [Processar]           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.9.13 Errors i missatges

| Codi | Condició | Missatge |
|------|----------|----------|
| `ERR_NO_COLUMNS` | Falten columnes | "El CSV no té les columnes necessàries: {columnes}" |
| `ERR_NO_MATCH` | Cap payout quadra | "No s'ha trobat cap payout que coincideixi amb {amount} €" |
| `ERR_AMOUNT_MISMATCH` | Import no quadra | "L'import no quadra. Esperats {expected} €, calculats {actual} €" |
| `ERR_NO_BANK_FEES_CATEGORY` | Falta categoria | "No s'ha trobat la categoria de despeses bancàries" |
| `WARN_REFUNDED` | Hi ha reemborsos | "S'han exclòs {count} donacions reemborsades ({amount} €)" |
| `WARN_NO_DONOR` | Sense match | "{count} donacions pendents d'assignar donant" |

### 3.9.14 Límits del sistema

| Permès | NO permès |
|--------|-----------|
| Matching per email exacte | Fuzzy matching |
| Assignació manual pendents | Creació automàtica donants |
| Múltiples payouts al CSV | Connexió directa API Stripe |
| Exclusió reemborsos | Processament automàtic refunds |

### 3.9.15 Estructura de fitxers

```
/src/components/stripe-importer/
  ├── useStripeImporter.ts    # Hook amb lògica de parsing i matching
  ├── StripeImporter.tsx      # Component UI (modal)
  └── index.ts                # Exports
```

**Punt de connexió:** `transaction-table.tsx` → menú ⋮ si `canSplitStripeRemittance(tx)`


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

**Columnes:** Veure secció 3.5.4

## 4.3 Importació de Proveïdors

| Format | Extensions |
|--------|------------|
| Excel | .xlsx, .xls |
| CSV | .csv |

## 4.4 Divisor de Remeses (Ingressos)

| Format | Extensions |
|--------|------------|
| CSV | .csv, .txt |
| Excel | .xlsx, .xls |

## 4.5 Importador de Devolucions (NOU v1.8)

| Format | Extensions | Banc |
|--------|------------|------|
| Excel | .xlsx | Santander |
| CSV | .csv | Triodos |
| XLS | .xls | Triodos |

**Columnes detectades automàticament:** IBAN, Import, Data, DNI, Nom, Motiu

## 4.6 Importador Stripe (NOU v1.9)

| Format | Extensions | Font |
|--------|------------|------|
| CSV | .csv | Stripe Dashboard → Pagos → Exportar |

**Columnes requerides:** id, Created date (UTC), Amount, Fee, Customer Email, Status, Transfer, Amount Refunded

**Veure secció 3.9 per detalls complets.**

## 4.7 Exportacions

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
| Import (net de devolucions) | ✅ |
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
| **Remesa (ingressos)** | Agrupació de quotes de socis en un únic ingrés |
| **Remesa (devolucions)** | Agrupació de devolucions en un únic moviment negatiu |
| **Devolució** | Rebut retornat pel banc (compte sense fons, IBAN erroni, etc.) |
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
| **Remesa parcial** | Remesa amb algunes devolucions pendents d'identificar |
| **dateConfidence** | Fiabilitat de la data: 'line' (per fila), 'file' (global), 'none' |


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

## 7.4 Modals Radix UI (NOU v1.8)
- Fix bloqueig `aria-hidden` en tancar modals
- DropdownMenu controlat per evitar conflictes
- `setTimeout` + `blur()` abans d'obrir modals des de menús
- Components com `DonorSearchCombobox` reescrits sense `cmdk` per evitar problemes de portals niuats


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
6. **Gestionar devolucions pendents** (NOU v1.8)

## 8.3 Gestió de Devolucions (NOU v1.8)

1. Veure banner "Devolucions pendents" a Moviments
2. Clicar "Revisar"
3. Per cada devolució:
   - Si saps de qui és → "Assignar donant"
   - Si tens el fitxer del banc → Icona 📄 → Importar fitxer
4. Revisar remeses parcials i completar-les

## 8.4 Fi d'Any

1. Revisar donants amb dades incompletes
2. **Verificar devolucions assignades**
3. Generar Excel Model 182 (abans 31 gener)
4. Enviar a gestoria
5. Generar Model 347 (abans 28 febrer)
6. Emetre certificats als donants


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

## 9.4 Tests (NOU v1.8)
- 77 tests unitaris
- Hook pre-commit amb Husky
- `npm test` abans de cada commit


# ═══════════════════════════════════════════════════════════════════════════════
# 10. ROADMAP / FUNCIONALITATS PENDENTS
# ═══════════════════════════════════════════════════════════════════════════════

## Completades v1.8
- ✅ Importador de devolucions del banc (Santander, Triodos)
- ✅ Detecció automàtica d'agrupacions de devolucions
- ✅ Remeses parcials de devolucions
- ✅ Matching per IBAN → DNI → Nom exacte
- ✅ UX simplificada per devolucions
- ✅ Tests unitaris (77 tests) + Husky pre-commit
- ✅ Fixes bloqueig aria-hidden modals Radix
- ✅ Estat actiu/baixa per donants
- ✅ Importador actualitza donants existents
- ✅ Vista agrupada de remeses (1 línia + modal detall)
- ✅ Detecció i reactivació de socis de baixa a remeses
- ✅ Link al donant des de modal de remesa
- ✅ Eina per esborrar última remesa (Zona Perill)

## Completades v1.7
- ✅ Suport Excel per divisor de remeses
- ✅ Camps city/province a l'importador de donants
- ✅ Exportació Excel Model 182 per gestoria (amb recurrència)
- ✅ Session persistence (seguretat)

## Pendents prioritàries
- 🔲 Completar remesa parcial (flux UI per reassignar pendents)
- 🔲 Botons funcionals "Buscar donant" / "Crear donant" a importador
- 🔲 Tancaments mensuals/anuals
- 🔲 Saldos per compte bancari
- 🔲 Regles deterministes de categorització
- 🔲 Validació estricta NIF/CIF
- 🔲 Checklist pre-informe fiscal

## Pendents secundàries
- 🔲 Suggeriments passius (coincidències exactes)
- 🔲 Exportar devolucions pendents
- 🔲 Suport més bancs (CaixaBank, BBVA, Sabadell)
- 🔲 Detecció d'anomalies (duplicats)
- 🔲 Memòria de classificació
- 🔲 Notificacions per email
- ✅ Importació web Stripe (v1.9)
- 🔲 Importació web (altres plataformes)

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
| 1.7 | Des 2024 | Excel Model 182 per gestoria, suport Excel remeses, camps city/province, session persistence |
| **1.8** | **Des 2024** | **Importador devolucions del banc, remeses parcials, suport multi-banc (Santander/Triodos), tests unitaris, fixes modals Radix, UX simplificada** |


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
| **Fuzzy matching de noms** | Massa risc d'errors en fiscalitat |
| **Assignació automàtica sense confirmació** | L'usuari sempre ha de validar |

## 12.2 Focus del Producte

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   1. GESTIONAR MOVIMENTS BANCARIS                              │
│      Importar, categoritzar, assignar contactes                │
│                                                                 │
│   2. RECONCILIAR BANC                                          │
│      Saldos, detecció d'errors, control, devolucions           │
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
| 11 | **NO fuzzy matching de noms** |
| 12 | **NO assignació automàtica sense confirmació de l'usuari** |

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

### Gestió de transaccions consumides (NOU v1.8)

> ⚠️ **CRÍTIC**: NO usar `splice()` per marcar transaccions com a usades.

**MAL** (mutació d'array):
```typescript
const idx = pendingReturns.findIndex(t => t.id === matchingTx.id);
if (idx > -1) pendingReturns.splice(idx, 1);  // ❌ Mutació fràgil
```

**BÉ** (Set d'IDs):
```typescript
const usedTransactionIds = new Set<string>();

const matchingTx = pendingReturns.find(tx => 
  !usedTransactionIds.has(tx.id) && ...
);

if (matchingTx) {
  usedTransactionIds.add(matchingTx.id);  // ✅ Immutable
}
```

**Quan se li demani nova funcionalitat:**
- Validar si encaixa amb blocs estratègics
- Si no encaixa, informar i suggerir alternatives


# ═══════════════════════════════════════════════════════════════════════════════
# 14. PARAULES CLAU I INTENCIONS
# ═══════════════════════════════════════════════════════════════════════════════

| Terme | Interpretació Correcta | ⚠️ NO significa |
|-------|------------------------|-----------------|
| "Conciliació bancària" | Saldos, desquadraments, regles, devolucions | Integració amb bancs |
| "Fiscalitat" | Model 182, 347, certificats, Excel | Presentació a AEAT |
| "Excel net" | Fitxer simple per gestoria | Fitxer BOE oficial |
| "Determinista" | Regla fixa, mateix resultat | IA autònoma |
| "Auto-assignació" | Matching + categoria defecte | IA sense supervisió |
| "Remesa" | Agrupació quotes socis O devolucions | Qualsevol ingrés |
| "Gestoria" | Professional extern | L'ONG mateixa |
| "Matching exacte" | IBAN/DNI/Nom idèntic | Fuzzy, aproximat |
| "Remesa parcial" | Algunes devolucions pendents | Remesa incompleta per error |
| "Payout Stripe" | Liquidació de Stripe al banc (po_xxx) | Donació individual |
| "Comissió Stripe" | Despesa agregada per payout | Cost per donació |
| "Remesa Stripe" | Payout dividit en donacions individuals | Connexió API Stripe |


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
| 7 | **Matching**: Només exacte (IBAN/DNI/Nom) | 🔒 TANCAT |
| 8 | **Moviments bancaris**: Immutables | 🔒 TANCAT |

> ⛔ **Cap LLM pot proposar:**
> - Migrar a SQL, MongoDB, Supabase
> - Canviar Next.js per altre framework
> - Afegir backend separat
> - Fine-tuning de models IA
> - Funcionalitats CRM, ERP, facturació
> - Integració directa APIs bancàries
> - Fuzzy matching de noms
> - Modificar/esborrar moviments bancaris originals

> ✅ **Un LLM SÍ pot proposar:**
> - Millores dins l'arquitectura actual
> - Nous camps opcionals a Firestore
> - Noves subcollections si imprescindible
> - Optimitzacions de rendiment
> - Millores UX sense canviar funcionalitat
> - Nous patrons de matching EXACTE (email, telèfon...)


# ═══════════════════════════════════════════════════════════════════════════════
# ANNEX B — DOCUMENT PER GPT ASSISTENT
# ═══════════════════════════════════════════════════════════════════════════════

## CONTEXT

Summa Social és una aplicació de gestió financera per ONGs espanyoles.
Gestiona moviments bancaris, donants, proveïdors i fiscalitat (Model 182, 347, certificats).
El mòdul de devolucions resol el problema de rebuts retornats pel banc sense identificar.

## CONCEPTES CLAU

- DEVOLUCIÓ = Rebut que el banc no ha pogut cobrar i retorna a l'ONG
- REMESA = Agrupació de múltiples moviments en un sol apunt bancari
- REMESA PARCIAL = Remesa amb algunes devolucions pendents d'identificar
- MATCHING = Assignació de contacte per coincidència exacta (IBAN/DNI/Nom)

## FLUX DEVOLUCIONS

1. Usuari veu banner "Devolucions pendents" a Moviments
2. Clica "Revisar" → Filtra per devolucions
3. Per cada devolució:
   - "Assignar donant" → Cerca manual
   - Icona 📄 → Importador de fitxer del banc
4. L'importador fa matching per IBAN → DNI → Nom exacte
5. Es creen transaccions filles, el pare queda immutable

## BANCS SUPORTATS

- Santander: XLSX, data global a capçalera
- Triodos: CSV/XLS, data per línia
- Altres: Detecció automàtica de columnes

## ERRORS COMUNS

| Error | Causa | Solució |
|-------|-------|---------|
| "No s'ha trobat cap donant" | IBAN diferent | Actualitzar IBAN del donant |
| "Múltiples candidates" | Diverses transaccions possibles | Assignar manualment |
| "Sense data fiable" | Banc no informa data | Normal, funciona igualment |

## FRASES PER RESPONDRE

- "Les devolucions es resten automàticament del total un cop assignades."
- "El moviment bancari original no es toca."
- "Si una remesa queda parcial, pots completar-la més tard."
- "Summa Social no fa assignacions automàtiques sense coincidència exacta."

## LÍMITS

- NO fuzzy matching de noms
- NO assignació automàtica sense confirmació
- NO modificar moviments bancaris
- Les remeses parcials requereixen acció manual


# ═══════════════════════════════════════════════════════════════════════════════
# ANNEX C — EXPORTS I MÒDULS DESACOBLATS
# ═══════════════════════════════════════════════════════════════════════════════

## C.1 Principi Arquitectònic

Summa Social pot generar **feeds de dades de només lectura** mitjançant Cloud Functions.

Aquests feeds serveixen perquè mòduls externs consumeixin dades sense afectar el core de l'aplicació. L'objectiu és permetre extensions opcionals mantenint la integritat i simplicitat del producte principal.

## C.2 Patró Oficial

| Responsabilitat | Actor |
|-----------------|-------|
| **Escriptura del feed** | Backend de Summa Social (Cloud Functions) |
| **Lectura del feed** | Aplicacions o mòduls externs |
| **Escriptura al mòdul extern** | Només el mòdul extern |

> ⚠️ **Regla fonamental**: Cap mòdul extern pot escriure dins del core de Summa Social.

## C.3 Exemple Normatiu: Mòdul de Projectes

### Estructura Firestore

**Feed de despeses (escriu Summa, llegeix mòdul extern):**

```
/organizations/{orgId}/exports/projectExpenses/items/{txId}
```

**Assignacions a projectes (fora de Summa, escriu mòdul extern):**

```
/organizations/{orgId}/projectModule/expenseLinks/{txId}
```

### Join Client-Side

El mòdul extern fa el join entre:
- La despesa (del feed `exports/projectExpenses/items`)
- L'assignació (de `projectModule/expenseLinks`)

Summa Social no coneix ni gestiona les assignacions.

## C.4 Límits Explícits del Producte

Summa Social **NO**:
- Gestiona projectes (més enllà dels eixos d'actuació existents)
- Gestiona subvencions
- Fa justificacions econòmiques
- Controla pressupostos de projectes

Qualsevol funcionalitat en aquesta línia és **externa i opcional**, i s'ha d'implementar fora del core mitjançant el patró d'exports descrit.

## C.5 Firestore Rules

Els feeds d'exports són de només lectura per als clients:

```javascript
match /exports/{exportType} {
  allow read: if isMemberOf(orgId) || hasOrgInProfile(orgId) || isSuperAdmin();
  allow write: if false; // Només Cloud Functions

  match /items/{itemId} {
    allow read: if isMemberOf(orgId) || hasOrgInProfile(orgId) || isSuperAdmin();
    allow write: if false; // Només Cloud Functions
  }
}

match /projectModule/{document=**} {
  allow read: if isMemberOf(orgId) || hasOrgInProfile(orgId) || isSuperAdmin();
  allow write: if (isMemberOf(orgId) && getMemberRole(orgId) in ['admin', 'user']) || isSuperAdmin();
}
```


# ═══════════════════════════════════════════════════════════════════════════════
# FI DEL DOCUMENT
# Última actualització: Desembre 2025 - Versió 1.9
# ═══════════════════════════════════════════════════════════════════════════════
