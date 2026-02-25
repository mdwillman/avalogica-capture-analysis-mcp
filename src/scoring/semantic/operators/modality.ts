

/**
 * Modality operator utilities.
 *
 * Goal: detect modal strength signals in text (epistemic certainty, deontic
 * obligation, and volitional intent/commitment) and provide scorer-friendly
 * summaries.
 *
 * This is Stage 1 heuristic logic:
 * - phrase/substring matching (case-insensitive)
 * - light boundary checks
 * - returns counts + spans so scorers can use as confidence modifiers
 *
 * Primary use cases:
 * - JP (commitment / decision timing / closure)
 * - NS (certainty tolerance)
 * - TF (boundary vs rapport sometimes uses obligation language)
 */

export type TextSpan = {
  start: number; // inclusive char offset
  end: number; // exclusive char offset
};

export type ModalityHit = TextSpan & {
  phrase: string;
  kind: ModalityKind;
  strength: ModalityStrength;
};

export type ModalityKind = "epistemic" | "deontic" | "volitional";

export type ModalityStrength = "weak" | "medium" | "strong";

export type ModalityOptions = {
  /** If true, include informal/conversational forms ("gonna", "kinda"). Default true. */
  includeInformal?: boolean;
  /** If true, attempt to ignore some false-positive patterns. Default true. */
  enableHeuristics?: boolean;
};

const DEFAULT_OPTS: Required<ModalityOptions> = {
  includeInformal: true,
  enableHeuristics: true,
};

// ---------------------------
// Phrase inventories
// ---------------------------

// Epistemic: certainty / likelihood
const EPISTEMIC_STRONG = [
  "definitely",
  "certainly",
  "for sure",
  "no doubt",
  "without a doubt",
  "i'm sure",
  "i am sure",
  "i'm certain",
  "i am certain",
  "it must be",
  "it has to be",
  "there's no way",
];

const EPISTEMIC_MEDIUM = [
  "probably",
  "likely",
  "i think",
  "i believe",
  "i guess",
  "i suspect",
  "it seems",
  "it feels like",
  "it looks like",
  "it appears",
];

const EPISTEMIC_WEAK = [
  "maybe",
  "perhaps",
  "possibly",
  "might",
  "could",
  "not sure",
  "i'm not sure",
  "i am not sure",
  "i don't know",
  "i do not know",
  "unclear",
];

// Deontic: obligation / permission / rules
const DEONTIC_STRONG = [
  "must",
  "have to",
  "need to",
  "required to",
  "can't",
  "cannot",
  "not allowed",
  "no choice",
  "have no choice",
  "shouldn't",
  "should not",
];

const DEONTIC_MEDIUM = [
  "should",
  "ought to",
  "supposed to",
  "allowed to",
  "can",
  "can't really",
  "can't exactly",
  "best to",
];

const DEONTIC_WEAK = [
  "could",
  "may",
  "might",
  "if i had to",
  "if needed",
  "if necessary",
];

// Volitional: intent / commitment / decision
const VOLITIONAL_STRONG = [
  "i will",
  "i'll",
  "i am going to",
  "i'm going to",
  "i will definitely",
  "i'll definitely",
  "i won't",
  "i will not",
  "i'm committed",
  "i am committed",
  "i commit",
  "i decided",
  "i've decided",
  "i have decided",
  "lock it in",
];

const VOLITIONAL_MEDIUM = [
  "i plan to",
  "i want to",
  "i intend to",
  "i'm going to try",
  "i am going to try",
  "i'll try",
  "i will try",
  "i'd like to",
  "i would like to",
  "i prefer to",
];

const VOLITIONAL_WEAK = [
  "i might",
  "i could",
  "i may",
  "i'm thinking about",
  "i am thinking about",
  "i'm considering",
  "i am considering",
  "i'm not sure",
  "depends",
  "we'll see",
  "we will see",
];

const INFORMAL_EXTRA = {
  epistemicWeak: ["kinda", "kind of", "sorta", "sort of"],
  volitionalMedium: ["gonna", "going to"],
};

// ---------------------------
// Matching helpers
// ---------------------------

function normalize(input: string): string {
  return input.toLowerCase().replace(/\u2019/g, "'");
}

function isWordChar(ch: string): boolean {
  return /[a-z0-9']/i.test(ch);
}

function boundaryOk(textLower: string, start: number, end: number): boolean {
  const before = start - 1 >= 0 ? textLower[start - 1] : " ";
  const after = end < textLower.length ? textLower[end] : " ";
  const beforeOk = !isWordChar(before);
  const afterOk = !isWordChar(after);
  return beforeOk && afterOk;
}

function findPhraseHits(text: string, phrases: string[], kind: ModalityKind, strength: ModalityStrength): ModalityHit[] {
  const lower = normalize(text);
  const hits: ModalityHit[] = [];

  for (const phrase of phrases) {
    const p = phrase.toLowerCase();
    if (!p) continue;

    let idx = 0;
    while (idx < lower.length) {
      const at = lower.indexOf(p, idx);
      if (at === -1) break;

      const start = at;
      const end = at + p.length;
      // For single-word phrases, enforce boundaries to reduce false positives.
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

// ---------------------------
// Public API
// ---------------------------

export type ModalitySummary = {
  hits: ModalityHit[];
  counts: {
    epistemic: { weak: number; medium: number; strong: number };
    deontic: { weak: number; medium: number; strong: number };
    volitional: { weak: number; medium: number; strong: number };
  };
  /**
   * A coarse scalar in [-1, +1] where:
   * - negative => weaker / more tentative language overall
   * - positive => stronger / more committed/certain language overall
   */
  strengthIndex: number;
};

export function summarizeModality(text: string, opts?: ModalityOptions): ModalitySummary {
  const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };

  const extraEpiWeak = o.includeInformal ? INFORMAL_EXTRA.epistemicWeak : [];
  const extraVolMed = o.includeInformal ? INFORMAL_EXTRA.volitionalMedium : [];

  // Collect hits by bucket.
  const hits: ModalityHit[] = [
    ...findPhraseHits(text, EPISTEMIC_STRONG, "epistemic", "strong"),
    ...findPhraseHits(text, EPISTEMIC_MEDIUM, "epistemic", "medium"),
    ...findPhraseHits(text, [...EPISTEMIC_WEAK, ...extraEpiWeak], "epistemic", "weak"),

    ...findPhraseHits(text, DEONTIC_STRONG, "deontic", "strong"),
    ...findPhraseHits(text, DEONTIC_MEDIUM, "deontic", "medium"),
    ...findPhraseHits(text, DEONTIC_WEAK, "deontic", "weak"),

    ...findPhraseHits(text, VOLITIONAL_STRONG, "volitional", "strong"),
    ...findPhraseHits(text, [...VOLITIONAL_MEDIUM, ...extraVolMed], "volitional", "medium"),
    ...findPhraseHits(text, VOLITIONAL_WEAK, "volitional", "weak"),
  ];

  // Heuristic cleanup to reduce a few common false positives.
  // (Keep conservative; Stage 1.)
  const cleaned = o.enableHeuristics ? pruneFalsePositives(text, hits) : hits;

  const counts = {
    epistemic: { weak: 0, medium: 0, strong: 0 },
    deontic: { weak: 0, medium: 0, strong: 0 },
    volitional: { weak: 0, medium: 0, strong: 0 },
  };

  for (const h of cleaned) {
    counts[h.kind][h.strength] += 1;
  }

  // Strength index: simple weighted average across all hits.
  // weak=-1, medium=0, strong=+1 (then clamp to [-1,+1]).
  let denom = 0;
  let numer = 0;
  for (const h of cleaned) {
    denom += 1;
    numer += h.strength === "strong" ? 1 : h.strength === "weak" ? -1 : 0;
  }
  const strengthIndex = denom === 0 ? 0 : clamp(numer / denom, -1, 1);

  return {
    hits: cleaned.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start)),
    counts,
    strengthIndex,
  };
}

/**
 * Convenience: map strengthIndex -> confidence multiplier.
 *
 * Stage 1 suggestion:
 * - tentative language reduces confidence slightly
 * - strong commitment/certainty increases confidence slightly
 */
export function modalityConfidenceMultiplier(strengthIndex: number): number {
  // strengthIndex in [-1,+1] -> multiplier in [0.85, 1.10]
  return clamp(0.975 + 0.125 * strengthIndex, 0.85, 1.1);
}

/**
 * Convenience: return only volitional commitment signal for JP-like scorers.
 */
export function volitionalCommitmentIndex(summary: ModalitySummary): number {
  const s = summary.counts.volitional.strong;
  const m = summary.counts.volitional.medium;
  const w = summary.counts.volitional.weak;
  const denom = s + m + w;
  if (denom === 0) return 0;
  // strong=+1, medium=+0.25, weak=-0.75
  const raw = (1 * s + 0.25 * m - 0.75 * w) / denom;
  return clamp(raw, -1, 1);
}

// ---------------------------
// Heuristic pruning
// ---------------------------

function pruneFalsePositives(text: string, hits: ModalityHit[]): ModalityHit[] {
  const lower = normalize(text);

  return hits.filter((h) => {
    const p = h.phrase.toLowerCase();

    // "can" is very ambiguous (ability vs permission). Keep it only if it looks
    // deontic-ish nearby ("allowed", "not allowed", "rule", "supposed").
    if (p === "can" && h.kind === "deontic") {
      const winStart = Math.max(0, h.start - 25);
      const winEnd = Math.min(lower.length, h.end + 25);
      const ctx = lower.slice(winStart, winEnd);
      const looksDeontic = /allowed|not allowed|rule|rules|supposed|permission|should|must|have to|need to/.test(ctx);
      return looksDeontic;
    }

    // "could" is often epistemic (uncertainty) rather than deontic; we keep it
    // but let scorers interpret via kind+strength.

    // Ignore "might" in "might as well" (often resignation, not uncertainty).
    if (p === "might" && /might\s+as\s+well/.test(lower.slice(h.start, Math.min(lower.length, h.start + 20)))) {
      return false;
    }

    return true;
  });
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}