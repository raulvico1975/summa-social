# Summa Social — Data Interfaces (Taules i llistats)

Aquest document defineix un patró únic per taules (Moviments i Projectes).

## Jerarquia de dades (fixa)
1) Import (alineat dreta; color verd/vermell segons signe)
2) Descripció / Concepte (text principal)
3) Estat (badges 0% / parcial / 100% amb mapping tancat)
4) Metadades (categoria, contacte, origen) en neutral

## Categories
- Sempre neutral.
- UI preferida: badge/pill `outline` o suau.
- No usar colors semàntics.

## Documents
- Icona `FileText` sempre.
- Gris = sense document.
- Verd = té document.
- Tooltip sempre.
- Click target mínim 36x36.

## Estats (assignació / completitud)
- 0%: neutral (outline)
- 1–99%: ambre (solid suau)
- 100%: verd (solid)

## Rows especials
- Devolució: badge vermell; fons molt suau opcional (≤ 8%).
- Comissió: badge ambre; mai vermell.

## Responsive obligatori
- Mòbil: reduir columnes i portar metadades sota el concepte.
- No perdre informació: només canvia ubicació.
