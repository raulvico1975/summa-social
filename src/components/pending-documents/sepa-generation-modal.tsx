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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertCircle,
  Check,
  CalendarIcon,
  FileText,
  Loader2,
  Download,
  ExternalLink,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyEU } from '@/lib/normalize';
import { format, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import type { PendingDocument } from '@/lib/pending-documents/types';
import type { Contact, BankAccount } from '@/lib/data';
import {
  validateDocsForSepa,
  createSepaRemittance,
  type ValidDocInfo,
  type InvalidDocInfo,
} from '@/lib/pending-documents/sepa-remittance';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SepaGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDocuments: PendingDocument[];
  contacts: Contact[];
  onComplete: () => void;
}

type ModalStep = 'validation' | 'configuration' | 'generating' | 'success';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SepaGenerationModal({
  open,
  onOpenChange,
  selectedDocuments,
  contacts,
  onComplete,
}: SepaGenerationModalProps) {
  const { firestore, storage } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { bankAccounts, isLoading: isLoadingBankAccounts } = useBankAccounts();
  const { toast } = useToast();

  // State
  const [step, setStep] = React.useState<ModalStep>('validation');
  const [validDocs, setValidDocs] = React.useState<ValidDocInfo[]>([]);
  const [invalidDocs, setInvalidDocs] = React.useState<InvalidDocInfo[]>([]);

  // Configuration state
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState<string>('');
  const [executionDate, setExecutionDate] = React.useState<Date>(new Date());
  const [filename, setFilename] = React.useState<string>('');
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  // Result state
  const [result, setResult] = React.useState<{
    remittanceId: string;
    downloadUrl: string;
    filename: string;
    nbOfTxs: number;
    ctrlSum: number;
  } | null>(null);

  // Validate documents when modal opens or selection changes
  React.useEffect(() => {
    if (open && selectedDocuments.length > 0) {
      const { valid, invalid } = validateDocsForSepa(selectedDocuments, contacts);
      setValidDocs(valid);
      setInvalidDocs(invalid);
      setStep('validation');
      setResult(null);

      // Auto-generate filename
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      setFilename(`remesa_${dateStr}_${valid.length}pagaments.xml`);

      // Select default bank account
      const defaultAccount = bankAccounts.find(a => a.isDefault);
      if (defaultAccount) {
        setSelectedBankAccountId(defaultAccount.id);
      } else if (bankAccounts.length > 0) {
        setSelectedBankAccountId(bankAccounts[0].id);
      }
    }
  }, [open, selectedDocuments, contacts, bankAccounts]);

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      setStep('validation');
      setValidDocs([]);
      setInvalidDocs([]);
      setResult(null);
    }
  }, [open]);

  // Handlers
  const handleContinue = () => {
    if (validDocs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Cap document vàlid',
        description: 'No hi ha documents que compleixin els requisits per SEPA.',
      });
      return;
    }
    setStep('configuration');
  };

  const handleGenerate = async () => {
    if (!firestore || !storage || !organizationId || !organization) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut iniciar la generació.',
      });
      return;
    }

    const bankAccount = bankAccounts.find(a => a.id === selectedBankAccountId);
    if (!bankAccount) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Selecciona un compte bancari.',
      });
      return;
    }

    if (!bankAccount.iban) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El compte seleccionat no té IBAN configurat.',
      });
      return;
    }

    setStep('generating');

    try {
      const resultData = await createSepaRemittance(
        firestore,
        storage,
        organizationId,
        {
          bankAccount,
          executionDate: format(executionDate, 'yyyy-MM-dd'),
          debtorName: organization.name || 'Organització',
          documents: validDocs.map(v => v.doc),
          contacts,
        }
      );

      setResult(resultData);
      setStep('success');

      toast({
        title: `Remesa generada (${resultData.nbOfTxs} pagaments)`,
        description: 'Fitxer SEPA llest per descarregar.',
      });

      // Trigger download
      const a = document.createElement('a');
      a.href = resultData.downloadUrl;
      a.download = resultData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error generating SEPA:', error);
      setStep('configuration');
      toast({
        variant: 'destructive',
        title: 'Error generant remesa',
        description: error instanceof Error ? error.message : 'Error desconegut',
      });
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      onComplete();
    }
    onOpenChange(false);
  };

  // Computed
  const selectedBankAccount = bankAccounts.find(a => a.id === selectedBankAccountId);
  const totalAmount = validDocs.reduce((sum, v) => sum + (v.doc.amount || 0), 0);
  const bankAccountsWithIban = bankAccounts.filter(a => a.iban);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'validation' && 'Generar remesa SEPA'}
            {step === 'configuration' && 'Configurar remesa'}
            {step === 'generating' && 'Generant...'}
            {step === 'success' && 'Remesa generada'}
          </DialogTitle>
          <DialogDescription>
            {step === 'validation' && `${selectedDocuments.length} documents seleccionats`}
            {step === 'configuration' && `${validDocs.length} pagaments · ${formatCurrencyEU(totalAmount)}`}
            {step === 'generating' && 'Espera mentre es genera el fitxer SEPA...'}
            {step === 'success' && 'El fitxer s\'ha descarregat automàticament.'}
          </DialogDescription>
        </DialogHeader>

        {/* Info banner */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">
            Això genera un fitxer per pujar al banc. No crea moviments.
          </AlertDescription>
        </Alert>

        {/* Step: Validation */}
        {step === 'validation' && (
          <div className="space-y-4">
            {/* Valid documents */}
            {validDocs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {validDocs.length} documents vàlids
                </h4>
                <ScrollArea className="h-[150px] rounded-md border p-2">
                  <div className="space-y-2">
                    {validDocs.map(({ doc, supplier }) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{doc.invoiceNumber}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            {supplier.name}
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrencyEU(doc.amount || 0)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Invalid documents */}
            {invalidDocs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {invalidDocs.length} documents no es poden incloure
                </h4>
                <ScrollArea className="h-[120px] rounded-md border border-destructive/30 bg-destructive/5 p-2">
                  <div className="space-y-2">
                    {invalidDocs.map(({ doc, reason }) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between text-sm py-1 border-b border-destructive/20 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-destructive" />
                          <span className="truncate max-w-[200px]">
                            {doc.invoiceNumber || doc.file.filename}
                          </span>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {reason}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Summary */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total a pagar:</span>
              <span className="text-lg font-bold">{formatCurrencyEU(totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Step: Configuration */}
        {step === 'configuration' && (
          <div className="space-y-4">
            {/* Bank account selector */}
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Compte bancari emissor *</Label>
              {isLoadingBankAccounts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregant comptes...
                </div>
              ) : bankAccountsWithIban.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sense comptes amb IBAN</AlertTitle>
                  <AlertDescription>
                    Has de configurar almenys un compte bancari amb IBAN a Configuració.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={selectedBankAccountId}
                  onValueChange={setSelectedBankAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsWithIban.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex flex-col">
                          <span>{account.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {account.iban}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Execution date */}
            <div className="space-y-2">
              <Label>Data d'execució</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !executionDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {executionDate ? format(executionDate, 'dd/MM/yyyy') : 'Selecciona data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={executionDate}
                    onSelect={(date) => {
                      if (date) {
                        setExecutionDate(date);
                        // Update filename with new date
                        const dateStr = format(date, 'yyyy-MM-dd');
                        setFilename(`remesa_${dateStr}_${validDocs.length}pagaments.xml`);
                      }
                      setDatePickerOpen(false);
                    }}
                    locale={ca}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filename */}
            <div className="space-y-2">
              <Label htmlFor="filename">Nom del fitxer</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground">{validDocs.length} pagaments</p>
                <p className="text-lg font-bold">{formatCurrencyEU(totalAmount)}</p>
              </div>
              {selectedBankAccount && (
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">Des de:</p>
                  <p className="font-medium">{selectedBankAccount.name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Generant fitxer SEPA...</p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <Check className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Remesa generada correctament</p>
                <p className="text-sm text-green-700">
                  {result.nbOfTxs} pagaments · {formatCurrencyEU(result.ctrlSum)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{result.filename}</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={result.downloadUrl} download={result.filename}>
                  <Download className="mr-2 h-4 w-4" />
                  Descarregar
                </a>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Puja aquest fitxer al teu banc per executar els pagaments.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'validation' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel·lar
              </Button>
              <Button
                onClick={handleContinue}
                disabled={validDocs.length === 0}
              >
                Continuar amb {validDocs.length} vàlids
              </Button>
            </>
          )}

          {step === 'configuration' && (
            <>
              <Button variant="outline" onClick={() => setStep('validation')}>
                Enrere
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedBankAccountId || bankAccountsWithIban.length === 0}
              >
                Generar remesa
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={handleClose}>
              Tancar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
