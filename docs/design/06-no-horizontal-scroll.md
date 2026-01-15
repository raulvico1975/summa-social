# No Horizontal Scroll — Contracte (Normatiu)

## Principi

**No hi ha scroll horitzontal en cap viewport.**

Ni a mòbil (320px), ni a tablet (768px), ni a desktop estret (1024px), ni a cap resolució.

## Patrons prohibits

| Patró | Motiu |
|-------|-------|
| `overflow-x-auto` en layouts/pàgines | Amaga el problema, no el resol |
| `overflow-x-scroll` | Mai justificat |
| `min-w-[...]` en taules a md+ | Força amplada fixa que trenca viewports estrets |
| `whitespace-nowrap` en cel·les de taula | Impedeix wrap natural (excepte dates/imports curts) |

## Alternatives obligatòries

Quan una taula o grid no cap en viewport estret:

1. **Column collapse**: amagar columnes secundàries a `< md` o `< lg`
2. **Row expand**: mostrar detalls en fila expandible (accordion)
3. **Stacked list**: transformar taula en llista vertical a mòbil
4. **Truncate + tooltip**: escurçar text llarg amb `truncate` i tooltip complet

## QA obligatori

Abans de tancar qualsevol PR amb UI, verificar a DevTools:

| Viewport | Amplada |
|----------|---------|
| iPhone SE | 320px |
| iPad | 768px |
| Desktop estret | 1024px |
| Desktop normal | 1280px |

### Criteri de pass

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

- Cap scrollbar horitzontal visible
- Si el detector dev-only avisa: arreglar fins que quedi mut

## Detector dev-only

El layout del dashboard (`src/app/[orgSlug]/dashboard/layout.tsx`) inclou un detector automàtic que:

1. Detecta si `scrollWidth > clientWidth`
2. Troba el primer element culpable
3. Mostra warning a consola amb tag, classe i diferència

Només actiu en `NODE_ENV !== 'production'`.

## Excepcions

Cap excepció prevista. Si un cas sembla requerir scroll horitzontal, cal redissenyar la interfície.
