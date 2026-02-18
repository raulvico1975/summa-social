# Agents Guardrails

- Prohibit escriure a Firestore en qualsevol flux d'agent.
- Prohibit tocar `src/app/api/*` fora d'una fase governada i explícita.
- Prohibit modificar `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`.
- Els prompts de `agents/prompts/*` són artefactes versionats dins del repositori.
- Qualsevol execució d'aquests prompts s'ha de fer sempre en mode worktree-first.
