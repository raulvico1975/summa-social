# Certificats de Donació: Criteri de Càlcul

> Versió 1.1 — Gener 2026

Aquest document defineix el criteri fiscal que Summa Social aplica per calcular l'import dels certificats de donació anuals i el Model 182.

Aquest criteri s'aplica a partir de la seva implantació a Summa Social i no modifica certificats ja emesos amb criteris anteriors.

---

## 1. Què es considera donació certificable

Una donació certificable és qualsevol transacció que compleix:

- `amount > 0` (ingrés positiu)
- `contactId` = ID del donant
- `date` dins l'any fiscal seleccionat
- `archivedAt` = `null` o `undefined` (transacció activa)

**S'exclouen (no compten):**
- Transaccions amb `archivedAt` (arxivades per soft-delete)

**No es filtra per:**
- `donationStatus` (irrellevant pel càlcul)
- `category` (qualsevol categoria d'ingrés)
- `source` (bancària, remesa, manual)

> **Nota:** Aquest criteri s'aplica exclusivament a certificats anuals i Model 182.

---

## 2. Com es tracten devolucions

Les devolucions **resten** del total certificable.

**Criteri de detecció:**
- `transactionType === 'return'`
- `contactId` = ID del donant
- `date` dins l'any fiscal
- `archivedAt` = `null` o `undefined` (devolució activa)

**S'exclouen:**
- `transactionType === 'return_fee'` (comissions bancàries no resten)
- Devolucions amb `archivedAt` (arxivades per soft-delete)

**Fórmula:**

```
Import Net = Donacions Brutes − |Devolucions|
```

El bloc de resum fiscal només apareix al PDF si hi ha devolucions:

```
┌─────────────────────────────────────────┐
│ Resum fiscal:                           │
│ Donacions rebudes:          1.200,00 €  │
│ Devolucions efectuades:      -200,00 €  │
│ Import net certificat:      1.000,00 €  │
└─────────────────────────────────────────┘
```

---

## 3. Relació Model 182 ↔ Certificats

Utilitzen **exactament el mateix criteri de càlcul**:

| Element | Model 182 | Certificat PDF |
|---------|-----------|----------------|
| Base càlcul | Import net | Import net |
| Detecció devolucions | `transactionType === 'return'` | `transactionType === 'return'` |
| Agrupació | Per donant/any | Per donant/any |
| Exclusió `return_fee` | Sí | Sí |

**Coherència garantida:** El que surt al Model 182 coincideix amb el certificat individual del donant.

---

## 4. Casos límit

| Cas | Comportament |
|-----|--------------|
| **Import net = 0 €** | No es genera certificat. Toast informatiu a l'usuari. |
| **Import net < 0 €** | Es mostra 0 € (mai negatiu). No es genera certificat. |
| **Devolució tardana** (gener 2026 d'una donació 2025) | La devolució compta al 2026, no al 2025. Cada any és independent. |
| **Devolució no vinculada** (`contactId = null`) | No afecta cap donant fins que s'assigni. |
| **Devolució assignada a donant diferent** | Resta del donant al qual s'assigna la devolució. Summa Social no infereix relacions automàtiques entre donacions i devolucions; la responsabilitat d'assignació correcta és de l'entitat. |
| **Múltiples devolucions mateix donant** | Es sumen totes i resten del total brut. |
| **Transacció arxivada** (`archivedAt` present) | No compta. Ni donacions ni devolucions arxivades afecten el càlcul. |
| **Remesa desfeta** | Les filles de la remesa queden amb `archivedAt` → no compten. |

---

## 5. Responsabilitat

> **Summa Social aplica un criteri fiscal conservador basat en la informació disponible; la correcta assignació de devolucions és responsabilitat de l'entitat.**

Aquest criteri garanteix coherència entre certificats emesos a donants i la informació declarada a l'Agència Tributària mitjançant el Model 182.

---

## Components que implementen aquest criteri

- `donation-certificate-generator.tsx` — Generador massiu (Model 182 i certificats en lot)
- `donor-detail-drawer.tsx` — Certificat anual individual des del detall del donant
- Enviament per email — Mateix PDF que la descàrrega

---

## Historial de versions

| Versió | Data | Canvis |
|--------|------|--------|
| 1.1 | Gener 2026 | Afegit criteri `archivedAt`: transaccions arxivades no compten |
| 1.0 | Desembre 2025 | Versió inicial |
