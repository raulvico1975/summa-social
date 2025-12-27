# Summa Social — Color System (Tancat)

Aquest sistema és tancat. No s'hi afegeixen usos nous sense actualitzar aquest document.

## Regla mare
El color NO descriu dades.
El color descriu estat, risc o acció.

## Mapping semàntic (únic)

### Verd (success)
Significat: complet / correcte / finalitzat
Permès:
- Import positiu (ingrés)
- Estat 100%
- Checks finals
Prohibit:
- Categories
- Accions
- Documents
- Contactes

Tailwind recomanat:
- text: `text-emerald-600`
- bg suau: `bg-emerald-50/40`
- border: `border-emerald-200`

### Vermell (destructive)
Significat: impacte negatiu o incidència fiscal
Permès:
- Import negatiu (despesa)
- Devolucions
- Errors crítics
Prohibit:
- Categories (encara que siguin de despesa)
- Comissions
- Parcials

Tailwind recomanat:
- text: `text-rose-600` (o `text-red-600` si ja és estàndard)
- bg suau: `bg-rose-50/40`
- border: `border-rose-200`

### Ambre (warning)
Significat: pendent / parcial / revisió
Permès:
- Comissions
- Assignació parcial (1–99%)
- Needs review
- Falta document (si cal avisar)
Tailwind recomanat:
- text: `text-amber-700`
- bg suau: `bg-amber-50/50`
- border: `border-amber-200`

### Blau (primary action)
Significat: acció de l'usuari
Permès:
- Assignar / Afegir / Enllaços
- Filtres actius
Tailwind recomanat:
- text: `text-sky-600`
- bg suau: `bg-sky-50/50`
- border: `border-sky-200`

### Gris (neutral)
Significat: metadades i context
Obligatori per:
- Categories
- Contactes (si no és incidència)
- Origen / destinatari
- Estat 0%
Tailwind recomanat:
- text: `text-muted-foreground`
- bg: `bg-muted/30` o cap
- border: `border-border`

## Regles aplicades
1) Categories mai en vermell/verd: sempre neutral.
2) Documents mai en vermell: gris/verd.
3) Vermell només quan hi ha despesa/devolució/error real.
