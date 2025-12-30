'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  BookOpen,
  Receipt,
  RotateCcw,
  CreditCard,
  Users,
  FileText,
  FolderKanban,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleSlash,
  ClipboardCheck,
  Clock,
  HelpCircle,
  CalendarCheck,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from '@/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus i dades
// ─────────────────────────────────────────────────────────────────────────────

type GuideItem = {
  id: string;
  icon: React.ReactNode;
  href: string;
  helpHref?: string;
  manualAnchor: string;
};

const GUIDES: GuideItem[] = [
  {
    id: 'movements',
    icon: <Receipt className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'returns',
    icon: <RotateCcw className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    helpHref: '/dashboard/movimientos?help=1',
    manualAnchor: '#remittances',
  },
  {
    id: 'remittances',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    helpHref: '/dashboard/movimientos?help=1',
    manualAnchor: '#6-divisor-de-remeses',
  },
  {
    id: 'donors',
    icon: <Users className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#donors',
  },
  {
    id: 'reports',
    icon: <FileText className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#9-informes-fiscals',
  },
  {
    id: 'projects',
    icon: <FolderKanban className="h-5 w-5" />,
    href: '/dashboard/project-module/expenses',
    manualAnchor: '#10-projectes-i-justificació-de-subvencions',
  },
  {
    id: 'monthlyFlow',
    icon: <RefreshCw className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'yearEndFiscal',
    icon: <CalendarCheck className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#9-informes-fiscals',
  },
  {
    id: 'accessSecurity',
    icon: <Shield className="h-5 w-5" />,
    href: '/dashboard',
    manualAnchor: '#1-primers-passos',
  },
];

// Contingut per idioma
const GUIDE_CONTENT = {
  ca: {
    pageTitle: 'Guies curtes',
    pageSubtitle: 'Aprèn a fer servir cada pantalla en 2 minuts. Per a més detall, consulta el manual.',
    viewManual: 'Veure al manual',
    viewHelp: 'Veure ajuda detallada',
    goToScreen: {
      movements: 'Anar a Moviments',
      returns: 'Anar a Moviments',
      remittances: 'Anar a Moviments',
      donors: 'Anar a Donants',
      reports: 'Anar a Informes',
      projects: 'Anar a Projectes',
      monthlyFlow: 'Anar a Moviments',
      yearEndFiscal: 'Anar a Informes',
      accessSecurity: 'Anar al Dashboard',
    },
    recommendedOrder: 'Ordre recomanat',
    // Labels per nou format checklist
    lookFirst: 'Mira això primer',
    doNext: 'Fes això després',
    avoid: 'Evita això',
    // Labels per format expert (devolucions/donants)
    notResolved: 'Quan NO està "a punt"',
    costlyError: 'L\'error més car',
    checkBeforeExport: 'Les 3 comprovacions abans d\'exportar',
    dontFixYet: 'Quan NO tocar res',
    guides: {
      movements: {
        title: 'Moviments · Control diari',
        intro: 'Centre de control del dia a dia: aquí veus què entra i surt i detectes pendents abans que es facin grans.',
        // Nou format checklist
        lookFirst: [
          'Moviments sense contacte',
          'Moviments sense categoria',
          'Devolucions pendents',
        ],
        doNext: [
          'Assigna contacte → categoria (en aquest ordre)',
          'Divideix remeses abans de seguir',
        ],
        avoid: [
          'Forçar assignacions "per deixar-ho net"',
          'Ignorar devolucions abans d\'informes',
        ],
        // Mantenim steps per compatibilitat amb altres guies
        steps: [],
      },
      returns: {
        title: 'Devolucions · Control fiscal',
        intro: 'Una devolució només resta fiscalment si està assignada al donant correcte. Sense donant, no resta res.',
        // Format expert
        notResolved: [
          'Import negatiu sense donant',
          'Donant equivocat',
          'Remesa tocada només al pare',
        ],
        costlyError: 'Assignar la devolució al pare de la remesa. El pare no compta fiscalment; el donant va a les línies filles.',
        checkBeforeExport: [
          'Cap devolució pendent',
          'Devolucions amb donant assignat',
          'Donants amb totals "estranys" revisats',
        ],
        dontFixYet: [
          'No tens clar el donant',
          'Estàs en control diari, no en tancament',
          'Falta info externa (banc/gestoria)',
        ],
        steps: [],
      },
      remittances: {
        title: 'Remeses · Processar i validar',
        intro: 'La remesa no és el detall. El detall són les filles.',
        lookFirst: [
          'Pare: import gran amb concepte remesa/Stripe',
          'Filles: creades i suma coherent amb el pare',
          'Filles amb donant assignat (resol pendents)',
        ],
        doNext: [
          'Divideix (banc) o Divideix Stripe (Stripe)',
          'Marca "fet" quan no queden pendents',
        ],
        avoid: [
          'Assignar contacte/categoria al pare com si fos una quota',
          'Exportar 182/certificats amb filles pendents',
        ],
        steps: [],
      },
      donors: {
        title: 'Donants · Model 182 (sense errors)',
        intro: 'El Model 182 falla per dues coses: DNI/CP incomplets o devolucions mal resoltes. La resta és secundària.',
        notResolved: [
          'Falta DNI/CIF o Codi Postal',
          'Hi ha duplicats (mateix DNI en dues fitxes)',
          'Total anual "fa olor" per devolucions pendents',
        ],
        costlyError: 'Generar 182 o certificats massius sense revisar 2–3 donants representatius. Després no saps on està el problema.',
        checkBeforeExport: [
          'Donants amb DNI/CP complets',
          'Duplicats resolts (1 DNI = 1 donant)',
          'Donants "estranys" revisats (import net i devolucions)',
        ],
        dontFixYet: [
          'Si no tens les dades fiscals: espera i demana-les',
          'Si estàs en control diari: no cal "perfeccionar" fitxes',
        ],
        steps: [],
      },
      reports: {
        title: 'Informes · Fiscalitat neta',
        intro: 'L\'informe no és el problema. El problema és la dada que hi entra. Si està bruta, l\'Excel també ho estarà.',
        notResolved: [
          'Donants amb DNI/CP incomplets',
          'Devolucions sense donant assignat',
          'Moviments recents sense categoritzar',
        ],
        costlyError: 'Enviar l\'Excel a la gestoria sense obrir-lo. Després et truquen amb 50 errors i no saps per on començar.',
        checkBeforeExport: [
          'Alertes de donants resoltes',
          'Devolucions totes assignades',
          'Totals coherents amb el que esperes',
        ],
        dontFixYet: [
          'Si falten dades fiscals: espera-les abans d\'exportar',
          'Si no és tancament: no cal generar res',
        ],
        steps: [],
      },
      projects: {
        title: 'Projectes · Justificació sense sorpreses',
        intro: 'El desquadrament no es descobreix al final. Es detecta assignant despeses a partides amb criteri.',
        notResolved: [
          'Despeses sense partida assignada',
          'Partida amb import assignat > pressupost',
          'Moviments del projecte sense categoritzar',
        ],
        costlyError: 'Assignar despeses massivament sense revisar. Després no saps quina despesa ha desquadrat la partida.',
        checkBeforeExport: [
          'Totes les despeses del projecte assignades',
          'Cap partida amb desviació crítica',
          'Documents adjunts complets',
        ],
        dontFixYet: [
          'Si el projecte encara té despeses pendents d\'entrar',
          'Si estàs en fase d\'execució, no de justificació',
        ],
        steps: [],
      },
      monthlyFlow: {
        title: 'Flux mensual · Importar i deixar net',
        intro: 'Checklist per passar l\'extracte del banc i deixar Moviments en estat operatiu.',
        steps: [
          'Descarrega extracte del banc (CSV/XLSX) i puja\'l a Moviments.',
          'Revisa previsualització (dates, imports, descripcions) i importa.',
          'Filtra: Sense contacte → resol.',
          'Filtra: Sense categoria → resol.',
          'Revisa: Devolucions pendents i Remeses (divideix si cal).',
          'Revisió final: mostra 10 moviments aleatoris i valida coherència.',
        ],
      },
      yearEndFiscal: {
        title: 'Tancament anual · 182/347/certificats',
        intro: 'Checklist per preparar els exports per gestoria sense correccions d\'última hora.',
        steps: [
          'A Donants: completa DNI/CIF i Codi Postal dels que tinguin alertes.',
          'A Moviments: comprova que no hi ha devolucions pendents.',
          'A Informes: genera Model 182.',
          'A Proveïdors: verifica CIF i genera Model 347.',
          'A Informes: genera certificats (individuals o lot).',
          'Arxiva exports i fixa la versió enviada a gestoria.',
        ],
      },
      accessSecurity: {
        title: 'Accés i seguretat · Sessió i organització',
        intro: 'Com entrar, què passa amb la redirecció i què fer si la sessió caduca.',
        steps: [
          'Login global → redirecció automàtica a la teva organització.',
          'Si tens diverses orgs: selecciona l\'org correcta abans de treballar.',
          'Logout per inactivitat: si et treu, torna a entrar (reason=idle).',
          'Rols: edició només si cal; lectura per consultes.',
          'Ordinador compartit: tanca sessió sempre.',
        ],
      },
    },
  },
  es: {
    pageTitle: 'Guías cortas',
    pageSubtitle: 'Aprende a usar cada pantalla en 2 minutos. Para más detalle, consulta el manual.',
    viewManual: 'Ver en el manual',
    viewHelp: 'Ver ayuda detallada',
    goToScreen: {
      movements: 'Ir a Movimientos',
      returns: 'Ir a Movimientos',
      remittances: 'Ir a Movimientos',
      donors: 'Ir a Donantes',
      reports: 'Ir a Informes',
      projects: 'Ir a Proyectos',
      monthlyFlow: 'Ir a Movimientos',
      yearEndFiscal: 'Ir a Informes',
      accessSecurity: 'Ir al Dashboard',
    },
    recommendedOrder: 'Orden recomendado',
    // Labels per nou format checklist
    lookFirst: 'Mira esto primero',
    doNext: 'Haz esto después',
    avoid: 'Evita esto',
    // Labels per format expert (devolucions/donants)
    notResolved: 'Cuándo NO está "listo"',
    costlyError: 'El error más caro',
    checkBeforeExport: 'Las 3 comprobaciones antes de exportar',
    dontFixYet: 'Cuándo NO tocar nada',
    guides: {
      movements: {
        title: 'Movimientos · Control diario',
        intro: 'Centro de control del día a día: aquí ves lo que entra y sale y detectas pendientes antes de que crezcan.',
        lookFirst: [
          'Movimientos sin contacto',
          'Movimientos sin categoría',
          'Devoluciones pendientes',
        ],
        doNext: [
          'Asigna contacto → categoría (en este orden)',
          'Divide remesas antes de seguir',
        ],
        avoid: [
          'Forzar asignaciones "para dejarlo limpio"',
          'Ignorar devoluciones antes de informes',
        ],
        steps: [],
      },
      returns: {
        title: 'Devoluciones · Control fiscal',
        intro: 'Una devolución solo resta fiscalmente si está asignada al donante correcto. Sin donante, no resta nada.',
        // Format expert
        notResolved: [
          'Importe negativo sin donante',
          'Donante equivocado',
          'Remesa tocada solo en el padre',
        ],
        costlyError: 'Asignar la devolución al padre de la remesa. El padre no cuenta fiscalmente; el donante va en las líneas hijas.',
        checkBeforeExport: [
          'Ninguna devolución pendiente',
          'Devoluciones con donante asignado',
          'Donantes con totales "raros" revisados',
        ],
        dontFixYet: [
          'No está claro el donante',
          'Estás en control diario, no en cierre',
          'Falta info externa (banco/gestoría)',
        ],
        steps: [],
      },
      remittances: {
        title: 'Remesas · Procesar y validar',
        intro: 'La remesa no es el detalle. El detalle son las hijas.',
        lookFirst: [
          'Padre: importe grande con concepto remesa/Stripe',
          'Hijas: creadas y suma coherente con el padre',
          'Hijas con donante asignado (resuelve pendientes)',
        ],
        doNext: [
          'Divide (banco) o Divide Stripe (Stripe)',
          'Marca "hecho" cuando no queden pendientes',
        ],
        avoid: [
          'Asignar contacto/categoría al padre como si fuera una cuota',
          'Exportar 182/certificados con hijas pendientes',
        ],
        steps: [],
      },
      donors: {
        title: 'Donantes · Modelo 182 (sin errores)',
        intro: 'El Modelo 182 falla por dos cosas: DNI/CP incompletos o devoluciones mal resueltas. Lo demás es secundario.',
        notResolved: [
          'Falta DNI/CIF o Código Postal',
          'Hay duplicados (mismo DNI en dos fichas)',
          'Total anual "huele raro" por devoluciones pendientes',
        ],
        costlyError: 'Generar 182 o certificados masivos sin revisar 2–3 donantes representativos. Luego no sabes dónde está el problema.',
        checkBeforeExport: [
          'Donantes con DNI/CP completos',
          'Duplicados resueltos (1 DNI = 1 donante)',
          'Donantes "raros" revisados (importe neto y devoluciones)',
        ],
        dontFixYet: [
          'Si no tienes datos fiscales: espera y pídelos',
          'Si estás en control diario: no hace falta "perfeccionar" fichas',
        ],
        steps: [],
      },
      reports: {
        title: 'Informes · Fiscalidad limpia',
        intro: 'El informe no es el problema. El problema es el dato que entra. Si está sucio, el Excel también lo estará.',
        notResolved: [
          'Donantes con DNI/CP incompletos',
          'Devoluciones sin donante asignado',
          'Movimientos recientes sin categorizar',
        ],
        costlyError: 'Enviar el Excel a la gestoría sin abrirlo. Luego te llaman con 50 errores y no sabes por dónde empezar.',
        checkBeforeExport: [
          'Alertas de donantes resueltas',
          'Devoluciones todas asignadas',
          'Totales coherentes con lo esperado',
        ],
        dontFixYet: [
          'Si faltan datos fiscales: espéralos antes de exportar',
          'Si no es cierre: no hace falta generar nada',
        ],
        steps: [],
      },
      projects: {
        title: 'Proyectos · Justificación sin sorpresas',
        intro: 'El descuadre no se descubre al final. Se detecta asignando gastos a partidas con criterio.',
        notResolved: [
          'Gastos sin partida asignada',
          'Partida con importe asignado > presupuesto',
          'Movimientos del proyecto sin categorizar',
        ],
        costlyError: 'Asignar gastos masivamente sin revisar. Luego no sabes qué gasto ha descuadrado la partida.',
        checkBeforeExport: [
          'Todos los gastos del proyecto asignados',
          'Ninguna partida con desviación crítica',
          'Documentos adjuntos completos',
        ],
        dontFixYet: [
          'Si el proyecto aún tiene gastos pendientes de entrar',
          'Si estás en fase de ejecución, no de justificación',
        ],
        steps: [],
      },
      monthlyFlow: {
        title: 'Flujo mensual · Importar y dejar limpio',
        intro: 'Checklist para pasar el extracto del banco y dejar Movimientos en estado operativo.',
        steps: [
          'Descarga extracto del banco (CSV/XLSX) y súbelo a Movimientos.',
          'Revisa previsualización (fechas, importes, descripciones) e importa.',
          'Filtra: Sin contacto → resuelve.',
          'Filtra: Sin categoría → resuelve.',
          'Revisa: Devoluciones pendientes y Remesas (divide si hace falta).',
          'Revisión final: muestra 10 movimientos aleatorios y valida coherencia.',
        ],
      },
      yearEndFiscal: {
        title: 'Cierre anual · 182/347/certificados',
        intro: 'Checklist para preparar los exports para gestoría sin correcciones de última hora.',
        steps: [
          'En Donantes: completa DNI/CIF y Código Postal de los que tengan alertas.',
          'En Movimientos: comprueba que no hay devoluciones pendientes.',
          'En Informes: genera Modelo 182.',
          'En Proveedores: verifica CIF y genera Modelo 347.',
          'En Informes: genera certificados (individuales o lote).',
          'Archiva exports y fija la versión enviada a gestoría.',
        ],
      },
      accessSecurity: {
        title: 'Acceso y seguridad · Sesión y organización',
        intro: 'Cómo entrar, qué pasa con la redirección y qué hacer si la sesión caduca.',
        steps: [
          'Login global → redirección automática a tu organización.',
          'Si tienes varias orgs: selecciona la org correcta antes de trabajar.',
          'Logout por inactividad: si te expulsa, vuelve a entrar (reason=idle).',
          'Roles: edición solo si es necesario; lectura para consultas.',
          'Ordenador compartido: cierra sesión siempre.',
        ],
      },
    },
  },
  fr: {
    pageTitle: 'Guides rapides',
    pageSubtitle: 'Apprenez à utiliser chaque écran en 2 minutes. Pour plus de détails, consultez le manuel.',
    viewManual: 'Voir dans le manuel',
    viewHelp: 'Voir l\'aide détaillée',
    goToScreen: {
      movements: 'Aller aux Mouvements',
      returns: 'Aller aux Mouvements',
      remittances: 'Aller aux Mouvements',
      donors: 'Aller aux Donateurs',
      reports: 'Aller aux Rapports',
      projects: 'Aller aux Projets',
      monthlyFlow: 'Aller aux Mouvements',
      yearEndFiscal: 'Aller aux Rapports',
      accessSecurity: 'Aller au Dashboard',
    },
    recommendedOrder: 'Ordre recommandé',
    // Labels per nou format checklist
    lookFirst: 'À regarder d\'abord',
    doNext: 'À faire ensuite',
    avoid: 'À éviter',
    // Labels per format expert (devolucions/donants)
    notResolved: 'Quand ce n\'est PAS "prêt"',
    costlyError: 'L\'erreur la plus coûteuse',
    checkBeforeExport: 'Les 3 vérifications avant export',
    dontFixYet: 'Quand NE PAS toucher',
    guides: {
      movements: {
        title: 'Mouvements · Contrôle quotidien',
        intro: 'Centre de contrôle du quotidien : vous voyez les entrées/sorties et détectez les points en attente avant qu\'ils ne grossissent.',
        lookFirst: [
          'Mouvements sans contact',
          'Mouvements sans catégorie',
          'Retours en attente',
        ],
        doNext: [
          'Affecter contact → catégorie (dans cet ordre)',
          'Scinder les remises avant de continuer',
        ],
        avoid: [
          'Forcer des affectations "pour nettoyer"',
          'Ignorer les retours avant les rapports',
        ],
        steps: [],
      },
      returns: {
        title: 'Retours · Contrôle fiscal',
        intro: 'Un retour ne se déduit fiscalement que s\'il est affecté au bon donateur. Sans donateur, aucune déduction.',
        // Format expert
        notResolved: [
          'Montant négatif sans donateur',
          'Mauvais donateur',
          'Remise modifiée uniquement sur le parent',
        ],
        costlyError: 'Affecter le retour au parent de la remise. Le parent ne compte pas fiscalement ; le donateur est sur les lignes filles.',
        checkBeforeExport: [
          'Aucun retour en attente',
          'Retours avec donateur affecté',
          'Donateurs aux totaux "étranges" vérifiés',
        ],
        dontFixYet: [
          'Donateur incertain',
          'Suivi quotidien, pas clôture',
          'Infos externes manquantes (banque/cabinet)',
        ],
        steps: [],
      },
      remittances: {
        title: 'Remises · Traiter et valider',
        intro: 'La remise n\'est pas le détail. Le détail, ce sont les lignes filles.',
        lookFirst: [
          'Parent : gros montant avec concept remise/Stripe',
          'Filles : créées et somme cohérente avec le parent',
          'Filles avec donateur affecté (résout les en-attente)',
        ],
        doNext: [
          'Scinder (banque) ou Scinder Stripe (Stripe)',
          'Marquer "fait" quand il n\'y a plus d\'en-attente',
        ],
        avoid: [
          'Affecter contact/catégorie au parent comme s\'il était une cotisation',
          'Exporter 182/certificats avec des filles en attente',
        ],
        steps: [],
      },
      donors: {
        title: 'Donateurs · Modèle 182 (sans erreurs)',
        intro: 'Le Modèle 182 échoue surtout pour deux raisons : DNI/CP incomplets ou retours mal résolus. Le reste est secondaire.',
        notResolved: [
          'DNI/CIF ou Code postal manquant',
          'Doublons (même DNI sur deux fiches)',
          'Total annuel "étrange" à cause de retours en attente',
        ],
        costlyError: 'Générer le 182 ou des certificats en masse sans vérifier 2–3 donateurs représentatifs. Ensuite, impossible de localiser le problème.',
        checkBeforeExport: [
          'Donateurs avec DNI/CP complets',
          'Doublons résolus (1 DNI = 1 donateur)',
          'Donateurs "étranges" vérifiés (net + retours)',
        ],
        dontFixYet: [
          'Sans données fiscales, attendez et demandez-les',
          'En suivi quotidien, inutile de "perfectionner" les fiches',
        ],
        steps: [],
      },
      reports: {
        title: 'Rapports · Fiscalité propre',
        intro: 'Le rapport n\'est pas le problème. Le problème, c\'est la donnée en entrée. Si elle est incorrecte, l\'Excel le sera aussi.',
        notResolved: [
          'Donateurs avec DNI/CP incomplets',
          'Retours sans donateur affecté',
          'Mouvements récents non catégorisés',
        ],
        costlyError: 'Envoyer l\'Excel au cabinet sans l\'ouvrir. Puis ils appellent avec 50 erreurs et vous ne savez pas par où commencer.',
        checkBeforeExport: [
          'Alertes donateurs résolues',
          'Retours tous affectés',
          'Totaux cohérents avec les attentes',
        ],
        dontFixYet: [
          'Données fiscales manquantes : attendez-les avant d\'exporter',
          'Hors clôture : pas besoin de générer',
        ],
        steps: [],
      },
      projects: {
        title: 'Projets · Justification sans surprises',
        intro: 'L\'écart ne se découvre pas à la fin. Il se détecte en affectant les dépenses aux lignes avec méthode.',
        notResolved: [
          'Dépenses sans ligne budgétaire',
          'Ligne avec montant affecté > budget',
          'Mouvements du projet non catégorisés',
        ],
        costlyError: 'Affecter des dépenses en masse sans vérifier. Ensuite, impossible de savoir quelle dépense a déséquilibré la ligne.',
        checkBeforeExport: [
          'Toutes les dépenses du projet affectées',
          'Aucune ligne avec écart critique',
          'Documents justificatifs complets',
        ],
        dontFixYet: [
          'Si le projet a encore des dépenses à saisir',
          'Si vous êtes en phase d\'exécution, pas de justification',
        ],
        steps: [],
      },
      monthlyFlow: {
        title: 'Flux mensuel · Importer et nettoyer',
        intro: 'Checklist pour traiter l\'extrait bancaire et laisser Mouvements en état opérationnel.',
        steps: [
          'Téléchargez l\'extrait de la banque (CSV/XLSX) et importez-le dans Mouvements.',
          'Vérifiez la prévisualisation (dates, montants, descriptions) et importez.',
          'Filtrez : Sans contact → résolvez.',
          'Filtrez : Sans catégorie → résolvez.',
          'Vérifiez : Retours en attente et Remises (scindez si nécessaire).',
          'Vérification finale : affichez 10 mouvements aléatoires et validez la cohérence.',
        ],
      },
      yearEndFiscal: {
        title: 'Clôture annuelle · 182/347/certificats',
        intro: 'Checklist pour préparer les exports pour le cabinet sans corrections de dernière minute.',
        steps: [
          'Dans Donateurs : complétez DNI/CIF et Code postal pour ceux avec alertes.',
          'Dans Mouvements : vérifiez qu\'il n\'y a pas de retours en attente.',
          'Dans Rapports : générez le Modèle 182.',
          'Dans Fournisseurs : vérifiez le CIF et générez le Modèle 347.',
          'Dans Rapports : générez les certificats (individuels ou en lot).',
          'Archivez les exports et fixez la version envoyée au cabinet.',
        ],
      },
      accessSecurity: {
        title: 'Accès et sécurité · Session et organisation',
        intro: 'Comment se connecter, ce qui se passe avec la redirection et que faire si la session expire.',
        steps: [
          'Login global → redirection automatique vers votre organisation.',
          'Si vous avez plusieurs orgs : sélectionnez la bonne org avant de travailler.',
          'Déconnexion par inactivité : si vous êtes expulsé, reconnectez-vous (reason=idle).',
          'Rôles : édition uniquement si nécessaire ; lecture pour consultations.',
          'Ordinateur partagé : déconnectez-vous toujours.',
        ],
      },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { language } = useTranslations();

  // pt fa fallback a ca (GUIDE_CONTENT només té ca/es/fr)
  const contentLang = language === 'pt' ? 'ca' : language;
  const content = GUIDE_CONTENT[contentLang];

  const buildUrl = (path: string) => `/${orgSlug}${path}`;

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{content.pageTitle}</h1>
        </div>
        <p className="text-muted-foreground">{content.pageSubtitle}</p>
      </div>

      {/* Grid de guies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUIDES.map((guide) => {
          const guideContent = content.guides[guide.id as keyof typeof content.guides];

          return (
            <Card key={guide.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {guide.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{guideContent.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {guideContent.intro}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Format expert (devolucions) - si té notResolved */}
                {'notResolved' in guideContent && guideContent.notResolved && guideContent.notResolved.length > 0 ? (
                  <div className="space-y-2.5 mb-4 text-xs">
                    {/* Quan NO està ben resolta */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="font-medium text-red-600">{content.notResolved}</span>
                      </div>
                      <ul className="text-muted-foreground space-y-0.5 ml-5">
                        {guideContent.notResolved.map((item: string, idx: number) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                    {/* L'error més car */}
                    {'costlyError' in guideContent && guideContent.costlyError && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-amber-700 dark:text-amber-400">{content.costlyError}</span>
                            <p className="text-muted-foreground mt-0.5">{guideContent.costlyError}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Què mires sempre abans d'exportar */}
                    {'checkBeforeExport' in guideContent && guideContent.checkBeforeExport && guideContent.checkBeforeExport.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardCheck className="h-3.5 w-3.5 text-green-500" />
                          <span className="font-medium text-green-600">{content.checkBeforeExport}</span>
                        </div>
                        <ul className="text-muted-foreground space-y-0.5 ml-5">
                          {guideContent.checkBeforeExport.map((item: string, idx: number) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Quan NO arreglar-ho encara */}
                    {'dontFixYet' in guideContent && guideContent.dontFixYet && guideContent.dontFixYet.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-500">{content.dontFixYet}</span>
                        </div>
                        <ul className="text-muted-foreground space-y-0.5 ml-5">
                          {guideContent.dontFixYet.map((item: string, idx: number) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : 'lookFirst' in guideContent && guideContent.lookFirst && guideContent.lookFirst.length > 0 ? (
                  /* Format checklist (moviments) */
                  <div className="space-y-3 mb-4">
                    {/* Mira això primer */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">{content.lookFirst}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                        {guideContent.lookFirst.map((item: string, idx: number) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                    {/* Fes això després */}
                    {'doNext' in guideContent && guideContent.doNext && guideContent.doNext.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs font-medium text-green-600">{content.doNext}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {guideContent.doNext.map((item: string, idx: number) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Evita això */}
                    {'avoid' in guideContent && guideContent.avoid && guideContent.avoid.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-medium text-red-500">{content.avoid}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {guideContent.avoid.map((item: string, idx: number) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Format antic amb steps */
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2 text-xs">
                      {content.recommendedOrder}
                    </Badge>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      {guideContent.steps.map((step: string, idx: number) => (
                        <li key={idx} className="line-clamp-1">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* CTAs */}
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={buildUrl(guide.href)}>
                      {content.goToScreen[guide.id as keyof typeof content.goToScreen]}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {/* CTA secundari: ajuda detallada (si helpHref existeix) */}
                  {guide.helpHref && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildUrl(guide.helpHref)}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        {content.viewHelp}
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={buildUrl(`/dashboard/manual${guide.manualAnchor}`)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {content.viewManual}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
