/**
 * Dades sintètiques per seed demo
 *
 * Totes les dades són 100% fictícies.
 * NO representen persones, empreses o entitats reals.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Noms i cognoms sintètics catalans
// ─────────────────────────────────────────────────────────────────────────────

export const FIRST_NAMES = [
  'Arnau', 'Berta', 'Carles', 'Diana', 'Eduard', 'Fiona', 'Gerard', 'Helena',
  'Ignasi', 'Joana', 'Lluc', 'Marta', 'Nil', 'Olga', 'Pau', 'Queralt',
  'Roger', 'Sílvia', 'Toni', 'Úrsula', 'Víctor', 'Xènia', 'Yago', 'Zoe',
  'Alba', 'Bernat', 'Clara', 'David', 'Eloi', 'Gemma', 'Hugo', 'Iris',
  'Jan', 'Laia', 'Marc', 'Núria', 'Oriol', 'Pilar', 'Quim', 'Rosa',
];

export const LAST_NAMES = [
  'Puig', 'Serra', 'Costa', 'Roca', 'Ferrer', 'Vidal', 'Martí', 'Soler',
  'Font', 'Garcia', 'Molina', 'López', 'Prats', 'Camps', 'Ros', 'Vila',
  'Bosch', 'Comas', 'Mas', 'Sala', 'Pons', 'Ribas', 'Casas', 'Giralt',
  'Badia', 'Torra', 'Plana', 'Nadal', 'Mestre', 'Sanchez', 'Torres', 'Ramon',
];

// ─────────────────────────────────────────────────────────────────────────────
// Noms d'empreses sintètics
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY_PREFIXES = [
  'Serveis', 'Gestió', 'Innovació', 'Taller', 'Centre', 'Espai', 'Grup',
  'Solucions', 'Projectes', 'Assessoria', 'Consultoria', 'Agència',
];

export const COMPANY_SUFFIXES = [
  'Mediterrani', 'Catalunya', 'Pirineus', 'Costa', 'Delta', 'Litoral',
  'Tramuntana', 'Mestral', 'Garbi', 'Garbí', 'Llevant', 'Ponent',
];

export const COMPANY_TYPES = ['SL', 'SLU', 'SA', 'SCCL', 'COOP'];

// ─────────────────────────────────────────────────────────────────────────────
// Categories predefinides
// ─────────────────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  { name: 'Material oficina', type: 'expense' as const },
  { name: 'Subministraments', type: 'expense' as const },
  { name: 'Lloguer', type: 'expense' as const },
  { name: 'Assegurances', type: 'expense' as const },
  { name: 'Serveis professionals', type: 'expense' as const },
  { name: 'Comunicació', type: 'expense' as const },
  { name: 'Transport', type: 'expense' as const },
  { name: 'Formació', type: 'expense' as const },
  { name: 'Manteniment', type: 'expense' as const },
  { name: 'Altres despeses', type: 'expense' as const },
];

export const INCOME_CATEGORIES = [
  { name: 'Donacions', type: 'income' as const },
  { name: 'Quotes socis', type: 'income' as const },
  { name: 'Subvencions', type: 'income' as const },
  { name: 'Activitats', type: 'income' as const },
  { name: 'Patrocinis', type: 'income' as const },
  { name: 'Altres ingressos', type: 'income' as const },
];

// ─────────────────────────────────────────────────────────────────────────────
// Descripcions tipus per transaccions
// ─────────────────────────────────────────────────────────────────────────────

export const EXPENSE_DESCRIPTIONS = [
  'Factura subministraments',
  'Material per activitats',
  'Despeses de representació',
  'Factura serveis informàtics',
  'Quota mensual lloguer',
  'Factura electricitat',
  'Factura gas',
  'Factura telèfon i internet',
  'Material fungible',
  'Reparacions locals',
  'Despeses viatge',
  'Factura impressió',
  'Material neteja',
  'Assegurança RC',
  'Quota gestoria',
];

export const INCOME_DESCRIPTIONS = [
  'Donació anual',
  'Aportació extraordinària',
  'Quota soci',
  'Subvenció Ajuntament',
  'Subvenció Generalitat',
  'Subvenció Diputació',
  'Ingrés activitat solidària',
  'Patrocini empresa',
  'Col·laboració entitat',
  'Recaptació campanya',
];

// ─────────────────────────────────────────────────────────────────────────────
// Projectes i partides
// ─────────────────────────────────────────────────────────────────────────────

export const PROJECT_NAMES = [
  'Programa Acompanyament Social',
  'Projecte Inclusió Laboral',
  'Campanya Sensibilització',
  'Formació i Capacitació',
];

export const BUDGET_LINE_TYPES = [
  { name: 'Personal contractat', code: 'A1' },
  { name: 'Personal voluntari', code: 'A2' },
  { name: 'Despeses de local', code: 'B1' },
  { name: 'Material fungible', code: 'B2' },
  { name: 'Material inventariable', code: 'B3' },
  { name: 'Transport i viatges', code: 'C1' },
  { name: 'Formació', code: 'C2' },
  { name: 'Comunicació', code: 'C3' },
  { name: 'Serveis externs', code: 'D1' },
  { name: 'Altres despeses', code: 'D2' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Adreces sintètiques
// ─────────────────────────────────────────────────────────────────────────────

export const STREET_NAMES = [
  'Carrer Major', 'Avinguda Diagonal', 'Passeig de Gràcia', 'Rambla Nova',
  'Carrer del Pi', 'Plaça Catalunya', 'Carrer Nou', 'Avinguda Mistral',
  'Carrer de la Pau', 'Passeig Marítim', 'Carrer Ample', 'Via Augusta',
];

export const CITIES = [
  { name: 'Barcelona', province: 'Barcelona', zip: '08' },
  { name: 'Girona', province: 'Girona', zip: '17' },
  { name: 'Lleida', province: 'Lleida', zip: '25' },
  { name: 'Tarragona', province: 'Tarragona', zip: '43' },
  { name: 'Sabadell', province: 'Barcelona', zip: '08' },
  { name: 'Terrassa', province: 'Barcelona', zip: '08' },
  { name: 'Reus', province: 'Tarragona', zip: '43' },
  { name: 'Manresa', province: 'Barcelona', zip: '08' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers per generar dades aleatòries deterministes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generador pseudo-aleatori determinista (seedable)
 * Basat en mulberry32
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickRandom<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

export function pickRandomN<T>(array: T[], n: number, random: () => number): T[] {
  const shuffled = [...array].sort(() => random() - 0.5);
  return shuffled.slice(0, n);
}

export function generateNIF(random: () => number): string {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const num = Math.floor(random() * 100000000);
  const letter = letters[num % 23];
  return `${num.toString().padStart(8, '0')}${letter}`;
}

export function generateCIF(random: () => number): string {
  const letters = 'ABCDEFGHJKLMNPQRSUVW';
  const letter = pickRandom(letters.split(''), random);
  const num = Math.floor(random() * 10000000);
  const control = Math.floor(random() * 10);
  return `${letter}${num.toString().padStart(7, '0')}${control}`;
}

export function generateIBAN(random: () => number): string {
  const entity = Math.floor(random() * 10000).toString().padStart(4, '0');
  const office = Math.floor(random() * 10000).toString().padStart(4, '0');
  const control = Math.floor(random() * 100).toString().padStart(2, '0');
  const account = Math.floor(random() * 10000000000).toString().padStart(10, '0');
  return `ES${Math.floor(random() * 100).toString().padStart(2, '0')}${entity}${office}${control}${account}`;
}

export function generatePhone(random: () => number): string {
  const prefixes = ['93', '97', '972', '973', '977', '6'];
  const prefix = pickRandom(prefixes, random);
  const rest = Math.floor(random() * 10000000).toString().padStart(9 - prefix.length, '0');
  return `${prefix}${rest}`;
}

export function generateEmail(name: string, surname: string, random: () => number): string {
  const domains = ['correu.cat', 'mail.cat', 'entitat.org', 'demo.test'];
  const domain = pickRandom(domains, random);
  const normalized = `${name.toLowerCase()}.${surname.toLowerCase()}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z.]/g, '');
  return `${normalized}@${domain}`;
}
