# Developer Entry

Entrada curta per a desenvolupadors nous, handoff i ús amb Codex.

L'objectiu d'aquest document no és redefinir el projecte, sinó donar una orientació ràpida i segura abans de tocar res.

## Mapa real del repo

- `src/` - aplicació principal Next.js, components i lògica de negoci
- `functions/` - Cloud Functions desplegades per separat
- `scripts/` - automatitzacions, manteniment, CI i workflows locals
- `docs/` - documentació d'autoritat, suport i operativa
- `agents/` - prompts i guardrails d'agents versionats al repo
- `octavi/` - sistema editorial amb calendari, contractes, estat i artefactes
- `help/` - capa legacy congelada per compatibilitat
- `public/` - assets públics, visuals i manuals servits en runtime
- `tests/` - proves complementàries

## Entrades recomanades segons necessitat

- Entendre producte: `README.md`
- Entendre documentació: `docs/README.md`
- Entendre manteniment real: `docs/DEV-SOLO-MANUAL.md`
- Entendre govern i deploy: `docs/DEPLOY.md`, `docs/GOVERN-DE-CODI-I-DEPLOY.md`
- Entendre el contracte funcional complet: `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- Entendre el flux d'agent: `CODEX.md` i `agents/AGENTS.md`

## Rutes estables que avui no convé moure

### `help/topics/`

És legacy, però continua sent consumit per scripts i checks del repo. No és només una carpeta "vella"; encara forma part del contracte de compatibilitat.

### `octavi/summa/editorial/`

Conté calendari, contractes, fitxers de runtime i artefactes amb paths esperats. Moure-la requereix actualitzar referències en prompts, scripts i JSON persistits.

### Documents d'autoritat de `docs/`

Aquestes rutes apareixen referenciades des de scripts, UI i documents:

- `docs/DEPLOY.md`
- `docs/GOVERN-DE-CODI-I-DEPLOY.md`
- `docs/DEV-SOLO-MANUAL.md`
- `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`

### `agents/AGENTS.md`

No és només documentació; també és una peça de contracte per a fluxos d'agent i documents editorials.

## Criteri de reorganització segura

Per deixar el repo més professional sense risc, el criteri correcte és:

1. millorar l'entrada i la navegació
2. explicitar què és actiu, què és legacy i què és runtime
3. blindar artefactes locals a `.gitignore`
4. ajornar moviments de carpetes fins que es facin amb actualització completa de referències

## Fases recomanades

### Fase 1: segura i sense regressions

- reforçar `README.md`
- afegir `CONTRIBUTING.md`
- mantenir un índex curt per desenvolupament a `docs/developer/`
- netejar artefactes locals amb `.gitignore`

### Fase 2: reordenació governada

Només quan es vulgui assumir un canvi amb més abast:

- moure `help/` a un espai `legacy/` i actualitzar scripts
- agrupar `agents/`, `skills/` i `octavi/` sota una taxonomia comuna d'automatització
- treure de l'arrel de `docs/` els documents temàtics que no necessiten ruta fixa

Fins que aquesta fase no es faci de forma controlada, és millor una estructura estable i ben explicada que una estructura teòricament més neta però trencadissa.
