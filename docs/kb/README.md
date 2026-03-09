# KB Docs

Aquest directori conté la base de coneixement estructurada del bot i les eines mínimes per mantenir-la.

## Què hi ha aquí

- `cards/` - cartes base del coneixement
- `_fallbacks.json` - respostes base o de fallback
- `_schema.json` - contracte de forma de les cards
- `_policy.md` - criteri editorial i de qualitat
- `_eval/` - casos d'avaluació esperats
- `validate-kb.ts` - validador local de la KB

## Què és viu

Aquesta carpeta és **viva** perquè:

- hi ha codi que importa cards concretes
- hi ha scripts que auditen i validen la KB
- els fitxers d'avaluació entren a quality gates del bot

## Regla de manteniment

- no moure fitxers d'aquesta carpeta sense actualitzar imports i scripts
- si canvies l'estructura d'una card, revisa també `_schema.json`, `_policy.md` i l'eval
- si només vols entendre el sistema, comença per `_policy.md`
