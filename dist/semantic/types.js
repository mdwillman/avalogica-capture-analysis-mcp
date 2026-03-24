export const SEMANTIC_PARSE_SCHEMA_VERSION = "semantic_parse_v1";
export const PARSE_STATUSES = ["ok", "ambiguous", "low_information", "failed"];
export const TRANSCRIPT_QUALITIES = ["clear", "mostly_clear", "partially_unclear", "poor"];
export const SURFACE_POLARITIES = ["yes", "no", "mixed", "unclear", "refuses_frame"];
export const ANSWER_DIRECTNESSES = ["direct", "qualified_direct", "indirect", "meta_first", "evasive"];
export const BEHAVIOR_ADMISSIONS = ["admits", "denies", "partial", "unclear"];
export const METAPHOR_STANCES = [
    "accepts_metaphor",
    "partially_accepts_metaphor",
    "rejects_metaphor_accepts_behavior",
    "rejects_metaphor_and_behavior",
    "does_not_engage_metaphor",
    "unclear",
];
export const COMPULSION_STANCES = [
    "admits_compulsion",
    "denies_compulsion",
    "reframes_as_choice",
    "unclear",
    "not_applicable",
];
export const SELF_EVALUATIONS = [
    "enjoys_state",
    "tolerates_state",
    "dislikes_state",
    "ashamed_of_state",
    "proud_of_state",
    "ambivalent",
    "unclear",
];
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
];
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
];
export const NORMATIVE_POSTURES = [
    "self_defensive",
    "self_critical",
    "self_excusing",
    "self_accepting",
    "morally_justifying",
    "practically_justifying",
    "neutral_descriptive",
    "unclear",
];
export const STATE_RELATIONS = [
    "alien_and_rejected",
    "familiar_but_rejected",
    "owned_but_misdescribed",
    "endorsed",
    "ambivalent",
    "unclear",
];
export const SCORABLE_CLARITIES = ["high", "medium", "low"];
export const EVIDENCE_STRENGTHS = ["none", "weak", "moderate", "strong", "unclear"];
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
];
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
];
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
];
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
];
