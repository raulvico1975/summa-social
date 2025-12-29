# Summa Social: Gestió Financera per a Entitats Socials

## Objectiu Principal

L'objectiu de Summa Social és **simplificar i revolucionar la gestió financera i administrativa de petites i mitjanes entitats socials**. L'aplicació busca substituir els complexos fulls de càlcul per una eina intuïtiva, intel·ligent i centralitzada, dissenyada específicament per a les necessitats úniques del sector social.

## Públic Objectiu

Està dirigida a **gestors, administradors i tresorers d'entitats socials**, que necessiten una visió clara de les seves finances per a la presa de decisions, la justificació a finançadors i el compliment de les obligacions fiscals, però que no sempre disposen de recursos per a programari de gestió car i complex.

---

## Funcionalitats Desenvolupades

A continuació es detalla l'estat de desenvolupament actual de l'aplicació:

### 1. Gestió de Moviments Centralitzada
- **Importació d'Extractes Bancaris:** Permet importar fàcilment extractes en formats `.csv` i `.xlsx`. El sistema detecta automàticament les columnes de data, concepte i import.
- **Taula de Moviments Interactiva:** Visualització de totes les transaccions, amb la capacitat d'editar-les, eliminar-les i adjuntar-hi documents (comprovants, factures) mitjançant Firebase Storage.
- **Prevenció de Duplicats:** En importar nous moviments, el sistema detecta i omet automàticament aquells que ja existeixen.

### 2. Intel·ligència Artificial per a l'Automatització
- **Auto-Categorització Intel·ligent:** Utilitza un model de GenAI (Genkit) per suggerir automàticament la categoria de despesa o ingrés més adequada per a cada moviment, amb un botó per classificar tots els moviments pendents en un sol clic.
- **Assignació Automàtica d'Emissors:** La IA analitza la descripció dels moviments per identificar i vincular automàticament el donant, proveïdor o soci corresponent des de la base de dades de contactes.

### 3. Visió Financera Estratègica (Panell de Control)
- **Mètriques Clares:** Ofereix targetes amb indicadors clau: Ingressos Totals, Despeses Operatives i Balance Operatiu (`Ingressos - Despeses Operatives`).
- **Separació de Fons de Missió:** Distingeix clarament les "Transferencias a terreno o socias" de les despeses operatives. Mostra de forma agregada el total de fons enviats a missió en una targeta pròpia.
- **Gràfic de Despeses:** Visualització intuïtiva de les despeses operatives per categoria, excloent les transferències a terreny.

### 4. Comptabilitat per Projectes (Gestió de Fons Finalistes)
- **Creació i Gestió de Projectes:** Permet donar d'alta projectes específics vinculats a un finançador.
- **Traçabilitat de Fons:** Els usuaris poden assignar ingressos i despeses a cada projecte des de la taula de moviments.
- **Balanç per Projecte:** Cada projecte té el seu propi panell de control amb mètriques clau:
  - **Total Finançat:** Ingressos rebuts per al projecte.
  - **Total Enviat a Terreny:** Sortides de diners cap a socis locals.
  - **Despeses a Espanya:** Despeses operatives assignades al projecte.
  - **Saldo Pendent:** El càlcul precís dels fons restants (`Finançat - Enviat - Despeses`).

### 5. Gestió de Donacions i Obligacions Fiscals (Model 182)
- **Central de Contactes/Emissors:** Permet gestionar una base de dades de donants, proveïdors i voluntaris amb les seves dades fiscals (DNI/CIF, codi postal).
- **Generador d'Informes de Donacions:** Una secció dedicada a generar l'informe anual de donacions. L'usuari selecciona l'any i el sistema agrega automàticament el total donat per cada persona física o jurídica.
- **Exportació a CSV:** Amb un sol clic, s'exporta un fitxer CSV llest per ser utilitzat a la declaració del Model 182 a l'Agència Tributària.
- **Assistent per a Dividir Remeses:** Una eina que soluciona el problema dels ingressos bancaris agrupats. Permet a l'usuari pujar un arxiu CSV amb el detall d'una remesa i l'assistent:
    1. Desglossa automàticament l'ingrés agrupat en moviments individuals.
    2. Assigna cada donació al seu soci corresponent mitjançant una cerca intel·ligent per DNI/CIF (prioritari) o per nom (utilitzant normalització per evitar errors amb accents o majúscules).
    3. Informa a través d'un log de diagnòstic de totes les accions realitzades.
