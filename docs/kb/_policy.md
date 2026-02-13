# Política de resposta del bot — Summa Social

Versió: 1.0

---

## Regla d'or

**No inventar.** El bot respon NOMÉS amb el contingut d'una card trobada o amb un fallback. Mai genera text lliure sobre procediments.

---

## 1. Com respon el bot

### 1.1 Card trobada amb `guideId`

El bot renderitza el contingut de la guia del Hub de Guies:
- **Títol** (guides.{guideId}.title)
- **Introducció** (guides.{guideId}.intro o whatIs)
- **Passos** (lookFirst / steps / doNext, segons existeixin)
- **Què evitar** (avoid, si existeix)
- **Error costós** (costlyError, si existeix)

El LLM pot reordenar i simplificar el text per respondre la pregunta, però NO pot afegir passos nous ni inventar contingut.

### 1.2 Card trobada amb `answer`

El bot usa el text de `answer.{idioma}` com a base. El LLM pot reordenar i simplificar per respondre la pregunta, però NO pot afegir passos nous ni inventar contingut.

### 1.3 Cap card trobada

El bot aplica el fallback corresponent:
1. Detecta si la pregunta toca un domini guardat (fiscal, SEPA, remeses, superadmin).
2. Si sí → fallback específic del domini (sense passos operatius).
3. Si no → fallback genèric (`fallback-no-answer`).

En tots els casos, el fallback redirigeix l'usuari a:
- **Hub de Guies** (icona ? a dalt a la dreta) — cercador per paraules clau.
- **Manual** (/dashboard/manual) — documentació completa.
- Suggeriment de provar amb paraules clau o el text d'error exacte.

---

## 2. Guardrails per domini

### 2.1 `b1_fiscal` (Model 182, Model 347, certificats, dades fiscals)

- **Amb card exacta i answerMode=full**: el bot dona els passos documentats + checklist de verificació observable ("Verifica a la pantalla que tots els donants tenen 🟢").
- **Amb card exacta i answerMode=limited**: el bot dona orientació + on mirar a la UI. Mai passos operatius.
- **Sense card exacta**: fallback `fallback-fiscal-unclear`. Cap instrucció.

### 2.2 `b1_sepa` (pain.001, pain.008, fitxers bancaris)

- Mateixa lògica que b1_fiscal.
- **Advertiment addicional**: "Això genera un fitxer que hauràs d'importar al teu banc. Verifica les dades abans."

### 2.3 `b1_remittances` (Remeses, devolucions, splits)

- Mateixa lògica que b1_fiscal.
- **Respectar el flux**: processar → desfer → reprocessar. Mai saltar passos.

### 2.4 `b1_danger` (Zona de Perill, SuperAdmin, accions irreversibles)

- **Només amb card exacta**: procediment documentat + advertiment fort.
- **Sense card exacta**: fallback `fallback-danger-unclear`. Cap instrucció operativa.

---

## 3. Privacitat

- El bot **mai** mostra llistats de persones, NIF, IBAN o dades personals.
- Si en el futur s'activa `needsSnapshot`, només pot mostrar comptadors i flags agregats.
- Format permès: "Veig que tens 3 donants sense NIF. Pots revisar-los a Donants > Filtrar per 'Dades incompletes'."

---

## 4. Responsabilitat

- Summa Social és una eina de gestió. **No substitueix** revisió professional (assessor fiscal, auditor).
- Per temes d'interpretació fiscal, el bot indica: "Consulta amb el teu assessor fiscal."
- El bot **no dona consells fiscals** — només mostra els procediments documentats de l'app.

---

## 5. Idiomes

- MVP: Català (ca) i Castellà (es).
- El bot respon en l'idioma de la pregunta. Si no pot detectar-lo, respon en català.

---

## 6. Loop d'ampliació

### Tracking

El client emet events `trackUX` (console-only, sense BD):
- `bot.send` — cada pregunta enviada (`{ lang }`)
- `bot.fallback` — quan la resposta és un fallback (`{ cardId, lang }`)

Revisant el log de consola es pot detectar quines preguntes no tenen card.

### Regla d'ampliació

Per afegir una card nova:
1. Crear el fitxer JSON a `docs/kb/cards/{type}/{id}.json` seguint `_schema.json`.
2. Afegir queries de test a `docs/kb/_eval/queries-ca.json` i `queries-es.json`.
3. Afegir entries a `docs/kb/_eval/expected.json` i `expected-es.json`.
4. Executar `node --import tsx docs/kb/validate-kb.ts` → ha de passar sense errors.
