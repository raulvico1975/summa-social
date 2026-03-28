# Govern de Codi i Deploy — Summa Social

Aquest és el contracte normatiu llarg del flux de treball i deploy.

- Dubte operatiu curt: `docs/DEPLOY.md`
- Bloquejos, residus i neteja: `docs/REPO-HIGIENE-I-DIAGNOSTIC.md`
- Ús pràctic i checklists: `docs/DEV-SOLO-MANUAL.md`

## 1. Model operatiu únic

Només hi ha tres veritats operatives:

1. `WORK`: una branca de feina oberta en un worktree extern de tasca.
2. `MAIN`: canvis integrats a `main`.
3. `PROD`: canvis publicats a `prod`.

Regles del model:

- El repositori de control és `/Users/raulvico/Documents/summa-social`.
- El repositori de control viu a `main` i s'ha de mantenir net.
- `npm run inicia` crea una branca `codex/*` i un worktree extern a `../summa-social-worktrees/<branch>`.
- La implementació es fa només dins del worktree de tasca.
- Treballar directament al repositori de control per fer una feature queda prohibit.
- `main` és integració; `prod` és producció.

## 2. Flux obligatori

```bash
npm run inicia
# implementar dins del worktree
npm run acabat
npm run integra
npm run status
npm run publica
```

Interpretació obligatòria:

1. `npm run inicia` o `npm run implementa` només es llança des del repositori de control, a `main` i net.
2. El sistema crea branca `codex/*` + worktree extern.
3. La feina es desenvolupa i es valida només dins del worktree.
4. `npm run acabat` només valida, commita i puja la branca de feina.
5. `npm run integra` és l'única porta d'entrada a `main`.
6. `npm run publica` és l'única porta d'entrada a `prod`.

La decisió de publicar és separada del tancament i de la integració. Acabar una tasca no vol dir publicar-la.

## 3. Garanties dels scripts

### `npm run inicia`

- Exigeix repositori de control a `main` i net.
- Crea branca `codex/*` i worktree extern.
- Si s'indica una àrea (`npm run inicia -- <area>`), evita obrir una altra tasca activa a la mateixa àrea.

### `npm run acabat`

- S'executa des del worktree de tasca.
- Corre validacions i, si hi ha canvis locals, fa commit i push.
- No integra res a `main`.
- No publica res a `prod`.
- El resultat correcte és: branca llesta per integrar.

### `npm run integra`

- S'executa només des del repositori de control.
- És l'única porta d'entrada a `main`.
- Valida la integració en un worktree temporal abans de tocar `main`.
- Si falla, `main` queda intacta.
- Si passa, `main` queda alineada com a base única per a `publica`.

### `npm run status`

- És la font única d'estat operatiu.
- Resumeix `WORK`, `MAIN`, `PROD`, el parc de worktrees i l'`ESTAT GLOBAL`.
- Si diu `BLOQUEJAT`, ni `integra` ni `publica` poden continuar.

### `npm run publica`

- S'executa només des del repositori de control.
- És l'única porta d'entrada a `prod`.
- Publica a `prod` només allò que ja és a `main`.
- Abans de publicar, el canvi ha de tenir un `impact brief` orientat a usuari si altera comportament visible o fluxos reals de treball.
- Si falla, `prod` no s'ha de donar per actualitzada.

## 4. Impact brief obligatori abans de publicar

Quan un canvi pugui acabar convertit en `novetat`, help, FAQ o comunicacio de producte, no n'hi ha prou amb el resum tecnic del commit.

Abans de `npm run publica`, cal deixar escrit a `docs/sync/impact.md` un resum curt i verificable orientat a usuari que expliqui:

- què ha canviat de veritat
- per què li importa a una entitat o a la persona que fa la feina
- com ho notarà en el dia a dia
- si ha de fer alguna acció o si no ha de fer res

Regles:

- el `impact brief` s'escriu amb llenguatge de producte, no amb llenguatge de commit
- no pot limitar-se a copiar un `feat:` o `fix:` tècnic
- si el canvi no és visible per a l'usuari, cal justificar explícitament per què no genera brief de novetat
- si el canvi és intern o tècnic, `visible_user_change: no` + justificació és suficient; no cal forçar una peça d'outreach
- si el canvi és visible, aquest brief és la font preferida per alimentar `novetats` i altres peces de comunicació

Referència operativa:

- plantilla base: `docs/sync/impact-template.md`
- estat viu del canvi actual: `docs/sync/impact.md`

## 5. Bloquejos que aturen el ritual

Qualsevol d'aquests casos talla el flux:

- `main` amb canvis locals.
- `main` desalineada amb `origin/main`.
- worktrees residuals o ambigus.
- més d'una branca llesta per integrar.
- feina local o commits sense pujar dins dels worktrees.
- `prod` amb commits fora de `main`.
- `ESTAT GLOBAL: BLOQUEJAT`.
- canvi visible sense `impact brief` usable a `docs/sync/impact.md`.

Quan passi, no s'interpreta ni es força res. Es diagnostica amb `docs/REPO-HIGIENE-I-DIAGNOSTIC.md`.

## 6. Comandes auxiliars

Aquestes comandes són de manteniment, no de govern:

- `npm run worktree:list`: inspeccionar worktrees actius i residus.
- `npm run worktree:close`: tancar un worktree que ja no ha de quedar actiu.
- `npm run worktree:gc`: neteja segura de residus i worktrees integrats nets.

Cap d'aquestes comandes substitueix `acabat`, `integra` o `publica`.

## 7. Prohibicions

- No treballar sense worktree de tasca.
- No implementar al repositori de control.
- No interpretar `npm run acabat` com a integració.
- No fer deploy fora de `npm run publica`.
- No usar l'estat d'un worktree com a font de veritat per damunt de `npm run status`.
- No barrejar neteja de repo amb una feature.
- No fer cherry-picks improvisats per trencar un bloqueig sense aclarir abans l'estat real.
- No deixar dues versions actives del mateix ritual.
- No donar per bona una explicació orientada a usuari si només és un resum tècnic del diff.

## 8. Regla final

Quan hi hagi dubte:

- `docs/DEPLOY.md` resol el dubte curt.
- aquest document fixa la norma llarga.
- `docs/REPO-HIGIENE-I-DIAGNOSTIC.md` resol el bloqueig.

Si d'una lectura d'aquests documents encara es pogués deduir "es pot treballar sense worktree" o "`acabat` ja integra", el contracte estaria mal escrit.
