
// Barrel exports for semantic operators.
//
// NOTE: Multiple operator modules define a local `TextSpan` type. Re-exporting
// them via `export *` causes TS2308 duplicate export errors.
//
// We export ONE canonical `TextSpan` (from negation) and explicitly export the
// rest of each module’s public surface (excluding their local `TextSpan`).

// Canonical span type (use this from the barrel)
export type { TextSpan } from "./negation.js";

// negation
export type {
  Token,
  PhraseSpan,
  NegatedPhraseSpan,
  NegationOptions,
  EffectiveHitSummary,
} from "./negation.js";
export {
  normalizeText,
  tokenizeWithOffsets,
  isNegationToken,
  tokenIndexAtChar,
  findNegationBeforeIndex,
  findPhraseSpans,
  markNegatedPhrases,
  effectiveHits,
  isNegatedSpan,
} from "./negation.js";

// contrast
export type {
  ContrastMarker,
  ContrastSplit,
  ContrastOptions,
  ContrastWeightedText,
} from "./contrast.js";
export {
  findContrastMarkers,
  chooseMainContrastMarker,
  splitOnMainContrast,
  contrastWeightedText,
  filterSpansWithin,
} from "./contrast.js";

// modality
export type {
  ModalityHit,
  ModalityKind,
  ModalityStrength,
  ModalityOptions,
  ModalitySummary,
} from "./modality.js";
export {
  summarizeModality,
  modalityConfidenceMultiplier,
  volitionalCommitmentIndex,
} from "./modality.js";

// hedging
export type {
  HedgeStrength,
  HedgeHit,
  HedgingOptions,
  HedgingSummary,
} from "./hedging.js";
export {
  summarizeHedging,
  hedgingConfidenceMultiplier,
} from "./hedging.js";

// aspiration
export type {
  AspirationKind,
  AspirationHit,
  AspirationOptions,
  AspirationSummary,
} from "./aspiration.js";
export {
  summarizeAspiration,
  aspirationConfidenceMultiplier,
  hasIdealVsActualTension,
} from "./aspiration.js";