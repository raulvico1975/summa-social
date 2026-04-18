# Summa Social — Sistema de Marca Multimèdia

## Objectiu

Definir un sistema estable perquè web, portades de blog i vídeo curt comparteixin una mateixa identitat visual i editorial sense contaminar el core de producte ni els desenvolupaments paral·lels.

La prioritat no és “generar assets”. La prioritat és tenir una font de veritat única, reproduïble i revisable.

## Context actual

El repo ja té peces valuoses però disperses:

- contracte visual de producte a `docs/design/00-design-contract.md`
- sistema de color a `docs/design/01-color-system.md`
- contracte de publicació de portades a `docs/contracts/blog-publish-cover-image.md`
- contracte editorial Octavi -> Summa a `octavi/summa/editorial/contracts/editorial-contract.md`

Fora de `main`, en una worktree editorial separada, ja existeix un precedent útil:

- `config/blog-image-prompt-base.txt`
- `src/lib/editorial-native/cover.ts`
- el wrapper editorial Python de generació de portada
- ús d'imatges de referència aprovades com a part del contracte visual

També existeix un prototip local de vídeo curt a `video-studio/hyperframes/`, avui encara fora de `main`.

## Problema

La identitat visual real de Summa avui viu repartida entre:

- documents normatius de producte
- prompts i builders de portada de blog
- referències visuals de la web
- un prototip de vídeo separat

Això crea tres riscos:

1. drift entre canals
2. prompts bons però no versionats com a sistema
3. integracions lentes perquè el material de marca queda barrejat amb feina de producte

## Decisió

Construir un **Brand Canon únic** i fer que cada canal el consumeixi via contractes específics.

El precedent canònic del sistema serà el pipeline actual de `blog cover`, perquè ja té:

- base prompt estable
- capa específica per tema
- context del post
- referències visuals reals
- wrapper d'execució reproduïble

El vídeo curt no definirà una identitat nova. Heretarà aquest sistema.

## Principis

1. La marca es governa per contractes, no per intuïcions.
2. Les referències aprovades formen part del sistema, no són opcionalment decoratives.
3. La memòria només s'alimenta de peces aprovades.
4. El sistema de marca viu separat del core de producte.
5. Qualsevol runtime ha de reflectir el contracte real; no s'accepta drift silenciós entre builder i motor final.

## Arquitectura proposada

### 1. Brand Canon

Document mestre que consolida:

- to visual
- regles de composició
- usos del color
- què no s'ha de fer
- semàntica de referències

Proposta de fitxer:

- docs/brand/brand-canon.md

Aquest document heretarà i resumirà el que avui està repartit entre la capa `docs/design/*`, la capa editorial i el sistema visual de portades.

### 2. Channel Contracts

Un contracte curt per canal:

- docs/brand/contracts/blog-cover.md
- docs/brand/contracts/short-video.md
- docs/brand/contracts/web-visual.md

Cada contracte ha de definir:

- què és obligatori
- què pot variar
- quines referències es poden usar
- format i sortida acceptable
- regles de review

### 3. Reference Registry

Catàleg d'assets i imatges de referència aprovades.

Proposta:

- docs/brand/references/approved.md
- docs/brand/references/rejected.md
- public/brand/references/* només si cal centralitzar copies estables

La idea clau és que `web_divideix_remeses_ca.webp` i `web_concilia_bancaria_ca.webp` no siguin només “fitxers útils”, sinó referències registrades amb motiu d'ús.

### 4. Prompt Registry

Versionar explícitament:

- prompt base
- presets temàtics
- builders
- prompts finals aprovats com a exemple

Proposta:

- docs/brand/prompts/blog-cover-base.md
- docs/brand/prompts/presets/*.md
- docs/brand/prompts/examples/*.md

El codi que construeix prompts pot seguir vivint en scripts, però la norma visual ha d'estar llegible sense haver d'obrir TypeScript.

### 5. Execution Contracts

Documentar la cadena real d'execució:

- builder
- wrapper
- motor final
- ordre d'arguments
- semàntica d'errors

Proposta:

- docs/brand/execution/blog-cover.md
- docs/brand/execution/short-video.md

Aquest punt és crític perquè avui ja hi ha una divergència coneguda:

- `cover.ts` passa `--aspect-ratio`
- `generate_cover.py` l'accepta
- però el wrapper no el reenvia a `nano banana`

Això és un bug de contracte i s'ha de corregir quan es porti aquest pipeline a la branca de marca.

### 6. Approval Memory

Memòria materialitzada només amb assets aprovats.

Proposta:

- docs/brand/memory/brand-memory.json
- docs/brand/memory/brand-memory.md

Entrades mínimes:

- id de la peça
- canal
- prompt final
- referències usades
- output final
- motiu d'aprovació
- què s'ha d'heretar en peces futures

## Ordre de resolució

Qualsevol generació futura ha de consultar aquest ordre:

1. document mestre de cànon de marca
2. contracte del canal
3. referències aprovades
4. prompt builder o plantilla del canal
5. contracte d'execució
6. brief concret de la peça

Si dos artefactes es contradiguin, guanya l'ordre anterior.

## Aïllament respecte del core

Tot aquest treball s'ha de fer en una branca i worktree separades, arrencades des de `main`.

Regla d'abast:

- Permès: la futura capa docs/brand/, la futura capa public/brand/, `video-studio/` i scripts de generació de marca
- Prohibit: `src/app` de producte, `functions/`, fluxos de negoci, API core, models de dades de producte

Integració prevista:

- PR petita i autònoma
- rutes de fitxers disjuntes del core
- possibilitat de `cherry-pick` de docs i scripts si convé accelerar

## Pla de fases

### Fase 1 — Canonitzar blog cover

- crear la capa docs/brand/*
- formalitzar prompt base, presets i referències
- documentar el contracte d'execució real
- corregir el forwarding d'`--aspect-ratio`

### Fase 2 — Definir short-video contract

- adaptar `video-studio/hyperframes` al cànon
- fixar layout, ritme, overlays i transicions admeses
- documentar relació entre vídeo i llenguatge visual de portades

### Fase 3 — Pilot aprovat

- produir una peça curta concreta
- review humana
- registrar la peça a `brand-memory`

### Fase 4 — Operativa recurrent

- checklist d'aprovació
- biblioteca d'exemples aprovats
- governança perquè noves peces no introdueixin drift

## Riscos

### Risc 1 — Convertir la memòria en abocador

Si s'hi guarda qualsevol output, la marca es degrada.

Mitigació:

- només entren peces aprovades
- cada entrada ha d'incloure motiu d'aprovació

### Risc 2 — Duplicar criteri entre docs i codi

Si el prompt real canvia però el document no, el sistema torna a derivar.

Mitigació:

- documents de contracte + smoke tests de builder
- revisió explícita de divergències de runtime

### Risc 3 — Barrejar màrqueting amb producte

Acaba fent por integrar qualsevol canvi.

Mitigació:

- worktree i branca separades
- paths disjunts
- zero canvis a core en la fase 1

## Scope immediat recomanat

Primer increment acceptable:

- no tocar el core
- no tocar encara la UI pública
- sí crear la capa docs/brand/*
- sí portar i documentar el precedent `blog cover`
- sí preparar el contracte de `short-video`

## Estat de sortida esperat d'aquesta branca

Quan aquesta branca estigui llesta per integrar, ha d'aportar:

- un cànon únic llegible
- un contracte clar per a blog cover
- una definició clara del futur canal vídeo
- un execution contract verificable
- una base perquè els següents vídeos es facin amb criteri estable

## Decisió final

La marca multimèdia de Summa s'ha de tractar com un subsistema separat del producte:

- amb worktree pròpia
- amb contractes explícits
- amb memòria només d'aprovats
- i amb el pipeline actual de `blog cover` com a precedent canònic

No es construirà “un prompt per a vídeo”.
Es construirà un sistema perquè blog, web i vídeo parlin el mateix idioma visual.
