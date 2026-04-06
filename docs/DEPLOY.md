# Deploy — contracte vigent

Document curt d'autoritat operativa.

## Contracte vigent

- `npm run inicia` crea branca `codex/*` + worktree extern.
- La feina es fa només dins del worktree de tasca.
- `npm run acabat` només valida, commita i puja la branca.
- `npm run integra` és l'única porta d'entrada a `main`.
- `npm run status` és la font única d'estat operatiu.
- Si `npm run status` diu `BLOQUEJAT`, ni `integra` ni `publica` poden continuar.
- `npm run publica` és l'única porta d'entrada a `prod`.

## Tres estats i prou

El terme genèric `net` queda prohibit com a estat suficient. A partir d'ara només es pot parlar de:

- `NETA_DE_TASCA`: el worktree/branca de la tasca està en estat correcte per tancar-la.
- `LLESTA_PER_INTEGRAR`: la branca es pot integrar a `main` sense bloqueig.
- `LLESTA_PER_PUBLICAR`: `main`, `prod`, worktrees, validacions i precondicions permeten publicar ara mateix.

Regla curta del contracte:

- Una tasca pot estar tancada i no estar llesta per publicar.
- `Integrable` i `publicable` no són sinònims.
- `Autoritzo deploy` només es pot dir quan l'estat global és explícitament `llesta per publicar`.
- Si no ho està, el sistema ha d'explicar el bloqueig en llenguatge operatiu curt.

## Flux normal

```bash
npm run inicia
# implementar dins del worktree
npm run acabat
npm run integra
npm run status
npm run publica
```

## Què garanteix `acabat`

- La branca `codex/*` queda validada, commitada i pujada.
- `main` no es toca.
- `prod` no es toca.
- Això pot deixar una tasca `neta de tasca` sense deixar-la encara `llesta per publicar`.

## Què garanteix `integra`

- Només entra a `main` una branca llesta.
- La integració es valida abans de tocar `main`.
- Si falla, `main` queda intacta.
- Si passa, `main` queda com a base única per publicar.

## Què garanteix `status`

- Resumeix tres nivells visibles: `TASCA`, `MAIN` i `PUBLICACIÓ`.
- Distingeix explícitament entre `neta de tasca`, `llesta per integrar` i `llesta per publicar`.
- Dona una línia executiva final:
  - `DECISIÓ CEO: POTS DIR "AUTORITZO DEPLOY"`
  - o `DECISIÓ CEO: NO POTS DIR "AUTORITZO DEPLOY"`
- Si no es pot publicar, mostra només 1-3 motius curts.

## Què garanteix `publica`

- Publica a `prod` només allò que ja és a `main`.
- No accepta residus ni `prod` fora de `main`.
- Deixa traça operativa del resultat.

## Què passa quan alguna cosa falla

- Si falla `acabat`, la feina continua al worktree i no s'integra res.
- Si falla `integra`, `main` queda intacta.
- Si `status` diu `BLOQUEJAT`, primer s'aplica `docs/REPO-HIGIENE-I-DIAGNOSTIC.md`.
- Si falla `publica`, `prod` no s'ha de donar per actualitzada.

## Traducció per a negoci

- `commit`: deixar un paquet de canvis tancat i guardat dins de la tasca.
- `push`: pujar aquest paquet al servidor perquè no depengui només de l'ordinador local.
- `integra`: passar una tasca ja tancada a la base comuna de treball (`main`).
- `deploy` o `publica`: fer arribar a producció allò que ja ha passat per `main`.
