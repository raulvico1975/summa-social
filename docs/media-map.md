# Media map

## Estructura final

- `public/brand/`: logos, marca i il·lustracions de marca reutilitzables.
- `public/media/features/<feature>/stills/`: imatges, posters i captures de funcionalitats.
- `public/media/features/<feature>/video/`: vídeos i captions de funcionalitats.
- `public/media/landing-pages/<slug>/stills/`: imatges i posters específics de landing.
- `public/media/landing-pages/<slug>/video/`: vídeos i captions específics de landing.
- `public/media/landing-pages/<slug>/source/`: originals no consumits directament.
- `public/media/editorial/`: visuals comercials o editorials no lligats a una feature concreta.
- `public/media/archive/`: fitxers dubtosos, històrics o solts que no s’han eliminat.

## Mapa antic -> nou

| Origen | Destí | Criteri |
|---|---|---|
| `public/visuals/functionalities/conciliation/` | `public/media/features/conciliacio-bancaria/` | Demo funcional de conciliació. |
| `public/visuals/functionalities/dashboard/` | `public/media/features/dashboard/` | Demo funcional de dashboard. |
| `public/visuals/functionalities/expenses/` | `public/media/features/expenses/` | Demo funcional de despeses. |
| `public/visuals/landings/<slug>/animations/` | `public/media/landing-pages/<slug>/video/` | Vídeos i captions de landings. |
| `public/visuals/landings/<slug>/optimized/` | `public/media/landing-pages/<slug>/stills/` | Imatges optimitzades i posters. |
| `public/visuals/landings/<slug>/editorial/` | `public/media/landing-pages/<slug>/stills/` | Imatges pròpies d’una landing. |
| `public/visuals/landings/<slug>/source/` | `public/media/landing-pages/<slug>/source/` | Originals conservats separats. |
| `public/visuals/web/features-v3/` | `public/media/features/<feature>/stills|video/` | Assets classificats per feature i renombrats sense `blockN` ni `features-v3`. |
| `public/visuals/web/features/` | `public/media/features/<feature>/stills/legacy-*` | Stills històrics classificables, conservats com a legacy. |
| `public/visuals/web/web_*` | `public/media/features/<feature>/stills/` o `public/media/editorial/web/` | Rutes públiques més semàntiques segons ús. |
| `public/visuals/marca/doodle_*` | `public/brand/illustrations/doodles/` | Il·lustracions de marca, no logos. |
| Fitxers `summa-07-contact*.jpg` de l’arrel | `public/media/archive/root-contact-shots/` | Fitxers solts sense feature evident. |

## Decisions especials

- No s’ha eliminat cap asset visual; els dubtosos han anat a `archive/`.
- Les variants `-ca` i `-es` s’han mantingut als noms quan ja existien.
- Els vídeos `.mp4`, `.webm` i captions `.vtt` s’han separat a `video/`.
- Les imatges `.png`, `.jpg` i `.webp` s’han separat a `stills/`, excepte originals dins de `source/`.
- `public/brand/` no s’ha reordenat, excepte per incorporar els doodles de `public/visuals/marca/` a `public/brand/illustrations/doodles/`.
- S’ha creat també `public/media/features/model-347-ong/` perquè hi havia assets existents i referenciats de Model 347.

## Fitxers enviats a archive/

- `summa-07-contact-0.jpg`
- `summa-07-contact-1.jpg`
- `summa-07-contact.jpg`
- `summa-07-v2-contact.jpg`

## Dubtes pendents

- Cap asset s’ha eliminat. Si algun fitxer de `archive/root-contact-shots/` es vol reutilitzar públicament, caldrà classificar-lo en una feature, landing o carpeta editorial concreta.
