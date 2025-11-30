// src/lib/default-data.ts

type DefaultCategory = {
    nameKey: string;
    type: 'income' | 'expense';
}

/**
 * Categories per defecte per a entitats socials espanyoles.
 * Utilitzem claus de traducció (nameKey) en lloc de noms directes per a la internacionalització.
 */

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { nameKey: 'donations', type: 'income' },
  { nameKey: 'subsidies', type: 'income' },
  { nameKey: 'memberFees', type: 'income' },
  { nameKey: 'sponsorships', type: 'income' },
  { nameKey: 'productSales', type: 'income' },
  { nameKey: 'inheritances', type: 'income' },
  { nameKey: 'events', type: 'income' },
  { nameKey: 'otherIncome', type: 'income' },
];

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { nameKey: 'rent', type: 'expense' },
  { nameKey: 'officeSupplies', type: 'expense' },
  { nameKey: 'utilities', type: 'expense' },
  { nameKey: 'salaries', type: 'expense' },
  { nameKey: 'travel', type: 'expense' },
  { nameKey: 'marketing', type: 'expense' },
  { nameKey: 'professionalServices', type: 'expense' },
  { nameKey: 'insurance', type: 'expense' },
  { nameKey: 'projectMaterials', type: 'expense' },
  { nameKey: 'training', type: 'expense' },
  { nameKey: 'bankFees', type: 'expense' },
  { nameKey: 'missionTransfers', type: 'expense' },
  { nameKey: 'otherExpenses', type: 'expense' },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_INCOME_CATEGORIES,
  ...DEFAULT_EXPENSE_CATEGORIES,
].map(c => ({ name: c.nameKey, type: c.type })); // Adapt for the initialization hook

// We keep the mapping for translation files
export const CATEGORY_TRANSLATION_KEYS = {
    donations: "Donacions",
    subsidies: "Subvencions",
    memberFees: "Quotes de socis",
    sponsorships: "Patrocinis",
    productSales: "Venda de productes/serveis",
    inheritances: "Herències i llegats",
    events: "Esdeveniments i campanyes",
    otherIncome: "Altres ingressos",
    rent: "Lloguer",
    officeSupplies: "Subministraments d'oficina",
    utilities: "Serveis públics",
    salaries: "Salaris i seguretat social",
    travel: "Viatges i dietes",
    marketing: "Comunicació i màrqueting",
    professionalServices: "Serveis professionals",
    insurance: "Assegurances",
    projectMaterials: "Material de projectes",
    training: "Formació",
    bankFees: "Despeses bancàries",
    missionTransfers: "Transferències a terreny o sòcies",
    otherExpenses: "Altres despeses",
};
