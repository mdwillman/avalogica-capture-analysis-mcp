// src/domain/types.ts
/** Optional: stable ordering of sub-axes per dimension (for UX/debug). */
export const SUB_AXIS_ORDER = {
    IE: [
        "groupSizePreference",
        "initiatingConversation",
        "familiarityVsNovelty",
        "speakingPace",
        "spotlightVsBackground",
    ],
    NS: [
        "informationSource",
        "timeOrientation",
        "cognitiveFocus",
        "decisionConfidenceDriver",
        "riskAssessmentFrame",
    ],
    TF: [
        "feedbackAim",
        "fairnessFrame",
        "conflictPosture",
        "decisionDriver",
        "socialEvaluationFocus",
    ],
    JP: [
        "commitmentStyle",
        "planningStyle",
        "decisionTiming",
        "closurePreference",
        "approachToConstraints",
    ],
};
/** Scoring conventions (useful for consistency checks). */
export const SCORE_CONVENTION = {
    lowIsZeroHighIsOne: true,
};
/** Small helper for exhaustive checks. */
export function assertNever(x, msg = "Unexpected value") {
    throw new Error(`${msg}: ${String(x)}`);
}
