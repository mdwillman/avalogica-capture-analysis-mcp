// src/tools/fetchPageContents.ts
import { ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { ExaClient } from "../exaClient.js";
const exaClient = new ExaClient();
export const fetchPageContentsTool = {
    definition: {
        name: "fetch_page_contents",
        description: "Fetch the full cleaned text of a specific URL (and optionally a few subpages) so the agent can deeply analyze, extract pain points, or summarize.",
        inputSchema: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The URL whose full content should be retrieved and cleaned.",
                },
                includeSubpages: {
                    type: "boolean",
                    description: "Whether to include a small number of subpages (e.g., 3–5) for additional context. Defaults to false.",
                },
            },
            required: ["url"],
        },
    },
    handler: async (args) => {
        if (!args ||
            typeof args !== "object" ||
            typeof args.url !== "string" ||
            !args.url.trim()) {
            throw new McpError(ErrorCode.InvalidParams, "Invalid or missing arguments for fetch_page_contents. Expected { url: string, includeSubpages?: boolean }.");
        }
        const includeSubpages = args.includeSubpages !== undefined ? Boolean(args.includeSubpages) : false;
        try {
            const trimmedUrl = args.url.trim();
            console.error(`[AI Consumer Needs MCP] 🔍 fetch_page_contents url="${trimmedUrl}" includeSubpages=${includeSubpages}`);
            const exaRaw = await exaClient.post("/contents", {
                ids: [trimmedUrl],
                text: true,
                subpages: includeSubpages ? 5 : 0,
            });
            const result = {
                endpoint: "contents",
                url: trimmedUrl,
                includeSubpages,
                ...exaRaw,
            };
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
            console.error("[AI Consumer Needs MCP] ❌ fetch_page_contents handler error:", error);
            const message = error instanceof Error
                ? error.message
                : "Unexpected error calling Exa contents API.";
            throw new McpError(ErrorCode.InternalError, message);
        }
    },
};
