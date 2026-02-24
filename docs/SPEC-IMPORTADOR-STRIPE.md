# ADR: Importador Stripe

**Estat:** Implementat (Desembre 2025)
**Decisió:** Implementació completa, tancada
**Fitxers:** `src/components/stripe-importer/`

---

## Context

Les entitats que reben donacions via Stripe obtenen un ingrés agregat al compte bancari (payout mensual o setmanal). Calia desglossar aquest ingrés en les donacions individuals de cada donant per:
- Imputar correctament cada aportació al donant corresponent
- Calcular el net (brut – comissions Stripe)
- Mantenir traçabilitat (`stripePaymentId`)

## Decisió d'arquitectura

**Input:** CSV exportat de Stripe ("Pagos → Columnes predeterminades") arrossegat directament a la UI. No hi ha connexió directa a l'API de Stripe.

**Per què CSV i no API directa?**
- Evita gestionar credencials Stripe per organització
- El CSV és l'exportació estàndard de Stripe i conté tot el necessari
- No afegeix dependències externes (prohibit per política)

**Matching de donants:** Únicament per email (`donor.email === stripeRow.customerEmail`, case-insensitive). Sense fuzzy matching. Sense creació automàtica de donants.

**Agrupació:** Per camp `Transfer` (po_xxx). Cada payout bancari = un grup.

**Verificació:** L'import net calculat (brut − comissions) ha de quadrar amb el moviment bancari pare amb tolerància ±0,02 € (arrodoniments bancaris). Si no quadra, operació bloquejada.

## Invariants permanents

| Invariant | Valor |
|-----------|-------|
| Tolerància import | ±0,02 € |
| Matching donant | Email únic, sense ambigüitat |
| Comissions | 1 sola transacció despesa agregada per payout |
| Reemborsos | Exclosos (`Amount Refunded > 0`), amb avís |
| Parser CSV | Propi, sense llibreries externes |
| Source | `source: 'stripe'` + `parentTransactionId` del moviment bancari |

## Estructura implementada

```
src/components/stripe-importer/
  ├── useStripeImporter.ts         # Hook: parsing, matching, agrupació
  ├── StripeImporter.tsx           # UI modal (2 passos: upload → revisió)
  ├── DonorSelectorEnhanced.tsx    # Assignació manual de donants no trobats
  ├── CreateQuickDonorDialog.tsx   # Crear donant nou durant el flux
  └── index.ts

src/lib/__tests__/stripe-importer.test.ts
```

Punt d'entrada: `transactions-table.tsx` → menú ⋮ si la descripció del moviment conté "STRIPE".

## Casos especials resolts

| Cas | Comportament |
|-----|--------------|
| Email sense match | Fila queda "Pendent", es pot assignar manualment o crear donant ràpid |
| Import no quadra | Error bloquejant, no es permet processar |
| `Amount Refunded > 0` | Exclosa + avís amb import exclòs |
| CSV no obert amb Excel | Avís explícit a la UI (Excel corromp els decimals europeus) |

## Fora d'abast (permanent)

- Connexió directa API Stripe
- Sincronització automàtica
- Subscripcions recurrents
- Reemborsos automàtics
- Creació automàtica de donants (decisió de política, no tècnica)
