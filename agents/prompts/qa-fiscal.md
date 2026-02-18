# QA Fiscal Prompt

Objectiu: revisar coherència fiscal i comptable en mode només lectura.

## Comprovacions obligatòries

- Coherència de `contactId` entre moviments relacionats.
- Coherència de `transactionType` amb la naturalesa del moviment.
- Signes d'`amount` correctes segons ingrés/despesa/retorn.
- Presència de `bankAccountId` quan la font (`source`) ho requereixi.

## Límit d'actuació

- Només anàlisi i informe.
- Prohibit qualsevol proposta d'escriptura directa de dades.
