// src/tools/findSimilarPages.ts

import {
  CallToolResult,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ExaClient } from "../exaClient.js";
import {
  ExaSearchResult,
  ExaSearchResponse,
  FindSimilarPagesArgs,
} from "../types.js";

const exaClient = new ExaClient();

export const findSimilarPagesTool = {
  definition: {
    name: "find_similar_pages",
    description:
      "Given a high-signal page (article, post, thread), find other web pages that are semantically similar. Use this to explore clusters of related needs, complaints, and examples.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The URL of a page that looks like a strong signal about a need or problem. The tool will find semantically similar pages.",
        },
        numResults: {
          type: "number",
          minimum: 1,
          maximum: 20,
          description:
            "How many similar pages to retrieve (1–20). Defaults to 10 if omitted.",
        },
      },
      required: ["url"],
    },
  },

  handler: async (args: FindSimilarPagesArgs): Promise<CallToolResult> => {
    if (
      !args ||
      typeof args !== "object" ||
      typeof args.url !== "string" ||
      !args.url.trim()
    ) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Invalid or missing arguments for find_similar_pages. Expected { url: string, numResults?: number }."
      );
    }

    let numResults = 10;
    if (args.numResults !== undefined) {
      if (typeof args.numResults !== "number" || Number.isNaN(args.numResults)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "numResults must be a number between 1 and 20 if provided."
        );
      }
      numResults = Math.min(20, Math.max(1, Math.floor(args.numResults)));
    }

    try {
      const trimmedUrl = args.url.trim();
      console.error(
        `[AI Consumer Needs MCP] 🔍 find_similar_pages url="${trimmedUrl}" numResults=${numResults}`
      );

      const exaRaw = await exaClient.post("/findsimilar", {
        url: trimmedUrl,
        numResults,
        num_results: numResults,
        text: true,
      });

      const results: ExaSearchResult[] = Array.isArray(exaRaw.results)
        ? (exaRaw.results as ExaSearchResult[])
        : [];

      const result: ExaSearchResponse = {
        endpoint: "findsimilar",
        query: trimmedUrl,
        results,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(
        "[AI Consumer Needs MCP] ❌ find_similar_pages handler error:",
        error
      );
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error calling Exa findsimilar API.";
      throw new McpError(ErrorCode.InternalError, message);
    }
  },
};