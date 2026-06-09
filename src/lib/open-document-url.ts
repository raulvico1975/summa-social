export function openDocumentUrl(url: string): void {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
