import type { PromptSpec } from "../domain/index.js";

export const SEMANTIC_PARSE_SCHEMA_VERSION = "semantic_parse_v1" as const;

export const PARSE_STATUSES = ["ok", "ambiguous", "low_information", "failed"] as const;
export type ParseStatus = typeof PARSE_STATUSES[number];

export const TRANSCRIPT_QUALITIES = ["clear", "mostly_clear", "partially_unclear", "poor"] as const;
export type TranscriptQuality = typeof TRANSCRIPT_QUALITIES[number];

export const SURFACE_POLARITIES = ["yes", "no", "mixed", "unclear", "refuses_frame"] as const;
export type SurfacePolarity = typeof SURFACE_POLARITIES[number];

export const ANSWER_DIRECTNESSES = ["direct", "qualified_direct", "indirect", "meta_first", "evasive"] as const;
export type AnswerDirectness = typeof ANSWER_DIRECTNESSES[number];

export const BEHAVIOR_ADMISSIONS = ["admits", "denies", "partial", "unclear"] as const;
export type BehaviorAdmission = typeof BEHAVIOR_ADMISSIONS[number];

export const METAPHOR_STANCES = [
  "accepts_metaphor",
  "partially_accepts_metaphor",
  "rejects_metaphor_accepts_behavior",
  "rejects_metaphor_and_behavior",
  "does_not_engage_metaphor",
  "unclear",
] as const;
export type MetaphorStance = typeof METAPHOR_STANCES[number];

export const COMPULSION_STANCES = [
  "admits_compulsion",
  "denies_compulsion",
  "reframes_as_choice",
  "unclear",
  "not_applicable",
] as const;
export type CompulsionStance = typeof COMPULSION_STANCES[number];

export const SELF_EVALUATIONS = [
  "enjoys_state",
  "tolerates_state",
  "dislikes_state",
  "ashamed_of_state",
  "proud_of_state",
  "ambivalent",
  "unclear",
] as const;
export type SelfEvaluation = typeof SELF_EVALUATIONS[number];

export const JUSTIFICATION_MODES = [
  "care",
  "authenticity",
  "logic",
  "efficiency",
  "fairness",
  "self_protection",
  "social_acceptability",
  "none",
  "unclear",
] as const;
export type JustificationMode = typeof JUSTIFICATION_MODES[number];

export const RESPONSE_STYLES = [
  "plain_answer",
  "reframing",
  "denial",
  "qualification",
  "self_accusation",
  "counterattack_on_prompt",
  "literalization",
  "abstraction",
  "humor",
  "unclear",
] as const;
export type ResponseStyle = typeof RESPONSE_STYLES[number];

export const NORMATIVE_POSTURES = [
  "self_defensive",
  "self_critical",
  "self_excusing",
  "self_accepting",
  "morally_justifying",
  "practically_justifying",
  "neutral_descriptive",
  "unclear",
] as const;
export type NormativePosture = typeof NORMATIVE_POSTURES[number];

export const STATE_RELATIONS = [
  "alien_and_rejected",
  "familiar_but_rejected",
  "owned_but_misdescribed",
  "endorsed",
  "ambivalent",
  "unclear",
] as const;
export type StateRelation = typeof STATE_RELATIONS[number];

export const SCORABLE_CLARITIES = ["high", "medium", "low"] as const;
export type ScorableClarity = typeof SCORABLE_CLARITIES[number];

export const EVIDENCE_STRENGTHS = ["none", "weak", "moderate", "strong", "unclear"] as const;
export type EvidenceStrength = typeof EVIDENCE_STRENGTHS[number];

export const TF_PROMPT_AXIS_INTERPRETATIONS = [
  "rejects_compulsive_social_pleasing",
  "admits_social_adaptation_but_rejects_humiliation_frame",
  "endorses_social_warmth",
  "rejects_hurt_based_judgment",
  "admits_sensitivity_but_rejects_caricature",
  "endorses_value_laden_feeling",
  "rejects_forceful_control",
  "admits_directiveness_but_rejects_moralized_frame",
  "endorses_hard_decisiveness",
  "rejects_emotional_coldness",
  "admits_detachment_but_rejects_dehumanizing_frame",
  "endorses_impersonal_clarity",
  "rejects_feeling_principle_fusion",
  "admits_values_but_rejects_disguise_frame",
  "endorses_feeling_as_principled_knowledge",
  "unclear",
] as const;
export type TFPromptAxisInterpretation = typeof TF_PROMPT_AXIS_INTERPRETATIONS[number];

export const IE_PROMPT_AXIS_INTERPRETATIONS = [
  "rejects_reactive_social_animation",
  "admits_liveliness_but_rejects_mechanical_frame",
  "endorses_expressive_animation",
  "rejects_compulsive_external_processing",
  "admits_out_loud_processing_but_rejects_neediness_frame",
  "endorses_external_processing",
  "rejects_defensive_withdrawal",
  "admits_privateness_but_rejects_pathology_frame",
  "endorses_withdrawal_as_protection",
  "rejects_attention_dependence",
  "admits_social_need_but_rejects_dependency_frame",
  "endorses_attention_as_vitalizing",
  "rejects_disappearing_withdrawal",
  "admits_retreat_but_rejects_cowardice_frame",
  "endorses_withdrawal_for_restoration",
  "unclear",
] as const;
export type IEPromptAxisInterpretation = typeof IE_PROMPT_AXIS_INTERPRETATIONS[number];

export const JP_PROMPT_AXIS_INTERPRETATIONS = [
  "rejects_compulsive_closure",
  "admits_closure_drive_but_rejects_fanatic_frame",
  "endorses_deadline_closure",
  "rejects_structure_reactance",
  "admits_flexibility_but_rejects_prison_frame",
  "endorses_plan_resistance",
  "rejects_possibility_preserving_incompletion",
  "admits_openness_but_rejects_accusation_frame",
  "endorses_unfinished_possibility",
  "rejects_reality_deferring_delay",
  "admits_delay_but_rejects_pretense_frame",
  "endorses_temporal_deferral",
  "rejects_overbound_commitment",
  "admits_commitment_need_but_rejects_suffocation_frame",
  "endorses_binding_commitment",
  "unclear",
] as const;
export type JPPromptAxisInterpretation = typeof JP_PROMPT_AXIS_INTERPRETATIONS[number];

export const NS_PROMPT_AXIS_INTERPRETATIONS = [
  "rejects_reality_avoidant_abstraction",
  "admits_imaginative_distance_but_rejects_escape_frame",
  "endorses_transcendent_detachment",
  "rejects_present_detachment",
  "admits_elsewhere_habitation_but_rejects_neglect_frame",
  "endorses_distance_from_immediacy",
  "rejects_pattern_dependent_fact_dismissal",
  "admits_pattern_hunger_but_rejects_contempt_frame",
  "endorses_pattern_first_attention",
  "rejects_surface_bound_literalism",
  "admits_concrete_attention_but_rejects_flatness_frame",
  "endorses_surface_level_reality",
  "rejects_compulsive_meaning_imposition",
  "admits_meaning_hunger_but_rejects_excess_frame",
  "endorses_meaning_as_reality_threshold",
  "unclear",
] as const;
export type NSPromptAxisInterpretation = typeof NS_PROMPT_AXIS_INTERPRETATIONS[number];

export interface SemanticParseFieldsV1 {
  surfacePolarity: SurfacePolarity;
  behaviorAdmission: BehaviorAdmission;
  metaphorStance: MetaphorStance;
  compulsionStance: CompulsionStance;
  selfEvaluation: SelfEvaluation;
  justificationModePrimary: JustificationMode;
  responseStylePrimary: ResponseStyle;
  stateRelation: StateRelation;
  scorableClarity: ScorableClarity;
  answerDirectness?: AnswerDirectness;
  justificationModeSecondary?: JustificationMode;
  responseStyleSecondary?: ResponseStyle;
  normativePosture?: NormativePosture;
}

export interface SemanticScoringHintsV1 {
  tfPromptAxisInterpretation?: TFPromptAxisInterpretation;
  iePromptAxisInterpretation?: IEPromptAxisInterpretation;
  jpPromptAxisInterpretation?: JPPromptAxisInterpretation;
  nsPromptAxisInterpretation?: NSPromptAxisInterpretation;
  evidenceOfThinkingStyle: EvidenceStrength;
  evidenceOfFeelingStyle: EvidenceStrength;
  evidenceOfAlienationFromState: EvidenceStrength;
  evidenceOfOwnershipOfState: EvidenceStrength;
}

export interface SemanticParserMetaV1 {
  parserModel: string;
  parserVersion: string;
  parserConfidence: number;
  notesForDebug?: string;
}

export interface SemanticParseResultV1 {
  schemaVersion: typeof SEMANTIC_PARSE_SCHEMA_VERSION;
  promptId: string;
  dimension: "TF" | "IE" | "JP" | "NS";
  transcriptQuality: TranscriptQuality;
  responseHasSubstantiveContent: boolean;
  parseStatus: ParseStatus;
  fields: SemanticParseFieldsV1;
  scoringHints: SemanticScoringHintsV1;
  parserMeta: SemanticParserMetaV1;
}

export interface SemanticParserRequest {
  transcript: string;
  prompt: PromptSpec;
  captureId: string;
  language: string;
}
