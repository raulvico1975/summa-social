export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  document: string | null; // URL to the document or null
  emisorId?: string | null;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

export type Emisor = {
  id: string;
  name: string;
  taxId: string; // DNI/CIF
  zipCode: string;
  type: 'donor' | 'supplier' | 'volunteer';
};

export const transactions: Transaction[] = [
  {
    id: 'txn_1',
    date: '2024-05-01',
    description: 'Donación de GlobalGiving',
    amount: 1500.0,
    category: 'Donaciones',
    document: null,
    emisorId: 'cont_1',
  },
  {
    id: 'txn_2',
    date: '2024-05-03',
    description: 'Compra de material de oficina',
    amount: -75.5,
    category: 'Suministros de Oficina',
    document: null,
    emisorId: 'cont_2',
  },
  {
    id: 'txn_3',
    date: '2024-05-05',
    description: 'Pago de alquiler de local',
    amount: -800.0,
    category: 'Alquiler',
    document: null,
    emisorId: null,
  },
  {
    id: 'txn_4',
    date: '2024-05-10',
    description: 'Subvención del Ayuntamiento',
    amount: 5000.0,
    category: 'Subvenciones',
    document: null,
    emisorId: 'cont_4',
  },
  {
    id: 'txn_5',
    date: '2024-05-12',
    description: 'Factura de luz - Iberdrola',
    amount: -120.0,
    category: 'Servicios Públicos',
    document: null,
    emisorId: null,
  },
  {
    id: 'txn_6',
    date: '2024-05-15',
    description: 'Venta de merchandising',
    amount: 250.0,
    category: null,
    document: null,
    emisorId: null,
  },
  {
    id: 'txn_7',
    date: '2024-05-20',
    description: 'Pago a proveedor - Imprenta rápida',
    amount: -300.0,
    category: null,
    document: null,
    emisorId: null,
  },
  {
    id: 'txn_8',
    date: '2024-05-22',
    description: 'Reembolso de gastos de viaje',
    amount: -55.25,
    category: 'Viajes',
    document: null,
    emisorId: 'cont_3',
  },
];

export const categories: Category[] = [
  { id: 'cat_1', name: 'Donaciones', type: 'income' },
  { id: 'cat_2', name: 'Subvenciones', type: 'income' },
  { id: 'cat_10', name: 'Altres Ingressos', type: 'income' },
  { id: 'cat_3', name: 'Alquiler', type: 'expense' },
  { id: 'cat_4', name: 'Suministros de Oficina', type: 'expense' },
  { id: 'cat_5', name: 'Servicios Públicos', type: 'expense' },
  { id: 'cat_6', name: 'Viajes', type: 'expense' },
  { id: 'cat_7', name: 'Salarios', type: 'expense' },
  { id: 'cat_8', name: 'Transferències de Missió', type: 'expense' },
];

export const emissors: Emisor[] = [
    { id: 'cont_1', name: 'GlobalGiving Foundation', taxId: 'G12345678', zipCode: '28010', type: 'donor' },
    { id: 'cont_2', name: 'OfiMaterial S.L.', taxId: 'B87654321', zipCode: '08001', type: 'supplier' },
    { id: 'cont_3', name: 'Ana García', taxId: '45678901Z', zipCode: '41001', type: 'volunteer' },
    { id: 'cont_4', name: 'Ayuntamiento de la Ciudad', taxId: 'P98765432', zipCode: '28014', type: 'donor' },
];
