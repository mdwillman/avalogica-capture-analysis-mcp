import type { PromptSpec } from "../domain/index.js";
import {
  ANSWER_DIRECTNESSES,
  BEHAVIOR_ADMISSIONS,
  COMPULSION_STANCES,
  EVIDENCE_STRENGTHS,
  JUSTIFICATION_MODES,
  METAPHOR_STANCES,
  NORMATIVE_POSTURES,
  PARSE_STATUSES,
  RESPONSE_STYLES,
  SCORABLE_CLARITIES,
  SEMANTIC_PARSE_SCHEMA_VERSION,
  SELF_EVALUATIONS,
  STATE_RELATIONS,
  SURFACE_POLARITIES,
  IE_PROMPT_AXIS_INTERPRETATIONS,
  JP_PROMPT_AXIS_INTERPRETATIONS,
  NS_PROMPT_AXIS_INTERPRETATIONS,
  TF_PROMPT_AXIS_INTERPRETATIONS,
  TRANSCRIPT_QUALITIES,
  SemanticParseFieldsV1,
  SemanticParseResultV1,
  SemanticParserMetaV1,
  SemanticParserRequest,
  SemanticScoringHintsV1,
} from "./types.js";

const DEFAULT_PARSER_MODEL = process.env.SEMANTIC_PARSER_MODEL ?? "gemini-2.5-flash-lite";
const DEFAULT_SEMANTIC_PARSER_VERSION =
  process.env.SEMANTIC_PARSER_VERSION ?? "derailment_semantic_parser_v1";
const SUPPORTED_PARSER_DIMENSIONS = new Set<PromptSpec["dimensionId"]>(["TF", "IE", "JP", "NS"]);
const SYSTEM_INSTRUCTION = `You are an impartial semantic parser for the TF, IE, JP, and NS derailment prompts. Extract cues only.
- NEVER guess MBTI types or final scores.
- NEVER output prose explanations.
- ALWAYS respond with pure JSON that obeys the provided schema exactly.
- Prefer "unclear" over invention when evidence is missing.
- Distinguish between rejecting the metaphor and rejecting the underlying behavior.
- If the transcript lacks content, mark parseStatus as "low_information" and keep fields conservative.`;

const VERTEX_PROJECT_KEYS = [
  "SEMANTIC_PARSER_PROJECT",
  "VERTEX_PROJECT_ID",
  "GOOGLE_CLOUD_PROJECT",
] as const;
const VERTEX_LOCATION_KEYS = [
  "SEMANTIC_PARSER_LOCATION",
  "VERTEX_LOCATION",
  "GOOGLE_CLOUD_LOCATION",
  "GOOGLE_CLOUD_REGION",
] as const;
const DEFAULT_VERTEX_LOCATION = "us-central1";

type GenAIModule = typeof import("@google/genai");
type ParserModelHandle = {
  modelName: string;
  client: {
    models: {
      generateContent(request: any): Promise<any>;
    };
  };
  config: any;
};

let parserModelHandlePromise: Promise<ParserModelHandle | null> | null = null;

export async function runSemanticParser(
  request: SemanticParserRequest
): Promise<SemanticParseResultV1 | undefined> {
  if (!SUPPORTED_PARSER_DIMENSIONS.has(request.prompt.dimensionId)) return undefined;
  const transcript = request.transcript?.trim();
  if (!transcript) return undefined;

  try {
    const modelHandle = await getParserModelHandle();
    if (!modelHandle) return undefined;

    const response = await modelHandle.client.models.generateContent({
      model: modelHandle.modelName,
      contents: [
        {
          role: "user",
          parts: [{ text: buildParserPayload(request, transcript) }],
        },
      ],
      config: modelHandle.config,
    });

    const raw = extractJsonCandidate(response);
    if (!raw) return undefined;

    const validated = validateSemanticParseResult(raw, request.prompt);
    if (!validated) return undefined;

    const normalized = normalizeSemanticParseResult(validated);
    return applyParserMetadata(normalized, modelHandle.modelName);
  } catch (err) {
    console.error("[semantic-parser] Vertex AI call failed", err);
    return undefined;
  }
}

export function validateSemanticParseResult(
  result: unknown,
  prompt: PromptSpec
): SemanticParseResultV1 | undefined {
  if (!isPlainObject(result)) return undefined;
  if (result.schemaVersion !== SEMANTIC_PARSE_SCHEMA_VERSION) return undefined;
  if (result.promptId && result.promptId !== prompt.id) return undefined;
  if (result.dimension !== prompt.dimensionId) return undefined;
  if (!isOneOf(result.parseStatus, PARSE_STATUSES)) return undefined;
  if (!isOneOf(result.transcriptQuality, TRANSCRIPT_QUALITIES)) return undefined;
  if (typeof result.responseHasSubstantiveContent !== "boolean") return undefined;
  if (!validateFields(result.fields)) return undefined;
  if (!validateScoringHints(result.scoringHints)) return undefined;
  if (!validateParserMeta(result.parserMeta)) return undefined;
  return result as SemanticParseResultV1;
}

function validateFields(fields: SemanticParseFieldsV1): boolean {
  return (
    isOneOf(fields.surfacePolarity, SURFACE_POLARITIES) &&
    isOneOf(fields.behaviorAdmission, BEHAVIOR_ADMISSIONS) &&
    isOneOf(fields.metaphorStance, METAPHOR_STANCES) &&
    isOneOf(fields.compulsionStance, COMPULSION_STANCES) &&
    isOneOf(fields.selfEvaluation, SELF_EVALUATIONS) &&
    isOneOf(fields.justificationModePrimary, JUSTIFICATION_MODES) &&
    isOneOf(fields.responseStylePrimary, RESPONSE_STYLES) &&
    isOneOf(fields.stateRelation, STATE_RELATIONS) &&
    isOneOf(fields.scorableClarity, SCORABLE_CLARITIES) &&
    (fields.answerDirectness === undefined || isOneOf(fields.answerDirectness, ANSWER_DIRECTNESSES)) &&
    (fields.justificationModeSecondary === undefined ||
      isOneOf(fields.justificationModeSecondary, JUSTIFICATION_MODES)) &&
    (fields.responseStyleSecondary === undefined ||
      isOneOf(fields.responseStyleSecondary, RESPONSE_STYLES)) &&
    (fields.normativePosture === undefined || isOneOf(fields.normativePosture, NORMATIVE_POSTURES))
  );
}

function validateScoringHints(hints: SemanticScoringHintsV1): boolean {
  return (
    (hints.tfPromptAxisInterpretation === undefined ||
      isOneOf(hints.tfPromptAxisInterpretation, TF_PROMPT_AXIS_INTERPRETATIONS)) &&
    (hints.iePromptAxisInterpretation === undefined ||
      isOneOf(hints.iePromptAxisInterpretation, IE_PROMPT_AXIS_INTERPRETATIONS)) &&
    (hints.jpPromptAxisInterpretation === undefined ||
      isOneOf(hints.jpPromptAxisInterpretation, JP_PROMPT_AXIS_INTERPRETATIONS)) &&
    (hints.nsPromptAxisInterpretation === undefined ||
      isOneOf(hints.nsPromptAxisInterpretation, NS_PROMPT_AXIS_INTERPRETATIONS)) &&
    isOneOf(hints.evidenceOfThinkingStyle, EVIDENCE_STRENGTHS) &&
    isOneOf(hints.evidenceOfFeelingStyle, EVIDENCE_STRENGTHS) &&
    isOneOf(hints.evidenceOfAlienationFromState, EVIDENCE_STRENGTHS) &&
    isOneOf(hints.evidenceOfOwnershipOfState, EVIDENCE_STRENGTHS)
  );
}

function validateParserMeta(meta: SemanticParserMetaV1): boolean {
  if (!meta) return false;
  if (typeof meta.parserModel !== "string" || typeof meta.parserVersion !== "string") return false;
  if (typeof meta.parserConfidence !== "number" || Number.isNaN(meta.parserConfidence)) return false;
  if (meta.notesForDebug !== undefined && typeof meta.notesForDebug !== "string") return false;
  return true;
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  if (typeof value !== "string") return false;
  return options.includes(value as T[number]);
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

async function getParserModelHandle(): Promise<ParserModelHandle | null> {
  if (!parserModelHandlePromise) {
    parserModelHandlePromise = initParserModelHandle();
  }
  return parserModelHandlePromise;
}

async function initParserModelHandle(): Promise<ParserModelHandle | null> {
  const project = pickEnv(VERTEX_PROJECT_KEYS);
  if (!project) {
    console.error("[semantic-parser] Missing Vertex AI project configuration");
    return null;
  }
  const location = pickEnv(VERTEX_LOCATION_KEYS) ?? DEFAULT_VERTEX_LOCATION;

  let genaiModule: GenAIModule;
  try {
    genaiModule = (await import("@google/genai")) as GenAIModule;
  } catch (err) {
    console.error("[semantic-parser] Unable to load @google/genai", err);
    return null;
  }

  const { GoogleGenAI } = genaiModule;
  const client = new GoogleGenAI({ vertexai: true, project, location });
  const responseSchema = buildResponseSchema();
  const config = {
    temperature: 0.15,
    topP: 0.1,
    responseMimeType: "application/json",
    responseSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
  };

  return {
    modelName: DEFAULT_PARSER_MODEL,
    client,
    config,
  };
}

function buildParserPayload(request: SemanticParserRequest, transcript: string): string {
  const payload = {
    promptId: request.prompt.id,
    dimension: request.prompt.dimensionId,
    subAxisId: request.prompt.subAxisId,
    promptType: request.prompt.promptType,
    instructionText: request.prompt.instructionText ?? null,
    transcript,
    language: request.language,
  };
  return JSON.stringify(payload);
}

function extractJsonCandidate(response: any): unknown | null {
  if (typeof response?.text === "string" && response.text.trim()) {
    const directText = response.text.trim();
    try {
      return JSON.parse(directText);
    } catch (err) {
      console.warn("[semantic-parser] Failed to parse direct response.text as JSON", err);
    }
  }

  const candidates = response?.candidates ?? response?.response?.candidates;
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        const text = part.text.trim();
        try {
          return JSON.parse(text);
        } catch (err) {
          console.warn("[semantic-parser] Failed to parse JSON part", {
            error: err,
            preview: text.slice(0, 160),
          });
        }
      }
    }
  }
  return null;
}

function normalizeSemanticParseResult(
  result: SemanticParseResultV1
): SemanticParseResultV1 {
  let normalized = result;

  if (
    result.fields.metaphorStance === "rejects_metaphor_accepts_behavior" &&
    (result.fields.stateRelation === "unclear" ||
      (result.fields.stateRelation === "familiar_but_rejected" &&
        (result.fields.behaviorAdmission === "admits" ||
          result.fields.behaviorAdmission === "partial")))
  ) {
    normalized = {
      ...normalized,
      fields: {
        ...normalized.fields,
        stateRelation: "owned_but_misdescribed",
      },
    };
  }

  if (
    normalized.promptId === "VK.TF.4A.v1" &&
    normalized.fields.metaphorStance === "accepts_metaphor" &&
    (normalized.fields.behaviorAdmission === "admits" ||
      (normalized.fields.behaviorAdmission === "unclear" &&
        normalized.scoringHints.evidenceOfOwnershipOfState === "strong")) &&
    (normalized.fields.stateRelation === "unclear" ||
      normalized.fields.stateRelation === "owned_but_misdescribed")
  ) {
    normalized = {
      ...normalized,
      fields: {
        ...normalized.fields,
        stateRelation: "endorsed",
      },
    };
  }

  if (normalized.dimension === "TF") {
    let normalizedInterpretation = normalizeTfPromptAxisInterpretation(
      normalized.promptId,
      normalized.scoringHints.tfPromptAxisInterpretation
    );

    if (
      normalized.promptId === "VK.TF.4A.v1" &&
      normalized.fields.metaphorStance === "accepts_metaphor" &&
      (normalized.fields.behaviorAdmission === "admits" ||
        (normalized.fields.behaviorAdmission === "unclear" &&
          normalized.scoringHints.evidenceOfOwnershipOfState === "strong")) &&
      (normalizedInterpretation === "admits_sensitivity_but_rejects_caricature" ||
        normalizedInterpretation === "unclear")
    ) {
      normalizedInterpretation = "endorses_value_laden_feeling";
    }

    if (normalizedInterpretation !== normalized.scoringHints.tfPromptAxisInterpretation) {
      normalized = {
        ...normalized,
        scoringHints: {
          ...normalized.scoringHints,
          tfPromptAxisInterpretation: normalizedInterpretation,
        },
      };
    }
  } else if (normalized.dimension === "IE") {
    const normalizedIE = normalizeIePromptAxisInterpretation(
      normalized.promptId,
      normalized.scoringHints.iePromptAxisInterpretation
    );
    if (normalizedIE !== normalized.scoringHints.iePromptAxisInterpretation) {
      normalized = {
        ...normalized,
        scoringHints: {
          ...normalized.scoringHints,
          iePromptAxisInterpretation: normalizedIE,
        },
      };
    }
  } else if (normalized.dimension === "JP") {
    const normalizedJP = normalizeJpPromptAxisInterpretation(
      normalized.promptId,
      normalized.scoringHints.jpPromptAxisInterpretation
    );
    if (normalizedJP !== normalized.scoringHints.jpPromptAxisInterpretation) {
      normalized = {
        ...normalized,
        scoringHints: {
          ...normalized.scoringHints,
          jpPromptAxisInterpretation: normalizedJP,
        },
      };
    }
  } else if (normalized.dimension === "NS") {
    const normalizedNS = normalizeNsPromptAxisInterpretation(
      normalized.promptId,
      normalized.scoringHints.nsPromptAxisInterpretation
    );
    if (normalizedNS !== normalized.scoringHints.nsPromptAxisInterpretation) {
      normalized = {
        ...normalized,
        scoringHints: {
          ...normalized.scoringHints,
          nsPromptAxisInterpretation: normalizedNS,
        },
      };
    }
  }

  return normalized;
}

function normalizeTfPromptAxisInterpretation(
  promptId: string,
  interpretation: SemanticScoringHintsV1["tfPromptAxisInterpretation"]
): SemanticScoringHintsV1["tfPromptAxisInterpretation"] {
  if (!interpretation || interpretation === "unclear") {
    return interpretation;
  }

  const allowedByPrompt: Record<string, ReadonlySet<string>> = {
    "VK.TF.4A.v1": new Set([
      "rejects_hurt_based_judgment",
      "admits_sensitivity_but_rejects_caricature",
      "endorses_value_laden_feeling",
      "unclear",
    ]),
    "VK.TF.9A.v1": new Set([
      "rejects_emotional_coldness",
      "admits_detachment_but_rejects_dehumanizing_frame",
      "endorses_impersonal_clarity",
      "unclear",
    ]),
    "VK.TF.14A.v1": new Set([
      "rejects_feeling_principle_fusion",
      "admits_values_but_rejects_disguise_frame",
      "endorses_feeling_as_principled_knowledge",
      "unclear",
    ]),
    "VK.TF.19A.v1": new Set([
      "rejects_compulsive_social_pleasing",
      "admits_social_adaptation_but_rejects_humiliation_frame",
      "endorses_social_warmth",
      "unclear",
    ]),
    "VK.TF.24A.v1": new Set([
      "rejects_forceful_control",
      "admits_directiveness_but_rejects_moralized_frame",
      "endorses_hard_decisiveness",
      "unclear",
    ]),
  };

  const allowed = allowedByPrompt[promptId];
  if (!allowed) {
    return interpretation;
  }

  return allowed.has(interpretation) ? interpretation : "unclear";
}

function normalizeIePromptAxisInterpretation(
  promptId: string,
  interpretation: SemanticScoringHintsV1["iePromptAxisInterpretation"]
): SemanticScoringHintsV1["iePromptAxisInterpretation"] {
  if (!interpretation || interpretation === "unclear") {
    return interpretation;
  }

  const allowedByPrompt: Record<string, ReadonlySet<string>> = {
    "VK.IE.4A.v1": new Set([
      "rejects_reactive_social_animation",
      "admits_liveliness_but_rejects_mechanical_frame",
      "endorses_expressive_animation",
      "unclear",
    ]),
    "VK.IE.9A.v1": new Set([
      "rejects_compulsive_external_processing",
      "admits_out_loud_processing_but_rejects_neediness_frame",
      "endorses_external_processing",
      "unclear",
    ]),
    "VK.IE.14A.v1": new Set([
      "rejects_defensive_withdrawal",
      "admits_privateness_but_rejects_pathology_frame",
      "endorses_withdrawal_as_protection",
      "unclear",
    ]),
    "VK.IE.19A.v1": new Set([
      "rejects_attention_dependence",
      "admits_social_need_but_rejects_dependency_frame",
      "endorses_attention_as_vitalizing",
      "unclear",
    ]),
    "VK.IE.24A.v1": new Set([
      "rejects_disappearing_withdrawal",
      "admits_retreat_but_rejects_cowardice_frame",
      "endorses_withdrawal_for_restoration",
      "unclear",
    ]),
  };

  const allowed = allowedByPrompt[promptId];
  if (!allowed) {
    return interpretation;
  }
  return allowed.has(interpretation) ? interpretation : "unclear";
}

function normalizeJpPromptAxisInterpretation(
  promptId: string,
  interpretation: SemanticScoringHintsV1["jpPromptAxisInterpretation"]
): SemanticScoringHintsV1["jpPromptAxisInterpretation"] {
  if (!interpretation || interpretation === "unclear") {
    return interpretation;
  }

  const allowedByPrompt: Record<string, ReadonlySet<string>> = {
    "VK.JP.4A.v1": new Set([
      "rejects_compulsive_closure",
      "admits_closure_drive_but_rejects_fanatic_frame",
      "endorses_deadline_closure",
      "unclear",
    ]),
    "VK.JP.9A.v1": new Set([
      "rejects_structure_reactance",
      "admits_flexibility_but_rejects_prison_frame",
      "endorses_plan_resistance",
      "unclear",
    ]),
    "VK.JP.14A.v1": new Set([
      "rejects_overbound_commitment",
      "admits_commitment_need_but_rejects_suffocation_frame",
      "endorses_binding_commitment",
      "unclear",
    ]),
    "VK.JP.19A.v1": new Set([
      "rejects_reality_deferring_delay",
      "admits_delay_but_rejects_pretense_frame",
      "endorses_temporal_deferral",
      "unclear",
    ]),
    "VK.JP.24A.v1": new Set([
      "rejects_possibility_preserving_incompletion",
      "admits_openness_but_rejects_accusation_frame",
      "endorses_unfinished_possibility",
      "unclear",
    ]),
  };

  const allowed = allowedByPrompt[promptId];
  if (!allowed) {
    return interpretation;
  }
  return allowed.has(interpretation) ? interpretation : "unclear";
}

function normalizeNsPromptAxisInterpretation(
  promptId: string,
  interpretation: SemanticScoringHintsV1["nsPromptAxisInterpretation"]
): SemanticScoringHintsV1["nsPromptAxisInterpretation"] {
  if (!interpretation || interpretation === "unclear") {
    return interpretation;
  }

  const allowedByPrompt: Record<string, ReadonlySet<string>> = {
    "VK.NS.4A.v1": new Set([
      "rejects_reality_avoidant_abstraction",
      "admits_imaginative_distance_but_rejects_escape_frame",
      "endorses_transcendent_detachment",
      "unclear",
    ]),
    "VK.NS.9A.v1": new Set([
      "rejects_present_detachment",
      "admits_elsewhere_habitation_but_rejects_neglect_frame",
      "endorses_distance_from_immediacy",
      "unclear",
    ]),
    "VK.NS.14A.v1": new Set([
      "rejects_pattern_dependent_fact_dismissal",
      "admits_pattern_hunger_but_rejects_contempt_frame",
      "endorses_pattern_first_attention",
      "unclear",
    ]),
    "VK.NS.19A.v1": new Set([
      "rejects_surface_bound_literalism",
      "admits_concrete_attention_but_rejects_flatness_frame",
      "endorses_surface_level_reality",
      "unclear",
    ]),
    "VK.NS.24A.v1": new Set([
      "rejects_compulsive_meaning_imposition",
      "admits_meaning_hunger_but_rejects_excess_frame",
      "endorses_meaning_as_reality_threshold",
      "unclear",
    ]),
  };

  const allowed = allowedByPrompt[promptId];
  if (!allowed) {
    return interpretation;
  }
  return allowed.has(interpretation) ? interpretation : "unclear";
}

function applyParserMetadata(
  result: SemanticParseResultV1,
  modelName: string
): SemanticParseResultV1 {
  const confidence = clamp01(result.parserMeta?.parserConfidence ?? 0.5);
  const normalizedMeta: SemanticParserMetaV1 = {
    parserModel: modelName,
    parserVersion: DEFAULT_SEMANTIC_PARSER_VERSION,
    parserConfidence: confidence,
    notesForDebug: result.parserMeta?.notesForDebug,
  };

  return {
    ...result,
    parserMeta: normalizedMeta,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function pickEnv(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function buildResponseSchema() {
  const stringEnum = (values: readonly string[]) => ({
    type: "string",
    enum: [...values],
  });

  return {
    type: "object",
    required: [
      "schemaVersion",
      "promptId",
      "dimension",
      "transcriptQuality",
      "responseHasSubstantiveContent",
      "parseStatus",
      "fields",
      "scoringHints",
      "parserMeta",
    ],
    properties: {
      schemaVersion: { type: "string", enum: [SEMANTIC_PARSE_SCHEMA_VERSION] },
      promptId: { type: "string" },
      dimension: { type: "string", enum: ["TF", "IE", "JP", "NS"] },
      transcriptQuality: stringEnum(TRANSCRIPT_QUALITIES),
      responseHasSubstantiveContent: { type: "boolean" },
      parseStatus: stringEnum(PARSE_STATUSES),
      fields: {
        type: "object",
        required: [
          "surfacePolarity",
          "behaviorAdmission",
          "metaphorStance",
          "compulsionStance",
          "selfEvaluation",
          "justificationModePrimary",
          "responseStylePrimary",
          "stateRelation",
          "scorableClarity",
        ],
        properties: {
          surfacePolarity: stringEnum(SURFACE_POLARITIES),
          behaviorAdmission: stringEnum(BEHAVIOR_ADMISSIONS),
          metaphorStance: stringEnum(METAPHOR_STANCES),
          compulsionStance: stringEnum(COMPULSION_STANCES),
          selfEvaluation: stringEnum(SELF_EVALUATIONS),
          justificationModePrimary: stringEnum(JUSTIFICATION_MODES),
          responseStylePrimary: stringEnum(RESPONSE_STYLES),
          stateRelation: stringEnum(STATE_RELATIONS),
          scorableClarity: stringEnum(SCORABLE_CLARITIES),
          answerDirectness: stringEnum(ANSWER_DIRECTNESSES),
          justificationModeSecondary: stringEnum(JUSTIFICATION_MODES),
          responseStyleSecondary: stringEnum(RESPONSE_STYLES),
          normativePosture: stringEnum(NORMATIVE_POSTURES),
        },
      },
      scoringHints: {
        type: "object",
        required: [
          "evidenceOfThinkingStyle",
          "evidenceOfFeelingStyle",
          "evidenceOfAlienationFromState",
          "evidenceOfOwnershipOfState",
        ],
        properties: {
          tfPromptAxisInterpretation: stringEnum(TF_PROMPT_AXIS_INTERPRETATIONS),
          iePromptAxisInterpretation: stringEnum(IE_PROMPT_AXIS_INTERPRETATIONS),
          jpPromptAxisInterpretation: stringEnum(JP_PROMPT_AXIS_INTERPRETATIONS),
          nsPromptAxisInterpretation: stringEnum(NS_PROMPT_AXIS_INTERPRETATIONS),
          evidenceOfThinkingStyle: stringEnum(EVIDENCE_STRENGTHS),
          evidenceOfFeelingStyle: stringEnum(EVIDENCE_STRENGTHS),
          evidenceOfAlienationFromState: stringEnum(EVIDENCE_STRENGTHS),
          evidenceOfOwnershipOfState: stringEnum(EVIDENCE_STRENGTHS),
        },
      },
      parserMeta: {
        type: "object",
        required: ["parserModel", "parserVersion", "parserConfidence"],
        properties: {
          parserModel: { type: "string" },
          parserVersion: { type: "string" },
          parserConfidence: { type: "number" },
          notesForDebug: { type: "string" },
        },
      },
    },
  };
}
