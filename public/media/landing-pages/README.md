# Assets landings publiques (SEO)

Estructura per cada landing:

- `source/`: originals (jpg, jpeg, png, webp, mp4, mov, m4v, webm)
- `stills/`: versions optimitzades generades (`.webp`, `.avif`) i posters de video
- `video/`: peces curtes per web generades (`.webm` + `.mp4` fallback) i captions

Landings preparades:

- `model-182`
- `certificats-donacio`
- `remeses-sepa`
- `importar-extracte-bancari`
- `gestio-donants`

## Flux recomanat

1. Copia imatges originals a `source/` de la landing.
2. Executa `npm run images:landings:optimize`.
3. Fes servir les versions de `stills/` per imatges (`.avif` o `.webp`) i `video/` per video (`.webm` + `.mp4` fallback).

## Notes SEO/practiques

- Prioritza `AVIF` com a primera opcio i `WebP` com a fallback.
- Evita pujar PNG/JPG directament a la landing excepte casos justificats.
- Mantingues noms estables de fitxer per evitar trencar referencies.
