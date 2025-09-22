
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/data';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface TransactionImporterProps {
  existingTransactions: Transaction[];
  onTransactionsImported: (transactions: Transaction[]) => void;
}

// Function to create a unique key for a transaction to detect duplicates
const createTransactionKey = (tx: { date: string, description: string, amount: number }): string => {
  const date = new Date(tx.date).toISOString().split('T')[0]; // Normalize date to YYYY-MM-DD
  return `${date}|${tx.description.trim()}|${tx.amount.toFixed(2)}`;
};

const findColumnIndex = (header: string[], potentialNames: string[]): number => {
    for (const name of potentialNames) {
        const index = header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (index !== -1) return index;
    }
    return -1;
}

export function TransactionImporter({ existingTransactions, onTransactionsImported }: TransactionImporterProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.name.endsWith('.csv')) {
            parseCsv(file);
        } else if (file.name.endsWith('.xlsx')) {
            parseXlsx(file);
        } else {
            toast({
                variant: 'destructive',
                title: 'Formato no soportado',
                description: 'Por favor, sube un archivo .csv o .xlsx',
            });
        }
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };
  
  const parseXlsx = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!json || json.length === 0) {
            throw new Error("El archivo XLSX está vacío o no tiene un formato válido.");
        }
        
        const header = (json[0] as string[]).map(h => String(h || '').trim());
        
        const dateIndex = findColumnIndex(header, ['fecha', 'data']);
        const conceptIndex = findColumnIndex(header, ['concepto', 'descripció', 'description']);
        const amountIndex = findColumnIndex(header, ['importe', 'import', 'amount', 'quantitat']);

        if (dateIndex === -1 || conceptIndex === -1 || amountIndex === -1) {
            const missing = [
                ...(dateIndex === -1 ? ['Fecha'] : []),
                ...(conceptIndex === -1 ? ['Concepto'] : []),
                ...(amountIndex === -1 ? ['Importe'] : [])
            ].join(', ');
            throw new Error(`Columnas requeridas no encontradas: ${missing}. Cabeceras encontradas: ${header.join(', ')}`);
        }

        const dataRows = json.slice(1);
        const parsedData = dataRows.map((row: any) => ({
            Fecha: row[dateIndex],
            Concepto: row[conceptIndex],
            Importe: row[amountIndex]
        }));

        processParsedData(parsedData);
      } catch (error: any) {
        console.error("Error processing XLSX data:", error);
        toast({
          variant: 'destructive',
          title: 'Error de Importación',
          description: error.message || 'No se pudo procesar el archivo XLSX.',
          duration: 9000,
        });
      }
    };
    reader.onerror = () => {
         toast({
          variant: 'destructive',
          title: 'Error de Lectura',
          description: 'No se pudo leer el archivo.',
        });
    }
    reader.readAsBinaryString(file);
  }

  const parseCsv = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processParsedData(results.data);
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

  const processParsedData = (data: any[]) => {
     // Create a set of keys for existing transactions for efficient lookup
    const existingTransactionKeys = new Set(existingTransactions.map(createTransactionKey));

    try {
        const allParsedRows = data
        .map((row: any, index: number) => {
            // Handle XLSX date serial numbers
            let dateValue = row.Fecha;
            if (typeof dateValue === 'number') {
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
                // Adjust for timezone offset to get the correct date
                dateValue = new Date(jsDate.getTime() + (jsDate.getTimezoneOffset() * 60 * 1000));
            }

            const amountString = String(row.Importe || '0').replace(',', '.');
            const amount = parseFloat(amountString);
            
            if (!dateValue || !row.Concepto || isNaN(amount)) {
                console.warn(`Skipping invalid row ${index + 2}:`, row);
                return null;
            }

            let date;
            if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                const dateString = String(dateValue);
                const partsDMY = dateString.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/); // DD/MM/YYYY
                const partsYMD = dateString.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/); // YYYY-MM-DD
                
                if (partsDMY) {
                    date = new Date(`${partsDMY[3]}-${partsDMY[2]}-${partsDMY[1]}`);
                } else if (partsYMD) {
                    date = new Date(dateString);
                } else {
                    date = new Date(dateString); // Fallback for other formats
                }
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
                title: duplicatesFound > 0 ? 'No hay transacciones nuevas' : 'No se encontraron transacciones',
                description: duplicatesFound > 0 
                    ? `Se encontraron y omitieron ${duplicatesFound} transacciones duplicadas.` 
                    : 'No se encontraron transacciones válidas en el archivo o ya existen todas.',
             });
        }
    } catch (error: any) {
        console.error("Error processing parsed data:", error);
        toast({
        variant: 'destructive',
        title: 'Error de Procesamiento',
        description: error.message || 'No se pudo procesar el contenido del archivo. Revisa el formato y los datos.',
        });
    }
  }


  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .xlsx"
        className="hidden"
      />
      <Button onClick={handleButtonClick}>
        <FileUp className="mr-2 h-4 w-4" />
        Importar Extracto
      </Button>
    </>
  );
}
