# Protocol de Treball amb Claude Code

> Guia pràctica per treballar de forma segura i eficaç amb Claude Code al projecte Summa Social.
> Pensada per a usuaris no programadors.

---

## Taula de Continguts

1. [Objectiu del Document](#1-objectiu-del-document)
2. [Flux de Treball Recomanat](#2-flux-de-treball-recomanat)
3. [Normes Obligatòries per Claude](#3-normes-obligatòries-per-claude)
4. [Rails de Seguretat](#4-rails-de-seguretat)
5. [Com Demanar Noves Funcionalitats](#5-com-demanar-noves-funcionalitats)
6. [Errors Comuns i Com Evitar-los](#6-errors-comuns-i-com-evitar-los)
7. [Apèndix: Prompts Útils](#7-apèndix-prompts-útils)

---

## 1. Objectiu del Document

Aquest document estableix un **protocol de treball segur** per col·laborar amb Claude Code en el desenvolupament de Summa Social.

### Per què és necessari?

- **Ets el responsable final** de tot el codi que entra al projecte
- Claude és molt potent però pot fer canvis massa grans o innecessaris si no se'l guia
- Un protocol clar evita errors, regressions i pèrdua de temps

### Principis fonamentals

| Principi | Descripció |
|----------|------------|
| **Iteracions petites** | Mai canvis massius. Sempre pas a pas. |
| **Entendre abans d'acceptar** | No acceptis cap canvi que no entenguis. |
| **Verificar sempre** | Comprova que l'app funciona després de cada canvi. |
| **Tu decideixes** | Claude proposa, tu aproveis. Mai al revés. |

---

## 2. Flux de Treball Recomanat

### 2.1 Diagnòstic Inicial

Abans de demanar canvis, assegura't que Claude entén el context:

```
Abans de fer res, analitza:
1. L'estructura actual del component/fitxer X
2. Com s'utilitza a l'aplicació
3. Quines dependències té

No facis cap canvi encara, només explica'm què has trobat.
```

**Per què?** Això evita que Claude faci suposicions incorrectes.

### 2.2 Com Demanar Canvis

#### Bones peticions

```
Vull afegir un botó "Exportar a Excel" a la taula de donants.
El botó ha d'estar al costat del botó "Afegir donant" existent.
```

```
Hi ha un bug: quan importo un CSV amb dates en format DD/MM/YYYY,
les dates es mostren malament. Necessito que detecti aquest format.
```

#### Peticions problemàtiques

```
Millora el codi del projecte.
```
*Massa vague. Claude podria tocar massa coses.*

```
Refactoritza tot el sistema de donants.
```
*Massa gran. Demana un pla primer.*

### 2.3 Com Validar els Diffs

Quan Claude et mostri un diff (canvis proposats), revisa:

| Comprova | Pregunta't |
|----------|-----------|
| **Línies eliminades** | Entenc per què s'eliminen? Són realment innecessàries? |
| **Línies afegides** | Fan el que he demanat i res més? |
| **Fitxers tocats** | Són els que esperava? N'hi ha algun inesperat? |
| **Mida del canvi** | És proporcional a la petició? |

**Senyal d'alarma:** Si el diff és molt més gran del que esperaves, para i pregunta:

```
Aquest canvi sembla molt gran per al que he demanat.
Pots explicar-me per què has tocat tantes línies?
```

### 2.4 Quan Acceptar i Quan Rebutjar

#### Accepta quan:

- Entens cada línia del canvi
- El canvi fa exactament el que has demanat
- No hi ha canvis "extres" no sol·licitats
- Has verificat que l'app funciona

#### Rebutja o demana revisió quan:

- Hi ha canvis que no entens
- S'han tocat fitxers que no esperaves
- El canvi inclou "millores" no demanades
- Algo et fa mala espina (confia en la teva intuïció)

**Com rebutjar:**

```
No accepto aquest canvi perquè:
1. Has tocat el fitxer X que no t'havia demanat
2. No entenc per què has eliminat la línia Y

Torna a fer-ho tocant només el que t'he demanat.
```

### 2.5 Iteracions Petites i Segures

**Regla d'or:** Un canvi = Una cosa

| En lloc de... | Fes... |
|---------------|--------|
| "Afegeix exportació i millora el filtre i corregeix el bug de dates" | Tres peticions separades, una per cada cosa |
| "Implementa tot el sistema de notificacions" | "Primer, mostra'm un pla. Després implementem pas a pas" |

**Seqüència recomanada:**

```
1. Demana ’ Claude proposa ’ Revises ’ Acceptes/Rebutges
2. Comproves que funciona
3. Següent petició
```

---

## 3. Normes Obligatòries per Claude

Copia i enganxa això a l'inici de sessions de treball importants:

```
NORMES PER AQUESTA SESSIÓ:

1. EXPLICA ABANS DE MODIFICAR
   - Abans de tocar cap fitxer, explica'm què faràs i per què
   - Espera la meva aprovació abans de fer canvis

2. UN MÒDUL A LA VEGADA
   - No toquis múltiples components en un sol canvi
   - Si cal tocar més d'un fitxer, fes-ho en passos separats

3. MOSTRA SEMPRE ELS DIFFS
   - Mai facis canvis sense mostrar-me exactament què canvies
   - Mostra el diff complet, no un resum

4. NO AFEGEIXIS DEPENDÈNCIES
   - No instal·lis paquets nous sense demanar permís primer
   - Si creus que cal una dependència nova, explica per què

5. NO FACIS REFACTORS NO SOL·LICITATS
   - No "milloris" codi que no t'he demanat tocar
   - No canviïs estils, noms de variables o estructura sense permís

6. PRESERVA L'ESTIL EXISTENT
   - Segueix les convencions del codi actual
   - No introdueixis patrons nous sense discussió prèvia
```

### Explicació de cada norma

#### 1. Explica abans de modificar

**Per què:** Evita sorpreses. Si Claude t'explica el pla abans, pots corregir malentesos.

**Exemple bo:**
```
Claude: "Per afegir el botó d'exportació, modificaré el fitxer
donor-manager.tsx. Afegiré un botó al costat de 'Afegir donant'
que cridarà una funció exportToExcel(). Vols que procedeixi?"
```

#### 2. Un mòdul a la vegada

**Per què:** Canvis petits són més fàcils de revisar i revertir si cal.

**Mal exemple:** Tocar `donor-manager.tsx`, `transactions-table.tsx` i `utils.ts` en un sol canvi.

**Bon exemple:** Primer `donor-manager.tsx`, verificar, després el següent.

#### 3. Mostra sempre els diffs

**Per què:** Els diffs són la teva eina de verificació. Sense ells, no pots saber què canvia.

#### 4. No afegeixis dependències

**Per què:** Cada dependència nova és:
- Més pes al projecte
- Potencial problema de seguretat
- Més coses a mantenir

Pregunta sempre: "Es pot fer sense afegir paquets?"

#### 5. No facis refactors no sol·licitats

**Per què:** Claude té tendència a "millorar" codi mentre fa altres coses. Això:
- Fa els diffs més difícils de revisar
- Pot introduir bugs
- Canvia coses que funcionaven bé

#### 6. Preserva l'estil existent

**Per què:** Consistència. El codi ha de semblar escrit per una sola persona.

---

## 4. Rails de Seguretat

### 4.1 Verificació de Tipus (TypeScript)

**Abans d'acceptar canvis grans, executa:**

```bash
npm run build
```

o si tens configurat typecheck:

```bash
npx tsc --noEmit
```

**Què et diu:**
- Si hi ha errors de tipus (variables mal usades, paràmetres incorrectes)
- Si el codi compilarà correctament

**Com demanar-ho a Claude:**

```
Abans d'acceptar els canvis, executa npm run build
i mostra'm si hi ha errors.
```

### 4.2 Comprovació que l'App Funciona

**Després de cada canvi significatiu:**

1. Obre l'aplicació al navegador
2. Navega a la secció afectada
3. Prova la funcionalitat canviada
4. Comprova que no s'han trencat altres coses

**Checklist ràpid:**

```
[ ] L'app arrenca sense errors a la consola?
[ ] La pàgina afectada carrega correctament?
[ ] La funcionalitat nova funciona?
[ ] Les funcionalitats existents segueixen funcionant?
```

### 4.3 Exploració de Components

**Per entendre un component abans de modificar-lo:**

```
Mostra'm l'estructura del component DonorManager:
- Quins props rep?
- Quins hooks utilitza?
- Quines funcions principals té?
- Amb quins altres components interactua?
```

### 4.4 Git com a Xarxa de Seguretat

**Abans de canvis importants:**

```
Fes un commit amb els canvis actuals abans de continuar,
amb el missatge: "WIP: abans de [descripció del canvi]"
```

**Si alguna cosa va malament:**

```
Reverteix l'últim canvi amb git.
```

---

## 5. Com Demanar Noves Funcionalitats

### 5.1 Pas 1: Demana un Pla

**Mai demanis directament "implementa X".** Primer:

```
Vull afegir [funcionalitat].

Abans de codificar res:
1. Explica'm com ho implementaries
2. Quins fitxers caldria tocar?
3. Quins són els riscos o complicacions?
4. Hi ha alternatives més simples?

No facis cap canvi fins que aprovi el pla.
```

### 5.2 Pas 2: Revisa el Pla

Quan Claude et doni el pla, pregunta't:

| Pregunta | Per què |
|----------|---------|
| El pla és proporcional a la funcionalitat? | Evitar sobre-enginyeria |
| Entenc cada pas? | Has de poder explicar-ho |
| Toca masses fitxers? | Potser es pot simplificar |
| Afegeix dependències? | Potser es pot evitar |

### 5.3 Pas 3: Implementació Incremental

Un cop aprovat el pla:

```
D'acord amb el pla. Implementa NOMÉS el pas 1.
Mostra'm el diff i espera la meva aprovació abans del pas 2.
```

### 5.4 Exemple Complet

**Tu:**
```
Vull que els usuaris puguin exportar la llista de donants a Excel.

Abans de codificar:
1. Com ho faries?
2. Quins fitxers tocaràs?
3. Cal alguna dependència nova?
```

**Claude:**
```
Proposta per exportació a Excel:

1. Utilitzaré la llibreria xlsx que ja teniu instal·lada
2. Fitxers a tocar:
   - src/components/donor-manager.tsx (afegir botó)
   - src/lib/utils.ts (funció d'exportació)
3. No cal cap dependència nova

Passos:
1. Crear funció exportDonorsToExcel a utils.ts
2. Afegir botó a donor-manager.tsx
3. Connectar botó amb funció

Vols que procedeixi amb el pas 1?
```

**Tu:**
```
D'acord. Fes el pas 1, mostra'm el diff.
```

---

## 6. Errors Comuns i Com Evitar-los

### 6.1 Mutacions Massa Grans

**Símptoma:** Claude proposa canvis de +200 línies per una petició simple.

**Causa:** No has acotat prou la petició o Claude ha decidit "millorar" coses.

**Solució:**
```
STOP. Aquest canvi és massa gran.

Divideix-lo en parts més petites.
Comença només amb [la part més essencial].
```

### 6.2 Reescriptures Sense Revisió

**Símptoma:** Claude reescriu un fitxer sencer en lloc d'editar-lo.

**Causa:** A vegades és més fàcil per Claude reescriure que editar quirúrgicament.

**Solució:**
```
No reescriguis el fitxer sencer.
Mostra'm només les línies que canvies, amb context.
Utilitza edicions mínimes.
```

### 6.3 Canvis Silenciosos

**Símptoma:** Descobreixes canvis que no havies demanat.

**Causa:** Claude ha "aprofitat" per fer millores o correccions.

**Solució:**
```
Veig que has canviat [X] que no t'havia demanat.
Reverteix això i fes NOMÉS el que t'he demanat.
```

### 6.4 Dependències Innecessàries

**Símptoma:** Claude vol instal·lar un paquet per fer algo simple.

**Causa:** Els LLMs tendeixen a conèixer moltes llibreries i suggerir-les.

**Solució:**
```
Abans d'afegir una dependència nova, mostra'm com fer-ho
amb les eines que ja tenim (xlsx, date-fns, etc.) o amb JavaScript pur.
```

### 6.5 Pèrdua de Funcionalitat

**Símptoma:** Després d'un canvi, algo que funcionava ja no funciona.

**Causa:** Efectes secundaris no previstos.

**Solució:**
1. Reverteix el canvi (`git checkout -- fitxer.tsx`)
2. Demana a Claude que analitzi per què ha passat
3. Fes el canvi de nou amb més cura

### 6.6 Inconsistència d'Estil

**Símptoma:** El codi nou sembla "diferent" del codi existent.

**Causa:** Claude pot usar convencions diferents.

**Solució:**
```
Adapta l'estil del codi nou a l'estil existent:
- Usa els mateixos patrons de noms
- Segueix la mateixa estructura
- Usa les mateixes convencions de formatació
```

---

## 7. Apèndix: Prompts Útils

### 7.1 Inici de Sessió

```
Avui treballarem a Summa Social. Recorda:
- Explica abans de modificar
- Un fitxer a la vegada
- Mostra sempre diffs complets
- No afegeixis dependències sense permís
- No facis canvis no sol·licitats
```

### 7.2 Anàlisi Prèvia

```
Abans de fer cap canvi, analitza el fitxer [X]:
- Estructura general
- Funcions principals
- Dependències
- Punts de risc si el modifiquem

No modifiquis res encara.
```

### 7.3 Petició de Canvi Simple

```
Vull [descripció del canvi].

Passos:
1. Mostra'm què canviaràs (diff)
2. Espera la meva aprovació
3. Fes el canvi

No toquis res més.
```

### 7.4 Petició de Funcionalitat Nova

```
Vull implementar [funcionalitat].

Abans de codificar:
1. Proposa un pla d'implementació
2. Llista els fitxers que caldrà tocar
3. Identifica riscos o complicacions
4. Digues si cal alguna dependència nova

Espera la meva aprovació del pla.
```

### 7.5 Diagnòstic d'Error

```
Tinc aquest error: [error]

Sense fer cap canvi:
1. Explica per què passa
2. Proposa solucions
3. Indica quina solució recomanaries i per què

Espera la meva aprovació abans d'implementar res.
```

### 7.6 Revisió de Codi

```
Revisa el codi de [fitxer/funció]:
- Hi ha bugs potencials?
- Hi ha problemes de rendiment?
- Es pot simplificar?

No facis canvis, només informa'm.
```

### 7.7 Verificació Post-Canvi

```
Executa aquestes comprovacions:
1. npm run build - hi ha errors?
2. Mostra'm un resum del que s'ha canviat
3. Confirma que no s'han tocat altres fitxers
```

### 7.8 Revertir Canvis

```
El canvi anterior ha causat problemes.
Reverteix-lo completament i torna a l'estat anterior.
```

### 7.9 Demanar Explicació

```
No entenc per què has fet [X].
Explica'm pas a pas el raonament.
```

### 7.10 Limitar Abast

```
IMPORTANT: Per aquest canvi, NOMÉS pots tocar:
- [fitxer1.tsx]
- [fitxer2.ts]

No toquis cap altre fitxer per cap motiu.
```

---

## Resum Executiu

### Les 5 Regles d'Or

1. **Mai acceptis el que no entens**
2. **Canvis petits, verificacions freqüents**
3. **Claude proposa, tu aproveis**
4. **En cas de dubte, para i pregunta**
5. **Git és la teva xarxa de seguretat**

### Checklist Ràpid

Abans d'acceptar qualsevol canvi:

```
[ ] Entenc què fa el canvi?
[ ] El canvi fa NOMÉS el que he demanat?
[ ] No s'han tocat fitxers inesperats?
[ ] No s'han afegit dependències noves?
[ ] El diff és proporcional a la petició?
[ ] He verificat que l'app funciona?
```

### Quan Parar i Demanar Ajuda

- El canvi és massa gran o complex
- No entens el que Claude proposa
- L'app deixa de funcionar
- Tens un mal pressentiment

**Recordar:** És millor anar lent i segur que ràpid i amb errors.

---

*Document creat: Desembre 2024*
*Projecte: Summa Social*
