
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
  Nom?: string;
  Nombre?: string;
  DNI?: string;
  CIF?: string;
  'DNI/CIF'?: string;
  Import?: string;
  Importe?: string;
  'Codi Postal'?: string;
  'Código Postal'?: string;
  CP?: string;
}

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

  const processCsvData = (data: CsvRow[]) => {
    const newTransactions: Transaction[] = [];
    const newEmissors: Emisor[] = [];
    let totalAmount = 0;

    const emisorMapByTaxId = new Map(existingEmissors.map(e => [e.taxId, e]));

    data.forEach((row, index) => {
      const name = row.Nom || row.Nombre || '';
      const taxId = row.DNI || row.CIF || row['DNI/CIF'] || '';
      const zipCode = row['Codi Postal'] || row['Código Postal'] || row.CP || '00000';
      const amountStr = row.Import || row.Importe || '0';
      const amount = parseFloat(amountStr.replace(',', '.'));

      if (!name || !taxId || isNaN(amount)) {
        log(`[Splitter] Fila ${index + 1} inválida, se omite: ${JSON.stringify(row)}`);
        return;
      }
      
      totalAmount += amount;
      let emisor = emisorMapByTaxId.get(taxId);

      if (!emisor) {
        // Create new emisor if it doesn't exist
        const newEmisor: Emisor = {
          id: `cont_${new Date().getTime()}_${index}`,
          name,
          taxId,
          zipCode,
          type: 'donor',
        };
        newEmissors.push(newEmisor);
        emisorMapByTaxId.set(taxId, newEmisor); // Add to map to avoid duplicates in the same file
        emisor = newEmisor;
        log(`[Splitter] Nuevo emisor creado y añadido a la cola: ${name} (${taxId})`);
      }

      const newTransaction: Transaction = {
        id: `split_${transaction.id}_${index}`,
        date: transaction.date,
        description: `Donación socio/a: ${name}`,
        amount: amount,
        category: 'Donaciones', // Default category for remittances
        document: null,
        emisorId: emisor.id,
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
                <li><b>Nom</b> o <b>Nombre</b></li>
                <li><b>DNI</b>, <b>CIF</b> o <b>DNI/CIF</b></li>
                <li><b>Import</b> o <b>Importe</b></li>
                <li>(Opcional) <b>CP</b>, <b>Codi Postal</b> o <b>Código Postal</b></li>
            </ul>
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
