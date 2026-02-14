# Deploy Rollback — Summa Social

**Versió:** 1.0
**Data:** 2026-02-14
**Context:** Protocol de rollback ràpid per incidents en producció

---

## 0. Principis

1. **No destructiu:** Preferir `git revert` sobre `git reset --hard`
2. **Revertible:** Documentar sempre l'acció i l'estat anterior
3. **Logs preservats:** Mai silenciar errors, sempre registrar incidents
4. **Velocitat:** Temps de rollback < 10 min en escenaris crítics

---

## 1. Comandes base

### Rollback amb revert (preferit)

```bash
# 1. Identificar commit problemàtic
git log --oneline -10

# 2. Revertir commit (preserva història)
git revert <commit-sha> --no-edit

# 3. Push segons ritual
git push origin main

# 4. Deploy segons ritual (main → master → prod)
# Veure GOVERN-DE-CODI-I-DEPLOY.md
```

**Temps estimat:** 3-5 min

---

### Deploy manual (quan ritual automàtic falla)

```bash
# Si npm run deploy falla, executar passos manualment:

# 1. main → master
git checkout master
git pull --ff-only
git merge --no-ff main
git push origin master

# 2. master → prod
git checkout prod
git pull --ff-only
git merge master
git push origin prod
```

**Temps estimat:** 2-3 min

---

## 2. Escenaris d'incident específics

### Escenari 1: Bot retorna AI_ERROR massivament

**Símptomes:**
- Usuaris veuen `"Quota d'IA esgotada"` o `"Error temporal"` constantment
- Logs: múltiples `[API] support/bot error:` en pocs minuts

**Rollback immediat:**

```bash
# 1. Identificar commit PR3.1
git log --oneline --grep="PR3.1" -5

# 2. Revertir
git revert <commit-pr3.1> --no-edit
git push origin main

# 3. Deploy automàtic (Firebase App Hosting)
# Esperar ~2 min fins que prod estigui al commit anterior
```

**Verificació:**
- Bot torna a respondre normalment
- No més `AI_ERROR` als logs

**Temps estimat:** 3-5 min

---

### Escenari 2: Diagnostics API inaccessible (403/401)

**Símptomes:**
- `/admin` mostra error o no carrega KB Runtime card
- Logs: `[diagnostics] Només SuperAdmin pot veure diagnòstics`

**Rollback parcial:**

```bash
# 1. Verificar systemSuperAdmins/{uid} a prod
# Si no existeix → crear manualment a Firestore Console

# 2. Si persisteix → revertir només diagnostics route
git log --oneline --grep="diagnostics" -5
git revert <commit-diagnostics> --no-edit
git push origin main
```

**Temps estimat:** 2-3 min (si és només crear doc) o 5 min (si cal revertir)

---

### Escenari 3: Storage JSON corrupt → bot crasha

**Símptomes:**
- Bot retorna fallback genèric per TOTES les preguntes
- Logs: `[load-kb-runtime] JSON parse error:`

**⚠️ Rollback Storage (sense tocar codi):**

1. Anar a Firebase Console → Storage → `support-kb/kb.json`
2. Descarregar versió corrupta (backup per debug)
3. Pujar versió anterior vàlida (des de backup local o commit anterior)
4. Incrementar versió a Firestore (`system/supportKb.version`)

**Verificació:**
- Logs: `[load-kb-runtime] Loaded from Storage: X cards` (sense errors)
- Bot respon correctament

**Temps estimat:** 5-7 min

**Nota:** Aquest és el rollback MÉS RÀPID si el problema és només Storage (no codi).

---

### Escenari 4: Lang normalization trencada

**Símptomes:**
- Usuaris FR/PT veuen respostes en idioma incorrecte
- Logs: cap error, però respostes inconsistents

**Rollback codi:**

```bash
# Revertir només bot route
git log --oneline src/app/api/support/bot/route.ts -5
git revert <commit-bot-route> --no-edit
git push origin main
```

**Temps estimat:** 3-5 min

---

### Escenari 5: Cache version no invalida

**Símptomes:**
- Publish nou no es reflecteix al bot
- Logs: `[load-kb-runtime] Cache hit, version: X` (sempre mateix X)

**Fix ràpid (NO rollback):**

1. Forçar reload incrementant versió:
   ```javascript
   // Firestore Console
   system/supportKb.version = version + 1
   ```
2. Esperar 1 petició nova (cache invalida automàticament)

**Temps estimat:** 1 min

---

## 3. Rollback complet (última instància)

**⚠️ Només usar si producció està completament trencada**

### Amb reset (destrueix història)

```bash
# 1. Identificar últim commit estable pre-incident
git log --oneline -20

# 2. Reset a commit estable
git checkout prod
git reset --hard <commit-estable>

# 3. Force push amb protecció
git push origin prod --force-with-lease
```

**Advertiments:**
- **Destrueix història** entre commit actual i commit estable
- **Només per emergències crítiques** (producció down > 5 min)
- **Documentar immediatament** l'incident

**Temps estimat:** 10-15 min (incloent restauració Firestore/Storage si cal)

---

## 4. Post-Rollback

**Sempre executar després de qualsevol rollback:**

### 4.1. Documentar incident

Crear/actualitzar `docs/INCIDENTS.md`:

```markdown
## [Data] — [Títol breu incident]

**Detecció:** [Quan i com es va detectar]
**Símptomes:** [Què veien els usuaris]
**Root cause:** [Causa tècnica real]
**Rollback aplicat:** [Escenari X del DEPLOY-ROLLBACK.md]
**Temps downtime:** [X minuts]
**Fix proposat:** [Què cal fer abans de re-deploy]
```

### 4.2. Verificar restauració

- Bot respon correctament (3 queries diferents)
- `/admin` carrega sense errors (si toca diagnòstics)
- Logs nets (sense errors recurrents)

### 4.3. Comunicar (si downtime > 5 min)

- Notificar usuaris afectats
- Explicar què ha passat (llenguatge no tècnic)
- Indicar quan es desplegarà fix

### 4.4. Re-testejar fix en dev

**Abans de re-deploy:**
- Reproduir incident en dev
- Aplicar fix
- Executar smoke tests complets
- Només llavors: autoritzar deploy

---

## Rollback PR3/PR3.1 — Bot KB versionada

**Context:** Sistema de bot amb KB versionada (filesystem + Storage merge)

### Components afectats

- `src/app/api/support/bot/route.ts` — Bot API (hard fallback + lang normalization)
- `src/app/api/support/kb/diagnostics/route.ts` — Diagnostics API (SuperAdmin-only)
- `src/components/super-admin/kb-runtime-diagnostics.tsx` — Diagnostics UI
- `src/lib/support/load-kb-runtime.ts` — Runtime loader amb cache versionat
- Firestore: `system/supportKb` (document amb `version`, `updatedAt`, `updatedBy`)
- Storage: `support-kb/kb.json` (KB cards override)

### Rollback ràpid per component

| Component | Rollback | Temps |
|-----------|----------|-------|
| **Bot API** | Escenari 1 (revert bot route) | 3-5 min |
| **Diagnostics API** | Escenari 2 (revert diagnostics route) | 3-5 min |
| **Storage JSON** | Escenari 3 (restaurar kb.json) | 5-7 min |
| **Cache version** | Escenari 5 (incrementar version) | 1 min |
| **Tot complet** | Rollback complet (reset a pre-PR3) | 10-15 min |

### Verificació específica PR3/PR3.1

**Després de rollback:**

1. **Bot funcional:**
   - Pregunta coneguda → resposta correcta
   - Pregunta desconeguda → fallback correcte (NO `AI_ERROR`)

2. **Idiomes:**
   - CA/ES/FR/PT → respostes coherents amb mapping

3. **Diagnòstics (si aplica):**
   - `/admin` mostra targeta KB Runtime
   - Versió, Storage state visibles

4. **Logs nets:**
   - Cap `[bot] retrieveCard error:`
   - Cap `[load-kb-runtime] JSON parse error:`
   - Alguns `[bot] reformatter failed` són acceptables (si LLM falla)

---

## Notes finals

- **Preferir rollback parcial** (només component afectat) sobre rollback complet
- **Restaurar Storage primer** si el problema és només JSON corrupte (més ràpid que revertir codi)
- **Documentar sempre** (incident + causa + fix) abans de re-deploy
- **Comunicar proactivament** si downtime > 5 min

**Aquest document és protocol oficial de rollback.**
Quan hi ha incident en producció: llegeix, identifica escenari, executa, documenta.
