// src/lib/ux/trackUX.ts
// Helper mínim per instrumentació UX local

export function trackUX(event: string, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const timestamp = new Date().toISOString();
  console.info('[UX]', timestamp, event, meta ?? {});
}
