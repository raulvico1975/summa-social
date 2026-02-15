# Govern de Codi i Deploy — Summa Social

**Versió:** 3.1
**Data:** 2026-02-14
**Autor:** Raül Vico (CEO/CTO)

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
| `main` | Integració i desenvolupament | Desenvolupador |
| `prod` | Producció (App Hosting) | Només merge des de main |
| `ui/*`, `fix/*`, `feat/*` | Branques WIP específiques | Desenvolupador |

```
[WIP] → [main] → [prod] → Deploy automàtic
```

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

1. **Treballar** a `main` o branca WIP (`ui/xxx`, `fix/xxx`, `feat/xxx`)
2. **Validar** abans de merge:
   ```bash
   npm run build && npm test
   ```
3. **Commit** amb propòsit clar (un commit = una intenció)
4. **Push** a `main`

---

## 4. Ritual de deploy per nivell de risc

### Requisits abans de `main → prod`

| Risc | Requisits mínims |
|------|------------------|
| **BAIX** | `npm run build` OK |
| **MITJÀ** | build + smoke tests (`docs/QA/SMOKE-TESTS.md`) |
| **ALT** | build + smoke + checklist manual (`tests/CHECKLIST-MANUAL.md`) |

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
npm run inicia    # crea branca segura abans de començar
npm run implementa # equivalent a inicia
npm run acabat    # tanca tasca (checks + commit + push + integració a main)
npm run publica   # publica main -> prod (deploy verificat)
```

`npm run inicia` i `npm run implementa` (`scripts/workflow.sh inicia|implementa`) creen una branca `codex/...` segura abans de tocar codi.

`npm run acabat` (`scripts/workflow.sh acabat`) fa aquests passos de forma seqüencial:
1. Detectar canvis pendents i classificar risc (ALT/MITJÀ/BAIX)
2. Verificacions (`verify-local.sh`, `verify-ci.sh`)
3. Commit i push de la branca de treball
4. Integració automàtica a `main` (si no hi ha conflictes)

`npm run publica` executa `scripts/deploy.sh`, que fa:
1. Preflight git (branca=main, working tree net, pull ff-only)
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
- **Treballa sempre** a `main` (o branques WIP), mai a `prod`

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
2. Treballar sempre a `main` o branques WIP
3. Un commit = un propòsit clar
4. Build + test abans de merge
5. Deploy només amb autorització CEO
6. Rollback des de `prod`
7. Risc ALT = confirmació extra obligatòria

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

## 9. Quan canviar aquest model

Només si:
- **Equip 3+ devs** → afegir PRs obligatoris
- **CI/CD automatitzat** → afegir protecció de branques
- **Staging necessari** → afegir branca `staging` entre `main` i `prod`

Fins llavors: **simplicitat i disciplina > automatització**.

---

**Aquest document és norma del projecte.**
Quan algú pregunti "com despleguem Summa?", la resposta és: llegeix aquest document i segueix-lo.
