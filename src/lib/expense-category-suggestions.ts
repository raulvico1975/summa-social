/**
 * Suggeriments de categoria per despeses de terreny (off-bank)
 * Basat en keywords deterministes - sense IA
 */

// Categories típiques per despeses de terreny
// L'ordre importa: les primeres tenen prioritat si hi ha múltiples matches
const CATEGORY_RULES: Array<{
  category: string;
  keywords: string[];
}> = [
  // Transport
  {
    category: 'Transport',
    keywords: [
      'taxi', 'uber', 'cabify', 'transport', 'bus', 'autobus', 'tren', 'avió', 'vol',
      'bitllet', 'billete', 'gasolina', 'benzina', 'combustible', 'peatge', 'peaje',
      'parking', 'aparcament', 'estacionamiento', 'metro', 'transfer', 'desplaçament',
      'viatge', 'viaje', 'vehicle', 'vehículo', 'cotxe', 'coche', 'moto',
    ],
  },
  // Dietes i menjars
  {
    category: 'Dietes',
    keywords: [
      'dieta', 'manutenció', 'manutención', 'menjar', 'comida', 'sopar', 'cena',
      'dinar', 'almuerzo', 'esmorzar', 'desayuno', 'restaurant', 'restaurante',
      'cafè', 'café', 'bar', 'beguda', 'bebida', 'catering', 'àpat', 'ápat',
    ],
  },
  // Allotjament
  {
    category: 'Allotjament',
    keywords: [
      'hotel', 'hostal', 'allotjament', 'alojamiento', 'habitació', 'habitación',
      'pernoctació', 'pernocta', 'booking', 'airbnb', 'lloguer', 'alquiler',
      'estada', 'estancia', 'nit', 'noche', 'hospedaje',
    ],
  },
  // Material i subministraments
  {
    category: 'Material',
    keywords: [
      'material', 'subministrament', 'suministro', 'equip', 'equipo', 'eina',
      'herramienta', 'fungible', 'consumible', 'paper', 'tòner', 'tóner',
      'impressió', 'impresión', 'fotocòpia', 'fotocopia', 'papereria',
      'papelería', 'oficina', 'ordinador', 'ordenador', 'mòbil', 'móvil',
      'electrònic', 'electrónico', 'cable', 'bateria', 'batería',
    ],
  },
  // Comunicacions
  {
    category: 'Comunicacions',
    keywords: [
      'telèfon', 'teléfono', 'mòbil', 'móvil', 'internet', 'wifi', 'dades',
      'datos', 'tarifa', 'recàrrega', 'recarga', 'saldo', 'roaming', 'trucada',
      'llamada', 'sms', 'comunicació', 'comunicación', 'sim', 'línea',
    ],
  },
  // Formació
  {
    category: 'Formació',
    keywords: [
      'formació', 'formación', 'curs', 'curso', 'taller', 'seminari', 'seminario',
      'capacitació', 'capacitación', 'llibre', 'libro', 'manual', 'documentació',
      'documentación', 'inscripció', 'inscripción', 'matrícula',
    ],
  },
  // Assegurances
  {
    category: 'Assegurances',
    keywords: [
      'assegurança', 'seguro', 'pòlissa', 'póliza', 'cobertura', 'prima',
      'indemnització', 'indemnización', 'sinistre', 'siniestro',
    ],
  },
  // Serveis professionals
  {
    category: 'Serveis professionals',
    keywords: [
      'assessoria', 'asesoría', 'consultoria', 'consultoría', 'advocat',
      'abogado', 'notari', 'notario', 'gestor', 'traductor', 'intèrpret',
      'intérprete', 'professional', 'honorari', 'honorario', 'factura',
    ],
  },
  // Activitats i esdeveniments
  {
    category: 'Activitats',
    keywords: [
      'activitat', 'actividad', 'esdeveniment', 'evento', 'reunió', 'reunión',
      'conferència', 'conferencia', 'assemblea', 'asamblea', 'jornada',
      'celebració', 'celebración', 'acte', 'acto',
    ],
  },
];

/**
 * Normalitza text per a comparació (minúscules, sense accents)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Suggereix una categoria basant-se en el concepte i/o nom del proveïdor
 * @returns La categoria suggerida o null si no hi ha match clar
 */
export function suggestCategory(
  concept: string,
  counterpartyName?: string | null
): string | null {
  const textToSearch = normalizeText(
    `${concept} ${counterpartyName ?? ''}`
  );

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (textToSearch.includes(normalizedKeyword)) {
        return rule.category;
      }
    }
  }

  return null;
}

/**
 * Retorna totes les categories disponibles (per a selectors)
 */
export function getAvailableCategories(): string[] {
  return CATEGORY_RULES.map(r => r.category);
}
