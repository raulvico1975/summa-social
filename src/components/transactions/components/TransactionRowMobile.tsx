// src/components/transactions/components/TransactionRowMobile.tsx
// Layout "stacked row" per mòbil - mostra tota la info sense scroll horitzontal

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SummaTooltip } from '@/components/ui/summa-tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  MoreVertical,
  User,
  Undo2,
  Ban,
  Eye,
  Edit,
  Trash2,
  FolderKanban,
  MessageSquare,
  GitMerge,
} from 'lucide-react';
import type { Transaction, ContactType } from '@/lib/data';
import { formatCurrencyEU, formatDateShort } from '@/lib/normalize';

/**
 * Helper: middle ellipsis per a noms llargs
 * Mostra primers 18 caràcters + … + últims 10
 */
function middleEllipsis(s: string, head = 18, tail = 10): string {
  if (!s) return s;
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

interface TransactionRowMobileProps {
  transaction: Transaction;
  contactName: string | null;
  contactType: ContactType | null;
  categoryDisplayName: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onSplitAmount?: (tx: Transaction) => void;
  isSplitDeleteBlocked?: boolean;
  onOpenReturnDialog?: (tx: Transaction) => void;
  onViewRemittanceDetail?: (txId: string) => void;
  onAttachDocument?: (txId: string) => void;
  t: {
    amount: string;
    balance: string;
    noContact: string;
    returnBadge: string;
    commissionBadge: string;
    returnedDonation: string;
    viewDocument: string;
    attachProof: string;
    edit: string;
    delete: string;
    splitAmount: string;
    deleteBlocked: string;
    viewRemittanceDetail: string;
    remittanceQuotes: string;
    manageReturn?: string;
    addNote?: string;
    editNote?: string;
  };
}


export const TransactionRowMobile = React.memo(function TransactionRowMobile({
  transaction: tx,
  contactName,
  categoryDisplayName,
  onEdit,
  onDelete,
  onSplitAmount,
  isSplitDeleteBlocked,
  onOpenReturnDialog,
  onViewRemittanceDetail,
  onAttachDocument,
  t,
}: TransactionRowMobileProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isReturn = tx.transactionType === 'return';
  const isReturnFee = tx.transactionType === 'return_fee';
  const isReturnedDonation = tx.donationStatus === 'returned';
  const hasDocument = !!tx.document;
  const hasBalanceAfter = typeof tx.balanceAfter === 'number' && Number.isFinite(tx.balanceAfter);
  const balanceText = hasBalanceAfter ? formatCurrencyEU(Math.abs(tx.balanceAfter!)) : '—';
  const canSplitAmount =
    tx.amount > 0 &&
    !tx.isRemittance &&
    !tx.isRemittanceItem &&
    !tx.isSplit &&
    !tx.parentTransactionId &&
    tx.source !== 'stripe' &&
    tx.transactionType !== 'donation' &&
    tx.transactionType !== 'fee';

  // Background color based on transaction type
  const bgClass = isReturn
    ? 'bg-red-50/50 border-red-200'
    : isReturnFee
    ? 'bg-orange-50/50 border-orange-200'
    : isReturnedDonation
    ? 'bg-gray-50/50 border-gray-200'
    : tx.isRemittance && tx.remittanceType !== 'returns'
    ? 'bg-emerald-50/30 border-emerald-200'
    : 'border-border/50';

  const handleEdit = React.useCallback(() => {
    setIsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onEdit(tx);
    }, 50);
  }, [tx, onEdit]);

  const handleDelete = React.useCallback(() => {
    setIsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onDelete(tx);
    }, 50);
  }, [tx, onDelete]);

  const handleManageReturn = React.useCallback(() => {
    if (!onOpenReturnDialog) return;
    setIsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onOpenReturnDialog(tx);
    }, 50);
  }, [tx, onOpenReturnDialog]);

  const handleViewRemittance = React.useCallback(() => {
    if (!onViewRemittanceDetail) return;
    setIsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onViewRemittanceDetail(tx.id);
    }, 50);
  }, [tx.id, onViewRemittanceDetail]);

  const handleAttachDoc = React.useCallback(() => {
    if (!onAttachDocument) return;
    setIsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onAttachDocument(tx.id);
    }, 50);
  }, [tx.id, onAttachDocument]);

  const handleSplitAmount = React.useCallback(() => {
    if (!onSplitAmount) return;
    setIsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      onSplitAmount(tx);
    }, 50);
  }, [onSplitAmount, tx]);

  return (
    <div className={`border rounded-lg p-3 ${bgClass}`}>
      {/* Line 1: Data · Import · Saldo */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-muted-foreground whitespace-nowrap">{formatDateShort(tx.date)}</span>
        <span className="text-muted-foreground/50">·</span>
        <span
          className={`font-medium whitespace-nowrap ${
            isReturnedDonation
              ? 'text-gray-400 line-through'
              : tx.amount > 0
              ? 'text-green-600'
              : 'text-foreground'
          }`}
        >
          {t.amount}: {formatCurrencyEU(tx.amount)}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span className="font-medium whitespace-nowrap text-foreground">
          {t.balance}: {balanceText}
        </span>
      </div>

      {/* Line 2: Concepte */}
      <div className="mt-1 min-w-0">
        <p
          className={`text-sm truncate ${isReturnedDonation ? 'text-gray-400 line-through' : 'text-foreground'}`}
          title={tx.description}
        >
          {tx.description}
        </p>
      </div>

      {/* Line 3: Contacte + Categoria (chips) */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary" className="max-w-[48%] text-xs py-0 px-1.5 font-normal">
          <span className="truncate">{categoryDisplayName || '—'}</span>
        </Badge>
        <Badge variant="outline" className="max-w-[48%] text-xs py-0 px-1.5 font-normal">
          <span className="inline-flex items-center gap-1 min-w-0">
            <User className="h-3 w-3 shrink-0" />
            {contactName ? (
              <SummaTooltip content={contactName}>
                <span className="truncate">{middleEllipsis(contactName)}</span>
              </SummaTooltip>
            ) : (
              <span className="truncate">{t.noContact}</span>
            )}
          </span>
        </Badge>
      </div>

      {/* Middle: Badges (type + remittance) */}
      {(isReturn || isReturnFee || isReturnedDonation || tx.isRemittance) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {isReturn && (
            <Badge variant="destructive" className="gap-0.5 text-xs py-0 px-1.5">
              <Undo2 className="h-3 w-3" />
              {t.returnBadge}
            </Badge>
          )}
          {isReturnFee && (
            <Badge variant="outline" className="gap-0.5 text-xs py-0 px-1.5 text-orange-600 border-orange-300">
              <Ban className="h-3 w-3" />
              {t.commissionBadge}
            </Badge>
          )}
          {isReturnedDonation && (
            <Badge variant="outline" className="gap-0.5 text-xs py-0 px-1.5 text-gray-500 line-through">
              {t.returnedDonation}
            </Badge>
          )}
          {tx.isRemittance && onViewRemittanceDetail && (
            <Badge
              variant="outline"
              className="gap-0.5 text-xs py-0 px-1.5 cursor-pointer hover:bg-accent"
              onClick={() => onViewRemittanceDetail(tx.id)}
            >
              <Eye className="h-3 w-3" />
              {tx.remittanceResolvedCount ?? tx.remittanceItemCount}/{tx.remittanceItemCount} {t.remittanceQuotes}
            </Badge>
          )}
        </div>
      )}

      {/* Actions rail */}
      <div className="mt-2 flex justify-end gap-1 shrink-0">
        {hasDocument && tx.document && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => window.open(tx.document!, '_blank')}
            aria-label={t.viewDocument}
          >
            <FileText className="h-4 w-4 fill-current text-muted-foreground" />
          </Button>
        )}
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              {t.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {tx.note ? (t.editNote || 'Editar nota') : (t.addNote || 'Afegir nota')}
            </DropdownMenuItem>
            {!hasDocument && onAttachDocument && (
              <DropdownMenuItem onClick={handleAttachDoc}>
                <FileText className="h-4 w-4 mr-2 text-muted-foreground/40" />
                {t.attachProof}
              </DropdownMenuItem>
            )}
            {tx.isRemittance && onViewRemittanceDetail && (
              <DropdownMenuItem onClick={handleViewRemittance}>
                <FolderKanban className="h-4 w-4 mr-2" />
                {t.viewRemittanceDetail}
              </DropdownMenuItem>
            )}
            {isReturn && !tx.contactId && onOpenReturnDialog && (
              <DropdownMenuItem onClick={handleManageReturn}>
                <Undo2 className="h-4 w-4 mr-2" />
                {t.manageReturn || 'Assignar donant'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canSplitAmount && onSplitAmount && (
              <DropdownMenuItem onClick={handleSplitAmount}>
                <GitMerge className="h-4 w-4 mr-2" />
                {t.splitAmount}
              </DropdownMenuItem>
            )}
            {isSplitDeleteBlocked ? (
              <DropdownMenuItem disabled className="text-muted-foreground cursor-not-allowed">
                <Trash2 className="h-4 w-4 mr-2" />
                {t.deleteBlocked}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t.delete}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
