export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string | null;
  document: 'present' | 'missing' | 'not-required';
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
};

export const transactions: Transaction[] = [
  {
    id: 'txn_1',
    date: '2024-05-01',
    description: 'Donación de GlobalGiving',
    amount: 1500.0,
    type: 'income',
    category: 'Donaciones',
    document: 'present',
  },
  {
    id: 'txn_2',
    date: '2024-05-03',
    description: 'Compra de material de oficina',
    amount: -75.5,
    type: 'expense',
    category: 'Suministros de Oficina',
    document: 'present',
  },
  {
    id: 'txn_3',
    date: '2024-05-05',
    description: 'Pago de alquiler de local',
    amount: -800.0,
    type: 'expense',
    category: 'Alquiler',
    document: 'missing',
  },
  {
    id: 'txn_4',
    date: '2024-05-10',
    description: 'Subvención del Ayuntamiento',
    amount: 5000.0,
    type: 'income',
    category: 'Subvenciones',
    document: 'present',
  },
  {
    id: 'txn_5',
    date: '2024-05-12',
    description: 'Factura de luz - Iberdrola',
    amount: -120.0,
    type: 'expense',
    category: 'Servicios Públicos',
    document: 'missing',
  },
  {
    id: 'txn_6',
    date: '2024-05-15',
    description: 'Venta de merchandising',
    amount: 250.0,
    type: 'income',
    category: null,
    document: 'not-required',
  },
  {
    id: 'txn_7',
    date: '2024-05-20',
    description: 'Pago a proveedor - Imprenta rápida',
    amount: -300.0,
    type: 'expense',
    category: null,
    document: 'missing',
  },
  {
    id: 'txn_8',
    date: '2024-05-22',
    description: 'Reembolso de gastos de viaje',
    amount: -55.25,
    type: 'expense',
    category: 'Viajes',
    document: 'present',
  },
];

export const categories: Category[] = [
  { id: 'cat_1', name: 'Donaciones', type: 'income' },
  { id: 'cat_2', name: 'Subvenciones', type: 'income' },
  { id: 'cat_3', name: 'Alquiler', type: 'expense' },
  { id: 'cat_4', name: 'Suministros de Oficina', type: 'expense' },
  { id: 'cat_5', name: 'Servicios Públicos', type: 'expense' },
  { id: 'cat_6', name: 'Viajes', type: 'expense' },
  { id: 'cat_7', name: 'Salarios', type: 'expense' },
];
