import { SUB_AXIS_ORDER } from "../domain/index.js";
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
function makeNeutralSubAxis(subAxisId) {
    return {
        subAxisId: subAxisId,
        score01: 0.5,
        confidence01: 0.25,
        cues: [],
    };
}
/**
 * Minimal v0 scorer: returns mostly neutral scores, but keeps structure stable.
 * Next iterations: plug in deterministic features + gated LLM residue resolver.
 */
export function scoreTranscript(params) {
    const nowIso = params.nowIso ?? new Date().toISOString();
    const prompt = params.prompt;
    // Build sub-axis scaffolding for each dimension.
    const debugSubAxes = {
        IE: Object.fromEntries(SUB_AXIS_ORDER.IE.map(id => [id, makeNeutralSubAxis(id)])),
        NS: Object.fromEntries(SUB_AXIS_ORDER.NS.map(id => [id, makeNeutralSubAxis(id)])),
        TF: Object.fromEntries(SUB_AXIS_ORDER.TF.map(id => [id, makeNeutralSubAxis(id)])),
        JP: Object.fromEntries(SUB_AXIS_ORDER.JP.map(id => [id, makeNeutralSubAxis(id)])),
    };
    // If we know which prompt was asked, lightly “tilt” that sub-axis based on simple heuristics.
    // (You’ll replace this with real deterministic features soon.)
    if (prompt) {
        const dim = prompt.dimensionId;
        const sub = prompt.subAxisId;
        const t = params.transcript.toLowerCase();
        // Very lightweight “obvious” cues for early smoke testing:
        let delta = 0;
        if (/(always|definitely|for sure|no doubt)/.test(t))
            delta += 0.08;
        if (/(maybe|might|kind of|sort of|i guess|not sure)/.test(t))
            delta -= 0.08;
        const base = debugSubAxes[dim][sub].score01;
        debugSubAxes[dim][sub] = {
            ...debugSubAxes[dim][sub],
            score01: clamp01(base + delta),
            confidence01: 0.35,
            cues: delta === 0 ? [] : [{
                    kind: "semantic",
                    featureId: delta > 0 ? "stance.certainty" : "stance.hedging",
                    weight: delta,
                    text: delta > 0 ? "certainty marker" : "hedging marker",
                }],
        };
    }
    // Aggregate per-dimension: mean of its 5 sub-axes.
    function aggregateDimension(dim) {
        const entries = Object.values(debugSubAxes[dim]);
        const mean = entries.reduce((s, a) => s + a.score01, 0) / entries.length;
        const conf = entries.reduce((s, a) => s + a.confidence01, 0) / entries.length;
        // leansToward interpretation:
        // score01=0 => lowLabel pole, score01=1 => highLabel pole
        // For your dimensions, map pole letters:
        // IE: low=I, high=E
        // NS: low=N, high=S  (inverted by design)
        // TF: low=T, high=F  (NOTE: your lowLabel is "fairness"; you've defined TF semantics; we keep letters conventional)
        // JP: low=J, high=P
        const letterLowHigh = {
            IE: ["I", "E"],
            NS: ["N", "S"],
            TF: ["T", "F"],
            JP: ["J", "P"],
        };
        const [low, high] = letterLowHigh[dim];
        const leansToward = mean >= 0.5 ? high : low;
        const strength = Math.abs(mean - 0.5) * 2; // 0..1
        return { leansToward, strength, confidence: clamp01(conf) };
    }
    const axes = {
        IE: { ...aggregateDimension("IE"), updatedAt: nowIso },
        NS: { ...aggregateDimension("NS"), updatedAt: nowIso },
        TF: { ...aggregateDimension("TF"), updatedAt: nowIso },
        JP: { ...aggregateDimension("JP"), updatedAt: nowIso },
    };
    // naive MBTI guess (placeholder): pick letters from leansToward
    const mbtiGuess = `${axes.IE.leansToward}${axes.NS.leansToward}${axes.TF.leansToward}${axes.JP.leansToward}`;
    const mbtiConfidence = clamp01((axes.IE.confidence + axes.NS.confidence + axes.TF.confidence + axes.JP.confidence) / 4);
    // EvidenceDraft: keep dimension-level evidence for now (stable contract)
    const evidence = (prompt
        ? [{
                dimension: prompt.dimensionId,
                leansToward: axes[prompt.dimensionId].leansToward,
                confidence: clamp01(axes[prompt.dimensionId].confidence),
                excerpt: params.transcript.length > 0 ? params.transcript.slice(0, 140) : undefined,
                sourceType: params.sourceType ?? "audio",
                sourceSessionID: params.sourceSessionID,
                agentType: "hybrid.v1",
                timestamp: nowIso,
            }]
        : []);
    return {
        dimensionState: {
            axes,
            mbtiGuess,
            mbtiConfidence,
            updatedAt: nowIso,
        },
        evidence,
        debug: params.includeDebug ? { promptId: prompt?.id, subAxes: debugSubAxes } : undefined,
    };
}
