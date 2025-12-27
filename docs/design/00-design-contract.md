# Summa Social — Design Contract (Normatiu)

Aquest document defineix el contracte de disseny de Summa Social. És normatiu: qualsevol UI nova o modificació que el contradigui s'ha de corregir.

## Objectiu de producte (percepció)
Summa Social ha de transmetre:
- Serenitat i previsibilitat
- Criteri i confiança (auditoria / fiscalitat)
- Absència de soroll i d'ornament gratuït
- Accions clares, dades prioritzades, risc visible

## Principi rector
El disseny NO descriu dades amb color ni ornaments.
El disseny descriu:
- estat (fet / pendent / parcial)
- risc (impacte negatiu, devolucions)
- acció (què pot fer l'usuari)

## Límits estètics (obligatoris)
- Estètica continguda, no expressiva.
- Paleta curta. El gris és el color majoritari.
- Contrast moderat: evitar blancs purs agressius i saturació alta.
- Més aire vertical en headers i seccions, sense perdre densitat de dades.
- Tipografia: jerarquia clara (títol > subtítol > dades > metadades). Evitar "text petit gris arreu" que mata jerarquia.

## Regles de coherència (no negociables)
- Un mateix significat cromàtic a tota l'app (veure 01-color-system.md).
- Les categories MAI codifiquen semàntica amb color.
- Documents: un sol llenguatge visual (icona FileText, gris/verd, tooltip).
- Taules: un sol patró de jerarquia de dades (veure 03-data-interfaces.md).
- Els estats buits han de ser dignes i informatius (no culpabilitzar, no soroll).

## Regla de rebuig
Qualsevol canvi que introdueixi:
- un nou significat de color
- badges nous sense mapeig d'estat
- variacions gratuïtes d'espais, mides o jerarquia
és incorrecte i s'ha de revertir o adaptar al contracte.

## "Sembla Summa Social" quan…
- en 3 segons entens què passa (import, estat, acció)
- el color només apareix quan aporta criteri
- la pantalla és densa però serena (no "crida")
