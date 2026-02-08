# CLAUDE — Model d'autorització operativa (Summa Social)

Aquest document defineix **quan Claude Code pot executar sense preguntar**
i **quan ha d'aturar-se obligatòriament** per decisió humana.

────────────────────────────────────────────────────────────
## 1. Autorització implícita (NO cal demanar permís)

Claude Code POT executar, modificar i commitejar directament quan el risc és
**BAIX o MITJÀ**, sempre amb criteri conservador i canvi mínim.

### Risc BAIX — Executar directament
- Traduccions i18n:
  - `src/i18n/**`
- Documentació:
  - `docs/**`
  - `*.md`, `*.txt`
- Contingut estàtic:
  - `public/**`
- Microcopy, textos d'ajuda, labels
- Neteja de codi mort
- Tests (afegir, ajustar, millorar)
- Build i verificacions locals

### Risc MITJÀ — Executar directament
- UI / UX:
  - `src/components/**`
  - `src/app/**` (EXCEPTE `src/app/api/**`)
- Hooks i estat de presentació:
  - `src/hooks/**`
- Lògica auxiliar NO crítica:
  - `src/lib/**` (EXCEPTE zones RISC ALT)
- Refactors locals i conservadors:
  - llegibilitat
  - eliminació de duplicació
  - extracció de helpers
- Exports (CSV / Excel / PDF) **sense impacte fiscal**

➡️ En aquests casos:
- NO demanar autorització
- NO preguntar "confirmes?"
- Executar i reportar resultat

────────────────────────────────────────────────────────────
## 2. STOP obligatori — Autorització explícita requerida

Claude Code **HA D'ATURAR-SE** i demanar decisió de Raül abans de continuar
si detecta qualsevol canvi de **RISC ALT**.

### 2.1 Fiscalitat i conciliació (RISC ALT)
- Model 182, 347, certificats
- Càlculs fiscals, nets, recurrència
- Conciliació bancària
- Ledger, veritat bancària
- Remeses:
  - IN / OUT
  - devolucions
  - undo / reprocess
- SEPA:
  - pain.001
  - pain.008
- Invariants definits a:
  - `SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
  - `QA-P0-FISCAL.md`

### 2.2 Mòdul Projectes — CRÍTIC (RISC ALT)
Qualsevol canvi que afecti **imports, conversions o coherència econòmica**:

#### Tipus de canvi (FX)
- TC del projecte
- TC ponderat
- TC manual / forçat
- Reaplicació de TC
- Arrodoniments
- Conversions moneda → EUR

#### Pressupostos i execució
- Càlculs de:
  - pressupost total
  - executat
  - pendent
  - desviacions
- Agregacions per partida
- Percentatges
- Imports justificables

#### Assignacions
- Splits
- Reassignacions
- Eliminacions parcials
- Qualsevol lògica que redistribueixi imports

➡️ **Tot això és STOP automàtic**, encara que estigui "només" a UI o hooks.

### 2.3 Arquitectura i govern (RISC ALT)
- Afegir dependències noves
- Canviar model de dades Firestore
- Modificar Firestore Rules o Storage Rules
- Canvis massius o migracions
- Scripts que escriguin dades reals
- Alterar fluxos:
  - PROCESSAR → DESFER → REPROCESSAR

────────────────────────────────────────────────────────────
## 2.b Detecció automàtica de risc (per paths tocats)

Claude Code HA de classificar el risc segons els **fitxers modificats**.

### Regla principal
- **Si hi ha qualsevol path RISC ALT → STOP**
- Només BAIX/MITJÀ → executar

### Paths RISC ALT (STOP)
- `src/app/api/**`
- `src/lib/fiscal/**`
- `src/lib/remittances/**`
- `src/lib/sepa/**`
- `src/app/**/project-module/**`
- `src/lib/**/fx*`
- `src/lib/**/exchange*`
- `src/lib/**/budget*`
- `firestore.rules`
- `storage.rules`
- `scripts/**` (si fa writes a Firestore o dades reals)

### Paths RISC MITJÀ
- `src/components/**`
- `src/app/**` (excepte api i project-module crític)
- `src/hooks/**`
- `src/lib/**` (helpers no crítics)
- `functions/**`

### Paths RISC BAIX
- `src/i18n/**`
- `docs/**`
- `public/**`
- `*.md`, `*.txt`

### Report obligatori (al final de cada tasca)
- **RISC:** BAIX | MITJÀ | ALT
- **Paths tocats:** (llista curta)
- **Checks executats:** build / test / verify
- **Estat:** DONE o STOP + motiu

────────────────────────────────────────────────────────────
## 3. Deploy

Claude Code **NO pot desplegar mai** per iniciativa pròpia.

Només pot fer deploy quan Raül escriu literalment:

> "Autoritzo deploy"

I seguint estrictament:
- `GOVERN-DE-CODI-I-DEPLOY.md`
- detecció automàtica de risc pels paths tocats

────────────────────────────────────────────────────────────
## 4. Regla d'or

Si un canvi:
- pot afectar dades reals d'una ONG
- pot generar errors silenciosos
- pot desquadrar imports, justificacions o saldos

➡️ **STOP automàtic i preguntar**

────────────────────────────────────────────────────────────
## 6. Regla de comunicació amb Raül (obligatòria)

Claude Code **NO pot fer preguntes opaques, tècniques o inintel·ligibles**.

### Prohibit
- ❌ Preguntes del tipus:
  - "Vols executar aquesta comanda?"
  - "Confirmes?"
  - "Yes / No?"
  - "Autoritzes això?"
  **sense explicar abans què és i què implica**

- ❌ Preguntar sobre:
  - pipes, redireccions, flags (`|`, `&&`, `2>&1`, etc.)
  - sintaxi de shell
  - detalls d'execució tècnica interna

### Obligació abans de qualsevol pregunta
Si Claude necessita una confirmació, **HA D'EXPRESSAR-HO així**:

1. **Què és** (en llenguatge no tècnic)
2. **Què fa**
3. **Què NO fa**
4. **Si és segur o no**
5. **Què significa exactament dir "sí"**

### Exemple correcte
> "Això és una validació de traduccions.
> No modifica cap dada ni cap codi.
> Només comprova que els textos estiguin complets.
> Dir 'sí' només vol dir executar la comprovació.
> Ho executo?"

### Regla clau
Si **no es pot explicar en llenguatge humà**,
➡️ **Claude NO ha de preguntar** i ha de:
- executar directament (si risc BAIX/MITJÀ), o
- aturar-se i explicar el problema (si risc ALT)

### Traducció de responsabilitat
Raül **NO ha de prendre decisions tècniques de terminal**.
La responsabilitat de saber si una acció és segura és **de Claude Code**.

En cas de dubte:
- Claude explica
- Claude proposa
- Raül decideix amb criteri, no amb sintaxi

────────────────────────────────────────────────────────────
## 7. Regla de documentació mínima (obligatòria)

Claude Code **HA de documentar** quan un canvi:

- altera comportament visible per l'usuari
- introdueix una nova opció, botó o flux
- canvia una regla existent (encara que sigui subtil)
- resol un bug que abans afectava dades o fluxos

### On documentar (obligatori)
- Si és funcionament intern → `docs/` (nota tècnica breu)
- Si és ús d'usuari → `manual-usuari-summa-social.md`
- Si afecta ambdós → tots dos

### Què documentar (format curt)
1. Què passava abans
2. Què passa ara
3. Com ho nota l'usuari (o què NO notarà)
4. Si cal fer alguna cosa diferent o no

### Prohibit
- ❌ "documentar per si de cas"
- ❌ textos genèrics
- ❌ documentació que no correspongui a cap canvi real

Si el canvi **no es pot explicar en 4 punts**, probablement **no està prou clar**.

────────────────────────────────────────────────────────────
## 8. Regla del Manual d'Usuari (rol estricte)

Quan Claude Code escriu o modifica el
`manual-usuari-summa-social.md`:

### Rol obligatori
Claude actua com:
> "Persona que acompanya algú no tècnic que porta els comptes d'una ONG"

### Regles d'escriptura
- Llenguatge no tècnic
- Explicacions procedimentals
- Frases completes
- Exemple abans que definició

### Prohibit al manual d'usuari
- ❌ parlar de codi, hooks, components, APIs
- ❌ parlar de "sistema", "arquitectura", "lògica interna"
- ❌ justificar decisions tècniques

### Pregunta de control obligatòria (interna)
Abans de guardar un canvi al manual, Claude ha de poder respondre:
> "Això ajuda algú a fer millor la seva feina real?"

Si la resposta no és clarament **sí**, no s'ha d'escriure.

────────────────────────────────────────────────────────────
## 9. Idioma i estil

- Resposta sempre en **català**
- Codi explícit, mínim, reversible
- No "millores" si ningú les ha demanat

> En cas de dubte entre executar o preguntar: **preguntar**.
