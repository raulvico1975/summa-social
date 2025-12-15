'use client';

import * as React from 'react';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContactCombobox, Contact } from '@/components/contact-combobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  FileUp,
  Trash2,
  MoreVertical,
  Edit,
  FolderKanban,
  GitMerge,
  Link,
  Circle,
  AlertTriangle,
  Undo2,
  Ban,
  Eye,
  AlertCircle,
} from 'lucide-react';
import type { Transaction, Category, Project, ContactType } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { InlineNoteEditor } from '@/components/transactions/InlineNoteEditor';

// =============================================================================
// TYPES
// =============================================================================

interface TransactionRowProps {
  transaction: Transaction;
  contactName: string | null;
  contactType: ContactType | null;
  projectName: string | null;
  relevantCategories: Category[];
  categoryTranslations: Record<string, string>;
  comboboxContacts: Contact[];
  availableProjects: Project[] | null;
  showProjectColumn: boolean;
  isDocumentLoading: boolean;
  isCategoryLoading: boolean;
  // Handlers
  onSetNote: (txId: string, note: string) => void;
  onSetCategory: (txId: string, category: string) => void;
  onSetContact: (txId: string, contactId: string | null, contactType?: ContactType) => void;
  onSetProject: (txId: string, projectId: string | null) => void;
  onAttachDocument: (txId: string) => void;
  onDeleteDocument: (txId: string) => void;
  onCategorize: (txId: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onOpenReturnDialog: (tx: Transaction) => void;
  onSplitRemittance: (tx: Transaction) => void;
  onSplitStripeRemittance?: (tx: Transaction) => void;
  onViewRemittanceDetail: (txId: string) => void;
  onCreateNewContact: (txId: string, type: 'donor' | 'supplier') => void;
  onOpenReturnImporter?: () => void;
  // Translations
  t: {
    date: string;
    amount: string;
    returnBadge: string;
    returnAssignedTooltip: string;
    pendingDonorAssignment: string;
    commissionBadge: string;
    bankCommissionReturn: string;
    returnedDonation: string;
    returnedDonationInfo: string;
    assign: string;
    assignDonor: string;
    assignDonorTooltip: string;
    remittanceUseImporter: string;
    uploadBankFile: string;
    uploadBankFileTooltip: string;
    unlink: string;
    searchCategory: string;
    noResults: string;
    suggestWithAI: string;
    categorize: string;
    uncategorized: string;
    viewDocument: string;
    attachProof: string;
    attachDocument: string;
    deleteDocument: string;
    manageReturn: string;
    edit: string;
    splitRemittance: string;
    splitStripeRemittance: string;
    delete: string;
    viewRemittanceDetail: string;
    remittanceQuotes: string;
  };
  getCategoryDisplayName: (category: string | null | undefined) => string;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateString;
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const TransactionRow = React.memo(function TransactionRow({
  transaction: tx,
  contactName,
  contactType,
  projectName,
  relevantCategories,
  categoryTranslations,
  comboboxContacts,
  availableProjects,
  showProjectColumn,
  isDocumentLoading,
  isCategoryLoading,
  onSetNote,
  onSetCategory,
  onSetContact,
  onSetProject,
  onAttachDocument,
  onDeleteDocument,
  onCategorize,
  onEdit,
  onDelete,
  onOpenReturnDialog,
  onSplitRemittance,
  onSplitStripeRemittance,
  onViewRemittanceDetail,
  onCreateNewContact,
  onOpenReturnImporter,
  t,
  getCategoryDisplayName,
}: TransactionRowProps) {
  // Local state for category popover - avoids parent re-render
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
  // Local state for actions dropdown menu - needed to close before opening modals (Radix aria-hidden fix)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = React.useState(false);

  const isExpense = tx.amount < 0;
  const hasDocument = !!tx.document;
  const isReturn = tx.transactionType === 'return';
  const isReturnFee = tx.transactionType === 'return_fee';
  const isReturnedDonation = tx.donationStatus === 'returned';
  // Detecta ingressos amb descripció que conté "STRIPE" (case-insensitive)
  const isStripeIncome = tx.amount > 0 && tx.description?.toUpperCase().includes('STRIPE');

  // Stable callbacks using useCallback to prevent child re-renders
  const handleSelectContact = React.useCallback((contactId: string | null) => {
    if (contactId) {
      const contact = comboboxContacts.find(c => c.id === contactId);
      onSetContact(tx.id, contactId, contact?.type);
    } else {
      onSetContact(tx.id, null);
    }
  }, [tx.id, comboboxContacts, onSetContact]);

  const handleCreateNewContact = React.useCallback((type: 'donor' | 'supplier') => {
    onCreateNewContact(tx.id, type);
  }, [tx.id, onCreateNewContact]);

  const handleSetNote = React.useCallback((note: string) => {
    onSetNote(tx.id, note);
  }, [tx.id, onSetNote]);

  const handleCategorySelect = React.useCallback((categoryName: string) => {
    onSetCategory(tx.id, categoryName);
    setIsCategoryPopoverOpen(false);
  }, [tx.id, onSetCategory]);

  const handleCategorizeWithAI = React.useCallback(() => {
    onCategorize(tx.id);
    setIsCategoryPopoverOpen(false);
  }, [tx.id, onCategorize]);

  const handleSetProject = React.useCallback((projectId: string | null) => {
    onSetProject(tx.id, projectId);
  }, [tx.id, onSetProject]);

  const handleAttachDocument = React.useCallback(() => {
    onAttachDocument(tx.id);
  }, [tx.id, onAttachDocument]);

  const handleDeleteDocument = React.useCallback(() => {
    onDeleteDocument(tx.id);
  }, [tx.id, onDeleteDocument]);

  const handleEdit = React.useCallback(() => {
    onEdit(tx);
  }, [tx, onEdit]);

  const handleDelete = React.useCallback(() => {
    onDelete(tx);
  }, [tx, onDelete]);

  const handleOpenReturnDialog = React.useCallback(() => {
    // Delay per permetre que el DropdownMenu es tanqui completament
    // abans d'obrir la modal (evita conflicte aria-hidden)
    setIsActionsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onOpenReturnDialog(tx);
    }, 100);
  }, [tx, onOpenReturnDialog]);

  const handleSplitRemittance = React.useCallback(() => {
    // Delay per permetre que el DropdownMenu es tanqui completament
    // abans d'obrir la modal (evita conflicte aria-hidden)
    setIsActionsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onSplitRemittance(tx);
    }, 100);
  }, [tx, onSplitRemittance]);

  const handleSplitStripeRemittance = React.useCallback(() => {
    if (!onSplitStripeRemittance) return;
    // Delay per permetre que el DropdownMenu es tanqui completament
    setIsActionsMenuOpen(false);
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onSplitStripeRemittance(tx);
    }, 100);
  }, [tx, onSplitStripeRemittance]);

  const handleViewRemittanceDetail = React.useCallback(() => {
    onViewRemittanceDetail(tx.id);
  }, [tx.id, onViewRemittanceDetail]);

  // Render transaction type badge
  const renderTransactionTypeBadge = () => {
    if (isReturn) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-0.5 text-xs py-0 px-1.5">
              <Undo2 className="h-3 w-3" />
              {t.returnBadge}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {tx.contactId ? t.returnAssignedTooltip : t.pendingDonorAssignment}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (isReturnFee) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-0.5 text-xs py-0 px-1.5 text-orange-600 border-orange-300">
              <Ban className="h-3 w-3" />
              {t.commissionBadge}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t.bankCommissionReturn}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (isReturnedDonation) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-0.5 text-xs py-0 px-1.5 text-gray-500 line-through">
              {t.returnedDonation}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t.returnedDonationInfo}
          </TooltipContent>
        </Tooltip>
      );
    }
    return null;
  };

  return (
    <TableRow
      className={`h-10 ${
        isReturn ? 'bg-red-50/50' :
        isReturnFee ? 'bg-orange-50/50' :
        isReturnedDonation ? 'bg-gray-50/50' : ''
      }`}
    >
      {/* Date */}
      <TableCell className="text-muted-foreground py-1 text-xs">{formatDate(tx.date)}</TableCell>

      {/* Amount */}
      <TableCell
        className={`text-right font-mono font-medium py-1 text-sm ${
          isReturnedDonation ? 'text-gray-400 line-through' :
          tx.amount > 0 ? 'text-green-600' : 'text-foreground'
        }`}
      >
        {formatCurrencyEU(tx.amount)}
      </TableCell>

      {/* Concept + Note + Badge */}
      <TableCell className="py-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            {renderTransactionTypeBadge()}
            {tx.isRemittance && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`gap-0.5 text-xs py-0 px-1.5 cursor-pointer hover:bg-accent ${
                      tx.remittanceStatus === 'partial'
                        ? 'border-orange-400 text-orange-700 bg-orange-50'
                        : ''
                    }`}
                    onClick={handleViewRemittanceDetail}
                  >
                    {tx.remittanceStatus === 'partial' ? (
                      <AlertCircle className="h-3 w-3 text-orange-600" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    {tx.remittanceResolvedCount ?? tx.remittanceItemCount}/{tx.remittanceItemCount} {t.remittanceQuotes}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {tx.remittanceStatus === 'partial'
                    ? `Remesa parcial: ${tx.remittancePendingCount} pendents (${formatCurrencyEU(tx.remittancePendingTotalAmount || 0)})`
                    : t.viewRemittanceDetail
                  }
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className={`text-sm truncate max-w-[250px] ${isReturnedDonation ? 'text-gray-400' : ''}`} title={tx.description}>
            {tx.description}
          </p>
          <InlineNoteEditor
            note={tx.note}
            onSave={handleSetNote}
          />
        </div>
      </TableCell>

      {/* Contact */}
      <TableCell className="py-1">
        {isReturn && !tx.contactId ? (
          // Devolució pendent: mostrar dues accions sempre
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenReturnDialog}
                  className="text-red-600 border-red-300 hover:bg-red-50 h-7 text-xs px-2"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {t.assignDonor}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t.assignDonorTooltip}
              </TooltipContent>
            </Tooltip>
            {onOpenReturnImporter && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenReturnImporter}
                    className="text-muted-foreground hover:text-foreground h-7 text-xs px-2"
                  >
                    <FileUp className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t.uploadBankFileTooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <ContactCombobox
            contacts={comboboxContacts}
            value={tx.contactId ?? null}
            onSelect={handleSelectContact}
            onCreateNew={handleCreateNewContact}
          />
        )}
      </TableCell>

      {/* Category */}
      <TableCell className="py-1">
        <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              disabled={isCategoryLoading}
              className={`justify-start rounded-full border-0 px-2 py-0.5 text-xs font-semibold h-6 min-w-0 w-auto gap-0.5 ${
                tx.amount > 0
                  ? 'bg-green-600 text-white hover:bg-green-600/80 hover:text-white'
                  : 'bg-red-500 text-white hover:bg-red-500/80 hover:text-white'
              } ${isReturnedDonation ? 'opacity-50' : ''}`}
            >
              {isCategoryLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t.categorize}...</span>
                </span>
              ) : (
                <span className="truncate max-w-[80px]">
                  {tx.category ? getCategoryDisplayName(tx.category) : t.uncategorized}
                </span>
              )}
              <ChevronDown className="ml-0.5 h-3 w-3 shrink-0 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder={t.searchCategory} />
              <CommandList>
                <CommandEmpty>{t.noResults}</CommandEmpty>
                <CommandGroup>
                  {relevantCategories.map((cat) => (
                    <CommandItem
                      key={cat.id}
                      value={categoryTranslations[cat.name] || cat.name}
                      onSelect={() => handleCategorySelect(cat.name)}
                    >
                      {categoryTranslations[cat.name] || cat.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem
                    value={t.suggestWithAI}
                    onSelect={handleCategorizeWithAI}
                    className="text-primary"
                  >
                    <Sparkles className="mr-2 h-3 w-3" />
                    {t.suggestWithAI}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </TableCell>

      {/* Project */}
      {showProjectColumn ? (
        <TableCell className="py-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {projectName ? (
                <Button variant="ghost" className="h-auto p-0 text-left font-normal flex items-center gap-1">
                  <span className={`text-xs truncate max-w-[90px] ${isReturnedDonation ? 'text-gray-400' : ''}`}>{projectName}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="text-muted-foreground h-6 text-xs">
                  <FolderKanban className="mr-1 h-3 w-3" />
                  {t.assign}
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleSetProject(null)}>
                {t.unlink}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {availableProjects?.map((project) => (
                <DropdownMenuItem key={project.id} onClick={() => handleSetProject(project.id)}>
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      ) : (
        <TableCell className="text-center py-1">
          {projectName && (
            <Tooltip>
              <TooltipTrigger>
                <Circle className="h-2 w-2 fill-blue-500 text-blue-500 mx-auto" />
              </TooltipTrigger>
              <TooltipContent>{projectName}</TooltipContent>
            </Tooltip>
          )}
        </TableCell>
      )}

      {/* Document */}
      <TableCell className="text-center py-1">
        {isDocumentLoading ? (
          <Loader2 className="h-3 w-3 animate-spin mx-auto text-muted-foreground" />
        ) : hasDocument ? (
          <div className="inline-flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={tx.document!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
                </a>
              </TooltipTrigger>
              <TooltipContent>{t.viewDocument}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleDeleteDocument}
                  className="inline-flex text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.deleteDocument}</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleAttachDocument}
                className="inline-flex hover:scale-110 transition-transform"
              >
                <Circle className={`h-2.5 w-2.5 ${isExpense ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isExpense ? t.attachProof : t.attachDocument}
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right py-1">
        <DropdownMenu open={isActionsMenuOpen} onOpenChange={setIsActionsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isReturn && !tx.isRemittance && (
              <>
                <DropdownMenuItem onClick={handleOpenReturnDialog}>
                  <Link className="mr-2 h-4 w-4 text-red-500" />
                  {t.manageReturn}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {tx.isRemittance && tx.remittanceType === 'returns' && (
              <>
                <DropdownMenuItem onClick={handleViewRemittanceDetail}>
                  <Eye className="mr-2 h-4 w-4 text-blue-500" />
                  {t.viewRemittanceDetail}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {t.edit}
            </DropdownMenuItem>
            {!hasDocument && (
              <DropdownMenuItem onClick={handleAttachDocument}>
                <FileUp className="mr-2 h-4 w-4" />
                {t.attachDocument}
              </DropdownMenuItem>
            )}
            {isStripeIncome && !tx.isRemittance && onSplitStripeRemittance && (
              <DropdownMenuItem onClick={handleSplitStripeRemittance}>
                <GitMerge className="mr-2 h-4 w-4 text-purple-600" />
                {t.splitStripeRemittance}
              </DropdownMenuItem>
            )}
            {tx.amount > 0 && !isReturn && !isReturnFee && !tx.isRemittance && !isStripeIncome && (
              <DropdownMenuItem onClick={handleSplitRemittance}>
                <GitMerge className="mr-2 h-4 w-4" />
                {t.splitRemittance}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});
