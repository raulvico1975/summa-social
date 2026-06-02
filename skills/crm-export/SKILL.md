---
name: crm-export
description: Exporta, valida i resumeix el CRM local de Summa Vendes en CSV o XLSX sense crear dependències noves ni enviar dades fora.
---

# CRM Export

## Objectiu

Preparar sortides revisables del CRM local:

- CSV per revisio rapida
- XLSX per lectura manual
- resum de leads per temperatura, estat i prioritat

## Regles

- Abans d'exportar, valida duplicats i camps obligatoris.
- No eliminis leads descartats.
- No canviis estat durant una exportacio.
- No enviis el fitxer a cap servei extern.
- Si hi ha errors de validacio, atura l'exportacio i mostra'ls.

## Eines

```bash
python3 scripts/sales/validate_crm.py path/to/leads.json
python3 scripts/sales/export_crm_excel.py path/to/leads.json path/to/leads.xlsx
```

## Camps prioritaris

L'exportacio ha de preservar l'ordre de camps definit a `skills/mini-crm-summa/SKILL.md`.
