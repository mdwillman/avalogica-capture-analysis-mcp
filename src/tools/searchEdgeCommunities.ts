// src/tools/searchEdgeCommunities.ts

import {
  CallToolResult,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ExaClient } from "../exaClient.js";
import {
  ExaSearchResponse,
  ExaSearchResult,
  SearchEdgeCommunitiesArgs,
} from "../types.js";

const exaClient = new ExaClient();

export const searchEdgeCommunitiesTool = {
  definition: {
    name: "search_edge_communities",
    description:
      "Search early-adopter communities (e.g., Reddit, Hacker News, niche forums, GitHub) for complaints, hacked workflows, and 'somebody please build this' posts. Use this when you want raw, ground-level signals about unmet needs.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Description of the need, frustration, or workflow to investigate among early adopters (e.g., 'small business owners frustrated with AI agents for bookkeeping').",
        },
        numResults: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description:
            "How many community posts/pages to retrieve (1–10). Defaults to 5 if omitted.",
        },
      },
      required: ["query"],
    },
  },

  handler: async (args: SearchEdgeCommunitiesArgs): Promise<CallToolResult> => {
    // --- Input validation ---
    if (
      !args ||
      typeof args !== "object" ||
      typeof args.query !== "string" ||
      !args.query.trim()
    ) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Invalid or missing arguments for search_edge_communities. Expected { query: string, numResults?: number }."
      );
    }

    // --- Default 5, hard cap 10 ---
    let numResults = 5;
    if (args.numResults !== undefined) {
      if (typeof args.numResults !== "number" || Number.isNaN(args.numResults)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "numResults must be a number between 1 and 10 if provided."
        );
      }
      numResults = Math.min(10, Math.max(1, Math.floor(args.numResults)));
    }

    try {
      const trimmedQuery = args.query.trim();
      console.error(
        `[AI Consumer Needs MCP] 🔍 search_edge_communities query="${trimmedQuery}" numResults=${numResults}`
      );

      // --- Exa search focused on edge/early-adopter domains ---
      const exaRaw = await exaClient.post("/search", {
        query: trimmedQuery,
        numResults,
        contents: {
          summary: { query: trimmedQuery },
          text: { maxCharacters: 800 },
        },
        includeDomains: [
          "reddit.com",
          "news.ycombinator.com",
          "github.com",
          "lobste.rs",
        ],
      });

      const rawResults = Array.isArray(exaRaw.results)
        ? (exaRaw.results as ExaSearchResult[])
        : [];

      // --- Compact + trimmed results ---
      const results: ExaSearchResult[] = rawResults.map((r) => {
        const anyR = r as any;
        const rawText = anyR.text ?? r.text ?? null;
        const summary = anyR.summary ?? r.summary ?? null;

        return {
          ...r,
          summary,
          textSnippet: rawText ? String(rawText).slice(0, 800) : null,
        };
      });

      const result: ExaSearchResponse = {
        endpoint: "search_edge_communities",
        query: trimmedQuery,
        results,
      };

      // --- Defensive total payload trimming (cap ~20k chars) ---
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
    } catch (error) {
      console.error(
        "[AI Consumer Needs MCP] ❌ search_edge_communities handler error:",
        error
      );
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error calling Exa search API.";
      throw new McpError(ErrorCode.InternalError, message);
    }
  },
};