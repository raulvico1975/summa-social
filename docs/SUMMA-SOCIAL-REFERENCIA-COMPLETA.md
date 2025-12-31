# ═══════════════════════════════════════════════════════════════════════════════
# SUMMA SOCIAL - REFERÈNCIA COMPLETA DEL PROJECTE
# Versió 1.26 - Desembre 2025
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
├── DEV-SOLO-MANUAL.md                     # Manual operatiu pel mantenidor (NOU v1.20)
├── CHANGELOG.md                           # Historial de canvis detallat
├── manual-usuari-summa-social.md          # Per a usuaris finals
└── CATALEG-FUNCIONALITATS.md              # Referència ràpida de funcionalitats
```


# ═══════════════════════════════════════════════════════════════════════════════
# 1. INFORMACIÓ GENERAL
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 Què és Summa Social?

Summa Social és una aplicació web de gestió financera dissenyada específicament per a petites i mitjanes entitats sense ànim de lucre d'Espanya. L'aplicació substitueix els fulls de càlcul (Excel/Google Sheets) per una eina intel·ligent i centralitzada.

## 1.2 Problema que Resol

Les entitats espanyoles gestionen les seves finances amb fulls de càlcul, cosa que provoca:
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
- **Multicomptes bancaris amb filtre i traçabilitat (NOU v1.12)**

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
| Idiomes | Català, Espanyol, Francès i Portuguès | i18n |
| Excel/CSV | SheetJS (xlsx) | - |
| PDF | jsPDF | - |

## 1.6 Sobre l'Usuari Desenvolupador

- **Nom**: Raul
- **Perfil**: NO programador - Assessor d'entitats que porta els comptes de diverses organitzacions
- **Entorn**: VS Code + Claude Code
- **Necessitats**: Codi COMPLET (mai fragments), passos verificables, respostes en CATALÀ

## 1.7 Prioritats Estratègiques 2025-2026

Per a les properes versions, Summa Social se centra en **dos blocs principals**:

### Bloc 1: Conciliació Bancària Real

| Funcionalitat | Descripció | Estat |
|---------------|------------|-------|
| **Multicomptes bancaris** | Suport per múltiples comptes amb filtre i traçabilitat | ✅ Implementat v1.12 |
| **Regles deterministes** | Categorització automàtica per patrons de text (loteria, voluntariat) | ✅ Implementat v1.12 |
| **Gestió de devolucions** | Importador de fitxers del banc, remeses parcials | ✅ Implementat v1.8 |

### Bloc 2: Fiscalitat Fina Orientada a Gestoria

| Funcionalitat | Descripció | Estat |
|---------------|------------|-------|
| **Dades mínimes obligatòries** | CP i adreça per Model 182 | ✅ Implementat |
| **Consolidació anual** | Import total per donant/proveïdor amb devolucions aplicades | ✅ Implementat |
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
- **Regla 10s** (NOU v1.11): qualsevol acció de captura mòbil ha de completar-se en menys de 10 segons

### 1.8.5 Millores de Mantenibilitat
- Refactors orientats a reduir complexitat o duplicació
- Reorganització de fitxers o components per guanyar llegibilitat
- Eliminació de dependències innecessàries o obsoletes

### 1.8.6 Millores de Diagnòstic i Observabilitat
- Logs més clars i estructurats
- Avisos o mecanismes per facilitar la depuració
- Indicadors interns per detectar problemes

#### Logs Estructurats de Categorització IA

El sistema de categorització IA genera logs estructurats per facilitar el diagnòstic. Tots els logs utilitzen el prefix `[IA]`.

**Format dels logs:**

| Event | Format | Exemple |
|-------|--------|---------|
| Inici individual | `[IA] Iniciant categoritzacio per: "{desc}..."` | `[IA] Iniciant categoritzacio per: "TRANSFERENCIA DE NÒMINA..."` |
| Èxit individual | `[IA] OK: category="{cat}" confidence={n}% model=gemini-2.0-flash` | `[IA] OK: category="Nòmines" confidence=95% model=gemini-2.0-flash` |
| Error individual | `[IA] ERROR: code={code} reason="{msg}" model=gemini-2.0-flash` | `[IA] ERROR: code=QUOTA_EXCEEDED reason="Quota exceeded" model=gemini-2.0-flash` |
| Inici batch | `[IA] Iniciant classificacio SEQÜENCIAL de {n} moviments{mode}.` | `[IA] Iniciant classificacio SEQÜENCIAL de 25 moviments (MODE RÀPID).` |
| Progrés batch | `[IA] Classificant {i}/{n}: "{desc}..."` | `[IA] Classificant 3/25: "PAGAMENT LLOGU..."` |
| Èxit batch item | `[IA] ✓ {txId} → "{category}"` | `[IA] ✓ abc123 → "Lloguer"` |
| Error batch item | `[IA] ✗ {txId}: {code} - {message}` | `[IA] ✗ abc123: RATE_LIMITED - Rate limited` |
| Backoff | `[IA] Backoff: nou delay = {ms}ms` | `[IA] Backoff: nou delay = 3000ms` |
| Quota esgotada | `[IA] QUOTA EXCEDIDA - Aturant procés` | - |
| Cancel·lació | `[IA] Cancel·lat per l'usuari` | - |
| Finalització | `[IA] {status}: {ok} OK, {err} errors en {s}s.` | `[IA] COMPLETAT: 23 OK, 2 errors en 45s.` |

**Codis d'error de l'API:**

| Codi | Descripció | Acció |
|------|------------|-------|
| `QUOTA_EXCEEDED` | Quota diària d'IA esgotada (429 o 400 amb "limit/exceeded") | Aturar batch, notificar usuari |
| `RATE_LIMITED` | Massa peticions en poc temps | Aplicar backoff, continuar |
| `TRANSIENT` | Error temporal del servidor (503, 504, timeout) | Aplicar backoff, continuar |
| `INVALID_INPUT` | Dades de la transacció invàlides | Marcar com "Revisar", continuar |
| `AI_ERROR` | Error genèric d'IA (clau invàlida, model no disponible) | Marcar com "Revisar", continuar |
| `NETWORK` | Error de xarxa (client-side) | Aplicar backoff, continuar |

**Events trackUX (analytics):**

| Event | Propietats | Quan |
|-------|------------|------|
| `ai.categorize.error` | `{ code, reason, model }` | Error en categorització individual |
| `ai.bulk.run.start` | `{ count, bulkMode, sequential }` | Inici de batch |
| `ai.bulk.run.done` | `{ processedCount, errorCount, durationMs, bulkMode, quotaExceeded, cancelled }` | Fi de batch |
| `ai.bulk.toggle` | `{ enabled }` | SuperAdmin activa/desactiva mode ràpid |
| `ai.bulk.fallback_quota` | `{ reason }` | Fallback automàtic per quota |

**Constants de timing:**

| Constant | Valor | Descripció |
|----------|-------|------------|
| `BASE_DELAY_NORMAL_MS` | 1500ms | Delay entre crides (mode normal) |
| `BASE_DELAY_BULK_MS` | 1200ms | Delay entre crides (mode ràpid) |
| `MAX_DELAY_MS` | 8000ms | Màxim delay amb backoff |
| `BACKOFF_MULTIPLIER` | 2 | Factor de multiplicació del backoff |

**Fitxers relacionats:**
- `src/app/api/ai/categorize-transaction/route.ts` — Route Handler de l'API
- `src/components/transactions/hooks/useTransactionCategorization.ts` — Hook client
- `src/ai/genkit.ts` — Configuració Genkit

### Principi General

> 💡 Aquestes millores són sempre compatibles amb la visió del producte i contribueixen directament a la seva estabilitat i longevitat.


# ═══════════════════════════════════════════════════════════════════════════════
# 2. ARQUITECTURA TÈCNICA
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Estructura de Fitxers

```
/src
  /app                          → Pàgines (Next.js App Router)
    /[lang]                      → Rutes públiques multiidioma (NOU v1.25)
      /login                     → Login públic (/ca/login, /es/login, etc.)
      /privacy                   → Política de privacitat
      /contact                   → Pàgina de contacte
      layout.tsx                 → Validació idioma + generateStaticParams
    /[orgSlug]                   → Rutes per organització (app privada)
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
    /login                       → Redirect stub → /[lang]/login
    /privacy                     → Redirect stub → /[lang]/privacy
    /contacte                    → Redirect stub → /[lang]/contact
    /privacitat                  → Redirect stub → /[lang]/privacy (legacy)
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
    /onboarding                  → Components d'onboarding (ACTUALITZAT v1.20)
      WelcomeOnboardingModal.tsx → Modal de benvinguda per primer admin
      OnboardingWizard.tsx       → Wizard de configuració inicial
    /admin                       → Components del panell admin
      create-organization-dialog.tsx → Modal crear organització
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
    /ca.ts                       → Català (idioma base, app privada)
    /es.ts                       → Espanyol (app privada)
    /fr.ts                       → Francès (app privada)
    /public.ts                   → Traduccions pàgines públiques CA/ES/FR/PT (NOU v1.25)
    /locales/*.json              → Bundles JSON per runtime (ca, es, fr, pt)
    # Criteri: fr.ts conté totes les claus; si falta traducció, es manté text CA
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
      ├── onboarding/                     # Estat onboarding (NOU v1.20)
      │   └── welcomeSeenAt: string | null  # YYYY-MM-DD quan primer admin ha vist modal
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
      │       ├── bankAccountId: string | null        # ID compte bancari (NOU v1.12)
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
      ├── bankAccounts/                       # (NOU v1.12)
      │   └── {bankAccountId}/
      │       ├── name: string                   # Nom identificatiu
      │       ├── iban: string | null            # IBAN del compte
      │       ├── bankName: string | null        # Nom del banc
      │       ├── isDefault: boolean             # Compte per defecte?
      │       ├── isActive: boolean              # Actiu/Inactiu
      │       ├── createdAt: string
      │       └── updatedAt: string
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

### Logout per inactivitat

- **IdleLogoutProvider**: Component que tanca la sessió després de 30 minuts d'inactivitat
- Avís 1 minut abans del logout
- Events monitoritzats: mouse, teclat, scroll, touch, click, canvi de visibilitat
- Redirecció a `/{slug}/login?reason=idle` (si l'usuari està dins una org) o `/login?reason=idle` (rutes globals)
- Segments reservats (no són slugs): `login`, `registre`, `redirect-to-org`, `admin`, `dashboard`, `privacy`, `api`, `q`, `quick`, `quick-expense`
- Implementat a `src/components/IdleLogoutProvider.tsx`

### Flux de redirecció d'organització

- **redirect-to-org**: Pàgina que determina l'organització de l'usuari i redirigeix a `/{slug}/dashboard`
- Ordre de cerca: 1) `organizationId` al perfil, 2) query `collectionGroup('members')` pel uid
- Si no té accés a cap org: mostra estat "no-org" amb opció de logout
- Query optimitzada O(1) amb `collectionGroup` + `documentId()` (implementat v1.16)

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

## 3.1 DASHBOARD (ACTUALITZAT v1.20)

### 3.1.1 Targetes Principals (StatCards)

| Targeta | Càlcul |
|---------|--------|
| **Ingressos** | Suma moviments amount > 0 |
| **Despeses operatives** | Suma amount < 0 EXCLOENT contraparts |
| **Balanç operatiu** | Ingressos - Despeses operatives |
| **Transferències a contraparts** | Suma isCounterpartTransfer = true |

### 3.1.2 Bloc Donacions i Socis

| Mètrica | Comparativa |
|---------|-------------|
| Donacions | vs any anterior |
| Donants actius | vs any anterior |
| Socis actius | vs any anterior |
| Quotes socis | vs any anterior |

### 3.1.3 Bloc Obligacions Fiscals

| Obligació | Data límit | Acció |
|-----------|------------|-------|
| Model 182 | 31 gener | Botó "Preparar" |
| Model 347 | 28 febrer | Botó "Preparar" |

### 3.1.4 Bloc Categories Principals (ACTUALITZAT v1.20)

Mostra les categories amb més volum de despesa, excloent:
- Comissions bancàries (`transactionType === 'fee'` o `'return_fee'`)
- Moviments sense categoria (mostrats com a peu de taula neutral "Sense categoria")

### 3.1.5 Bloc Despesa per Projecte (ACTUALITZAT v1.20)

**Condicions de visibilitat:**
- Mòdul Projectes activat (`featureFlags.projectModule`)
- Almenys 1 projecte actiu
- Més del 5% de les despeses assignades a projectes

**Contingut:**
- Top 3 projectes amb més despesa assignada
- Percentatge del total per projecte
- CTA "Veure detall" → `/dashboard/project-module/projects`

### 3.1.6 Filtre de Dates
- Any complet
- Trimestre
- Mes
- Personalitzat
- Tot

### 3.1.7 Modal de Benvinguda (NOU v1.20)

El Dashboard gestiona la modal de benvinguda per al primer admin:
- Comprova `shouldShowWelcomeModal()` al carregar
- Si retorna `true`, mostra `WelcomeOnboardingModal`
- Opcions: "Guia'm" (obre wizard) o "Començar pel meu compte" (tanca)

### 3.1.8 Blocs Desactivats

Els següents blocs estan **desactivats** (comentats al codi) a partir de v1.20:
- **Celebracions**: Missatges de fites positives (massa soroll, poc valor)
- **Alertes**: Avisos de moviments pendents (trasllat a altres pantalles)

> **Nota:** El dashboard és una eina de visualització i seguiment, no de validació ni govern. Les mètriques mostrades són informatives i no constitueixen cap informe oficial.


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

> **Blindatge:** La classificació suggerida per IA no s'aplica automàticament. L'usuari sempre ha de validar o confirmar l'assignació proposada.

**Aplicació de Categoria per Defecte:**
- Si contacte té defaultCategoryId → s'aplica automàticament

**Detecció Forçada de Categories (NOU v1.12):**
- Loteria: patrons "loteria", "sorteig" → categoria "Loteries i sorteigs"
- Voluntariat: patrons "voluntari", "voluntariat" → categoria "Ingressos voluntariat"
- S'aplica a ingressos positius automàticament durant la importació

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
- Per compte bancari (NOU v1.12)
- Per origen: bank, remittance, manual, stripe (NOU v1.12)
- Sense categoritzar
- Sense contacte
- **Devolucions pendents** (NOU v1.8)

### 3.2.5 Selecció Múltiple i Accions en Bloc (NOU v1.13)

Permet seleccionar múltiples moviments i aplicar accions massives.

**Visibilitat:**
- Només disponible per rols `admin` i `user`
- Rol `viewer` no veu els checkboxes

**Elements UI:**
| Element | Descripció |
|---------|------------|
| Checkbox capçalera | Selecciona/deselecciona tots els visibles |
| Checkbox fila | Selecciona moviment individual |
| Estat indeterminat | Quan hi ha selecció parcial |
| Barra d'accions | Apareix amb "N seleccionats" |

**Accions disponibles:**
| Acció | Descripció |
|-------|------------|
| **Assignar categoria...** | Obre diàleg per seleccionar categoria |
| **Treure categoria** | Posa `category: null` a tots els seleccionats |

**Implementació tècnica:**
- Estat: `Set<string>` per IDs seleccionats
- Batched writes: màxim 50 operacions per batch (límit Firestore)
- Tracking UX: `bulk.category.start/success/partial/error`

**Traduccions:** `movements.table.bulkSelection` (CA/ES/FR)

### 3.2.6 Banner de Devolucions Pendents (NOU v1.8)

Quan hi ha devolucions sense assignar, apareix un banner vermell:

> ⚠️ Hi ha devolucions pendents d'assignar [Revisar]

El botó "Revisar" filtra la taula per mostrar només devolucions pendents.

### 3.2.7 Reorganització UX de la Pàgina de Moviments (NOU v1.14)

Nova estructura visual en 3 franges horitzontals:

| Franja | Contingut |
|--------|-----------|
| **Header** | Títol + Botó "Nou moviment" + Botó "Filtres" (Sheet) + Menú opcions taula |
| **Barra filtres actius** | Pills de filtres aplicats + botó "Neteja filtres" |
| **Taula** | Taula de moviments amb tot l'espai vertical disponible |

**Nous components:**

| Component | Fitxer | Descripció |
|-----------|--------|------------|
| `FiltersSheet` | `src/components/transactions/components/FiltersSheet.tsx` | Sheet lateral amb tots els filtres consolidats (tipus, origen, compte) |
| `TableOptionsMenu` | `src/components/transactions/components/TableOptionsMenu.tsx` | Menú desplegable amb opcions de visualització (ocultar desglose remeses, mostrar columna projecte) |

**Comportament:**
- El botó "Filtres" obre un Sheet lateral des de la dreta
- Els filtres aplicats apareixen com a "pills" sota el header
- El menú d'opcions (icona ⋮ o Settings) controla opcions de la taula

### 3.2.8 Drag & Drop de Documents (NOU v1.14)

Permet adjuntar documents arrossegant fitxers directament sobre una fila de moviment.

**Funcionament:**
- Arrossegar un fitxer sobre qualsevol fila activa el mode "drop"
- La fila mostra un overlay amb "Deixa anar per adjuntar"
- En deixar anar, el fitxer es puja a Storage i s'assigna al moviment

**Tipus acceptats:**
- PDF, imatges (JPG, PNG, GIF, WEBP), XML
- Màxim 15MB per fitxer

**Components:**

| Component | Fitxer | Descripció |
|-----------|--------|------------|
| `RowDropTarget` | `src/components/files/row-drop-target.tsx` | Wrapper que afegeix drag & drop a files de taula |
| `attachDocumentToTransaction` | `src/lib/files/attach-document.ts` | Helper per pujar fitxer a Storage i actualitzar Firestore |

**Traduccions:** `movements.table.dropToAttach` (CA/ES/FR)

### 3.2.9 Indicadors Visuals de Remeses Processades (NOU v1.14)

Les remeses de donacions processades es mostren amb un estil visual distintiu per evitar confusió.

**Objectiu:** L'usuari ha de poder identificar en 1 segon que una remesa ja està processada i no requereix acció.

**Canvis visuals:**

| Element | Abans | Ara |
|---------|-------|-----|
| **Badge concepte** | `👁 303/303 quotes` (gris) | `✓ Remesa processada · 303/303 quotes` (verd esmeralda) |
| **Fons fila** | Cap | `bg-emerald-50/30` (verd molt suau) |
| **Columna Contacte** | Botó "Assignar" | Guió "—" (no aplica) |

**Detalls tècnics:**
- Detecció: `tx.isRemittance && tx.remittanceType !== 'returns'`
- Icona: `CheckCircle2` (lucide-react)
- Colors: `border-emerald-300 text-emerald-700 bg-emerald-50`

**Traduccions:** `movements.table.remittanceProcessedLabel`, `remittanceNotApplicable` (CA/ES/FR)


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

### 3.3.7 Modal de Revisió Redissenyat (NOU v1.14)

El modal de revisió de remeses ("Revisió de la Remesa") s'ha redissenyat per millorar la usabilitat amb taules denses.

**Problemes resolts:**
- Modal massa estret per a taules amb moltes columnes
- Scroll confús (modal vs taula)
- Targetes de resum ocupaven massa espai

**Nou disseny:**

| Característica | Valor |
|----------------|-------|
| **Amplada** | 95% del viewport, màxim 1400px |
| **Alçada** | 90% del viewport |
| **Layout** | Flexbox vertical amb 3 zones fixes |

**Zones del modal:**

| Zona | Contingut | Comportament |
|------|-----------|--------------|
| **Header fix** | Títol + Badges de resum compactes + Opcions de creació de donants | No fa scroll |
| **Taula central** | Taula amb tots els donants/quotes | Scroll independent amb header sticky |
| **Footer fix** | Resum d'accions + Botons (Enrere, Processar) | No fa scroll |

**Badges de resum compactes:**
Els 4 blocs de resum (Total, Trobats, Nous amb DNI, Nous sense DNI) ara són badges en línia:

```
[303 donacions] [✓ 280 trobats] [+ 15 nous amb DNI] [⚠ 8 sense DNI] | [1.234,56€ / 1.234,56€]
```

**Implementació:**
- Classes: `w-[95vw] max-w-[1400px] h-[90vh] flex flex-col`
- Taula: `flex-1 min-h-0 overflow-auto`
- Header taula: `sticky top-0 bg-background z-10`


## 3.4 GESTIÓ DE DEVOLUCIONS (NOU v1.8)

### 3.4.1 Visió general

Les devolucions bancàries (rebuts retornats) es gestionen sense modificar el moviment bancari original.

| Mètode | Quan usar-lo |
|--------|--------------|
| **Assignació manual** | Devolucions individuals, una a una |
| **Importador de fitxer** | Devolucions massives o agrupades |

**Principi fonamental:** El moviment bancari original MAI es modifica ni s'esborra.

### 3.4.2 Flux real de devolucions (individuals i remeses)

**Tipus de devolucions:**

| Tipus | Descripció | Exemple |
|-------|------------|---------|
| **Individual** | Un apunt bancari únic (−X €) | −25,00€ "DEVOL. RECIBO" |
| **Remesa** | Un apunt pare amb múltiples quotes filles | −150,00€ amb 6 filles de 25€ |

**Regles fonamentals:**

1. **Una devolució individual** és un apunt bancari únic amb import negatiu
2. **Una devolució en remesa** és un apunt pare amb múltiples quotes filles
3. **El pare mai té `contactId`** — el donant sempre s'assigna a les filles
4. **La fitxa del donant i el Model 182** es calculen exclusivament a partir de les filles amb `contactId`

**Implicació fiscal:** Si una remesa té 4 filles però només 2 tenen donant assignat, només aquelles 2 resten al càlcul del Model 182 dels seus respectius donants.

### 3.4.3 Assignació manual

1. Ves a **Moviments** → Banner "Devolucions pendents" → **Revisar**
2. Per cada devolució: botó **"Assignar donant"**
3. Cerca per nom, DNI, IBAN o email
4. Confirma l'assignació

### 3.4.4 Importador de fitxer del banc

#### Ubicació
- Moviments → Fila de devolució → Icona 📄 (pujar fitxer)
- O des del filtre "Devolucions pendents"

#### Bancs suportats

| Banc | Format | Particularitat |
|------|--------|----------------|
| Santander | XLSX | Data global a capçalera, agrupa per fitxer |
| Triodos | CSV/XLS | Data per línia, agrupa per dia |
| Altres | CSV/XLSX | Detecció automàtica columnes |

#### Flux d'importació amb fitxer del banc (v1.12)

**Pas 1: Parseig i normalització**
```
1. PARSEJAR FITXER → Extreure IBAN, Import, Data, Nom
2. NORMALITZAR → Imports positius, dateConfidence (line/file/none)
```

**Pas 2: Matching determinista de transaccions**

El sistema fa matching determinista amb els moviments bancaris:

| Ordre | Criteri | Tolerància |
|-------|---------|------------|
| 1 | Import | ±0,02€ |
| 2 | Data | ±5 dies |
| 3 | IBAN (si disponible) | Exacte |

**Regles de desempat (NOU v1.12):**
- Si hi ha 1 candidat clar → s'assigna automàticament
- Si hi ha múltiples candidats → desempat automàtic per **data més propera**
- Només es marca com ambigu si l'empat és real (mateixa data i import)

**Pas 3: Matching de donants**

| Prioritat | Criteri | Normalització |
|-----------|---------|---------------|
| 1 | IBAN | Sense espais, majúscules |
| 2 | DNI/NIF | Sense guions, majúscules |
| 3 | Nom | Sense accents, minúscules, exacte |

**NO es fa matching aproximat ni fuzzy.**

**Pas 4: Processament**
```
1. DETECTAR AGRUPACIONS → Suma = moviment bancari (±0.02€, ±5 dies)
2. CREAR FILLES → Per cada devolució identificada
3. ACTUALITZAR PARE → isRemittance, remittanceStatus, etc.
4. ACTUALITZAR DONANTS → returnCount, lastReturnDate
```

#### Persistència (punt crític)

> **IMPORTANT:** El matching no és només visual.
> Quan una devolució queda resolta, el sistema actualitza el document real de la transacció:
> - `contactId` → ID del donant
> - `contactType` → 'donor'
> - `transactionType` → 'return'
>
> Aquesta persistència és obligatòria perquè la devolució compti al Model 182.

#### Detecció automàtica de columnes

| Camp | Patrons detectats |
|------|-------------------|
| IBAN | cuenta de adeudo, cuenta destino, iban, account |
| Import | importe, cantidad, amount, monto |
| Data | fecha de liquidación, fecha rechazo, date |
| DNI | referencia externa, dni, nif |
| Nom | nombre cliente, nombre, titular |
| Motiu | motivo devolución, motivo, reason |

### 3.4.5 Devolucions agrupades (remeses)

Alguns bancs agrupen múltiples devolucions en un sol moviment:

```
Extracte bancari:  -55,00€ "DEVOLUCION RECIBOS"
Fitxer detall:     10€ + 20€ + 15€ + 10€ = 55€
```

#### Comportament

1. El moviment original (-55€) es marca com a "remesa pare"
2. Es creen transaccions filles per cada devolució identificada
3. El pare manté `amount`, `date`, `description` intactes

#### Estats de remesa (v1.12)

| Estat | Significat | Implicació fiscal |
|-------|------------|-------------------|
| `complete` | Totes les filles tenen donant | Totes resten al 182 |
| `partial` | Algunes filles sense donant | Només les resoltes resten |
| `pending` | Cap filla creada encara | No afecta el 182 |

> **Important:** Encara que una remesa sigui `partial`, les filles resoltes **sí que compten** per:
> - La fitxa del donant (returnCount)
> - El Model 182 (resta de l'import net)

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

### 3.4.6 Remeses parcials

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

### 3.4.7 Impacte fiscal

| Document | Càlcul |
|----------|--------|
| Model 182 | Total = Σ donacions - Σ devolucions |
| Certificats | Import = Σ donacions - Σ devolucions |

**Important:**
- El pare (remesa) NO té `contactId` → No es compta
- Les filles SÍ tenen `contactId` → Es compten com devolucions
- Si total ≤ 0 → Donant no apareix al Model 182

> **Regla clau (v1.12):** Les devolucions resten al Model 182 quan existeixen filles amb `contactId`, independentment de l'estat global de la remesa (`partial` o `complete`).

### 3.4.8 UI de devolucions

#### Banner (Moviments)
- Un sol banner vermell: "Hi ha devolucions pendents d'assignar"
- CTA "Revisar" → Filtra per devolucions pendents

#### Accions per fila

| Botó | Acció |
|------|-------|
| "Assignar donant" (vermell) | Diàleg assignació manual |
| 📄 (icona) | Obre importador fitxer |

#### Criteri del botó "Assignar donant" (v1.12)

El botó "Assignar donant" **només es mostra** si:
1. La transacció és una devolució individual (`transactionType === 'return'`)
2. I `contactId` és `null`

**Mai es mostra al pare d'una remesa de devolucions** (quan `isRemittance === true` i `remittanceType === 'returns'`).

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

### 3.4.9 Mode SuperAdmin: recreació de devolucions (NOU v1.12)

Eina **excepcional** per a migracions o correcció de dades històriques.

| Element | Descripció |
|---------|------------|
| Accés | Només SuperAdmin |
| Ubicació | Importador de devolucions → checkbox "Forçar recreació" |
| Acció | Elimina **totes** les filles d'un apunt pare i les recrea des del fitxer importat |

**Quan usar-la:**
- Migracions de dades històriques
- Correcció massiva d'errors de matching
- Sincronització després de canvis a la base de donants

**Flux:**
1. SuperAdmin activa "Forçar recreació de devolucions"
2. Sistema demana confirmació explícita
3. S'eliminen les filles existents del pare
4. Es recreen des del fitxer importat amb el matching actual
5. Es recalcula `remittanceStatus` del pare

> **Atenció:** Aquesta opció **no és el flux normal d'usuari**. Només s'ha d'usar per corregir inconsistències o migrar dades.

### 3.4.10 Límits del sistema

| Permès | NO permès |
|--------|-----------|
| Matching IBAN/DNI/Nom exacte | Fuzzy matching noms |
| Assignació amb confirmació | Assignació automàtica |
| Remeses parcials | Forçar remesa completa |
| Crear donant nou | Inventar dades |


## 3.5 REMESES OUT / PAGAMENTS (NOU v1.17)

### 3.5.1 Visió general

Les **remeses de pagaments** (OUT) permeten dividir una remesa de sortida (despesa) en múltiples transferències a proveïdors o empleats, amb generació de fitxer SEPA pain.001.

**Principi fonamental:** El moviment bancari original (pare) és **immutable**. El detall són transaccions filles amb `parentTransactionId`.

| Tipus | Direcció | Import pare | Exemple |
|-------|----------|-------------|---------|
| Remesa IN (quotes) | Ingrés (+) | Positiu | +5.430€ "REMESA RECIBOS" |
| Remesa OUT (pagaments) | Despesa (−) | Negatiu | −3.200€ "REMESA PAGAMENTS" |

### 3.5.2 Flux de treball

1. **Identificar moviment** → Despesa negativa agregada (ex: "REMESA NÒMINES TRIODOS")
2. **Menú ⋮** → "Dividir remesa"
3. **Pujar fitxer** → CSV/Excel amb detall de pagaments
4. **Mapejat columnes**:
   - 🟢 Import (obligatori)
   - 🔵 Nom beneficiari
   - 🔷 IBAN beneficiari
5. **Matching** → Cerca proveïdors/treballadors per IBAN o nom
6. **Validació** → Suma fills = |import pare| (tolerància ±0,02€)
7. **Processar** → Crea filles i (opcionalment) exporta SEPA

### 3.5.3 Model de dades

**Transacció pare (remesa de pagaments):**
```
isRemittance: true
remittanceId: '{uuid}'
remittanceItemCount: 15
```

**Transaccions filles (pagaments individuals):**
```
source: 'remittance'
parentTransactionId: '{id_remesa}'
isRemittanceItem: true
remittanceId: '{uuid}'
amount: -250.00          // negatiu (despesa)
contactId: '{proveidor}'
contactType: 'supplier' | 'employee'
```

**Document remesa (`/organizations/{orgId}/remittances/{remittanceId}`):**
```typescript
{
  id: string;
  orgId: string;
  parentTransactionId: string;
  direction: 'OUT';
  status: 'complete' | 'partial';

  totalAmount: number;        // Import total absolut (positiu)
  itemCount: number;          // Nombre de pagaments

  validation: {
    deltaCents: number;       // Diferència en cèntims (ideal: 0)
    isValid: boolean;         // |deltaCents| <= 2
    checkedAt: Timestamp;
  };

  createdAt: Timestamp;
  createdBy: string;
}
```

### 3.5.4 Invariant de suma

La suma absoluta de les filles ha de coincidir amb el valor absolut del pare.

```
|pare.amount| = Σ |fill.amount|     (tolerància ±0,02€)
```

**Exemple:**
- Pare: −3.200,00€
- Fills: −1.200€ + −800€ + −600€ + −600€ = −3.200€
- Validació: |−3.200| = |−3.200| ✓

**Guardrails:**
- Si `|delta| > 2 cèntims` → Banner d'avís a la UI
- Si `delta !== 0` → Botó "Processar" desactivat
- Camp `validation.deltaCents` guardat a Firestore per diagnòstic

### 3.5.5 Exportació SEPA pain.001

El sistema pot generar un fitxer SEPA pain.001.001.03 per enviar al banc.

**Requisits per exportar:**
- Tots els pagaments han de tenir IBAN vàlid
- Tots els imports han de ser positius (>0)
- La suma ha de quadrar amb el pare

**Camps del fitxer SEPA:**

| Element | Origen |
|---------|--------|
| `MsgId` | Auto-generat (`SEPA{timestamp}{random}`) |
| `CreDtTm` | Data actual ISO |
| `NbOfTxs` | Nombre de pagaments |
| `CtrlSum` | Suma total |
| `Dbtr/Nm` | Nom organització |
| `DbtrAcct/IBAN` | IBAN organització |
| `ReqdExctnDt` | Data d'execució (usuari) |
| `CdtTrfTxInf/*` | Detall per cada pagament |

**Fitxers relacionats:**
- `src/lib/sepa/generate-pain001.ts` — Generador XML
- `src/lib/sepa/parse-pain001.ts` — Parser (per importar)
- `src/lib/sepa/index.ts` — Exports públics

### 3.5.6 Desfer remesa OUT

Acció disponible al menú ⋮ del moviment pare si `isRemittance === true`.

**Flux "Desfer remesa":**
1. Elimina totes les transaccions filles
2. Elimina el document `/remittances/{remittanceId}`
3. Neteja camps del pare (`isRemittance`, `remittanceId`, `remittanceItemCount`)
4. Restaura pare a estat original

**Implementació:** Operació atòmica amb `writeBatch()` i `deleteField()`.

**Accés:** Qualsevol rol amb permisos d'edició (no requereix SuperAdmin).

### 3.5.7 UI i indicadors visuals

| Element | Comportament |
|---------|-------------|
| Badge pare | "✓ Remesa · 15 pagaments" (verd) |
| Fons fila | `bg-emerald-50/30` |
| Toggle filles | Clicar badge → expandeix/col·lapsa |
| Banner delta | Si `|delta| > 2¢` → avís taronja |
| Botó "Processar" | Desactivat si no quadra o falten IBANs |

### 3.5.8 Diferències amb Remeses IN

| Aspecte | Remeses IN (quotes) | Remeses OUT (pagaments) |
|---------|---------------------|-------------------------|
| Direcció | Ingrés (+) | Despesa (−) |
| Contactes | Donants | Proveïdors/Treballadors |
| Matching | DNI/IBAN/Nom | IBAN/Nom |
| Export | No | SEPA pain.001 |
| Camps fills | `contactType: 'donor'` | `contactType: 'supplier'/'employee'` |

### 3.5.9 Observabilitat

**Logs de desenvolupament:**
```
[REMESA-OUT] Validació: delta=0¢, items=15, pare=-3200.00€
[REMESA-OUT] Processant: 15 pagaments, remittanceId={uuid}
[REMESA-OUT] SEPA generat: pain001_{date}_{timestamp}.xml
```

**Camps de diagnòstic a Firestore:**
- `remittances/{id}.validation.deltaCents`
- `remittances/{id}.validation.checkedAt`
- `remittances/{id}.createdBy`


## 3.6 GESTIÓ DE CONTACTES

### 3.6.1 Tipus de Contactes

| Tipus | Subtipus |
|-------|----------|
| **Donants** | Particular, Empresa |
| **Proveïdors** | Per categoria |
| **Treballadors** | - |

### 3.6.2 Donants - Camps

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

### 3.6.3 Gestió d'Estat Actiu/Baixa

- **Filtre per estat**: Per defecte es mostren només actius
- **Badge visual**: Els donants de baixa mostren badge "Baixa"
- **Reactivar**: Botó per tornar a donar d'alta un soci
- **Edició**: Es pot canviar l'estat des del formulari d'edició
- **Importador**: Detecta columna "Estado/Estat" automàticament

### 3.6.4 Importador de Donants

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

### 3.6.5 Proveïdors - Camps

| Camp | Obligatori | Model 347 |
|------|------------|-----------|
| Nom | ✅ | ✅ |
| NIF/CIF | ⚠️ | ✅ Obligatori |
| Categoria per defecte | ❌ | ❌ |
| Adreça | ❌ | ❌ |
| IBAN | ❌ | ❌ |

### 3.6.6 Exportació de Donants a Excel (NOU v1.16)

Botó "Exportar" a la llista de donants per descarregar un fitxer Excel.

**Columnes exportades:**

| Columna | Font |
|---------|------|
| Nom | `donor.name` |
| NIF | `donor.taxId` |
| Quota mensual | `donor.monthlyAmount` (formatat €) |
| IBAN | `donor.iban` (formatat amb espais) |
| Estat | "Alta", "Baixa" o "Pendent devolució" |

**Comportament:**
- Llista ordenada alfabèticament per nom
- Nom del fitxer: `donants_YYYY-MM-DD.xlsx`
- Amplada de columnes ajustada automàticament

**Fitxer:** `src/lib/donors-export.ts`

### 3.6.7 DonorDetailDrawer

Panel lateral que s'obre clicant el nom d'un donant:
- Informació completa del donant
- Historial de donacions (paginat)
- **Historial de devolucions** (NOU v1.8)
- Resum per any
- Generació de certificats


## 3.7 PROJECTES / EIXOS D'ACTUACIÓ

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


## 3.8 INFORMES FISCALS

### 3.8.1 Model 182 - Declaració de Donacions

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

### 3.8.2 Model 347 - Operacions amb Tercers

**Data límit:** 28 de febrer

**Llindar:** > 3.005,06€ anuals per proveïdor

**Exportació:** CSV amb NIF, Nom, Import total

### 3.8.3 Certificats de Donació

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


## 3.9 CONFIGURACIÓ

### 3.9.1 Dades de l'Organització
Nom, CIF, adreça, ciutat, CP, telèfon, email, web, logo

### 3.9.2 Configuració de Certificats
Firma digitalitzada, nom signant, càrrec

### 3.9.3 Preferències
Llindar alertes contacte: 0€, 50€, 100€, 500€

### 3.9.4 Categories Comptables
Categories d'ingressos i despeses personalitzables

### 3.9.5 Gestió de Membres
Convidar, canviar rol, eliminar

### 3.9.6 Zona de Perill (SuperAdmin)

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

### 3.9.7 Sistema de traduccions (i18n)

#### Context i problema resolt

El sistema anterior (només `ca.ts`, `es.ts`, `fr.ts`) requeria un developer per afegir o modificar traduccions. Això bloquejava:
- Traducció externa (traductors sense accés al codi)
- Afegir idiomes nous sense deploy
- Correccions ràpides de textos

El nou sistema permet gestió completa des del SuperAdmin sense tocar codi.

#### Arquitectura

- **Source of truth editable**: Firebase Storage
  `i18n/{lang}.json`

- **Fallback local (repo)**:
  `src/i18n/locales/{lang}.json`

- **Legacy fallback**:
  Objectes TypeScript (`ca.ts`, `es.ts`, `fr.ts`) només per codi antic

#### Ordre de càrrega en runtime

1. JSON a Firebase Storage (`i18n/{lang}.json`)
2. JSON local del repositori (`src/i18n/locales/{lang}.json`)
3. Fallback a la clau (`"dashboard.title"`)

#### Contracte d'ús

- **`t.xxx.yyy`** → sistema legacy (objecte TypeScript)
- **`tr("xxx.yyy")`** → sistema nou (JSON pla)

**❌ Prohibit: `t("xxx.yyy")`** (no existeix, causa error de producció)

#### Idiomes disponibles

| Codi | Idioma | TS (legacy) | JSON | Estat |
|------|--------|-------------|------|-------|
| `ca` | Català | ✅ | ✅ | Base (complet) |
| `es` | Español | ✅ | ✅ | Complet |
| `fr` | Français | ✅ | ✅ | Complet |
| `pt` | Português | ❌ | ✅ | JSON-only |

#### Selector d'idioma

- Ubicació: Menú usuari (cantonada superior dreta)
- Persistència: `localStorage`
- Comportament: Canvi immediat sense recarregar

#### Operativa SuperAdmin (Traduccions)

1. Accedir a SuperAdmin → Traduccions
2. Seleccionar idioma
3. Descarregar JSON
4. Editar externament (Excel / POEditor / editor JSON)
5. Pujar JSON validat
6. Clicar "Publicar" (invalida cache global)

Els canvis són immediats per a tots els usuaris.

#### Afegir un idioma nou

1. Afegir codi d'idioma a `Language` (`src/i18n/index.ts`)
2. Crear `src/i18n/locales/{lang}.json` (copiat de `ca.json`)
3. Afegir idioma als selectors (app + SuperAdmin)
4. Descarregar plantilla via SuperAdmin
5. Traduir, pujar i publicar

#### Scripts

```bash
# Exportar traduccions TS a JSON i generar report de claus
npm run i18n:export
```

Exemple de report:
```
[i18n] Key comparison report:
  Base (ca): 850 keys
  es: ✓ Perfect match (850 keys)
  fr: ✓ Perfect match (850 keys)
  pt: ✓ Perfect match (850 keys)
```

#### Fitxers clau

| Fitxer | Responsabilitat |
|--------|-----------------|
| `src/i18n/index.ts` | Tipus `Language`, context, hook |
| `src/i18n/provider.tsx` | Provider, listener versió, carrega JSON |
| `src/i18n/json-runtime.ts` | Loader Storage/local, cache, `trFactory` |
| `src/i18n/locales/*.json` | Bundles JSON (fallback local) |
| `src/i18n/ca.ts`, `es.ts`, `fr.ts` | Traduccions TS legacy |
| `src/i18n/public.ts` | Traduccions pàgines públiques (NOU v1.25) |
| `scripts/i18n/export-all.ts` | Export TS → JSON |

Per a més detall operatiu, veure `docs/i18n.md`.


### 3.9.8 i18n per a Rutes Públiques (NOU v1.25)

#### Context i problema resolt

Les pàgines públiques (login, privacy, contact) estaven només en català amb textos hardcoded. Per millorar:
- SEO internacional amb canonical + hreflang
- Experiència d'usuari en el seu idioma preferit
- Consistència amb l'app privada (4 idiomes)

#### Arquitectura

Per evitar col·lisió entre `[lang]` i `[orgSlug]` (tots dos segments dinàmics al root),
les pàgines públiques estan sota un segment real `public`:

```
/src/app/public/[lang]/       → Segment real + dinàmic (intern)
  /page.tsx                   → HOME multiidioma
  /funcionalitats/page.tsx    → Funcionalitats
  /login/page.tsx             → Pàgina login multiidioma
  /privacy/page.tsx           → Política de privacitat
  /contact/page.tsx           → Pàgina de contacte
  layout.tsx                  → Validació idioma + SSG params

/src/app/page.tsx             → Redirect stub → /${lang}
/src/app/funcionalitats/page.tsx → Redirect stub → /${lang}/funcionalitats
/src/app/login/page.tsx       → Redirect stub → /${lang}/login
/src/app/privacy/page.tsx     → Redirect stub → /${lang}/privacy
/src/app/contacte/page.tsx    → Redirect stub → /${lang}/contact
/src/app/privacitat/page.tsx  → Redirect stub → /${lang}/privacy (legacy)
```

**Middleware rewrite:** `/fr/...` → `/public/fr/...` (URL pública es manté)

**Slugs reservats** (no es poden usar com orgSlug):
`ca`, `es`, `fr`, `pt`, `public`, `login`, `admin`, `dashboard`, `privacy`, `api`, `q`, `registre`, `redirect-to-org`

#### Idiomes suportats (rutes públiques)

| Codi | Idioma | URL exemple |
|------|--------|-------------|
| `ca` | Català | `/ca/login`, `/ca/privacy`, `/ca/contact` |
| `es` | Español | `/es/login`, `/es/privacy`, `/es/contact` |
| `fr` | Français | `/fr/login`, `/fr/privacy`, `/fr/contact` |
| `pt` | Português | `/pt/login`, `/pt/privacy`, `/pt/contact` |

#### Detecció automàtica d'idioma

Quan un usuari accedeix a `/login` (sense idioma), el sistema:

1. Llegeix l'header `Accept-Language` del navegador
2. Parseja i ordena per qualitat (`q=0.9`, etc.)
3. Troba el primer idioma suportat
4. Redirigeix a `/{lang}/login`

**Exemple:**
```
Accept-Language: pt-BR,pt;q=0.9,en;q=0.8
→ Redirigeix a /pt/login

Accept-Language: de-DE,de;q=0.9,en;q=0.8
→ Redirigeix a /ca/login (default, alemany no suportat)
```

#### Fitxers clau

| Fitxer | Responsabilitat |
|--------|-----------------|
| `src/lib/public-locale.ts` | Tipus `PublicLocale`, `detectPublicLocale()`, `generatePublicPageMetadata()` |
| `src/i18n/public.ts` | Traduccions completes per home, funcionalitats, login, privacy, contact (CA/ES/FR/PT) |
| `src/middleware.ts` | Rewrite `/fr/...` → `/public/fr/...` + protecció segments reservats |
| `src/app/public/[lang]/layout.tsx` | Validació idioma + `generateStaticParams()` per SSG |
| `src/app/public/[lang]/*/page.tsx` | Pàgines amb traduccions i metadades SEO |
| `src/components/IdleLogoutProvider.tsx` | RESERVED_SEGMENTS (inclou idiomes) |

#### SEO: Canonical i Hreflang

Cada pàgina pública genera metadades SEO correctes:

```typescript
// Exemple per /ca/privacy
{
  alternates: {
    canonical: "https://summasocial.app/ca/privacy",
    languages: {
      ca: "https://summasocial.app/ca/privacy",
      es: "https://summasocial.app/es/privacy",
      fr: "https://summasocial.app/fr/privacy",
      pt: "https://summasocial.app/pt/privacy"
    }
  }
}
```

Això genera els tags HTML:
```html
<link rel="canonical" href="https://summasocial.app/ca/privacy" />
<link rel="alternate" hreflang="ca" href="https://summasocial.app/ca/privacy" />
<link rel="alternate" hreflang="es" href="https://summasocial.app/es/privacy" />
<link rel="alternate" hreflang="fr" href="https://summasocial.app/fr/privacy" />
<link rel="alternate" hreflang="pt" href="https://summasocial.app/pt/privacy" />
```

#### Estructura de traduccions (public.ts)

```typescript
// src/i18n/public.ts
export interface PublicTranslations {
  common: {
    appName: string;
    tagline: string;
    close: string;
    backToHome: string;
    // ...
  };
  login: {
    title: string;
    welcomeTitle: string;
    welcomeDescription: string;
    sessionExpired: string;
    // ...
  };
  privacy: {
    title: string;
    sections: {
      whoWeAre: { title: string; intro: string; /* ... */ };
      whatData: { /* ... */ };
      // 9 seccions completes
    };
  };
  contact: {
    title: string;
    subtitle: string;
    responseTime: string;
  };
}

// Traduccions per cada idioma
const ca: PublicTranslations = { /* ... */ };
const es: PublicTranslations = { /* ... */ };
const fr: PublicTranslations = { /* ... */ };
const pt: PublicTranslations = { /* ... */ };

export const publicTranslations: Record<PublicLocale, PublicTranslations> = {
  ca, es, fr, pt
};
```

#### Ús a les pàgines

```tsx
// src/app/[lang]/login/page.tsx
import { getPublicTranslations } from '@/i18n/public';
import { isValidPublicLocale } from '@/lib/public-locale';

export default function LoginPage({ params }: { params: { lang: string } }) {
  const lang = isValidPublicLocale(params.lang) ? params.lang : 'ca';
  const t = getPublicTranslations(lang);

  return (
    <h1>{t.login.welcomeTitle}</h1>
    // "Benvingut a Summa Social" / "Bienvenido a Summa Social" / etc.
  );
}
```

#### Compatibilitat amb URLs antigues

Les URLs antigues continuen funcionant amb redirect:

| URL antiga | Redirigeix a |
|------------|--------------|
| `/login` | `/{detectat}/login` |
| `/privacy` | `/{detectat}/privacy` |
| `/privacitat` | `/{detectat}/privacy` |
| `/contacte` | `/{detectat}/contact` |

On `{detectat}` és l'idioma detectat via Accept-Language (default: `ca`).

#### Diferència amb i18n de l'app privada

| Aspecte | App privada (`/[orgSlug]/dashboard`) | Pàgines públiques (`/[lang]/*`) |
|---------|--------------------------------------|----------------------------------|
| **Traduccions** | `src/i18n/ca.ts`, `es.ts`, `fr.ts` + JSON | `src/i18n/public.ts` |
| **Tipus** | `Language` (`ca`, `es`, `fr`) | `PublicLocale` (`ca`, `es`, `fr`, `pt`) |
| **Persistència idioma** | `localStorage` (selector usuari) | URL path (`/ca/`, `/es/`, etc.) |
| **Detecció** | Preferència guardada | `Accept-Language` header |
| **SEO** | No aplica (app privada) | Canonical + hreflang |
| **SSG** | No (dinàmic) | Sí (`generateStaticParams`) |


## 3.10 IMPORTADOR STRIPE (NOU v1.9)

### 3.10.1 Visió general

L'importador Stripe permet dividir les liquidacions (payouts) de Stripe en transaccions individuals, identificant cada donació i separant les comissions.

| Característica | Valor |
|----------------|-------|
| **Format entrada** | CSV exportat de Stripe ("Pagos → Columnes predeterminades") |
| **Matching donants** | Per email (exacte, case insensitive) |
| **Creació automàtica donants** | NO |
| **Gestió comissions** | Despesa agregada per payout |

**Principi fonamental:** El moviment bancari original (payout) MAI es modifica.

### 3.10.2 Flux d'ús

```
1. L'usuari veu un ingrés de Stripe al llistat de moviments
2. Menú ⋮ → "Dividir remesa Stripe"
3. Puja el CSV exportat de Stripe
4. El sistema agrupa per Transfer (payout) i cerca el que quadra amb l'import bancari
5. Previsualització: donacions + comissions + matching donants
6. L'usuari revisa i assigna manualment els pendents
7. Confirma → Es creen les transaccions filles
```

### 3.10.3 Condició per mostrar l'acció

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

### 3.10.4 Camps CSV requerits

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

### 3.10.5 Filtratge automàtic

| Condició | Acció |
|----------|-------|
| `Status !== 'succeeded'` | Excloure silenciosament |
| `Amount Refunded > 0` | Excloure + mostrar avís |

### 3.10.6 Agrupació per payout

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

### 3.10.7 Match amb el banc

**Criteri:** Per import net (±0,02€ de tolerància)

```typescript
const tolerance = 0.02;
const match = Math.abs(payoutGroup.net - bankTransaction.amount) <= tolerance;
```

> ⚠️ El banc NO porta el `Transfer` (po_xxx). El match és exclusivament per import.

### 3.10.8 Matching de donants

| Prioritat | Criteri | Implementació |
|-----------|---------|---------------|
| 1 | Email | `donor.email.toLowerCase() === stripeRow.customerEmail.toLowerCase()` |

**Regles estrictes:**
- NO fuzzy matching
- NO crear donants automàticament
- Si no hi ha match → fila queda "Pendent d'assignar"

### 3.10.9 Transaccions generades

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

### 3.10.10 Model de dades

**Camps específics Stripe a Transaction:**

| Camp | Tipus | Descripció |
|------|-------|------------|
| `source` | `'stripe'` | Identifica origen |
| `transactionType` | `'donation' \| 'fee'` | Tipus de transacció |
| `stripePaymentId` | `string \| null` | ID pagament (`ch_xxx`) - Idempotència |
| `stripeTransferId` | `string \| null` | ID payout (`po_xxx`) - Correlació |
| `parentTransactionId` | `string` | ID del moviment bancari pare |

### 3.10.11 Impacte fiscal

| Document | Tractament |
|----------|------------|
| **Model 182** | Només compten les filles amb `contactId` i `transactionType: 'donation'` |
| **Certificats** | Import = Σ donacions Stripe del donant |
| **Comissions** | NO afecten fiscalitat donants (són despeses de l'entitat) |

### 3.10.12 UI

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

### 3.10.13 Errors i missatges

| Codi | Condició | Missatge |
|------|----------|----------|
| `ERR_NO_COLUMNS` | Falten columnes | "El CSV no té les columnes necessàries: {columnes}" |
| `ERR_NO_MATCH` | Cap payout quadra | "No s'ha trobat cap payout que coincideixi amb {amount} €" |
| `ERR_AMOUNT_MISMATCH` | Import no quadra | "L'import no quadra. Esperats {expected} €, calculats {actual} €" |
| `ERR_NO_BANK_FEES_CATEGORY` | Falta categoria | "No s'ha trobat la categoria de despeses bancàries" |
| `WARN_REFUNDED` | Hi ha reemborsos | "S'han exclòs {count} donacions reemborsades ({amount} €)" |
| `WARN_NO_DONOR` | Sense match | "{count} donacions pendents d'assignar donant" |

### 3.10.14 Límits del sistema

| Permès | NO permès |
|--------|-----------|
| Matching per email exacte | Fuzzy matching |
| Assignació manual pendents | Creació automàtica donants |
| Múltiples payouts al CSV | Connexió directa API Stripe |
| Exclusió reemborsos | Processament automàtic refunds |

### 3.10.15 Estructura de fitxers

```
/src/components/stripe-importer/
  ├── useStripeImporter.ts    # Hook amb lògica de parsing i matching
  ├── StripeImporter.tsx      # Component UI (modal)
  └── index.ts                # Exports
```

**Punt de connexió:** `transaction-table.tsx` → menú ⋮ si `canSplitStripeRemittance(tx)`


## 3.11 MÒDUL PROJECTES — JUSTIFICACIÓ ASSISTIDA (NOU v1.10)

### 3.11.0 Navegació del Mòdul Projectes (NOU v1.14)

El mòdul Projectes té una entrada única al sidebar amb un submenu col·lapsable.

**Estructura del sidebar:**

| Nivell | Element | Ruta |
|--------|---------|------|
| Pare | **Projectes** (icona FolderKanban) | — |
| └─ Fill 1 | Gestió de projectes | `/dashboard/project-module/projects` |
| └─ Fill 2 | Assignació de despeses | `/dashboard/project-module/expenses` |

**Component:** `Collapsible` de shadcn/ui

**Comportament:**
- Per defecte tancat
- S'obre/tanca fent clic al pare
- Icona `ChevronRight` rota 90° quan obert
- Estil suau per a subelements (mida i color reduïts)

**Fitxer:** `src/components/dashboard-sidebar-content.tsx`

**Traduccions:**
- `sidebar.projectModule`: "Projectes"
- `sidebar.projectModuleManage`: "Gestió de projectes"
- `sidebar.projectModuleExpenses`: "Assignació de despeses"

### 3.11.1 Objectiu del mòdul

Permetre a una persona tècnica quadrar la justificació econòmica d'un projecte (ACCD, Fons Català, etc.) a partir de les despeses reals existents, sense treballar en Excel, sense preconfiguracions rígides i sense modificar dades fins a la validació final.

> ⚠️ **Aquest mòdul és extern al core de Summa Social** i segueix el patró d'exports descrit a l'Annex C.

### 3.11.2 Principis de disseny (no negociables)

| Principi | Descripció |
|----------|------------|
| **Sense mapa obligatori** | No existeix un mapa rígid partides entitat ↔ finançador |
| **Sense classificació prèvia** | No es força la classificació prèvia de despeses |
| **Sense workflows** | No hi ha workflows d'aprovació ni estats de "justificat" |
| **Sense entitats noves** | No es creen entitats noves per simular |
| **Reversible** | Tot el procés és reversible fins a "Aplicar" |

### 3.11.3 Pantalla base: Gestió Econòmica del Projecte

| Element | Descripció |
|---------|------------|
| Targetes resum | Pressupostat / Executat / Pendent |
| Bloc principal | Seguiment Econòmic (partides) |
| CTA | "Quadrar justificació" |

**Cap procés de justificació obliga a sortir d'aquesta pantalla.**

#### Càlcul del pressupost

| Condició | Pressupost mostrat |
|----------|-------------------|
| Projecte **amb** partides | Suma de `budgetedAmountEUR` de totes les partides |
| Projecte **sense** partides | Camp `budgetEUR` del projecte |

```typescript
interface BudgetLinesData {
  sum: number;
  hasLines: boolean;  // Permet distingir "0 partides" de "partides amb sum=0"
}

const budgeted = budgetLinesData?.hasLines
  ? budgetLinesData.sum
  : (project.budgetEUR ?? 0);
```

#### Importador de pressupost (NOU v1.16)

Wizard d'importació de partides des d'Excel (.xlsx) amb 5 passos:

| Pas | Descripció |
|-----|------------|
| 1. Fitxer | Pujar fitxer Excel (.xlsx) |
| 2. Pestanya | Seleccionar sheet (si n'hi ha múltiples) |
| 3. Columnes | Mapar columnes: nom, import del finançador principal, codi (opcional) |
| 4. Agrupació | Triar mode: agrupar subpartides a partida o importar tal qual |
| 5. Revisió | Previsualització amb checkboxes per incloure/excloure |

**Característiques:**
- Auto-detecta columnes per patrons de capçalera
- Parseja formats EU (1.234,56) i EN (1234.56)
- Exclou automàticament files de totals/subtotals
- Mode "Agrupar" suma subpartides al seu pare (evita duplicitats)
- Substitueix completament el pressupost existent (batch delete + batch create)

**Important:**
- Només importa la columna del finançador principal (p.ex. ACCD)
- No suport multi-finançador ni contrapartida
- No suport PDF (només Excel)

**Fitxers:**
- `src/lib/budget-import.ts`: Utilitats de parsing
- `src/components/project-module/budget-import-wizard.tsx`: Wizard UI

### 3.11.4 Mode "Quadrar justificació del projecte"

- Vista assistida superposada (modal)
- L'usuari continua veient el seguiment econòmic
- Organització per **partida**, no per despesa
- Dos modes segons desviació:
  - **Infraexecució** → afegir despeses
  - **Sobreexecució** → treure o reduir imputacions

### 3.11.5 Infraexecució: afegir despeses

El sistema suggereix despeses del pool per defecte:
- Font = offBank (despeses fora de banc)
- Dins del període del projecte
- No assignades o parcialment assignades

Les suggerències es basen en:
- Família semàntica de la categoria
- Keywords a la descripció
- Import que encaixa amb el dèficit

L'usuari pot:
- Acceptar una proposta sencera
- **Ampliar criteris de cerca** (afegir fonts, fora període, altres projectes)
- Seleccionar manualment

**Les suggerències són heurístiques, mai bloquegen, mai escriuen dades.**

#### Algorisme de scoring (v1.12)

| Factor | Punts | Descripció |
|--------|-------|------------|
| Categoria coincident | +3 | La despesa pertany a la mateixa família semàntica |
| Descripció coincident | +2 | Keywords de la despesa apareixen a la partida |
| Import encaixa | +1 | L'import és ≤ dèficit de la partida |
| Assignada altre projecte | -3 | Penalització per risc de desquadrar altre projecte |

**Pool de candidats per defecte:**
- Font = offBank (despeses fora de banc)
- Dins del període del projecte
- No assignades o parcialment assignades

**Etiquetes informatives (NO afecten scoring):**

| Etiqueta | Condició | Visualització |
|----------|----------|---------------|
| Sense document | `hasDocument = false` | Badge groc |
| Categoria pendent | Categoria "Revisar" o buida | Badge taronja amb icona |
| Sense contrapart | `counterpartyName` buit | Badge gris |

> ⚠️ **Canvi v1.12:** "Sense document" i "sense contrapart" ja no penalitzen el scoring. Són etiquetes informatives que l'usuari veu però que no condicionen l'ordre de les suggerències.

#### Famílies semàntiques

```typescript
const CATEGORY_FAMILIES = {
  viatges: ['transport', 'dietes', 'allotjament', 'taxi', 'avió', ...],
  personal: ['nòmina', 'salari', 'seguretat social', ...],
  serveis: ['consultoria', 'assessorament', 'honoraris', ...],
  material: ['subministrament', 'fungible', 'oficina', ...],
  formacio: ['formació', 'curs', 'taller', ...],
  comunicacio: ['comunicació', 'màrqueting', 'difusió', ...],
};
```

#### Classificació de propostes

| Etiqueta | Criteri | Visualització |
|----------|---------|---------------|
| `perfect` | Delta ≤ 0,50€ | Badge verd "Exacte" |
| `close` | Delta ≤ 2% del dèficit | Badge blau "Proper" |
| `approx` | Resta | Badge gris "Aproximat" |

### 3.11.6 Sobreexecució: treure despeses

Es pot:
- Treure **tota** la despesa de la partida
- Treure només una **part** de l'import (split parcial)

La part treta queda:
- Dins del projecte
- Sense partida assignada

> ⚠️ **El split parcial és una funcionalitat clau, no un edge case.** Aquesta és la forma més habitual i realista de quadrar justificacions.

### 3.11.7 Simulació (capa crítica)

| Element | Comportament |
|---------|--------------|
| Moviments | Es fan en memòria |
| Escriptura | NO fins que l'usuari clica "Aplicar" |
| Visualització | Execució abans / després, efecte per partida |
| Aplicar | Usa els hooks existents (`useSaveExpenseLink`) |

### 3.11.8 Tipus de canvi i justificació

- El projecte defineix un tipus de canvi de referència
- Les despeses de terreny poden tenir moneda original
- La justificació sempre es quadra en EUR
- Camps de justificació:
  - No són obligatoris
  - S'editen només quan cal justificar
  - Existeixen per respondre al finançador, no per comptabilitat

### 3.11.9 Què NO fa Summa (explícit)

| NO fa | Motiu |
|-------|-------|
| No valida formalment justificacions | No som auditors |
| No bloqueja desviacions | L'usuari decideix |
| No obliga a quadrar al cèntim | Realisme operatiu |
| No substitueix el criteri tècnic | Eina, no workflow |
| No converteix la justificació en procés rígid | Flexibilitat > rigidesa |

> **Blindatge:** Les assignacions i simulacions del mòdul de projectes no modifiquen ni condicionen els càlculs fiscals ni els informes oficials (Model 182, certificats).

### 3.11.10 Estructura de fitxers

```
/src/app/[orgSlug]/
  ├── quick-expense/                    # Landing fora de dashboard (NOU v1.22)
  │   ├── layout.tsx                    # Layout mínim (OrganizationProvider)
  │   └── page.tsx                      # Pàgina landing
  └── dashboard/project-module/
      ├── expenses/
      │   ├── page.tsx                  # Llistat de despeses elegibles
      │   ├── [txId]/page.tsx           # Detall d'una despesa
      │   └── capture/page.tsx          # Captura ràpida de terreny (NOU v1.11)
      ├── projects/
      │   ├── page.tsx                  # Llista de projectes
      │   └── [projectId]/
      │       ├── budget/page.tsx       # Gestió Econòmica (pantalla base)
      │       └── edit/page.tsx         # Edició del projecte
      └── quick-expense/
          └── page.tsx                  # Redirect 307 a /{orgSlug}/quick-expense

/src/app/quick/
  └── page.tsx                          # Shortcut global → detecta org → landing

/src/components/project-module/
  ├── balance-project-modal.tsx         # Modal "Quadrar justificació"
  ├── quick-expense-screen.tsx          # Component UI de captura ràpida
  └── ...

/src/lib/
  ├── project-module-types.ts           # Tipus del mòdul
  └── project-module-suggestions.ts     # Scoring i combinacions (NOU v1.10)
```

### 3.11.11 Drag & Drop de documents a Assignació de despeses (NOU v1.16)

Permet pujar documents arrossegant-los directament sobre cada fila de despesa a la safata d'assignació (`/project-module/expenses`).

**Comportament:**

| Element | Descripció |
|---------|------------|
| Drop zone | Cada fila de la taula de despeses |
| Feedback visual | Ring blau i fons semitransparent durant arrossegament |
| Auto-naming | Format `YYYY.MM.DD_concepte_normalitzat.ext` |
| Tipus acceptats | PDF, imatges, Word, Excel |
| Mida màxima | 10 MB per fitxer |

**Implementació:**
- Despeses off-bank: S'afegeix a l'array `attachments[]`
- Despeses bancàries: S'assigna al camp `document` (objecte únic)
- Nom generat automàticament amb `buildDocumentFilename()`

**Component:** `DroppableExpenseRow` dins `expenses/page.tsx`

**Renomenar documents:**
- Botó llapis a cada attachment pujat
- Edició inline del nom (sense extensió)
- Enter per guardar, Escape per cancel·lar

### 3.11.12 Captura de despeses de terreny (NOU v1.11)

| Element | Descripció |
|---------|------------|
| Ruta | `/project-module/expenses/capture` |
| Objectiu | Pujada ràpida de comprovants des del mòbil |
| Criteri | "Captura ara, assignació després" |
| Temps objectiu | < 10 segons per pujada |

**Filosofia:**
- L'usuari de terreny (editor) fa foto i envia
- L'administració (admin) revisa, classifica i assigna
- Camps mínims: import, data, foto del comprovant
- Camp `needsReview: true` per defecte

**Rols:** (segons el camp `role` de `members`)
| Rol | Veu | Pot fer |
|-----|-----|---------|
| `viewer` | Res | Res |
| `user` | Només les seves pujades | Pujar comprovants |
| `admin` | Totes les pujades | Revisar, classificar, assignar |

> Nota: A la UI el rol `user` es mostra com "Editor" o "Usuari de terreny".

**Camps rellevants (OffBankExpense):**
- `needsReview: boolean` — indica si està pendent de revisió
- `attachments: Attachment[]` — fitxers adjunts (justificants)
- `uploadedBy: string` — UID de qui ha pujat
- `quickMode: boolean` — indica pujada ràpida (sense camps opcionals)

**Noms estandarditzats de fitxers (NOU v1.12):**
- Format: `{projectCode}_{date}_{concept}_{amount}{ext}`
- Exemple: `PROJ001_2025-01-15_Material_oficina_125.50.pdf`
- S'aplica a despeses off-bank i documents adjunts a transaccions

### 3.11.13 Model de dades

**Veure Annex C.3** per l'estructura Firestore completa del mòdul projectes.

Camps afegits v1.10:

| Col·lecció | Camp | Tipus | Descripció |
|------------|------|-------|------------|
| `projects` | `budgetEUR` | `number \| null` | Pressupost global (fallback si no hi ha partides) |
| `budgetLines` | `budgetedAmountEUR` | `number` | Import pressupostat de la partida |

### 3.11.14 Quick Expense Landing (NOU v1.22)

Pantalla dedicada per a l'entrada ràpida de despeses des del mòbil, **sense layout de dashboard** (sense sidebar, header ni breadcrumbs).

**Arquitectura de rutes:**

| Ruta | Funció | Tipus |
|------|--------|-------|
| `/{orgSlug}/quick-expense` | Landing canònica | Pàgina amb layout mínim |
| `/quick` | Shortcut global | Redirecció a landing (detecta org de l'usuari) |
| `/{orgSlug}/dashboard/project-module/quick-expense` | Ruta antiga | Redirect 307 per backward-compatibility |

**Decisions arquitectòniques:**

| Decisió | Motiu |
|---------|-------|
| Fora de `/dashboard` | Next.js App Router no permet "saltar" layouts intermedis |
| Layout propi mínim | Només `OrganizationProvider` + `InitializeData`, sense sidebar/header |
| Redirect 307 antic | Manté compatibilitat amb bookmarks i enllaços existents |
| Shortcut `/quick` | Permet "Afegir a pantalla d'inici" sense necessitat de saber l'org |

**Permisos:**

| Rol | Pot accedir |
|-----|-------------|
| `superadmin` | ✅ |
| `admin` | ✅ |
| `user` | ✅ |
| `viewer` | ❌ (redirigit a dashboard) |

**Flux d'accés (ACTUALITZAT v1.24):**

```
/quick → (si no user) → /login?next=/quick
       → (si user) → /redirect-to-org?next=/quick-expense
                                    ↓
                      detecta orgSlug via perfil/membres
                                    ↓
                      /{orgSlug}/quick-expense (landing sense sidebar)
                                    ↓
                      Botó "Tornar" → /{orgSlug}/dashboard/project-module/expenses
```

**Middleware Routing (ACTUALITZAT v1.24):**

El middleware (`src/middleware.ts`) protegeix certes rutes per evitar loops de redirecció:

```typescript
const PROTECTED_ROUTES = [
  '/redirect-to-org',  // Detecció d'org
  '/admin',            // Panell SuperAdmin
  '/login',            // Autenticació
  '/quick',            // Shortcut Quick Expense
  '/registre',         // Registre públic
];
```

**Regles del middleware:**
1. Mai redirigir rutes protegides (evita loops)
2. Sempre preservar `?next` quan redirigeix a `/redirect-to-org`
3. Sempre preservar tots els searchParams en redireccions

**Fitxers principals:**

| Fitxer | Funció |
|--------|--------|
| `src/middleware.ts` | Routing central amb PROTECTED_ROUTES |
| `src/app/[orgSlug]/quick-expense/layout.tsx` | Layout mínim (OrganizationProvider) |
| `src/app/[orgSlug]/quick-expense/page.tsx` | Pàgina landing |
| `src/app/quick/page.tsx` | Shortcut global (delega a redirect-to-org) |
| `src/app/[orgSlug]/dashboard/project-module/quick-expense/page.tsx` | Redirect 307 legacy |
| `src/components/project-module/quick-expense-screen.tsx` | Component UI compartit |

**Connexió amb expenses:**

El botó càmera a la safata de despeses (`/dashboard/project-module/expenses`) apunta a `/{orgSlug}/quick-expense`:

```tsx
<Link href={buildUrl('/quick-expense')}>
  <Camera className="h-4 w-4" />
</Link>
```

### 3.11.15 Hub de Guies Procedimentals (NOU v1.23)

Centre d'ajuda contextual amb guies pas-a-pas per a les operacions més freqüents de Summa Social.

**Ubicació:** `/{orgSlug}/dashboard/guides`

**Característiques:**
- Guies procedimentals amb format `whatIs` + `steps[]` + `avoid[]`
- Traduccions CA/ES/FR/PT amb fallback a català
- CTAs directes a pantalla + enllaç al manual
- Indicadors visuals: `lookFirst`, `doNext`, `avoid`, `costlyError`
- Validador i18n automatitzat (`npm run i18n:validate-guides`)

**Guies disponibles:**

| ID | Títol | Contingut |
|----|-------|-----------|
| `firstDay` | Primer dia | Checklist d'inici ràpid |
| `firstMonth` | Primer mes | Guia d'operativa mensual |
| `monthClose` | Tancament mensual | Procediment de tancament |
| `movements` | Gestió de moviments | Operativa bàsica |
| `importMovements` | Importar extracte | Pas a pas importació |
| `bulkCategory` | Categorització massiva | Selecció múltiple |
| `changePeriod` | Canviar de període | Filtre per data |
| `selectBankAccount` | Seleccionar compte | Multicompte bancari |
| `attachDocument` | Adjuntar document | Drag & drop |
| `returns` | Devolucions | Gestió de retorns |
| `remittances` | Remeses d'ingressos | Divisió de remeses |
| `splitRemittance` | Dividir remesa | Split manual |
| `stripeDonations` | Donacions Stripe | Importador Stripe |
| `travelReceipts` | Tiquets de viatge | Captura ràpida |
| `donors` | Gestió de donants | CRUD donants |
| `reports` | Informes fiscals | 182, 347, certificats |
| `projects` | Mòdul projectes | Justificació assistida |
| `monthlyFlow` | Flux mensual | Operativa recurrent |
| `yearEndFiscal` | Tancament fiscal | Fi d'any |
| `accessSecurity` | Accés i seguretat | Multi-usuari |
| `initialLoad` | Càrrega inicial | Primera configuració |

**Format de traduccions (claus i18n):**

```
guides.{guideId}.title        — Títol de la guia
guides.{guideId}.intro        — Introducció (opcional si whatIs)
guides.{guideId}.whatIs       — Descripció breu
guides.{guideId}.steps.0-N    — Passos ordenats
guides.{guideId}.avoid.0-N    — Errors a evitar
guides.{guideId}.lookFirst.0-N — Què mirar primer
guides.{guideId}.doNext.0-N   — Passos següents
guides.{guideId}.costlyError  — Error crític a destacar
guides.cta.{guideId}          — Text del botó CTA
```

**Fitxers principals:**

| Fitxer | Funció |
|--------|--------|
| `src/app/[orgSlug]/dashboard/guides/page.tsx` | Hub central amb llista de guies |
| `src/i18n/locales/{ca,es,fr,pt}.json` | Traduccions (claus `guides.*`) |
| `scripts/i18n/validate-guides-translations.ts` | Validador de completitud |

**Validador i18n:**

```bash
npm run i18n:validate-guides
```

Comprova:
- Claus page-level obligatòries (`guides.pageTitle`, `guides.viewManual`...)
- CTA per cada guia (`guides.cta.{guideId}`)
- Títol i intro/whatIs per cada guia
- Arrays amb índexos consecutius (sense gaps)
- Claus extra que no existeixen al base (CA)


## 3.10 PANELL SUPERADMIN GLOBAL (NOU v1.20)

Panell de control exclusiu per al SuperAdmin del sistema, accessible des de `/admin`.

### 3.10.1 Accés i Seguretat

| Aspecte | Detall |
|---------|--------|
| **URL** | `/admin` (sense orgSlug) |
| **Accés** | Només `SUPER_ADMIN_UID` (definit a `src/lib/data.ts`) |
| **Redirecció** | Si no és SuperAdmin → redirigeix a `/dashboard` |

### 3.10.2 Funcionalitats

| Secció | Descripció |
|--------|------------|
| **Estadístiques** | Total organitzacions, actives, suspeses |
| **Llista d'organitzacions** | Taula amb nom, CIF, estat, data creació |
| **Accions per organització** | Entrar (impersonar), suspendre/reactivar |
| **Nova organització** | Crear organització manualment |
| **Migrar slugs** | Migració d'organitzacions sense slug |

### 3.10.3 Reset de Contrasenya (NOU v1.20)

Secció per enviar correus de restabliment de contrasenya:

| Element | Detall |
|---------|--------|
| **Input** | Email de l'usuari |
| **Acció** | `sendPasswordResetEmail()` de Firebase Auth |
| **Seguretat** | Missatge genèric sempre ("Si l'adreça existeix...") per no revelar si l'email existeix |

### 3.10.4 Secció Diagnòstic (NOU v1.20)

Enllaços ràpids per a manteniment i diagnòstic:

| Enllaç | Destí |
|--------|-------|
| **Firebase Console** | `console.firebase.google.com/project/summa-social/overview` |
| **Cloud Logging** | `console.cloud.google.com/logs/query?project=summa-social` |
| **DEV-SOLO-MANUAL.md** | Path copiable al porta-retalls |

### 3.10.5 Salut del Sistema - Sentinelles (NOU v1.23)

Sistema automàtic de detecció d'incidències accessible només des de `/admin`.

**Model de dades:** Col·lecció `systemIncidents` a Firestore (només SuperAdmin pot llegir).

**Sentinelles:**

| ID | Nom | Tipus | Què detecta |
|----|-----|-------|-------------|
| S1 | Permisos | CRITICAL | Errors "Missing or insufficient permissions" |
| S2 | Moviments | CRITICAL | Errors CLIENT_CRASH a ruta /movimientos |
| S3 | Importadors | CRITICAL | Errors d'importació (banc, CSV, Stripe) |
| S4 | Exports | CRITICAL | Errors d'exportació (Excel, PDF, SEPA) |
| S5 | Remeses OUT | CRITICAL | Invariants violades (deltaCents≠0, isValid=false) |
| S6 | Encallaments | CONSULTA | Transaccions sense classificar > 30 dies |
| S7 | Fiscal 182 | CONSULTA | Donants sense dades fiscals |
| S8 | Activitat | CONSULTA | Organitzacions inactives > 60 dies |

**Política d'alertes:**
- S1–S5: Generen incidents automàtics quan es detecta l'error
- S6–S8: Només consulta, sense incidents automàtics

**Deduplicació:**
- Cada error genera una `signature` única (hash de type+route+message+stack)
- Si el mateix error es repeteix, s'incrementa el comptador
- Si un incident RESOLVED torna a aparèixer, es reobre automàticament

**Accions disponibles:**
- **ACK**: Silencia temporalment (l'he vist, però encara treballo en la solució)
- **Resolt**: Tanca l'incident (corregit)

**Filtres anti-soroll:**
Errors ignorats automàticament (no creen incidents):
- `ERR_BLOCKED_BY_CLIENT` — Adblockers o extensions del navegador
- `ResizeObserver loop` — Error benigne de layout
- `ChunkLoadError` / `Loading chunk` — Problemes de xarxa temporals
- `Network request failed` / `Failed to fetch` — Xarxa temporal
- `Script error.` — Errors cross-origin sense informació útil
- `AbortError` — Requests cancel·lats intencionalment

**Fitxers principals:**
- `src/lib/system-incidents.ts` — Model, deduplicació, filtres, buildIncidentFixPack
- `src/components/ErrorBoundaryGlobal.tsx` — Capturador client
- `src/components/admin/system-health.tsx` — UI sentinelles + botó "Copiar prompt"
- `functions/src/alerts/sendIncidentAlert.ts` — Cloud Function alertes email

**Alertes email (v1.1):**
- Cloud Function `sendIncidentAlert` envia email via Resend (proveïdor ja existent)
- Criteris d'enviament:
  - `severity === CRITICAL`
  - `status === OPEN` (mai si ACK o RESOLVED)
  - `count >= 2` O ruta core (movimientos, fiscalitat, project-module...)
  - Cooldown 24h per incident (un email per finestra)
- Email inclou prompt de reparació per Claude Code
- Flag `ALERTS_ENABLED` (per defecte `false` en dev)
- Sense dependències noves: usa Resend API directament

**Límits:**
- Només visible per SuperAdmin a `/admin`
- S6–S8 requereixen implementació de consultes específiques

### 3.10.6 Fitxers principals

| Fitxer | Funció |
|--------|--------|
| `src/app/admin/page.tsx` | Pàgina del panell SuperAdmin |
| `src/components/admin/create-organization-dialog.tsx` | Modal crear organització |
| `src/lib/data.ts` | Constant `SUPER_ADMIN_UID` |


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

## 7.5 Convencions UI/UX (NOU v1.17)

### 7.5.1 Contracte Cromàtic

| Color | Ús exclusiu |
|-------|-------------|
| **Vermell** (`text-destructive`, `bg-red-*`) | Errors, accions destructives, alertes |
| **Verd** (`text-green-*`, `bg-green-*`) | Èxit, estat positiu |
| **Groc/Taronja** (`text-amber-*`, `bg-amber-*`) | Advertències, pendents |
| **Gris** (`text-muted-foreground`) | Informació secundària, marcadors neutres |

**Regla clau:** El vermell MAI s'usa per indicadors neutres com marcadors de camps requerits (`*`).
Els camps requerits usen `text-muted-foreground` per evitar confusió amb errors.

### 7.5.2 Capçaleres de Pàgina

**Patró estàndard:**
```tsx
<h1 className="text-2xl font-bold tracking-tight font-headline">{títol}</h1>
<p className="text-muted-foreground">{subtítol descriptiu}</p>
```

| Pàgina | Títol | Subtítol |
|--------|-------|----------|
| Dashboard | "Dashboard" | "Visió general de la situació financera de l'organització." |
| Moviments | "Moviments" | "Importa, revisa i assigna categories, contactes i documents." |
| Donants | "Donants" | "Gestiona donants i prepara dades per al Model 182 i certificats." |
| Proveïdors | "Proveïdors" | "Gestiona proveïdors i prepara dades per al Model 347." |
| Assignació despeses | "Assignació de despeses" | "Assigna despeses sense projecte als teus projectes." |

### 7.5.3 Densitat de Taules

**Configuració base (`src/components/ui/table.tsx`):**

| Element | Estil |
|---------|-------|
| `TableRow` | `border-b border-border/50 hover:bg-muted/30` |
| `TableHead` | `h-10 px-3 text-xs text-muted-foreground` |
| `TableCell` | `px-3 py-2` |

**Principis:**
- Separadors subtils (`border-border/50`) per evitar soroll visual
- Hover suau (`bg-muted/30`) que no competeix amb el focus
- Capçaleres compactes però llegibles (`text-xs`, `h-10`)

### 7.5.4 Breadcrumbs

**Quan usar:**
- Pàgines de nivell 2 o superior (dins d'un mòdul)
- Quan la navegació amb botó "enrere" no és suficient

**Quan NO usar:**
- Pàgines de nivell 1 (Dashboard, Moviments, Donants, etc.)
- Pàgines amb navegació lateral visible

**Implementació:**
```tsx
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink asChild>
        <Link href="/dashboard/project-module/projects">{t.breadcrumb?.projects}</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>{t.breadcrumb?.expenseAssignment}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 7.5.5 Accessibilitat (Keyboard + Focus)

| Element | Comportament |
|---------|-------------|
| Diàlegs (Radix) | `Esc` tanca automàticament |
| Editors inline | `Enter` confirma, `Esc` cancel·la |
| Botons icona | Mínim `36x36px` hit target |
| Focus rings | `focus-visible:ring-2 focus-visible:ring-ring` |

**Aria labels obligatoris per botons només icona:**
```tsx
<Button variant="ghost" size="icon" aria-label={t.common.edit}>
  <Pencil className="h-4 w-4" />
</Button>
```

### 7.5.6 Empty States

**To institucional, mai humorístic:**
- ✅ "No hi ha moviments per mostrar"
- ❌ "Encara no has afegit cap moviment! Comença ara!"

**Estructura:**
```tsx
<div className="text-center py-8 text-muted-foreground">
  <p>{t.emptyState.noResults}</p>
</div>
```

### 7.5.7 Tooltips IA

Quan una acció usa IA, el tooltip ha de ser descriptiu i no implicar confirmació:
- ✅ "Classifica automàticament amb IA"
- ❌ "Vols que la IA classifiqui?"

### 7.5.8 Confirmacions Destructives

**Sempre requerides per:**
- Eliminació de dades
- Accions irreversibles
- Operacions massives

**Format:**
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t.confirm.deleteTitle}</AlertDialogTitle>
      <AlertDialogDescription>{t.confirm.deleteDescription}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive">{t.common.delete}</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
- Components com `DonorSearchCombobox` reescrits sense `cmdk` per evitar problemes de portals niuats

## 7.6 Onboarding / Benvinguda Inicial (ACTUALITZAT v1.20)

### Objectiu
Donar la benvinguda al primer admin d'una nova organització amb una única modal simple, sense bloquejar l'ús de l'aplicació.

### Principis
- **Modal única**: Una sola modal de benvinguda, sense checklist persistent.
- **No bloquejant**: L'usuari pot continuar sense completar res.
- **Primer admin**: Només el primer admin (per `joinedAt`) veu la modal.
- **Definitiu**: Un cop vista, `welcomeSeenAt` s'escriu i la modal no torna a aparèixer.

### Flux simplificat (v1.20)

1. **Primera càrrega del Dashboard**: Si l'usuari és el primer admin i `welcomeSeenAt` no existeix, es mostra la modal de benvinguda.
2. **Opció "Guia'm"**: Obre el wizard de configuració (dades fiscals, firma, categories).
3. **Opció "Començar pel meu compte"**: Tanca la modal i permet treballar directament.
4. **En ambdós casos**: Es marca `welcomeSeenAt` a Firestore → la modal no torna.

### Model de dades

```typescript
// A Organization (src/lib/data.ts)
onboarding?: {
  welcomeSeenAt?: string;  // YYYY-MM-DD quan el primer admin ha vist la modal
};
```

### Lògica de decisió

| Condició | Resultat |
|----------|----------|
| `welcomeSeenAt` existeix | No mostrar modal |
| Usuari NO és primer admin | No mostrar modal |
| Usuari és primer admin + `welcomeSeenAt` no existeix | Mostrar modal |

**Primer admin**: L'admin amb `joinedAt` més antic. Si només hi ha un admin, és ell. Si no hi ha `joinedAt`, fallback a únic admin.

### Fitxers principals

| Fitxer | Funció |
|--------|--------|
| `src/lib/onboarding.ts` | `isFirstAdmin()`, `shouldShowWelcomeModal()` |
| `src/components/onboarding/WelcomeOnboardingModal.tsx` | Modal de benvinguda |
| `src/components/onboarding/OnboardingWizard.tsx` | Wizard de configuració (obert des de modal o Configuració) |

### Canvis respecte v1.18

| v1.18 | v1.20 |
|-------|-------|
| Checklist persistent al Dashboard | Modal única, apareix una sola vegada |
| Pàgina `/onboarding` dedicada | Eliminada, wizard s'obre des de modal o Configuració |
| `OnboardingChecklist.tsx` | Eliminat |
| `onboardingSkippedAt` | Substituït per `onboarding.welcomeSeenAt` |
| Lògica complexa `computeOnboardingStatus()` | Simplificat a `shouldShowWelcomeModal()` |

## 7.7 Perfil de Rendiment (NOU v1.21)

### Escala objectiu
Summa Social està optimitzat per a **<100 usuaris concurrents** amb marge operatiu. El límit pràctic depèn del volum de dades per organització (transaccions, contactes).

### Optimitzacions aplicades

| Problema | Solució | Fitxer |
|----------|---------|--------|
| N+1 queries (links) | Batching amb `documentId()` en chunks de 10 | `src/hooks/use-project-module.ts:172` |
| N+1 queries (expenses) | Batching paral·lel off-bank + bank | `src/hooks/use-project-module.ts:388` |
| N+1 llistat projectes | Lazy-load de budgetLines, usar `project.budgetEUR` | `src/app/.../projects/page.tsx` |
| Instància única | `maxInstances: 3` a Firebase App Hosting | `apphosting.yaml` |
| Listener audit logs | `limit(100)` | `src/app/.../super-admin/page.tsx:149` |
| Listener donor drawer | `limit(500)` + filtre client | `src/components/donor-detail-drawer.tsx:157` |

### Patró de batching Firestore

Quan cal carregar múltiples documents per ID, usar aquest patró:

```typescript
import { documentId } from 'firebase/firestore';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Carregar en paral·lel (màxim 10 IDs per query, límit Firestore)
const chunks = chunkArray(ids, 10);
const snaps = await Promise.all(
  chunks.map((chunkIds) =>
    getDocs(query(collectionRef, where(documentId(), 'in', chunkIds)))
  )
);
```

### Listeners `onSnapshot` - Classificació

| Fitxer | Tipus | Decisió |
|--------|-------|---------|
| `use-collection.tsx` | Hook base | CORE - no tocar |
| `use-doc.tsx` | Hook base | CORE - no tocar |
| `use-bank-accounts.ts` | Comptes bancaris | OK - pocs docs, real-time útil |
| `donor-detail-drawer.tsx` | Transaccions donant | Limitat a 500, filtre client |
| `super-admin/page.tsx` | Audit logs | Limitat a 100 |

### Què NO cal fer (sense evidència de necessitat)

- Refactors de model (denormalitzacions)
- Observabilitat avançada (Sentry)
- Pujar `maxInstances` a 5+
- Reescriure hooks base
- Paginació infinita a moviments (només si org té >1000 visibles)

### Quan escalar

Indicadors que requeririen intervenció:
- Latència UI >2s consistent
- Errors Firestore per quota
- Usuaris reportant lentitud


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

## Completades v1.16
- ✅ Drag & drop de documents a la safata de despeses (per fila)
- ✅ Auto-naming de documents amb `buildDocumentFilename()` (format YYYY.MM.DD_concepte.ext)
- ✅ Renomenar documents inline (botó llapis, Enter/Escape)
- ✅ Exportació Excel de donants (nom, NIF, quota, IBAN, estat)

## Completades v1.10
- ✅ Mòdul Projectes: justificació assistida per partides
- ✅ Mode infraexecució: afegir despeses amb suggerències heurístiques
- ✅ Mode sobreexecució: treure o reduir imputacions (split parcial)
- ✅ Simulació en memòria fins a "Aplicar"
- ✅ Pressupost unificat als cards (suma partides vs global)
- ✅ Scoring per famílies semàntiques (viatges, personal, serveis, etc.)

## Completades v1.9
- ✅ Importador Stripe (dividir payouts en donacions + comissions)
- ✅ Matching donants per email exacte
- ✅ Traçabilitat completa (stripePaymentId, stripeTransferId)

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


# ═══════════════════════════════════════════════════════════════════════════════
# 11. HISTORIAL DE VERSIONS
# ═══════════════════════════════════════════════════════════════════════════════

| Versió | Data | Canvis principals |
|--------|------|-------------------|
| 1.0 | Nov 2024 | Versió inicial, single-user |
| 1.5 | Nov 2024 | Multi-organització, sistema de rols |
| 1.6 | Des 2024 | DonorDetailDrawer, certificats amb firma, Zona Perill, divisor remeses |
| 1.7 | Des 2024 | Excel Model 182 per gestoria, suport Excel remeses, camps city/province, session persistence |
| 1.8 | Des 2024 | Importador devolucions del banc, remeses parcials, suport multi-banc (Santander/Triodos), tests unitaris, fixes modals Radix, UX simplificada |
| 1.9 | Des 2025 | Importador Stripe (payouts → donacions + comissions), matching per email, traçabilitat completa |
| **1.10** | **Des 2025** | **Mòdul Projectes: justificació assistida per partides, suggerències heurístiques, split parcial de despeses, simulació en memòria** |
| **1.11** | **Des 2025** | **Captura de despeses de terreny (quickMode, pujada ràpida <10s), i18n Francès complet (fr.ts), selector d'idioma amb 3 opcions** |
| **1.12** | **Des 2025** | **Multicomptes bancaris (CRUD, filtre per compte, traçabilitat bankAccountId), filtre per origen (source), diàleg crear donant a importador devolucions, mode bulk NET** |
| **1.13** | **Des 2025** | **Selecció múltiple a Moviments (checkboxes + accions en bloc), assignar/treure categoria massivament, batched writes Firestore (50 ops/batch), traduccions CA/ES/FR** |
| **1.14** | **Des 2025** | **Reorganització UX Moviments (FiltersSheet, TableOptionsMenu), drag & drop documents, indicadors visuals remeses processades, modal RemittanceSplitter redissenyat (wide layout), sidebar Projectes col·lapsable** |
| **1.15** | **Des 2025** | **Documentació completa de regles de normalització de dades (noms, NIF/NIE/CIF, IBAN, email, telèfon E.164, adreces, normalizedName per deduplicació)** |
| **1.16** | **Des 2025** | **Importador de pressupost Excel (wizard 5 passos, agrupació subpartides, columna finançador principal), fix redirect-to-org O(1) amb collectionGroup, fix idle logout redirecció a login d'org** |
| **1.17** | **Des 2025** | **Polish UX: convencions UI documentades (contracte cromàtic, capçaleres estàndard, densitat taules, breadcrumbs, accessibilitat, empty states, tooltips IA, confirmacions destructives)** |
| **1.18** | **Des 2025** | **Onboarding: configuració inicial per admins (checklist Dashboard, wizard, "Ho faré després", camp onboardingSkippedAt), no bloquejant, discret, definitiu** |
| **1.19** | **Des 2025** | **Simplificació onboarding a modal de benvinguda única per primer admin, eliminació checklist persistent** |
| **1.20** | **Des 2025** | **Panell Admin: reset contrasenya + secció diagnòstic (Firebase Console, Cloud Logging, DEV-SOLO-MANUAL.md). Dashboard: neteja blocs Celebracions/Alertes, millora taula categories (exclou comissions), bloc projectes condicional. Nou document docs/DEV-SOLO-MANUAL.md per manteniment.** |
| **1.21** | **Des 2025** | **i18n pàgina pública (ca/es), SEO tags amb canonical + hreflang, mòdul documents pendents hardened (permisos, guardrails, UI responsive)** |
| **1.22** | **29 Des 2025** | **Quick Expense Landing: ruta canònica `/{orgSlug}/quick-expense` fora de `/dashboard` (sense sidebar/header), shortcut global `/quick`, redirect 307 per backward-compatibility, arquitectura neta sense hacks de layout** |
| **1.23** | **30 Des 2025** | **System Health Sentinelles (S1–S8): detecció automàtica d'errors amb deduplicació, alertes email per incidents CRITICAL, filtres anti-soroll. Hub de Guies: guies procedimentals amb traduccions CA/ES/FR/PT (changePeriod, selectBankAccount, monthClose), validador i18n.** |
| **1.24** | **31 Des 2025** | **Routing hardening: simplificació `/quick` (delega a `/redirect-to-org`), middleware amb PROTECTED_ROUTES per evitar loops, preservació de `?next` params.** |
| **1.25** | **31 Des 2025** | **i18n rutes públiques complet (CA/ES/FR/PT): estructura `[lang]` per login, privacy i contact. Detecció automàtica idioma via Accept-Language. SEO amb canonical + hreflang per 4 idiomes. Redirect stubs per compatibilitat URLs antigues. Nou fitxer `src/i18n/public.ts` amb traduccions separades de l'app privada.** |
| **1.26** | **31 Des 2025** | **Resolució col·lisió `[lang]` vs `[orgSlug]`: arquitectura `public/[lang]` amb middleware rewrite (URL pública intacta). HOME i Funcionalitats multiidioma. x-default hreflang. Slugs reservats (ca/es/fr/pt/public). Rutes canòniques: `/{lang}/funcionalitats`, `/{lang}/privacy`, `/{lang}/contact`. Aliases naturals: FR (`fonctionnalites`, `confidentialite`), ES (`funcionalidades`, `privacidad`, `contacto`), PT (`funcionalidades`, `privacidade`, `contacto`).** |


# ═══════════════════════════════════════════════════════════════════════════════
# 12. ÀMBIT I LÍMITS DEL PRODUCTE
# ═══════════════════════════════════════════════════════════════════════════════

## 12.1 Què NO Farà Summa Social (Per Disseny)

| Funcionalitat Exclosa | Motiu |
|-----------------------|-------|
| **Generació de fitxers BOE** | Les entitats deleguen a gestories |
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
│   5. DASHBOARD DE SEGUIMENT                                    │
│      Visualització d'informació clau per seguiment general     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 12.3 Què NO Garanteix el Sistema

| NO garanteix | Motiu |
|--------------|-------|
| Absència d'errors humans | L'usuari pot introduir dades incorrectes |
| Substitució de revisió professional | No som assessors fiscals ni auditors |
| Validació de documents oficials | Els fitxers generats són per a la gestoria |
| Bloqueig d'accions incorrectes | L'usuari té llibertat operativa total |

> **Responsabilitat:** Summa Social és una eina de suport. La responsabilitat final sobre les dades i els informes fiscals recau en l'organització i els seus assessors professionals.

## 12.4 Públic Objectiu

| Sí | No |
|----|----|
| Entitats petites i mitjanes d'Espanya | Grans entitats amb ERP propi |
| Entitats sense ànim de lucre | Empreses amb ànim de lucre |
| Fundacions petites | Administracions públiques |
| Associacions culturals, socials | Entitats fora d'Espanya |

## 12.4 Filosofia de Desenvolupament

> **"Menys és més"**
>
> Summa Social resol **molt bé** uns problemes concrets (conciliació + fiscalitat) en lloc de resoldre **regular** molts problemes diferents.
>
> Cada funcionalitat nova ha de passar el filtre:
> - Redueix errors a l'entitat? ✅
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
| "Gestoria" | Professional extern | L'entitat mateixa |
| "Matching exacte" | IBAN/DNI/Nom idèntic | Fuzzy, aproximat |
| "Remesa parcial" | Algunes devolucions pendents | Remesa incompleta per error |
| "Payout Stripe" | Liquidació de Stripe al banc (po_xxx) | Donació individual |
| "Comissió Stripe" | Despesa agregada per payout | Cost per donació |
| "Remesa Stripe" | Payout dividit en donacions individuals | Connexió API Stripe |


# ═══════════════════════════════════════════════════════════════════════════════
# 15. NORMALITZACIÓ DE DADES
# ═══════════════════════════════════════════════════════════════════════════════

## 15.1 Principi General

Totes les dades d'entrada es normalitzen abans de desar-les a Firestore. L'objectiu és garantir:
- Consistència en les cerques i el matching
- Deduplicació fiable
- Formats vàlids per a fiscalitat (Model 182, 347)

> **Fitxer principal**: `src/lib/normalize.ts`

## 15.2 Noms de Persones Físiques

### Regles de capitalització

| Entrada | Sortida | Regla |
|---------|---------|-------|
| `JOAN GARCIA` | `Joan Garcia` | Cada paraula amb majúscula inicial |
| `maria del carmen` | `Maria del Carmen` | Partícules en minúscula |
| `pau de la font` | `Pau de la Font` | Partícules: de, del, de la, de les, dels |

### Partícules i excepcions

Les següents partícules es mantenen en minúscula quan van entre mots:
- `de`, `del`, `de la`, `de les`, `dels`
- `i`, `y`
- `la`, `el`, `les`, `els` (quan són articles)

**Apostrofats** (català):
- `d'Amat` → manté l'apòstrof i majúscula al nom
- `l'Hospitalet` → manté format

**Exemple**:
```
Input:  "MARIA DELS ANGELS DE LA FONT I PUIG"
Output: "Maria dels Àngels de la Font i Puig"
```

## 15.3 Noms de Persones Jurídiques

### Sufixos de societat

| Entrada | Sortida normalitzada |
|---------|---------------------|
| `S L`, `s.l`, `SL` | `S.L.` |
| `S A`, `s.a`, `SA` | `S.A.` |
| `S L U`, `slu`, `S.L.U` | `S.L.U.` |
| `S COOP`, `s. coop` | `S.Coop.` |
| `S C P`, `scp` | `S.C.P.` |
| `C B`, `cb` | `C.B.` |

**Exemple**:
```
Input:  "CONSULTORIA TECH sl"
Output: "Consultoria Tech S.L."
```

### Fundacions i associacions

| Tipus | Paraules clau | Tracte |
|-------|---------------|--------|
| Fundació | `Fundació`, `Fundación` | Majúscula inicial |
| Associació | `Associació`, `Asociación` | Majúscula inicial |

## 15.4 NIF, NIE i CIF

### Formats acceptats i normalització

| Entrada | Sortida | Vàlid |
|---------|---------|-------|
| `12345678-Z` | `12345678Z` | ✅ |
| `12345678 z` | `12345678Z` | ✅ |
| `x-1234567-w` | `X1234567W` | ✅ |
| `b-12345678` | `B12345678` | ✅ |

### Regles

1. **Eliminar**: espais, guions, punts
2. **Convertir**: tot a majúscules
3. **Validar**: lletra de control (opcional, només avís)

### Patrons vàlids

| Tipus | Patró | Exemple |
|-------|-------|---------|
| NIF | `8 dígits + lletra` | `12345678Z` |
| NIE | `X/Y/Z + 7 dígits + lletra` | `X1234567W` |
| CIF | `lletra + 8 caràcters` | `B12345678` |

## 15.5 IBAN

### Normalització

| Entrada | Sortida |
|---------|---------|
| `ES91 2100 0418 4502 0005 1332` | `ES91210004184502000051332` |
| `es91-2100-0418-4502-0005-1332` | `ES91210004184502000051332` |

### Regles

1. **Eliminar**: espais, guions
2. **Convertir**: tot a majúscules
3. **Validar**: longitud 24 caràcters (Espanya)

> **Emmagatzematge**: Sempre sense espais ni guions
> **Visualització**: Amb espais cada 4 caràcters (`formatIBAN()`)

## 15.6 Email

### Normalització

| Entrada | Sortida |
|---------|---------|
| `  Joan.Garcia@Gmail.COM  ` | `joan.garcia@gmail.com` |
| `Maria@Empresa.Es` | `maria@empresa.es` |

### Regles

1. **Trim**: eliminar espais al principi i final
2. **Lowercase**: tot en minúscules
3. **Validar**: format email bàsic (conté `@` i `.`)

## 15.7 Telèfon

### Normalització a E.164

| Entrada | Sortida |
|---------|---------|
| `612 34 56 78` | `+34612345678` |
| `+34 612-345-678` | `+34612345678` |
| `0034612345678` | `+34612345678` |
| `612345678` | `+34612345678` |

### Regles

1. **Eliminar**: espais, guions, parèntesis, punts
2. **Normalitzar prefix**:
   - Si comença per `0034` → reemplaçar per `+34`
   - Si comença per `34` → afegir `+`
   - Si comença per `6` o `9` → afegir `+34`
3. **Resultat**: format E.164 (`+34XXXXXXXXX`)

> **Emmagatzematge**: Format E.164
> **Visualització**: Amb espais (`formatPhone()`)

## 15.8 Adreces

### Camps separats (no normalització agressiva)

Les adreces es desen en camps separats sense modificar excessivament:

| Camp | Normalització |
|------|---------------|
| `street` | Trim, sense canvis de capitalització |
| `city` | Trim |
| `province` | Trim |
| `postalCode` | Trim, només dígits, 5 caràcters |
| `country` | Trim, default `Espanya` |

### Codi Postal

| Entrada | Sortida |
|---------|---------|
| `08001` | `08001` |
| `8001` | `08001` |
| `08-001` | `08001` |

> **Regla**: Sempre 5 dígits, amb zero inicial si cal

## 15.9 Espais en Blanc

### Regles generals

1. **Trim**: eliminar espais al principi i final de tots els camps
2. **Col·lapsar**: múltiples espais consecutius → un sol espai
3. **Eliminar NBSP**: reemplaçar `\u00A0` per espai normal

```typescript
function normalizeWhitespace(s: string): string {
  return s
    .replace(/\u00A0/g, ' ')  // NBSP → espai
    .replace(/\s+/g, ' ')     // col·lapsar
    .trim();                   // trim
}
```

## 15.10 Clau de Deduplicació (normalizedName)

### Propòsit

Camp calculat per detectar duplicats i fer matching aproximat.

### Càlcul

```typescript
function normalizedName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // eliminar accents
    .replace(/[^a-z0-9]/g, '')        // només alfanumèric
    .trim();
}
```

### Exemples

| Nom original | normalizedName |
|--------------|----------------|
| `Joan García` | `joangarcia` |
| `María del Carmen` | `mariadelcarmen` |
| `Fundació l'Àncora` | `fundaciolancora` |

> **Ús**: Cercar duplicats, no per matching fiscal (que usa NIF/IBAN exactes)


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

Summa Social és una aplicació de gestió financera per entitats espanyoles.
Gestiona moviments bancaris, donants, proveïdors i fiscalitat (Model 182, 347, certificats).
El mòdul de devolucions resol el problema de rebuts retornats pel banc sense identificar.

## CONCEPTES CLAU

- DEVOLUCIÓ = Rebut que el banc no ha pogut cobrar i retorna a l'entitat
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
/organizations/{orgId}/projectModule/_/expenseLinks/{txId}
```

**Projectes del mòdul:**

```
/organizations/{orgId}/projectModule/_/projects/{projectId}
```

> Nota: El document `_` és un placeholder tècnic necessari per complir l'estructura de Firestore (segments alterns col·lecció/document).

### Join Client-Side

El mòdul extern fa el join entre:
- La despesa (del feed `exports/projectExpenses/items`)
- L'assignació (de `projectModule/_/expenseLinks`)

Summa Social no coneix ni gestiona les assignacions.

## C.4 Límits Explícits del Producte

Summa Social **NO**:
- Gestiona projectes (més enllà dels eixos d'actuació existents)
- Gestiona subvencions
- Fa justificacions econòmiques
- Controla pressupostos de projectes

Qualsevol funcionalitat en aquesta línia és **externa i opcional**, i s'ha d'implementar fora del core mitjançant el patró d'exports descrit.

## C.5 Firestore Rules

### CollectionGroup per membres (v1.16)

Permet a un usuari trobar les seves membresies via `collectionGroup`:

```javascript
match /{path=**}/members/{memberId} {
  allow read: if isSignedIn() && request.auth.uid == memberId;
}
```

### Exports i projectModule

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

## C.6 Índexos Firestore (Mòdul Projectes)

Els índexos necessaris per al mòdul de projectes:

### expenseLinks (projectModule/_/expenseLinks)

| Col·lecció | Camps | Ordre | Ús |
|------------|-------|-------|-----|
| expenseLinks | `projectIds` (array-contains) | - | Filtrar despeses per projecte |
| expenseLinks | `budgetLineIds` (array-contains) | - | Filtrar despeses per partida pressupostària |

> **Nota**: No s'utilitza `orderBy` en aquestes queries per evitar necessitat d'índexos compostos. L'ordenació es fa client-side.

### exports/projectExpenses/items

| Col·lecció | Camps | Ordre |
|------------|-------|-------|
| items | `isEligibleForProjects`, `deletedAt`, `date` | date DESC |

> **Nota**: Aquest índex ja existeix per al feed de despeses elegibles.

### Backfill de budgetLineIds

Les assignacions creades abans de la implementació del camp `budgetLineIds` no el tindran poblat. El codi implementa un fallback:
1. Si la query per `budgetLineIds` retorna 0 resultats i hi ha `projectId` disponible
2. Es carreguen els links del projecte i es filtra client-side per `assignments[].budgetLineId`
3. Es trackeja amb `expenses.filter.fallback_used` per monitorització


# ═══════════════════════════════════════════════════════════════════════════════
# ANNEX D: NOVETATS DEL PRODUCTE (v1.26)
# ═══════════════════════════════════════════════════════════════════════════════

## D.1 Descripció del Sistema

Sistema unificat per comunicar novetats del producte als usuaris a través de múltiples canals:
- **Campaneta (instància)**: Mostra N últimes novetats dins l'aplicació
- **Web públic**: Pàgina `/novetats` per SEO i sharing
- **Social**: Copy per X i LinkedIn (manual)

## D.2 Arquitectura

### Font única: Firestore `productUpdates`

```
/productUpdates/{updateId}
  id: string
  title: string
  description: string
  link: string | null
  isActive: boolean
  publishedAt: Timestamp
  createdAt: Timestamp

  // Detall (TEXT PLA, NO HTML)
  contentLong?: string | null
  guideUrl?: string | null
  videoUrl?: string | null

  // Web
  web?: {
    enabled: boolean
    slug: string
    excerpt?: string | null
    content?: string | null
  } | null

  // Social
  social?: {
    enabled: boolean
    xText?: string | null
    linkedinText?: string | null
    linkUrl?: string | null
  } | null
```

### Web públic: JSON estàtic (NO Firestore directe)

El web públic `/novetats` NO llegeix Firestore directament per seguretat.

**Flux:**
1. SuperAdmin genera novetat amb `web.enabled: true`
2. SuperAdmin clica "Exportar web JSON" → descarrega `novetats-data.json`
3. Commit manual a `public/novetats-data.json`
4. Deploy

## D.3 Guardrails (NO NEGOCIABLES)

| Regla | Motiu |
|-------|-------|
| NO HTML a `contentLong` | XSS prevention, render segur |
| NO `dangerouslySetInnerHTML` | Seguretat |
| NO Firestore list públic | Evitar leaks i costos |
| NO `undefined` a writes | Firestore errors |
| NO deps noves | Estabilitat |

## D.4 Fitxers Principals

```
src/hooks/use-product-updates.ts           # Hook Firestore + fallback
src/lib/render-structured-text.tsx         # Render text pla (NO HTML)
src/lib/firestore-utils.ts                 # stripUndefined helpers
src/components/notifications/              # Campaneta + modal
src/components/admin/product-updates-section.tsx  # SuperAdmin
src/app/api/ai/generate-product-update/    # Endpoint IA
src/app/public/[lang]/novetats/            # Web públic
public/novetats-data.json                  # JSON estàtic web
```

## D.5 Ritual Publicació Web

1. Crear/editar novetat amb `web.enabled: true` a SuperAdmin
2. Clicar "Exportar web JSON"
3. Substituir `public/novetats-data.json` amb el fitxer descarregat
4. `git add && git commit && git push`
5. Deploy (Firebase Hosting)

> **Important**: El web NO s'actualitza automàticament. Cal fer commit + deploy.


# ═══════════════════════════════════════════════════════════════════════════════
# FI DEL DOCUMENT
# Última actualització: Desembre 2025 - Versió 1.26
# ═══════════════════════════════════════════════════════════════════════════════
