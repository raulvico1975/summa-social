# Govern de Codi i Deploy — Summa Social

**Versió:** 2.0
**Data:** 2026-01-16
**Autor:** Raül Vico (CEO/CTO)

---

## Branques

| Branca | Funció | Qui hi treballa |
|--------|--------|-----------------|
| `main` | Integració i desenvolupament | Desenvolupador |
| `prod` | Producció (branca connectada a App Hosting) | Només deploy |
| `master` | **OBSOLETA** — No tocar | Ningú |
| `ui/*`, `fix/*`, `feat/*` | Branques WIP específiques | Desenvolupador |

**IMPORTANT:** App Hosting desplega automàticament només des de `prod`.

---

## Flux de treball

```
[Branca WIP] → [main] → [prod] → [Deploy automàtic]
     ↑            ↑         ↑
   Codi        Validat   Producció
```

1. **Desenvolupar** a `main` o a una branca específica (`ui/xxx`, `fix/xxx`).
2. **Validar** abans de mergear a `main`:
   - `npm run build` passa
   - `npm test` passa
   - Prova manual si és canvi UI
3. **Desplegar** només des de `prod` (merge des de `main`).

---

## Ritual de deploy (4 comandes)

```bash
git checkout prod
git pull --ff-only
git merge --ff-only main
git push
```

Firebase App Hosting desplega automàticament quan `prod` rep un push.

**Regla:** `prod` només es mou amb merge des de `main`. Mai es treballa directament a `prod`.

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
2. **Mai desplegar sense passar per `prod`.**
3. **Treballar sempre a `main` o branques WIP.** No tocar `master` (obsoleta).
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
- Es necessita staging → afegir branca `staging` entre `main` i `master`

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
│  Firebase App Hosting desplega automàticament prod     │
│                                                         │
│  ⚠️  master = OBSOLETA (no tocar)                       │
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

Claude Code **treballa sempre a `main`** (o branques WIP). Mai a `prod` ni a `master`.

---

## Acció pendent: Reconfigurar App Hosting

**IMPORTANT:** Cal canviar la branca connectada a Firebase App Hosting de `master` a `prod`.

Passos (a Firebase Console):
1. Anar a Firebase Console → App Hosting
2. Seleccionar el backend "studio"
3. Editar la configuració de la branca
4. Canviar de `master` a `prod`
5. Verificar que el proper push a `prod` dispara el deploy

Fins que es faci aquest canvi, els pushes a `master` encara podrien disparar deploys.

---

**Aquest document és norma del projecte.**
Quan algú pregunti "com despleguem Summa?", la resposta és: llegeix aquest document i segueix-lo.
