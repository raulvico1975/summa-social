# Govern de Codi i Deploy — Summa Social

**Versió:** 3.2
**Data:** 2026-02-16
**Autor:** Raül Vico (CEO/CTO)

**Complementaris:**
- `docs/OPENCLAW-MIRROR.md`

---

## 0. Principis no negociables

1. **Model de branques:** `main → prod` (invariant)
2. **Autoritat final:** CEO decideix quan es desplega
3. **Cap dependència nova** sense aprovació explícita
4. **Cap commit directe** a `prod`

---

## 1. Model de branques

| Branca | Funció | Qui hi treballa |
|--------|--------|-----------------|
| `main` | Integració central i preparació de deploy | Repositori de control |
| `prod` | Producció (App Hosting) | Només merge des de main |
| `codex/*` | Tasques d'implementació | Worktrees externs |

```
[worktree codex/*] → [main] → [prod] → Deploy automàtic
```

**Repositori de control:** `/Users/raulvico/Documents/summa-social`  
**Regla:** el control es manté a `main` i net. Les tasques van fora, en worktrees.

**Firebase App Hosting desplega automàticament només des de `prod`.**

---

## 2. Classificació de canvis per risc

| Risc | Tipus de canvis | Exemples | Paths típics |
|------|-----------------|----------|--------------|
| **BAIX** | i18n, docs, microcopy | Labels, traduccions, README | `src/i18n/*`, `docs/*`, `*.md` |
| **MITJÀ** | UI, filtres, exports | Dashboards, CSV, Excel | `src/components/*`, `src/app/*/dashboard/*` |
| **ALT** | Dades, fiscal, conciliació, SEPA | Remeses, Model 182, ledger, pain.008 | `src/lib/remittances/*`, `src/lib/model182/*`, `src/lib/sepa/*`, `src/app/api/*` |

Aquesta classificació determina els requisits de validació (secció 4).

---

## 3. Ritual de desenvolupament

1. Des del **repositori de control** (a `main`, net): `npm run inicia` o `npm run implementa`
2. El sistema crea **branca `codex/*` + worktree extern** a `../summa-social-worktrees/<branch>`
3. **Treballar i validar** dins del worktree de tasca:
   ```bash
   node scripts/check-build-env.mjs && npm run build && npm test
   ```
4. `npm run acabat` des del worktree: orquestració/estat. **No integra ni pusha per defecte**
5. Després d'`acabat`, el sistema pregunta si vols tancar el worktree (`npm run worktree:close`)

---

## 4. Ritual de deploy per nivell de risc

### Requisits abans de `main → prod`

| Risc | Requisits mínims |
|------|------------------|
| **BAIX** | `npm run build` OK |
| **MITJÀ** | build + smoke tests (`docs/QA/SMOKE-TESTS.md`) |
| **ALT** | build + smoke + checklist manual (`tests/CHECKLIST-MANUAL.md`) |

**Prerequisit estable de build:** `npm run build` requereix credencials Firebase mínimes (`NEXT_PUBLIC_FIREBASE_PROJECT_ID` i `NEXT_PUBLIC_FIREBASE_API_KEY`) via `.env.local` o variables d'entorn de shell/CI.

### Verificació post-deploy: contactes

Si el deploy toca `donor-manager`, `supplier-manager`, `employee-manager` o `src/app/api/contacts/import/`:
- Editar un donant existent → desar → verificar que no apareix `permission-denied`
- Comprovar Network tab: `/api/contacts/import` respon 200

### Comandes de deploy (invariants)

```bash
# 1) main → prod
git checkout prod
git pull --ff-only
git merge --no-ff main
git push origin prod
```

---

## 5. Punt de control i autorització

**Un sol punt de decisió humana:** abans de `main → prod`.

### Execució

El ritual complet d'"acabar feina" i publicar s'executa via scripts deterministes:

```bash
npm run inicia    # crea branca codex/* + worktree extern de tasca
npm run implementa # equivalent a inicia
npm run acabat    # orquestració/estat (sense integració per defecte)
npm run acabat -- --allow-main-merge # push branca + merge a main + push main
npm run publica   # publica main -> prod (només des del repositori de control)
npm run worktree:list
npm run worktree:close
npm run worktree:gc
```

`npm run inicia` i `npm run implementa` (`scripts/workflow.sh inicia|implementa`) només funcionen al repositori de control (`main` net) i creen una tasca aïllada: branca `codex/...` + worktree extern.

`npm run acabat` (`scripts/workflow.sh acabat`) fa aquests passos:
1. Valida estat del worktree i sincronització bàsica amb el repositori de control
2. Si no hi ha flag d'integració: reporta estat i indica el següent pas
3. **No integra per defecte** (`push/merge` desactivats per defecte)
4. Si s'executa amb `--allow-main-merge`: fa `push` de branca + integració a `main` + `push main`

Integració i publicació estan serialitzades amb lock de concurrència:
- Si hi ha lock actiu: el procés es bloqueja amb missatge explícit
- Si es detecta lock orfe: es pot forçar neteja amb `SUMMA_LOCK_FORCE=1`

`npm run publica` executa `scripts/deploy.sh`, que fa:
1. Preflight git al **repositori de control** (branca=main, working tree net, pull ff-only)
2. Detectar fitxers canviats (main vs prod)
3. Classificar risc (ALT/MITJÀ/BAIX) per patrons de path
4. **Backup curt automàtic** quan el risc és ALT fiscal (si l'entorn està configurat)
5. **Anàlisi fiscal i d'impacte** — detecta si el canvi pot afectar diners, saldos o fiscalitat.
6. Verificacions locals (`verify-local.sh` + `verify-ci.sh`)
7. Resum
8. **Decisió humana només si cal**: únicament amb risc ALT residual no demostrable amb verificacions automàtiques.
9. **Pla de rollback automàtic** guardat a `docs/DEPLOY-ROLLBACK-LATEST.md`
10. Merge ritual (main→prod + push)
11. Post-deploy check automàtic (SHA remot + smoke amb URLs resoltes automàticament)
12. **Check post-producció automàtic de 3 minuts** (login, flux principal, informe/export)
13. Registre a `docs/DEPLOY-LOG.md` + incidències a `docs/DEPLOY-INCIDENTS.md` si hi ha bloqueig

### Autorització

- **Trigger d'inici:** el CEO escriu `"Comença"`, `"Inicia"` o `"Implementa"` → Claude executa `npm run inicia` o `npm run implementa` (mateix efecte)
- **Trigger de tancament:** el CEO escriu `"Acabat"` → Claude executa `npm run acabat`
- **Trigger de publicació:** el CEO escriu `"Autoritzo deploy"` → Claude executa `npm run publica`
- El script detecta el nivell de risc automàticament
- El script s'atura si les verificacions fallen
- `Inicia` i `Implementa` serveixen igual.

### Sortida esperada cap al CEO

- Quan hi ha canvis locals, el sistema mostra sempre:
  - bloc `RESUM NO TÈCNIC` (què s'ha fet, implicació, què pot notar l'entitat)
  - bloc `SEGÜENT PAS RECOMANAT` indicant quan dir `Acabat`
- Després d'`acabat` amb estat `Preparat per producció`, el sistema mostra:
  - bloc `QUÈ VOL DIR AUTORITZO DEPLOY`
  - bloc `SEGÜENT PAS RECOMANAT` indicant quan dir `Autoritzo deploy`
- Text obligatori del bloc `QUÈ VOL DIR AUTORITZO DEPLOY`:
  - Dir `Autoritzo deploy` vol dir publicar els canvis preparats a producció.
  - Es faran comprovacions automàtiques abans i després.
  - Si alguna comprovació falla, no es publica.
  - L'entitat podria notar canvis immediatament després de publicar.
- Quan el CEO respon `Autoritzo deploy`, Claude executa publicació en silenci.
- Si tot va bé, la resposta final és només: `Ja a producció.`
- Si alguna verificació falla, no es publica i Claude explica el bloqueig en una frase clara.

### Pràctiques operatives automàtiques (sense passos manuals del CEO)

- Backup curt selectiu abans de deploy en risc ALT fiscal (si hi ha configuració d'entorn).
- Rollback preparat automàticament abans de publicar.
- Check post-producció de 3 minuts automatitzat.
- Mini-registre d'incidència quan un deploy queda bloquejat.
- Si no hi ha URLs de smoke definides, el sistema prova automàticament amb `DEPLOY_BASE_URL` o amb la URL publicada detectada a `firebase.json`.

### Validacions per nivells

- `npm run verify:fast`: validacions ràpides locals (sense build ni tests)
- `npm run verify:full`: typecheck + cobertura/tests + validacions i18n + build
- `npm run verify:release`: `deploy.sh` (inclou gates fiscals, verificacions i checks post-prod)

### CI i protecció de branques (3A)

- Workflow CI obligatori a GitHub (`.github/workflows/ci.yml`) en `pull_request` a `main` i `push` a `main`
- Check requerit a `main`: job `verify-full` en verd
- Protecció de branques: push directe prohibit a `main` i `prod` per agents no autoritzats
- `prod` es publica via ritual (`npm run publica`) per actor autoritzat

### Missatge de commit

- El commit ha de tenir un nom representatiu del canvi.
- Si el CEO no dicta un text concret, el sistema genera automàticament un missatge representatiu segons fitxers i impacte.

### Estat operatiu (frases obligatòries)

Claude només pot reportar un d'aquests tres estats:
- `No en producció`
- `Preparat per producció`
- `A producció`

### Regla de preguntes humanes (no tècniques)

- **BAIX/MITJÀ:** cap pregunta humana.
- **ALT:** només es pregunta si queda risc residual després de verificacions automàtiques.
- **Format obligatori de pregunta:** impacte per l'entitat (què pot veure malament, què pot passar si falla, opcions A/B no tècniques).
- **Prohibit preguntar** sobre comandes, flags, branques, merges o logs tècnics.
- Si no es pot formular la pregunta en llenguatge de negoci, **no es pregunta** i el deploy queda **`BLOCKED_SAFE`**.
- Si hi ha pregunta, es registra al deploy log amb:
  - `human_question_reason`
  - `business_impact`
  - `decision_taken`

### Restriccions Claude Code

- **NO pot** decidir quan desplegar
- **NO pot** fer canvis fora del ritual establert
- **NO pot** usar `--no-verify` en cap cas
- **Implementa sempre** en worktrees de tasca (`codex/*`), mai directament al repositori de control
- **Publica només** des del repositori de control a `main`

### Protecció contra artefactes de build i dependències

El workflow bloqueja explícitament qualsevol fitxer staged sota:
- `node_modules/`
- qualsevol subruta `node_modules/` dins del repositori (incloent `functions/`)
- `.next/`
- `dist/`
- `build/`
- `.turbo/`

Encara que `.gitignore` ja els exclou, el workflow aplica un segon nivell de protecció.  
Nota: per provar el bloqueig de forma controlada (smoke test), pot ser necessari utilitzar `git add -f`.

---

## 6. Rollback

### Rollback bàsic (emergència)

```bash
git checkout prod
git reset --hard <SHA_BON>
git push --force-with-lease
```

Firebase App Hosting redesplegarà automàticament.

**Regla:** Rollback sempre des de `prod`.

### Protocol complet

Per incidents específics (bot, API, Storage, etc.), escenaris detallats i temps estimats:

👉 **Veure [`DEPLOY-ROLLBACK.md`](./DEPLOY-ROLLBACK.md)**

Aquest document conté:
- Escenaris d'error específics (bot, diagnostics, Storage JSON, etc.)
- Rollback parcial vs complet
- Temps estimat per escenari
- Verificació post-rollback
- Procediments de documentació d'incidents

---

## 7. Regles d'or

1. Mai commit directe a `prod`
2. Repositori de control sempre a `main` i net abans d'obrir tasca o publicar
3. Implementació sempre en worktree extern (`codex/*`)
4. Un commit = un propòsit clar
5. Build + test abans de merge
6. Deploy només amb autorització CEO
7. Rollback des de `prod`
8. Risc ALT = confirmació extra obligatòria

---

## 8. Casos especials

| Cas | Tractament |
|-----|------------|
| Web pública (`/public/*`) | Risc BAIX |
| Novetats producte (Firestore `productUpdates`) | Fora d'aquest protocol (SuperAdmin) |
| DEMO | Mai tocar `prod` |
| Canvis visuals | Verificar en mòbil abans de merge |
| Generador pain.008 (`src/lib/sepa/pain008/*`) | Risc ALT — Verificar compatibilitat amb Mode Santander (veure `DEV-SOLO-MANUAL.md` §18) |

---

## 9. Evolució del model

- Mantenim `main -> prod` i deploy per script local controlat
- CI i branch protection ja són part obligatòria del model
- Qualsevol canvi futur (deploy per pipeline, entorns extra, etc.) requereix actualitzar aquest document abans d'aplicar-lo

---

**Aquest document és norma del projecte.**
Quan algú pregunti "com despleguem Summa?", la resposta és: llegeix aquest document i segueix-lo.
