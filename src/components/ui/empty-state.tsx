import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState component per mostrar quan no hi ha dades.
 * Segueix el Design Contract: to institucional, sense emojis, neutral.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('border border-border rounded-lg p-6 text-center', className)}>
      {Icon && (
        <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {children && (
        <div className="mt-4 flex justify-center gap-2">{children}</div>
      )}
    </div>
  );
}
