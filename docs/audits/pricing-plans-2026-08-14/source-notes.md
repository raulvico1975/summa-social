# Notes de fonts — plans i competència (14 d'agost de 2026)

## Objectiu i abast

Avaluar si els plans públics de Summa Social aporten valor i si la distribució de funcionalitats és coherent amb les necessitats de control d'entitats petites i mitjanes.

La comparació de preus utilitza tarifes mensuals públiques o preus de referència mensuals visibles el 14 d'agost de 2026. No pressuposa equivalència funcional entre productes. S'exclouen descomptes temporals i, quan la font ho indica, els imports no inclouen IVA. La pàgina pública de Summa Social no explicita l'IVA.

## Summa Social

- Pàgina pública: https://summasocial.app/es/preus
- Font de contingut al repositori: `src/i18n/public.ts`
- Referència funcional: `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- Playbook d'implantació: `docs/operations/Onboarding-Playbook.md`
- Plans públics: Inicial 49 €/mes; Gestió 79 €/mes; Complet 119 €/mes.
- Implantació: a partir de 300 €.
- Estat funcional: la segmentació és comercial i informativa; no bloqueja funcionalitats.
- Implantació interna de referència: 20–25 hores en 6–8 setmanes.

## Competidors i alternatives

### Berrly

- Font oficial: https://www.berrly.com/es/planes-y-precios/
- Preus mensuals de referència: Standard 39 €, Advanced 89 €, Premium 199 €; IVA no inclòs.
- Focus visible: socis, RGPD, comunicacions, quotes, SEPA, targeta, esdeveniments i ticketing. Advanced incorpora factures, certificats i Model 182.
- Prova gratuïta i sense permanència anunciades.

### Socios.pro

- Font oficial: https://socios.pro/planes-y-precios/
- Preus: Gestió 19,95 €, Wallet 24,95 €, Fiscal 29,95 €; IVA no inclòs.
- Focus visible: socis, factures de clients i proveïdors, esdeveniments, portal del soci, SEPA, pressupostos, projectes, comptabilitat i models AEAT. Suport tècnic inclòs.
- Les afirmacions són les de la pàgina comercial; no s'ha auditat el producte ni la profunditat de cada funció.

### Holded

- Font oficial: https://www.holded.com/es/precios
- Preus mensuals de referència per a empreses petites: Bàsic 29 €, Estàndard 59 €, Avançat 99 €; IVA no inclòs. La pàgina mostrava un descompte temporal del 50% durant tres mesos, exclòs de la comparació.
- Focus visible: facturació, comptabilitat, bancs, conciliació, remeses, projectes i accés de gestoria. Implantació assistida opcional des de 99 €.
- No és una solució específica de donants, Model 182 o justificació de subvencions.

### Luntia

- Font oficial: https://www.luntia.es/es/precios
- Preus mensuals de referència: Basic 120 €, Standard 199 €, Premium 280 €; la pàgina mostrava preus promocionals de 84 €, 139 € i 196 €, exclosos del gràfic principal. També ofereix pla Free.
- Focus visible: socis, beneficiaris, voluntariat, activitats, esdeveniments, donacions i certificats.
- No es presenta principalment com a eina de conciliació bancària o justificació econòmica.

### GONG

- Font oficial: https://gong.es/
- No s'ha localitzat una tarifa SaaS pública comparable.
- Focus visible: programari lliure per a organitzacions de cooperació, formulació, seguiment tècnic i econòmic, cofinançament, despeses, documentació, informes i justificació.
- És una alternativa funcional important per al mòdul de projectes, però no una referència de preu directa.

## Dades quantitatives utilitzades

| Producte | Pla 1 | Pla 2 | Pla 3 | Criteri |
|---|---:|---:|---:|---|
| Summa Social | 49,00 | 79,00 | 119,00 | Preus públics mensuals |
| Berrly | 39,00 | 89,00 | 199,00 | Preus mensuals sense descompte anual |
| Socios.pro | 19,95 | 24,95 | 29,95 | Preus mensuals públics |
| Holded | 29,00 | 59,00 | 99,00 | Preus de referència abans del descompte temporal |
| Luntia | 120,00 | 199,00 | 280,00 | Preus de referència abans del descompte promocional |

## Càlculs revisats

- Subscripció anual Summa: 588 €, 948 € i 1.428 €.
- Primer any mínim amb implantació de 300 €: 888 €, 1.248 € i 1.728 €.
- Salts mensuals Summa: +30 € (+61,2%) d'Inicial a Gestió; +40 € (+50,6%) de Gestió a Complet.
- Si una implantació de 20–25 hores es vengués pel mínim de 300 €, l'ingrés brut equivaldria a 12–15 €/h abans de costos.
- Sensibilitat de la implantació completa: a 35–50 €/h, 20–25 hores equivalen a 700–1.250 €.

## Límits de la conclusió

- No s'han utilitzat dades de conversió, ús per pla, abandonament, marge, tiquets de suport ni entrevistes recents amb clients.
- Per tant, s'avalua la força i coherència de la proposta, no el valor realitzat ni la disposició a pagar demostrada.
- Les pàgines comercials dels competidors no demostren la qualitat o profunditat efectiva de cada funció.
- La recomanació de reempaquetat s'ha de validar amb converses i pilots; no és una decisió de preu definitiva.
