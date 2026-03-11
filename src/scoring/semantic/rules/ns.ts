

// src/scoring/semantic/rules/ns.ts
// Deterministic semantic scoring rules for NS (Knowledge Approach) sub-axes.
//
// IMPORTANT POLARITY NOTE:
// The backend's canonical NS axis is intentionally inverted at the dimension level:
//   score01 = 0.0 => N-leaning
//   score01 = 1.0 => S-leaning
//
// Therefore, in these NS scorers:
// - evidence for inference/pattern/intuition ("N") should pull score01 DOWN
// - evidence for senses/verification/concreteness ("S") should pull score01 UP

import { analyzeTextForScoring } from "./utils.js";
import { effectiveHits } from "../operators/index.js";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * NS Sub-axis 1: Information source
 *
 * We score toward S (high) when the speaker emphasizes sensory verification:
 *   "what I saw", "in front of me", "prove", "evidence", "facts"
 *
 * We score toward N (low) when the speaker emphasizes reliable inference/pattern:
 *   "the pattern suggests", "read between the lines", "intuition", "big picture"
 */
export function scoreNSAttentionPlane(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // N-leaning evidence (pulls score01 DOWN)
  const infer = [
    "pattern",
    "pattern suggests",
    "what it suggests",
    "what it implies",
    "implies",
    "inference",
    "infer",
    "read between the lines",
    "intuition",
    "intuitive",
    "gut",
    "hunch",
    "theory",
    "big picture",
    "overall",
    "theme",
    "meaning",
    "i can tell",
    "i sense that",
    "sign",
  ];

  // S-leaning evidence (pulls score01 UP)
  const senses = [
    "saw",
    "see",
    "seen",
    "heard",
    "hear",
    "felt",
    "smell",
    "smelled",
    "taste",
    "tasted",
    "in front of me",
    "right there",
    "evidence",
    "prove",
    "proven",
    "proof",
    "verify",
    "verified",
    "confirm",
    "confirmed",
    "facts",
    "fact",
    "what happened",
    "what i observed",
    "what i noticed",
    "concrete",
    "specific",
    "details",
  ];

  // Choice/stance markers (boost confidence; not direction)
  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated senses ("I don't trust what I saw") count as N evidence.
  // - Negated inference ("I don't go with my gut") count as S evidence.
  const inferSummary = effectiveHits(t, infer);
  const sensesSummary = effectiveHits(t, senses);

  const effectiveInfer = inferSummary.effectiveHits;
  const negatedInfer = inferSummary.negatedHits;

  const effectiveSenses = sensesSummary.effectiveHits;
  const negatedSenses = sensesSummary.negatedHits;

  const nEvidence = effectiveInfer + negatedSenses;
  const sEvidence = effectiveSenses + negatedInfer;

  // Direction: positive => S, negative => N
  const rawDir = sEvidence - nEvidence;

  let score01 = 0.5;

  // Cap directionality to avoid overclaiming
  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08; // max ~0.24

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  // Confidence: cue coverage + directionality + stance markers
  const poleCueCount = nEvidence + sEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (sEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.attentionPlane.senses_or_verification",
      weight: +0.08 * sEvidence,
      text: "senses/verification terms (S)",
    });
  }

  if (nEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.attentionPlane.inference_or_pattern",
      weight: -0.08 * nEvidence,
      text: "inference/pattern terms (N)",
    });
  }

  if (hasChoice) {
    cues.push({
      kind: "semantic",
      featureId: "stance.choice_language",
      weight: 0,
      text: "choice/preference markers",
    });
  }

  // Optional trace cue for contrast handling (helps debug without changing scoring)
  if (analysis.contrast.hasContrast) {
    cues.push({
      kind: "semantic",
      featureId: "operator.contrast_pivot",
      weight: 0,
      text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
    });
  }

  return { score01, confidence01, cues };
}

/**
 * NS Sub-axis 2: Time orientation
 *
 * We score toward S (high) when the speaker emphasizes:
 * - present/past reality, lived experience, what has already happened
 * - near-term, concrete time horizons ("today", "this week", "next step")
 *
 * We score toward N (low) when the speaker emphasizes:
 * - future possibilities, long horizons, emerging trajectories
 * - imagining "what could be" / "where this is going"
 */
export function scoreNSTemporalHabitat(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // N-leaning evidence (pulls score01 DOWN): future possibilities / long horizon
  const future = [
    "someday",
    "one day",
    "eventually",
    "in the future",
    "future",
    "long term",
    "long-term",
    "down the road",
    "years from now",
    "next year",
    "in five years",
    "in ten years",
    "where this is going",
    "trajectory",
    "direction",
    "potential",
    "possibility",
    "possibilities",
    "could be",
    "might be",
    "imagine",
    "envision",
    "vision",
    "what if",
    "big picture",
    "emerging",
  ];

  // S-leaning evidence (pulls score01 UP): present/past reality / near-term concreteness
  const presentPast = [
    "right now",
    "today",
    "this week",
    "this month",
    "tomorrow",
    "yesterday",
    "last week",
    "last month",
    "in the past",
    "back then",
    "recently",
    "so far",
    "already",
    "currently",
    "at the moment",
    "what happened",
    "what i did",
    "what i saw",
    "what i've done",
    "what i have done",
    "next step",
    "next steps",
    "immediate",
    "near term",
    "near-term",
    "practical",
  ];

  // Choice/stance markers (boost confidence; not direction)
  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated future talk ("I don't think about the future") counts as S evidence.
  // - Negated present/past concreteness ("I don't focus on what happened") counts as N evidence.
  const futSummary = effectiveHits(t, future);
  const ppSummary = effectiveHits(t, presentPast);

  const effectiveFuture = futSummary.effectiveHits;
  const negatedFuture = futSummary.negatedHits;

  const effectivePresentPast = ppSummary.effectiveHits;
  const negatedPresentPast = ppSummary.negatedHits;

  const nEvidence = effectiveFuture + negatedPresentPast;
  const sEvidence = effectivePresentPast + negatedFuture;

  // Direction: positive => S, negative => N
  const rawDir = sEvidence - nEvidence;

  let score01 = 0.5;

  // Cap directionality to avoid overclaiming
  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  // Confidence: cue coverage + directionality + stance markers
  const poleCueCount = nEvidence + sEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (sEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.temporalHabitat.present_or_near_term",
      weight: +0.08 * sEvidence,
      text: "present/past/near-term terms (S)",
    });
  }

  if (nEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.temporalHabitat.future_or_possibility",
      weight: -0.08 * nEvidence,
      text: "future/possibility terms (N)",
    });
  }

  if (hasChoice) {
    cues.push({
      kind: "semantic",
      featureId: "stance.choice_language",
      weight: 0,
      text: "choice/preference markers",
    });
  }

  if (analysis.contrast.hasContrast) {
    cues.push({
      kind: "semantic",
      featureId: "operator.contrast_pivot",
      weight: 0,
      text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
    });
  }

  return { score01, confidence01, cues };
}

/**
 * NS Sub-axis 3: Cognitive focus
 *
 * We score toward S (high) when the speaker emphasizes:
 * - concrete particulars, step-by-step execution, tangible specifics, “what is”
 * - noticing details, literal descriptions, accurate recall
 *
 * We score toward N (low) when the speaker emphasizes:
 * - abstraction, concepts, interpretations, “what it means”
 * - synthesizing themes, connections, symbolic/underlying structure
 *
 * Reminder: NS is inverted by design:
 *   score01 = 0.0 => N
 *   score01 = 1.0 => S
 */
export function scoreNSInformationDiet(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // N-leaning evidence (pulls score01 DOWN): abstract/conceptual/meaning-oriented
  const abstract = [
    "concept",
    "conceptual",
    "abstract",
    "meaning",
    "what it means",
    "interpret",
    "interpretation",
    "symbol",
    "symbolic",
    "theme",
    "themes",
    "pattern",
    "patterns",
    "connection",
    "connections",
    "connect the dots",
    "underlying",
    "essence",
    "framework",
    "model",
    "the idea is",
    "in principle",
    "big picture",
    "overall",
    "meta",
    "implication",
    "implies",
    "significance",
  ];

  // S-leaning evidence (pulls score01 UP): concrete/detail/execution-oriented
  const concrete = [
    "details",
    "detail",
    "specific",
    "specifically",
    "concrete",
    "literal",
    "exact",
    "precise",
    "step by step",
    "steps",
    "checklist",
    "procedure",
    "process",
    "how to",
    "what happened",
    "what i saw",
    "what i heard",
    "what i did",
    "in front of me",
    "right there",
    "facts",
    "fact",
    "evidence",
    "measure",
    "measurable",
    "numbers",
    "data",
    "practical",
    "tangible",
    "hands-on",
  ];

  // Choice/stance markers (boost confidence; not direction)
  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated concrete focus ("I don't focus on details") counts as N evidence.
  // - Negated abstract focus ("I don't care about meaning") counts as S evidence.
  const absSummary = effectiveHits(t, abstract);
  const conSummary = effectiveHits(t, concrete);

  const effectiveAbstract = absSummary.effectiveHits;
  const negatedAbstract = absSummary.negatedHits;

  const effectiveConcrete = conSummary.effectiveHits;
  const negatedConcrete = conSummary.negatedHits;

  const nEvidence = effectiveAbstract + negatedConcrete;
  const sEvidence = effectiveConcrete + negatedAbstract;

  // Direction: positive => S, negative => N
  const rawDir = sEvidence - nEvidence;

  let score01 = 0.5;

  // Cap directionality to avoid overclaiming
  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  // Confidence: cue coverage + directionality + stance markers
  const poleCueCount = nEvidence + sEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (sEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.informationDiet.concrete_or_detail",
      weight: +0.08 * sEvidence,
      text: "concrete/detail/execution terms (S)",
    });
  }

  if (nEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.informationDiet.abstract_or_meaning",
      weight: -0.08 * nEvidence,
      text: "abstract/meaning/theme terms (N)",
    });
  }

  if (hasChoice) {
    cues.push({
      kind: "semantic",
      featureId: "stance.choice_language",
      weight: 0,
      text: "choice/preference markers",
    });
  }

  if (analysis.contrast.hasContrast) {
    cues.push({
      kind: "semantic",
      featureId: "operator.contrast_pivot",
      weight: 0,
      text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
    });
  }

  return { score01, confidence01, cues };
}

/**
 * NS Sub-axis 4: Decision confidence driver
 *
 * We score toward S (high) when the speaker gains confidence from:
 * - verification, evidence, testable proof, concrete confirmation
 * - “show me”, “validate”, “check”, “measure”, “facts”
 *
 * We score toward N (low) when the speaker gains confidence from:
 * - coherence, internal fit, conceptual elegance, pattern consistency
 * - “it makes sense”, “it clicks”, “the theory holds”, “the story fits”
 *
 * Reminder: NS is inverted:
 *   score01 = 0.0 => N
 *   score01 = 1.0 => S
 */
export function scoreNSRealityRelationship(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // N-leaning evidence (pulls score01 DOWN): coherence / “it fits” confidence
  const coherence = [
    "it makes sense",
    "makes sense",
    "it clicks",
    "clicks",
    "it fits",
    "fits together",
    "coherent",
    "coherence",
    "consistent",
    "consistency",
    "pattern holds",
    "the pattern holds",
    "theory",
    "framework",
    "model",
    "elegant",
    "elegance",
    "story fits",
    "narrative fits",
    "it adds up",
    "adds up",
    "i can tell",
    "i sense that",
    "intuition",
    "gut",
    "hunch",
  ];

  // S-leaning evidence (pulls score01 UP): evidence / validation confidence
  const verification = [
    "evidence",
    "proof",
    "prove",
    "proven",
    "verify",
    "verified",
    "validate",
    "validated",
    "confirm",
    "confirmed",
    "check",
    "checked",
    "test",
    "tested",
    "measure",
    "measured",
    "data",
    "numbers",
    "facts",
    "fact",
    "results",
    "observe",
    "observed",
    "what i saw",
    "what i heard",
    "what happened",
    "in practice",
    "in reality",
  ];

  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated verification (“I don't need proof”) counts as N evidence.
  // - Negated coherence (“I don't care if it makes sense”) counts as S evidence.
  const cohSummary = effectiveHits(t, coherence);
  const verSummary = effectiveHits(t, verification);

  const effectiveCoh = cohSummary.effectiveHits;
  const negatedCoh = cohSummary.negatedHits;

  const effectiveVer = verSummary.effectiveHits;
  const negatedVer = verSummary.negatedHits;

  const nEvidence = effectiveCoh + negatedVer;
  const sEvidence = effectiveVer + negatedCoh;

  const rawDir = sEvidence - nEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = nEvidence + sEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (sEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.realityRelationship.verification_or_proof",
      weight: +0.08 * sEvidence,
      text: "verification/proof terms (S)",
    });
  }

  if (nEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.realityRelationship.coherence_or_fit",
      weight: -0.08 * nEvidence,
      text: "coherence/fit terms (N)",
    });
  }

  if (hasChoice) {
    cues.push({
      kind: "semantic",
      featureId: "stance.choice_language",
      weight: 0,
      text: "choice/preference markers",
    });
  }

  if (analysis.contrast.hasContrast) {
    cues.push({
      kind: "semantic",
      featureId: "operator.contrast_pivot",
      weight: 0,
      text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
    });
  }

  return { score01, confidence01, cues };
}

/**
 * NS Sub-axis 5: Risk assessment frame
 *
 * We score toward S (high) when the speaker frames risk as:
 * - concrete known risks, past examples, established constraints, “what can go wrong”
 * - mitigation via checklists, safeguards, evidence, realism
 *
 * We score toward N (low) when the speaker frames risk as:
 * - opportunity cost, upside potential, unknown unknowns, “what could be possible”
 * - exploring possibilities, betting on trajectories, imagining future outcomes
 *
 * Reminder: NS is inverted:
 *   score01 = 0.0 => N
 *   score01 = 1.0 => S
 */
export function scoreNSMeaningThreshold(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // N-leaning evidence (pulls score01 DOWN): upside/potential framing, opportunity focus
  const upside = [
    "upside",
    "potential",
    "opportunity",
    "opportunities",
    "possibility",
    "possibilities",
    "what if",
    "could be",
    "might be",
    "imagine",
    "envision",
    "big bet",
    "take a bet",
    "risk it",
    "swing for",
    "moonshot",
    "long shot",
    "high reward",
    "high upside",
    "worth the risk",
    "explore",
    "exploring",
    "experiment",
    "try it",
    "unknown unknowns",
    "uncertain",
    "uncertainty",
    "trajectory",
  ];

  // S-leaning evidence (pulls score01 UP): concrete downside/mitigation framing
  const downside = [
    "what can go wrong",
    "downside",
    "risk",
    "risks",
    "failure",
    "fail",
    "mistake",
    "mistakes",
    "cost",
    "costly",
    "budget",
    "deadline",
    "constraints",
    "constraint",
    "limited",
    "realistic",
    "reality",
    "in reality",
    "in practice",
    "worst case",
    "best case",
    "tradeoff",
    "trade-off",
    "mitigate",
    "mitigation",
    "contingency",
    "backup plan",
    "plan b",
    "safe",
    "safety",
    "checklist",
    "guardrail",
    "guardrails",
    "tested",
    "proven",
    "evidence",
    "facts",
    "track record",
    "what happened last time",
    "last time",
  ];

  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated downside (“I’m not worried about risk”) counts as N evidence.
  // - Negated upside (“I don’t care about potential”) counts as S evidence.
  const upSummary = effectiveHits(t, upside);
  const downSummary = effectiveHits(t, downside);

  const effectiveUp = upSummary.effectiveHits;
  const negatedUp = upSummary.negatedHits;

  const effectiveDown = downSummary.effectiveHits;
  const negatedDown = downSummary.negatedHits;

  const nEvidence = effectiveUp + negatedDown;
  const sEvidence = effectiveDown + negatedUp;

  const rawDir = sEvidence - nEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = nEvidence + sEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (sEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.meaningThreshold.downside_or_mitigation",
      weight: +0.08 * sEvidence,
      text: "downside/mitigation/constraints terms (S)",
    });
  }

  if (nEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "NS.meaningThreshold.upside_or_possibility",
      weight: -0.08 * nEvidence,
      text: "upside/potential/possibility terms (N)",
    });
  }

  if (hasChoice) {
    cues.push({
      kind: "semantic",
      featureId: "stance.choice_language",
      weight: 0,
      text: "choice/preference markers",
    });
  }

  if (analysis.contrast.hasContrast) {
    cues.push({
      kind: "semantic",
      featureId: "operator.contrast_pivot",
      weight: 0,
      text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
    });
  }

  return { score01, confidence01, cues };
}
