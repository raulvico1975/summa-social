# Member Remittance Landing

## Objectiu

Peça curta per la landing `remeses-sepa` i per la capacitat equivalent de la home. Ha d ensenyar que Summa Social prepara la remesa, deixa revisar incidències i exporta el fitxer XML llest per al banc.

## Relat

1. Entrar al wizard de `Remesa SEPA`
2. Mostrar configuració de compte i data de cobrament
3. Mostrar la selecció de cobraments preseleccionats
4. Arribar a la revisió final
5. Tancar amb l acció d `Exportar XML`

## Cas demo

- Flux: `member-remittance-collection-demo`
- Mode seed: `work`
- Dades preparades al seed:
  - socis recurrents elegibles per cobrament
  - import total i resum de remesa llestos per revisar

## Sortida

- captura base: `output/playwright/member-remittance-collection-demo/member-remittance-collection-demo.mp4`
- landing render:
  - `output/playwright/member-remittance-collection-demo/member-remittance-landing.ca.mp4`
  - `output/playwright/member-remittance-collection-demo/member-remittance-landing.es.mp4`
- captions overlay:
  - `.vtt` per a `ca` i `es`
