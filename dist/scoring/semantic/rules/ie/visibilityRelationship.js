import { analyzeTextForScoring } from "../utils.js";
import { clamp01 } from "./shared.js";
const FREE_RECALL_SOCIAL_TARGETS = [
    "invisible",
    "overlooked",
    "sidelined",
    "erased",
    "ignored",
];
const FREE_RECALL_SOLITARY_TARGETS = [
    "exposed",
    "scrutinized",
    "spotlit",
    "vulnerable",
    "watched",
];
const FREE_RECALL_ALL_TARGETS = [
    ...FREE_RECALL_SOCIAL_TARGETS,
    ...FREE_RECALL_SOLITARY_TARGETS,
];
function makeTargetPatterns(target) {
    switch (target) {
        case "scrutinized":
            return [/\bscrutiniz(?:ed|e|es|ing|ation)\b/i];
        case "watched":
            return [/\bwatch(?:ed|es|ing)\b/i];
        case "overlooked":
            return [/\boverlook(?:ed|s|ing)\b/i];
        case "sidelined":
            return [/\bsidelin(?:ed|es|ing|e)\b/i];
        case "erased":
            return [/\beras(?:ed|es|ing|e)\b/i];
        case "ignored":
            return [/\bignor(?:ed|es|ing|e)\b/i];
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
    const matchesWithIndex = [];
    for (const target of FREE_RECALL_ALL_TARGETS) {
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
function visibilityConfidence(totalSignals, multiplier, base = 0.26, step = 0.05) {
    return clamp01((base + Math.min(0.45, totalSignals * step)) * multiplier);
}
export function scoreVisibilityRelationshipByPromptType(transcript, promptType) {
    switch (promptType) {
        case "freeRecall":
            return scoreVisibilityRelationshipFreeRecall(transcript);
        default:
            return scoreVisibilityRelationshipNeutral();
    }
}
function scoreVisibilityRelationshipFreeRecall(transcriptRaw) {
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
            featureId: "IE.visibilityRelationship.freeRecall.social_target_hits",
            weight: socialHits * 0.07,
            text: `recalls ${socialHits} social target term${socialHits === 1 ? "" : "s"}`,
        });
    }
    if (solitaryHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.visibilityRelationship.freeRecall.solitary_target_hits",
            weight: solitaryHits * -0.07,
            text: `recalls ${solitaryHits} solitary target term${solitaryHits === 1 ? "" : "s"}`,
        });
    }
    if (firstHit) {
        cues.push({
            kind: "semantic",
            featureId: firstHit.category === "social"
                ? "IE.visibilityRelationship.freeRecall.first_hit_social"
                : "IE.visibilityRelationship.freeRecall.first_hit_solitary",
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
                ? "IE.visibilityRelationship.freeRecall.early_social_bias"
                : "IE.visibilityRelationship.freeRecall.early_solitary_bias",
            weight: earlyBias * 0.04,
            text: earlyBias > 0
                ? "first three recalls lean social"
                : "first three recalls lean solitary",
        });
    }
    if (sameCategoryPairs > 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.visibilityRelationship.freeRecall.category_clustering",
            weight: (clusterRatio - 0.5) * 0.04,
            text: "recall sequence clusters by category",
        });
    }
    if (totalHits === 0) {
        cues.push({
            kind: "semantic",
            featureId: "IE.visibilityRelationship.freeRecall.no_target_recall",
            weight: 0,
            text: "no card target terms were recalled",
        });
    }
    const totalSignals = totalHits + (firstHit ? 1 : 0) + Math.abs(earlyBias) + sameCategoryPairs;
    const confidence = visibilityConfidence(totalSignals, analysis.confidenceMultiplier, 0.26, 0.05);
    return buildVisibilityRelationshipScore(score, confidence, cues);
}
function scoreVisibilityRelationshipNeutral() {
    return buildVisibilityRelationshipScore(0.5, 0.25, []);
}
function buildVisibilityRelationshipScore(score, confidence, cues) {
    return {
        subAxisId: "visibilityRelationship",
        score01: clamp01(score),
        confidence01: clamp01(confidence),
        cues,
    };
}
