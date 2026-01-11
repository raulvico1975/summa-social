'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type MobileMetaItem = {
  label?: string;
  value: React.ReactNode;
};

type MobileListItemProps = {
  title: React.ReactNode;
  meta?: MobileMetaItem[];
  badges?: React.ReactNode[];
  actions?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

export function MobileListItem({
  title,
  meta,
  badges,
  actions,
  leadingIcon,
  onClick,
  className,
}: MobileListItemProps) {
  return (
    <div
      className={cn(
        'border border-border/50 rounded-lg p-3 flex flex-col gap-2',
        onClick && 'cursor-pointer active:bg-muted/50',
        className
      )}
      onClick={onClick}
    >
      {/* Header: icon + title + badges + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {leadingIcon && (
            <div className="flex-shrink-0 text-muted-foreground mt-0.5">
              {leadingIcon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{title}</div>
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {badges}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex-shrink-0 flex items-center">
            {actions}
          </div>
        )}
      </div>

      {/* Metadades */}
      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {meta.map((item, index) => (
            <span key={index}>
              {item.label && <span className="font-medium">{item.label}: </span>}
              {item.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
