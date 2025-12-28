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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  Loader2,
  FileText,
  Split,
  Link2,
  Paperclip,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  CreditCard,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { formatCurrencyEU } from '@/lib/normalize';
import type { Transaction } from '@/lib/data';
import type { PrebankRemittance } from '@/lib/pending-documents/sepa-remittance';
import { reconcileSepaRemittanceToAggregatedTransaction } from '@/lib/pending-documents';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SepaReconcileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  prebankRemittance: PrebankRemittance | null;
  onComplete: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ca });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SepaReconcileModal({
  open,
  onOpenChange,
  transaction,
  prebankRemittance,
  onComplete,
}: SepaReconcileModalProps) {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    remittanceId?: string;
    childCount?: number;
    error?: string;
  } | null>(null);

  // Reset quan s'obre
  React.useEffect(() => {
    if (open) {
      setResult(null);
    }
  }, [open]);

  const handleReconcile = async () => {
    if (!firestore || !organizationId || !transaction || !prebankRemittance) return;

    setIsProcessing(true);
    try {
      const res = await reconcileSepaRemittanceToAggregatedTransaction(firestore, {
        orgId: organizationId,
        prebankRemittanceId: prebankRemittance.id,
        parentTransactionId: transaction.id,
      });

      if (res.success) {
        setResult({
          success: true,
          remittanceId: res.remittanceId,
          childCount: res.matchedDocCount,
        });
        toast({
          title: 'Remesa conciliada',
          description: `${res.matchedDocCount} pagaments desagregats i vinculats.`,
        });
      } else {
        setResult({
          success: false,
          error: res.error,
        });
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.error || 'No s\'ha pogut conciliar la remesa.',
        });
      }
    } catch (error) {
      console.error('Error reconciling:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconegut',
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut conciliar la remesa.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (result?.success) {
      onComplete();
    }
    onOpenChange(false);
  };

  if (!transaction || !prebankRemittance) {
    return null;
  }

  const totalAmount = prebankRemittance.ctrlSum;
  const txAmount = Math.abs(transaction.amount);
  const difference = Math.abs(totalAmount - txAmount);
  const amountsMatch = difference < 0.02;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Desagregar i conciliar</DialogTitle>
          <DialogDescription>
            S'ha detectat una remesa SEPA que coincideix amb aquest moviment.
          </DialogDescription>
        </DialogHeader>

        {/* Estat d'èxit */}
        {result?.success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Conciliació completada</p>
                <p className="text-sm text-green-700">
                  {result.childCount} pagaments desagregats i vinculats
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Tancar</Button>
            </DialogFooter>
          </div>
        ) : result?.error ? (
          /* Estat d'error */
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Tancar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Formulari de confirmació */
          <div className="space-y-4">
            {/* Resum de la remesa */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Remesa SEPA</span>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {prebankRemittance.nbOfTxs} pagaments
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Data d'execució: {formatDate(prebankRemittance.executionDate)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{prebankRemittance.debtorBankAccountName}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total remesa:</span>
                <span className="font-bold">{formatCurrencyEU(totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Moviment bancari:</span>
                <span className="font-bold">{formatCurrencyEU(txAmount)}</span>
              </div>
              {!amountsMatch && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Diferència: {formatCurrencyEU(difference)}</span>
                </div>
              )}
              {amountsMatch && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="h-4 w-4" />
                  <span>Imports coincideixen</span>
                </div>
              )}
            </div>

            {/* Accions que es faran */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Accions a realitzar:
              </p>
              <div className="space-y-2 pl-2">
                <div className="flex items-center gap-2 text-sm">
                  <Split className="h-4 w-4 text-blue-600" />
                  <span>Crear {prebankRemittance.nbOfTxs} transaccions fill</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="h-4 w-4 text-blue-600" />
                  <span>Vincular documents pendents als fills</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  <span>Adjuntar factures a cada transacció</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <span>Aplicar categories i proveïdors</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancel·lar
              </Button>
              <Button
                onClick={handleReconcile}
                disabled={isProcessing || !amountsMatch}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
