// Barrel exports for semantic operators.
//
// NOTE: Multiple operator modules define a local `TextSpan` type. Re-exporting
// them via `export *` causes TS2308 duplicate export errors.
//
// We export ONE canonical `TextSpan` (from negation) and explicitly export the
// rest of each module’s public surface (excluding their local `TextSpan`).
export { normalizeText, tokenizeWithOffsets, isNegationToken, tokenIndexAtChar, findNegationBeforeIndex, findPhraseSpans, markNegatedPhrases, effectiveHits, isNegatedSpan, } from "./negation.js";
export { findContrastMarkers, chooseMainContrastMarker, splitOnMainContrast, contrastWeightedText, filterSpansWithin, } from "./contrast.js";
export { summarizeModality, modalityConfidenceMultiplier, volitionalCommitmentIndex, } from "./modality.js";
export { summarizeHedging, hedgingConfidenceMultiplier, } from "./hedging.js";
export { summarizeAspiration, aspirationConfidenceMultiplier, hasIdealVsActualTension, } from "./aspiration.js";
