// src/lib/firestore-utils.ts
// Utilitats per treballar amb Firestore de forma segura

import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * Comprova si un valor és un Timestamp de Firestore.
 */
function isTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp ||
    (value !== null &&
     typeof value === 'object' &&
     'toDate' in value &&
     typeof (value as Timestamp).toDate === 'function');
}

/**
 * Comprova si un valor és un FieldValue de Firestore (serverTimestamp, etc.).
 */
function isFieldValue(value: unknown): value is FieldValue {
  return value instanceof FieldValue ||
    (value !== null &&
     typeof value === 'object' &&
     '_methodName' in value);
}

/**
 * Elimina propietats amb valor `undefined` d'un objecte.
 * Firestore no accepta `undefined` com a valor - causa errors silenciosos.
 *
 * Usar sempre abans d'escriure a Firestore:
 * - setDoc(docRef, stripUndefined(data))
 * - updateDoc(docRef, stripUndefined(updates))
 *
 * Per valors opcionals, usar `?? null` explícitament:
 * - { field: value ?? null }
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

/**
 * Versió profunda de stripUndefined per objectes niuats.
 * Recorre recursivament i elimina propietats undefined a tots els nivells.
 *
 * IMPORTANT: Protegeix Timestamp i FieldValue de Firestore per no destruir-los.
 */
export function stripUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Protegir Timestamp i FieldValue (serverTimestamp, etc.)
  if (isTimestamp(obj) || isFieldValue(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefinedDeep(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = stripUndefinedDeep(value);
      }
    }
    return result as T;
  }

  return obj;
}
