---
name: spec-to-code-enforcer
description: >
  Verifica que cada canvi a Summa Social té base explícita al document mestre
  (SUMMA-SOCIAL-REFERENCIA-COMPLETA.md) o està marcat com a millora transversal permesa.
  Rebutja supòsits, camps inventats, fluxos fora d'abast, i funcionalitats no documentades.
  Usar sempre que es proposi una nova funcionalitat o canvi conceptual.
---

# Spec-to-Code Enforcer — Alineació amb Referència Mestre

## Quan activar aquest skill

Activa'l **sempre** que:
- Es proposa una nova funcionalitat
- Es proposa un canvi conceptual (nou flux, nou camp, nova col·lecció)
- Es proposa un canvi que podria estar fora de l'abast del producte
- Hi ha dubte sobre si un canvi encaixa amb l'arquitectura

**No activar** per:
- Correccions de bugs dins de funcionalitats existents
- Canvis de rendiment que no alteren comportament
- Canvis purament estètics

---

## Abast del producte (font: Document Mestre)

Summa Social **NOMÉS** tracta:

| Àmbit | Inclou |
|-------|--------|
| Conciliació bancària | Saldos, desquadraments, regles deterministes, memòria classificació, anomalies |
| Fiscalitat per gestoria | Model 182, Model 347, certificats donació, Excel net |
| Gestió contactes | Donants, proveïdors, treballadors, assignació moviments |
| Dashboard | Mètriques per juntes directives |
| Remeses | Divisió quotes IN, devolucions, SEPA OUT |
| Stripe | Importació payouts, donacions, comissions |

**Explícitament FORA d'abast** (tret de petició explícita):
- ERP de projectes complet
- Integració directa amb bancs (Open Banking)
- CRM de donants
- Gestió de voluntariat
- Comunicació massiva
- Comptabilitat completa (PGC)
- Presentació directa a AEAT

---

## Millores transversals (sempre permeses)

Segons el document mestre, aquestes millores es poden implementar en qualsevol moment:

| Categoria | Exemples |
|-----------|----------|
| **Robustesa** | Validacions, error handling, fallbacks |
| **Rendiment** | Memoització, queries optimitzades, lazy loading |
| **UX/UI no disruptiu** | Millores visuals, accessibilitat, micro-interaccions |
| **Seguretat** | Firestore rules, sanitització, CSRF |
| **Mantenibilitat** | Refactors menors, eliminar dead code, simplificar |
| **Diagnòstic** | Logs, observabilitat, SystemIncident |

---

## Procediment de verificació

### Pas 1: Identificar el canvi proposat

Descriu en una frase: *Què es vol afegir o modificar?*

### Pas 2: Classificar el canvi

| Tipus | Criteri | Acció |
|-------|---------|-------|
| **Funcionalitat existent** | Ja documentada al mestre | ✅ Permès — verificar implementació |
| **Millora transversal** | Cau dins de les 6 categories | ✅ Permès — no cal justificació extra |
| **Nova funcionalitat dins d'abast** | Contribueix a conciliació o fiscalitat | ⚠️ Permès — verificar que no contradiu res |
| **Nova funcionalitat fora d'abast** | No contribueix a conciliació ni fiscalitat | 🛑 REBUTJAR — demanar confirmació explícita |
| **Camp/col·lecció nou** | No existeix al mestre | 🛑 REBUTJAR — justificar i documentar |
| **Flux nou** | No documentat al mestre | 🛑 REBUTJAR — requereix decisió explícita |

### Pas 3: Aplicar filtre de 5 preguntes

Abans de generar codi, verificar:

```
1. ✅/❌ Contribueix a Conciliació o Fiscalitat?
2. ✅/❌ És mantenible per una sola persona?
3. ✅/❌ Requereix migracions destructives? (si sí → descartar)
4. ✅/❌ Requereix dependències noves? (si sí → descartar)
5. ✅/❌ Respecta l'arquitectura actual Next.js + Firebase?
```

**Si alguna resposta és negativa, el canvi NO s'ha d'implementar.**

### Pas 4: Verificar camps i estructures

Per cada camp, col·lecció, o tipus nou al canvi:

```
□ Existeix al document mestre (SUMMA-SOCIAL-REFERENCIA-COMPLETA.md)?
□ Si no existeix, és millora transversal justificable?
□ No contradiu cap definició existent?
□ No introdueix ambigüitat amb termes existents?
```

**Violacions freqüents:**
- Camps inventats sense base documental
- Tipus de transacció no definits
- Categories hard-coded no previstes
- Fluxos que combinen àrees d'abast incorrectament

### Pas 5: Emetre resultat

**Si alineat:**
```
✅ SPEC-TO-CODE: Canvi alineat amb el document mestre.
- Base: [secció del document mestre]
- Tipus: [funcionalitat existent / millora transversal / nova dins d'abast]
- Proceed.
```

**Si no alineat:**
```
🛑 SPEC-TO-CODE: Canvi fora d'especificació.
- Problema: [descripció]
- El document mestre diu: [referència]
- El canvi proposa: [contradicció]
- Opció A: Ajustar el canvi a [proposta alineada]
- Opció B: Marcar com a extensió i sol·licitar aprovació explícita
```

---

## Termes amb interpretació correcta

Referència ràpida per evitar malentesos (font: document mestre):

| Terme | ✅ Significa | ❌ NO significa |
|-------|-------------|-----------------|
| Conciliació bancària | Saldos, desquadraments, regles, devolucions | Integració amb bancs |
| Fiscalitat | Model 182, 347, certificats, Excel | Presentació a AEAT |
| Excel net | Fitxer simple per gestoria | Fitxer BOE oficial |
| Determinista | Regla fixa, mateix resultat | IA autònoma |
| Auto-assignació | Matching + categoria defecte | IA sense supervisió |
| Remesa | Agrupació quotes socis O devolucions | Qualsevol ingrés |
| Gestoria | Professional extern | L'entitat mateixa |
| Matching exacte | IBAN/DNI/Nom idèntic | Fuzzy, aproximat |
| Payout Stripe | Liquidació de Stripe al banc (po_xxx) | Donació individual |
| Comissió Stripe | Despesa agregada per payout | Cost per donació |

---

## Restriccions d'IA (Genkit + Gemini)

Qualsevol proposta que involucri IA ha de complir:

```
□ Només fluxos deterministes o supervisats
□ NO models que aprenen autònomament
□ NO embeddings ni memòria contínua
□ IA = complement, mai motor del producte
```

---

## Exemples

### Exemple 1: Nova funcionalitat dins d'abast
```
Proposta: Afegir camp "recurrència" als certificats de donació
Verificació:
- Contribueix a fiscalitat? ✅
- Existeix base al mestre? ✅ (secció Model 182 / Excel net)
- Mantenible? ✅
- Dependències noves? ❌
Resultat: ✅ PERMÈS
```

### Exemple 2: Nova funcionalitat fora d'abast
```
Proposta: Afegir mòdul de gestió de voluntaris
Verificació:
- Contribueix a conciliació o fiscalitat? ❌
- Dins d'abast? ❌
Resultat: 🛑 REBUTJAT — Fora d'abast. Requereix aprovació explícita.
```

### Exemple 3: Camp inventat
```
Proposta: Afegir camp "riskScore" a contactes
Verificació:
- Existeix al mestre? ❌
- Millora transversal? ❌ (no és robustesa, rendiment, UX, seguretat, mantenibilitat ni diagnòstic)
- Contribueix a conciliació/fiscalitat? ❌
Resultat: 🛑 REBUTJAT — Camp no documentat ni justificable.
```

### Exemple 4: Millora transversal
```
Proposta: Afegir memoització al hook useTransactions
Verificació:
- Categoria: Rendiment ✅
- Altera comportament? ❌
- Dependències noves? ❌
Resultat: ✅ PERMÈS — Millora transversal.
```

---

## Integració amb altres skills

- **Change Surface Auditor**: Primer verifica alineació (Spec-to-Code), després analitza blast-radius.
- **Invariant Guard**: Només s'activa si el canvi passa Spec-to-Code. No té sentit validar invariants d'un canvi rebutjat.

---

## Flux complet recomanat

```
1. Spec-to-Code Enforcer → El canvi és legítim?
   └─ Si NO → STOP
   └─ Si SÍ ↓

2. Change Surface Auditor → Quin és l'impacte?
   └─ Risc BAIX → merge
   └─ Risc MITJÀ/ALT ↓

3. Invariant Guard → Les dades queden íntegres?
   └─ Si NO → corregir i tornar a 3
   └─ Si SÍ → merge amb QA P0 si cal
```
