import * as admin from "firebase-admin";

function isFirestoreSpecialValue(value: unknown): boolean {
  return value instanceof Date ||
    value instanceof admin.firestore.Timestamp ||
    value instanceof admin.firestore.FieldValue;
}

export function sanitizeFirestoreWritePayload<T>(value: T): T {
  if (value === undefined || value === null) return value;

  if (isFirestoreSpecialValue(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const cleaned = sanitizeFirestoreWritePayload(item);
      if (cleaned !== undefined) {
        out.push(cleaned);
      }
    }
    return out as T;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      const cleaned = sanitizeFirestoreWritePayload(nested);
      if (cleaned !== undefined) {
        out[key] = cleaned;
      }
    }
    return out as T;
  }

  return value;
}
