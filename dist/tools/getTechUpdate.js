import { ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { NeedsClient } from "../needsClient.js";
import { resolveTopic, TOPIC_DEFINITIONS, listAllTopicKeys, } from "./topics.js";
function extractResponseText(response) {
    if (!response)
        return undefined;
    if (typeof response.output_text === "string" && response.output_text.trim()) {
        return response.output_text.trim();
    }
    if (Array.isArray(response.output)) {
        for (const block of response.output) {
            if (block.type === "message" && Array.isArray(block.content)) {
                for (const item of block.content) {
                    if (item.type === "output_text" && typeof item.text === "string" && item.text.trim()) {
                        return item.text.trim();
                    }
                }
            }
        }
    }
    if (response.data) {
        const nested = extractResponseText(response.data);
        if (nested)
            return nested;
    }
    if (response.tool_outputs) {
        const nested = extractResponseText(response.tool_outputs);
        if (nested)
            return nested;
    }
    return undefined;
}
function extractCitations(input, fallbackText) {
    const citations = [];
    const seen = new Set();
    const pushCitation = (label, url) => {
        if (!url || seen.has(url))
            return;
        citations.push({ label: label || url, url });
        seen.add(url);
    };
    const explore = (node) => {
        if (!node)
            return;
        if (Array.isArray(node)) {
            for (const item of node)
                explore(item);
            return;
        }
        if (typeof node === "object") {
            const record = node;
            if (typeof record.url === "string") {
                const label = (typeof record.label === "string" && record.label) ||
                    (typeof record.title === "string" && record.title) ||
                    (typeof record.name === "string" && record.name) ||
                    record.url;
                pushCitation(label, record.url);
            }
            if (Array.isArray(record.citations)) {
                for (const item of record.citations) {
                    if (typeof item === "object" && item !== null) {
                        const citationRecord = item;
                        if (typeof citationRecord.url === "string") {
                            const label = (typeof citationRecord.label === "string" && citationRecord.label) ||
                                (typeof citationRecord.title === "string" && citationRecord.title) ||
                                citationRecord.url;
                            pushCitation(label, citationRecord.url);
                        }
                    }
                }
            }
            for (const value of Object.values(record))
                explore(value);
        }
    };
    explore(input);
    if (citations.length === 0 && fallbackText) {
        const urlRegex = /(https?:\/\/[^\s)]+)(?![^\[]*\])/gi;
        let match;
        while ((match = urlRegex.exec(fallbackText)) !== null) {
            const url = match[1];
            pushCitation(url, url);
        }
    }
    return citations;
}
/**
 * helper: preview prompt template for given topic
 */
export function promptTemplatePreview(topic) {
    const topicDefinition = resolveTopic(topic);
    if (!topicDefinition) {
        console.error(`❌ Unknown topic: ${topic}`);
        console.info("Available topics:", listAllTopicKeys().join(", "));
        process.exit(1);
    }
    console.log(`\n🧠 Prompt template for topic: ${topicDefinition.title}\n`);
    console.log(topicDefinition.promptTemplate.trim());
    console.log("\n-----------------------------------------------\n");
}
export const getTechUpdateTool = {
    definition: {
        name: "get_tech_update",
        description: "Generate a concise, citation-rich update about recent developments in AI or technology for a specific topic.",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                topic: {
                    type: "string",
                    description: "Topic focus for the update. Supported values: aiProductUpdates, aiProducts, newModels, techResearch, polEthicsAndSafety, upcomingEvents.",
                },
            },
            required: ["topic"],
        },
    },
    handler: async (args) => {
        const topicDefinition = resolveTopic(args.topic);
        if (!topicDefinition) {
            throw new McpError(ErrorCode.InvalidParams, "Unsupported topic for get_tech_update. Choose one of: aiProductUpdates, aiProducts, newModels, techResearch, polEthicsAndSafety, upcomingEvents.");
        }
        const prompt = topicDefinition.promptTemplate.trim() +
            "\n\nAfter gathering any relevant information from search results, " +
            "compose a concise, structured summary following the format above. " +
            "Write your final response directly in natural language — do not return search references.";
        try {
            console.error(`[AI Consumer Needs MCP] 🔍 Invoked topic: ${topicDefinition.slug}`);
            const response = await new NeedsClient().createResponse({
                model: "gpt-4.1-2025-04-14",
                tools: [{ type: "web_search_preview" }],
                input: prompt,
            });
            const text = extractResponseText(response);
            if (!text) {
                throw new Error("OpenAI response did not include any textual content.");
            }
            const createdAt = Number.isFinite(response.created)
                ? new Date(response.created * 1000).toISOString()
                : new Date().toISOString();
            const citations = extractCitations(response.tool_outputs ?? response, text);
            const result = {
                topic: topicDefinition.slug,
                title: topicDefinition.title,
                description: topicDefinition.description,
                model: response.model ?? "gpt-4.1-2025-04-14",
                createdAt,
                content: text, // Markdown text from the assistant
                citations,
                fingerprint: "[served by avalogica-consumer-needs-mcp]",
            };
            console.error("[AI Consumer Needs MCP] 🧩 Extracted content preview:\n", text.slice(0, 200));
            // return as valid JSON text for Dedalus
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            console.error("[AI Consumer Needs MCP] ❌ Tech update handler error:", error);
            const message = error instanceof Error
                ? error.message
                : "Unexpected error calling OpenAI Responses API.";
            throw new McpError(ErrorCode.InternalError, message);
        }
    },
};
// allow command-line preview usage with metadata display
if (process.argv[1] && process.argv[1].includes("techUpdate.ts")) {
    const arg = process.argv[2];
    // 🧠 If a topic argument is provided, show its detailed metadata and prompt
    if (arg) {
        const topicDefinition = resolveTopic(arg);
        if (!topicDefinition) {
            console.error(`Unknown topic: ${arg}`);
            console.info("\nAvailable topics:\n");
            for (const topic of TOPIC_DEFINITIONS) {
                console.log(`• ${topic.slug} — ${topic.title}`);
            }
            process.exit(1);
        }
        console.log(`\nPrompt Template Preview for Topic: ${topicDefinition.title}`);
        console.log("===============================================");
        console.log(`Description: ${topicDefinition.description}`);
        console.log(`Slug: ${topicDefinition.slug}`);
        console.log(`Keywords: ${topicDefinition.keywords.join(", ")}`);
        console.log("\nPrompt Template:\n");
        console.log(topicDefinition.promptTemplate.trim());
        console.log("\n-----------------------------------------------\n");
    }
    // if no topic argument given, show list of all topics
    else {
        console.log("\nAvailable Topics\n===============================================");
        for (const topic of TOPIC_DEFINITIONS) {
            console.log(` ${topic.slug} — ${topic.title}`);
            console.log(` ${topic.description}`);
            console.log("");
        }
        console.log("Use: npm run preview:prompt <topic>");
        console.log("-----------------------------------------------\n");
    }
}
