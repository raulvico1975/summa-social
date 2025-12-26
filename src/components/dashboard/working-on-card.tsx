'use client';

import * as React from 'react';
import { WORKING_ON } from '@/content/product-updates';
import { cn } from '@/lib/utils';

export function WorkingOnCard({ className }: { className?: string }) {
  if (!WORKING_ON || WORKING_ON.length === 0) return null;

  return (
    <div className={cn('rounded-lg border bg-card px-4 py-3', className)}>
      <div className="text-sm font-medium">🛠️ En què estem treballant</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {WORKING_ON.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
