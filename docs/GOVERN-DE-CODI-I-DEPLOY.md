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
| **ALT** | Dades, fiscal, conciliació | Remeses, Model 182, ledger | `src/lib/remittances/*`, `src/lib/model182/*`, `src/app/api/*` |

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

### Autorització

- **Trigger:** El CEO escriu `"Autoritzo deploy"`
- Claude Code detecta el nivell de risc automàticament segons els paths modificats
- Claude Code executa únicament el ritual definit (sense improvisar)
- Claude Code reporta: SHA abans/després + estat

### Flux segons risc

| Risc | Flux |
|------|------|
| BAIX/MITJÀ | CEO: "Autoritzo deploy" → Claude executa |
| ALT | CEO: "Autoritzo deploy" → Claude: "Risc ALT detectat. Confirmes?" → CEO: "Confirmo" → Claude executa |

### Restriccions Claude Code

- **NO pot** decidir quan desplegar
- **NO pot** fer canvis fora del ritual establert
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
