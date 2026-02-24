import type { DimensionId, SubAxisId } from "../domain/index.js";

export type CueKind = "semantic" | "acoustic";

export interface Cue {
  kind: CueKind;
  featureId: string;        // e.g. "modality.epistemic"
  weight: number;           // positive pushes toward highLabel, negative pushes toward lowLabel
  text?: string;            // short citation snippet
  startChar?: number;       // optional transcript offsets
  endChar?: number;
}

export interface SubAxisScore {
  subAxisId: SubAxisId;
  score01: number;          // 0..1 (0=lowLabel, 1=highLabel)
  confidence01: number;     // 0..1
  cues: Cue[];
}

export interface DimensionScore {
  dimensionId: DimensionId;
  // sub-axis scores for this dimension
  subAxes: Record<string, SubAxisScore>;
}

export interface ScoringDebug {
  promptId?: string;
  subAxes: Record<DimensionId, Record<string, SubAxisScore>>;
}

export interface ScoringResult {
  // For iOS stable contract:
  dimensionState: {
    axes: Record<string, { leansToward?: string; strength?: number; confidence?: number; updatedAt?: string }>;
    mbtiGuess?: string;
    mbtiConfidence?: number;
    updatedAt?: string;
  };
  evidence: Array<{
    dimension: string;
    leansToward: string;
    confidence: number;
    excerpt?: string;
    sourceType?: string;
    sourceSessionID?: string;
    agentType?: string;
    timestamp: string;
  }>;

  // Optional; you can surface this behind INCLUDE_TRANSCRIPT_DEBUG later
  debug?: ScoringDebug;
}