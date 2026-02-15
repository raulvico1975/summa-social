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

El ritual de deploy s'executa via script determinista:

```bash
npm run deploy    # o: bash scripts/deploy.sh
```

El script (`scripts/deploy.sh`) fa tots els passos de forma seqüencial i bloquejant:
1. Preflight git (branca=main, working tree net, pull ff-only)
2. Detectar fitxers canviats (main vs prod)
3. Classificar risc (ALT/MITJÀ/BAIX) per patrons de path
4. **Anàlisi fiscal i d'impacte** — detecta si el canvi pot afectar diners, saldos o fiscalitat.
5. Verificacions locals (`verify-local.sh` + `verify-ci.sh`)
6. Resum
7. **Decisió humana només si cal**: únicament amb risc ALT residual no demostrable amb verificacions automàtiques.
8. Merge ritual (main→prod + push)
9. Post-deploy check automàtic (SHA remot + smoke opcional per URL)
10. Registre a `docs/DEPLOY-LOG.md` (inclou decisió humana si n'hi ha)

### Autorització

- **Trigger:** El CEO escriu `"Autoritzo deploy"` → Claude executa `npm run deploy`
- El script detecta el nivell de risc automàticament
- El script s'atura si les verificacions fallen

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
