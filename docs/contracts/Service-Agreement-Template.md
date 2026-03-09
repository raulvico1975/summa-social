# Service Agreement Template

**Plantilla de contracte de servei**  
*Versió 2.0 · revisar dades legals abans d'usar-la*

> Nota: aquesta plantilla s'ha alineat amb el producte real a 8 març 2026.
> Abans de signar-la, cal completar dades legals i revisar-la jurídicament.

## 1. Parts

**Proveïdor**  
Raül Vico / Summa Social  
NIF: [PENDENT]  
Email: [PENDENT]

**Entitat**  
[Nom de l'entitat]  
NIF: [PENDENT]  
Representada per: [PENDENT]

## 2. Objecte del servei

El Proveïdor presta a l'Entitat un servei professional que combina:

- accés a Summa Social
- configuració inicial i suport d'implantació
- acompanyament operatiu
- suport tècnic relacionat amb l'ús del producte

## 3. Abast funcional del producte

Summa Social està orientat a entitats socials d'Espanya i cobreix principalment:

- conciliació bancària i importació de moviments
- gestió de contactes
- remeses i devolucions
- fiscalitat operativa (Models 182/347, certificats i exports relacionats)
- documents pendents, liquidacions i justificació econòmica
- mòdul de projectes amb pressupost, partides i assignació de despeses

## 4. Limitacions d'abast

L'Entitat coneix i accepta que Summa Social:

- no és un ERP generalista
- no és comptabilitat formal completa
- no és una plataforma multi-país
- no ofereix integració bancària directa tipus Open Banking
- no inclou per defecte backups al núvol per al client

## 5. Model de servei

El servei es presta amb un model de creixement controlat i suport directe.

Per tant:

- l'onboarding és acompanyat, no self-service
- el suport es presta en horari laboral raonable
- els temps de resposta són orientatius, no SLA 24/7

### Temps orientatius

| Tipus | Resposta objectiu |
|------|--------------------|
| Crítica | 4h laborables |
| Alta | 24h |
| Mitjana | 72h |
| Baixa | sense compromís ferm |

## 6. Propietat i tractament de dades

### 6.1 Propietat

Les dades de l'Entitat continuen sent propietat de l'Entitat.

### 6.2 Rol de les parts

- per a les dades dels usuaris de l'app: Summa Social actua com a responsable del tractament en allò que correspongui al servei
- per a les dades operatives de l'Entitat: Summa Social actua com a encarregat del tractament per compte de l'Entitat

### 6.3 Protecció de dades

El tractament s'alinea amb la política de privacitat i els documents de seguretat vigents:

- `docs/security/PRIVACY_POLICY.md`
- `docs/security/Subprocessors.md`
- `docs/security/TOMs.md`

## 7. Exportació i sortida

### 7.1 Principi

L'Entitat pot sortir del servei i recuperar les seves dades.

### 7.2 Mecanisme principal actual

El mecanisme canònic de lliurament complet és:

- **backup local JSON** generat per SuperAdmin

Aquest export inclou el dataset complet disponible a l'aplicació, excloent secrets, tokens i URLs signades.

### 7.3 Mecanismes complementaris

Quan convingui, el Proveïdor pot complementar el lliurable amb:

- exportacions CSV parcials
- una sessió breu d'explicació de l'export

Però el compromís base de portabilitat és l'export **JSON complet**, no una migració automàtica a qualsevol tercer sistema.

### 7.4 Backups al núvol

Els backups al núvol (Dropbox / Google Drive) **no formen part del servei estàndard vigent**, ja que la funcionalitat està desactivada per defecte.

No s'han de considerar inclosos ni promesos, tret d'acord exprés posterior.

## 8. Conservació i finalització

En cas de finalització del servei:

- l'accés pot desactivar-se en la data acordada
- l'Entitat rep el lliurable d'exportació acordat
- qualsevol retenció posterior de dades per part del Proveïdor s'ha de limitar al necessari per obligació legal, seguretat operativa transitòria o instrucció escrita de l'Entitat

Si es vol fixar un termini concret de retenció post-sortida, s'ha d'omplir expressament aquí:

```text
Termini acordat: [PENDENT]
```

## 9. Responsabilitat compartida

L'Entitat manté la responsabilitat final sobre:

- validació de la seva informació econòmica
- ús dels informes generats
- compliment de les seves obligacions fiscals i legals

El Proveïdor respon del funcionament del servei dins dels seus límits, però no substitueix l'assessorament comptable, fiscal o jurídic de l'Entitat.

## 10. Canvis i evolució del producte

L'Entitat accepta que Summa Social evoluciona i pot incorporar:

- millores de robustesa
- millores de rendiment
- ajustos d'UX/UI
- correccions de criteris documentats

No obstant això, el Proveïdor no ha de reduir unilateralment capacitats nuclears ja contractades sense una comunicació prèvia raonable.

## 11. Documents de referència

- `docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA.md`
- `docs/security/PRIVACY_POLICY.md`
- `docs/trust/Data-Exit-Plan.md`
- `docs/governance/Product-Governance-Charter.md`
