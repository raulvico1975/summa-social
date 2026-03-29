# Video Studio Foundation

## Objectiu

Convertir el sistema actual de gravacio i render de demos de Summa en una base de producte reutilitzable:

- prou simple per a un usuari no tecnic
- prou estructurada per a Codex
- prou generica per reutilitzar-la mes endavant en altres apps

## Decisio tecnica

Per ara, la decisio segura i agil no es una app nova.

La base correcta es:

1. `repo toolkit`
2. `skill/plugin` per sobre
3. `app interna` nomes si el volum, l equip i la necessitat de self-service ho justifiquen

## Per que no una app ja

- El motor de captura i postproduccio ja existeix dins del repo.
- Encara estem definint estandards de ritme, copy, presets i motion.
- Una app ara mateix consolidaria massa aviat decisions que encara estan madurant.
- Un plugin o capa de manifest ens dona gairebe tot el valor amb menys cost i menys rigidesa.

## Capes del sistema

### 1. Capture engine

Ja existeix i viu principalment a:

- `scripts/demo/record-*.mjs`
- `scripts/demo/up.mjs`
- `scripts/demo/smoke-demo.mjs`

Responsabilitat:

- preparar demo
- navegar producte real
- gravar fluxos repetibles

### 2. Postproduction engine

Ja existeix principalment a:

- `scripts/demo/postproduce-demo-video.mjs`

Responsabilitat:

- render final
- variants d idioma
- captions
- intro/outro
- talls per segments

### 3. Brand layer

Nova capa estructurada a `studio/brands/`.

Responsabilitat:

- logos
- clips d intro/outro
- estil de captions
- paleta
- motion assets
- doodles o ilustracions de marca

### 4. Product layer

Nova capa estructurada a `studio/presets/` i `studio/projects/`.

Responsabilitat:

- definir el tipus de peça
- web hero
- landing SEO
- social square
- social vertical
- home promo

### 5. Operator layer

Nova capa estructurada a:

- `scripts/video-studio/studio-cli.mjs`

Responsabilitat:

- diagnosi
- llistar marques i presets
- scaffold de projectes
- donar una interfície estable a Codex i, mes endavant, a plugin

## Experiencia desitjada per a Raül

La interfície mental hauria de ser aquesta:

1. "Vull un video sobre conciliacio bancaria"
2. "El vull per landing i per xarxes"
3. "En catala i castella"
4. "Amb to premium i identitat Summa"

La traduccio tecnica d aixo ha de recaure en el sistema:

- marca: `summa`
- preset: `landing-hero`, `social-square`, `social-vertical`
- escenari base: gravacio o reutilitzacio d una base existent
- storyboard: captions i ritme
- export: public web o carpeta d artefactes

## Regla nova per a la peça mare de la home

Per Summa, el criteri correcte passa a ser:

- `home explainer premium`
- 35-40 segons
- fluxos reals del dia a dia
- ritme clar entre blocs
- cada bloc identificable amb una caption curta
- menys sensacio de muntatge agressiu
- millor qualitat de render que una landing curta

L ordre recomanat avui per Summa es:

1. moviments i conciliacio
2. remeses IN
3. devolucions
4. fitxa de soci o donant
5. model 182

I la regla de qualitat:

- no construir la peça mare a partir de clips de landing ja recomprimits si existeixen captures master a `output/playwright/`
- permetre encoding per projecte quan una peça premium necessiti un estandard superior
- per a captures `commercial`, la sortida master ha de prioritzar qualitat sobre pes de fitxer i evitar exports tous en pantalles Retina

## Forma de creixer

### Fase 1. Repo toolkit

Ara.

- manifests
- presets
- brand config
- CLI

### Fase 2. Plugin de Codex

Quan el model estigui estable.

- prompt i skill millor encapsulats
- comandes de nivell producte
- menys dependecia del coneixement implicit del repo

### Fase 3. App interna

Nomes si volem:

- self-service per marketing
- preview visual
- cua de renders
- historial
- aprovacio
- multirepo o multiapp de veritat

## Criteris de qualitat

- cap dependencia nova
- res de workflows destructius
- manifests humans i editables
- configuracio genericament reutilitzable
- Summa continua sent el primer cas de marca, no l unic
- els presets `commercial` no poden quedar al mateix nivell de compressio que una preview o una landing curta

## Primer lliurable d aquesta branca

- carpeta `studio/`
- configuracio de marca Summa
- presets estandard
- plantilla de brief
- plantilla de projecte
- CLI `video:studio`

Amb aixo ja tenim una base seriosa per continuar la feina sense improvisar.

## Document complementari

Per a la capa d us no tecnic:

- `docs/operations/VIDEO-STUDIO-US-NO-TECNIC.md`
