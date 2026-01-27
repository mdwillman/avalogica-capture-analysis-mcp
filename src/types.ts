/**
 * Type definitions for Avalogica Consumer Needs MCP
 */

export interface TechUpdateArgs {
  topic: string;
}

export interface TechUpdateCitation {
  label: string;
  url: string;
}

export interface TechUpdateResult {
  content: string;
  citations: TechUpdateCitation[];
  model: string;
  createdAt: string;
  topic: string;
  title: string;
  description: string;
  fingerprint: string;
}

/**
 * Exa search / content types
 */

export interface ExaSearchResult {
  id: string;
  url: string;
  title?: string | null;
  score?: number;
  publishedDate?: string | null;
  author?: string | null;
  text?: string | null;
  snippet?: string | null;
  summary?: string | null;
  textSnippet?: string | null;

  [key: string]: unknown;
}

export interface ExaSearchResponse {
  query?: string;
  endpoint?: string;
  results: ExaSearchResult[];
  [key: string]: unknown;
}

/**
 * Exa result category filter (matches Exa "Result category" options)
 */
export type ExaResultCategory =
  | "company"
  | "research_paper"
  | "news_article"
  | "pdf"
  | "github"
  | "tweet"
  | "personal_site"
  | "linkedin_profile"
  | "financial_report";

/**
 * Tool argument types for Exa-backed tools
 */

export interface SearchEmergentSignalsArgs {
  /**
   * Natural language description of the need, problem, or topic
   * to search for in the wider web.
   */
  query: string;

  /**
   * How many results to retrieve (1–10).
   * Defaults and caps are enforced by the tool handler.
   */
  numResults?: number;

  /**
   * Optional Exa result category to restrict results to a specific media type
   * (e.g., "company", "research_paper", "news_article", "github").
   */
  resultCategory?: ExaResultCategory;
}

export interface SearchEdgeCommunitiesArgs {
  /**
   * Description of the need, frustration, or workflow to investigate
   * among early-adopter / edge communities.
   */
  query: string;

  /**
   * How many community posts/pages to retrieve (1–10).
   * Defaults and caps are enforced by the tool handler.
   */
  numResults?: number;
}

export interface FindSimilarPagesArgs {
  /**
   * URL of a high-signal page to use as the seed for similarity search.
   */
  url: string;

  /**
   * How many similar pages to retrieve (1–10).
   * (Handler may cap this to control cost.)
   */
  numResults?: number;
}

export interface FetchPageContentsArgs {
  /**
   * URL whose full cleaned content should be retrieved.
   */
  url: string;

  /**
   * Whether to include a small number of subpages for additional context.
   */
  includeSubpages?: boolean;
}