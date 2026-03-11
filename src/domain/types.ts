// src/domain/types.ts

/** Canonical dimension IDs used by the backend. */
export type DimensionId = "IE" | "NS" | "TF" | "JP";

/** A/B/C prompt variants. */
export type PromptVariant = "A" | "B" | "C";

/** Version tag for prompt text/content. */

export type PromptVersion = "v1";

/** Prompt phases used for building multi-step arcs (optional). */
export type PromptPhase = 1 | 2 | 3 | 4;

/** Elicitation style (optional; used to diversify prompt arcs). */
export type ElicitationType =
  | "recognition"
  | "painRanking"
  | "scenario"
  | "completion"
  | "wildCard";

/** Optional intensity tag for sequencing / pacing. */
export type PromptIntensity = 1 | 2 | 3 | 4 | 5;

/** Prompt index within a dimension (expanded to support larger catalogs). */
export type PromptIndex =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25;

/** Strongly typed prompt ID format: VK.<DIM>.<INDEX><VAR>.v1 */
export type PromptId = `VK.${DimensionId}.${PromptIndex}${PromptVariant}.${PromptVersion}`;

/** Sub-axis IDs (match Swift enum rawValue strings exactly). */
export type IESubAxisId =
  | "energyDirection"
  | "processingHabitat"
  | "visibilityRelationship"
  | "connectionEconomics"
  | "restorationSignature";

export type NSSubAxisId =
  | "attentionPlane"
  | "temporalHabitat"
  | "informationDiet"
  | "realityRelationship"
  | "meaningThreshold";

export type TFSubAxisId =
  | "evaluationReflex"
  | "truthOrientation"
  | "decisionSubstrate"
  | "conflictMetabolism"
  | "boundaryArchitecture";

export type JPSubAxisId =
  | "closureDrive"
  | "structureRelationship"
  | "commitmentMetabolism"
  | "temporalOrientationToPlans"
  | "completionRelationship";

export type SubAxisId = IESubAxisId | NSSubAxisId | TFSubAxisId | JPSubAxisId;

/** Convenience: sub-axis IDs by dimension. */
export type SubAxisIdByDimension = {
  IE: IESubAxisId;
  NS: NSSubAxisId;
  TF: TFSubAxisId;
  JP: JPSubAxisId;
};

/** Prompt metadata (what the backend needs to know). */
export interface PromptSpec {
  id: PromptId;
  dimensionId: DimensionId;
  subAxisId: SubAxisId;
  variant: PromptVariant;
  version: PromptVersion;
  text: string;
  /** Optional sequencing metadata (does not affect scoring buckets). */
  phase?: PromptPhase;
  /** Optional elicitation-style tag for arc building. */
  elicitationType?: ElicitationType;
  /** Optional pacing/intensity tag. */
  intensity?: PromptIntensity;
  /** Optional tags for filtering / experimentation (free-form). */
  tags?: string[];
  /** Optional marker for prompts intended as wild cards. */
  isWildcard?: boolean;
  /** Optional cross-dimensional hint for prompts that intentionally mix cues. */
  crossDimensions?: DimensionId[];
}

/** Optional: stable ordering of sub-axes per dimension (for UX/debug). */
export const SUB_AXIS_ORDER: Record<DimensionId, SubAxisId[]> = {
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
} as const;

/** Scoring conventions (useful for consistency checks). */
export const SCORE_CONVENTION = {
  lowIsZeroHighIsOne: true,
} as const;

/** Small helper for exhaustive checks. */
export function assertNever(x: never, msg = "Unexpected value"): never {
  throw new Error(`${msg}: ${String(x)}`);
}