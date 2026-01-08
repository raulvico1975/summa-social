'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, ExternalLink, Calendar, Coins, User, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { formatCurrencyEU, formatIBANDisplay } from '@/lib/normalize';
import { useTranslations } from '@/i18n';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, writeBatch, deleteDoc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, AnyContact, Donor, RemittancePendingItem, RemittancePendingReason } from '@/lib/data';

interface RemittanceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remittanceId: string | null;
  organizationId: string;
  parentTransaction?: Transaction | null;
  onReprocessComplete?: () => void;
}

// Helper per traduir motius de pendent
function getPendingReasonLabel(reason: RemittancePendingReason, t: any): string {
  const labels: Record<RemittancePendingReason, string> = {
    NO_TAXID: t.movements?.splitter?.pendingReasonNoTaxId ?? 'Sense DNI/CIF',
    INVALID_DATA: t.movements?.splitter?.pendingReasonInvalidData ?? 'Dades invàlides',
    NO_MATCH: t.movements?.splitter?.pendingReasonNoMatch ?? 'Sense coincidència',
    DUPLICATE: t.movements?.splitter?.pendingReasonDuplicate ?? 'Duplicat',
  };
  return labels[reason] || reason;
}

// Component per mostrar el resum del donant al hover
function DonorHoverSummary({
  donor,
  transactions,
  t,
}: {
  donor: Donor;
  transactions: Transaction[];
  t: any;
}) {
  const currentYear = new Date().getFullYear();

  // Calcular total donat aquest any
  const totalThisYear = React.useMemo(() => {
    return transactions
      .filter(tx => {
        const txYear = new Date(tx.date).getFullYear();
        return txYear === currentYear && tx.contactId === donor.id && tx.amount > 0;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, donor.id, currentYear]);

  // Comptar donacions totals
  const totalDonations = React.useMemo(() => {
    return transactions.filter(tx => tx.contactId === donor.id && tx.amount > 0).length;
  }, [transactions, donor.id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{donor.name}</span>
      </div>
      {donor.taxId && (
        <div className="text-sm text-muted-foreground">
          DNI/CIF: {donor.taxId}
        </div>
      )}
      <div className="border-t pt-2 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="h-3 w-3 text-green-600" />
          <span>{typeof t.remittanceModal?.totalThisYear === 'function'
            ? t.remittanceModal.totalThisYear(currentYear)
            : `Total ${currentYear}`}:</span>
          <span className="font-medium text-green-600">{formatCurrencyEU(totalThisYear)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{totalDonations} {t.donorDetail?.donations || 'donacions'}</span>
        </div>
        {donor.memberSince && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{t.donors?.memberSince || 'Soci des de'}:</span>
            <span>{donor.memberSince}</span>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1 border-t">
        <ExternalLink className="h-3 w-3" />
        {t.remittanceModal?.clickToViewProfile || 'Clica per veure el perfil'}
      </div>
    </div>
  );
}

export function RemittanceDetailModal({
  open,
  onOpenChange,
  remittanceId,
  organizationId,
  parentTransaction,
  onReprocessComplete,
}: RemittanceDetailModalProps) {
  const { firestore } = useFirebase();
  const { t } = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const { buildUrl } = useOrgUrl();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'quotes' | 'pending'>('quotes');
  const [isReprocessing, setIsReprocessing] = React.useState(false);
  const [pendingItems, setPendingItems] = React.useState<RemittancePendingItem[]>([]);

  // Query per obtenir les transaccions filles de la remesa
  const remittanceItemsQuery = useMemoFirebase(
    () => {
      if (!organizationId || !firestore || !remittanceId) return null;
      const txRef = collection(firestore, 'organizations', organizationId, 'transactions');
      return query(txRef, where('parentTransactionId', '==', remittanceId));
    },
    [firestore, organizationId, remittanceId]
  );

  const { data: remittanceItems } = useCollection<Transaction>(remittanceItemsQuery);

  // Carregar totes les transaccions per al resum del donant
  const allTransactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: allTransactions } = useCollection<Transaction>(allTransactionsQuery);

  // Carregar contactes per mostrar noms
  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<AnyContact>(contactsCollection);

  // Map de contactes per ID
  const contactMap = React.useMemo(() => {
    if (!contacts) return {};
    return contacts.reduce((acc, contact) => {
      acc[contact.id] = contact;
      return acc;
    }, {} as Record<string, AnyContact>);
  }, [contacts]);

  // Traduccions de categories
  const categoryTranslations = React.useMemo(
    () => t.categories as Record<string, string>,
    [t.categories]
  );

  // Filtrar per cerca
  const filteredItems = React.useMemo(() => {
    if (!remittanceItems) return [];
    if (!searchQuery.trim()) return remittanceItems;

    const q = searchQuery.toLowerCase().trim();
    return remittanceItems.filter(item => {
      const contact = item.contactId ? contactMap[item.contactId] : null;
      const name = contact?.name?.toLowerCase() || '';
      const taxId = contact?.taxId?.toLowerCase() || '';
      return name.includes(q) || taxId.includes(q);
    });
  }, [remittanceItems, searchQuery, contactMap]);

  // Calcular total
  const total = React.useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredItems]);

  // Reset cerca quan es tanca
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Navegar al perfil del donant
  const handleDonorClick = (contactId: string) => {
    onOpenChange(false); // Tancar modal
    router.push(buildUrl(`/dashboard/donants?id=${contactId}`));
  };

  // Carregar pendents quan s'obre el modal o canvia el remittanceId
  React.useEffect(() => {
    if (!open || !firestore || !organizationId || !parentTransaction?.remittanceId) {
      setPendingItems([]);
      return;
    }

    const loadPending = async () => {
      const pendingRef = collection(
        firestore,
        'organizations',
        organizationId,
        'remittances',
        parentTransaction.remittanceId!,
        'pending'
      );
      const snapshot = await getDocs(pendingRef);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RemittancePendingItem));
      setPendingItems(items);
    };

    loadPending();
  }, [open, firestore, organizationId, parentTransaction?.remittanceId]);

  // Reprocessar pendents: intentar match amb donants actuals
  const handleReprocess = async () => {
    if (!firestore || !organizationId || !parentTransaction?.remittanceId || pendingItems.length === 0) return;

    setIsReprocessing(true);

    try {
      // Carregar donants actuals
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
      const contactsSnap = await getDocs(query(contactsRef, where('type', '==', 'donor')));
      const donors = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor));

      // Crear maps per matching
      const donorByTaxId = new Map<string, Donor>();
      const donorByIban = new Map<string, Donor>();
      donors.forEach(d => {
        if (d.taxId) donorByTaxId.set(d.taxId.toLowerCase().replace(/[\s.-]/g, ''), d);
        if (d.iban) donorByIban.set(d.iban.toLowerCase().replace(/\s/g, ''), d);
      });

      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const remittanceDocRef = doc(firestore, 'organizations', organizationId, 'remittances', parentTransaction.remittanceId!);
      const parentTxRef = doc(transactionsRef, parentTransaction.id);

      let resolvedCount = 0;
      let resolvedTotalCents = 0;

      for (const pending of pendingItems) {
        // Intentar match per taxId o IBAN
        let matchedDonor: Donor | undefined;
        if (pending.taxId) {
          const normalizedTaxId = pending.taxId.toLowerCase().replace(/[\s.-]/g, '');
          matchedDonor = donorByTaxId.get(normalizedTaxId);
        }
        if (!matchedDonor && pending.iban) {
          const normalizedIban = pending.iban.toLowerCase().replace(/\s/g, '');
          matchedDonor = donorByIban.get(normalizedIban);
        }

        if (matchedDonor) {
          // Crear transacció filla
          const newTxRef = doc(transactionsRef);
          const membershipType = matchedDonor.membershipType ?? 'recurring';
          const category = membershipType === 'recurring' ? 'memberFees' : 'donations';
          const displayName = matchedDonor.name || pending.nameRaw || 'Anònim';

          const newTxData = {
            id: newTxRef.id,
            date: parentTransaction.date,
            description: `${t.movements?.splitter?.donationDescription ?? 'Donació de'}: ${displayName}`,
            amount: pending.amountCents / 100,
            category,
            document: null,
            contactId: matchedDonor.id,
            contactType: 'donor',
            projectId: parentTransaction.projectId ?? null,
            source: 'remittance',
            parentTransactionId: parentTransaction.id,
            bankAccountId: parentTransaction.bankAccountId ?? null,
            isRemittanceItem: true,
            remittanceId: parentTransaction.remittanceId,
          };

          const batch = writeBatch(firestore);
          batch.set(newTxRef, newTxData);

          // Eliminar pendent
          const pendingDocRef = doc(
            firestore,
            'organizations',
            organizationId,
            'remittances',
            parentTransaction.remittanceId!,
            'pending',
            pending.id
          );
          batch.delete(pendingDocRef);

          await batch.commit();

          resolvedCount++;
          resolvedTotalCents += pending.amountCents;
        }
      }

      if (resolvedCount > 0) {
        // Actualitzar comptadors al pare i document de remesa
        const newPendingCount = (parentTransaction.remittancePendingCount ?? 0) - resolvedCount;
        const newResolvedCount = (parentTransaction.remittanceResolvedCount ?? 0) + resolvedCount;
        const newPendingTotalCents = (parentTransaction.remittancePendingTotalCents ?? 0) - resolvedTotalCents;
        const newResolvedTotalCents = (parentTransaction.remittanceResolvedTotalCents ?? 0) + resolvedTotalCents;
        const newStatus = newPendingCount === 0 ? 'complete' : 'partial';

        await updateDoc(parentTxRef, {
          remittancePendingCount: newPendingCount,
          remittanceResolvedCount: newResolvedCount,
          remittancePendingTotalCents: newPendingTotalCents,
          remittanceResolvedTotalCents: newResolvedTotalCents,
          remittanceStatus: newStatus,
        });

        await updateDoc(remittanceDocRef, {
          pendingCount: newPendingCount,
          resolvedCount: newResolvedCount,
          pendingTotalCents: newPendingTotalCents,
          resolvedTotalCents: newResolvedTotalCents,
        });

        // Recarregar pendents
        const pendingRef = collection(
          firestore,
          'organizations',
          organizationId,
          'remittances',
          parentTransaction.remittanceId!,
          'pending'
        );
        const snapshot = await getDocs(pendingRef);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RemittancePendingItem));
        setPendingItems(items);

        toast({
          title: t.movements?.splitter?.reprocessSuccess ?? 'Reprocessat',
          description: t.movements?.splitter?.reprocessSuccessDescription?.(resolvedCount) ?? `S'han resolt ${resolvedCount} pendents.`,
        });

        onReprocessComplete?.();
      } else {
        toast({
          title: t.movements?.splitter?.reprocessNoMatch ?? 'Cap coincidència',
          description: t.movements?.splitter?.reprocessNoMatchDescription ?? 'No s\'han trobat coincidències amb els donants actuals.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Error reprocessing pending:', error);
      toast({
        variant: 'destructive',
        title: t.movements?.splitter?.error ?? 'Error',
        description: error.message,
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  // Determinar si hi ha pendents
  const hasPending = pendingItems.length > 0;
  const pendingTotal = pendingItems.reduce((sum, p) => sum + p.amountCents, 0) / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.movements.table.remittanceDetail}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'quotes' | 'pending')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t.movements?.splitter?.quotesTab ?? 'Quotes'} ({filteredItems.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t.movements?.splitter?.pendingTab ?? 'Pendents'}
              {hasPending && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {pendingItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB: Quotes creades */}
          <TabsContent value="quotes" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Cercador */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.movements.table.searchDonor}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Taula de quotes */}
            <div className="border rounded-lg overflow-auto flex-1 min-h-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.movements.table.contact}</TableHead>
                    <TableHead className="hidden sm:table-cell">DNI/CIF</TableHead>
                    <TableHead className="text-right">{t.movements.table.amount}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.movements.table.category}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const contact = item.contactId ? contactMap[item.contactId] : null;
                    const isDonor = contact?.type === 'donor';

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {contact && isDonor ? (
                            <HoverCard openDelay={300} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => item.contactId && handleDonorClick(item.contactId)}
                                  className="text-left hover:text-primary hover:underline flex items-center gap-1 group"
                                >
                                  <span>{contact.name}</span>
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-72" side="right" align="start">
                                <DonorHoverSummary
                                  donor={contact as Donor}
                                  transactions={allTransactions || []}
                                  t={t}
                                />
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <span>{contact?.name || '-'}</span>
                          )}
                          {contact?.taxId && (
                            <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">
                              {contact.taxId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">
                          {contact?.taxId || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrencyEU(item.amount)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {item.category ? (categoryTranslations[item.category] || item.category) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {t.movements.table.noResults}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer quotes */}
            <div className="flex justify-between items-center pt-2 border-t mt-2">
              <span className="text-sm text-muted-foreground">
                {filteredItems.length} {t.movements.table.remittanceQuotes}
              </span>
              <span className="font-semibold text-green-600">
                {t.movements.table.totalQuotes}: {formatCurrencyEU(total)}
              </span>
            </div>
          </TabsContent>

          {/* TAB: Pendents */}
          <TabsContent value="pending" className="flex-1 flex flex-col min-h-0 mt-4">
            {hasPending ? (
              <>
                {/* Explicació clara del que són els pendents */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-orange-800">
                    {t.movements?.splitter?.pendingExplanation ??
                      "Aquestes línies no s'han pogut processar perquè la remesa no porta DNI/NIF vàlid i l'IBAN no coincideix amb cap donant existent."}
                  </p>
                </div>

                {/* Taula de pendents */}
                <div className="border rounded-lg overflow-auto flex-1 min-h-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.movements?.splitter?.name ?? 'Nom'}</TableHead>
                        <TableHead>{t.movements?.splitter?.pendingIbanLabel ?? 'IBAN detectat'}</TableHead>
                        <TableHead className="text-right">{t.movements.table.amount}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((item) => (
                        <TableRow key={item.id} className="bg-orange-50/50">
                          <TableCell>
                            <div className="font-medium">{item.nameRaw || '-'}</div>
                            {item.taxId && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                ID: {item.taxId} <span className="text-orange-500">(no fiscal)</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.iban ? (
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                                {formatIBANDisplay(item.iban)}
                              </code>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            {formatCurrencyEU(item.amountCents / 100)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Què pot fer l'usuari */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {t.movements?.splitter?.pendingNextStepsTitle ?? 'Què pots fer ara?'}
                  </p>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                    <li>{t.movements?.splitter?.pendingStep1 ?? "Afegir l'IBAN a un donant existent (a la fitxa del donant)"}</li>
                    <li>{t.movements?.splitter?.pendingStep2 ?? "Crear un donant nou amb aquest IBAN"}</li>
                    <li>{t.movements?.splitter?.pendingStep3 ?? "Deixar-ho pendent i continuar (ho podràs resoldre abans del Model 182)"}</li>
                  </ul>
                </div>

                {/* Footer pendents amb botó reprocessar */}
                <div className="flex justify-between items-center pt-3 border-t mt-3">
                  <span className="text-sm text-orange-600">
                    {typeof t.movements?.splitter?.pendingItems === 'function'
                      ? t.movements.splitter.pendingItems(pendingItems.length)
                      : `${pendingItems.length} pendents`
                    } · {formatCurrencyEU(pendingTotal)}
                  </span>
                  <Button
                    onClick={handleReprocess}
                    disabled={isReprocessing}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isReprocessing ? 'animate-spin' : ''}`} />
                    {t.movements?.splitter?.reprocessPending ?? 'Reprocessar pendents'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                <p className="text-lg font-medium text-green-700">
                  {t.movements?.splitter?.noPending ?? 'No hi ha pendents'}
                </p>
                <p className="text-sm">
                  {t.movements?.splitter?.allResolved ?? 'Totes les quotes han estat processades.'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
