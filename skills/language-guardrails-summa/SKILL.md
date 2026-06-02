---
name: language-guardrails-summa
description: Revisa missatges comercials de Summa Vendes, detecta llenguatge SaaS o massa venedor i proposa una versio peer-to-peer.
---

# Language Guardrails Summa

## Objectiu

Revisar qualsevol missatge comercial abans de retornar-lo a Raul.

## Detecta

- paraules prohibides
- missatge massa llarg
- to massa venedor
- falta de referencia a un fet real
- atribucio d'un problema no verificat
- massa demandes d'entrada
- aparenca de correu massiu

## Paraules prohibides

- solucion
- optimizar
- potenciar
- impulsar
- transformacion digital
- SaaS
- pitch
- demo generica
- escalar
- disruptivo
- sinergia

## Sortida

```text
Missatge corregit:
Advertiments:
Motiu dels canvis:
Aprovacio necessaria:
```

## Regla d'aprovacio

El missatge corregit es nomes una proposta. Raul ha d'aprovar manualment abans d'enviar-lo.

## Eina local

Per missatges de LinkedIn o email:

```bash
python3 scripts/sales/lint_outreach_message.py --fact "fet real verificat" message.txt
```
