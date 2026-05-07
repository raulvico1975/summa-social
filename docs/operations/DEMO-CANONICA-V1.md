# Demo Canònica v1 - Especificació operativa

## 1. Objectiu

La Demo Canònica v1 és una organització demo sintètica, fixa, regenerable i segura, pensada per fer presentacions comercials, gravar vídeos curts i mostrar l'ús natural de Summa Social amb una entitat fictícia.

No busca simular una implantació perfecta ni cobrir tots els casos límit. Busca tenir dades fictícies suficients perquè qualsevol persona pugui entrar a Summa, navegar pels fluxos principals i veure com treballaria una entitat real: banc, moviments, remeses, devolucions, donants, fiscalitat, documents, projectes i exports.

El nom correcte en aquesta fase és "Demo Canònica v1". No s'ha de prometre "demo completa de totes les funcionalitats" fins que existeixi un health check executable que ho validi.

## 2. Principis no negociables

- Dades 100% sintètiques.
- Cap dada PBI, Baruma, Flores ni cap entitat real o semi-real.
- Regeneració sempre per seed, mai edició manual a Firestore o Storage.
- Separació clara entre demo canònica i demos ad hoc per oportunitats concretes.
- Cap write a producció durant la preparació o validació.
- Cap `undefined` a Firestore; ometre el camp o usar `null` quan el model ho permeti.
- Batches Firestore sempre `<= 50` en qualsevol ampliació futura de fluxos demo.
- Respecte estricte als invariants fiscals: donacions, devolucions, Model 182, Model 347 i certificats.
- Cap nova dependència per mantenir o validar aquesta especificació.
- No fer sobreenginyeria: la demo ha de servir per mostrar el producte, no per crear un sistema paral·lel.
- La demo ha de ser pràctica abans que exhaustiva: només calen dades suficients per explicar bé els fluxos principals.

## 3. Estat actual detectat

| Àrea | Existeix avui | Evidència | Mancança |
|---|---:|---|---|
| Organització demo | Sí | `src/scripts/demo/seed-demo.ts` crea `demo-org`, slug `demo`, `isDemo: true` i mapping `slugs/demo`. | Falta health check executable que confirmi l'estat complet abans d'una presentació. |
| Donants | Sí | Seed base amb 50 donants i casos especials com Maria Garcia i Clara Soler. | Falta mapa explícit de quins donants s'han d'usar a cada relat de demo. |
| Proveïdors | Sí | Seed base amb 20 proveïdors i cas Model 347 sense CIF. | Falta relat guiat de proveïdor per demo comercial. |
| Treballadors | Sí | Seed base amb 8 treballadors. | No hi ha escenari guiat propi en la demo canònica actual. |
| Moviments bancaris | Sí | Seed base amb 100 transaccions i mode `work` amb pendents, duplicats i mal categoritzat. | Falta fitxer bancari demo canònic documentat per repetir importació bancària des de zero. |
| Remeses IN | Sí | Mode `work` crea una remesa processada i un pare pendent de dividir; `public/demo-files/remesa-quotes-demo.csv` dona dades d'import. | Falta check automàtic de pare/filles i ruta guiada única. |
| Devolucions | Sí | Mode `work` crea devolució assignada i devolució pendent; `devolucions-banc-demo.csv` dona 3 devolucions importables. | Falta verificar si el relat cobreix devolució individual i agrupada sense passos manuals fràgils. |
| Stripe | Sí | Mode `work` crea payout pare, donacions i fee; `stripe-payout-demo.csv` dona 6 donacions importables. | Cal respectar que el flux fiscal vigent persisteix a `donations`, no prometre filles visibles al ledger si el model actual no ho fa. |
| Model 182 | Sí | Seed amb oracle fiscal, donant exclòs per NIF buit i donacions/devolucions. | Falta health check que validi totals esperats del relat demo. |
| Model 347 | Sí | Seed amb proveïdor sense CIF i 4 transaccions que sumen 3.330 EUR. | Falta relat comercial curt i check de llindar/import. |
| Documents pendents | Parcial | Org demo activa `pendingDocs` i es pugen PDFs dummy a Storage. | No queda verificat que hi hagi registres `pendingDocuments` preparats per ensenyar el flux complet. |
| Documents adjunts | Parcial | Transaccions i feed de projectes poden referenciar PDFs dummy. | Falta garantir un escenari "adjuntar/reconciliar document" amb registre i fitxer associat. |
| Projectes | Sí | Seed crea 4 projectes, 40 partides, feed d'exports, 30 off-bank expenses i 20 expenseLinks. | Falta escenari guiat únic per justificació econòmica i export. |
| Liquidacions | No verificat en aquesta fase | Existeixen rutes i mòdul a `/{orgSlug}/dashboard/movimientos/liquidacions`. | No s'ha confirmat que el seed actual creï liquidacions/tickets demo. |
| Exports | Parcial | La referència funcional documenta exports fiscals, moviments, gestoria, projectes i tancament. | Falta definir quins exports són obligatoris per considerar la demo apta. |
| Gravacions/demo scripts | Sí | `docs/operations/DEMO-GRAVACIONS-PLAYBOOK.md` i scripts `scripts/demo/record-*.mjs`. | Falta alinear tots els scripts amb aquesta Demo Canònica v1. |

## 4. Escenaris guiats v1

| ID | Nivell | Escenari | Objectiu demo | Ruta UI | Dades requerides | Estat actual |
|---|---|---|---|---|---|---|
| D01 | Imprescindible per demo comercial | Login i entrada a demo | Entrar com usuari i veure que la demo és una entitat fictícia operativa. | `/demo/login`, `/demo/dashboard` | Usuari tècnic, `demo-org`, slug `demo`. | Cobert parcialment; el playbook de gravacions crea/repara usuari tècnic. |
| D02 | Imprescindible per demo comercial | Dashboard amb lectura executiva | Mostrar situació general sense preparar res manualment. | `/demo/dashboard` | Moviments, categories, contactes, projectes i senyals pendents. | Cobert parcialment pel seed. |
| D03 | Imprescindible per demo comercial | Importació bancària amb deduplicació | Ensenyar com entra un extracte i com es detecten duplicats. | `/demo/dashboard/movimientos` | Fitxer bancari demo, moviment existent similar, 2-3 moviments nous. | Cobert per script de gravació; falta fitxer canònic documentat. |
| D04 | Imprescindible per demo comercial | Moviments sense categoritzar | Mostrar feina pendent realista. | `/demo/dashboard/movimientos` | 5 moviments sense categoria/contacte. | Cobert en mode `work`. |
| D05 | Imprescindible per demo comercial | Assignació de categoria i contacte | Mostrar revisió manual simple d'un moviment. | `/demo/dashboard/movimientos` | Moviment editable, categories, donant/proveïdor/treballador. | Cobert parcialment pel seed i scripts. |
| D06 | Complementari per gravacions o proves internes | Adjuntar document a moviment | Mostrar traçabilitat documental d'una despesa o ingrés. | `/demo/dashboard/movimientos` | Moviment, PDF fictici, vincle document-moviment. | Parcial; cal confirmar registre documental complet. |
| D07 | Complementari per gravacions o proves internes | Documents pendents | Mostrar entrada de factura/ticket pendent i possible conciliació. | `/demo/dashboard/movimientos/pendents` | Registre `pendingDocuments`, fitxer fictici, suggeriment o moviment relacionat. | Mancança probable; no verificat en seed actual. |
| D08 | Imprescindible per demo comercial | Remesa IN pendent de dividir | Ensenyar ingrés agrupat de quotes i divisió amb CSV. | `/demo/dashboard/movimientos` | Pare pendent, 8 donants recurrents, CSV `remesa-quotes-demo.csv`. | Cobert en mode `work`. |
| D09 | Imprescindible per demo comercial | Remesa IN processada | Mostrar remesa ja dividida, pare i filles coherents. | `/demo/dashboard/movimientos` | Pare processat, 8 filles amb `contactId`, suma igual al pare. | Cobert en mode `work`. |
| D10 | Imprescindible per demo comercial | Devolució bancària assignada | Mostrar devolució que resta correctament al donant. | `/demo/dashboard/movimientos`, `/demo/dashboard/donants` | Devolució `transactionType: return`, import negatiu, donant assignat. | Cobert en mode `work`. |
| D11 | Imprescindible per demo comercial | Devolució pendent de revisió | Mostrar feina pendent abans del tancament fiscal. | `/demo/dashboard/movimientos` | Devolució sense `contactId`, banner o filtre de pendents. | Cobert en mode `work`; falta validar relat UI. |
| D12 | Imprescindible per demo comercial | Imputació Stripe sobre abonament bancari | Mostrar que un payout bancari es converteix en donacions fiscals. | `/demo/dashboard/movimientos` | Payout pare, CSV Stripe, donants, comissió, persistència a `donations`. | Cobert parcialment pel seed i CSV. |
| D13 | Imprescindible per demo comercial | Fitxa de donant amb historial fiscal | Mostrar resum anual, donacions, devolucions i certificat. | `/demo/dashboard/donants` | Donant Clara Soler o Maria Garcia, donacions i devolucions. | Cobert pel seed i script `record-donations-control.mjs`. |
| D14 | Imprescindible per demo comercial | Model 182 | Mostrar declaració de donatius amb devolucions i validació AEAT. | `/demo/dashboard/informes` | Donants amb dades fiscals, donacions computables, devolucions, exclòs sense NIF. | Cobert pel seed i script `record-model-182.mjs`. |
| D15 | Complementari per gravacions o proves internes | Model 347 | Mostrar operacions amb tercers i incidència per CIF buit. | `/demo/dashboard/informes` | Proveïdor amb transaccions > 3.005,06 EUR i cas sense CIF. | Cobert pel seed; falta confirmar script final. |
| D16 | Complementari per gravacions o proves internes | Projectes i justificació econòmica | Mostrar assignació de despeses i justificació per finançador. | `/demo/dashboard/project-module/projects` | Projectes, partides, despeses bancàries, off-bank expenses, expenseLinks. | Cobert parcialment pel seed; falta relat canònic únic. |

## 5. Dades mínimes per escenari

| Escenari | Dades mínimes | Per què calen | Ja existeix? |
|---|---|---|---|
| Login i entrada | `demo-org`, slug `demo`, usuari tècnic autenticable. | Accés repetible sense dependre de sessions personals. | Parcial. |
| Dashboard | Moviments recents, categories, contactes, imports i alguns pendents. | La primera pantalla ha d'explicar activitat realista. | Sí. |
| Importació bancària | CSV/XLSX bancari, moviment existent per duplicat, files noves. | Permet ensenyar import i deduplicació sense improvisar. | Parcial. |
| Moviments pendents | Moviments sense categoria ni contacte. | Mostra feina pendent i valor operatiu de Summa. | Sí. |
| Assignació | Contactes de rols diferents i categories d'ingrés/despesa. | Permet ensenyar correcció manual normal. | Sí. |
| Adjuntar document | PDF fictici i moviment relacionable. | Demostra traçabilitat i justificació. | Parcial. |
| Documents pendents | Registre de document pendent i fitxer associat. | Sense registre no es pot ensenyar el flux de pendents complet. | No verificat. |
| Remesa pendent | Pare bancari no processat, donants recurrents, imports que quadrin. | Permet ensenyar la divisió d'una remesa realista. | Sí. |
| Remesa processada | Pare marcat com remesa i filles assignades. | Permet ensenyar resultat ja tancat. | Sí. |
| Devolució assignada | Retorn negatiu amb donant i categoria fiscal coherent. | Impacta certificats i Model 182. | Sí. |
| Devolució pendent | Retorn negatiu sense donant. | Mostra risc abans de tancament fiscal. | Sí. |
| Stripe | Payout pare, línies Stripe, fee i donants. | Mostra imputació fiscal d'abonaments Stripe. | Parcial. |
| Fitxa donant | Donant amb NIF, CP, adreça, donacions i devolució. | Permet explicar historial i import net. | Sí. |
| Model 182 | Donants fiscals, exclòs sense NIF, donacions i devolucions. | Cal veure totals i validacions abans d'exportar. | Sí. |
| Model 347 | Proveïdor amb operacions anuals i cas sense CIF. | Permet explicar control de tercers. | Sí. |
| Projectes | Projectes, partides, despeses assignables, documents. | Permet ensenyar justificació econòmica. | Parcial. |

## 6. Health check esperat

Aquest health check és conceptual en aquesta fase. No s'implementa encara i no ha de convertir-se en una suite de regressió completa. La seva resposta ha de ser simple: demo apta o no apta per ensenyar.

| Check | Severitat | Què valida | Resultat esperat |
|---|---|---|---|
| Demo org existeix | P0 | `organizations/demo-org`, slug `demo`, `isDemo === true`. | Apta si existeix i és activa. |
| Accés demo | P0 | Hi ha usuari tècnic o flux fiable de login. | Apta si es pot entrar a `/demo/dashboard`. |
| Seed coherent | P0 | Comptadors base i mode `work`. | Apta si hi ha les dades mínimes dels escenaris imprescindibles. |
| Sense dades reals | P0 | Noms, emails, NIFs, IBANs i documents són sintètics. | Apta si no hi ha cap dada real o client real. |
| Firestore segur | P0 | Cap payload amb `undefined`; batches previstos `<= 50`. | Apta si no hi ha incompliments. |
| Moviments | P1 | Hi ha moviments normals, pendents, duplicats i mal categoritzat. | Apta si es pot ensenyar banc i revisió manual. |
| Remeses IN | P1 | Pare pendent, pare processat, filles i suma coherent. | Apta si es pot ensenyar pendent i processada. |
| Devolucions | P1 | Retorns amb signe negatiu, un assignat i un pendent. | Apta si es pot ensenyar impacte operatiu i fiscal. |
| Stripe | P1 | Payout pare, donacions imputables i fee. | Apta si no contradiu el model vigent `donations`. |
| Fiscalitat 182 | P1 | Donant complet, devolució aplicada i exclòs sense NIF. | Apta si es pot ensenyar import net i validació. |
| Fiscalitat 347 | P2 | Proveïdor amb import anual suficient i cas sense CIF. | Complementari; no bloqueja una demo comercial general. |
| Documents | P2 | PDFs i registres documentals quan pertoqui. | Complementari si la demo no se centra en documents. |
| Projectes | P2 | Projectes, partides i despeses assignables. | Complementari si la demo no se centra en justificació. |
| Exports | P2 | Hi ha dades suficients per export fiscal, bancari i projectes. | Complementari; cal validar abans de gravar aquest flux. |
| Gravacions | P2 | Scripts principals apunten a escenaris amb dades existents. | Complementari; cal validar abans de gravació final. |

P0 bloqueja considerar la demo apta. P1 bloqueja una demo comercial general si afecta el relat principal. P2 no bloqueja una demo comercial curta, però s'ha de registrar abans de gravar o prometre aquell flux.

## 7. Fora d'abast d'aquesta fase

- No modificar `src/scripts/demo/seed-demo.ts`.
- No modificar `src/scripts/demo/generate-demo-files.ts`.
- No crear health check executable encara.
- No crear dades noves.
- No escriure a Firestore.
- No tocar Storage.
- No desplegar.
- No canviar UI.
- No canviar permisos.
- No crear dependències.
- No gravar vídeos encara.

## 8. Properes fases

1. Revisió de Raül d'aquesta especificació.
2. Ajust dels escenaris guiats segons la demo comercial que es vulgui ensenyar primer.
3. Implementació d'un health check demo de lectura, sense writes, que verifiqui cobertura real.
4. Ampliació mínima del seed només allà on el health check detecti mancances.
5. Prova local regenerable amb mode `work`.
6. Preparació de gravacions comercials sobre demo validada.
