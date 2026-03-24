const SUPPORTED_PROMPTS = [
    "VK.JP.4A.v1",
    "VK.JP.9A.v1",
    "VK.JP.14A.v1",
    "VK.JP.19A.v1",
    "VK.JP.24A.v1",
];
const SUPPORTED_PROMPT_SET = new Set(SUPPORTED_PROMPTS);
const STANDARD_PRIMARY_WEIGHT = 0.12;
const STRONG_PRIMARY_WEIGHT = 0.16;
const STANDARD_MODIFIER_WEIGHT = 0.06;
const WEAK_MODIFIER_WEIGHT = 0.04;
const MAX_SCORE_DELTA = 0.3;
const MAX_CONFIDENCE_DELTA = 0.15;
const OWNED_OR_ENDORSED = ["owned_but_misdescribed", "endorsed"];
const PROMPT_RULES = {
    "VK.JP.4A.v1": {
        primary: {
            rejects_compulsive_closure: {
                direction: "P",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "rejects_compulsive_closure",
            },
            admits_closure_drive_but_rejects_fanatic_frame: {
                direction: "J",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "admits_closure_drive_but_rejects_fanatic_frame",
            },
            endorses_deadline_closure: {
                direction: "J",
                weight: STRONG_PRIMARY_WEIGHT,
                cueSuffix: "endorses_deadline_closure",
            },
        },
        modifiers: [
            {
                kind: "state",
                values: OWNED_OR_ENDORSED,
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.owned_or_endorsed",
            },
            {
                kind: "state",
                values: ["alien_and_rejected"],
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.alien_and_rejected",
            },
            {
                kind: "justification",
                values: ["efficiency", "fairness", "logic"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.efficiency_logic_fairness",
            },
            {
                kind: "justification",
                values: ["self_protection"],
                direction: "P",
                weight: WEAK_MODIFIER_WEIGHT,
                cueSuffix: "justification.self_protection",
            },
        ],
    },
    "VK.JP.9A.v1": {
        primary: {
            rejects_structure_reactance: {
                direction: "J",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "rejects_structure_reactance",
            },
            admits_flexibility_but_rejects_prison_frame: {
                direction: "P",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "admits_flexibility_but_rejects_prison_frame",
            },
            endorses_plan_resistance: {
                direction: "P",
                weight: STRONG_PRIMARY_WEIGHT,
                cueSuffix: "endorses_plan_resistance",
            },
        },
        modifiers: [
            {
                kind: "state",
                values: OWNED_OR_ENDORSED,
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.owned_or_endorsed",
            },
            {
                kind: "state",
                values: ["alien_and_rejected"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.alien_and_rejected",
            },
            {
                kind: "justification",
                values: ["authenticity", "self_protection"],
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.authenticity_self_protection",
            },
            {
                kind: "justification",
                values: ["efficiency", "logic", "fairness"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.efficiency_logic_fairness",
            },
        ],
    },
    "VK.JP.14A.v1": {
        primary: {
            rejects_overbound_commitment: {
                direction: "P",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "rejects_overbound_commitment",
            },
            admits_commitment_need_but_rejects_suffocation_frame: {
                direction: "J",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "admits_commitment_need_but_rejects_suffocation_frame",
            },
            endorses_binding_commitment: {
                direction: "J",
                weight: STRONG_PRIMARY_WEIGHT,
                cueSuffix: "endorses_binding_commitment",
            },
        },
        modifiers: [
            {
                kind: "state",
                values: OWNED_OR_ENDORSED,
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.owned_or_endorsed",
            },
            {
                kind: "state",
                values: ["alien_and_rejected"],
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.alien_and_rejected",
            },
            {
                kind: "justification",
                values: ["efficiency", "fairness", "logic"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.efficiency_logic_fairness",
            },
            {
                kind: "justification",
                values: ["self_protection"],
                direction: "P",
                weight: WEAK_MODIFIER_WEIGHT,
                cueSuffix: "justification.self_protection",
            },
        ],
    },
    "VK.JP.19A.v1": {
        primary: {
            rejects_reality_deferring_delay: {
                direction: "J",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "rejects_reality_deferring_delay",
            },
            admits_delay_but_rejects_pretense_frame: {
                direction: "P",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "admits_delay_but_rejects_pretense_frame",
            },
            endorses_temporal_deferral: {
                direction: "P",
                weight: STRONG_PRIMARY_WEIGHT,
                cueSuffix: "endorses_temporal_deferral",
            },
        },
        modifiers: [
            {
                kind: "state",
                values: OWNED_OR_ENDORSED,
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.owned_or_endorsed",
            },
            {
                kind: "state",
                values: ["alien_and_rejected"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.alien_and_rejected",
            },
            {
                kind: "justification",
                values: ["self_protection", "authenticity"],
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.self_protection_authenticity",
            },
            {
                kind: "justification",
                values: ["efficiency", "fairness"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.efficiency_fairness",
            },
        ],
    },
    "VK.JP.24A.v1": {
        primary: {
            rejects_possibility_preserving_incompletion: {
                direction: "J",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "rejects_possibility_preserving_incompletion",
            },
            admits_openness_but_rejects_accusation_frame: {
                direction: "P",
                weight: STANDARD_PRIMARY_WEIGHT,
                cueSuffix: "admits_openness_but_rejects_accusation_frame",
            },
            endorses_unfinished_possibility: {
                direction: "P",
                weight: STRONG_PRIMARY_WEIGHT,
                cueSuffix: "endorses_unfinished_possibility",
            },
        },
        modifiers: [
            {
                kind: "state",
                values: OWNED_OR_ENDORSED,
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.owned_or_endorsed",
            },
            {
                kind: "state",
                values: ["alien_and_rejected"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "state.alien_and_rejected",
            },
            {
                kind: "justification",
                values: ["authenticity"],
                direction: "P",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.authenticity",
            },
            {
                kind: "justification",
                values: ["efficiency", "logic", "fairness"],
                direction: "J",
                weight: STANDARD_MODIFIER_WEIGHT,
                cueSuffix: "justification.efficiency_logic_fairness",
            },
        ],
    },
};
export function deriveJPSemanticEvidence(params) {
    const { promptId, semanticParse } = params;
    if (!semanticParse)
        return undefined;
    if (semanticParse.dimension !== "JP")
        return undefined;
    if (!SUPPORTED_PROMPT_SET.has(promptId))
        return undefined;
    if (semanticParse.promptId !== promptId)
        return undefined;
    if (!semanticParse.responseHasSubstantiveContent)
        return undefined;
    const ruleSet = PROMPT_RULES[promptId];
    if (!ruleSet)
        return undefined;
    const multiplier = computeWeightMultiplier(semanticParse);
    if (multiplier <= 0)
        return undefined;
    let scoreDelta = 0;
    let confidenceDelta = 0;
    const cues = [];
    const interpretation = semanticParse.scoringHints?.jpPromptAxisInterpretation;
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
    if (cues.length === 0)
        return undefined;
    scoreDelta = clamp(scoreDelta, -MAX_SCORE_DELTA, MAX_SCORE_DELTA);
    confidenceDelta = Math.min(confidenceDelta, MAX_CONFIDENCE_DELTA);
    return { delta: scoreDelta, confidenceDelta, cues };
}
function applyContribution(opts) {
    const { rule, direction, multiplier, promptId, cues, onScore } = opts;
    const signedWeight = (direction === "J" ? 1 : -1) * rule.weight * multiplier;
    onScore(signedWeight);
    cues.push({
        kind: "semantic",
        featureId: `JP.semantic.${promptId}.${rule.cueSuffix}`,
        weight: signedWeight,
    });
}
function modifierApplies(rule, fields) {
    if (rule.kind === "justification") {
        return rule.values.includes(fields.justificationModePrimary);
    }
    if (rule.kind === "state") {
        return rule.values.includes(fields.stateRelation);
    }
    return false;
}
function computeWeightMultiplier(parse) {
    if (!parse.responseHasSubstantiveContent)
        return 0;
    const statusWeights = {
        ok: 1,
        ambiguous: 0.65,
        low_information: 0.4,
        failed: 0,
    };
    const clarityWeights = {
        high: 1,
        medium: 0.7,
        low: 0.35,
    };
    const qualityWeights = {
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
function baseConfidenceDelta(weight, multiplier) {
    const base = weight >= STRONG_PRIMARY_WEIGHT
        ? 0.06
        : weight >= STANDARD_MODIFIER_WEIGHT
            ? 0.04
            : 0.03;
    return base * multiplier;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
