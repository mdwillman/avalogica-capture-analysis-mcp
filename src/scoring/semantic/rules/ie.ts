// src/scoring/semantic/rules/ie.ts
// Deterministic semantic scoring rules for IE (Social Energy) sub-axes.
// Convention: score01=0 => lowLabel pole, score01=1 => highLabel pole.

import type { PromptSpec, IESubAxisId, PromptType } from "../../../domain/index.js";
import { assertNever } from "../../../domain/index.js";
import type { SubAxisScore } from "../../types.js";
import { analyzeTextForScoring } from "./utils.js";
import { effectiveHits } from "../operators/index.js";

type LegacyResult = { score01: number; confidence01: number; cues: any[] };

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

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * IE.energyDirection
 * lowLabel: Prefers intimate settings
 * highLabel: Thrives in crowds
 */
export function scoreIEEnergyDirection(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
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

  const countHits = (terms: string[]): number =>
    terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);

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
  if (hasChoice) delta *= 1.15;

  score01 = clamp01(score01 + delta);

  // Confidence: based on evidence quantity + directionality
  const poleCueCount = crowdHits + intimateHits;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.20;
  confidence01 += Math.min(0.35, poleCueCount * 0.08);
  confidence01 += Math.min(0.25, directional * 0.08);
  confidence01 += hasChoice ? 0.10 : 0;

  // If transcript is strongly negative overall, reduce confidence slightly (could be stress talk rather than preference)
  if (negHits >= 2 && posHits === 0) confidence01 -= 0.05;

  confidence01 = clamp01(confidence01);

  const cues: any[] = [];
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
 * IE.processingHabitat
 * lowLabel: Warms up gradually
 * highLabel: Breaks the ice quickly
 */
export function scoreIEProcessingHabitat(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
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

  const countHits = (terms: string[]): number =>
    terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);

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
  if (hasChoice) delta *= 1.15;

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

  const cues: any[] = [];
  if (effectiveInitHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.processingHabitat.initiate_terms",
      weight: +0.08 * effectiveInitHits,
      text: "initiation terms",
    });
  if (waitHits > 0 || negatedInitiationHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.processingHabitat.wait_watch_terms",
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
 * IE.visibilityRelationship
 * lowLabel: Prefers familiar company
 * highLabel: Enjoys meeting new people
 */
export function scoreIEVisibilityRelationship(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
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

  const countHits = (terms: string[]): number =>
    terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);

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
    if (idx === -1) continue;
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
  if (hasChoice) delta *= 1.15;

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

  const cues: any[] = [];
  if (effectiveNoveltyHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.visibilityRelationship.novelty_terms",
      weight: +0.08 * effectiveNoveltyHits,
      text: "novelty/new-people terms",
    });
  if (familiarHits > 0 || negatedNoveltyHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.visibilityRelationship.familiar_terms",
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
 * IE.connectionEconomics
 * lowLabel: Thinks, then speaks
 * highLabel: Thinks out loud
 *
 * Semantic-only version with support for IE.4A crisis prompt:
 * - "go quiet / pause / assess / decide first" => low
 * - "give orders immediately / direct as I think" => high
 */
export function scoreIEConnectionEconomics(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
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

  const countIncludes = (phrases: string[]): number =>
    phrases.reduce((acc, p) => (t.includes(p) ? acc + 1 : acc), 0);

  const countOccurrences = (needle: string): number => {
    let idx = 0;
    let c = 0;
    while (true) {
      idx = t.indexOf(needle, idx);
      if (idx === -1) break;
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
    if (idx === -1) continue;
    const windowStart = Math.max(0, idx - 60);
    const before = t.slice(windowStart, idx);
    if (negators.some((n) => before.includes(n))) negatedDirectHits += 1;
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

  if (raw.trim().length < 40) confidence01 -= 0.06;
  confidence01 = clamp01(confidence01);

  const cues: any[] = [];
  if (highPhraseHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.connectionEconomics.think_out_loud_phrase",
      weight: +0.21 * highPhraseHits,
      text: "explicit think-out-loud phrasing",
    });
  if (lowPhraseHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.connectionEconomics.think_then_speak_phrase",
      weight: -0.21 * lowPhraseHits,
      text: "explicit think-then-speak phrasing",
    });
  if (effectiveDirectHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.connectionEconomics.direct_as_you_think_terms",
      weight: +0.14 * effectiveDirectHits,
      text: "direct/announce-immediately terms",
    });
  if (quietHits > 0 || negatedDirectHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.connectionEconomics.quiet_first_terms",
      weight: -0.14 * (quietHits + negatedDirectHits),
      text: negatedDirectHits > 0 ? "quiet-first terms + negated directness" : "quiet-first terms",
    });
  if (fillerHits + repairHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.connectionEconomics.self_repairs_fillers",
      weight: +0.02 * Math.min(10, fillerHits + repairHits),
      text: "fillers/repairs",
    });

  return { score01, confidence01, cues };
}

/**
 * IE.restorationSignature
 * lowLabel: Prefers to blend in
 * highLabel: Enjoys being seen
 */
export function scoreIERestorationSignature(transcriptRaw: string): {
  score01: number;
  confidence01: number;
  cues: any[];
} {
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

  const countHits = (terms: string[]): number =>
    terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);

  const rawSpotHits = countHits(spotlight);
  const backHits = countHits(background);
  const choiceHits = countHits(choice);

  // Negation handling: if they negate a spotlight phrase, treat it as background evidence.
  let negatedSpotlightHits = 0;
  for (const phrase of spotlight) {
    const idx = t.indexOf(phrase);
    if (idx === -1) continue;
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
  if (hasChoice) delta *= 1.15;

  score01 = clamp01(score01 + delta);

  // Confidence
  const poleCueCount = effectiveSpotHits + backHits + negatedSpotlightHits;
  const directional = Math.abs(rawDir);

  let confidence01 = 0.20;
  confidence01 += Math.min(0.35, poleCueCount * 0.08);
  confidence01 += Math.min(0.25, directional * 0.08);
  confidence01 += hasChoice ? 0.10 : 0;
  confidence01 = clamp01(confidence01);

  const cues: any[] = [];

  // Only emit spotlight cue for effective (non-negated) spotlight evidence.
  if (effectiveSpotHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.restorationSignature.spotlight_terms",
      weight: +0.08 * effectiveSpotHits,
      text: "spotlight/visibility terms",
    });

  // Background cue includes explicit background terms and negated spotlight.
  if (backHits > 0 || negatedSpotlightHits > 0)
    cues.push({
      kind: "semantic",
      featureId: "IE.restorationSignature.background_terms",
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

/**
 * Prompt-type-aware IE scorer entry point.
 * Transitional version: energyDirection uses the new architecture; other sub-axes delegate to the legacy rules above.
 */
export function scoreIESubAxis(params: { transcript: string; prompt: PromptSpec }): SubAxisScore {
  const { transcript, prompt } = params;
  if (prompt.dimensionId !== "IE") {
    throw new Error(`scoreIESubAxis called with non-IE prompt (${prompt.dimensionId})`);
  }

  const subAxisId = prompt.subAxisId as IESubAxisId;
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
      return wrapLegacySubAxisResult("processingHabitat", scoreIEProcessingHabitat, transcript);
    case "visibilityRelationship":
      return wrapLegacySubAxisResult("visibilityRelationship", scoreIEVisibilityRelationship, transcript);
    case "connectionEconomics":
      return wrapLegacySubAxisResult("connectionEconomics", scoreIEConnectionEconomics, transcript);
    case "restorationSignature":
      return wrapLegacySubAxisResult("restorationSignature", scoreIERestorationSignature, transcript);
    default:
      return assertNever(subAxisId as never, "Unhandled IE sub-axis");
  }
}

function wrapLegacySubAxisResult(
  subAxisId: IESubAxisId,
  scorer: (transcriptRaw: string) => LegacyResult,
  transcript: string
): SubAxisScore {
  const res = scorer(transcript);
  return {
    subAxisId,
    score01: res.score01,
    confidence01: res.confidence01,
    cues: res.cues ?? [],
  };
}

function scoreEnergyDirectionByPromptType(transcript: string, promptType: PromptType): SubAxisScore {
  switch (promptType) {
    case "freeRecall":
      return scoreEnergyDirectionFreeRecall(transcript);
    case "openInterpretation":
      return scoreEnergyDirectionOpenInterpretation(transcript);
    case "microDecision":
      return scoreEnergyDirectionMicroDecision(transcript);
    case "errorDetection":
      return scoreEnergyDirectionErrorDetection(transcript);
    case "projectionContinuation":
      return scoreEnergyDirectionProjectionContinuation(transcript);
    default:
      return wrapLegacySubAxisResult("energyDirection", scoreIEEnergyDirection, transcript);
  }
}

function scoreEnergyDirectionFreeRecall(transcriptRaw: string): SubAxisScore {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();

  const firstMention = firstFragment(primary);
  const participatorySocialHits = countRegexHits(primary, SOCIAL_PARTICIPATION_PATTERNS);
  const observationalSocialHits = countRegexHits(primary, OBSERVATIONAL_SOCIAL_PATTERNS);
  const solitudeHits = countMatches(primary, SOLITUDE_REFERENCE_TERMS);
  const thresholdHits = countMatches(primary, THRESHOLD_TERMS);
  const firstThresholdHits = countMatches(firstMention, THRESHOLD_TERMS) > 0 ? 1 : 0;
  const firstParticipatory = countRegexHits(firstMention, SOCIAL_PARTICIPATION_PATTERNS) > 0 ? 1 : 0;
  const firstObservational = countRegexHits(firstMention, OBSERVATIONAL_SOCIAL_PATTERNS) > 0 ? 1 : 0;
  const activationHits = countMatches(primary, ACTIVATION_TERMS);
  const depletionHits = countMatches(primary, DEPLETION_TERMS);

  let score = 0.5;
  score += participatorySocialHits * 0.09;
  score -= Math.min(0.12, (thresholdHits + firstThresholdHits) * 0.05);
  score -= Math.min(0.1, solitudeHits * 0.04);
  score += firstParticipatory * 0.04;
  score += firstObservational * 0.01;
  const observationalAdjustment = Math.min(0.02, observationalSocialHits * 0.01);
  score += observationalAdjustment;

  let activationWeight = (activationHits - depletionHits) * 0.05;
  if (participatorySocialHits === 0) activationWeight *= 0.4;
  score += activationWeight;

  const cues: any[] = [];
  if (participatorySocialHits > 0 || firstParticipatory > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.freeRecall.participatory_social_reference",
      weight: +0.09 * Math.max(1, participatorySocialHits + firstParticipatory),
      text: "recall leans toward joining or engaging with others",
    });
  }
  if (observationalSocialHits > 0 || firstObservational > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.freeRecall.observational_social_reference",
      weight: observationalAdjustment,
      text: "notes people from a distance / observational stance",
    });
  }
  if (thresholdHits > 0 || firstThresholdHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.freeRecall.threshold_or_buffer_space_salience",
      weight: -0.05 * (thresholdHits + firstThresholdHits),
      text: firstThresholdHits
        ? "first recall highlights hallway/edge space"
        : "describes buffer / threshold areas",
    });
  }
  if (solitudeHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.freeRecall.solitude_preference_language",
      weight: -0.04 * solitudeHits,
      text: "mentions solitude/quiet comforts",
    });
  }
  if (activationWeight !== 0) {
    cues.push({
      kind: "semantic",
      featureId: activationWeight >= 0
        ? "IE.energyDirection.freeRecall.interaction_seeking_language"
        : "IE.energyDirection.freeRecall.depletion_language",
      weight: activationWeight,
      text: activationWeight >= 0 ? "energized social language" : "depletion/downshift language",
    });
  }

  const totalSignals =
    participatorySocialHits +
    observationalSocialHits +
    thresholdHits +
    firstThresholdHits +
    solitudeHits +
    activationHits +
    depletionHits +
    firstParticipatory +
    firstObservational;
  const confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.28, 0.05);

  return buildEnergyDirectionScore(score, confidence, cues);
}

function scoreEnergyDirectionOpenInterpretation(transcriptRaw: string): SubAxisScore {
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

  const cues: any[] = [];
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

function scoreEnergyDirectionMicroDecision(transcriptRaw: string): SubAxisScore {
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

  const cues: any[] = [];
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

  const totalSignals =
    socialChoiceHits + solitudeChoiceHits + rejectPeopleHits + decompressionHits + socialDesireHits;
  let confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.33, 0.07);
  confidence = clamp01(confidence + Math.min(0.12, decisiveHits * 0.025));

  return buildEnergyDirectionScore(score, confidence, cues);
}

function scoreEnergyDirectionErrorDetection(transcriptRaw: string): SubAxisScore {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();

  const overloadHits = countMatches(primary, ERROR_OVERLOAD_TERMS);
  const isolationHits = countMatches(primary, ERROR_ISOLATION_TERMS);
  const boundaryHits = countMatches(primary, SOLITUDE_REFERENCE_TERMS);

  let score = 0.5;
  score += (isolationHits - overloadHits) * 0.12;
  score -= boundaryHits * 0.02; // noticing lack of privacy tilts introvert

  const cues: any[] = [];
  if (overloadHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.errorDetection.crowd_overload_language",
      weight: -0.12 * overloadHits,
      text: "flags overstimulation / too much crowd",
    });
  }
  if (isolationHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.errorDetection.interaction_gap_language",
      weight: +0.12 * isolationHits,
      text: "flags lack of connection / empty scene",
    });
  }
  if (boundaryHits > 0) {
    cues.push({
      kind: "semantic",
      featureId: "IE.energyDirection.errorDetection.boundary_need_language",
      weight: -0.02 * boundaryHits,
      text: "calls out privacy/boundary gap",
    });
  }

  const totalSignals = overloadHits + isolationHits + boundaryHits;
  const confidence = energyConfidence(totalSignals, analysis.confidenceMultiplier, 0.30, 0.06);

  return buildEnergyDirectionScore(score, confidence, cues);
}

function scoreEnergyDirectionProjectionContinuation(transcriptRaw: string): SubAxisScore {
  const analysis = analyzeTextForScoring(transcriptRaw || "");
  const primary = (analysis.primaryText || transcriptRaw || "").toLowerCase();

  const socialFutureHits = countMatches(primary, CONTINUATION_SOCIAL_TERMS);
  const solitudeFutureHits = countMatches(primary, CONTINUATION_SOLITUDE_TERMS);
  const activationHits = countMatches(primary, ACTIVATION_TERMS);
  const depletionHits = countMatches(primary, DEPLETION_TERMS);

  let score = 0.5;
  score += (socialFutureHits - solitudeFutureHits) * 0.15;
  score += (activationHits - depletionHits) * 0.04;

  const cues: any[] = [];
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
      featureId:
        activationWeight >= 0
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

function buildEnergyDirectionScore(score: number, confidence: number, cues: any[]): SubAxisScore {
  return {
    subAxisId: "energyDirection",
    score01: clamp01(score),
    confidence01: clamp01(confidence),
    cues,
  };
}

function energyConfidence(totalSignalHits: number, multiplier: number, base = 0.25, perSignal = 0.05): number {
  const raw = base + Math.min(0.45, totalSignalHits * perSignal);
  return clamp01(raw * multiplier);
}

function countMatches(text: string, phrases: string[]): number {
  const normalized = text || "";
  let hits = 0;
  for (const phrase of phrases) {
    if (!phrase) continue;
    if (normalized.includes(phrase)) hits += 1;
  }
  return hits;
}

function countRegexHits(text: string, patterns: RegExp[]): number {
  const normalized = text || "";
  let hits = 0;
  for (const pattern of patterns) {
    if (pattern.test(normalized)) {
      hits += 1;
    }
  }
  return hits;
}

function firstFragment(text: string): string {
  const normalized = (text || "").trim();
  if (!normalized) return "";
  const parts = normalized.split(/[\n\.!?]/).map((part) => part.trim()).filter(Boolean);
  return parts[0] ?? normalized;
}
