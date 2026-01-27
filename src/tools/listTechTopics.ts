import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { TOPIC_DEFINITIONS } from "./topics.js";

interface ListTechTopicsArgs {
  includeKeywords?: boolean;
}

export const listTechTopicsTool = {
  definition: {
    name: "list_tech_topics",
    description:
      "List all available tech update topics that can be used with the get_tech_update tool.",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        includeKeywords: {
          type: "boolean",
          description:
            "If true, include keyword aliases for each topic. Defaults to false.",
        },
      },
      additionalProperties: false,
    },
  },

  handler: async (
    args: ListTechTopicsArgs = {}
  ): Promise<CallToolResult> => {
    const includeKeywords = Boolean(args.includeKeywords);

    const topics = TOPIC_DEFINITIONS.map(
      ({ slug, title, description, keywords }) => ({
        slug,
        title,
        description,
        ...(includeKeywords ? { keywords } : {}),
      })
    );

    const payload = {
      topics,
      fingerprint: "[served by avalogica-ai-news-mcp]",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  },
};