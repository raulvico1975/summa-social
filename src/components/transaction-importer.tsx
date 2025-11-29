
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, ChevronDown, Trash2, ListPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, Emisor } from '@/lib/data';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { inferContact } from '@/ai/flows/infer-contact';
import { useAppLog } from '@/hooks/use-app-log';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';


type ImportMode = 'append' | 'replace';

interface TransactionImporterProps {
  existingTransactions: Transaction[];
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

// Keywords to identify the header row
const headerKeywords = ['fecha', 'concepto', 'importe', 'descrip', 'amount'];

const isHeaderRow = (row: any[]): boolean => {
    const rowString = row.join(' ').toLowerCase();
    // A row is considered a header if it contains at least a few of the keywords
    const matches = headerKeywords.filter(keyword => rowString.includes(keyword)).length;
    return matches >= 2;
};


export function TransactionImporter({ existingTransactions }: TransactionImporterProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importMode, setImportMode] = React.useState<ImportMode>('append');
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore, user } = useFirebase();

  const emissorsQuery = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'emissors') : null,
    [firestore, user]
  );
  const { data: availableEmissors } = useCollection<Emisor>(emissorsQuery);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (importMode === 'replace') {
            setPendingFile(file);
            setIsAlertOpen(true);
        } else {
            startImportProcess(file, 'append');
        }
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const handleConfirmReplace = () => {
    setIsAlertOpen(false);
    if (pendingFile) {
        startImportProcess(pendingFile, 'replace');
        setPendingFile(null);
    }
  }
  
  const startImportProcess = (file: File, mode: ImportMode) => {
    setIsImporting(true);
    log(`Iniciando importación en modo: ${mode}`);
    if (file.name.endsWith('.csv')) {
        parseCsv(file, mode);
    } else if (file.name.endsWith('.xlsx')) {
        parseXlsx(file, mode);
    } else {
        toast({
            variant: 'destructive',
            title: 'Formato no soportado',
            description: 'Por favor, sube un archivo .csv o .xlsx',
        });
        setIsImporting(false);
    }
  }
  
  const parseXlsx = (file: File, mode: ImportMode) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (!json || json.length === 0) {
            throw new Error("El archivo XLSX está vacío o no tiene un formato válido.");
        }
        
        let headerRowIndex = -1;
        for(let i = 0; i < json.length; i++) {
            if (isHeaderRow(json[i] as any[])) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
             throw new Error(`No se ha podido encontrar la fila de cabecera. Asegúrate de que el archivo contiene columnas como 'Fecha', 'Concepto' e 'Importe'.`);
        }
        
        const header = (json[headerRowIndex] as string[]).map(h => String(h || '').trim());
        log(`Cabecera encontrada en la fila ${headerRowIndex + 1}: ${header.join(', ')}`);
        
        const dateIndex = findColumnIndex(header, ['fecha operación', 'fecha', 'data']);
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

        const dataRows = json.slice(headerRowIndex + 1);
        const parsedData = dataRows.map((row: any) => ({
            Fecha: row[dateIndex],
            Concepto: row[conceptIndex],
            Importe: row[amountIndex]
        }));

        processParsedData(parsedData, mode);
      } catch (error: any) {
        console.error("Error processing XLSX data:", error);
        toast({
          variant: 'destructive',
          title: 'Error de Importación',
          description: error.message || 'No se pudo procesar el archivo XLSX.',
          duration: 9000,
        });
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
         toast({
          variant: 'destructive',
          title: 'Error de Lectura',
          description: 'No se pudo leer el archivo.',
        });
        setIsImporting(false);
    }
    reader.readAsArrayBuffer(file);
  }

  const parseCsv = (file: File, mode: ImportMode) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processParsedData(results.data, mode);
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        toast({
          variant: 'destructive',
          title: 'Error de Importación',
          description: 'No se pudo leer el archivo CSV.',
        });
        setIsImporting(false);
      }
    });
  };

  const processParsedData = async (data: any[], mode: ImportMode) => {
     if (!user) {
        toast({ variant: 'destructive', title: 'Error de autenticación'});
        setIsImporting(false);
        return;
     }
     // Create a set of keys for existing transactions for efficient lookup
    const existingTransactionKeys = new Set(existingTransactions.map(createTransactionKey));
    log(`Iniciando procesamiento de ${data.length} filas.`);

    try {
        const allParsedRows = data
        .map((row: any, index: number) => {
            const dateValue = row.Fecha || row.fecha || row['Fecha Operación'] || row['fecha operación'];
            const descriptionValue = row.Concepto || row.concepto || row.description || row.descripción;
            let amountValue = row.Importe || row.importe || row.amount;

            if (typeof amountValue === 'string') {
                amountValue = amountValue.replace('.', '').replace(',', '.'); // Handle thousand separators and decimal commas
            }
            const amount = parseFloat(amountValue);
            
            if (!dateValue || !descriptionValue || isNaN(amount)) {
                log(`Fila ${index + 2} inválida o vacía, saltando: ${JSON.stringify(row)}`);
                return null;
            }

            let date;
             if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                const dateString = String(dateValue);
                 // Handle DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, YYYY-MM-DD
                const parts = dateString.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
                if (parts) {
                    const day = parseInt(parts[1], 10);
                    const month = parseInt(parts[2], 10);
                    let year = parseInt(parts[3], 10);
                    if (year < 100) year += 2000; // Handle 2-digit years

                    if (month > 12 && day <= 12) { // Likely MM/DD/YYYY
                         date = new Date(year, month - 1, day);
                    } else { // Assume DD/MM/YYYY
                         date = new Date(year, month - 1, day);
                    }
                } else {
                    date = new Date(dateString); // Fallback for ISO strings or other formats
                }
            }


            if (isNaN(date.getTime())) {
                log(`Fila ${index + 2} con fecha inválida, saltando: ${JSON.stringify(row)}`);
                return null;
            }

            return {
                id: '', // Will be set by firestore
                date: date.toISOString(),
                description: descriptionValue,
                amount: amount,
                category: null,
                document: null,
                emisorId: null, // Initially null
            } as Omit<Transaction, 'id'>;
        })
        .filter((tx): tx is Omit<Transaction, 'id'> => tx !== null);
        
        let transactionsToProcess = allParsedRows;
        let duplicatesFound = 0;

        if (mode === 'append') {
            transactionsToProcess = allParsedRows.filter(tx => {
                const key = createTransactionKey(tx as Transaction);
                const isDuplicate = existingTransactionKeys.has(key);
                if (isDuplicate) {
                    log(`Transacción duplicada encontrada y omitida: ${key}`);
                }
                return !isDuplicate;
            });
            duplicatesFound = allParsedRows.length - transactionsToProcess.length;
            log(`${transactionsToProcess.length} transacciones únicas encontradas. ${duplicatesFound} duplicados omitidos.`);
        }


        if (transactionsToProcess.length > 0) {
            log('Iniciando inferencia de emissors con IA...');
            const emissorsForAI = availableEmissors?.map(c => ({ id: c.id, name: c.name })) || [];
            const transactionsWithContacts = await Promise.all(transactionsToProcess.map(async (tx, index) => {
                try {
                    const result = await inferContact({ description: tx.description, contacts: emissorsForAI });
                    if (result.contactId) {
                       log(`[Fila ${index + 1}] Emissor inferido: ${result.contactId} para "${tx.description.substring(0,30)}..."`);
                       return { ...tx, emisorId: result.contactId };
                    }
                } catch (error) {
                    console.error("Error inferring emisor for a transaction:", error);
                    log(`ERROR en inferencia de emissor para fila ${index + 1}: ${error}`);
                }
                return tx;
            }));

            const transactionsCollectionRef = collection(firestore, 'users', user.uid, 'transactions');
            const batch = writeBatch(firestore);

            if (mode === 'replace') {
                existingTransactions.forEach(tx => {
                    batch.delete(doc(transactionsCollectionRef, tx.id));
                })
            }
            
            transactionsWithContacts.forEach(tx => {
                const newDocRef = doc(transactionsCollectionRef);
                batch.set(newDocRef, tx);
            });

            await batch.commit();

            toast({
                title: 'Importación Exitosa',
                description: `Se han importado ${transactionsToProcess.length} transacciones. ${mode === 'append' ? `Se omitieron ${duplicatesFound} duplicados.` : ''}`,
            });
            log('¡Éxito! Importación completada.');

        } else {
             toast({
                title: mode === 'append' && duplicatesFound > 0 ? 'No hay transacciones nuevas' : 'No se encontraron transacciones',
                description: mode === 'append' && duplicatesFound > 0 
                    ? `Se encontraron y omitieron ${duplicatesFound} transacciones duplicadas.` 
                    : 'No se encontraron transacciones válidas en el archivo o ya existen todas.',
             });
             log('No se encontraron transacciones nuevas para importar.');
        }
    } catch (error: any) {
        console.error("Error processing parsed data:", error);
        toast({
        variant: 'destructive',
        title: 'Error de Procesamiento',
        description: error.message || 'No se pudo procesar el contenido del archivo. Revisa el formato y los datos.',
        });
        log(`ERROR: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  }


  const handleMenuClick = (mode: ImportMode) => {
    setImportMode(mode);
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
        disabled={isImporting}
      />
      <div className="flex items-center rounded-md">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button disabled={isImporting} className="rounded-r-none">
                    {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileUp className="mr-2 h-4 w-4" />
                    )}
                    Importar
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleMenuClick('append')}>
                    <ListPlus className="mr-2 h-4 w-4" />
                    <span>Afegir moviments</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('replace')} className="text-red-500">
                     <Trash2 className="mr-2 h-4 w-4" />
                    <span>Reemplaçar tot</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás a punto de reemplazar todo?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció esborrarà permanentment tots els moviments actuals i els substituirà
              pels del nou arxiu. Aquesta operació no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>
              Sí, reemplaçar-ho tot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
