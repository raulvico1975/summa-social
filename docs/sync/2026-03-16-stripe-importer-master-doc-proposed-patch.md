# Proposta exacta de patch — document mestre Stripe 3.10

Objectiu: alinear `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md` amb el contracte real del codi sense reobrir el debat funcional ni tocar invariants ja validats.

## Patch mínima proposada

```diff
--- a/docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md
+++ b/docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md
@@
 ### 3.10.4 Camps CSV requerits
 
 | Camp Stripe | Ús a Summa Social | Obligatori |
 |-------------|-------------------|------------|
 | `id` | Traçabilitat (`stripePaymentId`) | ✅ |
 | `Created date (UTC)` | Data de la donació | ✅ |
 | `Amount` | Import brut | ✅ |
 | `Fee` | Comissió Stripe | ✅ |
 | `Customer Email` | Matching amb donant | ✅ |
 | `Status` | Filtrar només `succeeded` | ✅ |
-| `Transfer` | Agrupació per payout (`po_xxx`) | ✅ |
+| `Transfer` | Agrupació per payout (`po_xxx`) | ⚠️ Només obligatori per files que ja formen part d'un payout |
 | `Amount Refunded` | Detectar reemborsos | ✅ |
 | `Description` | Concepte (opcional) | ❌ |
 
 ### 3.10.5 Filtratge automàtic
 
 | Condició | Acció |
 |----------|-------|
 | `Status !== 'succeeded'` | Excloure silenciosament |
 | `Amount Refunded > 0` | Excloure + mostrar avís |
+| `Transfer` buit o nul | Ignorar la fila + mostrar avís no bloquejant |
 
 ### 3.10.6 Agrupació per payout
 
-Les donacions s'agrupen pel camp `Transfer` (po_xxx):
+Només les files amb `Transfer` entren a l'agrupació per payout. Les files sense `Transfer` s'ignoren perquè encara no formen part d'un payout real de Stripe. Si, després del filtratge, no queda cap fila amb `Transfer`, l'operació falla amb `ERR_NO_PAYOUT_ROWS`.
 
 ```typescript
 interface PayoutGroup {
   transferId: string;    // po_xxx
   rows: StripeRow[];     // Donacions del payout
@@
 ### 3.10.13 Errors i missatges
 
 | Codi | Condició | Missatge |
 |------|----------|----------|
 | `ERR_NO_COLUMNS` | Falten columnes | "El CSV no té les columnes necessàries: {columnes}" |
+| `ERR_NO_PAYOUT_ROWS` | No queda cap fila amb payout | "Aquest export de Stripe encara no conté cap payout. Torna a exportar-lo més tard quan Stripe hagi generat la transferència al banc." |
 | `ERR_NO_MATCH` | Cap payout quadra | "No s'ha trobat cap payout que coincideixi amb {amount} €" |
 | `ERR_AMOUNT_MISMATCH` | Import no quadra | "L'import no quadra. Esperats {expected} €, calculats {actual} €" |
 | `ERR_NO_BANK_FEES_CATEGORY` | Falta categoria | "No s'ha trobat la categoria de despeses bancàries" |
 | `WARN_REFUNDED` | Hi ha reemborsos | "S'han exclòs {count} donacions reemborsades ({amount} €)" |
+| `WARN_NO_TRANSFER_IGNORED` | Hi ha pagaments encara sense payout | "S'han ignorat {count} pagaments que encara no formen part d'un payout de Stripe." |
 | `WARN_NO_DONOR` | Sense match | "{count} donacions pendents d'assignar donant" |
```

## Invariants que han de quedar intactes

- La conciliació només es fa contra payouts reals.
- El match amb banc continua sent per import net.
- La tolerància continua sent `±0,02`.
- El matching de donants continua sent per email.
- No hi ha creació automàtica de donants.
- No es processen files "pendents de payout" com si fossin banc.

## Nota de coherència interna del mateix mestre

Encara que l'encàrrec principal és 3.10, dins del mateix document hi ha una altra línia que també queda contradictòria si no s'ajusta:

- secció 4.6, línia actual aproximada 5059
- text actual: `Columnes requerides: id, Created date (UTC), Amount, Fee, Customer Email, Status, Transfer, Amount Refunded`

Text mínim recomanat perquè no torni a contradir 3.10:

```text
Columnes requerides per al fitxer: id, Created date (UTC), Amount, Fee, Customer Email, Status, Amount Refunded. El camp Transfer és obligatori només per a les files que ja formen part d'un payout; les files sense Transfer s'ignoren.
```

Si no es toca aquesta línia, el document mestre continuarà tenint una contradicció interna encara que 3.10 quedi corregit.
