# Subprocessors — Summa Social

**Versió**: 2.0  
**Última actualització**: 8 març 2026

## 1. Objectiu

Aquest document llista els principals proveïdors externs que intervenen en el tractament de dades dins del funcionament actual de Summa Social.

## 2. Llista actual

| Proveïdor | Servei | Finalitat principal | Notes |
|-----------|--------|---------------------|-------|
| Google Cloud / Firebase | Firebase Authentication | Identitat, autenticació i gestió d'accés | Login i verificació d'usuaris |
| Google Cloud / Firebase | Firestore | Base de dades aplicativa | `firebase.json` declara base de dades a `us-central1` |
| Google Cloud / Firebase | Storage | Emmagatzematge de fitxers | Documents i fitxers del producte |
| Google Cloud / Firebase | App Hosting / Hosting | Servei web i publicació de l'app | Entrega de l'aplicació i redirecció pública |
| Google Cloud / Firebase | Cloud Functions | Processos backend i automatitzacions | Exports, alertes, salut, tasques programades |
| Resend | Correu electrònic transaccional / operatiu | Formulari de contacte, certificats i alertes per email | S'usa via API HTTPS |

## 3. Aclariments importants

### 3.1 Backups al núvol per a clients

Existeix codi per a Dropbox i Google Drive, però:

- estan desactivats per defecte
- no formen part del servei actiu estàndard
- no es consideren subencarregats actius del servei base mentre aquesta funcionalitat no s'ofereixi operativament

Si en el futur s'activen de forma real per a clients, aquest document s'haurà d'actualitzar.

### 3.2 Ubicacions i infraestructura

- Les ubicacions exactes poden dependre de la configuració vigent del projecte i de l'arquitectura del proveïdor.
- Quan el repo permet confirmar-ho, s'indica explícitament.
- Quan no es pot afirmar amb precisió suficient des del codi/configuració disponible, no es força una regió concreta.

## 4. Govern i manteniment

- Qualsevol canvi material de proveïdor o d'ús d'un proveïdor existent s'ha de reflectir aquí.
- Aquesta llista s'ha de revisar juntament amb:
  - `docs/security/PRIVACY_POLICY.md`
  - `docs/security/TOMs.md`

## 5. Notes de rol

En relació amb les dades de les entitats clientes:

- Summa Social actua com a encarregat del tractament
- aquests proveïdors actuen com a subencarregats o infraestructura de suport del servei, segons el cas
