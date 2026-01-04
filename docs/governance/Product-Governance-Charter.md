# Product Governance Charter

**Summa Social — Govern del producte**  
*Versió 2.1 · document vinculant · ÚS INTERN*

---

## 1. Propòsit

Aquest document estableix **com creix Summa Social**, **amb qui**, **a quin ritme** i **amb quins límits**.

És la **constitució del producte**. Qualsevol decisió futura s'ha de justificar contra aquest marc.

No és orientatiu. No és temporal. No depèn de l'estat d'ànim.

---

## 2. Naturalesa del producte

Summa Social **no és un SaaS generalista**.

És:
* Consultoria amb software custom
* Orientada a ONGs petites i mitjanes
* Onboarding manual i acompanyat
* Creixement explícitament limitat
* Relació directa amb cada client

Qualsevol decisió que contradigui aquest principi **no és vàlida**.

---

## 3. Model d'accés

❌ No hi ha signup automàtic  
❌ No hi ha self-service  
❌ No hi ha accés sense procés previ

Cada instància:
* Es crea manualment
* Després d'un procés de qualificació
* Amb acceptació de condicions de servei

**Ritme màxim:** 1 ONG nova cada 2–3 mesos.

---

## 4. Fases de creixement i validació

### Fase 1 · ONGs 1–3 (PILOT)

**Objectiu:** estabilitat i detecció d'errors crítics

**Criteri d'èxit:**
* 0 errors crítics durant 3 mesos consecutius

**Indicadors orientatius:**
* Temps de resolució mitjà < 48h
* Feedback qualitatiu positiu

**Intern:** Aquestes ONGs saben que són pilot i col·laboren activament en millores.

---

### Fase 2 · ONGs 4–5 (VALIDACIÓ)

**Prerequisit:**
* Fase 1 completada (6 mesos sense errors crítics)

**Acció obligatòria:**
* **Validació professional externa**
* 2–3 sessions amb senior Next.js/Firebase
* Cost estimat: 400–600 €
* Lliurable: informe amb riscos crítics/altes/baixos

**Sense informe aprovat, no s'avança.**

**Intern:** A partir d'aquí, el producte ja no és "pilot", és servei consolidat.

---

### Fase 3 · ONGs 6–10 (CONSOLIDACIÓ)

**Prerequisits:**
* Validació professional aprovada
* 0 errors crítics durant 12 mesos

**Acció obligatòria:**
* Auditoria tècnica profunda (1.000–1.500 €)

**Decisió estratègica:**
* Continuar solo o contractar suport tècnic

---

### Límit absolut

**10–15 ONGs màxim.**

Més enllà, el model solo no és viable.

Aquest límit és **acceptat i no negociable**.

---

## 5. Regla d'or (gestió del risc)

### 5.1 Error crític

Es considera error crític:
* Pèrdua de dades
* Càlcul fiscal erroni
* Impossibilitat de recuperar informació
* Inconsistència greu en informes oficials

---

### 5.2 Criteri de bloqueig

**Davant 1 sol error crític:**

➡️ **STOP immediat d'onboardings nous**

No es reprèn fins que:
* Problema resolt
* Fix validat
* Estabilitat confirmada (mínim 2 setmanes)

**No hi ha excepcions.**

---

### 5.3 Comunicació d'errors crítics

**Protocol obligatori:**

* Comunicació a totes les ONGs: màxim 24h
* Explicació en termes no tècnics
* Workaround temporal (si existeix): 24h
* Actualitzacions cada 48h fins a resolució

**Principi:** Cap ONG s'assabenta de l'error per tercers.

---

### 5.4 Terminis de resolució

| Acció | Termini |
|-------|---------|
| Comunicació | 24h |
| Mitigació/workaround | 24h |
| Resolució definitiva | 72h (objectiu), màxim 30 dies |

**Si no es resol en 30 dies:**
* Activació del Pla B per a l'ONG afectada
* Reevaluació de viabilitat del producte

---

## 6. Temps de resposta (orientatius)

| Tipus | Resposta | Resolució objectiu |
|-------|----------|-------------------|
| Crítica | 4h laborables | 72h |
| Alta | 24h | 1 setmana |
| Mitjana | 72h | 2 setmanes |
| Baixa | Sense compromís | Sense compromís |

**Horari de suport:** Dilluns-divendres, 9-18h  
**Crítiques:** Disponibilitat ampliada (fins 22h)

Aquests són **objectius orientatius**, no garanties contractuals.  
La disponibilitat **no està garantida 24/7**.

---

## 7. Pla B (principi ètic)

> **Cap ONG pot quedar atrapada dins Summa Social.**

Per tant:

✅ Exportació completa sempre disponible (Excel/CSV)  
✅ Backup extern assistit (setmanal a Drive de l'ONG)  
✅ Procés de sortida executable i conegut  
✅ Cost de sortida: 0 €

**Sortida voluntària:**
* Notificació recomanada: 30 dies
* Però efectiva immediatament si l'ONG ho desitja
* Exportació + documentació lliurada en 7 dies

**Dades:**
* Retenció: 90 dies per defecte
* **Excepte obligacions legals** (factures, auditories, etc.)
* **O instrucció explícita del client** (esborrat immediat o conservació ampliada)

---

## 8. Qualificació d'ONGs

Només s'accepten ONGs que compleixin:

* Pressupost anual < 300.000 €
* Disposició a col·laborar en millores
* Acceptació de condicions de servei
* Acceptació de limitacions funcionals i d'abast

**Si l'ONG creix:**
* Fins a 500.000 €: avaluació cas per cas
* Per sobre de 500.000 €: migració obligatòria a solució més robusta

---

## 9. Posicionament davant tercers

Quan es qüestiona la viabilitat del projecte:

> *"Summa Social no és una app pública.*  
> *És consultoria amb software custom.*  
> *Accés manual, creixement limitat (10–15 ONGs màx), risc gestionat amb:*
> - *Procés d'onboarding acompanyat*
> - *Validacions professionals externes*
> - *Protocol d'emergència amb exportació garantida*
> 
> *Les entitats ho saben, ho accepten i treballen acompanyades."*

Si això no s'entén, no és un debat tècnic, sinó de model mental.

---

## 10. Revisió d'aquest document

**Freqüència obligatòria:**
* Cada 6 mesos (revisió ordinària)
* Després de cada error crític
* Abans d'entrar a nova fase

**Responsable:** Raül

**Versionat:**
* Versió actual: 2.1
* Canvis menors: +0.1
* Canvis estructurals: +1.0

---

## 11. Documents operatius vinculats

Aquest Charter es complementa amb:

**Documents interns:**
1. **Onboarding Playbook**  
   *(Procés detallat de migració i formació)*

2. **Data Exit Plan**  
   *(Procediment tècnic d'exportació i sortida)*

**Documents contractuals:**
3. **Service Agreement Template**  
   *(Contracte amb ONGs)*

Aquests documents són **executius**, no normatius.  
El Charter prevaleix en cas de conflicte.

---

## 12. Compromís final

Aquest document:

* És vinculant mentre Summa Social existeixi
* Només es pot incomplir per força major documentada i comunicada a totes les ONGs

**Excepcions requereixen:**
* Notificació prèvia
* Justificació
* Pla d'acció

---

**Estat:** aprovat  
**Responsable:** Raül  
**Versió:** 2.1  
**Data:** 2026-01-04  

---

**FI DEL CHARTER**
