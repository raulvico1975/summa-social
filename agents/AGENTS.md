# Agents Guardrails

- Aquest fitxer resumeix guardrails operatius per agents. No substitueix la documentació canònica del repositori ni crea una segona autoritat documental.
- Prohibit escriure a Firestore en qualsevol flux d'agent.
- Prohibit tocar `src/app/api/*` fora d'una fase governada i explícita.
- Prohibit modificar `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`.
- Els prompts de `agents/prompts/*` són artefactes versionats dins del repositori.
- Qualsevol execució d'aquests prompts s'ha de fer sempre en mode worktree-first.

## Flux Operatiu

- Si `git status --short` no és net, no s'inicia cap tasca nova en aquest checkout sense separar o aparcar abans el WIP existent.
- Una línia de feina equival a una branca i, si hi ha treball en paral·lel, a una worktree pròpia.
- No es barregen al mateix branch canvis deployables amb WIP de demos, landings, assets o exploracions encara no tancades.
- Si durant una tasca apareix una línia paral·lela fora d'abast, s'ha de separar en una altra worktree/branca o aparcar-se explícitament abans de continuar.
- `stash` és només un recurs temporal de seguretat; no és el mecanisme habitual per gestionar treball paral·lel.
- Abans de fer `commit`, `push` o obrir PR, la branca activa ha de tornar a un estat net i coherent amb un únic objectiu publicable.
