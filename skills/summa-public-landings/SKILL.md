---
name: summa-public-landings
description: Per a pàgines públiques de Summa Social, genera contingut i codi React/Next.js de landings, hubs i seccions informatives mantenint la identitat de marca, el to per a ONG i l'estil visual del web.
---

# Summa Social — Public Landings

## Objectiu
Generar contingut i codi React/Next.js per a les pàgines públiques del web de Summa Social:
- landings
- hubs
- pàgines informatives
- seccions noves dins pàgines públiques existents

## Abast
Aquesta skill treballa només sobre el web públic.
No genera funcionalitats internes de l’app.
No defineix arquitectura de producte.
No inventa rutes ni sistemes nous si no s’han indicat.

## Principis de disseny
- Contenidors centrats amb `container mx-auto`
- Amplada habitual amb `max-w-6xl` o `max-w-5xl`
- Seccions amb `py-16 lg:py-24`
- Separació vertical amb `space-y-6`
- Targetes amb `rounded-xl border border-border/50 shadow-sm bg-background overflow-hidden`

## Tipografia
- Títols amb `font-bold tracking-tight text-foreground`
- Textos descriptius amb `text-muted-foreground`

## Botons
- Primari: `bg-primary text-primary-foreground`
- Secundari: `border border-input bg-background`

## Guia de copywriting
No vendre funcionalitats com a llista tècnica.

Prioritzar resultats reals per a entitats:
- ordre
- control
- tranquil·litat administrativa
- estalvi de temps
- seguretat fiscal

Fer servir terminologia pròpia del sector:
- entitats
- ONG
- tercer sector
- conciliació bancària
- remeses SEPA
- certificats de donació
- Model 182
- justificació de subvencions
- control econòmic

## To
- proper
- expert
- clar
- honest

Evitar llenguatge corporatiu agressiu, exageracions comercials o frases buides.

## Estructura de seccions
Quan generis una secció nova, segueix aquest esquema:
1. context curt o badge
2. H2 potent i descriptiu
3. text de suport amb `text-muted-foreground`
4. element visual:
   - icona Lucide
   - o placeholder/caixa visual amb `aspect-video rounded-xl`

## Directiva de codi
Quan generis React/Next.js o HTML:
- només Tailwind
- responsive mobile-first
- codi simple i llegible
- sense CSS personalitzat
- sense styled components
- sense dependències noves
- sense frameworks externs addicionals

## Estructura típica d’una landing
1. Hero
2. Problema del sector
3. Solució de Summa Social
4. Beneficis clau
5. Exemple o cas d’ús
6. CTA final

## CTA recomanats
Prioritzar:
- Veure com funciona
- Demanar una demo
- Provar amb la teva entitat
- Parlar del teu cas

Evitar:
- Compra ara
- Missatges agressius o massa genèrics

## Límits
- No inventar funcionalitats internes no confirmades
- No inventar claims comercials no suportats
- No assumir patrons tècnics no indicats
- Si falta context clau, indicar exactament què falta
