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
import { Input } from '@/components/ui/input';
import { Search, X, ExternalLink, Calendar, Coins, User } from 'lucide-react';
import { formatCurrencyEU } from '@/lib/normalize';
import { useTranslations } from '@/i18n';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useOrgUrl } from '@/hooks/organization-provider';
import type { Transaction, AnyContact, Donor } from '@/lib/data';

interface RemittanceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remittanceId: string | null;
  organizationId: string;
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
}: RemittanceDetailModalProps) {
  const { firestore } = useFirebase();
  const { t } = useTranslations();
  const router = useRouter();
  const { buildUrl } = useOrgUrl();
  const [searchQuery, setSearchQuery] = React.useState('');

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.movements.table.remittanceDetail}</DialogTitle>
        </DialogHeader>

        {/* Cercador */}
        <div className="relative">
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

        {/* Taula responsive */}
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
                      {/* Mostrar DNI a mòbil sota el nom */}
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

        {/* Footer amb totals */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {filteredItems.length} {t.movements.table.remittanceQuotes}
            {searchQuery && remittanceItems && filteredItems.length !== remittanceItems.length && (
              <span> ({remittanceItems.length} {t.movements.table.totalQuotes})</span>
            )}
          </span>
          <span className="font-semibold text-green-600">
            {t.movements.table.totalQuotes}: {formatCurrencyEU(total)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
