// src/lib/default-data.ts

import type { Category } from '@/lib/data';

/**
 * Categories per defecte per a entitats socials espanyoles.
 * Basades en el Pla General de Comptabilitat per a Entitats Sense Fins Lucratius.
 */

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Donaciones', type: 'income' },
  { name: 'Subvenciones', type: 'income' },
  { name: 'Cuotas de socios', type: 'income' },
  { name: 'Patrocinios', type: 'income' },
  { name: 'Venta de productos/servicios', type: 'income' },
  { name: 'Herencias y legados', type: 'income' },
  { name: 'Eventos y campañas', type: 'income' },
  { name: 'Otros ingresos', type: 'income' },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Alquiler', type: 'expense' },
  { name: 'Suministros de oficina', type: 'expense' },
  { name: 'Servicios públicos', type: 'expense' },
  { name: 'Salarios y seguridad social', type: 'expense' },
  { name: 'Viajes y dietas', type: 'expense' },
  { name: 'Comunicación y marketing', type: 'expense' },
  { name: 'Servicios profesionales', type: 'expense' },
  { name: 'Seguros', type: 'expense' },
  { name: 'Material de proyectos', type: 'expense' },
  { name: 'Formación', type: 'expense' },
  { name: 'Gastos bancarios', type: 'expense' },
  { name: 'Transferencias a terreno o socias', type: 'expense' },
  { name: 'Otros gastos', type: 'expense' },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_INCOME_CATEGORIES,
  ...DEFAULT_EXPENSE_CATEGORIES,
];
