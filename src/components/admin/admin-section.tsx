'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type AdminSectionTone = 'neutral' | 'warn' | 'info' | 'content';

interface AdminSectionProps {
  id: string;
  title: string;
  description?: string;
  tone?: AdminSectionTone;
  children: React.ReactNode;
  className?: string;
}

const toneStyles: Record<AdminSectionTone, { border: string; bg: string; title: string }> = {
  neutral: {
    border: 'border-l-4 border-l-border',
    bg: 'bg-card',
    title: 'text-foreground',
  },
  warn: {
    border: 'border-l-4 border-l-amber-400',
    bg: 'bg-amber-50/30',
    title: 'text-amber-900',
  },
  info: {
    border: 'border-l-4 border-l-blue-400',
    bg: 'bg-blue-50/30',
    title: 'text-blue-900',
  },
  content: {
    border: 'border-l-4 border-l-green-400',
    bg: 'bg-green-50/30',
    title: 'text-green-900',
  },
};

/**
 * AdminSection - Wrapper reutilitzable per seccions del panell SuperAdmin.
 * Proporciona estil consistent amb tone visual i anchors per navegació.
 */
export function AdminSection({
  id,
  title,
  description,
  tone = 'neutral',
  children,
  className,
}: AdminSectionProps) {
  const styles = toneStyles[tone];

  return (
    <section
      id={id}
      className={cn(
        'rounded-lg border shadow-sm scroll-mt-20',
        styles.border,
        styles.bg,
        className
      )}
    >
      <div className="px-6 py-4 border-b bg-card/50">
        <h2 className={cn('text-lg font-semibold', styles.title)}>{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </section>
  );
}
