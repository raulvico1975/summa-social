// src/components/project-module/quick-expense-screen.tsx
// Pantalla minimalista per captura ràpida de despeses (<10s)
// Flux: Foto → Import → Guardar
// Auto: date=avui, needsReview=true, sense projecte/partida

'use client';

import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useStorage } from '@/firebase/provider';
import { useSaveOffBankExpense } from '@/hooks/use-project-module';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { suggestCategory } from '@/lib/expense-category-suggestions';
import type { OffBankAttachment } from '@/lib/project-module-types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, Loader2, Check, Image as ImageIcon, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useOrgUrl } from '@/hooks/organization-provider';

// =============================================================================
// TYPES
// =============================================================================

interface QuickExpenseScreenProps {
  organizationId: string;
  /** Mode landing: 100dvh, sense scroll, footer absolut amb safe-area */
  isLandingMode?: boolean;
}

interface PendingUpload {
  file: File;
  id: string;
  uploading: boolean;
  url?: string;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPTED_DOC_TYPES = ['application/pdf'];
const ALL_ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOC_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =============================================================================
// HELPERS
// =============================================================================

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  }
  return <FileText className="h-5 w-5 text-gray-500" />;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function QuickExpenseScreen({ organizationId, isLandingMode = false }: QuickExpenseScreenProps) {
  const storage = useStorage();
  const { save, isSaving } = useSaveOffBankExpense();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { buildUrl } = useOrgUrl();

  // Textos i18n
  const q = t.projectModule?.quickExpense;

  // Refs per inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estats
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [amountEUR, setAmountEUR] = useState('');
  const [concept, setConcept] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derivats
  const hasAttachments = uploads.some(u => u.url && !u.error);
  const isUploading = uploads.some(u => u.uploading);
  const canSubmit = hasAttachments && !isUploading && !isSubmitting;

  // ---------------------------------------------------------------------------
  // FILE UPLOAD
  // ---------------------------------------------------------------------------

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const tempId = generateTempId();
    const storagePath = `organizations/${organizationId}/offBankExpenses/temp/${tempId}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      return downloadURL;
    } catch (error) {
      console.error('[QuickExpense] Upload error:', error);
      return null;
    }
  }, [storage, organizationId]);

  const handleFiles = useCallback(async (files: File[]) => {
    const validFiles: PendingUpload[] = [];

    for (const file of files) {
      // Validar tipus
      if (!ALL_ACCEPTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        console.warn(`[QuickExpense] Tipus no acceptat: ${file.type}`);
        continue;
      }

      // Validar mida
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`[QuickExpense] Fitxer massa gran: ${file.name}`);
        continue;
      }

      validFiles.push({
        file,
        id: generateTempId(),
        uploading: true,
      });
    }

    if (validFiles.length === 0) return;

    // Afegir a la llista
    setUploads(prev => [...prev, ...validFiles]);

    // Pujar cadascun
    for (const pending of validFiles) {
      const url = await uploadFile(pending.file);

      setUploads(prev =>
        prev.map(p =>
          p.id === pending.id
            ? { ...p, uploading: false, url: url ?? undefined, error: url ? undefined : 'Error' }
            : p
        )
      );
    }
  }, [uploadFile]);

  const handleRemoveUpload = useCallback(async (id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload?.url) {
      try {
        const storageRef = ref(storage, upload.url);
        await deleteObject(storageRef).catch(() => {});
      } catch {}
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  }, [uploads, storage]);

  // ---------------------------------------------------------------------------
  // CAMERA HANDLER
  // ---------------------------------------------------------------------------

  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
    e.target.value = '';
  }, [handleFiles]);

  // ---------------------------------------------------------------------------
  // SUBMIT
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      // Preparar attachments
      const attachments: OffBankAttachment[] = uploads
        .filter(u => u.url && !u.error)
        .map(u => ({
          url: u.url!,
          name: u.file.name,
          contentType: u.file.type,
          size: u.file.size,
          uploadedAt: new Date().toISOString().split('T')[0],
        }));

      // Data d'avui
      const today = new Date().toISOString().split('T')[0];

      // Concepte per defecte si buit
      const finalConcept = concept.trim() || 'Despesa ràpida';

      // Suggerir categoria basada en concepte
      const suggestedCategory = suggestCategory(finalConcept);

      // Import: si buit, serà null (es pot afegir després)
      const finalAmountEUR = amountEUR.trim() || '0';

      await save({
        date: today,
        concept: finalConcept,
        amountEUR: finalAmountEUR,
        counterpartyName: '',
        categoryName: suggestedCategory ?? '',
        attachments,
        needsReview: true,
      });

      // Èxit
      toast({
        title: q?.successTitle ?? 'Despesa guardada',
        description: q?.successBody ?? 'Pots continuar afegint més despeses.',
      });

      // Reset form per encadenar
      setUploads([]);
      setAmountEUR('');
      setConcept('');

    } catch (error) {
      console.error('[QuickExpense] Save error:', error);
      toast({
        title: q?.errorTitle ?? 'Error',
        description: q?.errorBody ?? 'No s\'ha pogut guardar. Torna-ho a provar.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, uploads, amountEUR, concept, save, toast, q]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Limitar visualització d'adjunts en mode landing (màxim 2 visibles)
  const visibleUploads = isLandingMode ? uploads.slice(0, 2) : uploads;
  const hiddenCount = isLandingMode ? Math.max(0, uploads.length - 2) : 0;

  return (
    <div
      className={
        isLandingMode
          ? 'h-[100dvh] bg-background flex flex-col overflow-hidden'
          : 'min-h-screen bg-background flex flex-col'
      }
    >
      {/* Header minimalista */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        {isLandingMode ? (
          <div className="w-20" />
        ) : (
          <Link href={buildUrl('/project-module/expenses')}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t.common?.back ?? 'Tornar'}
            </Button>
          </Link>
        )}
        <h1 className="font-semibold text-lg">
          {q?.title ?? 'Despesa ràpida'}
        </h1>
        <div className="w-20" /> {/* Spacer per centrar títol */}
      </div>

      {/* Contingut principal */}
      <div
        className={
          isLandingMode
            ? 'flex-1 flex flex-col p-4 gap-4 max-w-lg mx-auto w-full overflow-y-auto'
            : 'flex-1 flex flex-col p-4 gap-6 max-w-lg mx-auto w-full'
        }
      >

        {/* Secció 1: Captura foto/fitxer */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            {q?.attachmentLabel ?? 'Comprovant *'}
          </Label>

          {/* Botons captura */}
          <div className="flex gap-3">
            {/* Botó càmera (principal) */}
            <Button
              type="button"
              variant="default"
              size="lg"
              className="flex-1 h-20 flex-col gap-1"
              onClick={handleCameraClick}
              disabled={isUploading}
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">{q?.cameraButton ?? 'Fer foto'}</span>
            </Button>

            {/* Botó fitxer (secundari) */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-20 flex-col gap-1"
              onClick={handleFileClick}
              disabled={isUploading}
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm">{q?.uploadButton ?? 'Pujar fitxer'}</span>
            </Button>
          </div>

          {/* Inputs ocults */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />

          {/* Llista de fitxers pujats/pujant */}
          {uploads.length > 0 && (
            <div className="space-y-2 mt-3">
              {visibleUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {upload.uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : upload.error ? (
                    <X className="h-5 w-5 text-destructive" />
                  ) : (
                    getFileIcon(upload.file.type)
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.uploading
                        ? (q?.uploading ?? 'Pujant...')
                        : upload.error
                          ? upload.error
                          : formatFileSize(upload.file.size)}
                    </p>
                  </div>

                  {!upload.uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemoveUpload(upload.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {hiddenCount > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{hiddenCount} fitxer{hiddenCount > 1 ? 's' : ''} més
                </p>
              )}
            </div>
          )}
        </div>

        {/* Secció 2: Import */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-base font-medium">
            {q?.amountLabel ?? 'Import (EUR)'}
          </Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amountEUR}
            onChange={(e) => setAmountEUR(e.target.value)}
            className="text-2xl h-14 font-mono text-center"
          />
          <p className="text-xs text-muted-foreground text-center">
            {q?.amountHint ?? 'Pots deixar-ho buit i afegir-ho després'}
          </p>
        </div>

        {/* Secció 3: Nota/concepte (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="concept" className="text-base font-medium">
            {q?.conceptLabel ?? 'Nota (opcional)'}
          </Label>
          <Input
            id="concept"
            type="text"
            placeholder={q?.conceptPlaceholder ?? 'Ex: Taxi aeroport, Material oficina...'}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="h-12"
          />
        </div>

        {/* Spacer (només en mode normal) */}
        {!isLandingMode && <div className="flex-1" />}
      </div>

      {/* Footer amb botó guardar */}
      <div
        className={
          isLandingMode
            ? 'shrink-0 bg-background pt-4 px-4 border-t'
            : 'sticky bottom-0 bg-background pt-4 pb-6 -mx-4 px-4 border-t max-w-lg mx-auto w-full'
        }
        style={isLandingMode ? { paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' } : undefined}
      >
        <div className="max-w-lg mx-auto">
          <Button
            type="button"
            size="lg"
            className="w-full h-14 text-lg"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {q?.saving ?? 'Guardant...'}
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                {q?.saveButton ?? 'Guardar despesa'}
              </>
            )}
          </Button>

          {!hasAttachments && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              {q?.attachmentRequired ?? 'Cal afegir almenys un comprovant'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
