# Editorial Contract

## Tipologies

- `task`: quan la persona usuària vol fer una acció concreta dins Summa.
- `troubleshoot`: quan hi ha un error, bloqueig o resultat inesperat observable.
- `concept`: quan cal entendre què significa una dada, estat o flux abans d'actuar.

## Convenció editorial amb el shape actual

- `type="howto"` cobreix `task`.
- `type="troubleshooting"` cobreix `troubleshoot`.
- `type="concept"` cobreix `concept`.
- `guideId` o `answer` només poden contenir contingut verificat al producte real o al manual vigent.

## Estil de redacció

- Curt i operatiu.
- Comença per què ha de fer ara la persona usuària.
- Acaba amb on ha d'anar ara, si existeix un destí clar.
- Evita context llarg si la millor resposta és obrir el manual.
- No parlar de “IA”; parlar d'ajuda, passos i destins.

## Obligacions

- Sempre incloure `què fer ara` quan la consulta és operativa.
- Sempre incloure destí de navegació si existeix.
- Si la consulta és llarga o conceptual, resum de 2-4 línies + CTA al manual.
- Si la consulta és sensible (`guarded`), només orientació prudent i verificable.

## Prohibicions

- No passos no verificats al producte real.
- No promeses de `guides` com a hub visible si no existeix al runtime.
- No suport humà immediat com a fallback per defecte dins l'app.
- No respostes llargues que competeixin amb el manual si el manual és el millor destí.
