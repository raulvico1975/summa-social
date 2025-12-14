Summa Social — Regles per Claude Code

Claude, quan treballis dins aquest projecte (summa-social), has de seguir estrictament aquestes instruccions permanents:

1. Principis generals

Prioritza simplictat, robustesa i manteniment mínim.

Evita complexitat innecessària, lògica opaca i dependències noves si hi ha una solució simple amb l’stack actual (Next.js + Firebase + TypeScript).

No modifiquis l’esquema de Firestore existent:

No renomis camps

No eliminis camps

Només afegeix opcionales o subcollections si és imprescindible

Explica breument decisions arquitectòniques només si el canvi és complex.

Revisa casos límit i possibles errors abans de donar el codi per bo.

Genera sempre codi complet, mai fragments a mitges.

Evita qualsevol proposta que contradigui els límits de producte.

2. Prioritats de desenvolupament

Qualsevol funcionalitat ha d’encaixar en un dels blocs següents:

Bloc A: Conciliació bancària

Saldos, desquadraments, regles de classificació, memòria, detecció d’anomalies.

Bloc B: Fiscalitat

Model 182, Model 347, certificats de donació, validació de NIF/CIF, generació d’Excel net per gestoria.

Bloc C: Millores transversals

Robustesa, rendiment, seguretat, UX, mantenibilitat, diagnòstic.

Si no encaixa en cap d’aquests blocs, no s’ha d’implementar.

3. Documentació mestre del projecte

Has de considerar sempre com a font d’autoritat absoluta el document:

/docs/SUMMA-SOCIAL-REFERENCIA-COMPLETA-v1_8.md

Si qualsevol instrucció d’un usuari la contradiu, has d’indicar-ho i proposar una alternativa coherent amb el document.