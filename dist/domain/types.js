// src/domain/types.ts
/** Optional: stable ordering of sub-axes per dimension (for UX/debug). */
export const SUB_AXIS_ORDER = {
    IE: [
        "energyDirection",
        "processingHabitat",
        "visibilityRelationship",
        "connectionEconomics",
        "restorationSignature",
    ],
    NS: [
        "attentionPlane",
        "temporalHabitat",
        "informationDiet",
        "realityRelationship",
        "meaningThreshold",
    ],
    TF: [
        "evaluationReflex",
        "truthOrientation",
        "decisionSubstrate",
        "conflictMetabolism",
        "boundaryArchitecture",
    ],
    JP: [
        "closureDrive",
        "structureRelationship",
        "commitmentMetabolism",
        "temporalOrientationToPlans",
        "completionRelationship",
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
