/**
 * Script per afegir les traduccions de guies als JSON locals
 *
 * Execució: npx tsx scripts/i18n/add-guides-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Schema estable de guies - tots els camps són opcionals excepte title i intro
// Cada guia pot tenir un dels dos formats:
// 1. Format checklist: lookFirst, doNext, avoid
// 2. Format expert: notResolved, costlyError, checkBeforeExport, dontFixYet
// 3. Format steps: steps (array numerat)

const GUIDES_CA = {
  // Page-level
  "guides.pageTitle": "Guies curtes",
  "guides.pageSubtitle": "Aprèn a fer servir cada pantalla en 2 minuts. Per a més detall, consulta el manual.",
  "guides.viewManual": "Veure al manual",
  "guides.viewHelp": "Veure ajuda detallada",
  "guides.recommendedOrder": "Ordre recomanat",

  // Labels
  "guides.labels.lookFirst": "Mira això primer",
  "guides.labels.doNext": "Fes això després",
  "guides.labels.avoid": "Evita això",
  "guides.labels.notResolved": "Quan NO està \"a punt\"",
  "guides.labels.costlyError": "L'error més car",
  "guides.labels.checkBeforeExport": "Les 3 comprovacions abans d'exportar",
  "guides.labels.dontFixYet": "Quan NO tocar res",

  // CTA per pantalla
  "guides.cta.movements": "Anar a Moviments",
  "guides.cta.returns": "Anar a Moviments",
  "guides.cta.remittances": "Anar a Moviments",
  "guides.cta.donors": "Anar a Donants",
  "guides.cta.reports": "Anar a Informes",
  "guides.cta.projects": "Anar a Projectes",
  "guides.cta.monthlyFlow": "Anar a Moviments",
  "guides.cta.yearEndFiscal": "Anar a Informes",
  "guides.cta.accessSecurity": "Anar al Dashboard",
  "guides.cta.initialLoad": "Anar a Moviments",

  // === GUIES INDIVIDUALS ===

  // movements
  "guides.movements.title": "Moviments · Control diari",
  "guides.movements.intro": "Centre de control del dia a dia: aquí veus què entra i surt i detectes pendents abans que es facin grans.",
  "guides.movements.lookFirst.0": "Moviments sense contacte",
  "guides.movements.lookFirst.1": "Moviments sense categoria",
  "guides.movements.lookFirst.2": "Devolucions pendents",
  "guides.movements.doNext.0": "Assigna contacte → categoria (en aquest ordre)",
  "guides.movements.doNext.1": "Divideix remeses abans de seguir",
  "guides.movements.avoid.0": "Forçar assignacions \"per deixar-ho net\"",
  "guides.movements.avoid.1": "Ignorar devolucions abans d'informes",

  // returns
  "guides.returns.title": "Devolucions · Control fiscal",
  "guides.returns.intro": "Una devolució només resta fiscalment si està assignada al donant correcte. Sense donant, no resta res.",
  "guides.returns.notResolved.0": "Import negatiu sense donant",
  "guides.returns.notResolved.1": "Donant equivocat",
  "guides.returns.notResolved.2": "Remesa tocada només al pare",
  "guides.returns.costlyError": "Assignar la devolució al pare de la remesa. El pare no compta fiscalment; el donant va a les línies filles.",
  "guides.returns.checkBeforeExport.0": "Cap devolució pendent",
  "guides.returns.checkBeforeExport.1": "Devolucions amb donant assignat",
  "guides.returns.checkBeforeExport.2": "Donants amb totals \"estranys\" revisats",
  "guides.returns.dontFixYet.0": "No tens clar el donant",
  "guides.returns.dontFixYet.1": "Estàs en control diari, no en tancament",
  "guides.returns.dontFixYet.2": "Falta info externa (banc/gestoria)",

  // remittances
  "guides.remittances.title": "Remeses · Processar i validar",
  "guides.remittances.intro": "La remesa no és el detall. El detall són les filles.",
  "guides.remittances.lookFirst.0": "Pare: import gran amb concepte remesa/Stripe",
  "guides.remittances.lookFirst.1": "Filles: creades i suma coherent amb el pare",
  "guides.remittances.lookFirst.2": "Filles amb donant assignat (resol pendents)",
  "guides.remittances.doNext.0": "Divideix (banc) o Divideix Stripe (Stripe)",
  "guides.remittances.doNext.1": "Marca \"fet\" quan no queden pendents",
  "guides.remittances.avoid.0": "Assignar contacte/categoria al pare com si fos una quota",
  "guides.remittances.avoid.1": "Exportar 182/certificats amb filles pendents",

  // donors
  "guides.donors.title": "Donants · Model 182 (sense errors)",
  "guides.donors.intro": "El Model 182 falla per dues coses: DNI/CP incomplets o devolucions mal resoltes. La resta és secundària.",
  "guides.donors.notResolved.0": "Falta DNI/CIF o Codi Postal",
  "guides.donors.notResolved.1": "Hi ha duplicats (mateix DNI en dues fitxes)",
  "guides.donors.notResolved.2": "Total anual \"fa olor\" per devolucions pendents",
  "guides.donors.costlyError": "Generar 182 o certificats massius sense revisar 2–3 donants representatius. Després no saps on està el problema.",
  "guides.donors.checkBeforeExport.0": "Donants amb DNI/CP complets",
  "guides.donors.checkBeforeExport.1": "Duplicats resolts (1 DNI = 1 donant)",
  "guides.donors.checkBeforeExport.2": "Donants \"estranys\" revisats (import net i devolucions)",
  "guides.donors.dontFixYet.0": "Si no tens les dades fiscals: espera i demana-les",
  "guides.donors.dontFixYet.1": "Si estàs en control diari: no cal \"perfeccionar\" fitxes",

  // reports
  "guides.reports.title": "Informes · Fiscalitat neta",
  "guides.reports.intro": "L'informe no és el problema. El problema és la dada que hi entra. Si està bruta, l'Excel també ho estarà.",
  "guides.reports.notResolved.0": "Donants amb DNI/CP incomplets",
  "guides.reports.notResolved.1": "Devolucions sense donant assignat",
  "guides.reports.notResolved.2": "Moviments recents sense categoritzar",
  "guides.reports.costlyError": "Enviar l'Excel a la gestoria sense obrir-lo. Després et truquen amb 50 errors i no saps per on començar.",
  "guides.reports.checkBeforeExport.0": "Alertes de donants resoltes",
  "guides.reports.checkBeforeExport.1": "Devolucions totes assignades",
  "guides.reports.checkBeforeExport.2": "Totals coherents amb el que esperes",
  "guides.reports.dontFixYet.0": "Si falten dades fiscals: espera-les abans d'exportar",
  "guides.reports.dontFixYet.1": "Si no és tancament: no cal generar res",

  // projects
  "guides.projects.title": "Projectes · Justificació sense sorpreses",
  "guides.projects.intro": "El desquadrament no es descobreix al final. Es detecta assignant despeses a partides amb criteri.",
  "guides.projects.notResolved.0": "Despeses sense partida assignada",
  "guides.projects.notResolved.1": "Partida amb import assignat > pressupost",
  "guides.projects.notResolved.2": "Moviments del projecte sense categoritzar",
  "guides.projects.costlyError": "Assignar despeses massivament sense revisar. Després no saps quina despesa ha desquadrat la partida.",
  "guides.projects.checkBeforeExport.0": "Totes les despeses del projecte assignades",
  "guides.projects.checkBeforeExport.1": "Cap partida amb desviació crítica",
  "guides.projects.checkBeforeExport.2": "Documents adjunts complets",
  "guides.projects.dontFixYet.0": "Si el projecte encara té despeses pendents d'entrar",
  "guides.projects.dontFixYet.1": "Si estàs en fase d'execució, no de justificació",

  // monthlyFlow
  "guides.monthlyFlow.title": "Flux mensual · Importar i deixar net",
  "guides.monthlyFlow.intro": "Checklist per passar l'extracte del banc i deixar Moviments en estat operatiu.",
  "guides.monthlyFlow.steps.0": "Descarrega extracte del banc (CSV/XLSX) i puja'l a Moviments.",
  "guides.monthlyFlow.steps.1": "Revisa previsualització (dates, imports, descripcions) i importa.",
  "guides.monthlyFlow.steps.2": "Filtra: Sense contacte → resol.",
  "guides.monthlyFlow.steps.3": "Filtra: Sense categoria → resol.",
  "guides.monthlyFlow.steps.4": "Revisa: Devolucions pendents i Remeses (divideix si cal).",
  "guides.monthlyFlow.steps.5": "Revisió final: mostra 10 moviments aleatoris i valida coherència.",

  // yearEndFiscal
  "guides.yearEndFiscal.title": "Tancament anual · 182/347/certificats",
  "guides.yearEndFiscal.intro": "Checklist per preparar els exports per gestoria sense correccions d'última hora.",
  "guides.yearEndFiscal.steps.0": "A Donants: completa DNI/CIF i Codi Postal dels que tinguin alertes.",
  "guides.yearEndFiscal.steps.1": "A Moviments: comprova que no hi ha devolucions pendents.",
  "guides.yearEndFiscal.steps.2": "A Informes: genera Model 182.",
  "guides.yearEndFiscal.steps.3": "A Proveïdors: verifica CIF i genera Model 347.",
  "guides.yearEndFiscal.steps.4": "A Informes: genera certificats (individuals o lot).",
  "guides.yearEndFiscal.steps.5": "Arxiva exports i fixa la versió enviada a gestoria.",

  // accessSecurity
  "guides.accessSecurity.title": "Accés i seguretat · Sessió i organització",
  "guides.accessSecurity.intro": "Com entrar, què passa amb la redirecció i què fer si la sessió caduca.",
  "guides.accessSecurity.steps.0": "Login global → redirecció automàtica a la teva organització.",
  "guides.accessSecurity.steps.1": "Si tens diverses orgs: selecciona l'org correcta abans de treballar.",
  "guides.accessSecurity.steps.2": "Logout per inactivitat: si et treu, torna a entrar (reason=idle).",
  "guides.accessSecurity.steps.3": "Rols: edició només si cal; lectura per consultes.",
  "guides.accessSecurity.steps.4": "Ordinador compartit: tanca sessió sempre.",

  // initialLoad
  "guides.initialLoad.title": "Càrrega inicial · Primer mes",
  "guides.initialLoad.intro": "Objectiu: deixar Moviments + Contactes preparats perquè el control diari i els informes surtin nets.",
  "guides.initialLoad.steps.0": "Configura l'entitat (CIF, adreça, logo, signatura) a Configuració.",
  "guides.initialLoad.steps.1": "Importa donants/proveïdors/treballadors (si tens fitxers) i completa DNI/CP/CIF mínims.",
  "guides.initialLoad.steps.2": "Importa l'extracte del mes a Moviments (CSV/XLSX) i revisa la previsualització.",
  "guides.initialLoad.steps.3": "Neteja pendents en aquest ordre: Sense contacte → Sense categoria → Devolucions pendents.",
  "guides.initialLoad.steps.4": "Detecta remeses/Stripe i divideix-les abans de seguir assignant.",
  "guides.initialLoad.steps.5": "Revisió final: mostra 10 moviments aleatoris i valida coherència (contacte + categoria).",
  "guides.initialLoad.avoid.0": "No comencis per projectes o informes: primer neteja Moviments i Contactes.",
  "guides.initialLoad.avoid.1": "No \"forcis\" categories per tancar: deixa pendents conscients.",
};

const GUIDES_ES = {
  // Page-level
  "guides.pageTitle": "Guías cortas",
  "guides.pageSubtitle": "Aprende a usar cada pantalla en 2 minutos. Para más detalle, consulta el manual.",
  "guides.viewManual": "Ver en el manual",
  "guides.viewHelp": "Ver ayuda detallada",
  "guides.recommendedOrder": "Orden recomendado",

  // Labels
  "guides.labels.lookFirst": "Mira esto primero",
  "guides.labels.doNext": "Haz esto después",
  "guides.labels.avoid": "Evita esto",
  "guides.labels.notResolved": "Cuándo NO está \"listo\"",
  "guides.labels.costlyError": "El error más caro",
  "guides.labels.checkBeforeExport": "Las 3 comprobaciones antes de exportar",
  "guides.labels.dontFixYet": "Cuándo NO tocar nada",

  // CTA per pantalla
  "guides.cta.movements": "Ir a Movimientos",
  "guides.cta.returns": "Ir a Movimientos",
  "guides.cta.remittances": "Ir a Movimientos",
  "guides.cta.donors": "Ir a Donantes",
  "guides.cta.reports": "Ir a Informes",
  "guides.cta.projects": "Ir a Proyectos",
  "guides.cta.monthlyFlow": "Ir a Movimientos",
  "guides.cta.yearEndFiscal": "Ir a Informes",
  "guides.cta.accessSecurity": "Ir al Dashboard",
  "guides.cta.initialLoad": "Ir a Movimientos",

  // === GUIES INDIVIDUALS ===

  // movements
  "guides.movements.title": "Movimientos · Control diario",
  "guides.movements.intro": "Centro de control del día a día: aquí ves lo que entra y sale y detectas pendientes antes de que crezcan.",
  "guides.movements.lookFirst.0": "Movimientos sin contacto",
  "guides.movements.lookFirst.1": "Movimientos sin categoría",
  "guides.movements.lookFirst.2": "Devoluciones pendientes",
  "guides.movements.doNext.0": "Asigna contacto → categoría (en este orden)",
  "guides.movements.doNext.1": "Divide remesas antes de seguir",
  "guides.movements.avoid.0": "Forzar asignaciones \"para dejarlo limpio\"",
  "guides.movements.avoid.1": "Ignorar devoluciones antes de informes",

  // returns
  "guides.returns.title": "Devoluciones · Control fiscal",
  "guides.returns.intro": "Una devolución solo resta fiscalmente si está asignada al donante correcto. Sin donante, no resta nada.",
  "guides.returns.notResolved.0": "Importe negativo sin donante",
  "guides.returns.notResolved.1": "Donante equivocado",
  "guides.returns.notResolved.2": "Remesa tocada solo en el padre",
  "guides.returns.costlyError": "Asignar la devolución al padre de la remesa. El padre no cuenta fiscalmente; el donante va en las líneas hijas.",
  "guides.returns.checkBeforeExport.0": "Ninguna devolución pendiente",
  "guides.returns.checkBeforeExport.1": "Devoluciones con donante asignado",
  "guides.returns.checkBeforeExport.2": "Donantes con totales \"raros\" revisados",
  "guides.returns.dontFixYet.0": "No está claro el donante",
  "guides.returns.dontFixYet.1": "Estás en control diario, no en cierre",
  "guides.returns.dontFixYet.2": "Falta info externa (banco/gestoría)",

  // remittances
  "guides.remittances.title": "Remesas · Procesar y validar",
  "guides.remittances.intro": "La remesa no es el detalle. El detalle son las hijas.",
  "guides.remittances.lookFirst.0": "Padre: importe grande con concepto remesa/Stripe",
  "guides.remittances.lookFirst.1": "Hijas: creadas y suma coherente con el padre",
  "guides.remittances.lookFirst.2": "Hijas con donante asignado (resuelve pendientes)",
  "guides.remittances.doNext.0": "Divide (banco) o Divide Stripe (Stripe)",
  "guides.remittances.doNext.1": "Marca \"hecho\" cuando no queden pendientes",
  "guides.remittances.avoid.0": "Asignar contacto/categoría al padre como si fuera una cuota",
  "guides.remittances.avoid.1": "Exportar 182/certificados con hijas pendientes",

  // donors
  "guides.donors.title": "Donantes · Modelo 182 (sin errores)",
  "guides.donors.intro": "El Modelo 182 falla por dos cosas: DNI/CP incompletos o devoluciones mal resueltas. Lo demás es secundario.",
  "guides.donors.notResolved.0": "Falta DNI/CIF o Código Postal",
  "guides.donors.notResolved.1": "Hay duplicados (mismo DNI en dos fichas)",
  "guides.donors.notResolved.2": "Total anual \"huele raro\" por devoluciones pendientes",
  "guides.donors.costlyError": "Generar 182 o certificados masivos sin revisar 2–3 donantes representativos. Luego no sabes dónde está el problema.",
  "guides.donors.checkBeforeExport.0": "Donantes con DNI/CP completos",
  "guides.donors.checkBeforeExport.1": "Duplicados resueltos (1 DNI = 1 donante)",
  "guides.donors.checkBeforeExport.2": "Donantes \"raros\" revisados (importe neto y devoluciones)",
  "guides.donors.dontFixYet.0": "Si no tienes datos fiscales: espera y pídelos",
  "guides.donors.dontFixYet.1": "Si estás en control diario: no hace falta \"perfeccionar\" fichas",

  // reports
  "guides.reports.title": "Informes · Fiscalidad limpia",
  "guides.reports.intro": "El informe no es el problema. El problema es el dato que entra. Si está sucio, el Excel también lo estará.",
  "guides.reports.notResolved.0": "Donantes con DNI/CP incompletos",
  "guides.reports.notResolved.1": "Devoluciones sin donante asignado",
  "guides.reports.notResolved.2": "Movimientos recientes sin categorizar",
  "guides.reports.costlyError": "Enviar el Excel a la gestoría sin abrirlo. Luego te llaman con 50 errores y no sabes por dónde empezar.",
  "guides.reports.checkBeforeExport.0": "Alertas de donantes resueltas",
  "guides.reports.checkBeforeExport.1": "Devoluciones todas asignadas",
  "guides.reports.checkBeforeExport.2": "Totales coherentes con lo esperado",
  "guides.reports.dontFixYet.0": "Si faltan datos fiscales: espéralos antes de exportar",
  "guides.reports.dontFixYet.1": "Si no es cierre: no hace falta generar nada",

  // projects
  "guides.projects.title": "Proyectos · Justificación sin sorpresas",
  "guides.projects.intro": "El descuadre no se descubre al final. Se detecta asignando gastos a partidas con criterio.",
  "guides.projects.notResolved.0": "Gastos sin partida asignada",
  "guides.projects.notResolved.1": "Partida con importe asignado > presupuesto",
  "guides.projects.notResolved.2": "Movimientos del proyecto sin categorizar",
  "guides.projects.costlyError": "Asignar gastos masivamente sin revisar. Luego no sabes qué gasto ha descuadrado la partida.",
  "guides.projects.checkBeforeExport.0": "Todos los gastos del proyecto asignados",
  "guides.projects.checkBeforeExport.1": "Ninguna partida con desviación crítica",
  "guides.projects.checkBeforeExport.2": "Documentos adjuntos completos",
  "guides.projects.dontFixYet.0": "Si el proyecto aún tiene gastos pendientes de entrar",
  "guides.projects.dontFixYet.1": "Si estás en fase de ejecución, no de justificación",

  // monthlyFlow
  "guides.monthlyFlow.title": "Flujo mensual · Importar y dejar limpio",
  "guides.monthlyFlow.intro": "Checklist para pasar el extracto del banco y dejar Movimientos en estado operativo.",
  "guides.monthlyFlow.steps.0": "Descarga extracto del banco (CSV/XLSX) y súbelo a Movimientos.",
  "guides.monthlyFlow.steps.1": "Revisa previsualización (fechas, importes, descripciones) e importa.",
  "guides.monthlyFlow.steps.2": "Filtra: Sin contacto → resuelve.",
  "guides.monthlyFlow.steps.3": "Filtra: Sin categoría → resuelve.",
  "guides.monthlyFlow.steps.4": "Revisa: Devoluciones pendientes y Remesas (divide si hace falta).",
  "guides.monthlyFlow.steps.5": "Revisión final: muestra 10 movimientos aleatorios y valida coherencia.",

  // yearEndFiscal
  "guides.yearEndFiscal.title": "Cierre anual · 182/347/certificados",
  "guides.yearEndFiscal.intro": "Checklist para preparar los exports para gestoría sin correcciones de última hora.",
  "guides.yearEndFiscal.steps.0": "En Donantes: completa DNI/CIF y Código Postal de los que tengan alertas.",
  "guides.yearEndFiscal.steps.1": "En Movimientos: comprueba que no hay devoluciones pendientes.",
  "guides.yearEndFiscal.steps.2": "En Informes: genera Modelo 182.",
  "guides.yearEndFiscal.steps.3": "En Proveedores: verifica CIF y genera Modelo 347.",
  "guides.yearEndFiscal.steps.4": "En Informes: genera certificados (individuales o lote).",
  "guides.yearEndFiscal.steps.5": "Archiva exports y fija la versión enviada a gestoría.",

  // accessSecurity
  "guides.accessSecurity.title": "Acceso y seguridad · Sesión y organización",
  "guides.accessSecurity.intro": "Cómo entrar, qué pasa con la redirección y qué hacer si la sesión caduca.",
  "guides.accessSecurity.steps.0": "Login global → redirección automática a tu organización.",
  "guides.accessSecurity.steps.1": "Si tienes varias orgs: selecciona la org correcta antes de trabajar.",
  "guides.accessSecurity.steps.2": "Logout por inactividad: si te expulsa, vuelve a entrar (reason=idle).",
  "guides.accessSecurity.steps.3": "Roles: edición solo si es necesario; lectura para consultas.",
  "guides.accessSecurity.steps.4": "Ordenador compartido: cierra sesión siempre.",

  // initialLoad
  "guides.initialLoad.title": "Carga inicial · Primer mes",
  "guides.initialLoad.intro": "Objetivo: dejar Movimientos + Contactos listos para que el control diario y los informes salgan limpios.",
  "guides.initialLoad.steps.0": "Configura la entidad (CIF, dirección, logo, firma) en Configuración.",
  "guides.initialLoad.steps.1": "Importa donantes/proveedores/trabajadores (si tienes archivos) y completa DNI/CP/CIF mínimos.",
  "guides.initialLoad.steps.2": "Importa el extracto del mes en Movimientos (CSV/XLSX) y revisa la previsualización.",
  "guides.initialLoad.steps.3": "Limpia pendientes en este orden: Sin contacto → Sin categoría → Devoluciones pendientes.",
  "guides.initialLoad.steps.4": "Detecta remesas/Stripe y divídelas antes de seguir asignando.",
  "guides.initialLoad.steps.5": "Revisión final: revisa 10 movimientos al azar y valida coherencia (contacto + categoría).",
  "guides.initialLoad.avoid.0": "No empieces por proyectos o informes: primero limpia Movimientos y Contactos.",
  "guides.initialLoad.avoid.1": "No fuerces categorías para cerrar: deja pendientes conscientes.",
};

const GUIDES_FR = {
  // Page-level
  "guides.pageTitle": "Guides rapides",
  "guides.pageSubtitle": "Apprenez à utiliser chaque écran en 2 minutes. Pour plus de détails, consultez le manuel.",
  "guides.viewManual": "Voir dans le manuel",
  "guides.viewHelp": "Voir l'aide détaillée",
  "guides.recommendedOrder": "Ordre recommandé",

  // Labels
  "guides.labels.lookFirst": "À regarder d'abord",
  "guides.labels.doNext": "À faire ensuite",
  "guides.labels.avoid": "À éviter",
  "guides.labels.notResolved": "Quand ce n'est PAS \"prêt\"",
  "guides.labels.costlyError": "L'erreur la plus coûteuse",
  "guides.labels.checkBeforeExport": "Les 3 vérifications avant export",
  "guides.labels.dontFixYet": "Quand NE PAS toucher",

  // CTA per pantalla
  "guides.cta.movements": "Aller aux Mouvements",
  "guides.cta.returns": "Aller aux Mouvements",
  "guides.cta.remittances": "Aller aux Mouvements",
  "guides.cta.donors": "Aller aux Donateurs",
  "guides.cta.reports": "Aller aux Rapports",
  "guides.cta.projects": "Aller aux Projets",
  "guides.cta.monthlyFlow": "Aller aux Mouvements",
  "guides.cta.yearEndFiscal": "Aller aux Rapports",
  "guides.cta.accessSecurity": "Aller au Dashboard",
  "guides.cta.initialLoad": "Aller aux Mouvements",

  // === GUIES INDIVIDUALS ===

  // movements
  "guides.movements.title": "Mouvements · Contrôle quotidien",
  "guides.movements.intro": "Centre de contrôle du quotidien : vous voyez les entrées/sorties et détectez les points en attente avant qu'ils ne grossissent.",
  "guides.movements.lookFirst.0": "Mouvements sans contact",
  "guides.movements.lookFirst.1": "Mouvements sans catégorie",
  "guides.movements.lookFirst.2": "Retours en attente",
  "guides.movements.doNext.0": "Affecter contact → catégorie (dans cet ordre)",
  "guides.movements.doNext.1": "Scinder les remises avant de continuer",
  "guides.movements.avoid.0": "Forcer des affectations \"pour nettoyer\"",
  "guides.movements.avoid.1": "Ignorer les retours avant les rapports",

  // returns
  "guides.returns.title": "Retours · Contrôle fiscal",
  "guides.returns.intro": "Un retour ne se déduit fiscalement que s'il est affecté au bon donateur. Sans donateur, aucune déduction.",
  "guides.returns.notResolved.0": "Montant négatif sans donateur",
  "guides.returns.notResolved.1": "Mauvais donateur",
  "guides.returns.notResolved.2": "Remise modifiée uniquement sur le parent",
  "guides.returns.costlyError": "Affecter le retour au parent de la remise. Le parent ne compte pas fiscalement ; le donateur est sur les lignes filles.",
  "guides.returns.checkBeforeExport.0": "Aucun retour en attente",
  "guides.returns.checkBeforeExport.1": "Retours avec donateur affecté",
  "guides.returns.checkBeforeExport.2": "Donateurs aux totaux \"étranges\" vérifiés",
  "guides.returns.dontFixYet.0": "Donateur incertain",
  "guides.returns.dontFixYet.1": "Suivi quotidien, pas clôture",
  "guides.returns.dontFixYet.2": "Infos externes manquantes (banque/cabinet)",

  // remittances
  "guides.remittances.title": "Remises · Traiter et valider",
  "guides.remittances.intro": "La remise n'est pas le détail. Le détail, ce sont les lignes filles.",
  "guides.remittances.lookFirst.0": "Parent : gros montant avec concept remise/Stripe",
  "guides.remittances.lookFirst.1": "Filles : créées et somme cohérente avec le parent",
  "guides.remittances.lookFirst.2": "Filles avec donateur affecté (résout les en-attente)",
  "guides.remittances.doNext.0": "Scinder (banque) ou Scinder Stripe (Stripe)",
  "guides.remittances.doNext.1": "Marquer \"fait\" quand il n'y a plus d'en-attente",
  "guides.remittances.avoid.0": "Affecter contact/catégorie au parent comme s'il était une cotisation",
  "guides.remittances.avoid.1": "Exporter 182/certificats avec des filles en attente",

  // donors
  "guides.donors.title": "Donateurs · Modèle 182 (sans erreurs)",
  "guides.donors.intro": "Le Modèle 182 échoue surtout pour deux raisons : DNI/CP incomplets ou retours mal résolus. Le reste est secondaire.",
  "guides.donors.notResolved.0": "DNI/CIF ou Code postal manquant",
  "guides.donors.notResolved.1": "Doublons (même DNI sur deux fiches)",
  "guides.donors.notResolved.2": "Total annuel \"étrange\" à cause de retours en attente",
  "guides.donors.costlyError": "Générer le 182 ou des certificats en masse sans vérifier 2–3 donateurs représentatifs. Ensuite, impossible de localiser le problème.",
  "guides.donors.checkBeforeExport.0": "Donateurs avec DNI/CP complets",
  "guides.donors.checkBeforeExport.1": "Doublons résolus (1 DNI = 1 donateur)",
  "guides.donors.checkBeforeExport.2": "Donateurs \"étranges\" vérifiés (net + retours)",
  "guides.donors.dontFixYet.0": "Sans données fiscales, attendez et demandez-les",
  "guides.donors.dontFixYet.1": "En suivi quotidien, inutile de \"perfectionner\" les fiches",

  // reports
  "guides.reports.title": "Rapports · Fiscalité propre",
  "guides.reports.intro": "Le rapport n'est pas le problème. Le problème, c'est la donnée en entrée. Si elle est incorrecte, l'Excel le sera aussi.",
  "guides.reports.notResolved.0": "Donateurs avec DNI/CP incomplets",
  "guides.reports.notResolved.1": "Retours sans donateur affecté",
  "guides.reports.notResolved.2": "Mouvements récents non catégorisés",
  "guides.reports.costlyError": "Envoyer l'Excel au cabinet sans l'ouvrir. Puis ils appellent avec 50 erreurs et vous ne savez pas par où commencer.",
  "guides.reports.checkBeforeExport.0": "Alertes donateurs résolues",
  "guides.reports.checkBeforeExport.1": "Retours tous affectés",
  "guides.reports.checkBeforeExport.2": "Totaux cohérents avec les attentes",
  "guides.reports.dontFixYet.0": "Données fiscales manquantes : attendez-les avant d'exporter",
  "guides.reports.dontFixYet.1": "Hors clôture : pas besoin de générer",

  // projects
  "guides.projects.title": "Projets · Justification sans surprises",
  "guides.projects.intro": "L'écart ne se découvre pas à la fin. Il se détecte en affectant les dépenses aux lignes avec méthode.",
  "guides.projects.notResolved.0": "Dépenses sans ligne budgétaire",
  "guides.projects.notResolved.1": "Ligne avec montant affecté > budget",
  "guides.projects.notResolved.2": "Mouvements du projet non catégorisés",
  "guides.projects.costlyError": "Affecter des dépenses en masse sans vérifier. Ensuite, impossible de savoir quelle dépense a déséquilibré la ligne.",
  "guides.projects.checkBeforeExport.0": "Toutes les dépenses du projet affectées",
  "guides.projects.checkBeforeExport.1": "Aucune ligne avec écart critique",
  "guides.projects.checkBeforeExport.2": "Documents justificatifs complets",
  "guides.projects.dontFixYet.0": "Si le projet a encore des dépenses à saisir",
  "guides.projects.dontFixYet.1": "Si vous êtes en phase d'exécution, pas de justification",

  // monthlyFlow
  "guides.monthlyFlow.title": "Flux mensuel · Importer et nettoyer",
  "guides.monthlyFlow.intro": "Checklist pour traiter l'extrait bancaire et laisser Mouvements en état opérationnel.",
  "guides.monthlyFlow.steps.0": "Téléchargez l'extrait de la banque (CSV/XLSX) et importez-le dans Mouvements.",
  "guides.monthlyFlow.steps.1": "Vérifiez la prévisualisation (dates, montants, descriptions) et importez.",
  "guides.monthlyFlow.steps.2": "Filtrez : Sans contact → résolvez.",
  "guides.monthlyFlow.steps.3": "Filtrez : Sans catégorie → résolvez.",
  "guides.monthlyFlow.steps.4": "Vérifiez : Retours en attente et Remises (scindez si nécessaire).",
  "guides.monthlyFlow.steps.5": "Vérification finale : affichez 10 mouvements aléatoires et validez la cohérence.",

  // yearEndFiscal
  "guides.yearEndFiscal.title": "Clôture annuelle · 182/347/certificats",
  "guides.yearEndFiscal.intro": "Checklist pour préparer les exports pour le cabinet sans corrections de dernière minute.",
  "guides.yearEndFiscal.steps.0": "Dans Donateurs : complétez DNI/CIF et Code postal pour ceux avec alertes.",
  "guides.yearEndFiscal.steps.1": "Dans Mouvements : vérifiez qu'il n'y a pas de retours en attente.",
  "guides.yearEndFiscal.steps.2": "Dans Rapports : générez le Modèle 182.",
  "guides.yearEndFiscal.steps.3": "Dans Fournisseurs : vérifiez le CIF et générez le Modèle 347.",
  "guides.yearEndFiscal.steps.4": "Dans Rapports : générez les certificats (individuels ou en lot).",
  "guides.yearEndFiscal.steps.5": "Archivez les exports et fixez la version envoyée au cabinet.",

  // accessSecurity
  "guides.accessSecurity.title": "Accès et sécurité · Session et organisation",
  "guides.accessSecurity.intro": "Comment se connecter, ce qui se passe avec la redirection et que faire si la session expire.",
  "guides.accessSecurity.steps.0": "Login global → redirection automatique vers votre organisation.",
  "guides.accessSecurity.steps.1": "Si vous avez plusieurs orgs : sélectionnez la bonne org avant de travailler.",
  "guides.accessSecurity.steps.2": "Déconnexion par inactivité : si vous êtes expulsé, reconnectez-vous (reason=idle).",
  "guides.accessSecurity.steps.3": "Rôles : édition uniquement si nécessaire ; lecture pour consultations.",
  "guides.accessSecurity.steps.4": "Ordinateur partagé : déconnectez-vous toujours.",

  // initialLoad
  "guides.initialLoad.title": "Chargement initial · Premier mois",
  "guides.initialLoad.intro": "Objectif : préparer Mouvements + Contacts pour que le suivi quotidien et les exports soient propres.",
  "guides.initialLoad.steps.0": "Configurer l'organisation (CIF, adresse, logo, signature) dans Paramètres.",
  "guides.initialLoad.steps.1": "Importer donateurs/fournisseurs/salariés (si fichiers) et compléter DNI/CP/CIF minimum.",
  "guides.initialLoad.steps.2": "Importer l'extrait du mois dans Mouvements (CSV/XLSX) et vérifier l'aperçu.",
  "guides.initialLoad.steps.3": "Nettoyer les en attente dans cet ordre : Sans contact → Sans catégorie → Retours en attente.",
  "guides.initialLoad.steps.4": "Détecter remises/Stripe et les scinder avant de continuer l'affectation.",
  "guides.initialLoad.steps.5": "Revue finale : vérifier 10 mouvements au hasard (contact + catégorie cohérents).",
  "guides.initialLoad.avoid.0": "Ne commencez pas par projets/rapports : nettoyez d'abord Mouvements et Contacts.",
  "guides.initialLoad.avoid.1": "Ne forcez pas les catégories pour \"clôturer\" : laissez des points en attente assumés.",
};

// Main
const localesDir = path.join(__dirname, '../../src/i18n/locales');

function addGuidesToJson(lang: string, guides: Record<string, string>) {
  const filePath = path.join(localesDir, `${lang}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content) as Record<string, string>;

  // Afegir les guies
  Object.assign(json, guides);

  // Ordenar claus alfabèticament
  const sorted = Object.keys(json).sort().reduce((acc, key) => {
    acc[key] = json[key];
    return acc;
  }, {} as Record<string, string>);

  // Escriure
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log(`✓ Added ${Object.keys(guides).length} guide keys to ${lang}.json`);
}

console.log('Adding guides translations to JSON files...\n');

addGuidesToJson('ca', GUIDES_CA);
addGuidesToJson('es', GUIDES_ES);
addGuidesToJson('fr', GUIDES_FR);

// Copiar CA a PT (fallback)
const ptPath = path.join(localesDir, 'pt.json');
if (fs.existsSync(ptPath)) {
  const ptContent = fs.readFileSync(ptPath, 'utf-8');
  const ptJson = JSON.parse(ptContent) as Record<string, string>;
  Object.assign(ptJson, GUIDES_CA);
  const sorted = Object.keys(ptJson).sort().reduce((acc, key) => {
    acc[key] = ptJson[key];
    return acc;
  }, {} as Record<string, string>);
  fs.writeFileSync(ptPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
  console.log(`✓ Added CA guides (fallback) to pt.json`);
}

console.log('\nDone! Guides translations added to all JSON files.');
