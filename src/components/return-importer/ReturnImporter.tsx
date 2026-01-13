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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, Donor } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import {
  FileUp,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  Layers,
  UserRoundX,
  Search,
  UserPlus,
} from 'lucide-react';
import { useReturnImporter, type ParsedReturn, type BulkReturnGroup } from './useReturnImporter';
import { useTranslations } from '@/i18n';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface ReturnImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  isSuperAdmin?: boolean;
  /** Mode contextual: assignar devolucions directament a aquest pare */
  parentTransaction?: Transaction | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function ReturnImporter({
  open,
  onOpenChange,
  onComplete,
  isSuperAdmin = false,
  parentTransaction = null,
}: ReturnImporterProps) {
  const { t } = useTranslations();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = React.useState(false);
  const [forceRecreateChildren, setForceRecreateChildren] = React.useState(false);
  const [confirmForceRecreate, setConfirmForceRecreate] = React.useState(false);

  const {
    step,
    setStep,
    isProcessing,
    isContextMode,
    parentTransaction: hookParentTx,
    files,
    allRows,
    startRow,
    setStartRow,
    previewRows,
    numColumns,
    mapping,
    setMapping,
    parsedReturns,
    groupedMatches,
    bulkReturnGroups,
    stats,
    parseFiles,
    performMatching,
    processReturns,
    reset,
    handleCreateDonorForReturn,
  } = useReturnImporter({ parentTransaction });

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      reset();
      setSelectedRows(new Set());
    }
  }, [open, reset]);

  // Seleccionar tots els matched per defecte quan arribem a preview
  React.useEffect(() => {
    if (step === 'preview') {
      const matchedIndices = new Set(
        parsedReturns
          .map((r, i) => (r.status === 'matched' || r.status === 'donor_found') ? i : -1)
          .filter(i => i >= 0)
      );
      setSelectedRows(matchedIndices);
    }
  }, [step, parsedReturns]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DIALOG CREAR DONANT
  // ═══════════════════════════════════════════════════════════════════════════

  const [createDonorDialog, setCreateDonorDialog] = React.useState<{
    open: boolean;
    returnIndex: number;
    returnItem: ParsedReturn | null;
  }>({ open: false, returnIndex: -1, returnItem: null });

  const handleOpenCreateDonor = (index: number, item: ParsedReturn) => {
    setCreateDonorDialog({ open: true, returnIndex: index, returnItem: item });
  };

  const handleCreateDonorSubmit = async (data: { name: string; taxId: string; zipCode?: string; iban?: string }) => {
    const result = await handleCreateDonorForReturn(createDonorDialog.returnIndex, data);
    if (!result.success) {
      throw new Error(result.error || t.returnImporter.createDonor.errorGeneric);
    }
    toast({
      title: t.returnImporter.createDonor.toastSuccess,
      description: t.returnImporter.createDonor.toastSuccessDesc.replace('{name}', data.name),
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    if (newFiles.length > 0) {
      parseFiles(newFiles);
    }
    event.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );

    if (droppedFiles.length > 0) {
      parseFiles(droppedFiles);
    } else {
      toast({
        variant: 'destructive',
        title: t.returnImporter?.invalidFormatTitle || t.importers.transaction.errors.unsupportedFormat,
        description:
          t.returnImporter?.invalidFormatDescription ||
          t.importers.transaction.errors.unsupportedFormatDescription,
      });
    }
  };

  const handleToggleRow = (index: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    const selectableIndices = parsedReturns
      .map((r, i) => (r.status === 'matched' || r.status === 'donor_found') ? i : -1)
      .filter(i => i >= 0);

    if (selectedRows.size === selectableIndices.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableIndices));
    }
  };

  const handleProcess = async () => {
    // Si forceRecreateChildren està activat, requerir confirmació
    if (forceRecreateChildren && !confirmForceRecreate) {
      toast({
        title: 'Confirmació requerida',
        description: 'Has de marcar la casella de confirmació per forçar la recreació.',
        variant: 'destructive',
      });
      return;
    }
    await processReturns({ forceRecreateChildren });
    onComplete();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const truncateIban = (iban: string) => {
    if (iban.length <= 12) return iban;
    return `${iban.slice(0, 8)}...${iban.slice(-4)}`;
  };

  const selectableCount = parsedReturns.filter(r => r.status === 'matched' || r.status === 'donor_found').length;

  // Estadístiques de remeses parcials
  const partialRemittanceStats = React.useMemo(() => {
    // Comptar devolucions agrupades sense donant (pendents d'identificar)
    const groupedWithoutDonor = parsedReturns.filter(r =>
      r.matchType === 'grouped' && !r.matchedDonor
    );
    const pendingCount = groupedWithoutDonor.length;
    const pendingAmount = groupedWithoutDonor.reduce((sum, r) => sum + r.amount, 0);

    // Comptar devolucions agrupades AMB donant (resolubles)
    const groupedWithDonor = parsedReturns.filter(r =>
      r.matchType === 'grouped' && r.matchedDonor
    );
    const resolvedCount = groupedWithDonor.length;

    // Determinar quants grups seran parcials
    const groupsWithPending = new Set(groupedWithoutDonor.map(r => r.groupId)).size;

    return {
      pendingCount,
      pendingAmount,
      resolvedCount,
      groupsWithPending,
      hasPartial: pendingCount > 0 && resolvedCount > 0, // Té resolubles i pendents
      allPending: pendingCount > 0 && resolvedCount === 0, // Tot és pendent (cap resolt)
    };
  }, [parsedReturns, stats.grouped]);

  // Determinar si hi ha accions possibles (com a mínim una devolució amb donant)
  const hasActionableReturns = selectableCount > 0 && !partialRemittanceStats.allPending;

  // Determinar si hi ha alguna fila amb badge de tipus (per amagar la columna si no)
  const hasAnyTypeBadge = parsedReturns.some(r =>
    r.matchType === 'grouped' || r.matchType === 'individual' || !r.matchedDonor
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERITZACIÓ
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={
        step === 'mapping' ? "sm:max-w-4xl max-h-[90vh]" :
        step === 'preview' ? "sm:max-w-5xl max-h-[90vh]" :
        "sm:max-w-lg"
      }>

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1: UPLOAD
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t.returnImporter?.title || "Importar devolucions del banc"}
              </DialogTitle>
              <DialogDescription>
                {t.returnImporter?.description || "Puja el fitxer amb el detall de devolucions que et facilita el banc. El sistema farà matching per IBAN amb els teus donants."}
              </DialogDescription>
            </DialogHeader>

            {/* Zona Drag & Drop */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleFileClick}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                multiple
                className="hidden"
                disabled={isProcessing}
              />

              <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                {t.returnImporter?.dropzone || "Arrossega fitxers aquí o clica per seleccionar"}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.returnImporter?.dropzoneFormats || "CSV, Excel (.xlsx, .xls)"}
              </p>
            </div>

            {/* Fitxers seleccionats */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t.returnImporter?.filesSelected?.(files.length) || `${files.length} fitxer(s) seleccionat(s):`}</p>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.returnImporter?.readingFiles || "Llegint fitxers..."}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t.returnImporter?.cancel || t.common.cancel}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2: MAPPING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'mapping' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {t.returnImporter?.columnMapping || "Configuració de columnes"}
              </DialogTitle>
              <DialogDescription>
                S'han detectat {allRows.length - startRow} files de dades en {files.length} fitxer(s)
              </DialogDescription>
            </DialogHeader>

            {/* Configuració fila inicial */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fila inicial de dades:</label>
              <select
                value={startRow}
                onChange={(e) => setStartRow(parseInt(e.target.value))}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Array.from({ length: Math.min(allRows.length, 20) }, (_, i) => (
                  <option key={i} value={i}>
                    Fila {i + 1}: {allRows[i]?.slice(0, 3).join(' | ').substring(0, 60)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Mapejat de columnes */}
            <div className="grid grid-cols-2 gap-4">
              {/* IBAN */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  {t.returnImporter?.ibanColumn || "Columna IBAN"} *
                </label>
                <select
                  value={mapping.ibanColumn ?? ''}
                  onChange={(e) => setMapping({ ...mapping, ibanColumn: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">-- Selecciona --</option>
                  {Array.from({ length: numColumns }, (_, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {previewRows[0]?.[i]?.substring(0, 25) || '-'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Import */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  {t.returnImporter?.amountColumn || "Columna Import"} *
                </label>
                <select
                  value={mapping.amountColumn ?? ''}
                  onChange={(e) => setMapping({ ...mapping, amountColumn: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">-- Selecciona --</option>
                  {Array.from({ length: numColumns }, (_, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {previewRows[0]?.[i]?.substring(0, 25) || '-'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  {t.returnImporter?.dateColumn || "Columna Data"} (opcional)
                </label>
                <select
                  value={mapping.dateColumn ?? ''}
                  onChange={(e) => setMapping({ ...mapping, dateColumn: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">-- No disponible --</option>
                  {Array.from({ length: numColumns }, (_, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {previewRows[0]?.[i]?.substring(0, 25) || '-'}
                    </option>
                  ))}
                </select>
              </div>

              {/* DNI */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  {t.returnImporter?.dniColumn || "Columna DNI"} (opcional)
                </label>
                <select
                  value={mapping.dniColumn ?? ''}
                  onChange={(e) => setMapping({ ...mapping, dniColumn: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">-- No disponible --</option>
                  {Array.from({ length: numColumns }, (_, i) => (
                    <option key={i} value={i}>
                      Col {i + 1}: {previewRows[0]?.[i]?.substring(0, 25) || '-'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview de dades */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vista prèvia (primeres {previewRows.length} files):</label>
              <ScrollArea className="h-[180px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-xs">#</TableHead>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <TableHead
                          key={i}
                          className={`text-xs min-w-[100px] ${
                            i === mapping.ibanColumn ? 'bg-green-100 dark:bg-green-900/30' :
                            i === mapping.amountColumn ? 'bg-blue-100 dark:bg-blue-900/30' :
                            i === mapping.dateColumn ? 'bg-purple-100 dark:bg-purple-900/30' :
                            i === mapping.dniColumn ? 'bg-gray-100 dark:bg-gray-800/30' :
                            ''
                          }`}
                        >
                          Col {i + 1}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {startRow + rowIdx + 1}
                        </TableCell>
                        {Array.from({ length: numColumns }, (_, colIdx) => (
                          <TableCell
                            key={colIdx}
                            className={`text-xs truncate max-w-[150px] ${
                              colIdx === mapping.ibanColumn ? 'bg-green-50 dark:bg-green-900/20' :
                              colIdx === mapping.amountColumn ? 'bg-blue-50 dark:bg-blue-900/20' :
                              colIdx === mapping.dateColumn ? 'bg-purple-50 dark:bg-purple-900/20' :
                              colIdx === mapping.dniColumn ? 'bg-gray-50 dark:bg-gray-800/20' :
                              ''
                            }`}
                          >
                            {row[colIdx] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { reset(); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar
              </Button>
              <Button
                onClick={performMatching}
                disabled={isProcessing || mapping.ibanColumn === null || mapping.amountColumn === null}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3: PREVIEW
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {isContextMode
                  ? "Assignar devolucions a l'apunt seleccionat"
                  : (t.returnImporter?.results || "Resultat del matching")}
              </DialogTitle>
              <DialogDescription>
                {isContextMode && hookParentTx ? (
                  <span className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">
                      {hookParentTx.date} · {formatCurrencyEU(Math.abs(hookParentTx.amount))} · {hookParentTx.description?.slice(0, 50)}
                    </span>
                    <span>Les {parsedReturns.length} devolucions del fitxer s'assignaran a aquest apunt</span>
                  </span>
                ) : (
                  "Revisa les coincidències i selecciona les devolucions a assignar"
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Resum */}
            <div className="flex flex-wrap gap-4">
              {/* Mode BULK: Resum de grups */}
              {bulkReturnGroups.length > 0 ? (
                <>
                  {bulkReturnGroups.filter(g => g.status === 'auto').length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {bulkReturnGroups.filter(g => g.status === 'auto').length} liquidacions auto-matched
                      </span>
                    </div>
                  )}
                  {bulkReturnGroups.filter(g => g.status === 'needsReview').length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">
                        {bulkReturnGroups.filter(g => g.status === 'needsReview').length} pendents de revisió
                      </span>
                    </div>
                  )}
                  {bulkReturnGroups.filter(g => g.status === 'noMatch').length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {bulkReturnGroups.filter(g => g.status === 'noMatch').length} sense coincidència
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Mode NORMAL: Devolucions amb donant identificat */}
                  {(stats.matched + stats.donorFound) > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {stats.matched + stats.donorFound} amb donant identificat
                      </span>
                    </div>
                  )}
                  {/* Devolucions agrupades (remesa) */}
                  {stats.grouped > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                      <Layers className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        {stats.grouped} {t.returnImporter?.inRemittance || "en remesa"} ({groupedMatches.length} {groupedMatches.length === 1 ? (t.returnImporter?.group || 'grup') : (t.returnImporter?.groups || 'grups')})
                      </span>
                    </div>
                  )}
                  {/* Devolucions sense donant (no trobat) */}
                  {stats.notFound > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {stats.notFound} {t.returnImporter?.withoutDonor || "sense donant"}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Avís de remesa parcial */}
            {partialRemittanceStats.pendingCount > 0 && (
              <div className={`p-3 rounded-lg border ${partialRemittanceStats.allPending ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
                <div className="flex items-start gap-2">
                  <UserRoundX className={`h-5 w-5 mt-0.5 flex-shrink-0 ${partialRemittanceStats.allPending ? 'text-red-600' : 'text-orange-600'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${partialRemittanceStats.allPending ? 'text-red-800' : 'text-orange-800'}`}>
                      {partialRemittanceStats.allPending
                        ? (t.returnImporter?.noDonorIdentified?.(partialRemittanceStats.pendingCount, formatCurrencyEU(partialRemittanceStats.pendingAmount)) || `Cap donant identificat: ${partialRemittanceStats.pendingCount} devolucions pendents (${formatCurrencyEU(partialRemittanceStats.pendingAmount)})`)
                        : (t.returnImporter?.partialRemittance?.(partialRemittanceStats.pendingCount, formatCurrencyEU(partialRemittanceStats.pendingAmount)) || `Remesa parcial: ${partialRemittanceStats.pendingCount} devolucions sense donant identificat (${formatCurrencyEU(partialRemittanceStats.pendingAmount)} pendents)`)
                      }
                    </p>
                    <p className={`text-xs mt-1 ${partialRemittanceStats.allPending ? 'text-red-700' : 'text-orange-700'}`}>
                      {partialRemittanceStats.allPending
                        ? (t.returnImporter?.noDonorIdentifiedHelp || 'No hi ha cap devolució amb donant identificat. Identifica almenys un donant per poder processar.')
                        : (t.returnImporter?.partialRemittanceHelp || 'Les devolucions amb donant es processaran ara. Les pendents quedaran registrades per identificar-les manualment després.')
                      }
                    </p>
                    <p className={`text-xs font-medium mt-1 ${partialRemittanceStats.allPending ? 'text-red-800' : 'text-orange-800'}`}>
                      {t.returnImporter?.statusIdentified?.(partialRemittanceStats.resolvedCount, partialRemittanceStats.pendingCount + partialRemittanceStats.resolvedCount) || `Estat: ${partialRemittanceStats.resolvedCount}/${partialRemittanceStats.pendingCount + partialRemittanceStats.resolvedCount} identificades`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Taula de resultats - Mode BULK */}
            {bulkReturnGroups.length > 0 ? (
              <ScrollArea className="h-[350px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Liquidació</TableHead>
                      <TableHead>Núm. Liquidació</TableHead>
                      <TableHead className="text-right">Import</TableHead>
                      <TableHead className="text-center">Devolucions</TableHead>
                      <TableHead>Estat</TableHead>
                      <TableHead>Transacció Pare</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkReturnGroups.map((group) => (
                      <TableRow
                        key={group.key}
                        className={
                          group.status === 'auto' ? 'bg-green-50/50' :
                          group.status === 'needsReview' ? 'bg-orange-50/50' :
                          'bg-red-50/30'
                        }
                      >
                        <TableCell className="text-sm font-mono">
                          {group.liquidationDateISO}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {group.liquidationNumber}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrencyEU(group.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {group.rows.length}
                        </TableCell>
                        <TableCell>
                          {group.status === 'auto' ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Auto-matched
                            </Badge>
                          ) : group.status === 'needsReview' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 cursor-help">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  {group.reason === 'multipleCandidates' ? 'Múltiples candidats' :
                                   group.reason === 'outsideWindow' ? 'Fora finestra' : 'Revisió'}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {group.reason === 'multipleCandidates'
                                  ? `${group.candidatesInWindow.length} candidats dins ±2 dies`
                                  : group.reason === 'outsideWindow'
                                  ? `${group.candidatesOutsideWindow.length} candidats fora de la finestra ±2 dies`
                                  : 'Cal revisió manual'}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                              <X className="mr-1 h-3 w-3" />
                              Sense coincidència
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {group.matchedParent ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-green-700 font-medium">
                                {group.matchedParent.date?.split('T')[0] || '-'}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {group.matchedParent.description || '-'}
                              </span>
                            </div>
                          ) : group.candidatesInWindow.length > 0 ? (
                            <span className="text-orange-600 text-xs">
                              {group.candidatesInWindow.length} candidats disponibles
                            </span>
                          ) : group.candidatesOutsideWindow.length > 0 ? (
                            <span className="text-orange-600 text-xs">
                              {group.candidatesOutsideWindow.length} fora finestra
                            </span>
                          ) : (
                            <span className="text-red-500 text-xs">Cap candidat</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              /* Taula de resultats - Mode NORMAL */
              <ScrollArea className="h-[350px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRows.size === selectableCount && selectableCount > 0}
                          onCheckedChange={handleToggleAll}
                          disabled={selectableCount === 0 || partialRemittanceStats.allPending}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Import</TableHead>
                      <TableHead>IBAN</TableHead>
                      <TableHead>Donant</TableHead>
                      {hasAnyTypeBadge && <TableHead>Tipus</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedReturns.map((item, index) => (
                    <TableRow
                      key={index}
                      className={
                        item.matchType === 'grouped' ? 'bg-blue-50/50' :
                        item.status === 'matched' ? 'bg-green-50/50' :
                        item.status === 'donor_found' ? 'bg-yellow-50/50' :
                        'bg-red-50/30'
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(index)}
                          onCheckedChange={() => handleToggleRow(index)}
                          disabled={item.status === 'not_found' || (item.matchType === 'grouped' && !item.matchedDonor)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.date ? item.date.toISOString().split('T')[0] : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrencyEU(item.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncateIban(item.iban)}
                      </TableCell>
                      <TableCell>
                        {item.matchedDonor ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-green-700 font-medium">
                              {item.matchedDonor.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              via {item.matchedBy === 'iban' ? 'IBAN' : item.matchedBy === 'dni' ? 'DNI' : item.matchedBy === 'manual' ? 'Manual' : 'Nom'}
                            </span>
                          </div>
                        ) : item.matchType === 'grouped' ? (
                          // Devolució agrupada SENSE donant → pendent d'identificar
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 w-fit">
                              <UserRoundX className="mr-1 h-3 w-3" />
                              Pendent d'identificar
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                                onClick={() => toast({ title: 'Funcionalitat pendent', description: 'Buscar donant existent - pròximament' })}
                              >
                                <Search className="mr-1 h-3 w-3" />
                                Buscar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                                onClick={() => handleOpenCreateDonor(index, item)}
                              >
                                <UserPlus className="mr-1 h-3 w-3" />
                                Crear
                              </Button>
                            </div>
                            {item.originalName && (
                              <span className="text-xs text-muted-foreground">
                                {item.originalName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 w-fit">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              No trobat
                            </Badge>
                            {item.dni && (
                              <span className="text-xs text-muted-foreground">
                                DNI: {item.dni}
                              </span>
                            )}
                            {!item.dni && item.originalName && (
                              <span className="text-xs text-muted-foreground">
                                Nom: {item.originalName}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      {hasAnyTypeBadge && (
                        <TableCell>
                          {item.matchType === 'grouped' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 cursor-help">
                                  <Layers className="mr-1 h-3 w-3" />
                                  Agrupada
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Forma part d'una remesa de devolucions</TooltipContent>
                            </Tooltip>
                          ) : item.matchType === 'individual' ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Individual
                            </Badge>
                          ) : !item.matchedDonor ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 cursor-help">
                                  <UserRoundX className="mr-1 h-3 w-3" />
                                  Pendent
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Pendent d'identificar donant</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {/* Info */}
            <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3 space-y-1">
              {bulkReturnGroups.length > 0 ? (
                <>
                  <p>
                    <strong>{bulkReturnGroups.filter(g => g.status === 'auto').length}</strong> liquidacions es processaran automàticament.
                  </p>
                  {bulkReturnGroups.filter(g => g.status === 'needsReview').length > 0 && (
                    <p className="text-orange-700">
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      {bulkReturnGroups.filter(g => g.status === 'needsReview').length} liquidacions requereixen revisió manual (múltiples candidats o fora de la finestra ±2 dies).
                    </p>
                  )}
                  {bulkReturnGroups.filter(g => g.status === 'noMatch').length > 0 && (
                    <p className="text-red-700">
                      <X className="inline h-3 w-3 mr-1" />
                      {bulkReturnGroups.filter(g => g.status === 'noMatch').length} liquidacions sense cap transacció coincident.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>
                    <strong>{selectedRows.size}</strong> devolucions seleccionades per assignar.
                  </p>
                  {stats.grouped > 0 && partialRemittanceStats.resolvedCount > 0 && (
                    <p className="text-blue-700">
                      <Layers className="inline h-3 w-3 mr-1" />
                      Les {partialRemittanceStats.resolvedCount} devolucions agrupades s'assignaran com a part d'una remesa.
                    </p>
                  )}
                  {partialRemittanceStats.pendingCount > 0 && (
                    <p className="text-orange-700">
                      <UserRoundX className="inline h-3 w-3 mr-1" />
                      {partialRemittanceStats.pendingCount} devolucions quedaran pendents d'identificar. La remesa es marcarà com a <strong>parcial</strong> fins que s'identifiquin tots els donants.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* SuperAdmin: Opció de recrear fills - SEMPRE visible per SuperAdmin */}
            {isSuperAdmin && (
              <div className="space-y-2 p-3 rounded-lg border border-red-300 bg-red-50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="forceRecreateChildren"
                    checked={forceRecreateChildren}
                    onCheckedChange={(checked) => {
                      setForceRecreateChildren(checked === true);
                      if (!checked) setConfirmForceRecreate(false);
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="forceRecreateChildren" className="text-red-800 font-medium cursor-pointer">
                      Forçar recreació de devolucions (SuperAdmin)
                    </Label>
                    <p className="text-xs text-red-700 mt-0.5">
                      Elimina i recrea les filles de l'apunt pare seleccionat. Ús només per migracions.
                    </p>
                  </div>
                </div>
                {/* Confirmació obligatòria si s'activa */}
                {forceRecreateChildren && (
                  <div className="flex items-center gap-2 ml-6 p-2 bg-red-100 rounded border border-red-400">
                    <Checkbox
                      id="confirmForceRecreate"
                      checked={confirmForceRecreate}
                      onCheckedChange={(checked) => setConfirmForceRecreate(checked === true)}
                    />
                    <Label htmlFor="confirmForceRecreate" className="text-red-900 text-sm cursor-pointer">
                      Entenc el risc: les devolucions filles existents s'eliminaran permanentment
                    </Label>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar
              </Button>
              {bulkReturnGroups.length > 0 ? (
                // Mode BULK: botó per processar grups auto-matched
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || bulkReturnGroups.filter(g => g.status === 'auto').length === 0 || (forceRecreateChildren && !confirmForceRecreate)}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Processar {bulkReturnGroups.filter(g => g.status === 'auto').length} liquidacions
                </Button>
              ) : partialRemittanceStats.allPending ? (
                <span className="text-sm text-muted-foreground italic">
                  Identifica almenys un donant per continuar
                </span>
              ) : (
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || selectedRows.size === 0 || (forceRecreateChildren && !confirmForceRecreate)}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t.returnImporter?.process || "Assignar"} {selectedRows.size} devolucions
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4: PROCESSING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle>Processant devolucions</DialogTitle>
              <DialogDescription>
                Assignant donants i actualitzant comptadors
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Processant devolucions...</p>
              <p className="text-sm text-muted-foreground">
                Assignant donants i actualitzant comptadors
              </p>
            </div>
          </>
        )}

      </DialogContent>

      {/* Dialog per crear donant */}
      <CreateDonorForReturnDialog
        open={createDonorDialog.open}
        onOpenChange={(open) => setCreateDonorDialog(prev => ({ ...prev, open }))}
        returnItem={createDonorDialog.returnItem}
        returnIndex={createDonorDialog.returnIndex}
        onSubmit={handleCreateDonorSubmit}
        t={t}
      />
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIALOG CREAR DONANT
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateDonorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnItem: ParsedReturn | null;
  returnIndex: number;
  onSubmit: (data: { name: string; taxId: string; zipCode?: string; iban?: string }) => Promise<void>;
  t: ReturnType<typeof useTranslations>['t'];
}

function CreateDonorForReturnDialog({
  open,
  onOpenChange,
  returnItem,
  onSubmit,
  t,
}: CreateDonorDialogProps) {
  const [name, setName] = React.useState('');
  const [taxId, setTaxId] = React.useState('');
  const [zipCode, setZipCode] = React.useState('');
  const [iban, setIban] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pre-emplenar IBAN quan s'obre el dialog
  React.useEffect(() => {
    if (open && returnItem) {
      setIban(returnItem.iban || '');
      setName('');
      setTaxId('');
      setZipCode('');
      setError(null);
    }
  }, [open, returnItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validacions
    if (!name.trim()) {
      setError(t.returnImporter.createDonor.errorNameRequired);
      return;
    }
    if (!taxId.trim()) {
      setError(t.returnImporter.createDonor.errorTaxIdRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ name, taxId, zipCode, iban: iban || undefined });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.returnImporter.createDonor.errorGeneric);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.returnImporter.createDonor.title}</DialogTitle>
          <DialogDescription>
            {t.returnImporter.createDonor.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="donor-name">{t.returnImporter.createDonor.labelName} *</Label>
            <Input
              id="donor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.returnImporter.createDonor.placeholderName}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donor-taxId">{t.returnImporter.createDonor.labelTaxId} *</Label>
            <Input
              id="donor-taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="12345678A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donor-iban">{t.returnImporter.createDonor.labelIban}</Label>
            <Input
              id="donor-iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donor-zipCode">{t.returnImporter.createDonor.labelZipCode}</Label>
            <Input
              id="donor-zipCode"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="08001"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.returnImporter.createDonor.creating : t.returnImporter.createDonor.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
