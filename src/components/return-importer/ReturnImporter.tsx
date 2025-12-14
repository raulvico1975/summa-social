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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { useReturnImporter } from './useReturnImporter';
import { useTranslations } from '@/i18n';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface ReturnImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function ReturnImporter({
  open,
  onOpenChange,
  onComplete,
}: ReturnImporterProps) {
  const { t } = useTranslations();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());
  const [dragActive, setDragActive] = React.useState(false);

  const {
    step,
    setStep,
    isProcessing,
    files,
    allRows,
    startRow,
    setStartRow,
    previewRows,
    numColumns,
    mapping,
    setMapping,
    parsedReturns,
    stats,
    parseFiles,
    performMatching,
    processReturns,
    reset,
  } = useReturnImporter();

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
        title: 'Format no vàlid',
        description: 'Només es permeten fitxers CSV o Excel (.xlsx, .xls)'
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
    await processReturns();
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
                CSV, Excel (.xlsx, .xls) - Múltiples fitxers permesos
              </p>
            </div>

            {/* Fitxers seleccionats */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{files.length} fitxer(s) seleccionat(s):</p>
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
                Llegint fitxers...
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel·lar
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
                {t.returnImporter?.results || "Resultat del matching"}
              </DialogTitle>
              <DialogDescription>
                Revisa les coincidències i selecciona les devolucions a assignar
              </DialogDescription>
            </DialogHeader>

            {/* Resum */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {stats.matched} {t.returnImporter?.found || "coincidències completes"}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {stats.donorFound} donants sense transacció
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <X className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {stats.notFound} {t.returnImporter?.notFound || "no trobats"}
                </span>
              </div>
            </div>

            {/* Taula de resultats */}
            <ScrollArea className="h-[350px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === selectableCount && selectableCount > 0}
                        onCheckedChange={handleToggleAll}
                        disabled={selectableCount === 0}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Import</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Donant</TableHead>
                    <TableHead>Devolució</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedReturns.map((item, index) => (
                    <TableRow
                      key={index}
                      className={
                        item.status === 'matched' ? 'bg-green-50/50' :
                        item.status === 'donor_found' ? 'bg-yellow-50/50' :
                        'bg-red-50/30'
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(index)}
                          onCheckedChange={() => handleToggleRow(index)}
                          disabled={item.status === 'not_found'}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.date || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrencyEU(item.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncateIban(item.iban)}
                      </TableCell>
                      <TableCell>
                        {item.matchedDonor ? (
                          <span className="text-sm text-green-700 font-medium">
                            {item.matchedDonor.name}
                          </span>
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
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.matchedTransaction ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Sí
                          </Badge>
                        ) : item.matchedDonor ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            No
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Info */}
            <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <p>
                <strong>{selectedRows.size}</strong> devolucions seleccionades per assignar.
                {stats.donorFound > 0 && (
                  <> Les que no tenen transacció coincident actualitzaran igualment el comptador de devolucions del donant.</>
                )}
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar
              </Button>
              <Button
                onClick={handleProcess}
                disabled={isProcessing || selectedRows.size === 0}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t.returnImporter?.process || "Assignar"} {selectedRows.size} devolucions
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4: PROCESSING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Processant devolucions...</p>
            <p className="text-sm text-muted-foreground">
              Assignant donants i actualitzant comptadors
            </p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
