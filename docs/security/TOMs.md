# TOMs — Mesures Tècniques i Organitzatives

**Versió 2.0**  
**Última actualització**: 8 març 2026

## 1. Objectiu

Aquest document resumeix les mesures tècniques i organitzatives aplicades a Summa Social amb un nivell proporcional al producte i al seu model operatiu actual.

## 2. Mesures tècniques

### 2.1 Infraestructura i transport

- Xifratge en trànsit mitjançant HTTPS/TLS
- Xifratge en repòs sobre la infraestructura de Google Cloud / Firebase
- Autenticació basada en Firebase Authentication

### 2.2 Control d'accés

- model multi-organització amb separació per `organizations/{orgId}`
- rols bàsics `admin`, `user`, `viewer`
- permisos granulars per membre (`userOverrides`, `userGrants`, `capabilities`)
- validació server-side de rutes sensibles amb Admin SDK o guardrails específics
- bypass SuperAdmin controlat només per a operativa de plataforma

### 2.3 Integritat de dades

- invariants de negoci documentades al document mestre
- protecció contra escriptures amb `undefined`
- segmentació prudent de batches Firestore (`<= 50`)
- validacions de payload en fluxos sensibles (`safe-write`, sanejats, checks d'import)
- soft-delete en fluxos on cal preservar traçabilitat

### 2.4 Seguretat d'exportació i backup

Mecanisme actiu actual:

- backup local JSON de l'organització, només per SuperAdmin

Controls associats:

- verificació explícita de SuperAdmin
- exclusió de secrets i URLs signades del payload
- resposta `no-store` en la descàrrega

Important:

- els backups al núvol per a clients estan desactivats per defecte i no s'han de considerar control actiu de continuïtat del servei

### 2.5 Diagnòstic i traçabilitat

- logs tècnics a rutes i processos backend
- incidències i bloquejos de deploy documentats
- audit logs en eines internes on està implementat
- checks de salut i verificacions de coherència en àrees sensibles

## 3. Mesures organitzatives

### 3.1 Principi de mínim privilegi

- cada usuari ha de tenir només el rol i capacitats necessàries
- els fluxos de plataforma requereixen SuperAdmin quan toca

### 3.2 Canvi controlat

- model worktree-first per implementació
- verificacions locals i de CI abans de publicar
- ritual formal de deploy i rollback documentat
- registre d'incidències i decisions de deploy

Documents operatius associats:

- `docs/GOVERN-DE-CODI-I-DEPLOY.md`
- `docs/DEV-SOLO-MANUAL.md`
- `docs/DEPLOY-INCIDENTS.md`

### 3.3 Gestió d'incidents

- priorització immediata d'incidents crítics
- preferència per estabilització abans que noves funcionalitats
- documentació d'incidències i rollback quan cal

### 3.4 Sortida i portabilitat

- existeix procediment intern de sortida
- el lliurable canònic actual és un export complet en JSON
- si cal, es poden afegir exportacions auxiliars en CSV o suport de lectura

Document associat:

- `docs/trust/Data-Exit-Plan.md`

## 4. Límits i aclariments

- aquest document descriu mesures raonables segons l'estat actual del producte; no equival a una certificació externa
- la seguretat també depèn de la configuració correcta de Google/Firebase i dels accessos operatius del mantenidor
- no s'ha de prometre cap mecanisme no actiu del producte com si fos control vigent

## 5. Revisió

Revisió recomanada:

- com a mínim anualment
- quan canviï l'arquitectura
- quan s'activin o es desactivin mecanismes rellevants de backup, exportació o permisos
