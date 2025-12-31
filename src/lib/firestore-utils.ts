// src/lib/firestore-utils.ts
// Utilitats per treballar amb Firestore de forma segura

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
 */
export function stripUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
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
