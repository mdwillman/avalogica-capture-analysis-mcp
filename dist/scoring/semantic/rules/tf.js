import { analyzeTextForScoring } from "./utils.js";
import { effectiveHits } from "../operators/index.js";
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
/**
 * TF Sub-axis 1: Feedback aim (VIOLATION vs MOTIVE/RELATIONAL MEANING)
 *
 * Low (T, score01->0): registers the violation first (lie/breach/line-crossed, integrity, “it’s still wrong”)
 * High (F, score01->1): registers motive/relational meaning first (care/protection/brutal love, compassion, “why they did it”)
 *
 * Anchor upgrade:
 * - Exact / near-exact anchor phrase matches get “strong evidence” weighting.
 * - Strong evidence shifts score more and boosts confidence more than generic lexicon hits.
 *
 * Reminder: TF mapping is low=T, high=F.
 */
export function scoreTFEvaluationReflex(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const t = (analysis.primaryText || "").toLowerCase();
    // -----------------------------
    // Strong anchors (high precision)
    // -----------------------------
    // TF.1A: “What registers first — that they lied, or that they cared enough to?”
    // TF.1B: “... lands — as a betrayal, or as brutal love?”
    // TF.1C: “... hit you — as a theft ... or as ... courage?”
    //
    // We treat exact/near-exact echoes of these anchor clauses as strong evidence.
    // F-leaning anchor phrases (motive / care / relational meaning)
    const strongFAnchors = [
        // 1A motive side
        "that they cared enough",
        "they cared enough",
        "cared enough to",
        "they were trying to protect",
        "trying to protect",
        "protect someone's feelings",
        "protect their feelings",
        "protecting feelings",
        // 1B motive side
        "brutal love",
        "tough love",
        "did it to help me grow",
        "did it to force me to grow",
        "force you to grow",
        "help you grow",
        // 1C motive side
        "the loneliest kind of courage",
        "loneliest kind of courage",
        "lonely courage",
        "an act of protection",
        "protecting everyone",
        "protecting others",
        "carrying it alone",
        "they chose to carry it alone",
    ];
    // T-leaning anchor phrases (violation / integrity / theft)
    const strongTAnchors = [
        // 1A violation side
        "that they lied",
        "they lied",
        "it's still a lie",
        "still a lie",
        "they still lied",
        // 1B violation side
        "a betrayal",
        "betrayal",
        "used it against me",
        "used it against you",
        "weaponized",
        "weaponised",
        "broke my trust",
        "broke trust",
        // 1C violation side
        "a theft",
        "theft",
        "stole our chance",
        "stole everyone's chance",
        "denied everyone",
        "took away our chance to show up",
        "took away everyone's chance to show up",
        "people deserved the truth",
    ];
    // -----------------------------
    // Generic lexicon (lower precision)
    // -----------------------------
    // T-leaning evidence: violation / integrity / boundary / principle
    const violation = [
        "lie",
        "lied",
        "lying",
        "dishonest",
        "dishonesty",
        "false",
        "untrue",
        "integrity",
        "principle",
        "principles",
        "violation",
        "breach",
        "broke",
        "broken",
        "contract",
        "line crossed",
        "crossed a line",
        "boundary",
        "boundaries",
        "wrong",
        "not okay",
        "unacceptable",
        "accountable",
        "accountability",
        "consequence",
        "consequences",
        "betray",
        "betrayed",
        "betrayal",
        "used against",
        "weaponize",
        "weaponized",
        "stole",
        "theft",
        "denied",
        "took away",
    ];
    // F-leaning evidence: motive / care / protection / compassion / relational meaning
    const motive = [
        "motive",
        "intention",
        "intent",
        "meant well",
        "they meant well",
        "trying to help",
        "trying to protect",
        "protect",
        "protection",
        "care",
        "cared",
        "caring",
        "compassion",
        "empathy",
        "empathetic",
        "loyal",
        "loyalty",
        "love",
        "brutal love",
        "tough love",
        "relationship",
        "relationships",
        "bond",
        "repair",
        "rebuild",
        "forgive",
        "forgiveness",
        "show up",
        "they were scared",
        "fear",
        "lonely",
        "alone",
        "carrying it",
        "carrying it alone",
        "courage",
        "protecting feelings",
    ];
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "prefer",
        "rather",
        "choose",
        "pick",
        "i tend to",
        "usually",
        "for me",
        "what hits me",
        "what registers",
        "it lands as",
        "it feels like",
    ];
    const hasChoice = choice.some((c) => t.includes(c));
    // -----------------------------
    // Hit counting (negation-aware)
    // -----------------------------
    const strongFSummary = effectiveHits(t, strongFAnchors);
    const strongTSummary = effectiveHits(t, strongTAnchors);
    const strongFEffective = strongFSummary.effectiveHits;
    const strongFNegated = strongFSummary.negatedHits;
    const strongTEffective = strongTSummary.effectiveHits;
    const strongTNegated = strongTSummary.negatedHits;
    const vSummary = effectiveHits(t, violation);
    const mSummary = effectiveHits(t, motive);
    const effectiveV = vSummary.effectiveHits;
    const negatedV = vSummary.negatedHits;
    const effectiveM = mSummary.effectiveHits;
    const negatedM = mSummary.negatedHits;
    // -----------------------------
    // Evidence aggregation
    // -----------------------------
    // Strong anchors count heavier than generic hits.
    const anchorMultiplier = 2.5;
    const tEvidence = effectiveV +
        negatedM +
        strongTEffective * anchorMultiplier +
        strongFNegated * anchorMultiplier;
    const fEvidence = effectiveM +
        negatedV +
        strongFEffective * anchorMultiplier +
        strongTNegated * anchorMultiplier;
    const rawDir = fEvidence - tEvidence;
    // -----------------------------
    // Score
    // -----------------------------
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    const anyStrongAnchor = strongFEffective + strongTEffective + strongFNegated + strongTNegated > 0;
    if (anyStrongAnchor)
        delta *= 1.25;
    if (hasChoice)
        delta *= 1.1;
    score01 = clamp01(score01 + delta);
    // -----------------------------
    // Confidence
    // -----------------------------
    const directional = Math.abs(rawDir);
    let confidence01 = 0.18;
    // Generic coverage
    confidence01 += Math.min(0.32, (effectiveV + effectiveM + negatedV + negatedM) * 0.08);
    // Strong anchors
    confidence01 += Math.min(0.30, (strongFEffective + strongTEffective + strongFNegated + strongTNegated) * 0.18);
    confidence01 += Math.min(0.24, directional * 0.08);
    confidence01 += hasChoice ? 0.08 : 0;
    confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);
    // -----------------------------
    // Cues
    // -----------------------------
    const cues = [];
    if (strongFEffective > 0 || strongTNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.evaluationReflex.anchor_motive_or_care",
            weight: +0.16 * (strongFEffective + strongTNegated),
            text: "anchor echo: motive/care (F)",
        });
    }
    if (strongTEffective > 0 || strongFNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.evaluationReflex.anchor_violation_or_betrayal",
            weight: -0.16 * (strongTEffective + strongFNegated),
            text: "anchor echo: violation/betrayal (T)",
        });
    }
    if (effectiveM + negatedV > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.evaluationReflex.motive_or_relational_meaning",
            weight: +0.08 * (effectiveM + negatedV),
            text: "motive/care/relational-meaning terms (F)",
        });
    }
    if (effectiveV + negatedM > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.evaluationReflex.violation_or_integrity",
            weight: -0.08 * (effectiveV + negatedM),
            text: "violation/integrity/boundary terms (T)",
        });
    }
    if (hasChoice) {
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    }
    if (analysis.contrast.hasContrast) {
        cues.push({
            kind: "semantic",
            featureId: "operator.contrast_pivot",
            weight: 0,
            text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
        });
    }
    return { score01, confidence01, cues };
}
/**
 * TF Sub-axis 2: Fairness frame (UNIVERSAL STANDARD vs CONTEXTUAL ADAPTATION)
 *
 * Low (T, score01->0): universal standard / equal rules / consistency / impartiality
 * High (F, score01->1): context / needs / equity / compassionate adaptation
 *
 * Anchor upgrade:
 * - Exact / near-exact anchor phrase matches (from TF.2 prompts) are treated as strong evidence.
 * - Strong evidence shifts score more and boosts confidence more than generic lexicon hits.
 *
 * Reminder: TF mapping is low=T, high=F.
 */
export function scoreTFTruthOrientation(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const t = (analysis.primaryText || "").toLowerCase();
    // -----------------------------
    // Strong anchors (high precision)
    // -----------------------------
    // TF.2A: “What weighs on you more — the unfairness to the team, or what that person is going through?”
    // TF.2B: “... does the honesty redeem anything, or does it just make it worse?”
    // TF.2C: “... should the law hold, or should the context break it?”
    // F-leaning anchor phrases (context/person/needs)
    const strongFAnchors = [
        // 2A person/context side
        "what that person is going through",
        "what they're going through",
        "what they are going through",
        "what she's going through",
        "what he's going through",
        "their life is falling apart",
        "life is falling apart",
        "they're falling apart",
        "they are falling apart",
        // 2C context-breaks-law side
        "the context breaks it",
        "context breaks it",
        "context should break it",
        "should the context break it",
        "the context should break it",
        "context matters more than the law",
        "context matters more",
        "case by case",
        "case-by-case",
        // general “context-over-standard” echoes
        "depends on the situation",
        "depends on the person",
        "depends on their situation",
    ];
    // T-leaning anchor phrases (standard/law/ledger/system impact)
    const strongTAnchors = [
        // 2A team/unfairness side
        "the unfairness to the team",
        "unfairness to the team",
        "the team is carrying them",
        "team is carrying them",
        "it's not fair to the team",
        "not fair to the team",
        // 2C law-holds side
        "the law should hold",
        "should the law hold",
        "law should hold",
        "hold the law",
        "the law has to hold",
        "law has to hold",
        // 2B ledger side
        "doesn't redeem anything",
        "does not redeem anything",
        "redeem anything",
        "makes it worse",
        "just makes it worse",
        "doesn't make it better",
        "does not make it better",
    ];
    // -----------------------------
    // Generic lexicon (lower precision)
    // -----------------------------
    // T-leaning evidence: equal rules / impartial standards / moral ledger / system impact
    const equalRules = [
        "same rule",
        "same rules",
        "equal",
        "equality",
        "treat everyone the same",
        "one standard",
        "universal standard",
        "consistent",
        "consistency",
        "impartial",
        "objective",
        "objectively",
        "standard",
        "standards",
        "policy",
        "policies",
        "procedure",
        "process",
        "due process",
        "by the book",
        "criteria",
        "rubric",
        "merit",
        "merit-based",
        "deserve",
        "earned",
        "accountable",
        "accountability",
        "consequences",
        "fair to everyone",
        "fairness",
        // system/group impact language (esp TF.2A)
        "the team",
        "team",
        "workload",
        "pulling their weight",
        "carrying them",
        "everyone else",
        "burden",
        "resentment",
        "erodes",
        "sets a precedent",
        "precedent",
        // legal/structural language (esp TF.2C)
        "the law",
        "law",
        "rule of law",
        "rules exist for a reason",
        "structure",
        "system",
        // ledger/moral accounting (esp TF.2B)
        "damage",
        "harm",
        "ruined",
        "doesn't fix it",
        "does not fix it",
        "doesn't undo it",
        "does not undo it",
        "can't erase",
        "cannot erase",
        "not redeemed",
        "no redemption",
    ];
    // F-leaning evidence: context / needs / empathy / equity / circumstance
    const equityContext = [
        "it depends",
        "depends",
        "context",
        "in context",
        "circumstances",
        "situation",
        "case by case",
        "case-by-case",
        "needs",
        "need",
        "support",
        "accommodate",
        "accommodation",
        "equity",
        "equitable",
        "compassion",
        "empathy",
        "empathetic",
        "kind",
        "kindness",
        "care",
        "caring",
        "understand",
        "understanding",
        "what they're going through",
        "what they are going through",
        "their life is falling apart",
        "falling apart",
        "grace",
        "second chance",
        "mercy",
        "forgiveness",
        "restorative",
        "restore",
        "make it right",
        // death-as-context language (esp TF.2B)
        "dying",
        "near the end",
        "before the end",
        "at the end",
        "mortality",
        "final moment",
        "last chance",
        "confession means something",
        "it matters that they confessed",
    ];
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "prefer",
        "rather",
        "choose",
        "pick",
        "i tend to",
        "usually",
        "for me",
        "what weighs more",
        "how it sits",
        "it lands as",
        "it feels like",
    ];
    const hasChoice = choice.some((c) => t.includes(c));
    // -----------------------------
    // Hit counting (negation-aware)
    // -----------------------------
    const strongFSummary = effectiveHits(t, strongFAnchors);
    const strongTSummary = effectiveHits(t, strongTAnchors);
    const strongFEffective = strongFSummary.effectiveHits;
    const strongFNegated = strongFSummary.negatedHits;
    const strongTEffective = strongTSummary.effectiveHits;
    const strongTNegated = strongTSummary.negatedHits;
    const rulesSummary = effectiveHits(t, equalRules);
    const equitySummary = effectiveHits(t, equityContext);
    const effectiveRules = rulesSummary.effectiveHits;
    const negatedRules = rulesSummary.negatedHits;
    const effectiveEquity = equitySummary.effectiveHits;
    const negatedEquity = equitySummary.negatedHits;
    // -----------------------------
    // Evidence aggregation
    // -----------------------------
    const anchorMultiplier = 2.5;
    const tEvidence = effectiveRules +
        negatedEquity +
        strongTEffective * anchorMultiplier +
        strongFNegated * anchorMultiplier;
    const fEvidence = effectiveEquity +
        negatedRules +
        strongFEffective * anchorMultiplier +
        strongTNegated * anchorMultiplier;
    const rawDir = fEvidence - tEvidence;
    // -----------------------------
    // Score
    // -----------------------------
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    const anyStrongAnchor = strongFEffective + strongTEffective + strongFNegated + strongTNegated > 0;
    if (anyStrongAnchor)
        delta *= 1.25;
    if (hasChoice)
        delta *= 1.1;
    score01 = clamp01(score01 + delta);
    // -----------------------------
    // Confidence
    // -----------------------------
    const directional = Math.abs(rawDir);
    let confidence01 = 0.18;
    // Generic coverage
    confidence01 += Math.min(0.32, (effectiveRules + effectiveEquity + negatedRules + negatedEquity) * 0.08);
    // Strong anchors
    confidence01 += Math.min(0.30, (strongFEffective + strongTEffective + strongFNegated + strongTNegated) * 0.18);
    confidence01 += Math.min(0.24, directional * 0.08);
    confidence01 += hasChoice ? 0.08 : 0;
    confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);
    // -----------------------------
    // Cues
    // -----------------------------
    const cues = [];
    if (strongFEffective > 0 || strongTNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.truthOrientation.anchor_context_or_person",
            weight: +0.16 * (strongFEffective + strongTNegated),
            text: "anchor echo: context/person (F)",
        });
    }
    if (strongTEffective > 0 || strongFNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.truthOrientation.anchor_law_or_team_or_ledger",
            weight: -0.16 * (strongTEffective + strongFNegated),
            text: "anchor echo: law/team/ledger (T)",
        });
    }
    if (effectiveEquity + negatedRules > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.truthOrientation.context_or_equity",
            weight: +0.08 * (effectiveEquity + negatedRules),
            text: "context/equity/needs terms (F)",
        });
    }
    if (effectiveRules + negatedEquity > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.truthOrientation.equal_rules_or_standards",
            weight: -0.08 * (effectiveRules + negatedEquity),
            text: "equal-rules/standards/ledger terms (T)",
        });
    }
    if (hasChoice) {
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    }
    if (analysis.contrast.hasContrast) {
        cues.push({
            kind: "semantic",
            featureId: "operator.contrast_pivot",
            weight: 0,
            text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
        });
    }
    return { score01, confidence01, cues };
}
/**
 * TF Sub-axis 3: Conflict posture (CORRECTION/TRUTH vs HARM/IMPACT)
 *
 * Low (T, score01->0): moves toward correction/truth despite friction
 * High (F, score01->1): preserves harmony / avoids hurting others / impact-first
 *
 * Anchor upgrade:
 * - Exact / near-exact anchor phrase matches (from TF.3 prompts) are treated as strong evidence.
 * - Strong evidence shifts score more and boosts confidence more than generic lexicon hits.
 *
 * Reminder: TF mapping is low=T, high=F.
 */
export function scoreTFDecisionSubstrate(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const t = (analysis.primaryText || "").toLowerCase();
    // -----------------------------
    // Strong anchors (high precision)
    // -----------------------------
    // TF.3A: “...dead wrong. What hits you first — the wrongness, or the awkwardness of saying something?”
    // TF.3B: “...How does it feel in your chest — the weight of the truth, or the weight of what it’ll do to them?”
    // TF.3C: “...How does that feel — ... gently corrected, or ... sacred ... shouldn’t touch?”
    // T-leaning anchor phrases (correction / wrongness / truth weight)
    const strongTAnchors = [
        // 3A wrongness-first
        "the wrongness",
        "wrongness",
        "dead wrong",
        "that's wrong",
        "that is wrong",
        "wrong information",
        "incorrect",
        "factually wrong",
        "needs correcting",
        "needs to be corrected",
        "i have to correct",
        "i need to correct",
        "correct it",
        "call it out",
        // 3B truth-weight side
        "weight of the truth",
        "the truth feels heavy",
        "truth feels heavier",
        "it needs to be said",
        "say it anyway",
        "i'd say it",
        "i would say it",
        "be honest",
        "honesty",
        // 3C correction side
        "gently corrected",
        "needs to be gently corrected",
        "should be corrected",
        "set the record straight",
        "reality matters",
        "don't rewrite history",
        "do not rewrite history",
        "that's not true",
        "that is not true",
    ];
    // F-leaning anchor phrases (awkwardness / impact / sacredness / don't touch)
    const strongFAnchors = [
        // 3A awkwardness-first
        "awkwardness",
        "awkward",
        "making it awkward",
        "ruin the vibe",
        "kill the vibe",
        "cause a scene",
        "embarrassing",
        "i don't want to embarrass",
        "i do not want to embarrass",
        // 3B impact side
        "what it'll do to them",
        "what it will do to them",
        "hurting them",
        "hurt them",
        "hurt their feelings",
        "don't want to hurt",
        "do not want to hurt",
        "spare their feelings",
        "protect their feelings",
        // 3C sacredness side
        "something sacred",
        "it's sacred",
        "shouldn't touch",
        "should not touch",
        "don't touch it",
        "do not touch it",
        "leave it alone",
        "let them have it",
        "let them believe",
        "not the moment",
        "not the time",
    ];
    // -----------------------------
    // Generic lexicon (lower precision)
    // -----------------------------
    // T-leaning: confront/correct/debate/truth-first
    const confront = [
        "correct",
        "correction",
        "fix",
        "set them straight",
        "set the record straight",
        "call out",
        "call them out",
        "call it out",
        "challenge",
        "push back",
        "pushback",
        "confront",
        "confrontation",
        "debate",
        "argue",
        "argument",
        "disagree",
        "i disagree",
        "truth",
        "honest",
        "honesty",
        "accuracy",
        "precise",
        "precision",
        "facts",
        "evidence",
        "be right",
        "right",
        "wrong",
        "incorrect",
        "misleading",
        "misinformation",
        "hash it out",
        "direct",
        "blunt",
        "say it to their face",
        "tell them",
        "tell it straight",
    ];
    // F-leaning: harmony/avoid-friction/impact-first
    const deescalate = [
        "awkward",
        "awkwardness",
        "tension",
        "make it weird",
        "make it uncomfortable",
        "keep the peace",
        "peace",
        "harmony",
        "avoid conflict",
        "avoid confrontation",
        "de-escalate",
        "deescalate",
        "calm down",
        "cool down",
        "smooth things over",
        "let it go",
        "leave it",
        "drop it",
        "not worth it",
        "spare them",
        "spare their feelings",
        "hurt",
        "hurting",
        "hurt feelings",
        "impact",
        "protect",
        "protect them",
        "protect their feelings",
        "be gentle",
        "soften it",
        "careful",
        "kind",
        "kindness",
        "respect",
        "empathy",
        "empathetic",
        "grief",
        "they're grieving",
        "they are grieving",
        "give them space",
    ];
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "prefer",
        "rather",
        "choose",
        "pick",
        "i tend to",
        "usually",
        "for me",
        "what hits first",
        "feels heavier",
        "in my chest",
        "it lands as",
        "it feels like",
    ];
    const hasChoice = choice.some((c) => t.includes(c));
    // -----------------------------
    // Hit counting (negation-aware)
    // -----------------------------
    const strongTSummary = effectiveHits(t, strongTAnchors);
    const strongFSummary = effectiveHits(t, strongFAnchors);
    const strongTEffective = strongTSummary.effectiveHits;
    const strongTNegated = strongTSummary.negatedHits;
    const strongFEffective = strongFSummary.effectiveHits;
    const strongFNegated = strongFSummary.negatedHits;
    // Generic hits
    const conSummary = effectiveHits(t, confront);
    const deSummary = effectiveHits(t, deescalate);
    const effectiveCon = conSummary.effectiveHits;
    const negatedCon = conSummary.negatedHits;
    const effectiveDe = deSummary.effectiveHits;
    const negatedDe = deSummary.negatedHits;
    // -----------------------------
    // Evidence aggregation
    // -----------------------------
    const anchorMultiplier = 2.5;
    // Negation rule:
    // - Negated confront/correctness counts as F evidence.
    // - Negated harmony/impact counts as T evidence.
    const tEvidence = effectiveCon +
        negatedDe +
        strongTEffective * anchorMultiplier +
        strongFNegated * anchorMultiplier;
    const fEvidence = effectiveDe +
        negatedCon +
        strongFEffective * anchorMultiplier +
        strongTNegated * anchorMultiplier;
    const rawDir = fEvidence - tEvidence;
    // -----------------------------
    // Score
    // -----------------------------
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    const anyStrongAnchor = strongTEffective + strongFEffective + strongTNegated + strongFNegated > 0;
    if (anyStrongAnchor)
        delta *= 1.25;
    if (hasChoice)
        delta *= 1.1;
    score01 = clamp01(score01 + delta);
    // -----------------------------
    // Confidence
    // -----------------------------
    const directional = Math.abs(rawDir);
    let confidence01 = 0.18;
    // Generic cue coverage
    confidence01 += Math.min(0.32, (effectiveCon + effectiveDe + negatedCon + negatedDe) * 0.08);
    // Strong anchors
    confidence01 += Math.min(0.30, (strongTEffective + strongFEffective + strongTNegated + strongFNegated) * 0.18);
    confidence01 += Math.min(0.24, directional * 0.08);
    confidence01 += hasChoice ? 0.08 : 0;
    confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);
    // -----------------------------
    // Cues
    // -----------------------------
    const cues = [];
    if (strongFEffective > 0 || strongTNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.decisionSubstrate.anchor_impact_or_awkward_or_sacred",
            weight: +0.16 * (strongFEffective + strongTNegated),
            text: "anchor echo: awkwardness/impact/sacred (F)",
        });
    }
    if (strongTEffective > 0 || strongFNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.decisionSubstrate.anchor_wrongness_or_truth_or_correction",
            weight: -0.16 * (strongTEffective + strongFNegated),
            text: "anchor echo: wrongness/truth/correction (T)",
        });
    }
    if (effectiveDe + negatedCon > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.decisionSubstrate.deescalate_or_harmony",
            weight: +0.08 * (effectiveDe + negatedCon),
            text: "de-escalation/impact terms (F)",
        });
    }
    if (effectiveCon + negatedDe > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.decisionSubstrate.confront_or_correct",
            weight: -0.08 * (effectiveCon + negatedDe),
            text: "confront/correct/truth terms (T)",
        });
    }
    if (hasChoice) {
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    }
    if (analysis.contrast.hasContrast) {
        cues.push({
            kind: "semantic",
            featureId: "operator.contrast_pivot",
            weight: 0,
            text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
        });
    }
    return { score01, confidence01, cues };
}
/**
 * TF Sub-axis 4: Decision driver (REASONS/STRUCTURE vs RAPPORT/RELATIONAL LEVERAGE)
 *
 * Low (T, score01->0): leads with reasons / structural correction / truth-maintenance
 * High (F, score01->1): leads with rapport / protection / dependency-awareness
 *
 * Anchor upgrade:
 * - Exact / near-exact anchor phrase matches get “strong evidence” weighting.
 * - Strong evidence shifts score more and boosts confidence more than generic lexicon hits.
 *
 * Reminder: TF mapping is low=T, high=F.
 */
export function scoreTFConflictMetabolism(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const t = (analysis.primaryText || "").toLowerCase();
    // -----------------------------
    // Strong anchors (high precision)
    // -----------------------------
    // TF.4A revised anchors:
    //   F: “collapsing something others depend on”
    //   T: “letting something false stand”
    //
    // Treat exact/near-exact anchor echoes as strong evidence.
    const strongFAnchors = [
        "collapsing something others depend on",
        "collapse something others depend on",
        "collapsing something people depend on",
        "collapse something people depend on",
        "collapsing what others depend on",
        "collapse what others depend on",
        "taking away something others depend on",
        "taking something others depend on",
        "pulling away something others depend on",
        "breaking something others depend on",
        "ruining something others depend on",
        "destroying something others depend on",
        "hurting something others depend on",
        "collapsing a value others depend on",
        "collapse a value others depend on",
    ];
    const strongTAnchors = [
        "letting something false stand",
        "letting something false stay",
        "letting something untrue stand",
        "letting something untrue stay",
        "letting a lie stand",
        "letting a lie slide",
        "letting the lie stand",
        "letting it stand",
        "letting it slide",
        "letting falsehood stand",
        "not correcting it",
        "not correcting the issue",
        "not correcting the error",
        "not correcting what's wrong",
        "not calling it out",
        "not speaking up",
        "letting something incorrect stand",
        "letting something wrong stand",
    ];
    // -----------------------------
    // Generic lexicon (lower precision)
    // -----------------------------
    const reasonsStructure = [
        "won't work",
        "wont work",
        "not going to work",
        "it doesn't work",
        "doesnt work",
        "mistake",
        "wrong decision",
        "bad decision",
        "flaw",
        "problem with",
        "issue with",
        "risk",
        "consequence",
        "tradeoff",
        "trade-off",
        "logic",
        "logical",
        "reason",
        "reasons",
        "because",
        "therefore",
        "argument",
        "make the case",
        "evidence",
        "facts",
        "data",
        "proof",
        "prove",
        "analysis",
        "objective",
        "criteria",
        "principle",
        "principles",
        "correct",
        "correct it",
        "fix",
        "fix it",
        "point out",
        "call out",
        "challenge",
        "push back",
        "truth",
        "reality",
        "be honest",
        "false",
        "lie to themselves",
        "lying to themselves",
        "self-deception",
        "delusion",
        "illusion",
        "irrational",
        "dismantle",
        "debunk",
        "disprove",
        "poke holes",
    ];
    const rapportShelter = [
        "hear me",
        "need you to hear me",
        "listen",
        "listen to me",
        "reach them",
        "one shot",
        "i care about you",
        "because i care",
        "i'm worried about you",
        "worried about you",
        "i don't want to lose you",
        "our relationship",
        "relationship",
        "trust",
        "bond",
        "connection",
        "rapport",
        "shelter",
        "don't want to collapse",
        "don't want to destroy",
        "don't want to break",
        "don't want to take it away",
        "never take it from them",
        "let them have it",
        "keep them afloat",
        "keep them going",
        "gets them through",
        "helps them cope",
        "coping",
        "survival",
        "comfort",
        "meaning",
        "faith",
        "i wouldn't touch it",
        "protect",
        "preserve",
        "be gentle",
        "tender",
        "kind",
        "compassion",
        "empathy",
        "understand",
        "understanding",
    ];
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "prefer",
        "rather",
        "choose",
        "pick",
        "i tend to",
        "usually",
        "for me",
        "what i do",
        "what i'd do",
    ];
    const hasChoice = choice.some((c) => t.includes(c));
    // -----------------------------
    // Hit counting (negation-aware)
    // -----------------------------
    // Strong anchors: we treat as “strong hits” then convert to extra evidence.
    const strongFSummary = effectiveHits(t, strongFAnchors);
    const strongTSummary = effectiveHits(t, strongTAnchors);
    const strongFEffective = strongFSummary.effectiveHits;
    const strongFNegated = strongFSummary.negatedHits;
    const strongTEffective = strongTSummary.effectiveHits;
    const strongTNegated = strongTSummary.negatedHits;
    // Generic lexicon: standard hits
    const rSummary = effectiveHits(t, reasonsStructure);
    const pSummary = effectiveHits(t, rapportShelter);
    const effectiveReasons = rSummary.effectiveHits;
    const negatedReasons = rSummary.negatedHits;
    const effectiveRapport = pSummary.effectiveHits;
    const negatedRapport = pSummary.negatedHits;
    // -----------------------------
    // Evidence aggregation
    // -----------------------------
    // Strong anchors count heavier than generic hits.
    // Tweakable: anchorMultiplier 2.5 means 1 anchor ~= 2–3 normal hits.
    const anchorMultiplier = 2.5;
    const tEvidence = effectiveReasons +
        negatedRapport +
        strongTEffective * anchorMultiplier +
        strongFNegated * anchorMultiplier; // “not collapsing what others depend on” -> T-ish
    const fEvidence = effectiveRapport +
        negatedReasons +
        strongFEffective * anchorMultiplier +
        strongTNegated * anchorMultiplier; // “not letting false stand” -> F-ish (protective truth?)
    const rawDir = fEvidence - tEvidence;
    // -----------------------------
    // Score
    // -----------------------------
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    // If we got a strong anchor hit, allow a slightly stronger move.
    const anyStrongAnchor = strongFEffective + strongTEffective + strongFNegated + strongTNegated > 0;
    if (anyStrongAnchor)
        delta *= 1.25;
    if (hasChoice)
        delta *= 1.1;
    score01 = clamp01(score01 + delta);
    // -----------------------------
    // Confidence
    // -----------------------------
    const poleCueCount = tEvidence + fEvidence;
    const directional = Math.abs(rawDir);
    let confidence01 = 0.18;
    // Generic coverage
    confidence01 += Math.min(0.32, (effectiveReasons + effectiveRapport + negatedReasons + negatedRapport) * 0.08);
    // Strong anchors: bigger bump because they’re high-precision.
    confidence01 += Math.min(0.30, (strongFEffective + strongTEffective + strongFNegated + strongTNegated) * 0.18);
    // Directionality + stance
    confidence01 += Math.min(0.24, directional * 0.08);
    confidence01 += hasChoice ? 0.08 : 0;
    confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);
    // -----------------------------
    // Cues
    // -----------------------------
    const cues = [];
    if (strongFEffective > 0 || strongTNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.conflictMetabolism.anchor_rapport_or_dependency",
            weight: +0.16 * (strongFEffective + strongTNegated),
            text: "anchor echo: dependency/shelter (F)",
        });
    }
    if (strongTEffective > 0 || strongFNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.conflictMetabolism.anchor_truth_or_correction",
            weight: -0.16 * (strongTEffective + strongFNegated),
            text: "anchor echo: falsehood/correction (T)",
        });
    }
    if (effectiveRapport + negatedReasons > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.conflictMetabolism.rapport_or_shelter",
            weight: +0.08 * (effectiveRapport + negatedReasons),
            text: "rapport/hear-me/shelter terms (F)",
        });
    }
    if (effectiveReasons + negatedRapport > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.conflictMetabolism.reasons_or_structure",
            weight: -0.08 * (effectiveReasons + negatedRapport),
            text: "reasons/structure/correction terms (T)",
        });
    }
    if (hasChoice) {
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    }
    if (analysis.contrast.hasContrast) {
        cues.push({
            kind: "semantic",
            featureId: "operator.contrast_pivot",
            weight: 0,
            text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
        });
    }
    return { score01, confidence01, cues };
}
/**
 * TF Sub-axis 5: Social evaluation focus (FLAWS vs HUMAN/STRIVING/STRENGTHS)
 *
 * Low (T, score01->0): notices structural flaws/cracks/weaknesses first (model breaks, content falls apart, red flags)
 * High (F, score01->1): notices effort/fragility/striving/promise first (how hard they’re trying, grief, tenderness)
 *
 * Anchor upgrade:
 * - Exact / near-exact anchor phrase matches (from TF.5 prompts) are treated as strong evidence.
 * - Strong evidence shifts score more and boosts confidence more than generic lexicon hits.
 *
 * Reminder: TF mapping is low=T, high=F.
 */
export function scoreTFBoundaryArchitecture(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const t = (analysis.primaryText || "").toLowerCase();
    // -----------------------------
    // Strong anchors (high precision)
    // -----------------------------
    // TF.5A: “...nervous. What do you notice first — where the content falls apart, or how hard they’re trying?”
    // TF.5B: “...a crack... How does that hit you — do you feel the fragility, or do you feel the performance?”
    // TF.5C: “...falling apart... How does that register — ...collapse... or ...a grief you feel for them?”
    // T-leaning anchor phrases (flaw/performance/collapse/model-update)
    const strongTAnchors = [
        // 5A flaw side
        "where the content falls apart",
        "content falls apart",
        "falls apart",
        "the content is falling apart",
        "argument falls apart",
        "the argument falls apart",
        "doesn't hold up",
        "does not hold up",
        // 5B performance side
        "the performance",
        "feel the performance",
        "it's a performance",
        "it is a performance",
        "they're performing",
        "they are performing",
        "facade",
        "mask",
        "persona",
        // 5C collapse/belief side
        "collapse of something you believed",
        "collapse of what i believed",
        "collapse of what i thought",
        "disillusionment",
        "i feel disillusioned",
        "the illusion broke",
        "model changed",
        "update my model",
        "recalculate",
    ];
    // F-leaning anchor phrases (trying/fragility/grief/ache)
    const strongFAnchors = [
        // 5A effort side
        "how hard they're trying",
        "how hard they are trying",
        "they're trying",
        "they are trying",
        "trying so hard",
        "their effort",
        "the effort",
        "they're brave",
        "they are brave",
        "courage",
        // 5B fragility side
        "feel the fragility",
        "the fragility",
        "fragile",
        "a crack",
        "the crack feels",
        "something underneath",
        "something tender",
        // 5C grief-for-them side
        "a grief you feel for them",
        "grief i feel for them",
        "i feel grief for them",
        "i feel for them",
        "my heart goes out",
        "sad for them",
        "ache for them",
        "it hurts for them",
        "compassion",
    ];
    // -----------------------------
    // Generic lexicon (lower precision)
    // -----------------------------
    // T-leaning: flaw/weakness/crack/performance/red-flag scanning
    const flaws = [
        "weakness",
        "weaknesses",
        "flaw",
        "flaws",
        "fault",
        "faults",
        "problem",
        "problems",
        "issue",
        "issues",
        "concern",
        "concerns",
        "risk",
        "risks",
        "crack",
        "cracks",
        "red flag",
        "red flags",
        "warning sign",
        "warning signs",
        "what's wrong",
        "what is wrong",
        "spot problems",
        "find problems",
        "look for problems",
        "catch mistakes",
        "mistake",
        "mistakes",
        "skeptical",
        "suspicious",
        "vet",
        "screen",
        "screening",
        "filter out",
        "disqualify",
        "dealbreaker",
        "deal breakers",
        "deal-breaker",
        "deal-breakers",
        "performance",
        "performing",
        "facade",
        "mask",
        "inconsistent",
        "doesn't add up",
        "does not add up",
        "falls apart",
        "doesn't hold up",
        "does not hold up",
    ];
    // F-leaning: strengths/effort/fragility/promise/green-flag scanning
    const strengths = [
        "strength",
        "strengths",
        "strong",
        "good at",
        "gift",
        "gifts",
        "talent",
        "talents",
        "potential",
        "promise",
        "promising",
        "green flag",
        "green flags",
        "what's good",
        "what is good",
        "what's right",
        "what is right",
        "opportunity",
        "opportunities",
        "see the best",
        "see the good",
        "focus on strengths",
        "build on",
        "bring out",
        "develop",
        "coach",
        "mentor",
        "support",
        "encourage",
        "encouragement",
        "growth",
        "improve",
        "improvement",
        "capable",
        "capability",
        "fit",
        "great fit",
        "effort",
        "trying",
        "nervous",
        "brave",
        "courage",
        "fragile",
        "fragility",
        "tender",
        "grief",
        "sad",
        "heartbreaking",
        "feel for them",
        "compassion",
        "empathy",
        "empathetic",
    ];
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "prefer",
        "rather",
        "choose",
        "pick",
        "i tend to",
        "usually",
        "for me",
        "i notice",
        "what i notice",
        "hits me",
        "it hits me",
        "it registers",
        "it lands",
        "it feels like",
        "first",
    ];
    const hasChoice = choice.some((c) => t.includes(c));
    // -----------------------------
    // Hit counting (negation-aware)
    // -----------------------------
    const strongTSummary = effectiveHits(t, strongTAnchors);
    const strongFSummary = effectiveHits(t, strongFAnchors);
    const strongTEffective = strongTSummary.effectiveHits;
    const strongTNegated = strongTSummary.negatedHits;
    const strongFEffective = strongFSummary.effectiveHits;
    const strongFNegated = strongFSummary.negatedHits;
    const flawSummary = effectiveHits(t, flaws);
    const strSummary = effectiveHits(t, strengths);
    const effectiveFlaws = flawSummary.effectiveHits;
    const negatedFlaws = flawSummary.negatedHits;
    const effectiveStrengths = strSummary.effectiveHits;
    const negatedStrengths = strSummary.negatedHits;
    // -----------------------------
    // Evidence aggregation
    // -----------------------------
    const anchorMultiplier = 2.5;
    // Negation rule:
    // - Negated strengths counts as flaws evidence.
    // - Negated flaws counts as strengths evidence.
    const tEvidence = effectiveFlaws +
        negatedStrengths +
        strongTEffective * anchorMultiplier +
        strongFNegated * anchorMultiplier;
    const fEvidence = effectiveStrengths +
        negatedFlaws +
        strongFEffective * anchorMultiplier +
        strongTNegated * anchorMultiplier;
    const rawDir = fEvidence - tEvidence;
    // -----------------------------
    // Score
    // -----------------------------
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    const anyStrongAnchor = strongTEffective + strongFEffective + strongTNegated + strongFNegated > 0;
    if (anyStrongAnchor)
        delta *= 1.25;
    if (hasChoice)
        delta *= 1.1;
    score01 = clamp01(score01 + delta);
    // -----------------------------
    // Confidence
    // -----------------------------
    const directional = Math.abs(rawDir);
    let confidence01 = 0.18;
    confidence01 += Math.min(0.32, (effectiveFlaws + effectiveStrengths + negatedFlaws + negatedStrengths) * 0.08);
    confidence01 += Math.min(0.30, (strongTEffective + strongFEffective + strongTNegated + strongFNegated) * 0.18);
    confidence01 += Math.min(0.24, directional * 0.08);
    confidence01 += hasChoice ? 0.08 : 0;
    confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);
    // -----------------------------
    // Cues
    // -----------------------------
    const cues = [];
    if (strongFEffective > 0 || strongTNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.boundaryArchitecture.anchor_effort_fragility_grief",
            weight: +0.16 * (strongFEffective + strongTNegated),
            text: "anchor echo: effort/fragility/grief (F)",
        });
    }
    if (strongTEffective > 0 || strongFNegated > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.boundaryArchitecture.anchor_flaw_performance_collapse",
            weight: -0.16 * (strongTEffective + strongFNegated),
            text: "anchor echo: flaws/performance/collapse (T)",
        });
    }
    if (effectiveStrengths + negatedFlaws > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.boundaryArchitecture.strengths_or_promise",
            weight: +0.08 * (effectiveStrengths + negatedFlaws),
            text: "strength/effort/fragility terms (F)",
        });
    }
    if (effectiveFlaws + negatedStrengths > 0) {
        cues.push({
            kind: "semantic",
            featureId: "TF.boundaryArchitecture.flaws_or_redflags",
            weight: -0.08 * (effectiveFlaws + negatedStrengths),
            text: "flaw/weakness/performance terms (T)",
        });
    }
    if (hasChoice) {
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    }
    if (analysis.contrast.hasContrast) {
        cues.push({
            kind: "semantic",
            featureId: "operator.contrast_pivot",
            weight: 0,
            text: `contrast pivot: ${analysis.contrast.marker?.marker ?? "(unknown)"}`,
        });
    }
    return { score01, confidence01, cues };
}
