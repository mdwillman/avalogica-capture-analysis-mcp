/**
 * Configuration interface for Avalogica Consumer Needs MCP
 */
export interface Config {
  /** API key for OpenAI Responses API (if used by tools) */
  openAiApiKey?: string;
  /** Port number for HTTP server */
  port: number;
  /** Current environment mode */
  nodeEnv: 'development' | 'production';
  /** Convenience flag for production environment */
  isProduction: boolean;
}

export function loadConfig(): Config {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const nodeEnv =
    process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const port = parseInt(process.env.PORT || '3002', 10);

  return {
    openAiApiKey,
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
  };
}