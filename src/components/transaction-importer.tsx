
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/data';
import Papa from 'papaparse';

interface TransactionImporterProps {
  onTransactionsImported: (transactions: Transaction[]) => void;
}

export function TransactionImporter({ onTransactionsImported }: TransactionImporterProps) {
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
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const newTransactions = results.data
          .map((row: any, index: number) => {
            const amount = parseFloat(String(row.Importe || '0').replace(',', '.'));
            if (!row.Fecha || !row.Concepto || isNaN(amount)) {
                console.warn(`Skipping invalid row ${index + 2}:`, row);
                return null;
            }

            // Attempt to create a valid date
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
              document: 'N/A',
            } as Transaction;
          })
          .filter((tx): tx is Transaction => tx !== null);


          if (newTransactions.length > 0) {
            onTransactionsImported(newTransactions);
            toast({
              title: 'Importación Exitosa',
              description: `Se han importado ${newTransactions.length} nuevas transacciones.`,
            });
          } else {
             toast({
              variant: 'destructive',
              title: 'Error de Importación',
              description: 'No se encontraron transacciones válidas en el archivo. Asegúrate de que las columnas son "Fecha", "Concepto", e "Importe".',
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
