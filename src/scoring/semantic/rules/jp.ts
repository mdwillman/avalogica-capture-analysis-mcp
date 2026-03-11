import { analyzeTextForScoring } from "./utils.js";
import { effectiveHits } from "../operators/index.js";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * JP Sub-axis 1: Commitment style
 *
 * We score toward P (high) when the speaker emphasizes:
 * - keeping options open, flexibility, provisional commitments, optionality
 * - “play it by ear”, “see how it goes”, “I can change my mind”
 *
 * We score toward J (low) when the speaker emphasizes:
 * - firm commitments, locking in, decisiveness, sticking to the plan
 * - “commit”, “lock it in”, “decide and move on”, “no going back”
 *
 * Reminder: JP mapping is low=J, high=P.
 */
export function scoreJPClosureDrive(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // J-leaning evidence (pulls score01 DOWN): firm commitment / lock-in
  const firm = [
    "commit",
    "committed",
    "commitment",
    "lock in",
    "locked in",
    "set in stone",
    "final decision",
    "decide",
    "decision",
    "make a decision",
    "choose and move on",
    "no going back",
    "stick with",
    "stick to it",
    "follow through",
    "follow-through",
    "once i decide",
    "i won't change",
    "i will not change",
    "settled",
    "conclusive",
    "definitive",
    "firm",
  ];

  // P-leaning evidence (pulls score01 UP): optionality / flexibility / provisional
  const flexible = [
    "keep options open",
    "options open",
    "keep it open",
    "open-ended",
    "flexible",
    "flexibility",
    "adapt",
    "adaptable",
    "adjust",
    "adjustable",
    "change my mind",
    "i can change my mind",
    "depends",
    "it depends",
    "play it by ear",
    "see how it goes",
    "we'll see",
    "we will see",
    "go with the flow",
    "figure it out as i go",
    "decide later",
    "later",
    "tentative",
    "provisional",
    "try and see",
    "try it",
  ];

  // Stance markers (boost confidence a bit)
  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated flexible (“I don't like keeping options open”) counts as J evidence.
  // - Negated firm (“I don't like committing”) counts as P evidence.
  const firmSummary = effectiveHits(t, firm);
  const flexSummary = effectiveHits(t, flexible);

  const effectiveFirm = firmSummary.effectiveHits;
  const negatedFirm = firmSummary.negatedHits;

  const effectiveFlex = flexSummary.effectiveHits;
  const negatedFlex = flexSummary.negatedHits;

  const jEvidence = effectiveFirm + negatedFlex;
  const pEvidence = effectiveFlex + negatedFirm;

  // Direction: positive => P, negative => J
  const rawDir = pEvidence - jEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = jEvidence + pEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (pEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.closureDrive.optionality_or_flexibility",
      weight: +0.08 * pEvidence,
      text: "optionality/flexibility terms (P)",
    });
  }

  if (jEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.closureDrive.firm_commitment_or_lock_in",
      weight: -0.08 * jEvidence,
      text: "firm commitment/lock-in terms (J)",
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
 * JP Sub-axis 2: Planning style
 *
 * We score toward P (high) when the speaker emphasizes:
 * - improvisation, spontaneity, adapting on the fly, loose structure
 * - “wing it”, “go with the flow”, “figure it out as I go”
 *
 * We score toward J (low) when the speaker emphasizes:
 * - planning ahead, schedules, structure, checklists, preparation
 * - “plan it out”, “schedule”, “checklist”, “prepare in advance”
 *
 * Reminder: JP mapping is low=J, high=P.
 */
export function scoreJPStructureRelationship(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // J-leaning evidence (pulls score01 DOWN): structured planning / preparation
  const planned = [
    "plan",
    "planning",
    "plan ahead",
    "in advance",
    "ahead of time",
    "prepare",
    "preparation",
    "prep",
    "schedule",
    "scheduled",
    "calendar",
    "timeline",
    "roadmap",
    "checklist",
    "to-do list",
    "todo list",
    "list",
    "outline",
    "structure",
    "structured",
    "organize",
    "organized",
    "set a plan",
    "project plan",
    "steps",
    "step by step",
    "routine",
    "system",
    "process",
  ];

  // P-leaning evidence (pulls score01 UP): improvisation / flexible execution
  const improv = [
    "wing it",
    "improvise",
    "improvising",
    "improvisation",
    "spontaneous",
    "spontaneity",
    "go with the flow",
    "play it by ear",
    "figure it out as i go",
    "make it up as i go",
    "on the fly",
    "adapt",
    "adaptable",
    "adjust",
    "adjust as i go",
    "flexible",
    "flexibility",
    "keep it loose",
    "keep it open",
    "depends",
    "it depends",
    "see how it goes",
    "we'll see",
    "we will see",
    "try and see",
  ];

  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated improv (“I don't like winging it”) counts as J evidence.
  // - Negated planning (“I don't plan ahead”) counts as P evidence.
  const planSummary = effectiveHits(t, planned);
  const impSummary = effectiveHits(t, improv);

  const effectivePlan = planSummary.effectiveHits;
  const negatedPlan = planSummary.negatedHits;

  const effectiveImp = impSummary.effectiveHits;
  const negatedImp = impSummary.negatedHits;

  const jEvidence = effectivePlan + negatedImp;
  const pEvidence = effectiveImp + negatedPlan;

  // Direction: positive => P, negative => J
  const rawDir = pEvidence - jEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = jEvidence + pEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (pEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.structureRelationship.improvise_or_spontaneous",
      weight: +0.08 * pEvidence,
      text: "improvisation/spontaneity terms (P)",
    });
  }

  if (jEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.structureRelationship.plan_or_structure",
      weight: -0.08 * jEvidence,
      text: "planning/structure terms (J)",
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
 * JP Sub-axis 3: Decision timing
 *
 * We score toward P (high) when the speaker prefers to:
 * - delay decisions, keep gathering info, decide late, “wait and see”
 * - “I decide at the last minute”, “I keep my options open”
 *
 * We score toward J (low) when the speaker prefers to:
 * - decide early, close the question, lock in a direction quickly
 * - “decide early”, “make the call”, “settle it”, “commit now”
 *
 * Reminder: JP mapping is low=J, high=P.
 */
export function scoreJPCommitmentMetabolism(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // J-leaning evidence (pulls score01 DOWN): decide early / close quickly
  const decideEarly = [
    "decide early",
    "decide sooner",
    "as soon as possible",
    "asap",
    "make the call",
    "make a call",
    "make a decision",
    "decide quickly",
    "decide fast",
    "settle it",
    "settled",
    "finalize",
    "finalise",
    "final decision",
    "lock it in",
    "lock in",
    "commit now",
    "commit early",
    "pick one",
    "choose one",
    "move on",
    "close the loop",
    "close it out",
    "get it decided",
  ];

  // P-leaning evidence (pulls score01 UP): decide late / keep open
  const decideLate = [
    "decide later",
    "later",
    "last minute",
    "at the last minute",
    "wait and see",
    "wait",
    "wait a bit",
    "hold off",
    "delay",
    "postpone",
    "keep options open",
    "options open",
    "keep it open",
    "open-ended",
    "see how it goes",
    "we'll see",
    "we will see",
    "depends",
    "it depends",
    "gather more information",
    "get more information",
    "more information",
    "sleep on it",
    "think it over",
  ];

  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated decide-late (“I don't wait to decide”) counts as J evidence.
  // - Negated decide-early (“I don't decide early”) counts as P evidence.
  const earlySummary = effectiveHits(t, decideEarly);
  const lateSummary = effectiveHits(t, decideLate);

  const effectiveEarly = earlySummary.effectiveHits;
  const negatedEarly = earlySummary.negatedHits;

  const effectiveLate = lateSummary.effectiveHits;
  const negatedLate = lateSummary.negatedHits;

  const jEvidence = effectiveEarly + negatedLate;
  const pEvidence = effectiveLate + negatedEarly;

  // Direction: positive => P, negative => J
  const rawDir = pEvidence - jEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = jEvidence + pEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (pEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.commitmentMetabolism.decide_late_or_keep_open",
      weight: +0.08 * pEvidence,
      text: "decide-late / keep-open terms (P)",
    });
  }

  if (jEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.commitmentMetabolism.decide_early_or_finalize",
      weight: -0.08 * jEvidence,
      text: "decide-early / finalize terms (J)",
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
 * JP Sub-axis 4: Closure preference
 *
 * We score toward P (high) when the speaker emphasizes:
 * - comfort with ambiguity, staying open, tolerating uncertainty
 * - “I’m fine not knowing yet”, “I can live with unfinished”
 *
 * We score toward J (low) when the speaker emphasizes:
 * - need for closure, resolution, final answers, finishing/settling
 * - “I need a clear answer”, “wrap it up”, “close the loop”
 *
 * Reminder: JP mapping is low=J, high=P.
 */
export function scoreJPTemporalOrientationToPlans(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // J-leaning evidence (pulls score01 DOWN): closure/finish/resolve
  const closure = [
    "closure",
    "need closure",
    "i need closure",
    "wrap it up",
    "wrap up",
    "resolve",
    "resolution",
    "settle",
    "settled",
    "final answer",
    "definitive",
    "conclusive",
    "clear answer",
    "clear decision",
    "decided",
    "done",
    "finish",
    "finished",
    "complete",
    "completed",
    "tie it up",
    "close the loop",
    "close it out",
    "locked in",
    "lock it in",
    "set in stone",
    "no ambiguity",
    "certain",
    "certainty",
  ];

  // P-leaning evidence (pulls score01 UP): ambiguity/uncertainty tolerance
  const ambiguity = [
    "ambiguity",
    "ambiguous",
    "uncertain",
    "uncertainty",
    "i'm fine not knowing",
    "i am fine not knowing",
    "not sure yet",
    "we'll see",
    "we will see",
    "wait and see",
    "it depends",
    "depends",
    "keep it open",
    "keep options open",
    "options open",
    "open-ended",
    "in progress",
    "still exploring",
    "explore",
    "exploring",
    "figure it out",
    "figure it out as i go",
    "leave it open",
    "leave it undecided",
    "good enough for now",
    "for now",
  ];

  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated ambiguity tolerance (“I don't like uncertainty”) counts as J evidence.
  // - Negated closure need (“I don't need closure”) counts as P evidence.
  const cloSummary = effectiveHits(t, closure);
  const ambSummary = effectiveHits(t, ambiguity);

  const effectiveClo = cloSummary.effectiveHits;
  const negatedClo = cloSummary.negatedHits;

  const effectiveAmb = ambSummary.effectiveHits;
  const negatedAmb = ambSummary.negatedHits;

  const jEvidence = effectiveClo + negatedAmb;
  const pEvidence = effectiveAmb + negatedClo;

  // Direction: positive => P, negative => J
  const rawDir = pEvidence - jEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = jEvidence + pEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (pEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.temporalOrientationToPlans.ambiguity_tolerance",
      weight: +0.08 * pEvidence,
      text: "ambiguity/uncertainty tolerance terms (P)",
    });
  }

  if (jEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.temporalOrientationToPlans.need_closure_or_resolution",
      weight: -0.08 * jEvidence,
      text: "closure/resolution/finish terms (J)",
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
 * JP Sub-axis 5: Approach to constraints
 *
 * We score toward P (high) when the speaker emphasizes:
 * - flexibility around rules, adapting constraints, bending guidelines if needed
 * - “rules are guidelines”, “depends on the situation”, “do what works”
 *
 * We score toward J (low) when the speaker emphasizes:
 * - respect for rules, structure, clear constraints, compliance, order
 * - “follow the rules”, “policy”, “procedures”, “standards”, “by the book”
 *
 * Reminder: JP mapping is low=J, high=P.
 */
export function scoreJPCompletionRelationship(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const t = (analysis.primaryText || "").toLowerCase();

  // J-leaning evidence (pulls score01 DOWN): rules/structure/compliance-first
  const rules = [
    "rules",
    "follow the rules",
    "follow rules",
    "rule",
    "policy",
    "policies",
    "procedure",
    "procedures",
    "process",
    "by the book",
    "standard",
    "standards",
    "compliance",
    "comply",
    "must",
    "have to",
    "required",
    "requirement",
    "constraints",
    "constraint",
    "boundaries",
    "boundary",
    "guidelines",
    "checklist",
    "protocol",
    "best practice",
    "best practices",
    "consistent",
    "consistency",
    "order",
    "organized",
    "structure",
    "structured",
  ];

  // P-leaning evidence (pulls score01 UP): flexibility/expedience/contextual override
  const flexibility = [
    "it depends",
    "depends",
    "case by case",
    "case-by-case",
    "situational",
    "context",
    "use judgment",
    "use judgement",
    "judgment call",
    "judgement call",
    "discretion",
    "flexible",
    "flexibility",
    "adapt",
    "adaptable",
    "adjust",
    "bend the rules",
    "break the rules",
    "exceptions",
    "exception",
    "rule of thumb",
    "guideline not a rule",
    "rules are guidelines",
    "do what works",
    "whatever works",
    "pragmatic",
    "pragmatism",
    "workaround",
    "improvise",
  ];

  const choice = ["i would", "i'd", "i will", "i'll", "prefer", "rather", "choose", "pick", "i tend to", "usually"];
  const hasChoice = choice.some((c) => t.includes(c));

  // Negation-aware counting.
  // - Negated flexibility (“I don't like bending the rules”) counts as J evidence.
  // - Negated rules (“I don't follow rules”) counts as P evidence.
  const rulesSummary = effectiveHits(t, rules);
  const flexSummary = effectiveHits(t, flexibility);

  const effectiveRules = rulesSummary.effectiveHits;
  const negatedRules = rulesSummary.negatedHits;

  const effectiveFlex = flexSummary.effectiveHits;
  const negatedFlex = flexSummary.negatedHits;

  const jEvidence = effectiveRules + negatedFlex;
  const pEvidence = effectiveFlex + negatedRules;

  // Direction: positive => P, negative => J
  const rawDir = pEvidence - jEvidence;

  let score01 = 0.5;

  const dirStrength = Math.max(-3, Math.min(3, rawDir));
  let delta = dirStrength * 0.08;

  if (hasChoice) delta *= 1.1;

  score01 = clamp01(score01 + delta);

  const poleCueCount = jEvidence + pEvidence;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.18;
  confidence01 += Math.min(0.38, poleCueCount * 0.08);
  confidence01 += Math.min(0.24, directional * 0.08);
  confidence01 += hasChoice ? 0.08 : 0;

  // Apply shared operator-based confidence adjustment (hedging/modality/aspiration)
  confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);

  const cues: any[] = [];

  if (pEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.completionRelationship.flexible_or_contextual",
      weight: +0.08 * pEvidence,
      text: "flexibility/contextual-override terms (P)",
    });
  }

  if (jEvidence > 0) {
    cues.push({
      kind: "semantic",
      featureId: "JP.completionRelationship.rules_or_compliance",
      weight: -0.08 * jEvidence,
      text: "rules/structure/compliance terms (J)",
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

