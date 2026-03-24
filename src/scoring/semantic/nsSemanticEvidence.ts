import type { PromptId } from "../../domain/index.js";
import type { Cue } from "../types.js";
import type {
  JustificationMode,
  NSPromptAxisInterpretation,
  SemanticParseFieldsV1,
  SemanticParseResultV1,
  StateRelation,
} from "../../semantic/types.js";

type Direction = "N" | "S";

interface PrimaryRule {
  direction: Direction;
  weight: number;
  cueSuffix: string;
}

type ModifierRule =
  | {
    kind: "justification";
    values: JustificationMode[];
    direction: Direction;
    weight: number;
    cueSuffix: string;
  }
  | {
    kind: "state";
    values: StateRelation[];
    direction: Direction;
    weight: number;
    cueSuffix: string;
  };

interface PromptRuleSet {
  primary: Partial<Record<NSPromptAxisInterpretation, PrimaryRule>>;
  modifiers: ModifierRule[];
}

interface SemanticEvidenceResult {
  delta: number;
  confidenceDelta: number;
  cues: Cue[];
}

const SUPPORTED_PROMPTS = [
  "VK.NS.4A.v1",
  "VK.NS.9A.v1",
  "VK.NS.14A.v1",
  "VK.NS.19A.v1",
  "VK.NS.24A.v1",
] as const satisfies ReadonlyArray<PromptId>;
const SUPPORTED_PROMPT_SET = new Set<string>(SUPPORTED_PROMPTS);

const STANDARD_PRIMARY_WEIGHT = 0.12;
const STRONG_PRIMARY_WEIGHT = 0.16;
const STANDARD_MODIFIER_WEIGHT = 0.06;
const WEAK_MODIFIER_WEIGHT = 0.04;
const MAX_SCORE_DELTA = 0.3;
const MAX_CONFIDENCE_DELTA = 0.15;

const OWNED_OR_ENDORSED: StateRelation[] = ["owned_but_misdescribed", "endorsed"];

const PROMPT_RULES: Record<(typeof SUPPORTED_PROMPTS)[number], PromptRuleSet> = {
  "VK.NS.4A.v1": {
    primary: {
      rejects_reality_avoidant_abstraction: {
        direction: "S",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_reality_avoidant_abstraction",
      },
      admits_imaginative_distance_but_rejects_escape_frame: {
        direction: "N",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_imaginative_distance_but_rejects_escape_frame",
      },
      endorses_transcendent_detachment: {
        direction: "N",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_transcendent_detachment",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "N",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "S",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["authenticity", "self_protection"],
        direction: "N",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.authenticity_self_protection",
      },
    ],
  },
  "VK.NS.9A.v1": {
    primary: {
      rejects_present_detachment: {
        direction: "S",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_present_detachment",
      },
      admits_elsewhere_habitation_but_rejects_neglect_frame: {
        direction: "N",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_elsewhere_habitation_but_rejects_neglect_frame",
      },
      endorses_distance_from_immediacy: {
        direction: "N",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_distance_from_immediacy",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "N",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "S",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["authenticity", "self_protection"],
        direction: "N",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.authenticity_self_protection",
      },
    ],
  },
  "VK.NS.14A.v1": {
    primary: {
      rejects_pattern_dependent_fact_dismissal: {
        direction: "S",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_pattern_dependent_fact_dismissal",
      },
      admits_pattern_hunger_but_rejects_contempt_frame: {
        direction: "N",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_pattern_hunger_but_rejects_contempt_frame",
      },
      endorses_pattern_first_attention: {
        direction: "N",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_pattern_first_attention",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "N",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "S",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["authenticity"],
        direction: "N",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.authenticity",
      },
      {
        kind: "justification",
        values: ["logic", "fairness"],
        direction: "S",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.logic_fairness",
      },
    ],
  },
  "VK.NS.19A.v1": {
    primary: {
      rejects_surface_bound_literalism: {
        direction: "N",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_surface_bound_literalism",
      },
      admits_concrete_attention_but_rejects_flatness_frame: {
        direction: "S",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_concrete_attention_but_rejects_flatness_frame",
      },
      endorses_surface_level_reality: {
        direction: "S",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_surface_level_reality",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "S",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "N",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["logic", "fairness", "efficiency"],
        direction: "S",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.logic_fairness_efficiency",
      },
      {
        kind: "justification",
        values: ["authenticity"],
        direction: "N",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.authenticity",
      },
    ],
  },
  "VK.NS.24A.v1": {
    primary: {
      rejects_compulsive_meaning_imposition: {
        direction: "S",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_compulsive_meaning_imposition",
      },
      admits_meaning_hunger_but_rejects_excess_frame: {
        direction: "N",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_meaning_hunger_but_rejects_excess_frame",
      },
      endorses_meaning_as_reality_threshold: {
        direction: "N",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_meaning_as_reality_threshold",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "N",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "S",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["authenticity"],
        direction: "N",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.authenticity",
      },
      {
        kind: "justification",
        values: ["logic", "fairness"],
        direction: "S",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.logic_fairness",
      },
    ],
  },
};

export function deriveNSSemanticEvidence(params: {
  promptId: string;
  semanticParse?: SemanticParseResultV1;
}): SemanticEvidenceResult | undefined {
  const { promptId, semanticParse } = params;
  if (!semanticParse) return undefined;
  if (semanticParse.dimension !== "NS") return undefined;
  if (!SUPPORTED_PROMPT_SET.has(promptId)) return undefined;
  if (semanticParse.promptId !== promptId) return undefined;
  if (!semanticParse.responseHasSubstantiveContent) return undefined;

  const ruleSet = PROMPT_RULES[promptId as (typeof SUPPORTED_PROMPTS)[number]];
  if (!ruleSet) return undefined;

  const multiplier = computeWeightMultiplier(semanticParse);
  if (multiplier <= 0) return undefined;

  let scoreDelta = 0;
  let confidenceDelta = 0;
  const cues: Cue[] = [];

  const interpretation = semanticParse.scoringHints?.nsPromptAxisInterpretation;
  if (interpretation && interpretation !== "unclear") {
    const rule = ruleSet.primary[interpretation];
    if (rule) {
      applyContribution({
        rule,
        direction: rule.direction,
        multiplier,
        promptId,
        cues,
        onScore: delta => {
          scoreDelta += delta;
          confidenceDelta += baseConfidenceDelta(rule.weight, multiplier);
        },
      });
    }
  }

  for (const modifier of ruleSet.modifiers) {
    if (modifierApplies(modifier, semanticParse.fields)) {
      applyContribution({
        rule: modifier,
        direction: modifier.direction,
        multiplier,
        promptId,
        cues,
        onScore: delta => {
          scoreDelta += delta;
          confidenceDelta += baseConfidenceDelta(modifier.weight, multiplier);
        },
      });
    }
  }

  if (cues.length === 0) return undefined;

  scoreDelta = clamp(scoreDelta, -MAX_SCORE_DELTA, MAX_SCORE_DELTA);
  confidenceDelta = Math.min(confidenceDelta, MAX_CONFIDENCE_DELTA);

  return { delta: scoreDelta, confidenceDelta, cues };
}

function applyContribution(opts: {
  rule: PrimaryRule | ModifierRule;
  direction: Direction;
  multiplier: number;
  promptId: string;
  cues: Cue[];
  onScore: (delta: number) => void;
}) {
  const { rule, direction, multiplier, promptId, cues, onScore } = opts;
  const signedWeight = (direction === "S" ? 1 : -1) * rule.weight * multiplier;
  onScore(signedWeight);
  cues.push({
    kind: "semantic",
    featureId: `NS.semantic.${promptId}.${rule.cueSuffix}`,
    weight: signedWeight,
  });
}

function modifierApplies(rule: ModifierRule, fields: SemanticParseFieldsV1): boolean {
  if (rule.kind === "justification") {
    return rule.values.includes(fields.justificationModePrimary);
  }
  if (rule.kind === "state") {
    return rule.values.includes(fields.stateRelation);
  }
  return false;
}

function computeWeightMultiplier(parse: SemanticParseResultV1): number {
  if (!parse.responseHasSubstantiveContent) return 0;

  const statusWeights: Record<SemanticParseResultV1["parseStatus"], number> = {
    ok: 1,
    ambiguous: 0.65,
    low_information: 0.4,
    failed: 0,
  };
  const clarityWeights: Record<SemanticParseFieldsV1["scorableClarity"], number> = {
    high: 1,
    medium: 0.7,
    low: 0.35,
  };
  const qualityWeights: Record<SemanticParseResultV1["transcriptQuality"], number> = {
    clear: 1,
    mostly_clear: 0.85,
    partially_unclear: 0.6,
    poor: 0.35,
  };

  const status = statusWeights[parse.parseStatus] ?? 0;
  const clarity = clarityWeights[parse.fields.scorableClarity] ?? 0;
  const quality = qualityWeights[parse.transcriptQuality] ?? 0.5;

  return status * clarity * quality;
}

function baseConfidenceDelta(weight: number, multiplier: number): number {
  const base =
    weight >= STRONG_PRIMARY_WEIGHT
      ? 0.06
      : weight >= STANDARD_MODIFIER_WEIGHT
        ? 0.04
        : 0.03;
  return base * multiplier;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
