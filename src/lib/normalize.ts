// ═══════════════════════════════════════════════════════════════════════════════
// NORMALITZACIÓ DE DADES - Summa Social
// ═══════════════════════════════════════════════════════════════════════════════
// Funcions per normalitzar l'entrada d'usuaris i mantenir coherència visual
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Title Case: Primera lletra de cada paraula en majúscula
 * Usos: Noms de persones, adreces, noms d'organitzacions
 * Exemple: "maria garcía lópez" → "Maria García López"
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  
  // Paraules que es mantenen en minúscula (excepte si són la primera)
  const minorWords = ['de', 'del', 'la', 'las', 'el', 'los', 'i', 'y', 'a', 'en', 'amb', 'per', 'the', 'of', 'and'];
  
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
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
  return {
    ...data,
    name: data.name ? toSentenceCase(data.name) : data.name,
    description: data.description ? normalizeSentences(data.description) : data.description,
  };
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
 */
export function normalizeTransaction<T extends Record<string, any>>(data: T): T {
  return {
    ...data,
    description: data.description ? normalizeBankDescription(data.description) : data.description,
  };
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