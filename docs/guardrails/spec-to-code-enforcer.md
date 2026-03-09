---
name: spec-to-code-enforcer
description: >
  Verifica que cada canvi a Summa Social té base explícita al document mestre
  (SUMMA-SOCIAL-REFERENCIA-COMPLETA.md) o és una millora transversal admesa.
  Rebutja supòsits, camps inventats, fluxos fora d'abast i propostes que
  contradiguin el producte documentat. Usar sempre en noves funcionalitats o
  canvis conceptuals.
---

# Spec-to-Code Enforcer - alineació amb la referència mestra

## Quan activar aquest skill

Activa'l sempre que hi hagi:

- nova funcionalitat
- canvi conceptual
- nou camp o col·lecció
- nou flux d'usuari
- dubte real sobre si el canvi encaixa amb el producte

No cal per:

- bugfixos clars dins d'un flux existent
- rendiment sense canvi funcional
- retocs visuals no disruptius

## Abast real del producte avui

Font d'autoritat: `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` (actualitzat el 7 de març de 2026).

Els tres blocs estratègics actuals són:

| Bloc | Inclou |
|------|--------|
| **Conciliació bancària real** | multicomptes, imports bancaris, regles deterministes, devolucions, remeses |
| **Fiscalitat fina orientada a gestoria** | Model 182, Model 347, certificats, AEAT export, Stripe fiscal |
| **Projectes, documents i justificació econòmica** | documents pendents, liquidacions, despeses de terreny, projectes/partides, export per finançador |

També són dins del producte, si estan documentats al mestre:

- dashboard i mètriques
- gestió de contactes i permisos
- ajuda contextual, guies i support bot
- backup local SuperAdmin
- i18n i capes públiques associades al producte

## Fora d'abast per defecte

Si no hi ha ordre explícita, rebutjar o elevar:

- ERP genèric
- gestió de voluntariat
- CRM comercial genèric
- comptabilitat formal completa
- integració bancària directa / Open Banking
- funcionalitat multi-país
- presentar directament impostos a AEAT en nom de l'entitat

Important:

- El mòdul Projectes és per justificació econòmica, no per fer un gestor de projectes generalista
- Els backups al núvol consten com a implementació desactivada; no s'han de reactivar ni exposar sense decisió explícita

## Millores transversals sempre permeses

Segons el document mestre:

- robustesa
- rendiment
- seguretat
- UX/UI no disruptiu
- mantenibilitat
- diagnòstic i observabilitat

## Procediment de verificació

### Pas 1. Descriure el canvi en una frase

Què s'afegeix o es modifica exactament?

### Pas 2. Classificar-lo

| Tipus | Criteri | Acció |
|-------|---------|-------|
| Funcionalitat existent | Ja surt al document mestre | Permès |
| Millora transversal | Cau en una de les 6 categories | Permès |
| Nova funcionalitat dins d'un bloc actiu | Reforça un dels 3 blocs estratègics | Permès amb verificació |
| Capacitat ja documentada però secundària | Dashboard, help, backups locals, permisos, etc. | Permès amb referència exacta |
| Nova funcionalitat fora d'abast | No encaixa al mestre | Rebutjar o demanar decisió explícita |
| Camp/col·lecció/flux no documentat | No té base documental clara | Rebutjar fins documentar-ho |

### Pas 3. Filtre de 5 preguntes

Abans de generar codi:

```text
1. Aquesta proposta encaixa en un bloc estratègic o en una capacitat ja documentada?
2. És mantenible per una sola persona?
3. Evita migracions destructives?
4. Evita dependències noves?
5. Respecta l'arquitectura actual Next.js + Firebase?
```

Si alguna resposta és no, no s'ha d'implementar sense decisió explícita.

### Pas 4. Verificar dades i contractes

Per cada camp, tipus, col·lecció o estat nou:

```text
□ Existeix al document mestre?
□ Si no existeix, és una millora transversal real i no un canvi de producte encobert?
□ No contradiu invariants existents?
□ No duplica un concepte que ja existeix amb un altre nom?
```

Violacions freqüents:

- camps inventats sense base documental
- nous tipus de transacció sense contracte
- fluxos que confonen conciliació amb comptabilitat formal
- extensió del mòdul Projectes fora de justificació econòmica
- reactivar funcionalitats marcades com desactivades sense mandat explícit

### Pas 5. Emetre resultat

Si està alineat:

```text
SPEC-TO-CODE OK
- Base: [secció exacta del document mestre]
- Tipus: [existent / transversal / nova dins d'abast]
- Proceed
```

Si no ho està:

```text
SPEC-TO-CODE STOP
- Problema: [què no encaixa]
- Referència mestra: [secció exacta]
- Ajust mínim alineat: [alternativa]
- Si es vol igualment: requereix decisió explícita de producte
```
