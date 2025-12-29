// src/app/[orgSlug]/dashboard/project-module/quick-expense/layout.tsx
// Layout "blank" per a Quick Expense: cobreix visualment el dashboard amb position fixed
// Això permet mantenir la ruta canònica dins de /dashboard sense heretar sidebar/header

'use client';

export default function QuickExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="min-h-[100dvh] flex flex-col">
        {children}
      </div>
    </div>
  );
}
