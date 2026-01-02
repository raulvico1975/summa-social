# Política de Privacitat — Summa Social

**Última actualització**: Desembre 2025
**Contacte de privacitat**: privacy@summasocial.app

---

## 1. Qui som

**Summa Social** és una aplicació de gestió financera per a entitats socials, desenvolupada i mantinguda per Raül Vico, que actua com a responsable del tractament de les dades dels usuaris de l'aplicació.

- **Responsable del tractament** (per a dades d'usuaris de l'aplicació): Summa Social / Raül Vico
- **Encarregat del tractament** (per a dades de les entitats clients): Summa Social actua per compte de cada entitat, que és la responsable de les dades dels seus donants, socis, proveïdors i treballadors.

---

## 2. Quines dades tractem

### 2.1 Usuaris de l'aplicació (Summa Social és responsable)

| Dada | Finalitat |
|------|-----------|
| Email | Identificació i accés al compte |
| Nom | Personalització de la interfície |
| Rol | Control d'accés (Admin, User, Viewer) |
| Organitzacions | Gestió multi-organització |

Les credencials d'accés (contrasenyes) són gestionades per Firebase Authentication i no són accessibles per Summa Social.

### 2.2 Dades de les entitats (Summa Social és encarregat)

Summa Social tracta les següents dades per compte de les entitats clients:

- **Donants i socis**: nom, NIF, IBAN, adreça, email, telèfon
- **Proveïdors**: nom, NIF, dades de contacte
- **Treballadors**: nom, NIF, dades laborals
- **Moviments bancaris**: data, import, concepte, categoria

La base legal i el deure d'informar els interessats (donants, socis, etc.) correspon a cada entitat com a responsable del tractament.

**Summa Social no tracta dades de categories especials segons l'Art. 9 del RGPD.**

---

## 3. Base legal del tractament

| Tractament | Base legal |
|------------|------------|
| Usuaris de l'aplicació | Execució del contracte de servei (Art. 6.1.b RGPD) |
| Dades de les entitats | Segons instruccions del responsable (entitat) |

---

## 4. Destinataris de les dades

### 4.1 Subencarregats

Summa Social utilitza els següents serveis de Google/Firebase per al funcionament de l'aplicació:

| Servei | Ubicació | Garanties |
|--------|----------|-----------|
| Firebase Authentication | EUA | Clàusules Contractuals Tipus (SCC) + Marc UE-EUA |
| Firebase Firestore | UE (eur3) | Dades dins l'Espai Econòmic Europeu |
| Firebase Storage | UE (eur3) | Dades dins l'Espai Econòmic Europeu |
| Firebase Hosting | Global (CDN) | Només assets i aplicació web |

Més detalls al document intern [Subprocessors.md](./Subprocessors.md).

### 4.2 Cessions per obligació legal

Les entitats clients poden cedir dades a:
- **Agència Tributària**: Model 182 (donatius), Model 347 (operacions amb tercers)
- **Entitats bancàries**: Gestió de remeses i rebuts

Aquestes cessions són responsabilitat de cada entitat.

---

## 5. Conservació de les dades

| Tipus de dada | Termini |
|---------------|---------|
| Usuaris de l'aplicació | Mentre el compte estigui actiu + 12 mesos |
| Dades fiscals (entitats) | Mínim 6 anys (obligacions mercantils i comptables) |
| Altres dades de contactes | Segons política del responsable (entitat) |

Les còpies de seguretat es conserven durant períodes limitats i es gestionen segons les mesures descrites al document intern de seguretat.

---

## 6. Els teus drets

Com a interessat, tens dret a:

- **Accés**: Sol·licitar una còpia de les teves dades
- **Rectificació**: Corregir dades inexactes
- **Supressió**: Sol·licitar l'eliminació de les teves dades
- **Oposició**: Oposar-te a determinats tractaments
- **Limitació**: Sol·licitar la restricció del tractament
- **Portabilitat**: Rebre les teves dades en format estructurat

### Com exercir els teus drets

- **Usuaris de l'aplicació**: Escriu a privacy@summasocial.app
- **Donants, socis o altres interessats d'una entitat**: Contacta directament amb l'entitat corresponent. Summa Social assistirà l'entitat en la gestió de la teva sol·licitud.

Termini de resposta: 1 mes (ampliable a 2 en casos complexos).

Si consideres que els teus drets no han estat atesos correctament, pots presentar una reclamació davant l'[Agència Espanyola de Protecció de Dades (AEPD)](https://www.aepd.es).

---

## 7. Seguretat

Summa Social implementa mesures tècniques i organitzatives per protegir les dades:

- Xifratge en trànsit (HTTPS/TLS)
- Xifratge en repòs (infraestructura Google)
- Control d'accés per rols
- Aïllament de dades entre organitzacions
- Gestió de sessions amb caducitat i mecanismes de tancament de sessió

Més detalls al document intern [TOMs.md](./TOMs.md).

---

## 8. Canvis en aquesta política

Qualsevol modificació d'aquesta política es comunicarà als usuaris a través de l'aplicació. La data d'"Última actualització" reflecteix la versió vigent.

---

## 9. Contacte

Per a qualsevol qüestió relacionada amb la privacitat:

**Email**: privacy@summasocial.app
**Responsable intern**: Raül Vico
**Titular del servei**: Raül Vico (Espanya)

**Delegat de Protecció de Dades (DPD/DPO)**: no aplicable (Summa Social no està obligada a designar DPD segons l'Art. 37 RGPD).
