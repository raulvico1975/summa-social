'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations, type TranslationsContextType } from '@/i18n';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import {
  Check,
  AlertCircle,
  FileText,
  ExternalLink,
  CalendarIcon,
  ChevronsUpDown,
  Sparkles,
  Loader2,
  Archive,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import { getDownloadURL, ref } from 'firebase/storage';
import { useFirebase } from '@/firebase';
import type { PendingDocument, PendingDocumentStatus } from '@/lib/pending-documents/types';
import type { Contact, Category } from '@/lib/data';
import { isDocumentReadyToConfirm, getMissingFields } from '@/lib/pending-documents/api';
import { CATEGORY_TRANSLATION_KEYS } from '@/lib/default-data';
import { CreateSupplierModal } from '@/components/contacts/create-supplier-modal';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PendingDocumentCardProps {
  doc: PendingDocument;
  contacts: Contact[];
  categories: Category[];
  onUpdate: (docId: string, field: string, value: string | number | null) => void;
  onConfirm: (doc: PendingDocument) => void;
  onArchive: (doc: PendingDocument) => void;
  onDelete: (doc: PendingDocument) => void;
  isConfirming?: boolean;
  isArchiving?: boolean;
  isDeleting?: boolean;
  /** Selection mode */
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (docId: string, selected: boolean) => void;
  /** Expansion control from parent */
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const categoryTranslations = CATEGORY_TRANSLATION_KEYS as Record<string, string>;

function getContactName(contactId: string | null, contacts: Contact[]): string {
  if (!contactId) return '';
  const contact = contacts.find(c => c.id === contactId);
  return contact?.name || '';
}

function getCategoryName(categoryId: string | null, categories: Category[]): string {
  if (!categoryId) return '';
  const category = categories.find(c => c.id === categoryId);
  if (!category) return '';
  return categoryTranslations[category.name] || category.name;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════════════

function DraftStatusBadge({ isReady, missingFields, t }: { isReady: boolean; missingFields: string[]; t: TranslationsContextType['t'] }) {
  if (isReady) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        {t.pendingDocs.statuses.ready}
      </Badge>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t.pendingDocs.statuses.incomplete}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {t.pendingDocs.missing}: {missingFields.join(', ')}
      </TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PendingDocumentCard({
  doc,
  contacts,
  categories,
  onUpdate,
  onConfirm,
  onArchive,
  onDelete,
  isConfirming = false,
  isArchiving = false,
  isDeleting = false,
  isSelectable = false,
  isSelected = false,
  onSelect,
  isExpanded = false,
  onToggleExpand,
}: PendingDocumentCardProps) {
  const { storage } = useFirebase();
  const { t } = useTranslations();
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = React.useState(false);

  // Comboboxes open state
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [dateOpen, setDateOpen] = React.useState(false);

  // Create supplier modal
  const [createSupplierOpen, setCreateSupplierOpen] = React.useState(false);
  const [supplierSearchValue, setSupplierSearchValue] = React.useState('');

  // Local state for text inputs (debounced)
  const [localAmount, setLocalAmount] = React.useState(doc.amount?.toString() || '');
  const [localInvoiceNumber, setLocalInvoiceNumber] = React.useState(doc.invoiceNumber || '');

  // Update local state when doc changes
  React.useEffect(() => {
    setLocalAmount(doc.amount?.toString() || '');
  }, [doc.amount]);

  React.useEffect(() => {
    setLocalInvoiceNumber(doc.invoiceNumber || '');
  }, [doc.invoiceNumber]);

  // Debounced update for text fields
  const debouncedUpdateRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = React.useCallback((field: string, value: string) => {
    if (debouncedUpdateRef.current) {
      clearTimeout(debouncedUpdateRef.current);
    }

    debouncedUpdateRef.current = setTimeout(() => {
      if (field === 'amount') {
        const numValue = parseFloat(value.replace(',', '.'));
        onUpdate(doc.id, field, isNaN(numValue) ? null : numValue);
      } else {
        onUpdate(doc.id, field, value.trim() || null);
      }
    }, 500);
  }, [doc.id, onUpdate]);

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current);
      }
    };
  }, []);

  // Get file URL on demand
  const handleOpenFile = React.useCallback(async () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
      return;
    }

    if (!storage || isLoadingUrl) return;

    setIsLoadingUrl(true);
    try {
      const storageRef = ref(storage, doc.file.storagePath);
      const url = await getDownloadURL(storageRef);
      setFileUrl(url);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error getting file URL:', error);
    } finally {
      setIsLoadingUrl(false);
    }
  }, [storage, doc.file.storagePath, fileUrl, isLoadingUrl]);

  const isReady = isDocumentReadyToConfirm(doc);
  const missingFields = getMissingFields(doc);

  // Filter suppliers (contacts with type 'supplier' or role supplier)
  const suppliers = React.useMemo(() =>
    contacts.filter(c => c.type === 'supplier' || c.roles?.supplier),
    [contacts]
  );

  // Filter expense categories
  const expenseCategories = React.useMemo(() =>
    categories.filter(c => c.type === 'expense'),
    [categories]
  );

  // Parse date for calendar
  const invoiceDate = doc.invoiceDate ? parseISO(doc.invoiceDate) : undefined;
  const validInvoiceDate = invoiceDate && isValid(invoiceDate) ? invoiceDate : undefined;

  // Has AI extraction with evidence
  const hasEvidence = doc.extracted?.source === 'ai' && doc.extracted.evidence;
  const confidence = doc.extracted?.confidence;

  // Format amount for display
  const formattedAmount = doc.amount !== null ? `${doc.amount.toFixed(2)} €` : '—';

  // Format date for display
  const formattedDate = validInvoiceDate ? format(validInvoiceDate, 'dd/MM/yy') : '—';

  return (
    <div className={cn(
      'border-b last:border-b-0',
      !isReady && 'bg-amber-50/30',
      isSelected && 'bg-primary/5'
    )}>
      {/* FILA COMPACTA */}
      <div className="flex items-center gap-2 p-3">
        {/* Checkbox de selecció */}
        {isSelectable && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(doc.id, !!checked)}
            aria-label={`Seleccionar ${doc.invoiceNumber || doc.file.filename}`}
            className="flex-shrink-0"
          />
        )}

        {/* Icona fitxer + nom */}
        <button
          onClick={handleOpenFile}
          className="flex items-center gap-1.5 min-w-0 flex-shrink"
          title={doc.file.filename}
        >
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[180px]">
            {doc.file.filename}
          </span>
          {isLoadingUrl ? (
            <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
          ) : (
            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        {/* AI badge */}
        {hasEvidence && (
          <Tooltip>
            <TooltipTrigger>
              <Sparkles className={cn(
                'h-3 w-3 flex-shrink-0',
                confidence === 'high' ? 'text-green-500' :
                confidence === 'medium' ? 'text-amber-500' : 'text-red-500'
              )} />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs font-medium mb-1">{t.pendingDocs.extraction.aiExtracted} ({confidence})</p>
              {doc.extracted?.evidence?.invoiceNumber && (
                <p className="text-xs text-muted-foreground">{t.pendingDocs.extraction.evidenceInvoice}: "{doc.extracted.evidence.invoiceNumber}"</p>
              )}
              {doc.extracted?.evidence?.amount && (
                <p className="text-xs text-muted-foreground">{t.pendingDocs.extraction.evidenceAmount}: "{doc.extracted.evidence.amount}"</p>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Import */}
        <span className={cn(
          'text-sm font-medium tabular-nums flex-shrink-0',
          doc.amount === null && 'text-muted-foreground'
        )}>
          {formattedAmount}
        </span>

        {/* Data (només visible en pantalles grans) */}
        <span className="text-sm text-muted-foreground tabular-nums flex-shrink-0 hidden sm:block w-[60px] text-right">
          {formattedDate}
        </span>

        {/* Estat */}
        <div className="flex-shrink-0">
          <DraftStatusBadge isReady={isReady} missingFields={missingFields} t={t} />
        </div>

        {/* Botó expandir */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Confirmar (sempre visible) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant={isReady ? 'default' : 'outline'}
                size="sm"
                onClick={() => onConfirm(doc)}
                disabled={!isReady || isConfirming}
                className="h-8 flex-shrink-0"
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t.pendingDocs.actions.confirm}</span>
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {isReady ? t.pendingDocs.actions.confirm : `${t.pendingDocs.missing}: ${missingFields.join(', ')}`}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* BLOC EXPANDIT */}
      {isExpanded && (
        <div className="px-3 pb-4 pt-1 border-t bg-muted/50 space-y-4">
          {/* Fila 1: Import + Data + Tipus */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Import */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.pendingDocs.fields.amount}</label>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={localAmount}
                  onChange={(e) => {
                    setLocalAmount(e.target.value);
                    handleTextChange('amount', e.target.value);
                  }}
                  placeholder="0.00"
                  className={cn(
                    'h-9 text-right',
                    missingFields.includes('amount') && 'border-amber-400 bg-amber-50'
                  )}
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>

            {/* Data */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.pendingDocs.fields.invoiceDate}</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-9',
                      !validInvoiceDate && 'text-muted-foreground',
                      missingFields.includes('invoiceDate') && 'border-amber-400 bg-amber-50'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validInvoiceDate ? format(validInvoiceDate, 'dd/MM/yyyy') : t.pendingDocs.filters.dateFrom}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validInvoiceDate}
                    onSelect={(date) => {
                      if (date) {
                        onUpdate(doc.id, 'invoiceDate', format(date, 'yyyy-MM-dd'));
                      }
                      setDateOpen(false);
                    }}
                    locale={ca}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tipus */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.pendingDocs.fields.type}</label>
              <Select
                value={doc.type}
                onValueChange={(value) => onUpdate(doc.id, 'type', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">{t.pendingDocs.types.invoice}</SelectItem>
                  <SelectItem value="payroll">{t.pendingDocs.types.payroll}</SelectItem>
                  <SelectItem value="receipt">{t.pendingDocs.types.receipt}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila 2: Nº factura + Proveïdor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nº factura */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.pendingDocs.fields.invoiceNumber}</label>
              <Input
                type="text"
                value={localInvoiceNumber}
                onChange={(e) => {
                  setLocalInvoiceNumber(e.target.value);
                  handleTextChange('invoiceNumber', e.target.value);
                }}
                placeholder={t.pendingDocs.fields.invoiceNumber}
                className={cn(
                  'h-9',
                  missingFields.includes('invoiceNumber') && 'border-amber-400 bg-amber-50',
                  doc.type === 'receipt' && 'opacity-50'
                )}
                disabled={doc.type === 'receipt'}
              />
            </div>

            {/* Proveïdor */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.pendingDocs.fields.supplier}</label>
              <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={supplierOpen}
                    className={cn(
                      'w-full justify-between h-9 font-normal',
                      !doc.supplierId && 'text-muted-foreground',
                      missingFields.includes('supplierId') && 'border-amber-400 bg-amber-50'
                    )}
                  >
                    <span className="truncate">
                      {doc.supplierId ? getContactName(doc.supplierId, contacts) : `${t.pendingDocs.filters.supplier}...`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder={`${t.pendingDocs.actions.search}...`}
                      className="h-9"
                      value={supplierSearchValue}
                      onValueChange={setSupplierSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2 text-center">
                          <p className="text-sm text-muted-foreground mb-2">{t.pendingDocs.filters.noSupplier}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSupplierOpen(false);
                              setCreateSupplierOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {t.pendingDocs.actions.createSupplier}
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {suppliers.map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.name}
                            onSelect={() => {
                              onUpdate(doc.id, 'supplierId', supplier.id);
                              setSupplierOpen(false);
                              setSupplierSearchValue('');
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm">{supplier.name}</span>
                              {(supplier.taxId || (supplier as Contact & { iban?: string }).iban) && (
                                <span className="text-xs text-muted-foreground">
                                  {supplier.taxId}{(supplier as Contact & { iban?: string }).iban ? ` · ${(supplier as Contact & { iban?: string }).iban!.slice(-8)}` : ''}
                                </span>
                              )}
                            </div>
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                doc.supplierId === supplier.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {/* Botó sempre visible per crear nou */}
                      <div className="border-t p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSupplierOpen(false);
                            setCreateSupplierOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t.pendingDocs.actions.createSupplier}
                        </Button>
                      </div>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Modal crear proveïdor */}
          <CreateSupplierModal
            open={createSupplierOpen}
            onOpenChange={setCreateSupplierOpen}
            initialName={supplierSearchValue}
            onCreated={(contactId) => {
              onUpdate(doc.id, 'supplierId', contactId);
              setSupplierSearchValue('');
            }}
          />

          {/* Fila 3: Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.pendingDocs.fields.category}</label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className={cn(
                      'w-full justify-between h-9 font-normal',
                      !doc.categoryId && 'text-muted-foreground',
                      missingFields.includes('categoryId') && 'border-amber-400 bg-amber-50'
                    )}
                  >
                    <span className="truncate">
                      {doc.categoryId ? getCategoryName(doc.categoryId, categories) : `${t.pendingDocs.filters.category}...`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={`${t.pendingDocs.actions.search}...`} className="h-9" />
                    <CommandList>
                      <CommandEmpty>{t.pendingDocs.filters.noCategory}</CommandEmpty>
                      <CommandGroup>
                        {expenseCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={categoryTranslations[category.name] || category.name}
                            onSelect={() => {
                              onUpdate(doc.id, 'categoryId', category.id);
                              setCategoryOpen(false);
                            }}
                          >
                            {categoryTranslations[category.name] || category.name}
                            <Check
                              className={cn(
                                'ml-auto h-4 w-4',
                                doc.categoryId === category.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Accions */}
            <div className="flex items-end justify-end gap-2">
              {/* Eliminar amb confirmació */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      S'eliminarà el document i el fitxer pujat. Aquesta acció no es pot desfer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(doc)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onArchive(doc)}
                disabled={isArchiving}
                className="text-muted-foreground"
              >
                {isArchiving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Archive className="h-4 w-4 mr-1" />
                )}
                Arxivar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
              >
                Tancar
              </Button>
            </div>
          </div>

          {/* Evidències IA (si n'hi ha) */}
          {hasEvidence && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                <Sparkles className={cn(
                  'h-3 w-3 inline mr-1',
                  confidence === 'high' ? 'text-green-500' :
                  confidence === 'medium' ? 'text-amber-500' : 'text-red-500'
                )} />
                {t.pendingDocs.extraction.aiExtracted} ({t.pendingDocs.extraction.confidence}: {confidence})
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {doc.extracted?.evidence?.invoiceNumber && (
                  <p>{t.pendingDocs.extraction.evidenceInvoice}: "{doc.extracted.evidence.invoiceNumber}"</p>
                )}
                {doc.extracted?.evidence?.amount && (
                  <p>{t.pendingDocs.extraction.evidenceAmount}: "{doc.extracted.evidence.amount}"</p>
                )}
                {doc.extracted?.evidence?.supplierName && (
                  <p>{t.pendingDocs.extraction.evidenceSupplier}: "{doc.extracted.evidence.supplierName}"</p>
                )}
                {doc.extracted?.evidence?.invoiceDate && (
                  <p>{t.pendingDocs.extraction.evidenceDate}: "{doc.extracted.evidence.invoiceDate}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
