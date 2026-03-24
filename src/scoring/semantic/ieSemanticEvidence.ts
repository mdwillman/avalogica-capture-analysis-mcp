import type { PromptId } from "../../domain/index.js";
import type { Cue } from "../types.js";
import type {
  IEPromptAxisInterpretation,
  JustificationMode,
  SemanticParseFieldsV1,
  SemanticParseResultV1,
  StateRelation,
} from "../../semantic/types.js";

type Direction = "I" | "E";

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
  primary: Partial<Record<IEPromptAxisInterpretation, PrimaryRule>>;
  modifiers: ModifierRule[];
}

interface SemanticEvidenceResult {
  delta: number;
  confidenceDelta: number;
  cues: Cue[];
}

const SUPPORTED_PROMPTS = [
  "VK.IE.4A.v1",
  "VK.IE.9A.v1",
  "VK.IE.14A.v1",
  "VK.IE.19A.v1",
  "VK.IE.24A.v1",
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
  "VK.IE.4A.v1": {
    primary: {
      rejects_reactive_social_animation: {
        direction: "I",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_reactive_social_animation",
      },
      admits_liveliness_but_rejects_mechanical_frame: {
        direction: "E",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_liveliness_but_rejects_mechanical_frame",
      },
      endorses_expressive_animation: {
        direction: "E",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_expressive_animation",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "E",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["social_acceptability", "care"],
        direction: "E",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.social_acceptability_care",
      },
      {
        kind: "justification",
        values: ["self_protection"],
        direction: "I",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.self_protection",
      },
    ],
  },
  "VK.IE.9A.v1": {
    primary: {
      rejects_compulsive_external_processing: {
        direction: "I",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_compulsive_external_processing",
      },
      admits_out_loud_processing_but_rejects_neediness_frame: {
        direction: "E",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_out_loud_processing_but_rejects_neediness_frame",
      },
      endorses_external_processing: {
        direction: "E",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_external_processing",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "E",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["authenticity", "social_acceptability"],
        direction: "E",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.authenticity_social",
      },
    ],
  },
  "VK.IE.14A.v1": {
    primary: {
      rejects_defensive_withdrawal: {
        direction: "E",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_defensive_withdrawal",
      },
      admits_privateness_but_rejects_pathology_frame: {
        direction: "I",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_privateness_but_rejects_pathology_frame",
      },
      endorses_withdrawal_as_protection: {
        direction: "I",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_withdrawal_as_protection",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "E",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["self_protection"],
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "justification.self_protection",
      },
    ],
  },
  "VK.IE.19A.v1": {
    primary: {
      rejects_attention_dependence: {
        direction: "I",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_attention_dependence",
      },
      admits_social_need_but_rejects_dependency_frame: {
        direction: "E",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_social_need_but_rejects_dependency_frame",
      },
      endorses_attention_as_vitalizing: {
        direction: "E",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_attention_as_vitalizing",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "E",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["care", "social_acceptability"],
        direction: "E",
        weight: WEAK_MODIFIER_WEIGHT,
        cueSuffix: "justification.care_social",
      },
    ],
  },
  "VK.IE.24A.v1": {
    primary: {
      rejects_disappearing_withdrawal: {
        direction: "E",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "rejects_disappearing_withdrawal",
      },
      admits_retreat_but_rejects_cowardice_frame: {
        direction: "I",
        weight: STANDARD_PRIMARY_WEIGHT,
        cueSuffix: "admits_retreat_but_rejects_cowardice_frame",
      },
      endorses_withdrawal_for_restoration: {
        direction: "I",
        weight: STRONG_PRIMARY_WEIGHT,
        cueSuffix: "endorses_withdrawal_for_restoration",
      },
    },
    modifiers: [
      {
        kind: "state",
        values: OWNED_OR_ENDORSED,
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.owned_or_endorsed",
      },
      {
        kind: "state",
        values: ["alien_and_rejected"],
        direction: "E",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "state.alien_and_rejected",
      },
      {
        kind: "justification",
        values: ["self_protection"],
        direction: "I",
        weight: STANDARD_MODIFIER_WEIGHT,
        cueSuffix: "justification.self_protection",
      },
    ],
  },
};

export function deriveIESemanticEvidence(params: {
  promptId: string;
  semanticParse?: SemanticParseResultV1;
}): SemanticEvidenceResult | undefined {
  const { promptId, semanticParse } = params;
  if (!semanticParse) return undefined;
  if (semanticParse.dimension !== "IE") return undefined;
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

  const interpretation = semanticParse.scoringHints?.iePromptAxisInterpretation;
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
  const signedWeight = (direction === "E" ? 1 : -1) * rule.weight * multiplier;
  onScore(signedWeight);
  cues.push({
    kind: "semantic",
    featureId: `IE.semantic.${promptId}.${rule.cueSuffix}`,
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
  const base = weight >= STRONG_PRIMARY_WEIGHT ? 0.06 : weight >= STANDARD_MODIFIER_WEIGHT ? 0.04 : 0.03;
  return base * multiplier;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
