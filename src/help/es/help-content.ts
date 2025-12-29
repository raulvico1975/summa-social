import type { HelpContent, HelpRouteKey } from '../help-types';

export const HELP_CONTENT_ES: Partial<Record<HelpRouteKey, HelpContent>> = {
  '/dashboard/movimientos': {
    title: 'Ayuda · Movimientos',
    intro:
      'Aquí importas y revisas los movimientos del banco, y los preparas para que la fiscalidad y los informes salgan limpios.',
    steps: [
      'Importa el extracto: pulsa "Importar extracto" y sube el CSV/XLSX del banco.',
      'Revisa la previsualización antes de importar (fechas, importes y descripciones).',
      'Filtra el listado para encontrar pendientes: "Sin categorizar", "Sin contacto" y (si aparece) "Devoluciones pendientes".',
      'Abre un movimiento y asigna Categoría y Contacto (donante/proveedor/trabajador) si falta.',
      'Adjunta el documento (factura/justificante) cuando haga falta: icono de documento o arrastrándolo sobre la fila (si está disponible).',
      'Si ves una remesa (un solo ingreso con muchas cuotas), usa el menú ⋮ de la fila para "Dividir remesa".',
      'Si ves un ingreso de Stripe, usa el menú ⋮ para "Dividir remesa Stripe" y sube el CSV de Stripe (Pagos → exportar).',
      'Al terminar, comprueba que los movimientos clave quedan con Categoría + Contacto: reduce errores en modelos fiscales y certificados.',
    ],
    tips: [
      'Prioriza primero los filtros de pendientes (Sin categorizar / Sin contacto) antes de retocar casos puntuales.',
      'En devoluciones, el movimiento original no se toca: hay que asignar el donante a la devolución para que reste correctamente en fiscalidad.',
      'Si un contacto tiene "categoría por defecto", al asignarlo a un movimiento la categoría puede completarse automáticamente.',
    ],
    keywords: ['importar', 'extracto', 'categoría', 'contacto', 'remesa', 'stripe', 'devoluciones', 'documento'],
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

  '/dashboard/informes': {
    title: 'Ayuda · Informes',
    intro:
      'Aquí generas los outputs para la gestoría: Modelo 182, Modelo 347 y certificados de donación.',
    steps: [
      'Elige la sección adecuada: Modelo 182 (donaciones), Modelo 347 (terceros) o Certificados.',
      'Selecciona el año fiscal antes de generar ningún fichero.',
      'Modelo 182: revisa las alertas de donantes con datos incompletos (sobre todo DNI/CIF y Código Postal).',
      'Modelo 182: corrige los datos desde Donantes y vuelve aquí para regenerar.',
      'Modelo 182: genera el Excel y envíalo a la gestoría.',
      'Modelo 347: comprueba que los proveedores tengan CIF correcto; solo aparecerán los que superen el umbral anual.',
      'Modelo 347: genera el CSV y envíalo a la gestoría.',
      'Certificados: genera un certificado individual cuando te lo pidan, o en lote si lo haces en campaña anual.',
      'Si hay devoluciones asignadas, restan automáticamente del total neto (importante para 182 y certificados).',
    ],
    tips: [
      'Antes de cerrar el año, asegúrate de que las devoluciones están asignadas al donante correcto: es la causa típica de totales incoherentes.',
      'Si un donante no tiene DNI o Código Postal, puede bloquear o ensuciar el Modelo 182: prioriza completar esos campos.',
      'Para certificados masivos, revisa primero 2 o 3 donantes representativos (con y sin devoluciones) para validar importes.',
    ],
    keywords: ['modelo 182', 'modelo 347', 'certificados', 'excel', 'csv', 'año', 'donaciones', 'devoluciones', 'gestoría'],
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
};
