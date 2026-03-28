# Contribuir a Summa Social

Entrada curta per treballar al repo sense haver de reconstruir-ne el context des de zero.

## Llegeix primer

1. `README.md`
2. `docs/developer/README.md`
3. `docs/README.md`
4. `docs/DEPLOY.md`
5. `docs/GOVERN-DE-CODI-I-DEPLOY.md`
6. `docs/DEV-SOLO-MANUAL.md`

Si treballes amb Codex o fluxos d'agent:

7. `CODEX.md`
8. `agents/AGENTS.md`

## Flux segur de desenvolupament

1. Instal·la dependències amb `npm install`
2. Configura `.env.local` a partir de `.env.local.example`
3. Arrenca la web amb `npm run dev:turbo`
4. Valida el canvi amb `npm run build` i `npm run test`
5. Si toques documentació, passa també `npm run docs:check`

## Flux segur de repositori

- `npm run status` és la font d'estat
- `npm run inicia` crea worktree de tasca
- `npm run acabat` valida, commita i puja la branca de la tasca
- `npm run integra` és l'única porta d'entrada a `main`
- `npm run publica` és l'única porta d'entrada a `prod`

## Regles pràctiques

- No afegir dependències sense decisió explícita
- No refactoritzar fora d'abast
- No fer canvis destructius d'esquema a Firestore
- No escriure `undefined` a Firestore
- No moure rutes estables en una neteja estètica

## Rutes estables que no s'han de moure "per ordenar"

- `docs/DEPLOY.md`
- `docs/GOVERN-DE-CODI-I-DEPLOY.md`
- `docs/DEV-SOLO-MANUAL.md`
- `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- `help/topics/`
- `octavi/summa/editorial/`
- `agents/AGENTS.md`

Aquestes rutes tenen referències repartides entre scripts, runtime, contractes i documents del repo. Si algun dia es mouen, cal fer-ho com a canvi governat i actualitzant totes les referències en el mateix patch.

## Què sí és segur reorganitzar

- `README.md`
- `CONTRIBUTING.md`
- índexs i mapes de `docs/`
- nous documents de `docs/developer/`
- `.gitignore`
- documentació de handoff i onboarding

## Què és delicat

- renombrar carpetes de primer nivell
- moure `help/`, `octavi/`, `agents/` o documents d'autoritat
- tocar scripts que assumeixen paths literals
- reorganitzar runtime editorial o artefactes persistits
