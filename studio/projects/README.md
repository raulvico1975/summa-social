# Projects

Cada subcarpeta d aqui representa una peça o campanya concreta.

Exemples:

- una landing SEO
- un hero comercial de la home
- una peça per LinkedIn
- un reel vertical

La idea es que `brand + preset + project manifest` siguin suficients per activar el flux correcte sense tornar a decidir-ho tot cada vegada.

## Comandes clau

- `npm run video:studio -- list-projects`
- `npm run video:studio -- show-project --slug <slug>`
- `npm run video:studio -- validate-project --slug <slug>`
- `npm run video:studio -- render-project --slug <slug>`
- `npm run video:studio -- publish-project --slug <slug>`

## Criteri practic

- `show-project` explica la peça en llenguatge de producte
- `validate-project` diu si esta llesta o que falta
- `render-project` genera els artefactes locals
- `publish-project` copia video, captions i poster a la carpeta publica
