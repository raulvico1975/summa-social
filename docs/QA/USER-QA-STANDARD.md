# Estàndard QA d'usuari de Summa Social

## Objectiu

Aquest protocol valida Summa Social com ho faria una persona responsable d'una ONG amb rol d'administrador ordinari. No substitueix els tests unitaris ni els smokes de deploy: comprova permisos, formularis, persistència, documents, projectes i neteja des de la interfície real.

Un run només és `PASS` quan:

1. Han passat totes les comprovacions obligatòries del perfil.
2. No s'ha observat cap HTTP 500, `permission-denied`, error no controlat ni persistència incorrecta.
3. L'auditoria final confirma zero restes temporals a Firestore, Storage i Firebase Auth.

## Perfils

### QA ràpid

- Durada orientativa: 10-15 minuts.
- Superfície: Baruma, Flores i PBI.
- Escriptures permeses: contactes, una categoria a Baruma i una invitació temporal a Baruma.
- No crea moviments, documents bancaris ni projectes a les organitzacions reals.

### QA estàndard

- Durada orientativa: 45-60 minuts.
- Executa primer tot el QA ràpid.
- La prova econòmica completa s'executa només a `[QA] ONG Summa Social` (`qa-ong-summa`).
- Inclou compte bancari, importació, deduplicació, documents, pendents, projecte, pressupost, tipus de canvi, imputacions i exports.

Quan Raül diu `Fes QA d'usuaris`, el perfil per defecte és `standard`. Quan diu `Fes QA ràpid`, el perfil és `quick`.

## Identitat QA permanent

- Email: `raul@semillasl.com`.
- Rol: administrador ordinari a Baruma, Flores, PBI i `qa-ong-summa`.
- Baruma: permisos efectius idèntics als d'Ainoa.
- Prohibit: document a `systemSuperAdmins`, membresia a organitzacions internes o credencial dins del repositori.
- Credencial: Mac Keychain, servei `summa-social-user-qa`.

La contrasenya no es mostra per terminal ni es registra a cap evidència. Per una prova manual es pot copiar temporalment:

```bash
npm run qa:user -- credential --copy --ttl 60
```

El procés només buida el porta-retalls si al cap del TTL encara conté la mateixa credencial.

## Setup inicial

El `setup` és idempotent i fa dry-run per defecte:

```bash
npm run qa:user -- setup
```

Per aplicar la configuració real cal la confirmació explícita:

```bash
npm run qa:user -- setup --apply --confirm-production qa-ong-summa
```

El setup:

1. Reutilitza o crea el compte Auth QA i verifica el correu.
2. Genera una credencial nova només si no existeix al Keychain o s'ha demanat `--rotate`.
3. Elimina el registre SuperAdmin del compte QA.
4. Crea o repara `qa-ong-summa` i l'índex canònic `/slugs/qa-ong-summa`.
5. Activa `projectModule` i `pendingDocs` a l'organització QA.
6. Crea el perfil i les quatre membresies permanents.
7. Copia a Baruma el rol, denegacions i permisos addicionals d'Ainoa.
8. Torna a llegir Auth i Firestore i falla si la configuració final no és exacta.

## Iniciar un run

```bash
npm run qa:user -- begin --profile quick
npm run qa:user -- begin --profile standard
```

Cada run crea `tmp/qa-user/<runId>/` amb:

- `instructions.md`: valors exactes i passos de tancament.
- `manifest.json`: IDs i rutes exactes descoberts.
- `result.json`: contracte auditable versió 1.
- `report.md`: resum humà.
- `fixtures/`: CSV i PDFs sintètics.
- `screenshots/`: captures centrades en registres QA.
- `downloads/`: exports del run.
- `browser.jsonl`: checks i evidències sense secrets.

El `begin` consulta `/api/version` i bloqueja el run si el compte, els permisos, el Keychain, l'organització QA o la revisió servida no són correctes.

## Regles de Navegador

1. Utilitzar `@Navegador` amb viewport d'escriptori estable i interfície en català.
2. Fer les operacions des de la UI. Les lectures Admin només serveixen per auditar i netejar.
3. No editar mai registres preexistents. Tots els registres han de contenir el `runId` complet.
4. Després de cada desat, recarregar la pàgina, cercar pel `runId` i tornar a obrir el registre.
5. Per invitacions, tancar la sessió d'administrador abans d'obrir l'enllaç.
6. No registrar URLs d'invitació, tokens, credencials ni dades personals alienes al run.
7. Abans d'una captura, filtrar pel `runId` perquè no hi apareguin dades d'altres persones.
8. No repetir silenciosament una acció funcional. Només es permet un reintent de navegació o infraestructura, i s'ha d'anotar.

Cada grup es registra així:

```bash
npm run qa:user -- record \
  --run-id QAUSR-YYYYMMDD-HHMMSS-XXXXXX \
  --id live.baruma.contacts \
  --status PASS \
  --evidence-json '{"reloadPersisted":true,"http500":0}'
```

Els estats de check són `PASS`, `FAIL` i `BLOCKED`.

## Escenari ràpid

### Preflight

- `preflight.revision`: `/api/version` respon i la revisió queda registrada.
- `preflight.account`: compte habilitat, verificat, credencial al Keychain i sense SuperAdmin.
- `preflight.permissions`: quatre membresies admin, Baruma igual que Ainoa i zero membresies internes.

### Navegació

Per Baruma, Flores i PBI:

1. Entrar per `/{orgSlug}/login` com a usuari QA.
2. Obrir dashboard, moviments, donants, proveïdors, treballadors i configuració.
3. Confirmar que no hi ha pantalla blanca, error de permisos, toast destructiu ni request 5xx.
4. Confirmar que Projectes és visible a Baruma i no és visible a Flores/PBI.

Checks: `live.baruma.navigation`, `live.flores.navigation`, `live.pbi.navigation`.

### Contactes

Per cada organització real:

1. Crear un proveïdor sense CIF però amb nom.
2. Crear un treballador.
3. Crear un donant/soci.
4. Reobrir cada registre i modificar com a mínim nom secundari/nota i un camp opcional.
5. Recarregar i verificar la persistència.
6. Arxivar i restaurar des de la UI.

Checks: `live.baruma.contacts`, `live.flores.contacts`, `live.pbi.contacts`.

### Categoria manual a Baruma

1. Escriure amb teclat la categoria indicada a `instructions.md` en un selector que anunciï entrada manual.
2. Desar el formulari.
3. Recarregar i comprovar que el valor continua visible i seleccionable.

Check: `live.baruma.category`.

### Invitació a Baruma

1. Crear la invitació per l'email `.test` del run.
2. Copiar l'enllaç sense registrar-lo a l'evidència.
3. Tancar la sessió QA.
4. Obrir l'enllaç, completar l'alta amb una credencial temporal i entrar a Baruma.
5. Verificar organització, rol i accés esperats.
6. Tancar sessió. La neteja eliminarà Auth, perfil, membre i invitació.

Check: `live.baruma.invitation`.

### Permís negatiu

- Intentar obrir `/admin`: ha de quedar bloquejat o redirigit.
- Intentar entrar a `copilot-validation`: no ha d'obtenir accés operatiu.

Check: `permissions.negative`.

## Escenari estàndard

El perfil estàndard executa tot l'anterior i continua a `qa-ong-summa`.

### Contactes i camps manuals

Repetir alta, modificació, recàrrega, arxiu i restauració de proveïdor, treballador i donant. Provar entrada per teclat de nom de contrapart i categoria als selectors que ho permetin.

Check: `qa.contacts`.

### Compte i importació bancària

1. Crear el compte `QA NO OPERATIU` indicat al run amb un IBAN sintètic de checksum vàlid.
2. Editar-ne el nom, arxivar-lo i restaurar-lo.
3. Importar el CSV del directori `fixtures`.
4. Confirmar exactament tres moviments i els imports `-300`, `+100` i `-1000` EUR.
5. Reimportar el mateix fitxer i confirmar que no crea moviments nous.

Checks: `qa.bankAccount`, `qa.bankImport`, `qa.bankDedupe`.

### Classificació i documents

1. Vincular el moviment de `-300 EUR` al proveïdor QA i assignar-hi la categoria QA.
2. Vincular el moviment de `+100 EUR` al donant QA.
3. Recarregar i confirmar els vincles.
4. Pujar els dos PDFs de moviment.
5. Obrir-los, canviar el principal, eliminar-ne un i recarregar.
6. Confirmar que el document restant continua obrint-se.

Checks: `qa.transactionClassification`, `qa.transactionDocuments`.

### Document pendent

1. Pujar el PDF pendent sense dependre de l'extracció amb IA.
2. Omplir manualment número, data, import, proveïdor i categoria.
3. Confirmar, conciliar amb el moviment de `-300 EUR` i desfer la conciliació.
4. Arxivar, restaurar i eliminar el document.

Check: `qa.pendingDocuments`.

### Projecte, pressupost i tipus de canvi

1. Crear el projecte de `1.000 EUR` i editar-lo.
2. Crear partides de `600 EUR` i `400 EUR`.
3. Crear la transferència `1.000 EUR -> 65.000 DOP`.
4. Crear la despesa off-bank de `13.000 DOP`, modificar-ne un camp i adjuntar document.
5. Imputar-la al 50% i verificar `100 EUR`; després al 100% i verificar `200 EUR`.
6. Imputar el moviment bancari de `300 EUR` al 50% i verificar `150 EUR`; després al 100% i verificar `300 EUR`.
7. Verificar execució total `500 EUR`, partides correctes i TC `1/65 EUR per DOP`.
8. Tancar sessió, tornar a entrar i confirmar tots els valors.

Checks: `qa.projectCrud`, `qa.projectFx`, `qa.offBankAssignment`, `qa.bankAssignment`, `qa.persistence`.

### Salvaguarda d'eliminació

1. Intentar eliminar el projecte mentre té dades vinculades: ha de quedar bloquejat.
2. Desvincular les despeses.
3. Eliminar despesa off-bank, partides i transferència FX.
4. Tancar i eliminar el projecte.

Check: `qa.projectDeleteGuard`.

### Exports

Descarregar a `downloads/`:

- Moviments filtrats pel `runId`.
- Donants filtrats o export complet validant la fila QA.
- Justificació Excel del projecte i ZIP d'adjunts si està disponible.

Cada fitxer ha de tenir mida superior a zero i contenir el marcador o les files esperades.

Check: `qa.exports`.

## Auditoria i neteja

Ordre obligatori:

```bash
npm run qa:user -- audit --run-id <runId> --phase active
npm run qa:user -- cleanup --run-id <runId>
npm run qa:user -- audit --run-id <runId> --phase post-cleanup
npm run qa:user -- finish --run-id <runId>
```

L'auditoria descobreix registres per valors exactes del fixture i desa els IDs al manifest. La neteja només usa aquests IDs i rutes exactes. Les consultes o prefixos serveixen per descobrir, mai per executar un esborrat massiu.

Ordre intern de neteja:

1. Fitxers exactes de Storage.
2. Subdocuments de moviment, links, partides i FX.
3. Moviments, pendents, off-bank, projecte, compte i contactes.
4. Perfil i membresia temporal de la invitació.
5. Usuari Auth temporal.
6. Segona descoberta i verificació de zero restes.

La neteja no pot eliminar mai:

- `raul@semillasl.com`.
- Les quatre membresies permanents del compte QA.
- L'organització `qa-ong-summa` ni el seu slug.
- Moviments o projectes de Baruma, Flores o PBI.

## Resultats

- `PASS`: funcionalitat completa i zero restes.
- `FAIL_FUNCTIONAL`: check absent o fallit, amb neteja correcta.
- `FAIL_CLEANUP`: queda algun recurs temporal; té prioritat sobre qualsevol altre resultat.
- `BLOCKED_LOGIN`: compte o credencial no permeten començar.
- `BLOCKED_ENV`: revisió, permisos o organització no compleixen el preflight.

Si un run falla, primer es neteja. La correcció funcional, el deploy i la repetició són un procés separat i requereixen les autoritzacions habituals.

## Dry-run i proves

```bash
npm run qa:user:test
npm run qa:user -- dry-run --profile quick
npm run qa:user -- dry-run --profile standard
npm run qa:user -- dry-run --profile standard --inject-failure qa.bankImport
```

El dry-run no inicialitza Firebase ni crea dades remotes. Valida fixtures, checks obligatoris, informe i càlcul del resultat.

## Fora d'abast

Remeses SEPA, Stripe, models 182/347, backups, facturació, funcions SuperAdmin i responsive. Cada àrea necessita una suite pròpia perquè pot tenir efectes fiscals, de pagament o d'administració global.
