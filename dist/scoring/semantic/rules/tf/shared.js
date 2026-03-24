export function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
export function countMatches(text, terms) {
    return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}
export function countRegexHits(text, patterns) {
    return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}
export function firstFragment(text) {
    return text.split(/[.!?]/)[0]?.trim() ?? "";
}
