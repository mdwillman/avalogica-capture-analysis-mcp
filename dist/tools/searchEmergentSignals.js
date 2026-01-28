// src/tools/searchEmergentSignals.ts
import { ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { ExaClient } from "../exaClient.js";
const exaClient = new ExaClient();
export const searchEmergentSignalsTool = {
    definition: {
        name: "search_emergent_signals",
        description: "...",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Natural language description of the need, problem, or topic to search for. Phrase it like a researcher looking for real-world examples.",
                },
                numResults: {
                    type: "number",
                    minimum: 1,
                    maximum: 10,
                    description: "How many results to retrieve (1–10). Defaults to 5 if omitted.",
                },
                resultCategory: {
                    type: "string",
                    description: "Optional Exa result category to filter by (e.g., 'company', 'research_paper', 'news_article', 'github', 'tweet').",
                    enum: [
                        "company",
                        "research_paper",
                        "news_article",
                        "pdf",
                        "github",
                        "tweet",
                        "personal_site",
                        "linkedin_profile",
                        "financial_report",
                    ],
                },
            },
            required: ["query"],
        },
    },
    handler: async (args) => {
        // --- Input validation ---
        if (!args ||
            typeof args !== "object" ||
            typeof args.query !== "string" ||
            !args.query.trim()) {
            throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for search_emergent_signals. Expected { query: string, numResults?: number, resultCategory?: string }.");
        }
        // --- Default 5, hard cap 10 ---
        let numResults = 5;
        if (args.numResults !== undefined) {
            if (typeof args.numResults !== "number" || Number.isNaN(args.numResults)) {
                throw new McpError(ErrorCode.InvalidParams, "numResults must be a number between 1 and 10 if provided.");
            }
            numResults = Math.min(10, Math.max(1, Math.floor(args.numResults)));
        }
        // --- Optional resultCategory ---
        let category;
        if (args.resultCategory !== undefined) {
            if (typeof args.resultCategory !== "string") {
                throw new McpError(ErrorCode.InvalidParams, "resultCategory must be a string if provided.");
            }
            const allowedCategories = new Set([
                "company",
                "research_paper",
                "news_article",
                "pdf",
                "github",
                "tweet",
                "personal_site",
                "linkedin_profile",
                "financial_report",
            ]);
            if (!allowedCategories.has(args.resultCategory)) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid resultCategory "${args.resultCategory}".`);
            }
            category = args.resultCategory;
        }
        try {
            const trimmedQuery = args.query.trim();
            console.error(`[AI Consumer Needs MCP] 🔍 search_emergent_signals query="${trimmedQuery}" numResults=${numResults} category=${category ?? "none"}`);
            // --- Build Exa Search payload with compact contents shape ---
            const exaPayload = {
                query: trimmedQuery,
                numResults,
                contents: {
                    summary: { query: trimmedQuery },
                    text: { maxCharacters: 800 },
                },
            };
            if (category) {
                exaPayload.category = category;
            }
            const exaRaw = await exaClient.post("/search", exaPayload);
            const rawResults = Array.isArray(exaRaw.results)
                ? exaRaw.results
                : [];
            // --- Compact + trimmed results ---
            const results = rawResults.map((r) => {
                const anyR = r;
                const rawText = anyR.text ?? r.text ?? null;
                const summary = anyR.summary ?? r.summary ?? null;
                return {
                    ...r,
                    summary,
                    textSnippet: rawText ? String(rawText).slice(0, 800) : null,
                };
            });
            const result = {
                endpoint: "search",
                query: trimmedQuery,
                results,
            };
            // --- Defensive payload trimming (cap ~20k chars) ---
            const MAX_CHARS = 20000;
            let payload = JSON.stringify(result);
            if (payload.length > MAX_CHARS) {
                for (const r of result.results) {
                    if (r.textSnippet && r.textSnippet.length > 400) {
                        r.textSnippet = r.textSnippet.slice(0, 400) + "…";
                    }
                }
                payload = JSON.stringify(result);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: payload,
                    },
                ],
            };
        }
        catch (error) {
            console.error("[AI Consumer Needs MCP] ❌ search_emergent_signals handler error:", error);
            const message = error instanceof Error
                ? error.message
                : "Unexpected error calling Exa search API.";
            throw new McpError(ErrorCode.InternalError, message);
        }
    },
};
