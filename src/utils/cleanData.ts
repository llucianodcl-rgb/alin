/**
 * Recursively removes undefined values from an object.
 * Firestore does not support undefined values.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanUndefined(item)) as any;
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        result[key] = cleanUndefined(value);
      }
    }
  }
  return result;
}
