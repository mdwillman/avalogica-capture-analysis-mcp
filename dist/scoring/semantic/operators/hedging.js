/**
 * Hedging / downtoner operator utilities.
 *
 * Goal: detect hedging language that typically reduces confidence and/or
 * softens a stated preference:
 *   "kind of", "maybe", "it depends", "I guess", "not really", etc.
 *
 * This is Stage 1 heuristic logic:
 * - phrase/substring matching (case-insensitive)
 * - light boundary checks for single-word hedges
 * - returns counts + spans so scorers can apply confidence modifiers
 *
 * Intended uses:
 * - Confidence gating (coverage/consistency later)
 * - Within-scorer confidence tweaks (e.g., reduce confidence if answer is hedged)
 * - JP (certainty needed), NS (tolerance of uncertainty), general
 */
const DEFAULT_OPTS = {
    includeFillers: false,
    includeSoftenors: true,
    enableHeuristics: true,
};
// Strong hedges: explicit uncertainty / non-commitment.
const HEDGE_STRONG = [
    "it depends",
    "depends",
    "i'm not sure",
    "i am not sure",
    "not sure",
    "i don't know",
    "i do not know",
    "hard to say",
    "can't say",
    "cannot say",
    "no idea",
    "unclear",
    "maybe",
    "perhaps",
    "possibly",
    "we'll see",
    "we will see",
];
// Medium hedges: softened commitment / tentative stance.
const HEDGE_MEDIUM = [
    "i think",
    "i guess",
    "i believe",
    "i feel like",
    "it seems",
    "probably",
    "likely",
    "in general",
    "usually",
    "often",
    "sometimes",
    "tend to",
    "more or less",
    "most of the time",
    "for the most part",
];
// Weak hedges / downtoners: partial attenuation.
const HEDGE_WEAK_BASE = [
    "kind of",
    "kinda",
    "sort of",
    "sorta",
    "a bit",
    "a little",
    "not really",
    "not exactly",
    "not necessarily",
    "i mean",
    "to be honest",
    "honestly",
    "at times",
];
const SOFTENORS = ["somewhat", "pretty", "fairly", "rather", "quite"];
const FILLERS = ["like", "um", "uh", "erm", "hmm"]; // conservative; can be noisy
// ---------------------------
// Matching helpers
// ---------------------------
function normalize(input) {
    return input.toLowerCase().replace(/\u2019/g, "'");
}
function isWordChar(ch) {
    return /[a-z0-9']/i.test(ch);
}
function boundaryOk(textLower, start, end) {
    const before = start - 1 >= 0 ? textLower[start - 1] : " ";
    const after = end < textLower.length ? textLower[end] : " ";
    const beforeOk = !isWordChar(before);
    const afterOk = !isWordChar(after);
    return beforeOk && afterOk;
}
function findPhraseHits(text, phrases, strength) {
    const lower = normalize(text);
    const hits = [];
    for (const phrase of phrases) {
        const p = phrase.toLowerCase();
        if (!p)
            continue;
        let idx = 0;
        while (idx < lower.length) {
            const at = lower.indexOf(p, idx);
            if (at === -1)
                break;
            const start = at;
            const end = at + p.length;
            // Enforce boundaries for single-word hedges (e.g., "like" inside "likely").
            const needsBoundary = !p.includes(" ");
            if (!needsBoundary || boundaryOk(lower, start, end)) {
                hits.push({ start, end, phrase, strength });
            }
            idx = at + Math.max(1, p.length);
        }
    }
    hits.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));
    return hits;
}
export function summarizeHedging(text, opts) {
    const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };
    const weak = [...HEDGE_WEAK_BASE, ...(o.includeSoftenors ? SOFTENORS : []), ...(o.includeFillers ? FILLERS : [])];
    const hits = [
        ...findPhraseHits(text, HEDGE_STRONG, "strong"),
        ...findPhraseHits(text, HEDGE_MEDIUM, "medium"),
        ...findPhraseHits(text, weak, "weak"),
    ];
    const cleaned = o.enableHeuristics ? pruneFalsePositives(text, hits) : hits;
    const counts = { weak: 0, medium: 0, strong: 0 };
    for (const h of cleaned)
        counts[h.strength] += 1;
    // Hedge index: weighted sum mapped to [0,1].
    // strong=1.0, medium=0.6, weak=0.35 with diminishing returns.
    const raw = counts.strong * 1.0 + counts.medium * 0.6 + counts.weak * 0.35;
    const hedgeIndex01 = 1 - Math.exp(-raw / 2.25); // smooth saturation
    return {
        hits: cleaned.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start)),
        counts,
        hedgeIndex01: clamp01(hedgeIndex01),
    };
}
/**
 * Convenience: map hedgeIndex01 -> confidence multiplier.
 *
 * Stage 1 suggestion:
 * - no hedging => ~1.0
 * - heavy hedging => down to ~0.75
 */
export function hedgingConfidenceMultiplier(hedgeIndex01) {
    return clamp(1.0 - 0.25 * clamp01(hedgeIndex01), 0.7, 1.0);
}
// ---------------------------
// Heuristic pruning
// ---------------------------
function pruneFalsePositives(text, hits) {
    const lower = normalize(text);
    return hits.filter((h) => {
        const p = h.phrase.toLowerCase();
        // Avoid matching "like" inside "likely" if fillers enabled.
        if (p === "like") {
            // already boundary-checked; additionally ignore "like" in "like to" which is often preference, not hedging.
            const ctx = lower.slice(h.start, Math.min(lower.length, h.end + 4));
            if (/like\s+to/.test(ctx))
                return false;
        }
        // "honestly" / "to be honest" can be emphasis rather than hedging; keep as weak.
        // "usually" / "often" / "sometimes": keep as medium (they indicate probabilistic stance)
        return true;
    });
}
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}
