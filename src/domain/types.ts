// src/domain/types.ts

/** Canonical dimension IDs used by the backend. */
export type DimensionId = "IE" | "NS" | "TF" | "JP";

/** A/B/C prompt variants. */
export type PromptVariant = "A" | "B" | "C";

/** Version tag for prompt text/content. */
export type PromptVersion = "v1";

/** Strongly typed prompt ID format: VK.<DIM>.<S#><VAR>.v1 */
export type PromptId =
  | `VK.${DimensionId}.${1 | 2 | 3 | 4 | 5}${PromptVariant}.${PromptVersion}`;

/** Sub-axis IDs (match Swift enum rawValue strings exactly). */
export type IESubAxisId =
  | "groupSizePreference"
  | "initiatingConversation"
  | "familiarityVsNovelty"
  | "speakingPace"
  | "spotlightVsBackground";

export type NSSubAxisId =
  | "informationSource"
  | "timeOrientation"
  | "cognitiveFocus"
  | "decisionConfidenceDriver"
  | "riskAssessmentFrame";

export type TFSubAxisId =
  | "feedbackAim"
  | "fairnessFrame"
  | "conflictPosture"
  | "decisionDriver"
  | "socialEvaluationFocus";

export type JPSubAxisId =
  | "commitmentStyle"
  | "planningStyle"
  | "decisionTiming"
  | "closurePreference"
  | "approachToConstraints";

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
}

/** Optional: stable ordering of sub-axes per dimension (for UX/debug). */
export const SUB_AXIS_ORDER: Record<DimensionId, SubAxisId[]> = {
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
} as const;

/** Scoring conventions (useful for consistency checks). */
export const SCORE_CONVENTION = {
  lowIsZeroHighIsOne: true,
} as const;

/** Small helper for exhaustive checks. */
export function assertNever(x: never, msg = "Unexpected value"): never {
  throw new Error(`${msg}: ${String(x)}`);
}