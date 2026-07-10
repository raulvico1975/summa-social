export const APP_REVISION_STORAGE_KEY = 'summa-active-revision';

export function shouldReloadForRevision(
  previousRevision: string | null,
  currentRevision: string | null
): boolean {
  return Boolean(
    previousRevision
    && currentRevision
    && previousRevision !== currentRevision
  );
}
