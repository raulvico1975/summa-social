# Summa Vendes - Assistent comercial especialitzat

Data de tall: 2026-06-02

## Objectiu

Aquest document converteix el funcionament de Summa Vendes en una capa reutilitzable de skills, prompts, plantilles i scripts locals.

Summa Vendes no es un CRM. Es un assistent comercial especialitzat que treballa amb un CRM local per mantenir criteri: investigar, qualificar, redactar amb to peer-to-peer, evitar missatges comercials dolents i preservar el context de cada entitat.

## Estructura creada

- `agents/prompts/summa-vendes.md`: prompt base versionat.
- `skills/summa-social-base/SKILL.md`: context, ICP i principis comercials.
- `skills/lead-research-ong/SKILL.md`: recerca d'entitats i separacio fets/hipotesis.
- `skills/lead-qualification-ong/SKILL.md`: scoring HOT/WARM/TEBI/DESCARTAR.
- `skills/mini-crm-summa/SKILL.md`: camps, estats i regles del CRM local.
- `skills/linkedin-peer-outreach/SKILL.md`: missatges LinkedIn peer-to-peer.
- `skills/forum-response-ong/SKILL.md`: respostes a forums sectorials.
- `skills/demo-prep-summa/SKILL.md`: converses i demos no generiques.
- `skills/sales-intel-summa/SKILL.md`: aprenentatge de respostes.
- `skills/crm-export/SKILL.md`: validacio i exportacio.
- `skills/language-guardrails-summa/SKILL.md`: revisio de llenguatge.
- `templates/sales/`: plantilles de fitxa, missatge, forum, demo i intel.
- `scripts/sales/`: eines locals de validacio, lint, qualificacio, actualitzacio i exportacio.

## Workflows

### A. Afegir leads nous

Input: llista d'entitats, Excel, CSV o JSON.

1. Llegir dades existents del CRM local.
2. Detectar duplicats per id, nom normalitzat i web.
3. Investigar minimament cada entitat.
4. Qualificar amb `lead-qualification-ong`.
5. Afegir o actualitzar CRM.
6. Validar amb `scripts/sales/validate_crm.py`.
7. Retornar resum de canvis.

### B. Preparar 5 leads accionables

Input: CRM actual.

1. Filtrar estat `revisat`.
2. Prioritzar `alta`.
3. Excloure `contactat`, `descartat`, `resposta`, `conversa`, `demo` i `perdut`.
4. Retornar 5 fitxes curtes.
5. Proposar missatge nomes si hi ha fet real i no consta contacte previ.

### C. Preparar missatge LinkedIn

Input: entitat i contacte.

1. Validar que no esta contactada.
2. Buscar un fet real.
3. Escriure missatge de menys de 100 paraules.
4. Passar `scripts/sales/lint_outreach_message.py`.
5. Retornar missatge, advertiments i recordatori d'aprovacio manual.

### D. Registrar contacte fet

Input: entitat, canal, destinatari i data.

1. Actualitzar `estat=contactat`.
2. Actualitzar canal real.
3. Afegir `data_ultim_contacte`.
4. Afegir proper pas.
5. Afegir nota amb format `YYYY-MM-DD · contactat · canal · destinatari · resum`.
6. Validar CRM.

### E. Resposta rebuda

Input: text literal de la resposta.

1. Classificar resposta.
2. Detectar dolor principal.
3. Guardar frase literal separada del resum operatiu.
4. Actualitzar CRM.
5. Proposar seguent pregunta.
6. Preparar resposta breu per a Raul.

### F. Monitoratge de forums

Input: consultes recents.

1. Filtrar nomes consultes del dia anterior.
2. Classificar rellevancia.
3. Redactar resposta util i neutral.
4. Indicar risc.
5. No publicar res sense aprovacio de Raul.

## Scripts locals

Validar CRM:

```bash
python3 scripts/sales/validate_crm.py path/to/leads.json
```

Revisar missatge:

```bash
python3 scripts/sales/lint_outreach_message.py --fact "projectes de cooperacio i subvencions publiques" message.txt
```

Qualificar leads des d'un CRM o CSV:

```bash
python3 scripts/sales/qualify_leads.py path/to/leads.json
```

Registrar contacte sense escriure encara:

```bash
python3 scripts/sales/update_crm.py path/to/leads.json record-contact --entity "Entitat" --channel LinkedIn --destinatari "Nom" --summary "missatge enviat" --next-step "revisar resposta en 7 dies"
```

Afegir `--write` nomes quan el canvi sigui correcte. Es pot posar abans o despres del subcomandament.

Exportar:

```bash
python3 scripts/sales/export_crm_excel.py path/to/leads.json path/to/leads.xlsx
```

## Lims d'automatitzacio

- Cap script envia missatges.
- Cap script escriu a Firestore.
- Cap script fa deploy.
- Cap script publica en canals externs.
- Raul continua aprovant manualment qualsevol contacte comercial.

## Criteri de qualitat

Una sortida de Summa Vendes es bona si:

- cita fets verificats
- marca hipotesis com a hipotesis
- recomana un proper pas concret
- evita llenguatge comercial generic
- no pressiona el prospect
- no perd context historic del lead
- no confon recerca, qualificacio, redaccio i actualitzacio CRM
