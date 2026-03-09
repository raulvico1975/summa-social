# Data Exit Plan

**Procediment intern de sortida i lliurament de dades**  
*Versió 2.0 · actualitzat el 8 març 2026*

## 1. Propòsit

Aquest document defineix el procediment real i vigent per facilitar la sortida d'una entitat de Summa Social sense bloqueig tecnològic.

Principi base:

> Cap entitat ha de quedar atrapada a Summa Social.

## 2. Mecanismes reals disponibles avui

### 2.1 Export canònic complet

Mecanisme oficial:

- **Backup local JSON** generat server-side
- Accés: **només SuperAdmin**
- Punt d'entrada: `/admin` -> menú d'organització -> **Backup local**
- Ruta tècnica: `GET /api/admin/orgs/{orgId}/backup/local`

Aquest és el mecanisme que s'ha d'utilitzar per a una sortida completa o una migració.

### 2.2 Exportacions auxiliars

Per a revisió o lliuraments parcials, existeix també el panell:

- `/{orgSlug}/dashboard/super-admin`

Allà hi ha:

- exportació JSON parcial seleccionable
- exportacions CSV individuals de conjunts concrets

Aquestes exportacions són útils com a suport operatiu, però **no substitueixen** el backup local complet.

### 2.3 El que NO és mecanisme actiu

- Els backups al núvol (Dropbox / Google Drive) estan **desactivats per defecte**
- No formen part del procés oficial de sortida
- No s'han d'oferir com a compromís operatiu ni contractual

## 3. Contingut del backup complet

Segons la implementació actual a `src/lib/admin/org-backup-export.ts`, el backup complet inclou:

- `organization`
- `categories`
- `bankAccounts`
- `members`
- `transactions`
- `contacts`
- `remittances`
- `pendingDocuments`
- `expenseReports`
- `projectModule.projects`
- `projectModule.budgetLines`
- `projectModule.expenses`

### Exclusions deliberades

No s'hi inclouen:

- tokens (`accessToken`, `refreshToken`)
- URLs signades (`downloadUrl`, `signedUrl`, `tempUrl`)
- URLs de Storage com `logoUrl`, `signatureUrl`, `document`, `documentUrl`
- fitxers binaris de Storage

### Format de sortida

Fitxer descarregat:

```text
summa_backup_{slug}_{YYYY-MM-DD}.json
```

Estructura base:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-03-08T12:00:00.000Z",
  "orgId": "abc123",
  "orgSlug": "entitat-demo",
  "counts": {},
  "data": {}
}
```

## 4. Procediment operatiu de sortida

### Pas 1. Confirmar la petició

Registrar internament:

- entitat afectada
- data de petició
- persona que la sol·licita
- abast desitjat: només exportació o baixa completa del servei

### Pas 2. Determinar el lliurable

Per defecte, lliurable mínim:

- backup local complet en JSON

Opcionalment, si ajuda a la transició:

- CSVs parcials
- sessió breu d'explicació del dataset

### Pas 3. Generar l'export

1. Accedir com a SuperAdmin
2. Executar el backup local de l'organització
3. Verificar que el fitxer descarregat conté `counts` coherents
4. Si cal, complementar amb exportacions parcials del panell `super-admin`

### Pas 4. Validació mínima abans d'entregar

Checklist:

- el fitxer obre correctament
- `orgId` i `orgSlug` corresponen a l'entitat
- hi ha dades a les col·leccions esperades
- no hi ha tokens ni URLs signades visibles
- el nom del fitxer és correcte

### Pas 5. Entrega

L'entrega s'ha de fer per un canal acordat i prudent.

Regla:

- no compartir enllaços públics de llarga durada
- no enviar tokens ni credencials
- si hi ha dubte, comprimir i xifrar el fitxer abans d'enviar-lo

### Pas 6. Tancament operatiu

Després de l'entrega:

- confirmar recepció
- oferir una sessió curta de validació si cal
- documentar si l'accés a l'app queda desactivat immediatament o en data pactada

## 5. Temps objectiu

Objectius interns recomanats:

- resposta inicial: dins de 2 dies laborables
- generació i lliurament de l'export: dins de 7 dies naturals, si no hi ha incidència tècnica greu

Això és un objectiu operatiu, no un compromís tècnic automàtic del sistema.

## 6. Responsabilitats

### Summa Social

- generar l'export disponible segons els mecanismes reals del producte
- lliurar-lo sense secrets ni material sensible innecessari
- aclarir l'estructura del dataset si l'entitat ho necessita

### Entitat

- custodiar el fitxer rebut
- decidir la migració a un altre sistema
- validar funcionalment que el lliurable és suficient per al seu ús

## 7. Notes importants

- El format canònic actual de sortida és **JSON**
- Si una entitat necessita Excel o CSV com a format principal de migració, això s'ha de tractar com a suport addicional, no com a contracte implícit del producte
- Aquest document no regula retencions legals ni esborrat definitiu; això s'ha d'alinear amb el contracte de servei, la política de privacitat i les obligacions legals aplicables

## 8. Referències

- `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- `docs/security/PRIVACY_POLICY.md`
- `docs/security/TOMs.md`
- `docs/contracts/Service-Agreement-Template.md`
