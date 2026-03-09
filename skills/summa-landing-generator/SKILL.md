---
name: summa-landing-generator
description: Genera landings SEO completes per al web públic de Summa Social (estructura, copy i React/Tailwind) orientades a ONG i Tercer Sector.
---

# Summa Social — Landing Generator

## Objectiu
Generar landings completes per al web públic de Summa Social a partir d’una funcionalitat o problema del sector.

Exemples típics:
- Model 182
- certificats de donació
- remeses SEPA
- conciliació bancària
- importació d’extractes bancaris
- gestió de donants

## Resultat obligatori

Quan generis una landing, inclou sempre:

1. títol SEO
2. metadescription
3. slug recomanat
4. hero
5. problema del sector
6. solució Summa Social
7. beneficis clau
8. exemple d’ús
9. CTA final
10. codi React/Next.js amb Tailwind

## Principis de copy

No vendre software com a llista de funcionalitats.

Prioritzar beneficis reals per a entitats:
- ordre econòmic
- control de donacions
- conciliació clara
- menys errors administratius
- estalvi de temps

## Principis de disseny

- `container mx-auto`
- `max-w-6xl` o `max-w-5xl`
- `py-16 lg:py-24`
- `space-y-6`

Targetes habituals:

rounded-xl  
border border-border/50  
shadow-sm  
bg-background  
overflow-hidden

## To

- clar
- sobri
- expert
- orientat a ONG

Evitar exageracions comercials o llenguatge corporatiu agressiu.

## Directiva de codi

Quan generis React o HTML:

- només Tailwind
- mobile-first
- sense CSS personalitzat
- sense dependències noves
- sense inventar components si no cal

## Límits

- No inventar funcionalitats de Summa Social
- No assumir rutes o arquitectura que no s’hagin indicat
- Si falta context funcional, demanar només el mínim imprescindible
