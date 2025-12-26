'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface RowDropTargetProps {
  /** Desactiva el drop target (per a viewers sense permisos) */
  disabled?: boolean;
  /** Callback quan es deixa anar un fitxer */
  onDropFile: (file: File) => Promise<void> | void;
  /** Text a mostrar durant dragover */
  dropHint?: string;
  /** Classes CSS addicionals */
  className?: string;
  /** Contingut de la fila */
  children: React.ReactNode;
  /** Element HTML a renderitzar (per defecte 'tr' per taules) */
  as?: 'tr' | 'div';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/xml',
  'text/xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// =============================================================================
// HELPERS
// =============================================================================

function isValidFile(file: File): boolean {
  // Acceptar per tipus MIME
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Acceptar per extensió .xml (alguns navegadors no detecten MIME)
  if (file.name.toLowerCase().endsWith('.xml')) return true;
  // Acceptar imatges genèriques
  if (file.type.startsWith('image/')) return true;
  return false;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const RowDropTarget = React.memo(function RowDropTarget({
  disabled = false,
  onDropFile,
  dropHint = 'Deixa anar per adjuntar',
  className,
  children,
  as = 'tr',
}: RowDropTargetProps) {
  // Comptador per gestionar dragenter/dragleave de children sense flicker
  const dragCounterRef = React.useRef(0);
  const [isOver, setIsOver] = React.useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsOver(true);
    }
  }, [disabled]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsOver(false);
    }
  }, [disabled]);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    // Indicar que acceptem drop
    e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset state
    dragCounterRef.current = 0;
    setIsOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Agafar només el primer fitxer
    const file = files[0];

    // Validar tipus
    if (!isValidFile(file)) {
      console.warn('[RowDropTarget] Tipus no acceptat:', file.type, file.name);
      return;
    }

    // Validar mida
    if (file.size > MAX_FILE_SIZE) {
      console.warn('[RowDropTarget] Fitxer massa gran:', file.size);
      return;
    }

    // Cridar callback
    onDropFile(file);
  }, [disabled, onDropFile]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const Element = as;

  // Quan disabled, renderitzem sense handlers de drag
  if (disabled) {
    return (
      <Element className={className}>
        {children}
      </Element>
    );
  }

  return (
    <Element
      className={cn(
        className,
        'relative transition-all duration-150',
        isOver && 'ring-2 ring-primary/40 bg-primary/5'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Overlay amb hint quan isOver */}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 pointer-events-none z-10">
          <span className="text-xs font-medium text-primary bg-background/90 px-2 py-1 rounded shadow-sm">
            {dropHint}
          </span>
        </div>
      )}
    </Element>
  );
});
