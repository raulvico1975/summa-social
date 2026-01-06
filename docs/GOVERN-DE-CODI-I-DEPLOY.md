# Govern de Codi i Deploy — Summa Social

**Versió:** 1.1
**Data:** 2026-01-06
**Autor:** Raül Vico (CEO/CTO)

---

## Branques

| Branca | Funció | Qui hi treballa |
|--------|--------|-----------------|
| `main` | Integració i desenvolupament | Desenvolupador |
| `master` | Producció (allò desplegat) | Només deploy |
| `ui/*`, `fix/*`, `feat/*` | Branques WIP específiques | Desenvolupador |

---

## Flux de treball

```
[Branca WIP] → [main] → [master] → [Deploy]
     ↑            ↑          ↑
   Codi        Validat    Desplegat
```

1. **Desenvolupar** a `main` o a una branca específica (`ui/xxx`, `fix/xxx`).
2. **Validar** abans de mergear a `main`:
   - `npm run build` passa
   - `npm test` passa
   - Prova manual si és canvi UI
3. **Desplegar** només des de `master`.

---

## Ritual de deploy (3 comandes)

```bash
git checkout master
git pull --ff-only
git merge --no-ff main
git push
```

Firebase App Hosting desplega automàticament quan `master` rep un push.

**Regla:** `master` només es mou amb merge des de `main`. Mai es treballa directament a `master`.

---

## Rollback (si cal)

```bash
git checkout master
git reset --hard <SHA_BON>
git push --force-with-lease
```

Firebase App Hosting redesplegarà automàticament.

---

## Regles d'or

1. **Mai commitejar directament a `master`.**
2. **Mai desplegar sense passar per `master`.**
3. **Verificar UI en mòbil abans de mergear canvis visuals.**
4. **Un commit = un propòsit clar.** No barrejar QA amb UI amb features.

---

## Validació pre-deploy (QA)

Abans de desplegar a producció, executar mínim:

1. **Smoke tests** (`docs/QA/SMOKE-TESTS.md`) — 5-10 min
2. **Build + tests**:
   ```bash
   npm run build && npm test
   ```

Per canvis importants, executar també:
- **Checklist manual** (`tests/CHECKLIST-MANUAL.md`) — 60-90 min

---

## Quan canviar aquest model

Només si:
- L'equip creix a 3+ desenvolupadors → afegir PRs obligatoris
- Hi ha CI/CD automatitzat → afegir protecció de branques
- Es necessita staging → afegir branca `staging` entre `main` i `master`

Fins llavors: **simplicitat i disciplina > automatització**.

---

## Resum visual

```
┌─────────────────────────────────────────────────────────┐
│                    DESENVOLUPAMENT                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ ui/xxx   │───▶│   main   │───▶│  master  │──▶ DEPLOY│
│  │ fix/xxx  │    │          │    │          │          │
│  │ feat/xxx │    │ (validat)│    │(producció)│         │
│  └──────────┘    └──────────┘    └──────────┘          │
│                                                         │
│  Firebase App Hosting desplega automàticament master   │
└─────────────────────────────────────────────────────────┘
```

---

## Automatització amb Claude Code

Claude Code pot executar el desplegament de Summa Social **només sota autorització explícita del CEO**.

Model:
- El CEO decideix: "Autoritzo deploy".
- Claude Code executa únicament el ritual definit (sense improvisar).
- Claude Code reporta el resultat (SHA abans/després + estat).

Claude Code **no pot** decidir quan desplegar ni fer canvis fora del ritual establert.

---

**Aquest document és norma del projecte.**
Quan algú pregunti "com despleguem Summa?", la resposta és: llegeix aquest document i segueix-lo.
