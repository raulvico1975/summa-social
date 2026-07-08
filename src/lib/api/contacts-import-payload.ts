type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value
      .map(stripUndefinedDeep)
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    const cleaned: PlainObject = {};
    for (const [key, nested] of Object.entries(value)) {
      const cleanedValue = stripUndefinedDeep(nested);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }

  return value;
}

export function sanitizeContactImportData(data: unknown): PlainObject {
  if (!isPlainObject(data)) {
    throw new Error('Contact update data must be a plain object');
  }

  const sanitized = stripUndefinedDeep(data) as PlainObject;
  delete sanitized.archivedAt;
  delete sanitized.archivedByUid;
  delete sanitized.archivedFromAction;
  return sanitized;
}
