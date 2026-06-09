import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { openDocumentUrl } from '../open-document-url';

const originalWindow = globalThis.window;

afterEach(() => {
  globalThis.window = originalWindow;
});

test('openDocumentUrl opens documents in a new isolated tab', () => {
  const calls: unknown[][] = [];
  globalThis.window = {
    open: (...args: unknown[]) => {
      calls.push(args);
      return null;
    },
  } as unknown as Window & typeof globalThis;

  openDocumentUrl('https://storage.local/document.pdf');

  assert.deepEqual(calls, [
    ['https://storage.local/document.pdf', '_blank', 'noopener,noreferrer'],
  ]);
});

test('openDocumentUrl ignores empty URLs', () => {
  const calls: unknown[][] = [];
  globalThis.window = {
    open: (...args: unknown[]) => {
      calls.push(args);
      return null;
    },
  } as unknown as Window & typeof globalThis;

  openDocumentUrl('');

  assert.deepEqual(calls, []);
});
