import { analyzeTextForScoring } from "../utils.js";
import { effectiveHits } from "../../operators/index.js";
import { clamp01, countMatches, countRegexHits } from "./shared.js";
const SOCIAL_REFERENCE_TERMS = [
    "people",
    "friends",
    "friend",
    "everyone",
    "group",
    "crowd",
    "crowds",
    "room full",
    "packed",
    "party",
    "team",
    "together",
    "meetup",
    "conference",
    "gathering",
    "talking",
    "conversation",
    "chatting",
];
const SOLITUDE_REFERENCE_TERMS = [
    "alone",
    "by myself",
    "myself",
    "solo",
    "quiet",
    "calm",
    "private",
    "privacy",
    "closed door",
    "corner",
    "small space",
    "escape",
    "retreat",
    "introvert",
    "low key",
    "low-key",
    "one-on-one",
    "1:1",
];
const ACTIVATION_TERMS = [
    "energy",
    "energized",
    "charged",
    "alive",
    "buzzing",
    "vibrant",
    "excited",
    "lively",
    "lit",
    "pumped",
    "amped",
    "stimulating",
    "engaging",
];
const DEPLETION_TERMS = [
    "drained",
    "draining",
    "tired",
    "exhausted",
    "overwhelmed",
    "too much",
    "burned",
    "burnt",
    "need space",
    "need some space",
    "tap out",
    "shut down",
    "withdraw",
    "retreat",
];
const INTERPRETATION_SOCIAL_TERMS = [
    "alive",
    "buzzing",
    "dynamic",
    "electric",
    "crowded",
    "interactive",
    "kinetic",
    "social",
    "magnetic",
];
const INTERPRETATION_SOLITUDE_TERMS = [
    "flat",
    "muted",
    "quiet",
    "still",
    "empty",
    "hushed",
    "low",
    "withdrawn",
    "detached",
    "draining",
    "claustrophobic",
];
const ERROR_OVERLOAD_TERMS = [
    "too loud",
    "too many people",
    "no private",
    "no privacy",
    "packed",
    "crowded",
    "everywhere",
    "no space",
    "can't breathe",
    "overstim",
    "over stim",
    "over stimulated",
];
const ERROR_ISOLATION_TERMS = [
    "empty room",
    "no one",
    "nobody",
    "quiet",
    "dead quiet",
    "isolated",
    "lonely",
    "sterile",
    "no energy",
];
const SOCIAL_EXPOSURE_PHRASES = [
    "surrounded by people",
    "be surrounded by people",
    "around people",
    "around everyone",
    "with people",
    "with everyone",
    "with people the whole time",
    "with people all weekend",
    "with people the entire time",
    "with people for the entire weekend",
];
const CONTINUATION_SOCIAL_TERMS = [
    "text",
    "call",
    "meet",
    "hang",
    "meet up",
    "invite",
    "host",
    "keep talking",
    "join",
    "stay out",
    "go back out",
    "walk over",
    "go find",
    "find people",
    "join them",
    "catch up",
];
const CONTINUATION_SOLITUDE_TERMS = [
    "go home",
    "head home",
    "curl up",
    "put on headphones",
    "take a walk alone",
    "sleep",
    "journal",
    "retreat",
    "hide",
    "close the door",
    "find a corner",
    "stay in",
    "go back to my room",
];
const DECISIVE_LANGUAGE_TERMS = [
    "definitely",
    "absolutely",
    "always",
    "never",
    "for sure",
    "without question",
    "no doubt",
    "obviously",
];
const DECISION_SOCIAL_PATTERNS = [
    /(prefer|choose|pick|go with|i'd rather|i would rather).*(people|crowd|friends|group|party|them)/i,
    /(go|head|run) (out|over) (with|to) (people|friends|everyone|them)/i,
    /(text|call|message).*(friend|people|them)/i,
    /(join|meet|stay with) (them|everyone|people|friends)/i,
];
const DECISION_SOLITUDE_PATTERNS = [
    /(prefer|choose|pick|go with|i'd rather|i would rather).*(alone|myself|quiet|privacy|silence)/i,
    /(stay|keep|be) (alone|by myself|to myself|inside)/i,
    /(head|go) home/i,
    /(need|want) (space|quiet|a break)/i,
    /(slip|duck) out/i,
];
const THRESHOLD_TERMS = [
    "hallway",
    "lobby",
    "edge",
    "corner",
    "doorway",
    "threshold",
    "perimeter",
    "outside",
    "side room",
    "side-room",
    "separate room",
    "quiet area",
    "buffer",
    "entry",
    "foyer",
    "stairwell",
    "balcony",
];
const OBSERVATIONAL_SOCIAL_PATTERNS = [
    /there (?:is|are|was|were).*(people|crowd|group)/i,
    /(bunch|lot|lots) of (people|them|crowds?)/i,
    /(people|crowd) (are|were) (talking|chatting|milling)/i,
    /watch(?:ing)? (the )?(people|crowd)/i,
];
const SOCIAL_PARTICIPATION_PATTERNS = [
    /(i|we) (?:walk|head|go|went|move|moved) (?:over|in|toward).*(people|crowd|group|them)/i,
    /(i|we) (?:join|joined|jump|jumped|mix|mixed|mingle|mingled)/i,
    /(talk|talked|chat|chatted|laugh|laughed) (?:with|together)/i,
    /(i|we) (?:would )?(?:start|begin) (?:talking|engaging)/i,
    /(i|we) (?:want|wanted|like) to (?:be|hang) with (?:people|them|friends)/i,
];
const DECOMPRESSION_TERMS = [
    "decompress",
    "recharge",
    "reset",
    "recover",
    "breathe",
    "breathing room",
    "quiet",
    "space",
    "rest",
    "calm",
    "cool down",
    "unwind",
    "low-key",
    "low key",
    "relax",
];
const SOCIAL_REJECTION_PATTERNS = [
    /\bnone\b/i,
    /\bno (?:one|people|company|crowd)\b/i,
    /\bnobody\b/i,
    /(?:skip|pass) (?:the )?(?:people|crowd)/i,
    /(?:just|only) (?:me|myself)/i,
];
const SOCIAL_DESIRE_PATTERNS = [
    /(want|need|love|like).*(people|company|friends|crowd)/i,
    /(would|will) (?:invite|bring|text|call) (?:friends|people|them)/i,
    /(need|want) (?:to be|being) around (?:others|people|everyone)/i,
];
const DETACHED_SCENE_PATTERNS = [
    /it (?:just|simply) (?:looks|seems|feels)/i,
    /it's (?:just|only) (?:a|the)? (?:scene|room)/i,
    /(i'm|i was) just (?:watching|observing)/i,
    /there's? just/i,
];
const FREE_RECALL_SOCIAL_TARGETS = [
    "restless",
    "starved",
    "isolated",
    "cooped-up",
    "antsy",
];
const FREE_RECALL_SOLITARY_TARGETS = [
    "taxed",
    "burdened",
    "overstimulated",
    "crowded",
    "frazzled",
];
const FREE_RECALL_ALL_TARGETS = [
    ...FREE_RECALL_SOCIAL_TARGETS,
    ...FREE_RECALL_SOLITARY_TARGETS,
];
function makeTargetPatterns(target) {
    switch (target) {
        case "cooped-up":
            return [/\bcooped[- ]?up\b/i];
        case "overstimulated":
            return [/\bover\s?stimulated\b/i];
        default:
            return [new RegExp(`\\b${target.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i")];
    }
}
function targetCategory(target) {
    return FREE_RECALL_SOCIAL_TARGETS.includes(target) ? "social" : "solitary";
}
function collectFreeRecallMatches(text) {
    const normalized = (text || "")
        .toLowerCase()
        .replace(/[\n\r]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!normalized)
        return [];
    const seen = new Set();
    const matchesWithIndex = [];
    for (const target of FREE_RECALL_ALL_TARGETS) {
        if (seen.has(target))
            continue;
        const patterns = makeTargetPatterns(target);
        let earliestIndex = Number.POSITIVE_INFINITY;
        for (const pattern of patterns) {
            const match = normalized.match(pattern);
            if (!match || typeof match.index !== "number")
                continue;
            if (match.index < earliestIndex)
                earliestIndex = match.index;
        }
        if (!Number.isFinite(earliestIndex))
            continue;
        seen.add(target);
        matchesWithIndex.push({
            target,
            category: targetCategory(target),
            position: 0,
            index: earliestIndex,
        });
    }
    matchesWithIndex.sort((a, b) => a.index - b.index);
    return matchesWithIndex.map(({ target, category }, idx) => ({
        target,
        category,
        position: idx + 1,
    }));
}
function countCategory(matches, category) {
    return matches.filter((match) => match.category === category).length;
}
function countCategoryInFirstN(matches, category, n) {
    return matches.slice(0, n).filter((match) => match.category === category).length;
}
function clusteringIndex(matches) {
    if (matches.length < 2)
        return 0;
    let sameCategoryPairs = 0;
    for (let i = 1; i < matches.length; i += 1) {
        if (matches[i]?.category === matches[i - 1]?.category)
            sameCategoryPairs += 1;
    }
    return sameCategoryPairs / (matches.length - 1);
}
export function scoreEnergyDirectionByPromptType(transcript, promptType) {
    switch (promptType) {
        case "freeRecall":
            return scoreEnergyDirectionFreeRecall(transcript);
        case "openInterpretation":
            return scoreEnergyDirectionOpenInterpretation(transcript);
        case "microDecision":
            return scoreEnergyDirectionMicroDecision(transcript);
        case "derailmentRecognition":
            return scoreEnergyDirectionErrorDetection(transcript);
        case "projectionContinuation":
            return scoreEnergyDirectionProjectionContinuation(transcript);
        default:
            return buildEnergyDirectionScore(0.5, 0.25, []);
    }
}
function scoreEnergyDirectionFreeRecall(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();
    const matches = collectFreeRecallMatches(primary);
    const socialHits = countCategory(matches, "social");
    const solitaryHits = countCategory(matches, "solitary");
    const totalHits = matches.length;
    const firstHit = matches[0] || null;
    const earlySocialHits = countCategoryInFirstN(matches, "social", 3);
    const earlySolitaryHits = countCategoryInFirstN(matches, "solitary", 3);
    const directionBias = socialHits - solitaryHits;
    const earlyBias = earlySocialHits - earlySolitaryHits;
    const clusterRatio = clusteringIndex(matches);
    const sameCategoryPairs = Math.max(0, Math.round(clusterRatio * Math.max(0, matches.length - 1)));
    let score = 0.5;
    score += directionBias * 0.07;
    score += earlyBias * 0.04;
    score += (clusterRatio - 0.5) * 0.04;
    if (firstHit?.category === "social")
        score += 0.04;
    if (firstHit?.category === "solitary")
        score -= 0.04;
    if (totalHits === 0)
        score = 0.5;
    const cues = [];
    if (socialHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.freeRecall.social_target_hits",
            weight: socialHits * 0.07,
            text: `recalls ${socialHits} social target term${socialHits === 1 ? "" : "s"}`,
        });
    }
    if (solitaryHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.freeRecall.solitary_target_hits",
            weight: solitaryHits * -0.07,
            text: `recalls ${solitaryHits} solitary target term${solitaryHits === 1 ? "" : "s"}`,
        });
    }
    if (firstHit) {
        cues.push({
            kind: "semantic",
            featureId: firstHit.category === "social"
                ? "IE.energyDirection.freeRecall.first_hit_social"
                : "IE.energyDirection.freeRecall.first_hit_solitary",
            weight: firstHit.category === "social" ? 0.04 : -0.04,
            text: firstHit.category === "social"
                ? `first recalled target is social (${firstHit.target})`
                : `first recalled target is solitary (${firstHit.target})`,
        });
    }
    if (earlyBias !== 0) {
        cues.push({
            kind: "semantic",
            featureId: earlyBias > 0
                ? "IE.energyDirection.freeRecall.early_social_bias"
                : "IE.energyDirection.freeRecall.early_solitary_bias",
            weight: earlyBias * 0.04,
            text: earlyBias > 0
                ? "first three recalls lean social"
                : "first three recalls lean solitary",
        });
    }
    if (sameCategoryPairs > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.freeRecall.category_clustering",
            weight: (clusterRatio - 0.5) * 0.04,
            text: "recall sequence clusters by category",
        });
    }
    if (totalHits === 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.freeRecall.no_target_recall",
            weight: 0,
            text: "no card target terms were recalled",
        });
    }
    const totalSignals = totalHits + (firstHit ? 1 : 0) + Math.abs(earlyBias) + sameCategoryPairs;
    const confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.26, 0.05);
    return buildEnergyDirectionScore(score, confidence, cues);
}
function scoreEnergyDirectionOpenInterpretation(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();
    const socialTone = countMatches(primary, INTERPRETATION_SOCIAL_TERMS) + countMatches(primary, SOCIAL_REFERENCE_TERMS);
    const solitudeTone = countMatches(primary, INTERPRETATION_SOLITUDE_TERMS) + countMatches(primary, SOLITUDE_REFERENCE_TERMS);
    const relationLens = countMatches(primary, [
        "connection",
        "interact",
        "engage",
        "with others",
    ]);
    const detachedSceneHits = countRegexHits(primary, DETACHED_SCENE_PATTERNS);
    let score = 0.5;
    score += (socialTone - solitudeTone) * 0.07;
    score += relationLens * 0.03;
    score -= detachedSceneHits * 0.05;
    const cues = [];
    if (socialTone > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.openInterpretation.social_vibe",
            weight: +0.07 * socialTone,
            text: "interprets scene through social energy",
        });
    }
    if (solitudeTone > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.openInterpretation.solitude_vibe",
            weight: -0.07 * solitudeTone,
            text: "interprets scene through solitude/withdrawal",
        });
    }
    if (relationLens > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.openInterpretation.relational_focus",
            weight: +0.03 * relationLens,
            text: "explicit relational framing",
        });
    }
    if (detachedSceneHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.openInterpretation.detached_scene_description",
            weight: -0.05 * detachedSceneHits,
            text: "describes the scene at arm's length / observationally",
        });
    }
    const totalSignals = socialTone + solitudeTone + relationLens + detachedSceneHits;
    const confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.27, 0.05);
    return buildEnergyDirectionScore(score, confidence, cues);
}
function scoreEnergyDirectionMicroDecision(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();
    const socialChoiceHits = countRegexHits(primary, DECISION_SOCIAL_PATTERNS);
    const solitudeChoiceHits = countRegexHits(primary, DECISION_SOLITUDE_PATTERNS);
    const decisiveHits = countMatches(primary, DECISIVE_LANGUAGE_TERMS);
    const rejectPeopleHits = countRegexHits(primary, SOCIAL_REJECTION_PATTERNS);
    const decompressionHits = countMatches(primary, DECOMPRESSION_TERMS);
    const socialDesireHits = countRegexHits(primary, SOCIAL_DESIRE_PATTERNS);
    let score = 0.5;
    score += (socialChoiceHits - solitudeChoiceHits) * 0.18;
    score -= rejectPeopleHits * 0.2;
    score -= decompressionHits * 0.12;
    score += socialDesireHits * 0.12;
    const cues = [];
    if (socialChoiceHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.microDecision.choice_social",
            weight: +0.18 * socialChoiceHits,
            text: "explicitly chooses people/interaction",
        });
    }
    if (solitudeChoiceHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.microDecision.solitude_preference",
            weight: -0.18 * solitudeChoiceHits,
            text: "explicitly chooses solitude/space",
        });
    }
    if (rejectPeopleHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.microDecision.explicit_social_rejection",
            weight: -0.2 * rejectPeopleHits,
            text: "rejects people/company (none/no one)",
        });
    }
    if (decompressionHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.microDecision.decompression_language",
            weight: -0.12 * decompressionHits,
            text: "frames choice as decompression / recharge",
        });
    }
    if (socialDesireHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.microDecision.interaction_seeking_language",
            weight: +0.12 * socialDesireHits,
            text: "wants company / people for energy",
        });
    }
    if (decisiveHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "stance.decisive_language",
            weight: 0,
            text: "decisive / committal language (confidence boost)",
        });
    }
    const totalSignals = socialChoiceHits + solitudeChoiceHits + rejectPeopleHits + decompressionHits + socialDesireHits;
    let confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.33, 0.07);
    confidence = clamp01(confidence + Math.min(0.12, decisiveHits * 0.025));
    return buildEnergyDirectionScore(score, confidence, cues);
}
function scoreEnergyDirectionErrorDetection(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();
    const overloadHits = countMatches(primary, ERROR_OVERLOAD_TERMS);
    const isolationHits = countMatches(primary, ERROR_ISOLATION_TERMS);
    const boundaryHits = countMatches(primary, SOLITUDE_REFERENCE_TERMS);
    const exposureSummary = effectiveHits(primary, SOCIAL_EXPOSURE_PHRASES);
    const negatedExposureHits = exposureSummary.negatedHits;
    let score = 0.5;
    score += (isolationHits - overloadHits) * 0.12;
    score -= boundaryHits * 0.02;
    score -= negatedExposureHits * 0.12;
    const cues = [];
    if (overloadHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.derailmentRecognition.crowd_overload_language",
            weight: -0.12 * overloadHits,
            text: "flags overstimulation / too much crowd",
        });
    }
    if (isolationHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.derailmentRecognition.interaction_gap_language",
            weight: +0.12 * isolationHits,
            text: "flags lack of connection / empty scene",
        });
    }
    if (boundaryHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.derailmentRecognition.boundary_need_language",
            weight: -0.02 * boundaryHits,
            text: "calls out privacy/boundary gap",
        });
    }
    if (negatedExposureHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.derailmentRecognition.negated_social_exposure",
            weight: -0.12 * negatedExposureHits,
            text: "rejects sustained people exposure",
        });
    }
    const totalSignals = overloadHits + isolationHits + boundaryHits + negatedExposureHits;
    const confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.30, 0.06);
    return buildEnergyDirectionScore(score, confidence, cues);
}
function scoreEnergyDirectionProjectionContinuation(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();
    const socialFutureHits = countMatches(primary, CONTINUATION_SOCIAL_TERMS);
    const solitudeFutureHits = countMatches(primary, CONTINUATION_SOLITUDE_TERMS);
    const activationHits = countMatches(primary, ACTIVATION_TERMS);
    const depletionHits = countMatches(primary, DEPLETION_TERMS);
    let score = 0.5;
    score += (socialFutureHits - solitudeFutureHits) * 0.15;
    score += (activationHits - depletionHits) * 0.04;
    const cues = [];
    if (socialFutureHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.projection.interaction_seeking_language",
            weight: +0.15 * socialFutureHits,
            text: "projects next steps toward people/interaction",
        });
    }
    if (solitudeFutureHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.energyDirection.projection.private_restoration_framing",
            weight: -0.15 * solitudeFutureHits,
            text: "projects next steps toward solitude/retreat",
        });
    }
    if (activationHits > 0 || depletionHits > 0) {
        const activationWeight = (activationHits - depletionHits) * 0.04;
        cues.push({
            kind: "semantic",
            featureId: activationWeight >= 0
                ? "IE.energyDirection.projection.momentum_language"
                : "IE.energyDirection.projection.depletion_language",
            weight: activationWeight,
            text: activationWeight >= 0 ? "wants to keep external energy going" : "wants to downshift",
        });
    }
    const totalSignals = socialFutureHits + solitudeFutureHits + activationHits + depletionHits;
    const confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.32, 0.06);
    return buildEnergyDirectionScore(score, confidence, cues);
}
function buildEnergyDirectionScore(score, confidence, cues) {
    return {
        subAxisId: "energyDirection",
        score01: clamp01(score),
        confidence01: clamp01(confidence),
        cues,
    };
}
function energyConfidence(totalSignalHits, multiplier, base = 0.25, perSignal = 0.05) {
    const raw = base + Math.min(0.45, totalSignalHits * perSignal);
    return clamp01(raw * multiplier);
}
