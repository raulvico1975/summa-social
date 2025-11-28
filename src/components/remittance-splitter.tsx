
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import type { Transaction, Emisor } from '@/lib/data';
import Papa from 'papaparse';
import { FileUp, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RemittanceSplitterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  existingEmissors: Emisor[];
  onSplitDone: (newTransactions: Transaction[], newEmissors: Emisor[]) => void;
}

interface CsvRow {
  [key: string]: string | undefined;
}

// Normalization function to compare names robustly
const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .trim();
};

export function RemittanceSplitter({
  open,
  onOpenChange,
  transaction,
  existingEmissors,
  onSplitDone,
}: RemittanceSplitterProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { log } = useAppLog();

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    log(`[Splitter] Iniciando procesado de remesa desde el archivo: ${file.name}`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CsvRow[];
        log(`[Splitter] Archivo CSV parseado. ${data.length} filas encontradas.`);
        
        try {
            const { newTransactions, newEmissors, totalAmount } = processCsvData(data);
            
            if (Math.abs(totalAmount - transaction.amount) > 0.01) {
                throw new Error(`El importe total del archivo (${totalAmount.toFixed(2)} €) no coincide con el importe de la transacción (${transaction.amount.toFixed(2)} €).`);
            }

            log(`[Splitter] Procesamiento completado. ${newTransactions.length} transacciones creadas, ${newEmissors.length} nuevos emisores.`);
            toast({
                title: "Remesa dividida con éxito",
                description: `Se han generado ${newTransactions.length} transacciones individuales.`,
            });
            onSplitDone(newTransactions, newEmissors);

        } catch (error: any) {
            console.error("Error processing remittance file:", error);
            log(`[Splitter] ERROR: ${error.message}`);
            toast({
                variant: 'destructive',
                title: 'Error al procesar el archivo',
                description: error.message,
                duration: 9000,
            });
        } finally {
            setIsProcessing(false);
        }
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        log(`[Splitter] ERROR de PapaParse: ${error.message}`);
        toast({
          variant: 'destructive',
          title: 'Error de Importación',
          description: 'No se pudo leer el archivo CSV.',
        });
        setIsProcessing(false);
      },
    });
  };
  
  const findHeader = (row: CsvRow, potentialNames: string[]): string | undefined => {
      const headers = Object.keys(row);
      for (const name of potentialNames) {
          const foundHeader = headers.find(h => normalizeString(h) === normalizeString(name));
          if (foundHeader) return foundHeader;
      }
      return undefined;
  }
  
    const findEmisor = (name: string, taxId: string, emissors: Emisor[]): Emisor | undefined => {
        const normalizedCsvName = normalizeString(name);
        const csvNameTokens = new Set(normalizedCsvName.split(' ').filter(Boolean));

        // 1. Find by Tax ID (most reliable)
        if (taxId) {
            const foundByTaxId = emissors.find(e => e.taxId.trim() === taxId.trim());
            if (foundByTaxId) {
                log(`[Splitter] Emisor encontrado por DNI/CIF: "${name}" -> ${foundByTaxId.name} (${foundByTaxId.taxId})`);
                return foundByTaxId;
            }
        }
        
        // 2. If not found by Tax ID, find by flexible name matching
        if (normalizedCsvName) {
             const potentialMatches = emissors.filter(e => {
                const normalizedEmisorName = normalizeString(e.name);
                const emisorNameTokens = normalizedEmisorName.split(' ').filter(Boolean);
                // Check if all tokens from the CSV name are present in the emisor's name
                return [...csvNameTokens].every(token => emisorNameTokens.includes(token));
            });
            
            if (potentialMatches.length === 1) {
                log(`[Splitter] Emisor encontrado por coincidencia de nombre: "${name}" -> ${potentialMatches[0].name}`);
                return potentialMatches[0];
            }

            if (potentialMatches.length > 1) {
                log(`[Splitter] AVISO: Múltiples coincidencias para "${name}". Se requiere asignación manual.`);
            }
        }

        return undefined;
    }


  const processCsvData = (data: CsvRow[]) => {
    const newTransactions: Transaction[] = [];
    const newEmissors: Emisor[] = []; // This will remain empty as we are not creating new emissors
    let totalAmount = 0;

    if (data.length === 0) {
      throw new Error("El archivo CSV está vacío o no tiene datos.");
    }
    
    // Dynamically find header names
    const firstRow = data[0];
    const nameHeader = findHeader(firstRow, ['nom', 'nombre', 'deudor']);
    const taxIdHeader = findHeader(firstRow, ['dni', 'cif', 'nif', 'dni/cif']);
    const amountHeader = findHeader(firstRow, ['import', 'importe', 'cuantía']);

    if (!nameHeader || !amountHeader) {
        throw new Error("El archivo CSV debe contener columnas para 'Nombre' e 'Importe'.");
    }

    data.forEach((row, index) => {
      const name = row[nameHeader] || '';
      const amountStr = row[amountHeader] || '0';
      const taxId = taxIdHeader ? row[taxIdHeader] || '' : '';
      
      const amount = parseFloat(amountStr.replace(/[^0-9,-]+/g, '').replace(',', '.'));

      if (!name || isNaN(amount)) {
        log(`[Splitter] Fila ${index + 2} inválida, se omite: ${JSON.stringify(row)}`);
        return;
      }
      
      totalAmount += amount;
      
      const emisor = findEmisor(name, taxId, existingEmissors);
      
      if (!emisor) {
          log(`[Splitter] AVISO: No se ha podido encontrar un emisor para la fila ${index + 2} ("${name}"). El movimiento necesitará asignación manual.`);
      }

      const newTransaction: Transaction = {
        id: `split_${transaction.id}_${index}`,
        date: transaction.date,
        description: `Donación socio/a: ${name}`,
        amount: amount,
        category: 'Donaciones', // Default category for remittances
        document: null,
        emisorId: emisor ? emisor.id : null,
        projectId: transaction.projectId, // Inherit project from original transaction
      };
      newTransactions.push(newTransaction);
    });

    return { newTransactions, newEmissors, totalAmount };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dividir Remesa</DialogTitle>
          <DialogDescription>
            Selecciona un archivo CSV con el detalle de la remesa para dividir la transacción agrupada en movimientos individuales.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Formato del archivo CSV</AlertTitle>
          <AlertDescription>
            El archivo debe contener cabeceras y al menos las columnas:
            <ul className="list-disc pl-5 mt-2 text-xs">
                <li><b>Nom/Nombre/Deudor</b></li>
                <li><b>Import/Importe</b></li>
                <li>(Opcional pero recomendado) <b>DNI/CIF/NIF</b></li>
            </ul>
             <p className="mt-2 text-xs">El sistema buscará coincidencias por DNI/CIF y, si no, por nombre (ignorando mayúsculas/minúsculas y acentos).</p>
          </AlertDescription>
        </Alert>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
          disabled={isProcessing}
        />

        <Button onClick={handleFileClick} disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 h-4 w-4" />
          )}
          {isProcessing ? 'Procesando...' : 'Pujar arxiu CSV'}
        </Button>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Tancar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
