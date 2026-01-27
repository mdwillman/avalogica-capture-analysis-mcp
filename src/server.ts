import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import {
  getTechUpdateTool,
  listTechTopicsTool,
  searchEmergentSignalsTool,
  searchEdgeCommunitiesTool,
  findSimilarPagesTool,
  fetchPageContentsTool,
} from "./tools/index.js";
import {
  TechUpdateArgs,
  SearchEmergentSignalsArgs,
  SearchEdgeCommunitiesArgs,
  FindSimilarPagesArgs,
  FetchPageContentsArgs,
} from "./types.js";

/**
 * Main server class for Avalogica Consumer Needs MCP integration
 * @class ConsumerNeedsServer
 */
export class ConsumerNeedsServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'avalogica-consumer-needs',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Registers all MCP tool handlers for the Avalogica Consumer Needs MCP server.
   * @private
   */
  private setupHandlers(): void {
    // ---- List Available Tools ----
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        listTechTopicsTool.definition,
        getTechUpdateTool.definition,
        searchEmergentSignalsTool.definition,
        searchEdgeCommunitiesTool.definition,
        findSimilarPagesTool.definition,
        fetchPageContentsTool.definition,
      ],
    }));

    // ---- Handle Tool Calls ----
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "list_tech_topics": {
          return await listTechTopicsTool.handler({});
        }

        case "get_tech_update": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).topic !== "string" ||
            !(args as any).topic.trim()
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for get_tech_update. Expected { topic: string }."
            );
          }
          return await getTechUpdateTool.handler(args as unknown as TechUpdateArgs);
        }

        case "search_emergent_signals": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).query !== "string" ||
            !(args as any).query.trim()
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for search_emergent_signals. Expected { query: string, numResults?: number }."
            );
          }
          return await searchEmergentSignalsTool.handler(
            args as unknown as SearchEmergentSignalsArgs
          );
        }

        case "search_edge_communities": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).query !== "string" ||
            !(args as any).query.trim()
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for search_edge_communities. Expected { query: string, numResults?: number }."
            );
          }
          return await searchEdgeCommunitiesTool.handler(
            args as unknown as SearchEdgeCommunitiesArgs
          );
        }

        case "find_similar_pages": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).url !== "string" ||
            !(args as any).url.trim()
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for find_similar_pages. Expected { url: string, numResults?: number }."
            );
          }
          return await findSimilarPagesTool.handler(
            args as unknown as FindSimilarPagesArgs
          );
        }

        case "fetch_page_contents": {
          if (
            !args ||
            typeof args !== "object" ||
            typeof (args as any).url !== "string" ||
            !(args as any).url.trim()
          ) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid or missing arguments for fetch_page_contents. Expected { url: string, includeSubpages?: boolean }."
            );
          }
          return await fetchPageContentsTool.handler(
            args as unknown as FetchPageContentsArgs
          );
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  /**
   * Configures error handling and graceful shutdown
   * @private
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error(error);

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Returns the underlying MCP server instance
   * @returns {Server} MCP server instance
   */
  getServer(): Server {
    return this.server;
  }
}

/**
 * Factory function for creating standalone Avalogica Consumer Needs MCP server instances.
 * Used by HTTP transport for session-based connections.
 * @returns {Server} Configured MCP server instance
 */
export function createStandaloneServer(): Server {
  const server = new Server(
    {
      name: 'avalogica-consumer-needs-discovery',
      version: '0.2.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ---- List available tools ----
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      listTechTopicsTool.definition,
      getTechUpdateTool.definition,
      searchEmergentSignalsTool.definition,
      searchEdgeCommunitiesTool.definition,
    ],
  }));

  // ---- Handle tool calls ----
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "list_tech_topics": {
        return await listTechTopicsTool.handler({});
      }

      case "get_tech_update": {
        if (
          !args ||
          typeof args !== "object" ||
          typeof (args as any).topic !== "string" ||
          !(args as any).topic.trim()
        ) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid or missing arguments for get_tech_update. Expected { topic: string }."
          );
        }
        return await getTechUpdateTool.handler(args as unknown as TechUpdateArgs);
      }

      case "search_emergent_signals": {
        if (
          !args ||
          typeof args !== "object" ||
          typeof (args as any).query !== "string" ||
          !(args as any).query.trim()
        ) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid or missing arguments for search_emergent_signals. Expected { query: string, numResults?: number }."
          );
        }
        return await searchEmergentSignalsTool.handler(
          args as unknown as SearchEmergentSignalsArgs
        );
      }

      case "search_edge_communities": {
        if (
          !args ||
          typeof args !== "object" ||
          typeof (args as any).query !== "string" ||
          !(args as any).query.trim()
        ) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid or missing arguments for search_edge_communities. Expected { query: string, numResults?: number }."
          );
        }
        return await searchEdgeCommunitiesTool.handler(
          args as unknown as SearchEdgeCommunitiesArgs
        );
      }

      case "find_similar_pages": {
        if (
          !args ||
          typeof args !== "object" ||
          typeof (args as any).url !== "string" ||
          !(args as any).url.trim()
        ) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid or missing arguments for find_similar_pages. Expected { url: string, numResults?: number }."
          );
        }
        return await findSimilarPagesTool.handler(
          args as unknown as FindSimilarPagesArgs
        );
      }

      case "fetch_page_contents": {
        if (
          !args ||
          typeof args !== "object" ||
          typeof (args as any).url !== "string" ||
          !(args as any).url.trim()
        ) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "Invalid or missing arguments for fetch_page_contents. Expected { url: string, includeSubpages?: boolean }."
          );
        }
        return await fetchPageContentsTool.handler(
          args as unknown as FetchPageContentsArgs
        );
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  });

  return server;
}