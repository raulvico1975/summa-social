'use client';

import * as React from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useStorage } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/i18n';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Pencil, Check, XCircle } from 'lucide-react';
import type { OffBankAttachment } from '@/lib/project-module-types';

// =============================================================================
// TYPES
// =============================================================================

interface ExpenseAttachmentsDropzoneProps {
  organizationId: string;
  expenseId: string | null; // null si és una despesa nova (encara no guardada)
  attachments: OffBankAttachment[];
  onAttachmentsChange: (attachments: OffBankAttachment[]) => void;
  disabled?: boolean;
  /** Funció opcional per generar el nom del fitxer a Storage. Rep el nom original i retorna el nom final. */
  buildFileName?: (originalName: string) => string;
}

interface PendingFile {
  file: File;
  id: string;
  uploading: boolean;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ACCEPT_STRING = 'application/pdf,image/*,.doc,.docx,.xls,.xlsx';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// =============================================================================
// HELPERS
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  return <FileText className="h-4 w-4 text-gray-500" />;
}

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExpenseAttachmentsDropzone({
  organizationId,
  expenseId,
  attachments,
  onAttachmentsChange,
  disabled = false,
  buildFileName,
}: ExpenseAttachmentsDropzoneProps) {
  const storage = useStorage();
  const { t } = useTranslations();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([]);
  const [deletingUrls, setDeletingUrls] = React.useState<Set<string>>(new Set());
  // Estat per renomenar attachments
  const [editingUrl, setEditingUrl] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>('');

  // Textos i18n
  const texts = {
    dropzone: t.projectModule.dropzoneTitle,
    or: t.projectModule.dropzoneOr,
    selectFiles: t.projectModule.dropzoneSelect,
    uploading: t.projectModule.dropzoneUploading,
    maxSize: t.projectModule.dropzoneMaxSize,
    fileTooLarge: t.projectModule.dropzoneFileTooLarge,
    invalidType: t.projectModule.dropzoneInvalidType,
    uploadError: t.projectModule.dropzoneUploadError,
  };

  // ---------------------------------------------------------------------------
  // DRAG & DROP HANDLERS
  // ---------------------------------------------------------------------------

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [disabled]);

  // ---------------------------------------------------------------------------
  // FILE HANDLING
  // ---------------------------------------------------------------------------

  const handleFiles = React.useCallback(async (files: File[]) => {
    const validFiles: PendingFile[] = [];

    for (const file of files) {
      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        console.warn(`[Dropzone] Tipus no acceptat: ${file.type}`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`[Dropzone] Fitxer massa gran: ${file.name} (${formatFileSize(file.size)})`);
        continue;
      }

      validFiles.push({
        file,
        id: generateTempId(),
        uploading: true,
      });
    }

    if (validFiles.length === 0) return;

    setPendingFiles(prev => [...prev, ...validFiles]);

    // Upload each file
    for (const pending of validFiles) {
      await uploadFile(pending);
    }
  }, [organizationId, expenseId, storage, attachments, onAttachmentsChange]);

  const uploadFile = async (pending: PendingFile) => {
    const { file, id } = pending;
    const storageFolder = expenseId || 'temp';
    // Usar buildFileName si està disponible, sinó usar timestamp + nom original
    const finalFileName = buildFileName ? buildFileName(file.name) : `${Date.now()}_${file.name}`;
    const storagePath = `organizations/${organizationId}/offBankExpenses/${storageFolder}/${finalFileName}`;
    const storageRef = ref(storage, storagePath);

    try {
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      const newAttachment: OffBankAttachment = {
        url: downloadURL,
        name: finalFileName,
        contentType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString().split('T')[0],
      };

      // Remove from pending
      setPendingFiles(prev => prev.filter(p => p.id !== id));

      // Add to attachments
      onAttachmentsChange([...attachments, newAttachment]);
    } catch (error) {
      console.error('[Dropzone] Upload error:', error);
      setPendingFiles(prev =>
        prev.map(p => (p.id === id ? { ...p, uploading: false, error: texts.uploadError } : p))
      );
    }
  };

  // ---------------------------------------------------------------------------
  // DELETE HANDLER
  // ---------------------------------------------------------------------------

  const handleDelete = React.useCallback(async (attachment: OffBankAttachment) => {
    setDeletingUrls(prev => new Set(prev).add(attachment.url));

    try {
      // Try to delete from storage (may fail if already deleted or temp)
      const storageRef = ref(storage, attachment.url);
      await deleteObject(storageRef).catch(() => {
        // Ignore errors - file may not exist
      });
    } finally {
      setDeletingUrls(prev => {
        const next = new Set(prev);
        next.delete(attachment.url);
        return next;
      });

      // Remove from list
      onAttachmentsChange(attachments.filter(a => a.url !== attachment.url));
    }
  }, [storage, attachments, onAttachmentsChange]);

  const handleRemovePending = React.useCallback((id: string) => {
    setPendingFiles(prev => prev.filter(p => p.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // RENAME HANDLER
  // ---------------------------------------------------------------------------

  const handleStartRename = React.useCallback((attachment: OffBankAttachment) => {
    setEditingUrl(attachment.url);
    // Treure l'extensió per editar només el nom
    const nameParts = attachment.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const baseName = nameParts.join('.');
    setEditingName(baseName);
  }, []);

  const handleCancelRename = React.useCallback(() => {
    setEditingUrl(null);
    setEditingName('');
  }, []);

  const handleSaveRename = React.useCallback((attachment: OffBankAttachment) => {
    if (!editingName.trim()) {
      handleCancelRename();
      return;
    }

    // Recuperar l'extensió original
    const nameParts = attachment.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const newName = ext ? `${editingName.trim()}.${ext}` : editingName.trim();

    // Actualitzar l'attachment amb el nou nom
    const updatedAttachments = attachments.map(a =>
      a.url === attachment.url ? { ...a, name: newName } : a
    );

    onAttachmentsChange(updatedAttachments);
    setEditingUrl(null);
    setEditingName('');
  }, [attachments, editingName, onAttachmentsChange]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Dropzone area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_STRING}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              handleFiles(files);
            }
            // Reset input
            e.target.value = '';
          }}
        />

        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">{texts.dropzone}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {texts.or}{' '}
          <span className="text-primary underline">{texts.selectFiles}</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">{texts.maxSize}</p>
      </div>

      {/* Pending files (uploading) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((pending) => (
            <div
              key={pending.id}
              className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm"
            >
              {pending.uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
              <span className="flex-1 truncate">{pending.file.name}</span>
              <span className="text-xs text-muted-foreground">
                {pending.uploading ? texts.uploading : pending.error}
              </span>
              {!pending.uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePending(pending.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const isDeleting = deletingUrls.has(attachment.url);
            const isEditing = editingUrl === attachment.url;

            return (
              <div
                key={attachment.url}
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm"
              >
                {getFileIcon(attachment.contentType)}

                {isEditing ? (
                  // Mode edició
                  <>
                    <Input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-6 flex-1 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveRename(attachment);
                        } else if (e.key === 'Escape') {
                          handleCancelRename();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveRename(attachment);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelRename();
                      }}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  // Mode visualització
                  <>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {attachment.name}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </span>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(attachment);
                        }}
                        title="Renomenar"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={isDeleting || disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(attachment);
                      }}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
