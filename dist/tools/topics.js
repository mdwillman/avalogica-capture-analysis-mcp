export const TOPIC_DEFINITIONS = [
    {
        slug: "aiProductUpdates",
        title: "AI Product & Platform Updates",
        description: "Recent improvements or new features added to existing AI products or platforms.",
        promptTemplate: `
Generate a concise, formatted news-style update about recent improvements to AI products or platforms.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a new line under the header
3. 1–4 sections marked with clear level 3 headers
4. Each section highlights one notable update from a leading company, startup, or lab

Special Requirements:
- Prioritize developments from the past month
- Focus on performance improvements, new capabilities, and usability upgrades
- Use no more than 8 reputable sources
- If there are no notable updates this month, summarize key enhancements from the recent past
- Target an audience of AI developers and builders
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
        keywords: ["aiproductupdates", "productupdates", "platformupdates", "aiproduct"],
    },
    {
        slug: "aiProducts",
        title: "AI Products",
        description: "AI-driven tools or services recently launched.",
        promptTemplate: `
Generate a concise, formatted tech update about recently launched AI-powered products or platforms.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 1–4 sections with clear level 3 headers
4. Each section describes one or more launches from major companies, startups, or labs

Special Requirements:
- Prioritize releases within the past month
- Highlight unique capabilities or applications relevant to AI developers
- Avoid general consumer summaries
- Use no more than 8 reputable sources
- If no major launches occurred this month, mention noteworthy product releases from the past quarter instead
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
        keywords: ["aiproducts", "newaiproducts", "aiproductlaunches"],
    },
    {
        slug: "newModels",
        title: "New AI Model Releases",
        description: "Fresh releases of base or fine-tuned AI models and platform capabilities.",
        promptTemplate: `
Generate a concise, formatted update on newly released AI models and significant fine-tunes.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 1–4 sections with clear level 3 headers using the model or family name
4. Each section summarizes the releasing organization, key capabilities, and practical implications

Special Requirements:
- Prioritize models released or announced in the past month
- Emphasize benchmark results, training or architecture innovations, and deployment notes
- Include parameter counts or model families when relevant (e.g., "Llama 4 70B")
- Use no more than 8 reputable sources
- If there are no major releases this month, highlight notable models from the past quarter instead
- Target an audience of AI researchers and engineers
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
        keywords: ["newmodels", "modelrelease", "modelreleases", "latestmodels"],
    },
    {
        slug: "techResearch",
        title: "AI & Tech Research Highlights",
        description: "Notable research publications, benchmarks, and open-source releases in AI and adjacent fields.",
        promptTemplate: `
Generate a concise, formatted research update covering notable AI and tech papers, benchmarks, or open-source releases.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 2–4 sections with level 3 headers using the paper, project, or benchmark name
4. Each section summarizes the core idea, key results, and implications for practitioners

Special Requirements:
- Prioritize work published, accepted, or widely discussed in the past month (e.g., major conferences, arXiv, respected blogs)
- Highlight quantitative performance where available (benchmark scores, efficiency gains, or robustness metrics)
- Prefer work with open-source code, models, or datasets when possible
- Use no more than 8 reputable sources
- If there are few notable items this month, include influential work from the recent past that is still shaping practice
- Target an audience of applied ML researchers and senior engineers
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
        keywords: ["techresearch", "airesearch", "researchupdates", "mlresearch"],
    },
    {
        slug: "polEthicsAndSafety",
        title: "Policy, Ethics & Safety",
        description: "Developments in AI regulation, governance frameworks, safety tooling, and ethical debates.",
        promptTemplate: `
Generate a concise, formatted briefing on recent developments in AI policy, governance, ethics, and safety.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 2–4 sections with level 3 headers grouped by theme (e.g., "Regulation", "Safety Tooling", "Governance & Standards")
4. Each section summarizes one or more concrete developments, decisions, or proposals

Special Requirements:
- Prioritize actions or announcements from the past month (laws, regulatory guidance, government strategies, industry frameworks)
- Maintain a neutral, factual tone and avoid advocacy language
- Clearly distinguish between binding regulation, voluntary commitments, and open proposals
- Use no more than 8 reputable sources (official documents, major outlets, leading organizations)
- If there are few new developments this month, recap the most impactful changes from the recent past
- Target an audience of AI leaders, policy-minded engineers, and compliance teams
- Include inline numeric citations [1], [2], etc., linked to credible references
`,
        keywords: ["polethicsandsafety", "policyethics", "polsafety"],
    },
    {
        slug: "upcomingEvents",
        title: "Upcoming AI & Tech Events",
        description: "Major conferences, product showcases, and community gatherings worth tracking.",
        promptTemplate: `
Generate a concise, formatted preview of notable upcoming AI and tech events.
Follow this structure:
1. Level 2 header for the topic
2. Today's date in bold on a separate line under the header
3. 3–6 sections with level 3 headers using the event name
4. Each section lists the dates, location (or "virtual"), main focus areas, and why it matters for practitioners

Special Requirements:
- Focus on events happening within the next 3 months
- Mix major conferences with at most a couple of focused summits or community gatherings
- Include links to official event pages, CFPs, or agendas where available
- Use no more than 8 reputable sources
- If there are very few events in the next 3 months, include the next major conference(s) slightly beyond that window
- Target an audience of practitioners planning talks, attendance, or launches
- Include inline numeric citations [1], [2], etc., linked to official event sources
`,
        keywords: ["upcomingevents", "aievents", "techevents"],
    },
];
const topicIndex = new Map();
for (const topic of TOPIC_DEFINITIONS) {
    for (const keyword of topic.keywords) {
        topicIndex.set(keyword, topic);
    }
    topicIndex.set(topic.slug.toLowerCase(), topic);
}
function normalizeTopicKey(topic) {
    return topic.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
export function resolveTopic(topic) {
    return topicIndex.get(normalizeTopicKey(topic));
}
export function listAllTopicKeys() {
    return [...topicIndex.keys()];
}
