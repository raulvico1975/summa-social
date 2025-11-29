

// All data is now managed in Firestore. This file only contains type definitions.

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  document: string | null;
  emisorId?: string | null;
  projectId?: string | null;
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

export type Project = {
  id: string;
  name: string;
  funderId: string | null; // Emisor ID of the funder
};
