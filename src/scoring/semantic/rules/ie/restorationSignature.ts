import type { PromptType } from "../../../../domain/types.js";
import type { SubAxisScore } from "../../../types.js";
import { analyzeTextForScoring } from "../utils.js";
import { clamp01 } from "./shared.js";

const FREE_RECALL_SOCIAL_TARGETS = [
  "stranded",
  "marooned",
  "abandoned",
  "deserted",
  "adrift",
] as const;

const FREE_RECALL_SOLITARY_TARGETS = [
  "crowded",
  "disrupted",
  "intruded",
  "unsettled",
  "agitated",
] as const;

const FREE_RECALL_ALL_TARGETS = [
  ...FREE_RECALL_SOCIAL_TARGETS,
  ...FREE_RECALL_SOLITARY_TARGETS,
] as const;

type FreeRecallCategory = "social" | "solitary";

type FreeRecallMatch = {
  target: (typeof FREE_RECALL_ALL_TARGETS)[number];
  category: FreeRecallCategory;
  position: number;
};

function makeTargetPatterns(target: string): RegExp[] {
  switch (target) {
    case "disrupted":
      return [/\bdisrupt(?:ed|ing|s)?\b/i];
    case "intruded":
      return [/\bintrud(?:ed|ing|es|e)\b/i];
    case "agitated":
      return [/\bagitat(?:ed|ing|es|e|ion)\b/i];
    default:
      return [new RegExp(`\\b${target.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i")];
  }
}

function targetCategory(target: (typeof FREE_RECALL_ALL_TARGETS)[number]): FreeRecallCategory {
  return FREE_RECALL_SOCIAL_TARGETS.includes(target as any) ? "social" : "solitary";
}

function collectFreeRecallMatches(text: string): FreeRecallMatch[] {
  const normalized = (text || "")
    .toLowerCase()
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  const matchesWithIndex: Array<FreeRecallMatch & { index: number }> = [];

  for (const target of FREE_RECALL_ALL_TARGETS) {
    const patterns = makeTargetPatterns(target);

    let earliestIndex = Number.POSITIVE_INFINITY;
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (!match || typeof match.index !== "number") continue;
      if (match.index < earliestIndex) earliestIndex = match.index;
    }

    if (!Number.isFinite(earliestIndex)) continue;

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

function countCategory(matches: FreeRecallMatch[], category: FreeRecallCategory): number {
  return matches.filter((match) => match.category === category).length;
}

function countCategoryInFirstN(
  matches: FreeRecallMatch[],
  category: FreeRecallCategory,
  n: number,
): number {
  return matches.slice(0, n).filter((match) => match.category === category).length;
}

function clusteringIndex(matches: FreeRecallMatch[]): number {
  if (matches.length < 2) return 0;
  let sameCategoryPairs = 0;
  for (let i = 1; i < matches.length; i += 1) {
    if (matches[i]?.category === matches[i - 1]?.category) sameCategoryPairs += 1;
  }
  return sameCategoryPairs / (matches.length - 1);
}

function restorationConfidence(
  totalSignals: number,
  multiplier: number,
  base = 0.26,
  step = 0.05,
): number {
  return clamp01((base + Math.min(0.45, totalSignals * step)) * multiplier);
}

export function scoreRestorationSignatureByPromptType(
  transcript: string,
  promptType?: PromptType,
): SubAxisScore {
  switch (promptType) {
    case "freeRecall":
      return scoreRestorationSignatureFreeRecall(transcript);
    default:
      return scoreRestorationSignatureNeutral();
  }
}

function scoreRestorationSignatureFreeRecall(transcriptRaw: string): SubAxisScore {
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
  if (firstHit?.category === "social") score += 0.04;
  if (firstHit?.category === "solitary") score -= 0.04;
  if (totalHits === 0) score = 0.5;

  const cues: any[] = [];
  if (socialHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.restorationSignature.freeRecall.social_target_hits",
      weight: socialHits * 0.07,
      text: `recalls ${socialHits} social target term${socialHits === 1 ? "" : "s"}`,
    });
  }
  if (solitaryHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.restorationSignature.freeRecall.solitary_target_hits",
      weight: solitaryHits * -0.07,
      text: `recalls ${solitaryHits} solitary target term${solitaryHits === 1 ? "" : "s"}`,
    });
  }
  if (firstHit) {
    cues.push({
      kind: "semantic",
      featureId:
        firstHit.category === "social"
          ? "IE.restorationSignature.freeRecall.first_hit_social"
          : "IE.restorationSignature.freeRecall.first_hit_solitary",
      weight: firstHit.category === "social" ? 0.04 : -0.04,
      text:
        firstHit.category === "social"
          ? `first recalled target is social (${firstHit.target})`
          : `first recalled target is solitary (${firstHit.target})`,
    });
  }
  if (earlyBias !== 0) {
    cues.push({
      kind: "semantic",
      featureId:
        earlyBias > 0
          ? "IE.restorationSignature.freeRecall.early_social_bias"
          : "IE.restorationSignature.freeRecall.early_solitary_bias",
      weight: earlyBias * 0.04,
      text:
        earlyBias > 0
          ? "first three recalls lean social"
          : "first three recalls lean solitary",
    });
  }
  if (sameCategoryPairs > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.restorationSignature.freeRecall.category_clustering",
      weight: (clusterRatio - 0.5) * 0.04,
      text: "recall sequence clusters by category",
    });
  }
  if (totalHits === 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.restorationSignature.freeRecall.no_target_recall",
      weight: 0,
      text: "no card target terms were recalled",
    });
  }

  const totalSignals = totalHits + (firstHit ? 1 : 0) + Math.abs(earlyBias) + sameCategoryPairs;
  const confidence = restorationConfidence(totalSignals, analysis.confidenceMultiplier, 0.26, 0.05);

  return buildRestorationSignatureScore(score, confidence, cues);
}

function scoreRestorationSignatureNeutral(): SubAxisScore {
  return buildRestorationSignatureScore(0.5, 0.25, []);
}

function buildRestorationSignatureScore(score: number, confidence: number, cues: any[]): SubAxisScore {
  return {
    subAxisId: "restorationSignature",
    score01: clamp01(score),
    confidence01: clamp01(confidence),
    cues,
  };
}
