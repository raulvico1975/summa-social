'use client';

import * as React from 'react';
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
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { formatCurrencyEU } from '@/lib/normalize';
import { useTranslations } from '@/i18n';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Transaction, AnyContact } from '@/lib/data';

interface RemittanceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remittanceId: string | null;
  organizationId: string;
}

export function RemittanceDetailModal({
  open,
  onOpenChange,
  remittanceId,
  organizationId,
}: RemittanceDetailModalProps) {
  const { firestore } = useFirebase();
  const { t } = useTranslations();
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

    const query = searchQuery.toLowerCase().trim();
    return remittanceItems.filter(item => {
      const contact = item.contactId ? contactMap[item.contactId] : null;
      const name = contact?.name?.toLowerCase() || '';
      const taxId = contact?.taxId?.toLowerCase() || '';
      return name.includes(query) || taxId.includes(query);
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

        {/* Taula */}
        <div className="border rounded-lg overflow-auto flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.movements.table.contact}</TableHead>
                <TableHead>DNI/CIF</TableHead>
                <TableHead className="text-right">{t.movements.table.amount}</TableHead>
                <TableHead>{t.movements.table.category}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const contact = item.contactId ? contactMap[item.contactId] : null;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {contact?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact?.taxId || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrencyEU(item.amount)}
                    </TableCell>
                    <TableCell>
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
