import { analyzeTextForScoring } from "../utils.js";
import { clamp01 } from "./shared.js";
const FREE_RECALL_SOCIAL_TARGETS = [
    "deadened",
    "lifeless",
    "flattened",
    "sealed",
    "closed-off",
];
const FREE_RECALL_SOLITARY_TARGETS = [
    "stalled",
    "dragging",
    "wasteful",
    "bogged-down",
    "lingering",
];
const FREE_RECALL_ALL_TARGETS = [
    ...FREE_RECALL_SOCIAL_TARGETS,
    ...FREE_RECALL_SOLITARY_TARGETS,
];
function makeTargetPatterns(target) {
    switch (target) {
        case "stalled":
            return [/\bstall(?:ed|s|ing)?\b/i];
        case "dragging":
            return [/\bdrag(?:ging|ged|s)?\b/i];
        case "bogged-down":
            return [/\bbogged[- ]down\b/i];
        case "lingering":
            return [/\bling(?:er|ering|ered|ers)\b/i];
        case "deadened":
            return [/\bdeaden(?:ed|ing|s)?\b/i];
        case "flattened":
            return [/\bflatten(?:ed|ing|s)?\b/i];
        case "sealed":
            return [/\bseal(?:ed|ing|s)?\b/i];
        case "closed-off":
            return [/\bclosed[- ]off\b/i];
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
    const seen = new Set();
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
export function scoreCompletionRelationshipByPromptType(transcript, promptType) {
    switch (promptType) {
        case "freeRecall":
            return scoreCompletionRelationshipFreeRecall(transcript);
        case "openInterpretation":
        case "microDecision":
        case "derailmentRecognition":
        case "projectionContinuation":
        default:
            return scoreCompletionRelationshipNeutral();
    }
}
function scoreCompletionRelationshipFreeRecall(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();
    const matches = collectFreeRecallMatches(primary);
    const socialHits = countCategory(matches, "social");
    const solitaryHits = countCategory(matches, "solitary");
    const totalHits = matches.length;
    const firstHit = matches[0] ?? null;
    const earlySocialHits = countCategoryInFirstN(matches, "social", 3);
    const earlySolitaryHits = countCategoryInFirstN(matches, "solitary", 3);
    const earlyBias = earlySocialHits - earlySolitaryHits;
    const directionBias = socialHits - solitaryHits;
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
            featureId: "JP.completionRelationship.freeRecall.social_target_hits",
            weight: socialHits * 0.07,
            text: `recalls ${socialHits} P-coded target term${socialHits === 1 ? "" : "s"}`,
        });
    }
    if (solitaryHits > 0) {
        cues.push({
            kind: "semantic",
            featureId: "JP.completionRelationship.freeRecall.solitary_target_hits",
            weight: solitaryHits * -0.07,
            text: `recalls ${solitaryHits} J-coded target term${solitaryHits === 1 ? "" : "s"}`,
        });
    }
    if (firstHit) {
        cues.push({
            kind: "semantic",
            featureId: firstHit.category === "social"
                ? "JP.completionRelationship.freeRecall.first_hit_social"
                : "JP.completionRelationship.freeRecall.first_hit_solitary",
            weight: firstHit.category === "social" ? 0.04 : -0.04,
            text: firstHit.category === "social"
                ? `first recalled target is P-coded (${firstHit.target})`
                : `first recalled target is J-coded (${firstHit.target})`,
        });
    }
    if (earlyBias !== 0) {
        cues.push({
            kind: "semantic",
            featureId: earlyBias > 0
                ? "JP.completionRelationship.freeRecall.early_social_bias"
                : "JP.completionRelationship.freeRecall.early_solitary_bias",
            weight: earlyBias * 0.04,
            text: earlyBias > 0 ? "first three recalls lean P" : "first three recalls lean J",
        });
    }
    if (sameCategoryPairs > 0) {
        cues.push({
            kind: "semantic",
            featureId: "JP.completionRelationship.freeRecall.category_clustering",
            weight: (clusterRatio - 0.5) * 0.04,
            text: "recall sequence clusters by category",
        });
    }
    if (totalHits === 0) {
        cues.push({
            kind: "semantic",
            featureId: "JP.completionRelationship.freeRecall.no_target_recall",
            weight: 0,
            text: "no card target terms were recalled",
        });
    }
    const totalSignals = totalHits + (firstHit ? 1 : 0) + Math.abs(earlyBias) + sameCategoryPairs;
    const confidence = completionRelationshipConfidence(totalSignals, analysis.confidenceMultiplier, 0.26, 0.05);
    return buildCompletionRelationshipScore(score, confidence, cues);
}
function scoreCompletionRelationshipNeutral() {
    return buildCompletionRelationshipScore(0.5, 0.25, []);
}
function completionRelationshipConfidence(totalSignals, multiplier, base = 0.26, step = 0.05) {
    return clamp01((base + Math.min(0.45, totalSignals * step)) * multiplier);
}
function buildCompletionRelationshipScore(score, confidence, cues) {
    return {
        subAxisId: "completionRelationship",
        score01: clamp01(score),
        confidence01: clamp01(confidence),
        cues,
    };
}
