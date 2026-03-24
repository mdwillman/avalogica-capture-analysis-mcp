// src/domain/types.ts

/** Canonical dimension IDs used by the backend. */
export type DimensionId = "IE" | "NS" | "TF" | "JP";

/** A/B/C prompt variants. */
export type PromptVariant = "A" | "B" | "C";

/** Version tag for prompt text/content. */

export type PromptVersion = "v1";

/** Supported prompt stimulus modalities. */
export type StimulusModality = "text" | "image" | "audio";

/** How the user is expected to respond to a prompt. */
export type ResponseMode = "spoken" | "typed";

/** Stimulus payload reference for prompt presentation. */
export type StimulusRef =
  | { kind: "inlineText"; text: string }
  | { kind: "firebaseStorage"; path: string };

/** Canonical prompt type / phase taxonomy used across the catalog. */
export type PromptType =
  | "freeRecall"
  | "openInterpretation"
  | "microDecision"
  | "derailmentRecognition"
  | "projectionContinuation";

/** Optional numeric phase slot aligned to the canonical prompt taxonomy. */
export type PromptPhase = 1 | 2 | 3 | 4 | 5;

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
  /** User-facing instruction shown alongside or after the stimulus. */
  instructionText?: string;
  /** Stimulus modality used when presenting the prompt. */
  modality?: StimulusModality;
  /** Optional reference to the underlying text/image/audio stimulus. */
  stimulusRef?: StimulusRef;
  /** Optional exposure duration in milliseconds for timed presentation. */
  exposureMs?: number;
  /** How the user is expected to answer this prompt. */
  responseMode?: ResponseMode;
  /** Optional sequencing metadata (does not affect scoring buckets). */
  phase?: PromptPhase;
  /** Optional canonical prompt-type tag for this prompt. */
  promptType?: PromptType;
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