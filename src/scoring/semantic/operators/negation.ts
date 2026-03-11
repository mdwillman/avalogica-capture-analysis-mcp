/**
 * Negation operator utilities.
 *
 * Goal: provide lightweight, dependency-free helpers to detect when a matched
 * cue/phrase is likely being negated ("not", "never", "don't", etc.).
 *
 * This is intentionally heuristic (Stage 1). It should be:
 * - fast
 * - deterministic
 * - easy to reason about
 *
 * Later upgrades can add:
 * - clause-aware scoping
 * - dependency parsing
 * - polarity shifters ("hardly", "rarely") with graded strength
 */

export type TextSpan = {
  start: number; // inclusive char offset
  end: number; // exclusive char offset
};

export type Token = {
  text: string;
  lower: string;
  start: number; // inclusive char offset
  end: number; // exclusive char offset
};

export type PhraseSpan = TextSpan & {
  phrase: string;
};

export type NegatedPhraseSpan = PhraseSpan & {
  /** Whether this phrase match is likely negated by nearby negation tokens. */
  isNegated: boolean;
  /** The negation token that triggered the decision, if any. */
  negationToken?: Token;
};

export type NegationOptions = {
  /**
   * How many tokens before a phrase match to scan for negation.
   * Defaults to 6 (roughly a short phrase).
   */
  windowTokens?: number;

  /**
   * If true, treats "without" as a negator for the following noun phrase.
   * Defaults to true.
   */
  includeWithout?: boolean;

  /**
   * If true, treats minimizers ("hardly", "rarely") as weak negators.
   * Defaults to true.
   */
  includeMinimizers?: boolean;
};

const DEFAULT_OPTS: Required<NegationOptions> = {
  windowTokens: 6,
  includeWithout: true,
  includeMinimizers: true,
};

// Core negation cues. Keep small + predictable for Stage 1.
const BASE_NEGATORS = new Set([
  "not",
  "no",
  "never",
  "none",
  "nobody",
  "nothing",
  "nowhere",
  "neither",
  "nor",
]);

// Common contractions / auxiliary negations.
const CONTRACTION_NEGATORS = new Set([
  "n't",
  "dont",
  "don't",
  "doesnt",
  "doesn't",
  "didnt",
  "didn't",
  "cant",
  "can't",
  "cannot",
  "wont",
  "won't",
  "wouldnt",
  "wouldn't",
  "shouldnt",
  "shouldn't",
  "couldnt",
  "couldn't",
  "isnt",
  "isn't",
  "arent",
  "aren't",
  "wasnt",
  "wasn't",
  "werent",
  "weren't",
  "aint",
  "ain't",
]);

// "Minimizers" that often function like partial negation.
// We treat these as negators only when includeMinimizers is enabled.
const MINIMIZERS = new Set(["hardly", "scarcely", "rarely", "seldom"]);

// Punctuation that often ends a short negation scope in Stage 1.
// (We still keep token-window logic as primary.)
const SCOPE_BREAK_CHARS = new Set([".", "!", "?", ";", ":"]);

// Conditional clause intros. Negation under these is often justificatory ("If I don't X, Y happens"),
// so we avoid treating it as a true polarity flip for nearby cues.
const CONDITIONAL_INTROS = new Set(["if", "when", "unless", "assuming", "provided", "suppose"]);

// Lightweight clause-break tokens that often end an "if"-condition and begin the consequent.
// (Our tokenizer doesn't keep punctuation tokens, so we use a small token list here.)
const CONDITIONAL_CLAUSE_BREAK_TOKENS = new Set(["then"]);

function isConditionalNegation(tokens: Token[], negTokenIndex: number, effectiveFrom: number): boolean {
  // Look back a few tokens for a conditional intro before the negation token.
  // Stop if we cross a boundary that likely ends the condition.
  const lookback = 5;
  for (let i = negTokenIndex - 1; i >= effectiveFrom && i >= negTokenIndex - lookback; i--) {
    const w = tokens[i]?.lower;
    if (!w) continue;
    if (CONDITIONAL_CLAUSE_BREAK_TOKENS.has(w)) break;
    if (CONDITIONAL_INTROS.has(w)) return true;
  }
  return false;
}

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\u2019/g, "'") // curly apostrophe -> straight
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenize text into word-ish tokens with offsets.
 *
 * This is deliberately simple: sequences of letters/digits/apostrophes are tokens.
 */
export function tokenizeWithOffsets(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z0-9']+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    tokens.push({ text: raw, lower: raw.toLowerCase(), start, end });
  }
  return tokens;
}

export function isNegationToken(tokLower: string, opts?: NegationOptions): boolean {
  const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };

  if (BASE_NEGATORS.has(tokLower)) return true;
  if (CONTRACTION_NEGATORS.has(tokLower)) return true;
  if (o.includeWithout && tokLower === "without") return true;
  if (o.includeMinimizers && MINIMIZERS.has(tokLower)) return true;

  // Handle cases like "don't" tokenized as "don" + "t" (rare with our regex)
  // or "couldn't" kept as a single token (common).
  if (tokLower.endsWith("n't")) return true;

  return false;
}

/**
 * Returns the token index whose span contains `charOffset`, or the nearest token
 * to the left if it falls between tokens.
 */
export function tokenIndexAtChar(tokens: Token[], charOffset: number): number {
  if (tokens.length === 0) return -1;

  // Binary search for efficiency (texts are short, but why not).
  let lo = 0;
  let hi = tokens.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = tokens[mid];

    if (charOffset < t.start) {
      hi = mid - 1;
    } else if (charOffset >= t.end) {
      lo = mid + 1;
    } else {
      return mid;
    }
  }

  // Not inside a token; hi will be the token to the left.
  return Math.max(0, Math.min(tokens.length - 1, hi));
}

/**
 * Scan backwards from a phrase-start token index for negation cues.
 *
 * Heuristic scoping:
 * - scan up to N tokens before the phrase
 * - stop early if we cross hard sentence punctuation (.,!?;:)
 */
export function findNegationBeforeIndex(
  text: string,
  tokens: Token[],
  phraseStartTokenIndex: number,
  opts?: NegationOptions,
): Token | undefined {
  const o = { ...DEFAULT_OPTS, ...(opts ?? {}) };
  if (phraseStartTokenIndex < 0) return undefined;

  const window = o.windowTokens;
  const from = Math.max(0, phraseStartTokenIndex - window);

  // Find nearest hard punctuation between tokens[from]..tokens[phraseStartTokenIndex]
  // by scanning raw text for breaks. If found, we limit scanning to after that break.
  // This is a cheap improvement to avoid "I like X. Not Y" leaking across sentences.
  let effectiveFrom = from;
  {
    const startChar = tokens[from]?.start ?? 0;
    const endChar = tokens[phraseStartTokenIndex]?.start ?? 0;
    const slice = text.slice(startChar, endChar);
    for (let i = slice.length - 1; i >= 0; i--) {
      const ch = slice[i];
      if (SCOPE_BREAK_CHARS.has(ch)) {
        // Set effectiveFrom to the first token whose start is after this punctuation.
        const breakCharAbs = startChar + i;
        for (let ti = phraseStartTokenIndex - 1; ti >= from; ti--) {
          if (tokens[ti].start > breakCharAbs) {
            effectiveFrom = ti;
          } else {
            break;
          }
        }
        break;
      }
    }
  }

  for (let i = phraseStartTokenIndex - 1; i >= effectiveFrom; i--) {
    const tok = tokens[i];
    if (!isNegationToken(tok.lower, o)) continue;

    // Ignore conditional-negation patterns like: "if I don't ..." / "when we didn't ...".
    // These clauses commonly serve as reasons supporting the (non-negated) action.
    if (isConditionalNegation(tokens, i, effectiveFrom)) continue;

    return tok;
  }
  return undefined;
}

/**
 * Simple phrase span finder (case-insensitive).
 *
 * Notes:
 * - This uses substring matching. Keep phrases reasonably specific.
 * - For word-boundary sensitivity, call with phrases that include spaces or
 *   consider upgrading later.
 */
export function findPhraseSpans(text: string, phrases: string[]): PhraseSpan[] {
  const lower = text.toLowerCase();
  const spans: PhraseSpan[] = [];

  for (const phrase of phrases) {
    const p = phrase.toLowerCase();
    if (!p) continue;

    let idx = 0;
    while (idx < lower.length) {
      const hit = lower.indexOf(p, idx);
      if (hit === -1) break;
      spans.push({ start: hit, end: hit + p.length, phrase });
      idx = hit + Math.max(1, p.length);
    }
  }

  // Keep stable order (by start, then longer first).
  spans.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));
  return spans;
}

/**
 * Annotate phrase matches with a boolean "isNegated" determined by scanning for
 * negation tokens before the phrase.
 */
export function markNegatedPhrases(
  text: string,
  phrases: string[],
  opts?: NegationOptions,
): NegatedPhraseSpan[] {
  const tokens = tokenizeWithOffsets(text);
  const spans = findPhraseSpans(text, phrases);

  return spans.map((s) => {
    const startTokIdx = tokenIndexAtChar(tokens, s.start);
    const negTok = findNegationBeforeIndex(text, tokens, startTokIdx, opts);
    return { ...s, isNegated: Boolean(negTok), negationToken: negTok };
  });
}

export type EffectiveHitSummary = {
  totalHits: number;
  effectiveHits: number; // not negated
  negatedHits: number;
  effective: NegatedPhraseSpan[]; // isNegated=false
  negated: NegatedPhraseSpan[]; // isNegated=true
};

/**
 * Convenience helper used by scorers:
 * - find phrase matches
 * - split them into effective vs negated hits
 */
export function effectiveHits(text: string, phrases: string[], opts?: NegationOptions): EffectiveHitSummary {
  const marked = markNegatedPhrases(text, phrases, opts);
  const effective = marked.filter((m) => !m.isNegated);
  const negated = marked.filter((m) => m.isNegated);

  return {
    totalHits: marked.length,
    effectiveHits: effective.length,
    negatedHits: negated.length,
    effective,
    negated,
  };
}

/**
 * Quick boolean: is this span (by char offsets) likely negated?
 *
 * Useful when scorers compute spans themselves and just want a polarity check.
 */
export function isNegatedSpan(text: string, span: TextSpan, opts?: NegationOptions): boolean {
  const tokens = tokenizeWithOffsets(text);
  const startTokIdx = tokenIndexAtChar(tokens, span.start);
  const negTok = findNegationBeforeIndex(text, tokens, startTokIdx, opts);
  return Boolean(negTok);
}