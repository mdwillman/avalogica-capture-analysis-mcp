// src/scoring/semantic/rules/ie.ts
// Deterministic semantic scoring rules for IE (Social Energy) sub-axes.
// Convention: score01=0 => lowLabel pole, score01=1 => highLabel pole.
import { assertNever } from "../../../domain/index.js";
import { scoreConnectionEconomicsByPromptType } from "./ie/connectionEconomics.js";
import { scoreEnergyDirectionByPromptType } from "./ie/energyDirection.js";
import { scoreProcessingHabitatByPromptType } from "./ie/processingHabitat.js";
import { scoreRestorationSignatureByPromptType } from "./ie/restorationSignature.js";
import { scoreVisibilityRelationshipByPromptType } from "./ie/visibilityRelationship.js";
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
/**
 * IE.energyDirection
 * lowLabel: Prefers intimate settings
 * highLabel: Thrives in crowds
 */
export function scoreIEEnergyDirection(transcriptRaw) {
    const t = (transcriptRaw || "").toLowerCase();
    // Keywords for each pole
    const crowd = [
        "crowd",
        "crowds",
        "packed",
        "party",
        "room full",
        "everyone",
        "big group",
        "large group",
        "strangers",
        "communal",
        "group",
        "conference",
        "network",
        "mixer",
    ];
    const intimate = [
        "quiet",
        "corner",
        "one-on-one",
        "1:1",
        "one on one",
        "two",
        "trusted",
        "close",
        "intimate",
        "small group",
        "few people",
        "private",
        "alone",
        "one person",
    ];
    // Simple “choice” markers (don’t treat as valence; just increases confidence)
    const choice = [
        "prefer",
        "rather",
        "choose",
        "pick",
        "go with",
        "would go",
        "i'd go",
        "i would go",
        "i want",
        "i'd pick",
        "i would pick",
        "i'd choose",
        "i would choose",
    ];
    // Optional valence markers (very lightweight)
    const positive = ["love", "like", "enjoy", "thrives", "energ", "excited"]; // energ* covers energy/energized
    const negative = ["hate", "dread", "avoid", "overwhelm", "too much", "drain", "anxious", "stress", "uncomfortable"];
    const countHits = (terms) => terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);
    const crowdHits = countHits(crowd);
    const intimateHits = countHits(intimate);
    const choiceHits = countHits(choice);
    const posHits = countHits(positive);
    const negHits = countHits(negative);
    // Direction: toward crowds (highLabel) if crowd terms dominate; toward intimate (lowLabel) if intimate dominates
    const rawDir = crowdHits - intimateHits;
    // Neutral baseline
    let score01 = 0.5;
    // Convert direction to delta (cap to avoid overclaiming)
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08; // max ~0.24
    // Choice language boosts confidence + slightly boosts delta (they’re committing to a preference)
    const hasChoice = choiceHits > 0;
    if (hasChoice)
        delta *= 1.15;
    score01 = clamp01(score01 + delta);
    // Confidence: based on evidence quantity + directionality
    const poleCueCount = crowdHits + intimateHits;
    const directional = Math.abs(rawDir);
    let confidence01 = 0.20;
    confidence01 += Math.min(0.35, poleCueCount * 0.08);
    confidence01 += Math.min(0.25, directional * 0.08);
    confidence01 += hasChoice ? 0.10 : 0;
    // If transcript is strongly negative overall, reduce confidence slightly (could be stress talk rather than preference)
    if (negHits >= 2 && posHits === 0)
        confidence01 -= 0.05;
    confidence01 = clamp01(confidence01);
    const cues = [];
    if (crowdHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.crowd_terms",
            weight: +0.08 * crowdHits,
            text: "crowd terms",
        });
    if (intimateHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.intimate_terms",
            weight: -0.08 * intimateHits,
            text: "intimacy terms",
        });
    if (hasChoice)
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    return { score01, confidence01, cues };
}
/**
 * Prompt-type-aware IE scorer entry point.
 * Transitional version: energyDirection uses the new architecture; other sub-axes delegate to the legacy rules above.
 */
export function scoreIESubAxis(params) {
    const { transcript, prompt } = params;
    if (prompt.dimensionId !== "IE") {
        throw new Error(`scoreIESubAxis called with non-IE prompt (${prompt.dimensionId})`);
    }
    const subAxisId = prompt.subAxisId;
    const promptType = prompt.promptType;
    switch (subAxisId) {
        case "energyDirection": {
            if (!promptType) {
                // Safety net: fall back to prior deterministic scorer until catalog guarantees promptType.
                return wrapLegacySubAxisResult("energyDirection", scoreIEEnergyDirection, transcript);
            }
            return scoreEnergyDirectionByPromptType(transcript, promptType);
        }
        case "processingHabitat":
            return scoreProcessingHabitatByPromptType(transcript, promptType);
        case "visibilityRelationship":
            return scoreVisibilityRelationshipByPromptType(transcript, promptType);
        case "connectionEconomics":
            return scoreConnectionEconomicsByPromptType(transcript, promptType);
        case "restorationSignature":
            return scoreRestorationSignatureByPromptType(transcript, promptType);
        default:
            return assertNever(subAxisId, "Unhandled IE sub-axis");
    }
}
function wrapLegacySubAxisResult(subAxisId, scorer, transcript) {
    const res = scorer(transcript);
    return {
        subAxisId,
        score01: res.score01,
        confidence01: res.confidence01,
        cues: res.cues ?? [],
    };
}
function energyConfidence(totalSignalHits, multiplier, base = 0.25, perSignal = 0.05) {
    const raw = base + Math.min(0.45, totalSignalHits * perSignal);
    return clamp01(raw * multiplier);
}
function countMatches(text, phrases) {
    const normalized = text || "";
    let hits = 0;
    for (const phrase of phrases) {
        if (!phrase)
            continue;
        if (normalized.includes(phrase))
            hits += 1;
    }
    return hits;
}
function countRegexHits(text, patterns) {
    const normalized = text || "";
    let hits = 0;
    for (const pattern of patterns) {
        if (pattern.test(normalized)) {
            hits += 1;
        }
    }
    return hits;
}
function firstFragment(text) {
    const normalized = (text || "").trim();
    if (!normalized)
        return "";
    const parts = normalized.split(/[\n\.!?]/).map((part) => part.trim()).filter(Boolean);
    return parts[0] ?? normalized;
}
