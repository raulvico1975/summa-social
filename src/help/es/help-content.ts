import type { HelpContent, HelpRouteKey } from '../help-types';

export const HELP_CONTENT_ES: Partial<Record<HelpRouteKey, HelpContent>> = {
  '/dashboard/movimientos': {
    title: 'Ayuda · Movimientos',
    intro:
      'Esta pantalla es el centro de control del día a día: aquí revisas lo que entra y sale del banco, detectas pendientes y evitas que los errores crezcan.',
    steps: [
      'Empieza por los pendientes: filtra por "Sin contacto", "Sin categoría" y "Devoluciones pendientes" si aparecen.',
      'Asigna primero el contacto (donante, proveedor o trabajador): da contexto al movimiento.',
      'Asigna después la categoría cuando el contacto ya esté claro.',
      'Revisa ingresos agrupados (remesas): divídelas antes de continuar si hace falta.',
      'Adjunta documentos solo cuando aporten valor (facturas, justificantes relevantes).',
    ],
    tips: [
      'Orden recomendado: contacto → categoría → documento. Cambiar el orden suele generar dudas después.',
      'Si un movimiento te genera duda, déjalo pendiente y sigue con el resto.',
      'Una revisión regular de pendientes evita acumulaciones difíciles de revisar.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado de trabajo',
        items: [
          'Filtrar pendientes (qué está sin resolver).',
          'Asignar contactos.',
          'Asignar categorías.',
          'Revisar remesas y devoluciones.',
          'Adjuntar documentos cuando aporten valor.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Asignar categoría sin haber definido el contacto.',
          'Forzar una asignación solo por "dejarlo limpio".',
          'Dividir remesas demasiado tarde, con otros campos ya tocados.',
          'Generar informes sin haber revisado devoluciones.',
        ],
      },
      whenNot: {
        title: 'Cuándo no hace falta hacer nada',
        items: [
          'No hace falta asignar proyecto si solo controlas el día a día.',
          'No hace falta adjuntar documento a movimientos pequeños y evidentes.',
          'No hace falta resolver todas las dudas al momento: dejar pendientes con criterio también es control.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Gestión de Movimientos',
        href: '/dashboard/manual#5-gestio-de-moviments',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Cómo mantener Movimientos bajo control en 10 minutos',
      },
    },
    keywords: [
      'control',
      'pendientes',
      'contacto',
      'categoría',
      'remesa',
      'devoluciones',
      'documento',
      'día a día',
    ],
  },

  '/dashboard/donants': {
    title: 'Ayuda · Donantes',
    intro:
      'Aquí gestionas donantes y socios, y preparas los datos para que el Modelo 182 y los certificados salgan correctos.',
    steps: [
      'Crea un donante con "+ Nuevo donante", o importa una lista con "Importar donantes" (Excel/CSV).',
      'Asegúrate de que los campos fiscales mínimos están completos: DNI/CIF y Código Postal (imprescindibles para el Modelo 182).',
      'Si el donante ya existe y estás importando, activa "Actualizar datos de donantes existentes" para poner al día CP, IBAN, email, estado, etc.',
      'Mantén el estado "Activo/Baja" al día (y reactiva cuando corresponda).',
      'Asigna una "Categoría por defecto" si te es útil: al asignar el donante a un movimiento, la categoría puede quedar predefinida.',
      'Abre la ficha para ver historial y resumen anual de donaciones.',
      'Genera un certificado anual desde la ficha cuando te lo pidan (selecciona el año).',
      'Antes de generar el Modelo 182 o certificados masivos, corrige donantes con datos incompletos (DNI/CP): es lo que más errores provoca.',
    ],
    tips: [
      'Si hay devoluciones, revisa que estén asignadas al donante correcto: afectan al total neto del certificado y al Modelo 182.',
      'Para cargas masivas, es mejor importar y corregir duplicados que crear manualmente uno a uno.',
      'Cuando haya dudas, la ficha (resumen anual + movimientos) es el lugar más rápido para validar qué pasa.',
    ],
    keywords: ['importar', 'dni', 'código postal', 'modelo 182', 'certificado', 'baja', 'categoría por defecto', 'historial'],
  },

  '/dashboard/proveidors': {
    title: 'Ayuda · Proveedores',
    intro:
      'Aquí gestionas los proveedores de la organización para asignar correctamente los gastos y preparar el Modelo 347.',
    steps: [
      'Crea un proveedor cuando tengas gastos recurrentes o relevantes con una empresa o profesional.',
      'Introduce el nombre y el CIF: es imprescindible para que el Modelo 347 se genere correctamente.',
      'Asigna una categoría por defecto si el proveedor suele facturar siempre el mismo tipo de gasto.',
      'Completa los datos de contacto si te resultan útiles (email, teléfono), aunque no son obligatorios.',
      'Al asignar un proveedor a un movimiento, la categoría por defecto puede aplicarse automáticamente.',
      'Usa el estado activo/inactivo para mantener la lista ordenada sin perder histórico.',
      'Antes de generar el Modelo 347, revisa que los CIF sean correctos y que los importes cuadren.',
    ],
    tips: [
      'No es necesario crear un proveedor para gastos puntuales pequeños: prioriza los recurrentes.',
      'Si cambia el nombre comercial pero se mantiene el CIF, actualiza el proveedor existente.',
      'Un buen mantenimiento de proveedores simplifica mucho el Modelo 347.',
    ],
    keywords: ['proveedor', 'cif', 'modelo 347', 'categoría por defecto', 'gasto', 'empresa', 'profesional'],
  },

  '/dashboard/treballadors': {
    title: 'Ayuda · Trabajadores',
    intro:
      'Aquí gestionas los trabajadores de la organización para asignar nóminas y otros gastos de personal.',
    steps: [
      'Crea un trabajador cuando tengas nóminas o pagos recurrentes de personal.',
      'Introduce el nombre y el DNI para facilitar el control interno.',
      'Asigna una categoría por defecto (normalmente nóminas) para agilizar la asignación.',
      'Mantén el estado activo/inactivo actualizado cuando una persona entra o sale.',
      'Al asignar un trabajador a un movimiento, revisa que la categoría aplicada sea coherente.',
      'Usa esta pantalla como referencia interna; no sustituye a una herramienta de recursos humanos.',
    ],
    tips: [
      'Si un trabajador ya no tiene movimientos nuevos, márcalo como inactivo en lugar de eliminarlo.',
      'Centralizar las nóminas bajo trabajadores hace más legible el gasto de personal.',
      'No mezcles trabajadores y proveedores: cada tipo de contacto cumple una función distinta.',
    ],
    keywords: ['trabajador', 'nómina', 'personal', 'dni', 'categoría por defecto', 'gasto'],
  },

  '/dashboard/informes': {
    title: 'Ayuda · Informes',
    intro:
      'Esta pantalla sirve para generar los outputs para la gestoría: Modelo 182, Modelo 347 y certificados. Aquí no se corrigen datos; aquí se verifican y se exportan.',
    steps: [
      'Elige el año fiscal y trabaja siempre con un solo año cada vez.',
      'Modelo 182: resuelve primero las alertas de donantes (sobre todo DNI/CIF y Código Postal).',
      'Revisa devoluciones asignadas: afectan directamente al total del 182 y de los certificados.',
      'Genera el Modelo 182 y envíalo a la gestoría.',
      'Modelo 347: solo aparecerán proveedores que superen el umbral anual; comprueba el CIF antes de exportar.',
      'Genera certificados individuales o en lote cuando corresponda.',
    ],
    tips: [
      'Si el 182 no cuadra, casi siempre es por devoluciones o por datos incompletos de donantes.',
      'Valida 2–3 casos representativos antes de enviar certificados masivos.',
      'Trabaja siempre con un solo año abierto para evitar confusiones.',
    ],
    extra: {
      order: {
        title: 'Orden recomendado cuando toca hacer informes',
        items: [
          'Seleccionar el año fiscal.',
          'Resolver alertas de donantes (DNI/CP).',
          'Revisar devoluciones.',
          'Generar Modelo 182.',
          'Generar Modelo 347.',
          'Generar certificados.',
        ],
      },
      pitfalls: {
        title: 'Errores habituales',
        items: [
          'Generar el 182 con donantes sin DNI o Código Postal.',
          'Olvidar devoluciones pendientes e inflar los totales.',
          'Mezclar años (corregir datos de un año mientras exportas otro).',
          'Generar certificados masivos sin validar ningún caso antes.',
        ],
      },
      checks: {
        title: 'Checks finales antes de enviar a gestoría',
        items: [
          '182: ninguna alerta crítica pendiente.',
          '182: totales coherentes con lo esperado.',
          '347: proveedores con CIF correcto.',
          'Certificados: firma y cargo configurados.',
        ],
      },
      manual: {
        label: 'Manual de usuario · Informes fiscales',
        href: '/dashboard/manual#7-informes-fiscals',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Preparar Modelo 182 y certificados sin sorpresas (15 minutos)',
      },
    },
    keywords: [
      'modelo 182',
      'modelo 347',
      'certificados',
      'gestoría',
      'año fiscal',
      'devoluciones',
      'alertas',
      'exportar',
    ],
  },

  '/dashboard/configuracion': {
    title: 'Ayuda · Configuración',
    intro:
      'Aquí configuras los datos base de la organización para que certificados e informes fiscales salgan correctos.',
    steps: [
      'Completa los datos fiscales de la organización (nombre, CIF, dirección y contacto): aparecen en certificados y documentos.',
      'Sube el logo de la organización: se utiliza en certificados y da coherencia visual al output.',
      'Configura la firma digitalizada (imagen) y completa nombre y cargo del firmante: sin esto, los certificados pueden quedar incompletos.',
      'Revisa las categorías: asegúrate de tener categorías de ingreso y gasto coherentes con tu día a día (donaciones, cuotas, nóminas, gastos bancarios…).',
      'Si trabajáis en equipo, gestiona miembros: invita personas y asigna roles según lo que necesiten hacer (editar vs solo lectura).',
      'Ajusta preferencias si existen (p. ej. umbrales de alertas): la idea es ver solo lo que aporta valor y evitar ruido.',
      'Si dudas de un resultado fiscal, vuelve aquí y revisa primero: datos de entidad + firma + categorías (lo más habitual).',
    ],
    tips: [
      'Prioriza siempre: datos fiscales + firma. Es lo que impacta directamente en certificados y Modelo 182.',
      'Si alguien solo debe consultar, pon rol de lectura: evita cambios accidentales.',
      'Si cambias categorías tras meses de uso, hazlo con prudencia: suele ser mejor añadir que renombrar agresivamente.',
    ],
    keywords: ['organización', 'cif', 'dirección', 'logo', 'firma', 'firmante', 'categorías', 'miembros', 'roles', 'preferencias'],
  },

  '/dashboard/project-module/expenses': {
    title: 'Ayuda · Asignación de gastos (Proyectos)',
    intro:
      'Esta bandeja es el inbox de gastos asignables: aquí decides a qué proyecto y a qué partida va cada gasto, de forma rápida y reversible.',
    steps: [
      'Entiende lo que ves: cada fila es un gasto (bancario o de terreno) con estado 0% / parcial / 100%.',
      'Empieza por los pendientes: filtra por "No asignadas" (0%) para priorizar lo que aún no está imputado.',
      'Quick Assign 100%: usa la acción rápida para asignar todo el gasto a un proyecto y (si aplica) a una partida concreta.',
      'Split (asignación múltiple): si un gasto se reparte entre proyectos o partidas, usa la asignación múltiple y reparte importes hasta que cuadren.',
      'Revisa el estado: el porcentaje debe reflejar la realidad (100% cuando está totalmente imputado; parcial cuando solo una parte).',
      'Desasignar: si te equivocas, deshaz la asignación y vuelve a 0% (o ajusta la distribución).',
      'Asignación masiva: selecciona varios gastos y aplica una asignación en bloque para los casos repetitivos (mismo proyecto/partida).',
      'Cierre de revisión: antes de dar un proyecto por bueno, verifica que los gastos relevantes están al 100% y que los splits no dejan importes "colgados".',
    ],
    tips: [
      'Cuando un proyecto está sobreejecutado en una partida, el split parcial es la forma realista de cuadrar sin inventar gastos.',
      'Si un gasto no encaja en ningún proyecto, es mejor dejarlo a 0% que forzar una asignación incorrecta.',
      'Los gastos de terreno suelen subirse primero y asignarse después: prioriza la coherencia de la imputación, no la velocidad de entrada.',
    ],
    extra: {
      manual: {
        label: 'Manual de usuario · Asignación de gastos',
        href: '/dashboard/manual#6-assignacio-de-despeses',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Asignar gastos a proyectos de forma ágil (10 minutos)',
      },
    },
    keywords: [
      'asignación',
      'proyecto',
      'partida',
      'quick assign',
      'split',
      '100%',
      'parcial',
      'desasignar',
      'masivo',
      'terreno',
    ],
  },

  '/dashboard/project-module/projects': {
    title: 'Ayuda · Gestión de proyectos',
    intro:
      'Aquí creas y gestionas los proyectos del módulo de Proyectos, que luego usarás para asignarles gastos.',
    steps: [
      'Crea un proyecto cuando necesites agrupar gastos bajo un mismo paraguas (p. ej., una subvención, un programa o un periodo de trabajo concreto).',
      'Pon un nombre claro y reconocible: es el que verás en la bandeja de asignación de gastos.',
      'Añade un código o referencia si trabajas con justificaciones externas (opcional pero recomendable).',
      'Revisa el estado del proyecto: activo mientras se asignan gastos; cerrado cuando ya no debe usarse.',
      'Si el proyecto tiene presupuesto, introdúcelo o gestiona las partidas desde su pantalla económica.',
      'El proyecto cobra sentido cuando le asignas gastos desde "Asignación de gastos".',
      'Evita crear proyectos duplicados por pequeñas variaciones: mejor pocos proyectos bien definidos.',
      'Cuando el proyecto termina, ciérralo para mantener el orden y evitar asignaciones accidentales.',
    ],
    tips: [
      'Si dudas si un gasto debe ir a un proyecto, déjalo sin asignar hasta tener criterio.',
      'Un proyecto bien definido hace que la pantalla de asignación sea más rápida y con menos errores.',
      'Cerrar proyectos antiguos reduce ruido y evita selecciones equivocadas.',
    ],
    extra: {
      manual: {
        label: 'Manual de usuario · Gestión de proyectos',
        href: '/dashboard/manual#6-gestio-de-projectes',
      },
      video: {
        label: 'Vídeo (próximamente)',
        note: 'Crear y gestionar proyectos de forma eficiente (8 minutos)',
      },
    },
    keywords: ['proyecto', 'crear', 'editar', 'cerrar', 'código', 'presupuesto', 'partidas', 'asignación'],
  },
};
