// src/components/transactions/components/TransactionRowMobile.tsx
// Layout "stacked row" per mòbil - mostra tota la info sense scroll horitzontal

'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import type { Transaction, ContactType } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';

interface TransactionRowMobileProps {
  transaction: Transaction;
  contactName: string | null;
  contactType: ContactType | null;
  categoryDisplayName: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onOpenReturnDialog?: (tx: Transaction) => void;
  onViewRemittanceDetail?: (txId: string) => void;
  onAttachDocument?: (txId: string) => void;
  t: {
    returnBadge: string;
    commissionBadge: string;
    returnedDonation: string;
    viewDocument: string;
    attachProof: string;
    edit: string;
    delete: string;
    viewRemittanceDetail: string;
    remittanceQuotes: string;
    manageReturn?: string;
  };
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const TransactionRowMobile = React.memo(function TransactionRowMobile({
  transaction: tx,
  contactName,
  contactType,
  categoryDisplayName,
  onEdit,
  onDelete,
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
    setTimeout(() => onEdit(tx), 50);
  }, [tx, onEdit]);

  const handleDelete = React.useCallback(() => {
    setIsMenuOpen(false);
    setTimeout(() => onDelete(tx), 50);
  }, [tx, onDelete]);

  const handleManageReturn = React.useCallback(() => {
    if (!onOpenReturnDialog) return;
    setIsMenuOpen(false);
    setTimeout(() => onOpenReturnDialog(tx), 50);
  }, [tx, onOpenReturnDialog]);

  const handleViewRemittance = React.useCallback(() => {
    if (!onViewRemittanceDetail) return;
    setIsMenuOpen(false);
    setTimeout(() => onViewRemittanceDetail(tx.id), 50);
  }, [tx.id, onViewRemittanceDetail]);

  const handleAttachDoc = React.useCallback(() => {
    if (!onAttachDocument) return;
    setIsMenuOpen(false);
    setTimeout(() => onAttachDocument(tx.id), 50);
  }, [tx.id, onAttachDocument]);

  return (
    <div className={`border rounded-lg p-3 ${bgClass}`}>
      {/* Top row: Data + Import */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{formatDate(tx.date)}</div>
          <div
            className={`mt-1 text-sm leading-snug ${
              isReturnedDonation ? 'text-gray-400 line-through' : 'text-foreground'
            }`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {tx.note || tx.description}
          </div>
        </div>
        <div
          className={`text-sm font-medium whitespace-nowrap text-right ${
            isReturnedDonation
              ? 'text-gray-400 line-through'
              : tx.amount > 0
              ? 'text-green-600'
              : 'text-foreground'
          }`}
        >
          {formatCurrencyEU(tx.amount)}
        </div>
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

      {/* Bottom meta row: Categoria + Contacte + Doc */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {categoryDisplayName && (
          <Badge variant="secondary" className="text-xs py-0 px-1.5 font-normal">
            {categoryDisplayName}
          </Badge>
        )}
        {contactName && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{contactName}</span>
          </span>
        )}
        {hasDocument && (
          <span className="inline-flex items-center gap-1 text-green-600">
            <FileText className="h-3 w-3" />
            Doc
          </span>
        )}
      </div>

      {/* Actions rail */}
      <div className="mt-2 flex justify-end gap-1">
        {hasDocument && tx.document && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(tx.document!, '_blank')}
            aria-label={t.viewDocument}
          >
            <FileText className="h-4 w-4" />
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
            {!hasDocument && onAttachDocument && (
              <DropdownMenuItem onClick={handleAttachDoc}>
                <FileText className="h-4 w-4 mr-2" />
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
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
