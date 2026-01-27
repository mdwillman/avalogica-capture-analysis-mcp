# Avalogica Emergent Consumer Needs MCP

**Version:** 0.2.0  
**License:** MIT

The Avalogica Emergent Consumer Needs MCP server powers Avalogica’s Emergent Consumer Needs agent. It analyzes emerging consumer signals, synthesizes market trends, and helps entrepreneurs and business owners brainstorm novel product ideas based on their capabilities and current market trajectories.

---

## Features

- **Emergent consumer needs analysis** via dedicated MCP tools.
- **Product‑idea brainstorming** tailored to user capabilities.
- **Signal aggregation** from emerging‑trend data sources (details coming as tools are implemented).
- Dual transports (STDIO and HTTP) with a `/health` route for readiness checks.
- TypeScript‑first build pipeline with strict type checking.

---

## Prerequisites

- Node.js 18 or later  
- An OpenAI API key (if using tools that call the OpenAI Responses API).

---

## Installation

```bash
git clone https://github.com/mdwillman/avalogica-consumer-needs-mcp.git
cd avalogica-consumer-needs-mcp
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in any required values.

```bash
cp .env.example .env
```

```dotenv
OPENAI_API_KEY=sk-...
# Additional consumer‑needs data source keys will be added as tools are implemented.
# PORT=3002
```

---

## Build & Run

```bash
npm run build
npm run start            # starts HTTP transport on port 8080 by default
npm run dev:stdio        # run via STDIO (useful with the MCP Inspector)
npm run dev:shttp        # HTTP transport with live TypeScript reloading
```

The HTTP server exposes:

- `GET /health` → returns a JSON payload confirming readiness.
- `POST /mcp` / Server-Sent Events under `/sse` for MCP clients.

---

## Tools

The Avalogica Consumer Needs MCP server now includes four Exa‑powered research tools designed to help the agent identify emerging needs, reveal weak signals, cluster similar discussions, and fetch full‑page content for deep reasoning.

### 🔍 search_emergent_signals
Search the wider web for early indicators of evolving consumer needs, complaints, and opportunities.  
Ideal for broad discovery and trend scanning.

#### Example
```json
{
  "name": "search_emergent_signals",
  "arguments": {
    "query": "remote workers frustrated with current AI meeting assistants",
    "numResults": 8
  }
}
```

### 🧩 search_edge_communities
Focuses on early‑adopter and frontier communities such as Reddit, Hacker News, GitHub, and niche forums.  
Great for uncovering hacked‑together workflows, pain points, and “someone please build this” posts.

#### Example
```json
{
  "name": "search_edge_communities",
  "arguments": {
    "query": "founders hacking together automation tools for bookkeeping",
    "numResults": 12
  }
}
```

### 🔗 find_similar_pages
Given a high‑signal page, this tool finds semantically similar pages across the web.  
Useful for pattern detection, clustering problems, and identifying adjacent needs.

#### Example
```json
{
  "name": "find_similar_pages",
  "arguments": {
    "url": "https://news.ycombinator.com/item?id=12345678",
    "numResults": 10
  }
}
```

### 📄 fetch_page_contents
Fetches full cleaned text for one or more pages so the agent can analyze them deeply—summaries, pain‑point extraction, persona insights, etc.

#### Example
```json
{
  "name": "fetch_page_contents",
  "arguments": {
    "url": "https://example.com/emerging-trend-article",
    "includeSubpages": false
  }
}
```

---

More tools will be added as Avalogica expands its emergent‑needs intelligence and product‑innovation capabilities.

---

## Development Notes

- The codebase remains ESM (`"type": "module"`).
- `npm run build` compiles TypeScript to `dist/` and adjusts the CLI executable bit.
- STDIO transport can be tested with the MCP Inspector: `npm run build && npm run inspector`.

---

## License

MIT © Marshall D. Willman
