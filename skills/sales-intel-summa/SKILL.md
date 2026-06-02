---
name: sales-intel-summa
description: Extreu intel comercial de respostes de leads, guarda frases literals i proposa seguents preguntes sense perdre context ni barrejar fets i hipotesis.
---

# Sales Intel Summa

## Quan usar-la

Usa-la quan una entitat respon, quan Raul resumeix una conversa o quan cal actualitzar el context comercial d'un lead.

## Dades a extreure

- frase_literal
- resum_operatiu
- tipus_senyal
- tema_principal
- intensitat
- rol_que_ho_pateix
- eina_actual
- trigger_canvi
- bloqueig
- seguent_pregunta
- classificacio_lead

## Classificacio de resposta

- resposta: hi ha resposta pero encara no conversa clara
- conversa: hi ha intercanvi i possibilitat de diagnosi
- demo: hi ha interes concret per veure Summa Social
- perdut: no hi ha encaix, no interessa o no es moment

## Regles

- Guarda la frase literal entre cometes o en camp separat.
- Resumeix operativament sense exagerar.
- Detecta dolor principal nomes si apareix a la resposta o es raonablement inferible.
- Si es inferit, marca-ho com a hipotesi.
- Recomana una sola seguent pregunta, facil de contestar.
- No empenyis demo si encara falta diagnosticar.

## Format

```text
Resposta classificada:
Frase literal:
Resum operatiu:
Tema principal:
Intensitat:
Bloqueig:
Seguent pregunta:
Canvi CRM recomanat:
Resposta breu per Raul:
```
