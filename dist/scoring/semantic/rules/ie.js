// src/scoring/semantic/rules/ie.ts
// Deterministic semantic scoring rules for IE (Social Energy) sub-axes.
// Convention: score01=0 => lowLabel pole, score01=1 => highLabel pole.
import { analyzeTextForScoring } from "./utils.js";
import { effectiveHits } from "../operators/index.js";
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
/**
 * IE.groupSizePreference
 * lowLabel: Prefers intimate settings
 * highLabel: Thrives in crowds
 */
export function scoreIEGroupSizePreference(transcriptRaw) {
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
            featureId: "IE.groupSizePreference.crowd_terms",
            weight: +0.08 * crowdHits,
            text: "crowd terms",
        });
    if (intimateHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.groupSizePreference.intimate_terms",
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
 * IE.initiatingConversation
 * lowLabel: Warms up gradually
 * highLabel: Breaks the ice quickly
 */
export function scoreIEInitiatingConversation(transcriptRaw) {
    const analysis = analyzeTextForScoring(transcriptRaw || "");
    const t = (analysis.primaryText || "").toLowerCase();
    // High pole (E-leaning): breaks the ice quickly / initiates
    const initiate = [
        "walk up",
        "go up",
        "introduce myself",
        "introduce",
        "say hi",
        "say hello",
        "start a conversation",
        "break the ice",
        "jump in",
        "jump right in",
        "talk to people",
        "chat",
        "make small talk",
        "ask their name",
        "start talking",
        "strike up",
        "approach",
        "speak first",
    ];
    // Low pole (I-leaning): warms up gradually / waits, watches, calibrates
    const waitWatch = [
        "wait",
        "hang back",
        "stay quiet",
        "observe",
        "watch",
        "listen",
        "feel it out",
        "read the room",
        "warm up",
        "warm up gradually",
        "take my time",
        "ease in",
        "until invited",
        "wait to be invited",
        "let them come to me",
        "see how it feels",
        "get a sense first",
    ];
    // Choice/stance markers (boost confidence; not direction)
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "i tend to",
        "usually",
        "most of the time",
        "prefer",
        "rather",
        "choose",
        "pick",
    ];
    // Risk-appraisal / social threat markers (boost confidence a bit)
    const riskTalk = ["awkward", "rejection", "judge", "judged", "embarrass", "bother", "intrude", "anxious", "nervous"];
    const countHits = (terms) => terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);
    const waitHits = countHits(waitWatch);
    const choiceHits = countHits(choice);
    const riskHits = countHits(riskTalk);
    // Negation-aware initiation hits using the shared operator.
    // Effective hits = initiation phrases not preceded by negators in a short window.
    const initSummary = effectiveHits(t, initiate);
    const negatedInitiationHits = initSummary.negatedHits;
    const effectiveInitHits = initSummary.effectiveHits;
    // Direction: init => highLabel (E), wait/watch => lowLabel (I)
    // Negated initiation counts against initiation (and toward waiting).
    const rawDir = effectiveInitHits - (waitHits + negatedInitiationHits);
    // Baseline neutral
    let score01 = 0.5;
    // Cap directionality to avoid overclaiming
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08; // max ~0.24
    // If they use explicit stance markers, amplify slightly
    const hasChoice = choiceHits > 0;
    if (hasChoice)
        delta *= 1.15;
    score01 = clamp01(score01 + delta);
    // Confidence: depends on pole cue count + directionality + explicit stance
    const poleCueCount = effectiveInitHits + waitHits + negatedInitiationHits;
    const directional = Math.abs(rawDir);
    let confidence01 = 0.20;
    confidence01 += Math.min(0.35, poleCueCount * 0.08);
    confidence01 += Math.min(0.25, directional * 0.08);
    confidence01 += hasChoice ? 0.10 : 0;
    confidence01 += Math.min(0.08, riskHits * 0.04);
    // Apply a small, shared operator-based confidence adjustment (hedging/modality/aspiration).
    confidence01 = clamp01(confidence01 * analysis.confidenceMultiplier);
    const cues = [];
    if (effectiveInitHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.initiatingConversation.initiate_terms",
            weight: +0.08 * effectiveInitHits,
            text: "initiation terms",
        });
    if (waitHits > 0 || negatedInitiationHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.initiatingConversation.wait_watch_terms",
            weight: -0.08 * (waitHits + negatedInitiationHits),
            text: negatedInitiationHits > 0 ? "wait/watch terms + negated initiation" : "wait/watch terms",
        });
    if (hasChoice)
        cues.push({
            kind: "semantic",
            featureId: "stance.choice_language",
            weight: 0,
            text: "choice/preference markers",
        });
    if (riskHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "social_risk.appraisal",
            weight: 0,
            text: "social risk markers",
        });
    return { score01, confidence01, cues };
}
/**
 * IE.familiarityVsNovelty
 * lowLabel: Prefers familiar company
 * highLabel: Enjoys meeting new people
 */
export function scoreIEFamiliarityVsNovelty(transcriptRaw) {
    const t = (transcriptRaw || "").toLowerCase();
    // High pole (E-leaning social exploration): new people / novelty / meeting strangers
    const novelty = [
        "new people",
        "meet new people",
        "meeting new people",
        "new friends",
        "new faces",
        "strangers",
        "network",
        "branch out",
        "expand my circle",
        "fresh start",
        "new circle",
        "new group",
        "new crowd",
        "new community",
        "new connections",
        "meet someone new",
        // Ancestral / prompt-aligned phrases
        "travel to a new group",
        "travel to another group",
        "go to a new group",
        "join a new group",
        "join another group",
        "leave my band",
        "leave my group",
        "switch groups",
        "other group",
        "another group",
        "allies",
    ];
    // Low pole (I-leaning social stability): familiar company / inner circle / existing bonds
    const familiar = [
        "my circle",
        "inner circle",
        "close friends",
        "trusted people",
        "people i know",
        "familiar",
        "same people",
        "stick with",
        "stay with",
        "keep my circle",
        "deepening",
        "go deeper",
        "long-term friends",
        "old friends",
        "existing friends",
        "people i trust",
        // Ancestral / prompt-aligned phrases
        "my band",
        "the band",
        "my group",
        "our group",
        "my tribe",
        "our tribe",
        "my people",
        "our people",
        "stay loyal",
        "loyal",
        "loyalty",
        "stay loyal to",
        "stay with my band",
        "stick with my band",
        "stay with my people",
    ];
    // Choice/stance markers (boost confidence)
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "i tend to",
        "usually",
        "most of the time",
        "prefer",
        "rather",
        "choose",
        "pick",
    ];
    // Optional: exploration framing (boost confidence slightly)
    const exploreTalk = ["curious", "variety", "novel", "adventure", "opportunity"];
    const stabilityTalk = ["loyal", "stable", "safe", "reliable", "consistent", "trust"];
    // Simple negation tokens for lightweight scope checks
    const negators = ["not", "don't", "do not", "never", "no way"];
    const countHits = (terms) => terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);
    const noveltyHits = countHits(novelty);
    const familiarHits = countHits(familiar);
    const choiceHits = countHits(choice);
    const exploreHits = countHits(exploreTalk);
    const stabilityHits = countHits(stabilityTalk);
    // Lightweight negation handling: if they negate a novelty phrase (e.g., "not travel to a new group"),
    // treat it as evidence for familiarity (staying with the known group).
    let negatedNoveltyHits = 0;
    for (const phrase of novelty) {
        const idx = t.indexOf(phrase);
        if (idx === -1)
            continue;
        const windowStart = Math.max(0, idx - 60);
        const before = t.slice(windowStart, idx);
        if (negators.some(n => before.includes(n))) {
            negatedNoveltyHits += 1;
        }
    }
    const effectiveNoveltyHits = Math.max(0, noveltyHits - negatedNoveltyHits);
    // Direction: novelty => highLabel; familiar => lowLabel
    const rawDir = effectiveNoveltyHits - (familiarHits + negatedNoveltyHits);
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    const hasChoice = choiceHits > 0;
    if (hasChoice)
        delta *= 1.15;
    score01 = clamp01(score01 + delta);
    // Confidence
    const poleCueCount = effectiveNoveltyHits + familiarHits + negatedNoveltyHits;
    const directional = Math.abs(rawDir);
    let confidence01 = 0.20;
    confidence01 += Math.min(0.35, poleCueCount * 0.08);
    confidence01 += Math.min(0.25, directional * 0.08);
    confidence01 += hasChoice ? 0.10 : 0;
    confidence01 += Math.min(0.06, (exploreHits + stabilityHits) * 0.02);
    confidence01 = clamp01(confidence01);
    const cues = [];
    if (effectiveNoveltyHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.familiarityVsNovelty.novelty_terms",
            weight: +0.08 * effectiveNoveltyHits,
            text: "novelty/new-people terms",
        });
    if (familiarHits > 0 || negatedNoveltyHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.familiarityVsNovelty.familiar_terms",
            weight: -0.08 * (familiarHits + negatedNoveltyHits),
            text: negatedNoveltyHits > 0 ? "familiar/inner-circle terms + negated novelty" : "familiar/inner-circle terms",
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
 * IE.speakingPace
 * lowLabel: Thinks, then speaks
 * highLabel: Thinks out loud
 *
 * Semantic-only version with support for IE.4A crisis prompt:
 * - "go quiet / pause / assess / decide first" => low
 * - "give orders immediately / direct as I think" => high
 */
export function scoreIESpeakingPace(transcriptRaw) {
    const raw = transcriptRaw || "";
    const t = raw.toLowerCase();
    // Explicit self-description (strong evidence)
    const thinkOutLoudPhrases = [
        "think out loud",
        "thinking out loud",
        "let me think out loud",
        "i'll think out loud",
        "let me talk it through",
        "talk it through",
        "i'm processing out loud",
        "processing out loud",
    ];
    const thinkThenSpeakPhrases = [
        "let me think",
        "give me a second",
        "hold on",
        "one second",
        "i need a moment",
        "i need to think",
        "choose my words",
        "i'll think first",
        "gather my thoughts",
        "i want to be careful",
        "let me collect my thoughts",
        "collect my thoughts",
    ];
    // Prompt-aligned crisis-response proxies (moderate evidence)
    // Low: internal planning / silence / assessment first
    const quietFirst = [
        "go quiet",
        "stay quiet",
        "be quiet",
        "keep quiet",
        "go silent",
        "stay silent",
        "silent",
        "silence",
        "pause",
        "pause for a second",
        "wait",
        "hold back",
        "hang back",
        "assess",
        "assess first",
        "evaluate",
        "evaluate first",
        "listen first",
        "look first",
        "think first",
        "decide first",
        "wait to decide",
        "figure it out first",
        "take a beat",
        "take a moment",
    ];
    // High: externalized processing / directing while deciding
    const directAsYouThink = [
        "give orders",
        "start directing",
        "direct people",
        "tell people what to do",
        "call out",
        "call it out",
        "shout",
        "shout instructions",
        "give instructions",
        "start talking",
        "say something right away",
        "immediately",
        "right away",
        "as i think",
        "while i'm thinking",
        "talk as i decide",
        "talk through it",
        "narrate it",
    ];
    // Fillers/repairs: weak evidence for "thinking out loud"
    const fillers = [" um ", " uh ", " er ", " ah ", " like ", " you know "];
    const repairMarkers = [" i mean", " actually", " no, wait", " wait,", " sorry", " rather", " correction"];
    const negators = ["not", "don't", "do not", "never", "no way", "wouldn't", "would not"];
    const countIncludes = (phrases) => phrases.reduce((acc, p) => (t.includes(p) ? acc + 1 : acc), 0);
    const countOccurrences = (needle) => {
        let idx = 0;
        let c = 0;
        while (true) {
            idx = t.indexOf(needle, idx);
            if (idx === -1)
                break;
            c += 1;
            idx += needle.length;
        }
        return c;
    };
    const highPhraseHits = countIncludes(thinkOutLoudPhrases);
    const lowPhraseHits = countIncludes(thinkThenSpeakPhrases);
    const quietHits = countIncludes(quietFirst);
    const directHits = countIncludes(directAsYouThink);
    // Negation handling: if they negate a "direct" phrase, treat it as quiet/planning.
    let negatedDirectHits = 0;
    for (const phrase of directAsYouThink) {
        const idx = t.indexOf(phrase);
        if (idx === -1)
            continue;
        const windowStart = Math.max(0, idx - 60);
        const before = t.slice(windowStart, idx);
        if (negators.some((n) => before.includes(n)))
            negatedDirectHits += 1;
    }
    const effectiveDirectHits = Math.max(0, directHits - negatedDirectHits);
    const fillerHits = fillers.reduce((acc, f) => acc + countOccurrences(f), 0);
    const repairHits = repairMarkers.reduce((acc, r) => acc + countOccurrences(r), 0);
    // Direction score (cap later)
    // Explicit phrases are strongest; crisis proxies are medium; fillers/repairs are weak.
    let rawDir = 0;
    rawDir += 3 * highPhraseHits;
    rawDir -= 3 * lowPhraseHits;
    rawDir += 2 * effectiveDirectHits;
    rawDir -= 2 * (quietHits + negatedDirectHits);
    rawDir += Math.min(2, Math.floor((fillerHits + repairHits) / 3));
    // Convert to score
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    const delta = dirStrength * 0.07;
    score01 = clamp01(score01 + delta);
    // Confidence
    let confidence01 = 0.20;
    const explicit = highPhraseHits + lowPhraseHits;
    const crisis = effectiveDirectHits + quietHits + negatedDirectHits;
    confidence01 += Math.min(0.45, explicit * 0.22);
    confidence01 += Math.min(0.30, crisis * 0.10);
    confidence01 += Math.min(0.15, (fillerHits + repairHits) * 0.02);
    if (raw.trim().length < 40)
        confidence01 -= 0.06;
    confidence01 = clamp01(confidence01);
    const cues = [];
    if (highPhraseHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.speakingPace.think_out_loud_phrase",
            weight: +0.21 * highPhraseHits,
            text: "explicit think-out-loud phrasing",
        });
    if (lowPhraseHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.speakingPace.think_then_speak_phrase",
            weight: -0.21 * lowPhraseHits,
            text: "explicit think-then-speak phrasing",
        });
    if (effectiveDirectHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.speakingPace.direct_as_you_think_terms",
            weight: +0.14 * effectiveDirectHits,
            text: "direct/announce-immediately terms",
        });
    if (quietHits > 0 || negatedDirectHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.speakingPace.quiet_first_terms",
            weight: -0.14 * (quietHits + negatedDirectHits),
            text: negatedDirectHits > 0 ? "quiet-first terms + negated directness" : "quiet-first terms",
        });
    if (fillerHits + repairHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.speakingPace.self_repairs_fillers",
            weight: +0.02 * Math.min(10, fillerHits + repairHits),
            text: "fillers/repairs",
        });
    return { score01, confidence01, cues };
}
/**
 * IE.spotlightVsBackground
 * lowLabel: Prefers to blend in
 * highLabel: Enjoys being seen
 */
export function scoreIESpotlightVsBackground(transcriptRaw) {
    const t = (transcriptRaw || "").toLowerCase();
    // High pole: visibility, taking the stage, being recognized
    const spotlight = [
        "take the stage",
        "step forward",
        "speak up",
        "in the spotlight",
        "center of attention",
        "be seen",
        "being seen",
        "be noticed",
        "being noticed",
        "present",
        "presenting",
        "perform",
        "performing",
        "lead the room",
        "take the lead",
        "claim credit",
        "take credit",
        "get credit",
        "recognition",
        "spotlight",
        "attention",
        "public",
    ];
    // Low pole: blending in, behind the scenes, avoiding attention
    const background = [
        "blend in",
        "blending in",
        "stay in the background",
        "in the background",
        "behind the scenes",
        "keep a low profile",
        "low profile",
        "stay quiet",
        "avoid attention",
        "avoid the spotlight",
        "prefer privacy",
        "private",
        // Credit/visibility-specific “background” preferences
        "let others take the credit",
        "let someone else take the credit",
        "give others the credit",
        "give them the credit",
        "share the credit",
        "i don't need credit",
        "i do not need credit",
    ];
    // Choice/stance markers (boost confidence)
    const choice = [
        "i would",
        "i'd",
        "i will",
        "i'll",
        "i tend to",
        "usually",
        "most of the time",
        "prefer",
        "rather",
        "choose",
        "pick",
    ];
    // Simple negation tokens for lightweight scope checks
    const negators = ["not", "don't", "do not", "never", "no way", "wouldn't", "would not"];
    const countHits = (terms) => terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);
    const rawSpotHits = countHits(spotlight);
    const backHits = countHits(background);
    const choiceHits = countHits(choice);
    // Negation handling: if they negate a spotlight phrase, treat it as background evidence.
    let negatedSpotlightHits = 0;
    for (const phrase of spotlight) {
        const idx = t.indexOf(phrase);
        if (idx === -1)
            continue;
        const windowStart = Math.max(0, idx - 60);
        const before = t.slice(windowStart, idx);
        if (negators.some((n) => before.includes(n))) {
            negatedSpotlightHits += 1;
        }
    }
    // Effective spotlight hits exclude those negated in context.
    const effectiveSpotHits = Math.max(0, rawSpotHits - negatedSpotlightHits);
    // Direction: spotlight => highLabel, background => lowLabel
    // Negated spotlight counts toward background.
    const rawDir = effectiveSpotHits - (backHits + negatedSpotlightHits);
    let score01 = 0.5;
    const dirStrength = Math.max(-3, Math.min(3, rawDir));
    let delta = dirStrength * 0.08;
    const hasChoice = choiceHits > 0;
    if (hasChoice)
        delta *= 1.15;
    score01 = clamp01(score01 + delta);
    // Confidence
    const poleCueCount = effectiveSpotHits + backHits + negatedSpotlightHits;
    const directional = Math.abs(rawDir);
    let confidence01 = 0.20;
    confidence01 += Math.min(0.35, poleCueCount * 0.08);
    confidence01 += Math.min(0.25, directional * 0.08);
    confidence01 += hasChoice ? 0.10 : 0;
    confidence01 = clamp01(confidence01);
    const cues = [];
    // Only emit spotlight cue for effective (non-negated) spotlight evidence.
    if (effectiveSpotHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.spotlightVsBackground.spotlight_terms",
            weight: +0.08 * effectiveSpotHits,
            text: "spotlight/visibility terms",
        });
    // Background cue includes explicit background terms and negated spotlight.
    if (backHits > 0 || negatedSpotlightHits > 0)
        cues.push({
            kind: "semantic",
            featureId: "IE.spotlightVsBackground.background_terms",
            weight: -0.08 * (backHits + negatedSpotlightHits),
            text: negatedSpotlightHits > 0 ? "background terms + negated spotlight" : "background/blend-in terms",
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
