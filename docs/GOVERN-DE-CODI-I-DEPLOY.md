# Govern de Codi i Deploy — Summa Social

**Versió:** 2.1
**Data:** 2026-01-19
**Autor:** Raül Vico (CEO/CTO)

---

## Branques

| Branca | Funció | Qui hi treballa |
|--------|--------|-----------------|
| `main` | Integració i desenvolupament | Desenvolupador |
| `master` | Branca intermèdia / historial net | Només merge des de main |
| `prod` | Producció (branca connectada a App Hosting) | Només sync des de master |
| `ui/*`, `fix/*`, `feat/*` | Branques WIP específiques | Desenvolupador |

**IMPORTANT:** App Hosting desplega automàticament només des de `prod`.

---

## Flux de treball

```
[Branca WIP] → [main] → [master] → [prod] → [Deploy automàtic]
     ↑            ↑          ↑          ↑
   Codi        Validat   Intermèdia  Producció
```

1. **Desenvolupar** a `main` o a una branca específica (`ui/xxx`, `fix/xxx`).
2. **Validar** abans de mergear a `main`:
   - `npm run build` passa
   - `npm test` passa
   - Prova manual si és canvi UI
3. **Desplegar** en dos passos: `main → master`, després `master → prod`.

---

## Ritual de deploy (6 comandes)

```bash
# 1) main → master
git checkout master
git pull --ff-only
git merge --no-ff main
git push origin master

# 2) master → prod (sync)
git checkout prod
git pull --ff-only
git merge --ff-only master
git push origin prod
```

Firebase App Hosting desplega automàticament quan `prod` rep un push.

**Regla:** `prod` només es mou amb merge des de `master`. Mai es treballa directament a `prod` ni a `master`.

---

## Rollback (si cal)

```bash
git checkout prod
git reset --hard <SHA_BON>
git push --force-with-lease
```

Firebase App Hosting redesplegarà automàticament.

---

## Regles d'or

1. **Mai commitejar directament a `prod`.**
2. **Mai commitejar directament a `master`.** Només merge des de `main`.
3. **Mai desplegar sense passar per `prod`.**
4. **Treballar sempre a `main` o branques WIP.**
5. **Verificar UI en mòbil abans de mergear canvis visuals.**
6. **Un commit = un propòsit clar.** No barrejar QA amb UI amb features.

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
- Es necessita staging → afegir branca `staging` entre `main` i `master` (nota: `master` ja actua com a intermèdia)

Fins llavors: **simplicitat i disciplina > automatització**.

---

## Resum visual

```
┌───────────────────────────────────────────────────────────────┐
│                      DESENVOLUPAMENT                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ ui/xxx   │───▶│   main   │───▶│  master  │───▶│   prod   │─▶DEPLOY
│  │ fix/xxx  │    │          │    │          │    │          │ │
│  │ feat/xxx │    │ (validat)│    │(intermèdia)│  │(producció)│ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                │
│  Firebase App Hosting desplega automàticament prod            │
└───────────────────────────────────────────────────────────────┘
```

---

## Automatització amb Claude Code

Claude Code pot executar el desplegament de Summa Social **només sota autorització explícita del CEO**.

Model:
- El CEO decideix: "Autoritzo deploy".
- Claude Code executa únicament el ritual definit (sense improvisar).
- Claude Code reporta el resultat (SHA abans/després + estat).

Claude Code **no pot** decidir quan desplegar ni fer canvis fora del ritual establert.

Claude Code **treballa sempre a `main`** (o branques WIP). Mai a `prod` ni a `master`.

---

**Aquest document és norma del projecte.**
Quan algú pregunti "com despleguem Summa?", la resposta és: llegeix aquest document i segueix-lo.
