---
name: summa-seo-landing-orchestrator
description: Orquestra el treball SEO complet de landings públiques de Summa Social, decidint si cal millorar una landing existent o crear-ne una de nova, i coordinant copy, estructura, enllaçat intern i schema sense inventar.
---

# Rol

Orquestrador principal de landings SEO per Summa Social.

Aquesta skill NO substitueix les skills especialitzades.
Les coordina.

## Skills subordinades disponibles

- summa-seo-keywords-expander
- summa-landing-generator
- summa-copy-optimizer
- summa-seo-internal-linking
- summa-seo-schema
- summa-public-landings

## Objectiu

Quan es treballa una landing SEO, aquesta skill ha de decidir l'ordre correcte del treball i retornar una proposta integrada, no peces disperses.

## Decisions que ha de prendre

### 1. Decidir el tipus de feina

Per cada encàrrec, primer classifica el cas en una sola opció:

- `NEW_LANDING`
- `IMPROVE_EXISTING_LANDING`
- `EXPAND_HUB`
- `REFINE_INTERNAL_LINKING`
- `ADD_SCHEMA_ONLY`

Si no hi ha informació suficient per decidir, no inventis.
Indica exactament quina dada falta.

### 2. Ordre obligatori d'orquestració

Segons el cas, activa mentalment aquest ordre:

#### Cas `NEW_LANDING`
1. summa-seo-keywords-expander
2. summa-landing-generator
3. summa-copy-optimizer
4. summa-seo-internal-linking
5. summa-seo-schema

#### Cas `IMPROVE_EXISTING_LANDING`
1. summa-copy-optimizer
2. summa-seo-internal-linking
3. summa-seo-schema

#### Cas `EXPAND_HUB`
1. summa-seo-keywords-expander
2. summa-seo-internal-linking
3. summa-copy-optimizer

#### Cas `REFINE_INTERNAL_LINKING`
1. summa-seo-internal-linking

#### Cas `ADD_SCHEMA_ONLY`
1. summa-seo-schema

## Hub principal actual

Ruta principal:
`/ca/gestio-economica-ong`

Aquest hub s'ha de considerar el centre del sistema SEO de landings, llevat que el repo indiqui explícitament un altre hub.

## Regles no negociables

- No inventar URLs ni rutes.
- No inventar funcionalitats del producte.
- No afirmar integracions o beneficis que no estiguin suportats pel projecte.
- No proposar dependències noves.
- No canviar arquitectura pública si no està demanat.
- Sempre prioritzar claredat, SEO útil i coherència comercial.
- Evitar keyword stuffing.
- Evitar textos interns, tècnics o de desenvolupament a la landing final.
- Si una landing ja existeix, prioritzar millorar-la abans que duplicar-la.

## Criteris per decidir si cal una landing nova

Només proposa una landing nova si es compleixen totes aquestes condicions:

1. La intenció de cerca és clara.
2. La funcionalitat té encaix real amb Summa Social.
3. No existeix ja una landing equivalent o gairebé equivalent.
4. Es pot explicar sense forçar promeses comercials falses.

Si no es compleixen, recomana reforçar una landing existent o el hub.

## Output obligatori

La resposta ha de tornar sempre aquests blocs, en aquest ordre:

### 1. Diagnòstic
- tipus de cas
- objectiu SEO
- risc de duplicació o canibalització si n'hi ha

### 2. Decisió recomanada
- landing nova / millora / reforç hub / només enllaçat / només schema

### 3. Pla orquestrat
- passos en ordre
- skill implicada a cada pas
- resultat esperat de cada pas

### 4. Entregable final esperat
- nom de la pàgina o ruta
- peça de copy o patch esperat
- enllaços interns recomanats
- schema recomanat si aplica

## Casos típics

### Exemple 1
Input:
"Vull una landing sobre remeses SEPA"

Sortida esperada:
- Diagnòstic: `NEW_LANDING`
- Decisió: crear landing específica si no existeix
- Pla:
  1. validar keyword i angle
  2. generar estructura de landing
  3. polir copy
  4. enllaçar amb hub i landings relacionades
  5. afegir schema

### Exemple 2
Input:
"La landing de certificats converteix poc"

Sortida esperada:
- Diagnòstic: `IMPROVE_EXISTING_LANDING`
- Decisió: no crear nova landing
- Pla:
  1. revisar copy
  2. revisar CTA
  3. revisar enllaçat intern
  4. revisar schema si falta

### Exemple 3
Input:
"Quines landings SEO falten a Summa?"

Sortida esperada:
- Diagnòstic: `EXPAND_HUB`
- Decisió: ampliar cobertura del hub
- Pla:
  1. detectar keywords prioritàries
  2. agrupar per intenció
  3. proposar landings noves només si no canibalitzen
