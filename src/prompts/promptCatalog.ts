// src/prompts/promptCatalog.ts
import type { PromptId, PromptSpec } from "../domain/types.js";
/**
 * Prompt catalog keyed by promptId.
 * IMPORTANT: promptId is the canonical identifier you store on each capture.
 */
export const PROMPT_CATALOG: Record<PromptId, PromptSpec> = {
  // ======================
  // IE — SocialEnergyAxis
  // ======================
  "VK.IE.1A.v1": {
    id: "VK.IE.1A.v1",
    dimensionId: "IE",
    subAxisId: "groupSizePreference",
    variant: "A",
    version: "v1",
    text: "Bad night. You can wait it out in a packed room full of strangers, or in a quiet corner with one trusted person. Where do you go?",
  },
  "VK.IE.1B.v1": {
    id: "VK.IE.1B.v1",
    dimensionId: "IE",
    subAxisId: "groupSizePreference",
    variant: "B",
    version: "v1",
    text: "Your life is ending soon. Do you want a crowded room around you, or one person and silence?",
  },
  "VK.IE.1C.v1": {
    id: "VK.IE.1C.v1",
    dimensionId: "IE",
    subAxisId: "groupSizePreference",
    variant: "C",
    version: "v1",
    text: "At a party, do you work the room meeting many, or stay deep with one person you’re drawn to?",
  },

  "VK.IE.2A.v1": {
    id: "VK.IE.2A.v1",
    dimensionId: "IE",
    subAxisId: "initiatingConversation",
    variant: "A",
    version: "v1",
    text: "You’re the outsider at a new camp. Do you speak first to earn a place, or wait to be invited?",
  },
  "VK.IE.2B.v1": {
    id: "VK.IE.2B.v1",
    dimensionId: "IE",
    subAxisId: "initiatingConversation",
    variant: "B",
    version: "v1",
    text: "You feel invisible. Do you start a hard conversation today—or keep it inside and let time pass?",
  },
  "VK.IE.2C.v1": {
    id: "VK.IE.2C.v1",
    dimensionId: "IE",
    subAxisId: "initiatingConversation",
    variant: "C",
    version: "v1",
    text: "You spot someone attractive. Do you approach immediately, or wait for a clear opening?",
  },

  "VK.IE.3A.v1": {
    id: "VK.IE.3A.v1",
    dimensionId: "IE",
    subAxisId: "familiarityVsNovelty",
    variant: "A",
    version: "v1",
    text: "Scarcity hits. Do you stay loyal to your band, or travel to a new group for allies and options?",
  },
  "VK.IE.3B.v1": {
    id: "VK.IE.3B.v1",
    dimensionId: "IE",
    subAxisId: "familiarityVsNovelty",
    variant: "B",
    version: "v1",
    text: "Your current life is safe but small. Do you protect it—or risk everything for a new circle and a new self?",
  },
  "VK.IE.3C.v1": {
    id: "VK.IE.3C.v1",
    dimensionId: "IE",
    subAxisId: "familiarityVsNovelty",
    variant: "C",
    version: "v1",
    text: "Do you invest in one promising connection, or keep meeting new prospects to maximize your odds?",
  },

  "VK.IE.4A.v1": {
    id: "VK.IE.4A.v1",
    dimensionId: "IE",
    subAxisId: "speakingPace",
    variant: "A",
    version: "v1",
    text: "Someone screams in the dark. Do you give orders immediately as you think—or go quiet and decide first?",
  },
  "VK.IE.4B.v1": {
    id: "VK.IE.4B.v1",
    dimensionId: "IE",
    subAxisId: "speakingPace",
    variant: "B",
    version: "v1",
    text: "A friend asks what you truly believe about death. Do you answer as thoughts arrive—or pause until it’s clean?",
  },
  "VK.IE.4C.v1": {
    id: "VK.IE.4C.v1",
    dimensionId: "IE",
    subAxisId: "speakingPace",
    variant: "C",
    version: "v1",
    text: "On a first date, do you think out loud and riff—or choose words carefully and reveal yourself slowly?",
  },

  "VK.IE.5A.v1": {
    id: "VK.IE.5A.v1",
    dimensionId: "IE",
    subAxisId: "spotlightVsBackground",
    variant: "A",
    version: "v1",
    text: "After the hunt, credit is being assigned. Do you step forward and claim it—or let others take the story?",
  },
  "VK.IE.5B.v1": {
    id: "VK.IE.5B.v1",
    dimensionId: "IE",
    subAxisId: "spotlightVsBackground",
    variant: "B",
    version: "v1",
    text: "You get one chance to be known for something real. Do you take the stage—or stay private and unseen?",
  },
  "VK.IE.5C.v1": {
    id: "VK.IE.5C.v1",
    dimensionId: "IE",
    subAxisId: "spotlightVsBackground",
    variant: "C",
    version: "v1",
    text: "In a mixed group, do you lead the energy and be noticed—or stay subtle and let one person discover you?",
  },

  // ==========================
  // NS — KnowledgeApproachAxis
  // (lowLabel is N-leaning)
  // ==========================
  "VK.NS.1A.v1": {
    id: "VK.NS.1A.v1",
    dimensionId: "NS",
    subAxisId: "informationSource",
    variant: "A",
    version: "v1",
    text: "Fresh tracks—do you trust what you saw, or what the pattern suggests is ahead?",
  },
  "VK.NS.1B.v1": {
    id: "VK.NS.1B.v1",
    dimensionId: "NS",
    subAxisId: "informationSource",
    variant: "B",
    version: "v1",
    text: "A sign in your life: do you trust what you can prove, or what the pattern implies?",
  },
  "VK.NS.1C.v1": {
    id: "VK.NS.1C.v1",
    dimensionId: "NS",
    subAxisId: "informationSource",
    variant: "C",
    version: "v1",
    text: "Dating: do you trust what they do in front of you, or what you infer about who they are?",
  },

  "VK.NS.2A.v1": {
    id: "VK.NS.2A.v1",
    dimensionId: "NS",
    subAxisId: "timeOrientation",
    variant: "A",
    version: "v1",
    text: "Food today vs scouting tomorrow—what do you prioritize?",
  },
  "VK.NS.2B.v1": {
    id: "VK.NS.2B.v1",
    dimensionId: "NS",
    subAxisId: "timeOrientation",
    variant: "B",
    version: "v1",
    text: "Do you live for the moment, or for what your life could become?",
  },
  "VK.NS.2C.v1": {
    id: "VK.NS.2C.v1",
    dimensionId: "NS",
    subAxisId: "timeOrientation",
    variant: "C",
    version: "v1",
    text: "Do you pick the best partner now, or the one with the best long-term potential?",
  },

  "VK.NS.3A.v1": {
    id: "VK.NS.3A.v1",
    dimensionId: "NS",
    subAxisId: "cognitiveFocus",
    variant: "A",
    version: "v1",
    text: "After a raid: do you remember the exact details, or the ‘what it meant’?",
  },
  "VK.NS.3B.v1": {
    id: "VK.NS.3B.v1",
    dimensionId: "NS",
    subAxisId: "cognitiveFocus",
    variant: "B",
    version: "v1",
    text: "When something breaks, do you focus on the facts—or on what it says about your life?",
  },
  "VK.NS.3C.v1": {
    id: "VK.NS.3C.v1",
    dimensionId: "NS",
    subAxisId: "cognitiveFocus",
    variant: "C",
    version: "v1",
    text: "On a date: are you tracking specifics, or the vibe and the story underneath it?",
  },

  "VK.NS.4A.v1": {
    id: "VK.NS.4A.v1",
    dimensionId: "NS",
    subAxisId: "decisionConfidenceDriver",
    variant: "A",
    version: "v1",
    text: "Storm coming. Do you use the old rule that’s kept you alive, or a new theory you trust?",
  },
  "VK.NS.4B.v1": {
    id: "VK.NS.4B.v1",
    dimensionId: "NS",
    subAxisId: "decisionConfidenceDriver",
    variant: "B",
    version: "v1",
    text: "Do you build your life on what’s worked before—or on a vision that feels truer?",
  },
  "VK.NS.4C.v1": {
    id: "VK.NS.4C.v1",
    dimensionId: "NS",
    subAxisId: "decisionConfidenceDriver",
    variant: "C",
    version: "v1",
    text: "Do you follow dating ‘rules that work,’ or a personal philosophy about love you won’t betray?",
  },

  "VK.NS.5A.v1": {
    id: "VK.NS.5A.v1",
    dimensionId: "NS",
    subAxisId: "riskAssessmentFrame",
    variant: "A",
    version: "v1",
    text: "Unknown valley vs known route—do you take the sure thing or the uncertain chance?",
  },
  "VK.NS.5B.v1": {
    id: "VK.NS.5B.v1",
    dimensionId: "NS",
    subAxisId: "riskAssessmentFrame",
    variant: "B",
    version: "v1",
    text: "Do you choose security even if it’s small, or uncertainty even if it’s meaningful?",
  },
  "VK.NS.5C.v1": {
    id: "VK.NS.5C.v1",
    dimensionId: "NS",
    subAxisId: "riskAssessmentFrame",
    variant: "C",
    version: "v1",
    text: "Do you date the ‘safe bet,’ or the wild card with higher upside and unknown risk?",
  },

  // ======================
  // TF — DecisionStyleAxis
  // ======================
  "VK.TF.1A.v1": {
    id: "VK.TF.1A.v1",
    dimensionId: "TF",
    subAxisId: "feedbackAim",
    variant: "A",
    version: "v1",
    text: "Someone cheated the share. Do you enforce the rule—or protect the bond?",
  },
  "VK.TF.1B.v1": {
    id: "VK.TF.1B.v1",
    dimensionId: "TF",
    subAxisId: "feedbackAim",
    variant: "B",
    version: "v1",
    text: "A friend betrays you. Do you demand what’s fair—or rebuild trust first?",
  },
  "VK.TF.1C.v1": {
    id: "VK.TF.1C.v1",
    dimensionId: "TF",
    subAxisId: "feedbackAim",
    variant: "C",
    version: "v1",
    text: "A partner crosses a line. Do you set a fair boundary—or focus on repairing trust?",
  },

  "VK.TF.2A.v1": {
    id: "VK.TF.2A.v1",
    dimensionId: "TF",
    subAxisId: "fairnessFrame",
    variant: "A",
    version: "v1",
    text: "Same ration for all—or more for the weak and needed? Choose.",
  },
  "VK.TF.2B.v1": {
    id: "VK.TF.2B.v1",
    dimensionId: "TF",
    subAxisId: "fairnessFrame",
    variant: "B",
    version: "v1",
    text: "Same rule for everyone—or exceptions for context and history?",
  },
  "VK.TF.2C.v1": {
    id: "VK.TF.2C.v1",
    dimensionId: "TF",
    subAxisId: "fairnessFrame",
    variant: "C",
    version: "v1",
    text: "In dating: do you hold everyone to one standard—or tailor expectations to the person?",
  },

  "VK.TF.3A.v1": {
    id: "VK.TF.3A.v1",
    dimensionId: "TF",
    subAxisId: "conflictPosture",
    variant: "A",
    version: "v1",
    text: "Camp argument. Do you confront it openly—or quiet it before it spreads?",
  },
  "VK.TF.3B.v1": {
    id: "VK.TF.3B.v1",
    dimensionId: "TF",
    subAxisId: "conflictPosture",
    variant: "B",
    version: "v1",
    text: "Do you risk rupture to say what’s true—or keep peace and carry it?",
  },
  "VK.TF.3C.v1": {
    id: "VK.TF.3C.v1",
    dimensionId: "TF",
    subAxisId: "conflictPosture",
    variant: "C",
    version: "v1",
    text: "You disagree with your date. Do you debate it—or smooth it over to keep momentum?",
  },

  "VK.TF.4A.v1": {
    id: "VK.TF.4A.v1",
    dimensionId: "TF",
    subAxisId: "decisionDriver",
    variant: "A",
    version: "v1",
    text: "To lead the group: do you persuade with logic—or with loyalty and connection?",
  },
  "VK.TF.4B.v1": {
    id: "VK.TF.4B.v1",
    dimensionId: "TF",
    subAxisId: "decisionDriver",
    variant: "B",
    version: "v1",
    text: "When people resist you: do you convince them—or bond with them?",
  },
  "VK.TF.4C.v1": {
    id: "VK.TF.4C.v1",
    dimensionId: "TF",
    subAxisId: "decisionDriver",
    variant: "C",
    version: "v1",
    text: "Attraction: do you win them with reasons—or with emotional attunement?",
  },

  "VK.TF.5A.v1": {
    id: "VK.TF.5A.v1",
    dimensionId: "TF",
    subAxisId: "socialEvaluationFocus",
    variant: "A",
    version: "v1",
    text: "New recruit. Do you scan for weaknesses—or for what they’re good for?",
  },
  "VK.TF.5B.v1": {
    id: "VK.TF.5B.v1",
    dimensionId: "TF",
    subAxisId: "socialEvaluationFocus",
    variant: "B",
    version: "v1",
    text: "When you meet someone, do you see the cracks—or the promise?",
  },
  "VK.TF.5C.v1": {
    id: "VK.TF.5C.v1",
    dimensionId: "TF",
    subAxisId: "socialEvaluationFocus",
    variant: "C",
    version: "v1",
    text: "Dating: do you screen fast for red flags—or look first for green flags?",
  },

  // ======================
  // JP — ActionStrategyAxis
  // ======================
  "VK.JP.1A.v1": {
    id: "VK.JP.1A.v1",
    dimensionId: "JP",
    subAxisId: "commitmentStyle",
    variant: "A",
    version: "v1",
    text: "Winter’s coming: pick one camp now—or keep moving until you’re forced?",
  },
  "VK.JP.1B.v1": {
    id: "VK.JP.1B.v1",
    dimensionId: "JP",
    subAxisId: "commitmentStyle",
    variant: "B",
    version: "v1",
    text: "Do you choose one life path and commit—or keep doors open as long as possible?",
  },
  "VK.JP.1C.v1": {
    id: "VK.JP.1C.v1",
    dimensionId: "JP",
    subAxisId: "commitmentStyle",
    variant: "C",
    version: "v1",
    text: "Dating: exclusive now—or keep options open until you’re sure?",
  },

  "VK.JP.2A.v1": {
    id: "VK.JP.2A.v1",
    dimensionId: "JP",
    subAxisId: "planningStyle",
    variant: "A",
    version: "v1",
    text: "Raid plan: map it carefully—or move fast and adapt?",
  },
  "VK.JP.2B.v1": {
    id: "VK.JP.2B.v1",
    dimensionId: "JP",
    subAxisId: "planningStyle",
    variant: "B",
    version: "v1",
    text: "In crisis: do you plan, or act fast?",
  },
  "VK.JP.2C.v1": {
    id: "VK.JP.2C.v1",
    dimensionId: "JP",
    subAxisId: "planningStyle",
    variant: "C",
    version: "v1",
    text: "First date changes suddenly—do you stick to a plan, or pivot instantly?",
  },

  "VK.JP.3A.v1": {
    id: "VK.JP.3A.v1",
    dimensionId: "JP",
    subAxisId: "decisionTiming",
    variant: "A",
    version: "v1",
    text: "Before the hunt: choose the route now—or decide at the last safe moment?",
  },
  "VK.JP.3B.v1": {
    id: "VK.JP.3B.v1",
    dimensionId: "JP",
    subAxisId: "decisionTiming",
    variant: "B",
    version: "v1",
    text: "Do you decide early to stop the anxiety—or wait until the truth forces you?",
  },
  "VK.JP.3C.v1": {
    id: "VK.JP.3C.v1",
    dimensionId: "JP",
    subAxisId: "decisionTiming",
    variant: "C",
    version: "v1",
    text: "Do you define the relationship early—or let it stay undefined until it has to be defined?",
  },

  "VK.JP.4A.v1": {
    id: "VK.JP.4A.v1",
    dimensionId: "JP",
    subAxisId: "closurePreference",
    variant: "A",
    version: "v1",
    text: "Missing person: do you need an answer—or can you live with ‘unknown’?",
  },
  "VK.JP.4B.v1": {
    id: "VK.JP.4B.v1",
    dimensionId: "JP",
    subAxisId: "closurePreference",
    variant: "B",
    version: "v1",
    text: "Do you need closure to move on—or can you carry ambiguity?",
  },
  "VK.JP.4C.v1": {
    id: "VK.JP.4C.v1",
    dimensionId: "JP",
    subAxisId: "closurePreference",
    variant: "C",
    version: "v1",
    text: "Ghosted: do you demand an explanation—or accept silence and continue?",
  },

  "VK.JP.5A.v1": {
    id: "VK.JP.5A.v1",
    dimensionId: "JP",
    subAxisId: "approachToConstraints",
    variant: "A",
    version: "v1",
    text: "Strict camp rules: follow them—or bend them when survival demands it?",
  },
  "VK.JP.5B.v1": {
    id: "VK.JP.5B.v1",
    dimensionId: "JP",
    subAxisId: "approachToConstraints",
    variant: "B",
    version: "v1",
    text: "Do rules protect you—or trap you?",
  },
  "VK.JP.5C.v1": {
    id: "VK.JP.5C.v1",
    dimensionId: "JP",
    subAxisId: "approachToConstraints",
    variant: "C",
    version: "v1",
    text: "Dating norms: follow the script—or improvise and risk it?",
  },
};

/** Fetch a prompt spec (throws if unknown). */
export function getPromptSpec(id: PromptId): PromptSpec {
  const spec = PROMPT_CATALOG[id];
  if (!spec) throw new Error(`Unknown promptId: ${id}`);
  return spec;
}

/** List prompts, optionally filtered by dimension. */
export function listPrompts(dimensionId?: PromptSpec["dimensionId"]): PromptSpec[] {
  const all = Object.values(PROMPT_CATALOG);
  return dimensionId ? all.filter(p => p.dimensionId === dimensionId) : all;
}