export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function countMatches(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

export function countRegexHits(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

export function firstFragment(text: string): string {
  return text.split(/[.!?]/)[0]?.trim() ?? "";
}