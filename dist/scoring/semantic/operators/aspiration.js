/**
 * Aspiration / ideal-self vs actual-behavior operator utilities.
 *
 * Goal: detect when a speaker is describing:
 *  - aspiration / wished-for identity ("I wish I were...", "I'd like to be...")
 *  - obligation-driven identity ("I should be...", "I have to be...")
 *  - actual current behavior ("I am...", "I usually...")
 *
 * Why: In prompt responses, people often answer with an idealized self
 * description that differs from their actual behavior:
 *   "I want to be more outgoing, but I'm usually quiet at parties."
 *
 * This is Stage 1 heuristic logic:
 * - phrase matching + light boundaries
 * - provides spans so scorers can weight "actual" higher than "aspiration"
 * - optionally integrates with contrast operator upstream (not required)
 */
const DEFAULT_OPTS = {
    includeInformal: true,
    enableHeuristics: true,
};
// ---------------------------
// Phrase inventories
// ---------------------------
// Aspirational / ideal-self language
const ASPIRATION_STRONG = [
    "i wish i were",
    "i wish i was",
    "i wish i could be",
    "i want to be",
    "i'd like to be",
    "i would like to be",
    "my ideal is",
    "in my ideal world",
];
const ASPIRATION_MEDIUM = [
    "i want to",
    "i'd like to",
    "i would like to",
    "i hope to",
    "i'm trying to",
    "i am trying to",
    "i'm working on",
    "i am working on",
    "i'm aiming to",
    "i am aiming to",
    "i'm learning to",
    "i am learning to",
];
const ASPIRATION_WEAK = [
    "i'd prefer to be",
    "i would prefer to be",
    "i'd prefer to",
    "i would prefer to",
    "i'd love to",
    "i would love to",
    "it would be nice to",
    "someday",
];
// Obligation / duty-driven language (can masquerade as aspiration)
const OBLIGATION_STRONG = [
    "i have to be",
    "i need to be",
    "i must be",
    "i'm required to",
    "i am required to",
    "i don't have a choice",
    "i do not have a choice",
];
const OBLIGATION_MEDIUM = [
    "i should be",
    "i ought to be",
    "i'm supposed to be",
    "i am supposed to be",
    "i should",
    "i ought to",
    "i'm supposed to",
    "i am supposed to",
];
const OBLIGATION_WEAK = [
    "it would be better if i",
    "i probably should",
    "i guess i should",
];
// Actual / behavioral reporting language
const ACTUAL_STRONG = [
    "i am",
    "i'm",
    "i was",
    "i usually",
    "i tend to",
    "i always",
    "i never",
    "most of the time",
    "for the most part",
    "in practice",
    "in reality",
];
const ACTUAL_MEDIUM = [
    "often",
    "sometimes",
    "generally",
    "typically",
    "in general",
    "when i",
    "if i",
];
const ACTUAL_WEAK = [
    "i can be",
    "i might be",
    "i could be",
    "it depends",
];
const INFORMAL_EXTRA = {
    aspirationMedium: ["wanna", "want to"],
    aspirationStrong: ["i wanna be"],
};
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
function findPhraseHits(text, phrases, kind, strength) {
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
            // Single-word phrases ("often") should be boundary-checked.
            const needsBoundary = !p.includes(" ");
            if (!needsBoundary || boundaryOk(lower, start, end)) {
                hits.push({ start, end, phrase, kind, strength });
            }
            idx = at + Math.max(1, p.length);
        }
    }
    hits.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));
    return hits;
}
export function summarizeAspiration(text, opts) {
    const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };
    const extraAspStrong = o.includeInformal ? INFORMAL_EXTRA.aspirationStrong : [];
    const extraAspMed = o.includeInformal ? INFORMAL_EXTRA.aspirationMedium : [];
    const hits = [
        ...findPhraseHits(text, [...ASPIRATION_STRONG, ...extraAspStrong], "aspiration", "strong"),
        ...findPhraseHits(text, [...ASPIRATION_MEDIUM, ...extraAspMed], "aspiration", "medium"),
        ...findPhraseHits(text, ASPIRATION_WEAK, "aspiration", "weak"),
        ...findPhraseHits(text, OBLIGATION_STRONG, "obligation", "strong"),
        ...findPhraseHits(text, OBLIGATION_MEDIUM, "obligation", "medium"),
        ...findPhraseHits(text, OBLIGATION_WEAK, "obligation", "weak"),
        ...findPhraseHits(text, ACTUAL_STRONG, "actual", "strong"),
        ...findPhraseHits(text, ACTUAL_MEDIUM, "actual", "medium"),
        ...findPhraseHits(text, ACTUAL_WEAK, "actual", "weak"),
    ];
    const cleaned = o.enableHeuristics ? pruneFalsePositives(text, hits) : hits;
    const counts = {
        aspiration: { weak: 0, medium: 0, strong: 0 },
        obligation: { weak: 0, medium: 0, strong: 0 },
        actual: { weak: 0, medium: 0, strong: 0 },
    };
    for (const h of cleaned) {
        counts[h.kind][h.strength] += 1;
    }
    // Actuality index: compare actual (positive) vs aspiration+obligation (negative).
    // Weight strong > medium > weak.
    const pos = counts.actual.strong * 1.0 +
        counts.actual.medium * 0.6 +
        counts.actual.weak * 0.35;
    const neg = (counts.aspiration.strong + counts.obligation.strong) * 1.0 +
        (counts.aspiration.medium + counts.obligation.medium) * 0.6 +
        (counts.aspiration.weak + counts.obligation.weak) * 0.35;
    const denom = pos + neg;
    const actualityIndex = denom === 0 ? 0 : clamp((pos - neg) / denom, -1, 1);
    return {
        hits: cleaned.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start)),
        counts,
        actualityIndex,
    };
}
/**
 * Convenience: map actualityIndex -> confidence multiplier.
 *
 * Stage 1 suggestion:
 * - more aspiration/obligation => slightly lower confidence
 * - more actual-reporting => slightly higher confidence
 */
export function aspirationConfidenceMultiplier(actualityIndex) {
    // actualityIndex in [-1,+1] -> multiplier in [0.85, 1.08]
    return clamp(0.965 + 0.115 * actualityIndex, 0.85, 1.08);
}
/**
 * Convenience: if both aspiration and actual signals exist, return a flag that
 * scorers can use to prefer actual evidence (especially post-contrast).
 */
export function hasIdealVsActualTension(summary) {
    const hasAsp = summary.counts.aspiration.strong + summary.counts.aspiration.medium + summary.counts.aspiration.weak > 0;
    const hasObl = summary.counts.obligation.strong + summary.counts.obligation.medium + summary.counts.obligation.weak > 0;
    const hasAct = summary.counts.actual.strong + summary.counts.actual.medium + summary.counts.actual.weak > 0;
    return (hasAsp || hasObl) && hasAct;
}
// ---------------------------
// Heuristic pruning
// ---------------------------
function pruneFalsePositives(text, hits) {
    const lower = normalize(text);
    return hits.filter((h) => {
        const p = h.phrase.toLowerCase();
        // "i am" and "i'm" are extremely common; keep them but downgrade by pruning
        // obvious non-trait constructions like "I'm going to" (volitional) which we
        // treat as not "actual trait" language.
        if ((p === "i'm" || p === "i am") && h.kind === "actual") {
            const ctx = lower.slice(h.start, Math.min(lower.length, h.end + 20));
            if (/i\s*'?m\s+going\s+to/.test(ctx) || /i\s+am\s+going\s+to/.test(ctx)) {
                return false;
            }
            if (/i\s*'?m\s+trying\s+to/.test(ctx) || /i\s+am\s+trying\s+to/.test(ctx)) {
                return false;
            }
        }
        // Avoid counting "in general" as actual if it's part of a meta statement.
        if (p === "in general" && h.kind === "actual") {
            const winStart = Math.max(0, h.start - 10);
            const winEnd = Math.min(lower.length, h.end + 10);
            const ctx = lower.slice(winStart, winEnd);
            if (/speaking\s+in\s+general/.test(ctx))
                return false;
        }
        return true;
    });
}
function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}
