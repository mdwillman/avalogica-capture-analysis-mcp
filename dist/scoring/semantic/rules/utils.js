/**
 * Shared utilities for semantic rule scorers.
 *
 * Purpose: establish a consistent, lightweight “operator-first” preprocessing
 * pattern for all sub-axis scorers.
 */
import { contrastWeightedText, summarizeHedging, hedgingConfidenceMultiplier, summarizeModality, modalityConfidenceMultiplier, summarizeAspiration, aspirationConfidenceMultiplier, hasIdealVsActualTension, } from "../operators/index.js";
/**
 * Analyze transcript text with reusable operators.
 *
 * Stage 1 philosophy:
 * - prefer evidence after contrast pivots ("but", "however", "actually")
 * - downshift confidence when hedging is heavy
 * - up/downshift confidence modestly based on modal strength
 * - downshift confidence slightly when answer is mostly aspirational/obligational
 */
export function analyzeTextForScoring(text) {
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
function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}
