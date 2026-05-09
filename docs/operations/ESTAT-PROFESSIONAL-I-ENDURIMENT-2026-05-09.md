# Estat professional i enduriment operatiu — 2026-05-09

Aquest document resumeix l'estat actual del repositori de Summa Social i la fase d'enduriment que s'esta fent. No substitueix els contractes operatius existents; els complementa amb una fotografia executiva i una llista curta de decisions pendents.

Referencies normatives:

- `docs/DEPLOY.md`: contracte curt de publicacio.
- `docs/GOVERN-DE-CODI-I-DEPLOY.md`: contracte llarg de govern de codi i deploy.
- `docs/REPO-HIGIENE-I-DIAGNOSTIC.md`: diagnosi i desbloqueig de repositori.
- `docs/REPO-TOPOLOGIA-LOCAL.md`: criteri sobre repos canonics, mirrors i copies locals.
- `docs/PERMISSIONS-SYSTEM.md`: model de permisos granulars.

## 1. Estat actual de repositori i GitHub

Estat operatiu validat:

- El repositori canonic de treball es `/Users/raulvico/Documents/summa-social`.
- `main` i `prod` estan coherents i el flux de publicacio passa pel ritual documentat.
- `prod` esta protegida a GitHub contra esborrat i force-push.
- No queden PRs antigues obertes.
- Les branques antigues no integrades s'han preservat abans d'eliminar-les com a branques actives.
- Els clons locals duplicats de Summa Social s'han arxivat fora del repo canonic.

Arxiu local de clons duplicats:

- Ruta: `/Users/raulvico/Documents/_archive/summa-social-duplicates-20260509`
- Manifest: `/Users/raulvico/Documents/_archive/summa-social-duplicates-20260509/MANIFEST.txt`

Criteri professional vigent:

- El repo canonic es la font de veritat local.
- GitHub es la font de veritat remota.
- Cap clone antic, mirror o carpeta de deploy pot servir per decidir que hi ha a produccio.

## 2. Ritual segur de publicacio

El ritual vigent es:

```bash
npm run inicia
npm run acabat
npm run integra
npm run status
npm run publica
```

Regles que no s'han de saltar:

- `npm run integra` es l'unica porta d'entrada a `main`.
- `npm run publica` es l'unica porta d'entrada a `prod`.
- No es publica si `npm run status` indica estat bloquejat.
- No es publica directament amb un push manual a `prod`.
- Una tasca acabada no vol dir automaticament publicada.
- `main` no s'ha de barrejar amb `prod` mitjancant merges improvisats.

Ultim criteri operatiu aplicat:

- Si `main` i `prod` divergeixen, primer es diagnostica.
- Si cal publicar una cosa concreta, es fa de forma quirurgica i documentada.
- Despres es reabsorbeix l'estat real de `prod` a `main` quan toca, sense desplegar de forma accidental.

## 3. Quarantena, arxiu i neteja

El criteri aplicat en aquesta fase ha estat preservar abans de netejar:

- Cap worktree brut s'esborra sense commit i push previ a una branca de quarantena.
- Cap branca antiga no integrada s'elimina sense etiqueta d'arxiu.
- Els clons duplicats no es barregen amb el repo canonic; s'arxiven amb manifest.
- Les branques `quarantine/*` i `snapshot/*` es poden mantenir com a historics preservats, no com a feina activa.

No s'ha de fer:

- `reset --hard` sobre canvis no preservats.
- `worktree remove` sobre contingut brut no preservat.
- tancar PRs o branques sense deixar traça quan hi ha feina no integrada.

## 4. Estat del pipeline blog i product-updates

Estat validat:

- El sistema de blog editorial existeix i esta desplegat.
- El pipeline de `product-updates` existeix i esta desplegat.
- La generacio de portada editorial amb Gemini/Nano Banana esta integrada al flux.
- El prompt d'imatges s'ha reforcat per evitar textos visibles a les imatges.

Criteri actual de prompt d'imatge:

- Les imatges generades no han d'incloure text en cap idioma.
- Tampoc han d'incloure lletres, numeros, marques d'aigua, pseudo-text, escriptura manual falsa, etiquetes, UI amb text o documents llegibles.
- La imatge ha de funcionar com a metafora visual sense dependencia de cap paraula escrita.

Guardrail editorial:

- El text que entrega Raul per un post no s'ha de reescriure sense demanar-ho explicitament.
- Titols, subtitols i cos han de respectar el contingut indicat.
- La imatge principal no s'ha de repetir dins del cos si ja funciona com a portada.

## 5. Fase actual: enduriment d'APIs

Objectiu:

- Fer una auditoria funcional i de permisos de les APIs sensibles.
- Reduir inconsistencies entre UI, roles i permisos server-side.
- Aplicar canvis petits, verificables i reversibles.

Criteris de seleccio:

- Prioritzar rutes internes amb escriptura server-side.
- Prioritzar rutes on la UI ja restringeix mes que l'API.
- No inventar permisos nous.
- Usar nomes permisos existents a `src/lib/permissions.ts`.
- No canviar contractes externs ni integracions en aquesta primera fase.

Superficies que ChatGPT ha proposat NO tocar ara:

- Blog.
- Product-updates.
- Integrations/private.
- OAuth backup callbacks.

Primer lot validat:

- Categories: implementat només a `categories/archive`.
- Remittances: documentat, però no implementat en aquest lot.

Decisio aplicada:

- `categories/archive` passa a exigir el permis existent `categories.manage`.
- No es toca `categories/update`, que ja era admin-only.
- No es toca cap ruta de remeses.

## 6. Taula de rutes candidates

| Ruta | Metode | Lectura/Escriptura | Auth actual | Permis existent proposat | Risc | Estat |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app/api/categories/archive/route.ts` | `POST` | Llegeix categoria i moviments; escriu arxiu de categoria | Firebase ID token + membership + `requirePermission(categories.manage)` | `categories.manage` | Baix | Implementat: la UI ja limitava gestio de categories a admin i ara l'API queda alineada |
| `src/app/api/categories/update/route.ts` | `POST` | Llegeix categoria; escriu camps editables `name` i `type` | Firebase ID token + `verifyAdminMembership` | `categories.manage` | Baix-mitja | Ja es admin-only; millor deixar per una fase de normalitzacio d'helpers |
| `src/app/api/remittances/in/check/route.ts` | `GET` | Llegeix transaccio pare, filles i document de remesa | `verifyAdminMembership` | Pendent: probablement lectura/gestio de moviments, pero no decidit | Mitja | No tocar encara |
| `src/app/api/remittances/in/process/route.ts` | `POST` | Escriu locks, remeses, filles, pendents i transaccio pare; batches <= 50 | Firebase ID token intern + `verifyAdminMembership` | Pendent: possible `moviments.importarExtractes` i/o `moviments.editar` | Alt | No tocar encara sense prova especifica de remeses |
| `src/app/api/remittances/in/sanitize/route.ts` | `POST` | Saneja metadades legacy, reconstrueix o marca estat | `verifyAdminMembership` | Pendent: possible `moviments.editar` | Alt | No tocar encara |
| `src/app/api/remittances/in/undo/route.ts` | `POST` | Soft-delete de filles, elimina pendents i reseteja pare | `verifyAdminMembership` | Pendent: possible `moviments.editar` | Alt | No tocar encara sense prova especifica de remeses |
| `src/app/api/remittances/in/saved-run/route.ts` + `handler.ts` | `POST` | Llegeix transaccio, execucio SEPA guardada i fitxer de Storage | `verifyAdminMembership` injectable al handler | Pendent: possible `moviments.importarExtractes` o lectura controlada | Mitja | No tocar encara |
| `src/app/api/remittances/in/repair/route.ts` | `POST` | No opera; endpoint desactivat amb `410` | Cap auth efectiva perque sempre retorna desactivat | Cap | Baix | No tocar |

## 7. Guardrails per implementar l'enduriment

Abans de tocar una ruta:

- Confirmar que el permis ja existeix.
- Confirmar que la UI no queda mes permissiva que l'API.
- Confirmar si la ruta es interna o pot ser cridada per integracions externes.
- Confirmar si hi ha tests existents o cal prova minima.
- Si toca remeses, devolucions, donants o fiscalitat, afegir test o prova minima i mencionar-la al commit.

Durant el canvi:

- No afegir dependencies.
- No canviar esquemes Firestore de forma destructiva.
- No escriure `undefined` a Firestore.
- Mantenir batches Firestore de 50 operacions o menys.
- No barrejar enduriment de permisos amb refactors visuals o editorials.

Despres del canvi:

- Executar `npm run typecheck`.
- Executar `npm run test:node` si el canvi toca logica compartida, fiscalitat, remeses, donants o permisos.
- No executar `npm run publica` si la tasca es nomes auditoria o documentacio.

## 8. Que no s'ha de tocar ara

No tocar en aquesta fase:

- Blog i pipeline editorial, excepte correccions editorials demanades explicitament.
- Product-updates.
- Generacio d'imatges Gemini, excepte el prompt sense text ja reforcat.
- Integracions privades.
- OAuth i callbacks de backup.
- Fluxos de remeses sense disseny de permis validat i prova minima.
- Traduccions FR/PT parcials, llevat que hi hagi una tasca especifica d'i18n.
- Reduccio massiva de `any` o logs si no esta lligada a una incidencia concreta.

## 9. Decisions pendents

Decisions que cal tancar abans de tocar mes codi executable:

- Quin permis exacte ha de governar cada operacio de remeses: lectura, processament, sanejament i desfer.
- Si `verifyAdminMembership` de remeses s'ha de conservar com a admin-only o evolucionar cap a permisos efectius.
- Quin test minim es considera suficient per cada canvi de remeses.

Recomanacio actual:

- Donar per tancat el primer lot petit de `categories/archive` si les validacions es mantenen verdes.
- Deixar remeses per una fase separada amb prova especifica.
- Mantenir el repo sense deploy mentre aquesta fase sigui d'auditoria i enduriment intern.
