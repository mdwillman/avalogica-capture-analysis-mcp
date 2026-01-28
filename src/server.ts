import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Main server class for Avalogica Capture Analysis MCP integration.
 *
 * For now, this MCP server exposes no tools. The product-facing functionality
 * will be the HTTP endpoints (e.g., /v1/captures:*). MCP tools can be added later
 * for operator workflows (re-run analysis, debug features, etc.).
 */
export class CaptureAnalysisServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'avalogica-capture-analysis',
        version: '0.1.0',
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
   * Registers MCP handlers.
   * @private
   */
  private setupHandlers(): void {
    // ---- List Available Tools ----
    // Stub: no MCP tools exposed yet.
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [],
    }));

    // ---- Handle Tool Calls ----
    // Stub: if a client attempts to call a tool, respond with MethodNotFound.
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name } = request.params;

      throw new McpError(
        ErrorCode.MethodNotFound,
        `No tools are currently exposed by this server. Unknown tool: ${name}`
      );
    });
  }

  /**
   * Configures error handling and graceful shutdown.
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
   * Returns the underlying MCP server instance.
   * @returns {Server} MCP server instance
   */
  getServer(): Server {
    return this.server;
  }
}

/**
 * Backwards-compatible export name (template code may still import ConsumerNeedsServer).
 * We'll remove this alias once all references are renamed.
 */
export { CaptureAnalysisServer as ConsumerNeedsServer };

/**
 * Factory function for creating standalone MCP server instances.
 * Used by HTTP transport for session-based connections.
 * @returns {Server} Configured MCP server instance
 */
export function createStandaloneServer(): Server {
  const server = new Server(
    {
      name: 'avalogica-capture-analysis-session',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ---- List available tools ----
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [],
  }));

  // ---- Handle tool calls ----
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    throw new McpError(
      ErrorCode.MethodNotFound,
      `No tools are currently exposed by this server. Unknown tool: ${name}`
    );
  });

  return server;
}