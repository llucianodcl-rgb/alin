/**
 * Utility functions for case-insensitive and accent-insensitive search matching.
 */

export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function matchText(text: string | undefined | null, query: string): boolean {
  if (!text) return false;
  const cleanText = removeAccents(text.toLowerCase());
  const cleanQuery = removeAccents(query.toLowerCase());
  return cleanText.includes(cleanQuery);
}
