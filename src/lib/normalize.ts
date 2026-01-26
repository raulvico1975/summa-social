// ═══════════════════════════════════════════════════════════════════════════════
// NORMALITZACIÓ DE DADES - Summa Social
// ═══════════════════════════════════════════════════════════════════════════════
// Funcions per normalitzar l'entrada d'usuaris i mantenir coherència visual
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Elimina accents d'un text (per export Model 182 gestoria)
 * Exemple: "García López" → "Garcia Lopez"
 */
export function removeAccents(text: string | null | undefined): string {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Title Case: Primera lletra de cada paraula en majúscula
 * Usos: Noms de persones, adreces, noms d'organitzacions
 * Exemple: "maria garcía lópez" → "Maria García López"
 * Exemple: "empresa ejemplo s.l." → "Empresa Ejemplo S.L."
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';

  // Paraules que es mantenen en minúscula (excepte si són la primera)
  const minorWords = ['de', 'del', 'la', 'las', 'el', 'los', 'i', 'y', 'a', 'en', 'amb', 'per', 'the', 'of', 'and'];

  // Sigles empresarials que es mantenen en majúscules
  // Normalitzem variants com "s.l", "sl", "s.l." a la forma canònica
  const businessAcronyms: Record<string, string> = {
    'sa': 'S.A.',
    's.a': 'S.A.',
    's.a.': 'S.A.',
    'sl': 'S.L.',
    's.l': 'S.L.',
    's.l.': 'S.L.',
    'slu': 'S.L.U.',
    's.l.u': 'S.L.U.',
    's.l.u.': 'S.L.U.',
    'sll': 'S.L.L.',
    's.l.l': 'S.L.L.',
    's.l.l.': 'S.L.L.',
    'sc': 'S.C.',
    's.c': 'S.C.',
    's.c.': 'S.C.',
    'scp': 'S.C.P.',
    's.c.p': 'S.C.P.',
    's.c.p.': 'S.C.P.',
    'scoop': 'S.COOP.',
    's.coop': 'S.COOP.',
    's.coop.': 'S.COOP.',
    'cb': 'C.B.',
    'c.b': 'C.B.',
    'c.b.': 'C.B.',
    'sau': 'S.A.U.',
    's.a.u': 'S.A.U.',
    's.a.u.': 'S.A.U.',
  };

  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Comprovar si és una sigla empresarial
      const acronym = businessAcronyms[word];
      if (acronym) {
        return acronym;
      }

      if (index > 0 && minorWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Sentence Case: Primera lletra de la primera paraula en majúscula
 * Usos: Categories, projectes, descripcions
 * Exemple: "QUOTES SOCIS ANUALS" → "Quotes socis anuals"
 */
export function toSentenceCase(text: string | null | undefined): string {
  if (!text) return '';
  
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Normalitza frases (per a notes i descripcions llargues)
 * Primera lletra de cada frase en majúscula
 * Exemple: "això és una nota. i continua aquí" → "Això és una nota. I continua aquí"
 */
export function normalizeSentences(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .trim()
    // Dividir per punts, interrogants, exclamacions
    .split(/([.!?]+\s*)/)
    .map((segment, index) => {
      if (index % 2 === 1) return segment; // Mantenir els separadors
      if (segment.length === 0) return segment;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join('');
}

/**
 * Normalitza DNI/CIF espanyol
 * Majúscules, sense espais ni guions
 * Exemple: "b-12.345.678" → "B12345678"
 */
export function normalizeTaxId(taxId: string | null | undefined): string {
  if (!taxId) return '';

  return taxId
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');
}

/**
 * Tipus de document fiscal espanyol
 */
export type SpanishTaxIdType = 'DNI' | 'NIE' | 'CIF' | null;

/**
 * Valida i detecta el tipus de document fiscal espanyol (DNI/NIE/CIF)
 * Retorna el tipus si és vàlid, null si no ho és
 *
 * DNI: 8 dígits + lletra de control
 * NIE: X/Y/Z + 7 dígits + lletra de control
 * CIF: lletra + 7 dígits + control (lletra o dígit segons tipus)
 *
 * Guardrail: si dubte → null (millor pendent que donant fals)
 */
export function getSpanishTaxIdType(rawTaxId: string | null | undefined): SpanishTaxIdType {
  if (!rawTaxId) return null;

  const taxId = normalizeTaxId(rawTaxId);
  if (taxId.length < 8 || taxId.length > 9) return null;

  // DNI: 8 dígits + lletra
  const dniPattern = /^(\d{8})([A-Z])$/;
  const dniMatch = taxId.match(dniPattern);
  if (dniMatch) {
    const [, numbers, letter] = dniMatch;
    const controlLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = controlLetters[parseInt(numbers, 10) % 23];
    if (letter === expectedLetter) return 'DNI';
    return null; // Lletra de control incorrecta
  }

  // NIE: X/Y/Z + 7 dígits + lletra
  const niePattern = /^([XYZ])(\d{7})([A-Z])$/;
  const nieMatch = taxId.match(niePattern);
  if (nieMatch) {
    const [, prefix, numbers, letter] = nieMatch;
    const controlLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    // X=0, Y=1, Z=2
    const prefixValue = prefix === 'X' ? '0' : prefix === 'Y' ? '1' : '2';
    const fullNumber = parseInt(prefixValue + numbers, 10);
    const expectedLetter = controlLetters[fullNumber % 23];
    if (letter === expectedLetter) return 'NIE';
    return null; // Lletra de control incorrecta
  }

  // CIF: lletra + 7 dígits + control
  const cifPattern = /^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([A-J0-9])$/;
  const cifMatch = taxId.match(cifPattern);
  if (cifMatch) {
    const [, orgType, digits, control] = cifMatch;

    // Càlcul del dígit de control CIF
    let sumA = 0;
    let sumB = 0;

    for (let i = 0; i < 7; i++) {
      const digit = parseInt(digits[i], 10);
      if (i % 2 === 0) {
        // Posicions parells (0, 2, 4, 6): multiplicar per 2
        const doubled = digit * 2;
        sumB += doubled > 9 ? doubled - 9 : doubled;
      } else {
        // Posicions senars (1, 3, 5): sumar directament
        sumA += digit;
      }
    }

    const total = sumA + sumB;
    const controlDigit = (10 - (total % 10)) % 10;
    const controlLetter = 'JABCDEFGHI'[controlDigit];

    // Segons el tipus d'organització, el control pot ser lletra o número
    // P, Q, R, S, W: sempre lletra
    // A, B: sempre número
    // Altres: ambdós vàlids
    const letterOrgs = 'PQRSW';
    const numberOrgs = 'AB';

    if (letterOrgs.includes(orgType)) {
      if (control === controlLetter) return 'CIF';
    } else if (numberOrgs.includes(orgType)) {
      if (control === controlDigit.toString()) return 'CIF';
    } else {
      // Acceptar lletra o número
      if (control === controlLetter || control === controlDigit.toString()) return 'CIF';
    }

    return null; // Control incorrecte
  }

  return null; // No coincideix cap patró
}

/**
 * Valida si un identificador és un DNI/NIE/CIF espanyol vàlid
 * Retorna true només si és un identificador fiscal vàlid
 *
 * Guardrail: si dubte → false (millor pendent que donant fals)
 */
export function isValidSpanishTaxId(rawTaxId: string | null | undefined): boolean {
  return getSpanishTaxIdType(rawTaxId) !== null;
}

/**
 * Normalitza IBAN (format per guardar - sense espais per remeses SEPA)
 * Exemple: "ES12 3456 7890 1234 5678 9012" → "ES1234567890123456789012"
 */
export function normalizeIBAN(iban: string | null | undefined): string {
  if (!iban) return '';
  
  return iban
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');
}

/**
 * Formata IBAN per mostrar a la UI (amb espais cada 4 dígits)
 * Exemple: "ES1234567890123456789012" → "ES12 3456 7890 1234 5678 9012"
 */
export function formatIBANDisplay(iban: string | null | undefined): string {
  if (!iban) return '';
  
  const clean = normalizeIBAN(iban);
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Normalitza email
 * Tot minúscules, sense espais
 * Exemple: "Maria.Garcia@Gmail.COM" → "maria.garcia@gmail.com"
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/\s/g, '');
}

/**
 * Normalitza codi postal espanyol
 * 5 dígits, amb zeros a l'esquerra si cal
 * Exemple: "8001" → "08001"
 */
export function normalizeZipCode(zipCode: string | null | undefined): string {
  if (!zipCode) return '';
  
  const digits = zipCode.replace(/\D/g, '');
  if (digits.length === 0) return '';
  
  // Assegurar 5 dígits amb zeros a l'esquerra
  return digits.padStart(5, '0').slice(0, 5);
}

/**
 * Normalitza telèfon espanyol
 * Format: "600 123 456" o "93 123 45 67"
 * Exemple: "600123456" → "600 123 456"
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  
  // Mòbil (9 dígits començant per 6 o 7)
  if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  // Fix (9 dígits començant per 9)
  if (digits.length === 9 && digits.startsWith('9')) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  
  // Internacional o altres formats - retornar amb espais cada 3 dígits
  if (digits.length > 9) {
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }
  
  return digits;
}

/**
 * Normalitza descripció bancària
 * De MAJÚSCULES a format llegible
 * Exemple: "TRANSFERENCIA SEPA DE GARCIA LOPEZ MARIA" → "Transferencia sepa de Garcia Lopez Maria"
 */
export function normalizeBankDescription(description: string | null | undefined): string {
  if (!description) return '';
  
  const trimmed = description.trim();
  if (trimmed.length === 0) return '';
  
  // Si està tot en majúscules, convertir a sentence case intel·ligent
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    // Detectar possibles noms propis (paraules de més de 2 lletres al final)
    const words = trimmed.toLowerCase().split(/\s+/);
    
    return words.map((word, index) => {
      // Primera paraula sempre majúscula
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Paraules curtes (preposicions) en minúscula
      if (word.length <= 2) {
        return word;
      }
      // Possibles noms propis (comprovació simple: paraules >3 lletres després de "de")
      if (index > 0 && ['de', 'a', 'para'].includes(words[index - 1]) && word.length > 2) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  }
  
  return trimmed;
}

/**
 * Normalitza adreça
 * Title Case amb excepcions per números i abreviatures
 * Exemple: "c/ major 5, 2n 3a" → "C/ Major 5, 2n 3a"
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  
  return address
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      // Mantenir números i ordinals com estan
      if (/^\d/.test(word) || /^\d+[ºªnra]$/i.test(word)) {
        return word.toLowerCase();
      }
      // Abreviatures de carrer
      if (/^(c\/|av\/|pg\/|pl\/|ctra\/?)$/i.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      // Primera lletra majúscula
      if (index === 0 || word.length > 2) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONS COMPOSTES PER A CADA TIPUS D'ENTITAT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalitza dades d'un contacte (donant, proveïdor, treballador)
 */
export function normalizeContact<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    name: data.name ? toTitleCase(data.name) : data.name,
    taxId: data.taxId ? normalizeTaxId(data.taxId) : data.taxId,
    zipCode: data.zipCode ? normalizeZipCode(data.zipCode) : data.zipCode,
    email: data.email ? normalizeEmail(data.email) : data.email,
    phone: data.phone ? normalizePhone(data.phone) : data.phone,
    address: data.address ? normalizeAddress(data.address) : data.address,
    iban: data.iban ? normalizeIBAN(data.iban) : data.iban,
    notes: data.notes ? normalizeSentences(data.notes) : data.notes,
  };
}

/**
 * Normalitza dades d'una categoria
 */
export function normalizeCategory<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    name: data.name ? toSentenceCase(data.name) : data.name,
  };
}

/**
 * Normalitza dades d'un projecte
 */
export function normalizeProject<T extends Record<string, any>>(data: T): T {
  const normalized: any = {
    ...data,
    name: data.name ? toSentenceCase(data.name) : data.name,
  };

  // Only add description if it exists (avoid undefined values in Firestore)
  if (data.description !== undefined) {
    normalized.description = data.description ? normalizeSentences(data.description) : data.description;
  }

  return normalized;
}

/**
 * Normalitza dades d'una organització
 */
export function normalizeOrganization<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    name: data.name ? toTitleCase(data.name) : data.name,
    taxId: data.taxId ? normalizeTaxId(data.taxId) : data.taxId,
  };
}

/**
 * Normalitza dades d'un usuari
 */
export function normalizeUser<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    displayName: data.displayName ? toTitleCase(data.displayName) : data.displayName,
    email: data.email ? normalizeEmail(data.email) : data.email,
  };
}

/**
 * Normalitza una transacció importada
 * Elimina camps undefined (Firestore no els accepta)
 */
export function normalizeTransaction<T extends Record<string, any>>(data: T): T {
  const normalized = {
    ...data,
    description: data.description ? normalizeBankDescription(data.description) : data.description,
  };

  // Eliminar camps undefined (Firestore no accepta undefined)
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === undefined) {
      delete normalized[key];
    }
  });

  return normalized as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT NUMÈRIC EUROPEU
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formata un número en format europeu
 * Exemple: 1234.56 → "1.234,56"
 */
export function formatNumberEU(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  return num.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formata un import monetari en format europeu amb símbol €
 * Exemple: 1234.56 → "1.234,56 €"
 */
export function formatCurrencyEU(
  value: number | string | null | undefined,
  showSymbol: boolean = true
): string {
  if (value === null || value === undefined || value === '') return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  const formatted = num.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return showSymbol ? `${formatted} €` : formatted;
}

/**
 * Formata un import per a PDF (sense símbol, format net)
 * Exemple: 1234.56 → "1.234,56"
 */
export function formatCurrencyPDF(value: number | string | null | undefined): string {
  return formatCurrencyEU(value, false);
}

/**
 * Parseja un número en format europeu a número JavaScript
 * Exemple: "1.234,56" → 1234.56
 */
export function parseNumberEU(value: string | null | undefined): number | null {
  if (!value) return null;
  
  // Netejar espais i símbol €
  let clean = value.trim().replace(/\s/g, '').replace('€', '');
  
  // Detectar format: si té coma com a últim separador, és europeu
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Format europeu: 1.234,56
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Format americà o sense decimals: 1,234.56 o 1.234
    clean = clean.replace(/,/g, '');
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Formata una data en format europeu
 * Exemple: "2024-12-06" → "06/12/2024"
 */
export function formatDateEU(
  date: string | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return d.toLocaleDateString('es-ES', options);
}

/**
 * Formata un percentatge en format europeu
 * Exemple: 0.156 → "15,6%"
 */
export function formatPercentageEU(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined) return '';

  const percent = value * 100;
  return `${formatNumberEU(percent, decimals)}%`;
}

/**
 * Formata una data en format DD.MM.YYYY
 * Accepta:
 * - Firestore Timestamp (objecte amb toDate())
 * - string ISO (2025-12-04T23:00:00.000Z)
 * - string YYYY-MM-DD
 * - Date object
 * - null/undefined → retorna '-'
 */
export function formatDateDMY(
  value: string | Date | { toDate: () => Date } | null | undefined
): string {
  if (!value) return '-';

  let date: Date;

  // Firestore Timestamp
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    date = value.toDate();
  }
  // Date object
  else if (value instanceof Date) {
    date = value;
  }
  // String
  else if (typeof value === 'string') {
    // ISO string (conté T)
    if (value.includes('T')) {
      date = new Date(value);
    }
    // YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Afegim T00:00:00 per evitar problemes de timezone
      date = new Date(value + 'T00:00:00');
    }
    // Altres formats: intentem parsejar
    else {
      date = new Date(value);
    }
  }
  // Fallback
  else {
    return '-';
  }

  // Validar que la data és vàlida
  if (isNaN(date.getTime())) {
    return '-';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Formata una data en format curt europeu: DD/MM/YY
 * Exemple: 18/12/25
 *
 * Accepta:
 * - Firestore Timestamp (objecte amb toDate())
 * - string ISO (2025-12-04T23:00:00.000Z)
 * - string YYYY-MM-DD
 * - Date object
 * - null/undefined → retorna '-'
 */
export function formatDateShort(
  value: string | Date | { toDate: () => Date } | null | undefined
): string {
  if (!value) return '-';

  let date: Date;

  // Firestore Timestamp
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    date = value.toDate();
  }
  // Date object
  else if (value instanceof Date) {
    date = value;
  }
  // String
  else if (typeof value === 'string') {
    // ISO string (conté T)
    if (value.includes('T')) {
      date = new Date(value);
    }
    // YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Afegim T00:00:00 per evitar problemes de timezone
      date = new Date(value + 'T00:00:00');
    }
    // Altres formats: intentem parsejar
    else {
      date = new Date(value);
    }
  }
  // Fallback
  else {
    return '-';
  }

  // Validar que la data és vàlida
  if (isNaN(date.getTime())) {
    return '-';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2); // Últims 2 dígits

  return `${day}/${month}/${year}`;
}