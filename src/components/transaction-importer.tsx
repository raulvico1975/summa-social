
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/data';
import Papa from 'papaparse';

interface TransactionImporterProps {
  existingTransactions: Transaction[];
  onTransactionsImported: (transactions: Transaction[]) => void;
}

// Function to create a unique key for a transaction to detect duplicates
const createTransactionKey = (tx: { date: string, description: string, amount: number }): string => {
  const date = new Date(tx.date).toISOString().split('T')[0]; // Normalize date to YYYY-MM-DD
  return `${date}|${tx.description.trim()}|${tx.amount.toFixed(2)}`;
};


export function TransactionImporter({ existingTransactions, onTransactionsImported }: TransactionImporterProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseCsv(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const parseCsv = (file: File) => {
    // Create a set of keys for existing transactions for efficient lookup
    const existingTransactionKeys = new Set(existingTransactions.map(createTransactionKey));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const allParsedRows = results.data
            .map((row: any, index: number) => {
                const amount = parseFloat(String(row.Importe || '0').replace(',', '.'));
                if (!row.Fecha || !row.Concepto || isNaN(amount)) {
                    console.warn(`Skipping invalid row ${index + 2}:`, row);
                    return null;
                }

                let date;
                const dateParts = String(row.Fecha).split(/[-/.]/);
                if (dateParts.length === 3) {
                  // Assuming DD/MM/YYYY or DD-MM-YYYY
                  date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
                } else {
                  date = new Date(String(row.Fecha));
                }

                if (isNaN(date.getTime())) {
                    console.warn(`Skipping row with invalid date ${index + 2}:`, row);
                    return null;
                }

                return {
                  id: `imported_${new Date().getTime()}_${index}`,
                  date: date.toISOString(),
                  description: row.Concepto,
                  amount: amount,
                  category: null,
                  document: null,
                } as Transaction;
            })
            .filter((tx): tx is Transaction => tx !== null);
          
          // Filter out duplicates
          const newUniqueTransactions = allParsedRows.filter(tx => {
            const key = createTransactionKey(tx);
            return !existingTransactionKeys.has(key);
          });

          const duplicatesFound = allParsedRows.length - newUniqueTransactions.length;

          if (newUniqueTransactions.length > 0) {
            onTransactionsImported(newUniqueTransactions);
            toast({
              title: 'Importación Exitosa',
              description: `Se han importado ${newUniqueTransactions.length} nuevas transacciones. Se omitieron ${duplicatesFound} duplicados.`,
            });
          } else {
             toast({
              variant: duplicatesFound > 0 ? 'default' : 'destructive',
              title: duplicatesFound > 0 ? 'No hay transacciones nuevas' : 'Error de Importación',
              description: duplicatesFound > 0 ? `Se encontraron y omitieron ${duplicatesFound} transacciones duplicadas.` : 'No se encontraron transacciones válidas en el archivo o ya existen todas. Asegúrate de que las columnas son "Fecha", "Concepto", e "Importe".',
            });
          }
        } catch (error) {
           console.error("Error processing CSV data:", error);
           toast({
            variant: 'destructive',
            title: 'Error de Importación',
            description: 'No se pudo procesar el archivo. Revisa el formato y el contenido.',
          });
        }
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        toast({
          variant: 'destructive',
          title: 'Error de Importación',
          description: 'No se pudo leer el archivo CSV.',
        });
      }
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />
      <Button onClick={handleButtonClick}>
        <FileUp className="mr-2 h-4 w-4" />
        Importar Extracto
      </Button>
    </>
  );
}
