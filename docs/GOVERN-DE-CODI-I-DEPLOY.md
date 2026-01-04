# Govern de Codi i Deploy — Summa Social

**Versió:** 1.0
**Data:** 2026-01-04
**Autor:** Raül Vico (CEO/CTO)

---

## Branques

| Branca | Funció | Qui hi treballa |
|--------|--------|-----------------|
| `main` | Integració i desenvolupament | Desenvolupador |
| `prod` | Producció (allò desplegat) | Només deploy |
| `ui/*`, `fix/*`, `feat/*` | Branques WIP específiques | Desenvolupador |
| `master` | **Obsoleta** — no tocar | Ningú |

---

## Flux de treball

```
[Branca WIP] → [main] → [prod] → [Deploy]
     ↑            ↑         ↑
   Codi        Validat   Desplegat
```

1. **Desenvolupar** a `main` o a una branca específica (`ui/xxx`, `fix/xxx`).
2. **Validar** abans de mergear a `main`:
   - `npm run build` passa
   - `npm test` passa
   - Prova manual si és canvi UI
3. **Desplegar** només des de `prod`.

---

## Ritual de deploy (3 comandes)

```bash
git checkout prod
git pull --ff-only
git merge --ff-only main
git push
```

Després:
```bash
firebase deploy
```

**Regla:** `prod` només es mou amb `--ff-only` des de `main`. Mai es treballa directament a `prod`.

---

## Rollback (si cal)

```bash
git checkout prod
git reset --hard <SHA_BON>
git push --force-with-lease
```

Després, redesplegar:
```bash
firebase deploy
```

---

## Regles d'or

1. **Mai commitejar directament a `prod`.**
2. **Mai fer push a `master`** (obsoleta).
3. **Mai desplegar sense passar per `prod`.**
4. **Verificar UI en mòbil abans de mergear canvis visuals.**
5. **Un commit = un propòsit clar.** No barrejar QA amb UI amb features.

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
- Es necessita staging → afegir branca `staging` entre `main` i `prod`

Fins llavors: **simplicitat i disciplina > automatització**.

---

## Resum visual

```
┌─────────────────────────────────────────────────────────┐
│                    DESENVOLUPAMENT                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ ui/xxx   │───▶│   main   │───▶│   prod   │──▶ DEPLOY│
│  │ fix/xxx  │    │          │    │          │          │
│  │ feat/xxx │    │ (validat)│    │(producció)│         │
│  └──────────┘    └──────────┘    └──────────┘          │
│                                                         │
│  master = OBSOLETA (ignorar)                           │
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
