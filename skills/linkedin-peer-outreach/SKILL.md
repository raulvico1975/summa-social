---
name: linkedin-peer-outreach
description: Redacta missatges curts de LinkedIn en to peer-to-peer per a prospects de Summa Social, amb validacio de llenguatge i aprovacio manual de Raul.
---

# LinkedIn Peer Outreach

## Objectiu

Preparar missatges curts per enviar manualment via LinkedIn. El missatge normalment es en castella; la resposta a Raul es en catala.

## Regles

- Menys de 100 paraules.
- To proper, professional i peer-to-peer.
- No sonar a campanya comercial.
- No vendre Summa Social en fred.
- Referenciar una dada real de l'entitat.
- Obrir amb una pregunta concreta.
- No inventar relacio previa.
- No fer servir formules buides com "he visto vuestra gran labor".
- Si no sabem qui porta administracio, pregunta per la persona correcta.
- Raul aprova manualment abans d'enviar.

## Estructura

1. Referencia real.
2. Connexio amb una feina concreta: banc, quotes, donants, justificacions, certificats o remeses.
3. Pregunta facil de respondre.

## Exemple d'estil

```text
Hola [Nombre], he visto que en [Entidad] trabajais con proyectos de cooperacion y subvenciones publicas.
Te queria preguntar algo muy concreto: la parte de justificacion economica y seguimiento de gastos, la llevais internamente o con apoyo externo?
Estoy hablando con varias entidades pequenas sobre como resuelven esa parte.
```

## Control obligatori

Abans de retornar el missatge final:

1. comprova que hi ha un fet real
2. comprova que no esta contactada si el CRM ho indica
3. passa `scripts/sales/lint_outreach_message.py`
4. retorna advertiments si n'hi ha

No diguis "te presento Summa Social" tret que Raul ho demani explicitament o ja hi hagi context previ.
