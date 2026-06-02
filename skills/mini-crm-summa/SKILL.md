---
name: mini-crm-summa
description: Gestiona un CRM local d'entitats per a Summa Vendes amb una fila per entitat, validacions, estats i actualitzacions sense automatitzar enviaments.
---

# Mini CRM Summa

## Principi

L'assistent no es el CRM. L'assistent treballa amb un CRM per preservar context, evitar duplicats i preparar decisions comercials millors.

El CRM pot ser JSON, CSV o Excel exportat, pero la logica ha de mantenir una fila per entitat.

## Camps

- id
- entitat
- web
- persona_contacte
- rol
- canal
- prioritat
- estat
- fets_verificats
- hipotesi_comercial
- risc
- angle
- missatge_proposat
- data_ultim_contacte
- proper_pas
- notes
- pla_probable
- motiu_pla_probable
- dolor_probable
- pregunta_obertura

## Estats

- nou
- revisat
- descartat
- missatge_aprovat
- contactat
- resposta
- conversa
- demo
- perdut

## Prioritats

- alta
- mitjana
- baixa

## Regles d'actualitzacio

- No dupliquis entitats. Compara id, nom normalitzat i web.
- Si una entitat ja existeix, actualitza-la.
- Si es descarta, no l'eliminis.
- Si ja esta contactada, no proposis un primer missatge.
- Si hi ha resposta, guarda frase literal i resum accionable.
- No barregis notes comercials temporals amb fets verificats.
- Valida duplicats i camps obligatoris abans de donar per bo un canvi.

## Contacte fet

Quan Raul diu que ha enviat un missatge o email:

1. estat = contactat
2. canal = LinkedIn, email o canal real
3. data_ultim_contacte = data real
4. proper_pas = seguiment concret
5. notes afegeix una linia curta

Format de nota:

```text
YYYY-MM-DD · contactat · LinkedIn/email · destinatari · resum curt
```

## Eines locals

- Valida CRM: `scripts/sales/validate_crm.py`
- Actualitza CRM: `scripts/sales/update_crm.py`
- Exporta CRM: `scripts/sales/export_crm_excel.py`
