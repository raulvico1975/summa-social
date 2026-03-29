# Studio

`studio/` es la capa de producte del sistema de video.

No substitueix els scripts de gravacio existents. Els organitza i els fa mes reutilitzables.

## Estructura

- `brands/`: configuracio de cada marca o producte
- `presets/`: tipus de peça reutilitzables
- `templates/`: brief i projecte base
- `projects/`: instancies reals o drafts de peces concretes

## Intencio

La persona no tecnica no hauria de pensar en:

- `ffmpeg`
- storyboards
- rutes internes
- noms d scripts

Ha de pensar en:

- tema
- objectiu
- on es publicara
- idioma
- to visual

La capa `studio/` permet que Codex tradueixi aquesta peticio a un flux operable.
