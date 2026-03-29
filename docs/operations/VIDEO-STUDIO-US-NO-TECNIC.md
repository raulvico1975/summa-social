# Video Studio - Us No Tecnic

## Idea base

No cal pensar en scripts, ffmpeg ni storyboards.

La manera correcta de treballar-hi es:

1. obrir el centre `Video Studio` dins de l admin
2. copiar un prompt base
3. dir a Codex quina peça vols
4. deixar que el sistema prepari gravacio, render i publicacio

## On ho veuras

- `Admin -> Contingut -> Video Studio`

Alla hi trobaras:

- quina es la interfaz recomanada
- per que `Telegram/Octavi` no es l entrada principal per aquest cas
- prompts rapids
- projectes existents, amb el seu estat real
- seguent pas recomanat per a cada projecte
- prompt exacte per copiar i demanar-li a Codex
- presets i marques disponibles

## Que has de demanar

Exemples bons:

- `Vull un video curt per landing sobre remeses de quotes, en catala i castella`
- `Necessito una peça comercial per la home de Summa, 35-40 segons, to premium`
- `Adapta aquest video a square i vertical per xarxes`

## Que no cal que decideixis tu

- com es grava
- quin script toca
- quin storyboard toca
- quin format de captions toca
- on van els fitxers finals

Aixo ho resol el sistema amb:

- `brand`
- `preset`
- `project`
- `render`
- `publish`

## Estat dels projectes

Un projecte pot estar en:

- `draft`: encara falta definir-lo
- `ready`: esta definit pero no executat
- `rendered`: ja te peces generades localment
- `published`: els assets ja estan copiats a les rutes publiques

## Criteri d interfaz

Ara mateix la recomendacio bona es:

- `centre intern de Video Studio + Codex`

No:

- Telegram com a entrada principal
- una app nova separada

Aquestes opcions podran arribar mes endavant, pero ara mateix complicarien mes del que ajudarien.

## Regla nova per a videos de la home

Si demanes un `video mare` o `video principal` de la home, el sistema ha d entendre per defecte:

- no un trailer ultracurt
- si una demo curta de funcionalitats
- amb ritme clar
- amb blocs que es puguin entendre
- i amb una qualitat d export mes exigent
- i basada en captures master de qualitat, no en peces curtes ja recomprimides

## Objectiu d aquest sistema

Que quan diguis:

- `fes un video per aquesta landing`
- `ara adapta'l a xarxes`
- `refem-lo mes comercial`

el sistema ho pugui convertir en un flux estable i professional.
