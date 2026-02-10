---
name: summa-user-docs-updater
description: En PRs de Summa Social, proposa un patch per actualitzar el Manual d'Usuari i la FAQ (text d'usuari final), sense inventar. Inclou passos operatius, errors, i què fer quan surt malament.
---

# Summa Social — User Docs Updater (Manual + FAQ)

## Objectiu
A partir d'un PR, generar un **patch/diff** per actualitzar:
- `docs/manual-usuari-summa-social.md`
- `docs/FAQ_SUMMA_SOCIAL.md`

## Contracte anti-invenció (obligatori)
- No descriure res que no existeixi al PR o al codi existent.
- Si hi ha dubte: afegeix una nota "PENDENT DE CONFIRMAR" (no com a funcionalitat, sinó com a buit de doc intern).

## Inputs esperats
- Resum del canvi (PR description).
- Diff o fitxers tocats.
- Si hi ha UI nova, idealment captura/descripció del flux.

## Sortida obligatòria
1) **Check de cobertura**:
   - Manual: secció afectada (o proposta de nova subsecció)
   - FAQ: preguntes noves/actualitzades
2) **Patch** (unified diff) per als 2 fitxers.
3) **Pas-a-pas d'usuari**:
   - Sempre en lògica "on clicar / què veuràs / què fer si no quadra"
   - Inclou "Desfer / Reprocessar" quan pertoqui
4) **Missatges i errors**:
   - Si el PR introdueix codis o toasts, reflectir-los amb el text real.

## Estil
- Orientat a operativa real.
- Frases curtes, sense tecnicismes innecessaris.
- Incloure exemples mínims (import, data, concepte) només si estan suportats.

## Límits
- No tocar la referència completa (això és una altra skill).
