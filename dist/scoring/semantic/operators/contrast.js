/**
 * Contrast / concession operator utilities.
 *
 * Goal: detect common contrast markers ("but", "however", "although", etc.)
 * and provide simple clause segmentation + weighting helpers.
 *
 * Why: many natural answers contain an initial statement followed by a
 * contrastive correction that reflects the true stance:
 *   "I like parties, but I usually leave early." -> weight after 'but' higher.
 *
 * This is Stage 1 heuristic logic:
 * - punctuation + marker-based clause splitting
 * - strongest (latest) contrast marker wins by default
 * - returns spans so scorers can prefer evidence after the pivot
 */
const DEFAULT_OPTS = {
    ignoreNotOnlyButAlso: true,
    includePivots: true,
};
// Primary contrast/concession markers.
const CORE_MARKERS = [
    "but",
    "however",
    "though",
    "although",
    "even though",
    "yet",
    "still",
    "nevertheless",
    "nonetheless",
    "instead",
    "rather",
    "on the other hand",
    "on the contrary",
    "except",
];
// Conversational pivots that often function like contrast.
const PIVOT_MARKERS = [
    "actually",
    "honestly",
    "to be honest",
    "in reality",
    "realistically",
    "truthfully",
    "at the same time",
];
// Punctuation that tends to end a clause.
const CLAUSE_BREAK_RE = /[\.!\?;:\n]/g;
function normalize(input) {
    return input.toLowerCase().replace(/\u2019/g, "'");
}
/**
 * Find candidate contrast markers in the text.
 *
 * Notes:
 * - uses word-boundary-ish regexes for single-word markers
 * - uses substring search for multi-word markers
 */
export function findContrastMarkers(text, opts) {
    const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };
    const lower = normalize(text);
    const markers = [...CORE_MARKERS, ...(o.includePivots ? PIVOT_MARKERS : [])];
    const out = [];
    for (const m of markers) {
        const ml = m.toLowerCase();
        // Multi-word marker: substring search.
        if (ml.includes(" ")) {
            let idx = 0;
            while (idx < lower.length) {
                const hit = lower.indexOf(ml, idx);
                if (hit === -1)
                    break;
                // crude word-boundary check (avoid matching inside words)
                const before = hit - 1 >= 0 ? lower[hit - 1] : " ";
                const after = hit + ml.length < lower.length ? lower[hit + ml.length] : " ";
                const beforeOk = !/[a-z0-9']/i.test(before);
                const afterOk = !/[a-z0-9']/i.test(after);
                if (beforeOk && afterOk) {
                    out.push({ marker: m, start: hit, end: hit + ml.length });
                }
                idx = hit + Math.max(1, ml.length);
            }
            continue;
        }
        // Single-word marker: regex with boundaries.
        const re = new RegExp(`(^|[^A-Za-z0-9'])(${escapeRegExp(ml)})(?=$|[^A-Za-z0-9'])`, "g");
        let match;
        while ((match = re.exec(lower)) !== null) {
            const start = match.index + match[1].length;
            out.push({ marker: m, start, end: start + ml.length });
        }
    }
    // Optionally ignore the "not only ... but also" construction.
    if (o.ignoreNotOnlyButAlso) {
        return out.filter((mk) => {
            if (mk.marker.toLowerCase() !== "but")
                return true;
            const windowStart = Math.max(0, mk.start - 40);
            const window = lower.slice(windowStart, mk.start);
            // If we see "not only" shortly before "but", treat as non-contrast.
            return !/not\s+only\s+$/i.test(window);
        });
    }
    return out;
}
/**
 * Choose the "main" contrast marker.
 *
 * Stage 1 rule:
 * - prefer the last marker in the text (people often self-correct late)
 */
export function chooseMainContrastMarker(text, opts) {
    const markers = findContrastMarkers(text, opts);
    if (markers.length === 0)
        return undefined;
    markers.sort((a, b) => a.start - b.start);
    return markers[markers.length - 1];
}
/**
 * Split text into {pre, post} around the main contrast marker.
 *
 * Additional heuristic:
 * - trim pre to after the most recent clause break before marker
 * - trim post to before the next clause break after the marker (optional in v2)
 *
 * This helps isolate the local contrast rather than dragging earlier paragraphs.
 */
export function splitOnMainContrast(text, opts) {
    const marker = chooseMainContrastMarker(text, opts);
    if (!marker)
        return undefined;
    const lower = normalize(text);
    // Determine a reasonable preStart: after the last hard clause break before marker.
    let preStart = 0;
    {
        const slice = lower.slice(0, marker.start);
        let lastBreak = -1;
        let m;
        while ((m = CLAUSE_BREAK_RE.exec(slice)) !== null) {
            lastBreak = m.index;
        }
        if (lastBreak >= 0)
            preStart = lastBreak + 1;
    }
    const preEnd = marker.start;
    const postStart = marker.end;
    const preRaw = text.slice(preStart, preEnd);
    const postRaw = text.slice(postStart);
    const pre = preRaw.trim();
    const post = postRaw.trim();
    // Compute spans roughly accounting for trim.
    const preLeadTrim = preRaw.length - preRaw.trimStart().length;
    const preTrailTrim = preRaw.length - preRaw.trimEnd().length;
    const postLeadTrim = postRaw.length - postRaw.trimStart().length;
    const preSpan = {
        start: preStart + preLeadTrim,
        end: preEnd - preTrailTrim,
    };
    const postSpan = {
        start: postStart + postLeadTrim,
        end: text.length,
    };
    return { pre, post, preSpan, postSpan, marker };
}
/**
 * Produce a simple weighting-friendly representation.
 *
 * If a contrast is detected:
 * - primary = post-contrast clause
 * - secondary = pre-contrast clause
 *
 * Else:
 * - primary = full text
 * - secondary = ""
 */
export function contrastWeightedText(text, opts) {
    const split = splitOnMainContrast(text, opts);
    if (!split) {
        return {
            primary: text,
            primarySpan: { start: 0, end: text.length },
            secondary: "",
            secondarySpan: { start: 0, end: 0 },
            hasContrast: false,
        };
    }
    return {
        primary: split.post || text.slice(split.postSpan.start),
        primarySpan: split.postSpan,
        secondary: split.pre || text.slice(split.preSpan.start, split.preSpan.end),
        secondarySpan: split.preSpan,
        marker: split.marker,
        hasContrast: true,
    };
}
/**
 * Helper: for a list of phrase spans, keep only those fully inside a given span.
 */
export function filterSpansWithin(spans, within) {
    return spans.filter((s) => s.start >= within.start && s.end <= within.end);
}
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
