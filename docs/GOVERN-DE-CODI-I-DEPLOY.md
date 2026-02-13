# Govern de Codi i Deploy — Summa Social

**Versió:** 3.0
**Data:** 2026-01-29
**Autor:** Raül Vico (CEO/CTO)

---

## 0. Principis no negociables

1. **Model de branques:** `main → master → prod` (invariant)
2. **Autoritat final:** CEO decideix quan es desplega
3. **Cap dependència nova** sense aprovació explícita
4. **Cap commit directe** a `prod` ni a `master`

---

## 1. Model de branques

| Branca | Funció | Qui hi treballa |
|--------|--------|-----------------|
| `main` | Integració i desenvolupament | Desenvolupador |
| `master` | Branca intermèdia / historial net | Només merge des de main |
| `prod` | Producció (App Hosting) | Només sync des de master |
| `ui/*`, `fix/*`, `feat/*` | Branques WIP específiques | Desenvolupador |

```
[WIP] → [main] → [master] → [prod] → Deploy automàtic
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

### Requisits abans de `master → prod`

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
# 1) main → master
git checkout master
git pull --ff-only
git merge --no-ff main
git push origin master

# 2) master → prod
git checkout prod
git pull --ff-only
git merge master
git push origin prod
```

---

## 5. Punt de control i autorització

**Un sol punt de decisió humana:** abans de `master → prod`.

### Execució

El ritual de deploy s'executa via script determinista:

```bash
npm run deploy    # o: bash scripts/deploy.sh
```

El script (`scripts/deploy.sh`) fa tots els passos de forma seqüencial i bloquejant:
1. Preflight git (branca=main, working tree net, pull ff-only)
2. Detectar fitxers canviats (main vs master)
3. Classificar risc (ALT/MITJÀ/BAIX) per patrons de path
4. **Verificació fiscal** — si el canvi toca àrea fiscal, exigeix confirmació explícita de la verificació (`docs/QA-FISCAL.md`). Si no s'ha fet, el deploy s'atura.
5. Verificacions locals (`verify-local.sh` + `verify-ci.sh`)
6. Resum i confirmació final
7. Merge ritual (main→master→prod + push)
8. Post-deploy check bloquejant (SHA servit + smoke test)
9. Registre a `docs/DEPLOY-LOG.md` (staged, commit manual)

### Autorització

- **Trigger:** El CEO escriu `"Autoritzo deploy"` → Claude executa `npm run deploy`
- El script detecta el nivell de risc automàticament
- El script s'atura si les verificacions fallen o la verificació fiscal no es confirma

### Restriccions Claude Code

- **NO pot** decidir quan desplegar
- **NO pot** fer canvis fora del ritual establert
- **NO pot** usar `--no-verify` en cap cas
- **Treballa sempre** a `main` (o branques WIP), mai a `prod` ni `master`

---

## 6. Rollback

```bash
git checkout prod
git reset --hard <SHA_BON>
git push --force-with-lease
```

Firebase App Hosting redesplegarà automàticament.

**Regla:** Rollback sempre des de `prod`, mai des de `master`.

---

## 7. Regles d'or

1. Mai commit directe a `prod` o `master`
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
- **Staging necessari** → afegir branca `staging` entre `main` i `master`

Fins llavors: **simplicitat i disciplina > automatització**.

---

**Aquest document és norma del projecte.**
Quan algú pregunti "com despleguem Summa?", la resposta és: llegeix aquest document i segueix-lo.
