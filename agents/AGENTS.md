# Agents Guardrails

## Autoritat

- Aquest fitxer no defineix el protocol canònic.
- Les fonts d'autoritat són `docs/DEPLOY.md`, `docs/GOVERN-DE-CODI-I-DEPLOY.md` i `docs/DEV-SOLO-MANUAL.md`.
- Aquest fitxer només imposa comportament d'execució en temps real per agents.

## Guardrails

- Prohibit escriure a Firestore en qualsevol flux d'agent.
- Prohibit modificar `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`.
- Els prompts de `agents/prompts/*` són artefactes versionats dins del repositori.
- La implementació es fa només dins del worktree de tasca.
- Si `git status --short` no és net, no s'inicia cap tasca nova en aquest checkout.
- `git status` és només higiene local del checkout; no substitueix `npm run status`.
- `npm run inicia` o `npm run implementa` només es llancen des del repositori de control, a `main` i net.
- Una tasca nova equival a una branca `codex/*` i a un worktree de tasca.
- Una branca equival a un únic objectiu publicable i a un únic PR.
- Si apareix WIP fora d'abast o una línia paral·lela, no es barreja: worktree nova o aparcament explícit abans de continuar.
- `stash` només es permet com a emergència puntual; no és el mecanisme habitual de treball paral·lel.
- `npm run status` és la font única d'estat operatiu global.
- Si `npm run status` diu `BLOQUEJAT`, s'atura el flux i no es continua amb `integra` ni `publica`.
- No es fa `commit`, `push` ni s'obre PR d'una branca amb workspace brut o amb WIP aliè barrejat.
