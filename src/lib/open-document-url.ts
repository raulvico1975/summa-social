export function openDocumentUrl(url: string): void {
  if (!url) return;
  window.location.assign(url);
}
