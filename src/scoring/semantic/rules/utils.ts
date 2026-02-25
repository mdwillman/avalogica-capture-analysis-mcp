

/**
 * Shared utilities for semantic rule scorers.
 *
 * Purpose: establish a consistent, lightweight “operator-first” preprocessing
 * pattern for all sub-axis scorers.
 */

import {
  contrastWeightedText,
  summarizeHedging,
  hedgingConfidenceMultiplier,
  summarizeModality,
  modalityConfidenceMultiplier,
  summarizeAspiration,
  aspirationConfidenceMultiplier,
  hasIdealVsActualTension,
  type ContrastWeightedText,
  type HedgingSummary,
  type ModalitySummary,
  type AspirationSummary,
} from "../operators/index.js";

export type ScoringTextAnalysis = {
  /** Contrast-weighted view of the transcript. */
  contrast: ContrastWeightedText;
  /** Convenience: post-contrast text (or full text if no contrast). */
  primaryText: string;
  /** Convenience: pre-contrast text if contrast was detected, else empty. */
  secondaryText: string;

  /** Hedging summary computed on primaryText. */
  hedging: HedgingSummary;
  /** Modality summary computed on primaryText. */
  modality: ModalitySummary;
  /** Aspiration/actuality summary computed on primaryText. */
  aspiration: AspirationSummary;

  /** True when both ideal-self and actual signals appear (useful for weighting). */
  hasIdealActualTension: boolean;

  /**
   * Suggested confidence multiplier (Stage 1):
   * combines hedging/modality/aspiration effects.
   */
  confidenceMultiplier: number;
};

/**
 * Analyze transcript text with reusable operators.
 *
 * Stage 1 philosophy:
 * - prefer evidence after contrast pivots ("but", "however", "actually")
 * - downshift confidence when hedging is heavy
 * - up/downshift confidence modestly based on modal strength
 * - downshift confidence slightly when answer is mostly aspirational/obligational
 */
export function analyzeTextForScoring(text: string): ScoringTextAnalysis {
  const contrast = contrastWeightedText(text);
  const primaryText = contrast.primary;
  const secondaryText = contrast.secondary;

  const hedging = summarizeHedging(primaryText);
  const modality = summarizeModality(primaryText);
  const aspiration = summarizeAspiration(primaryText);
  const hasIdealActualTension = hasIdealVsActualTension(aspiration);

  const m1 = hedgingConfidenceMultiplier(hedging.hedgeIndex01);
  const m2 = modalityConfidenceMultiplier(modality.strengthIndex);
  const m3 = aspirationConfidenceMultiplier(aspiration.actualityIndex);

  // Clamp to a conservative range so operators can't explode confidence.
  const confidenceMultiplier = clamp(m1 * m2 * m3, 0.6, 1.15);

  return {
    contrast,
    primaryText,
    secondaryText,
    hedging,
    modality,
    aspiration,
    hasIdealActualTension,
    confidenceMultiplier,
  };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}