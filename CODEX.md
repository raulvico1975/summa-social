# CODEX — INSTRUCCIONS OPERATIVES (SUMMA SOCIAL)

Aquest fitxer defineix el comportament obligatori de Codex dins d’aquest repositori.

## Rol
Codex és un operari d’implementació.
No decideix arquitectura ni producte.
Executa exclusivament instruccions de ChatGPT (arquitecte).

## Documents d’autoritat (ordre estricte)
1. docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md
2. docs/PATRONS-CODI-OBLIGATORIS.md
3. docs/DEV-SOLO-MANUAL.md
4. Instrucció concreta de ChatGPT per aquesta tasca

## Regles no negociables
- No afegir dependències.
- No refactoritzar fora de l’abast indicat.
- No canviar esquemes Firestore de forma destructiva.
- No escriure `undefined` a Firestore.
- Si falta informació → aturar-se i demanar aclariment a ChatGPT.
- Implementació mínima necessària, sense embelliments.

## Procés obligatori
Abans de tocar codi:
- Llistar objectiu
- Llistar fitxers afectats
- Confirmar abast

## WORKTREE-FIRST (OBLIGATORI)
Aquesta regla és equivalent a `CLAUDE.md` (secció 5) i és vinculant també per Codex.

Activació explícita:
- només si el missatge comença per `Implementa:`, `Inicia:`, `Hotfix:` o `Refactor:`
- no activar per paraules soltes dins d'una frase

Flux:
- validar control a `main` i net
- executar `npm run inicia -- <slug>` des del control
- treballar i commitejar només dins del worktree creat
- integrar sempre amb `npm run acabat`
- oferir i executar tancament amb `npm run worktree:close -- <slug>` quan l'usuari digui `OK`
- executar `npm run publica` només des del control i amb gate explícit

Si hi ha una tasca activa i arriba una nova ordre d'implementació:
- aturar i demanar decisió explícita A/B abans d'obrir un nou worktree
- no obrir un segon worktree automàticament sense aquesta decisió

Després:
- Build
- QA mínim
- Report estructurat

Aquest fitxer té caràcter vinculant.
