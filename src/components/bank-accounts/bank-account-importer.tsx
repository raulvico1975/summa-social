'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ArrowRightCircle, Ban, Download, AlertTriangle, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import {
  readBankAccountsExcel,
  generateImportPreview,
  prepareBankAccountCreateData,
  prepareBankAccountUpdateData,
  type BankAccountImportResult,
  type BankAccountImportPreview,
} from '@/lib/bank-accounts-import';
import { downloadBankAccountsTemplate } from '@/lib/bank-accounts-export';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

interface BankAccountImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function BankAccountImporter({ open, onOpenChange, onComplete }: BankAccountImporterProps) {
  const { toast } = useToast();
  const { bankAccounts, allBankAccounts, create, update, setDefault } = useBankAccounts();

  // State
  const [step, setStep] = React.useState<ImportStep>('upload');
  const [importResult, setImportResult] = React.useState<BankAccountImportResult | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [parseWarnings, setParseWarnings] = React.useState<string[]>([]);
  const [parseErrors, setParseErrors] = React.useState<string[]>([]);

  // Ref per input file
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      setStep('upload');
      setImportResult(null);
      setParseWarnings([]);
      setParseErrors([]);
      setIsProcessing(false);
    }
  }, [open]);

  // Handler: Seleccionar fitxer
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParseWarnings([]);
    setParseErrors([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { rows, warnings, errors } = readBankAccountsExcel(arrayBuffer);

      // Si hi ha errors de parsing, no continuar
      if (errors.length > 0) {
        setParseErrors(errors);
        setIsProcessing(false);
        return;
      }

      if (rows.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Fitxer buit',
          description: 'No s\'han trobat dades de comptes bancaris al fitxer.',
        });
        setIsProcessing(false);
        return;
      }

      setParseWarnings(warnings);

      // Generar preview comparant amb existents
      const result = generateImportPreview(rows, allBankAccounts);

      // Si hi ha errors bloquejants (ex: múltiples defaults)
      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        setIsProcessing(false);
        return;
      }

      setImportResult(result);
      setStep('preview');
    } catch (error) {
      console.error('Error llegint fitxer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut llegir el fitxer Excel.',
      });
    } finally {
      setIsProcessing(false);
      // Reset input per permetre tornar a seleccionar el mateix fitxer
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler: Aplicar importació
  const handleApplyImport = async () => {
    if (!importResult) return;

    setStep('importing');
    setIsProcessing(true);

    const toProcess = importResult.previews.filter(p => p.action === 'create' || p.action === 'update');

    try {
      let created = 0;
      let updated = 0;
      let newDefaultId: string | null = null;

      // Detectar si cal establir un nou default
      const defaultInExcel = importResult.previews.find(
        p => p.parsed.isDefault === true && (p.action === 'create' || p.action === 'update')
      );

      // Si no hi ha comptes i es crearà algun, el primer serà default
      const noExistingAccounts = allBankAccounts.length === 0;
      const firstCreate = toProcess.find(p => p.action === 'create');
      const needsAutoDefault = noExistingAccounts && firstCreate && !defaultInExcel;

      // Processar creacions
      for (let i = 0; i < toProcess.length; i++) {
        const preview = toProcess[i];

        if (preview.action === 'create') {
          const isFirstAndNeedsDefault = needsAutoDefault && preview === firstCreate;
          const isExplicitDefault = preview.parsed.isDefault === true;
          const makeDefault = isFirstAndNeedsDefault || isExplicitDefault;

          const data = prepareBankAccountCreateData(preview.parsed, makeDefault);
          const newId = await create(data);

          if (isExplicitDefault) {
            newDefaultId = newId;
          }
          created++;
        } else if (preview.action === 'update' && preview.existingId) {
          const data = prepareBankAccountUpdateData(preview.parsed);
          await update(preview.existingId, data);

          // Si s'ha marcat com a default
          if (preview.parsed.isDefault === true) {
            newDefaultId = preview.existingId;
          }
          updated++;
        }
      }

      // Si cal canviar el default (només si ve explícit a l'Excel)
      if (newDefaultId && defaultInExcel) {
        await setDefault(newDefaultId);
      }

      setStep('done');
      toast({
        title: 'Importació completada',
        description: `${created} creats, ${updated} actualitzats.`,
      });

      onComplete?.();
    } catch (error) {
      console.error('Error important:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'S\'ha produït un error durant la importació. No s\'ha aplicat cap canvi.',
      });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  // Renderitzar badge segons acció
  const renderActionBadge = (action: BankAccountImportPreview['action']) => {
    switch (action) {
      case 'create':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Nou
          </Badge>
        );
      case 'update':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <ArrowRightCircle className="h-3 w-3 mr-1" />
            Actualitzar
          </Badge>
        );
      case 'skip':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            <Ban className="h-3 w-3 mr-1" />
            Ometre
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            Importar comptes bancaris
          </DialogTitle>
          <DialogDescription>
            Importa comptes bancaris des d'un fitxer Excel (.xlsx)
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 gap-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-medium">Selecciona un fitxer Excel</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                El fitxer ha de contenir una capçalera amb columnes: Nom, IBAN, Banc, Per defecte, Actiu
              </p>
            </div>

            {/* Errors de parsing */}
            {parseErrors.length > 0 && (
              <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errors al fitxer</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    {parseErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => downloadBankAccountsTemplate()}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descarregar plantilla
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isProcessing ? 'Processant...' : 'Seleccionar fitxer'}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Microcopy sobre matching */}
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Els comptes bancaris es relacionen per <strong>IBAN</strong>.
                Si l'IBAN coincideix, el compte s'actualitza; si no, se'n crea un de nou.
                Només pot existir un compte per defecte.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* STEP: Preview */}
        {step === 'preview' && importResult && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Resum */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>{importResult.summary.toCreate} nous</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{importResult.summary.toUpdate} actualitzacions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>{importResult.summary.toSkip} omesos</span>
              </div>
            </div>

            {/* Info sobre default final */}
            {importResult.finalDefaultInfo && (
              <Alert className="bg-amber-50 border-amber-200">
                <Star className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  {importResult.finalDefaultInfo}
                </AlertDescription>
              </Alert>
            )}

            {/* Avisos de parsing */}
            {(parseWarnings.length > 0 || importResult.warnings.length > 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <details className="text-xs">
                    <summary className="cursor-pointer">
                      {parseWarnings.length + importResult.warnings.length} avís(os)
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {[...parseWarnings, ...importResult.warnings].map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            {/* Taula de preview */}
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Acció</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Banc</TableHead>
                    <TableHead className="w-48">Detalls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importResult.previews.map((preview, idx) => (
                    <TableRow
                      key={idx}
                      className={preview.action === 'skip' ? 'opacity-50' : ''}
                    >
                      <TableCell>{renderActionBadge(preview.action)}</TableCell>
                      <TableCell className="font-medium">
                        {preview.parsed.name}
                        {preview.parsed.isDefault && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {preview.parsed.iban || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {preview.parsed.bankName || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {preview.action === 'update' && preview.changes && (
                          <span>Canvis: {preview.changes.join(', ')}</span>
                        )}
                        {preview.action === 'skip' && preview.reason && (
                          <span>{preview.reason}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* STEP: Importing */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="animate-pulse text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-medium">Important comptes bancaris...</h3>
              <p className="text-sm text-muted-foreground">Això pot trigar uns segons</p>
            </div>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-medium">Importació completada</h3>
              <p className="text-sm text-muted-foreground">
                Tots els comptes bancaris s'han processat correctament
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Tornar
              </Button>
              <Button
                onClick={handleApplyImport}
                disabled={
                  isProcessing ||
                  (importResult?.summary.toCreate === 0 && importResult?.summary.toUpdate === 0)
                }
              >
                Aplicar importació
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={() => onOpenChange(false)}>
              Tancar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
