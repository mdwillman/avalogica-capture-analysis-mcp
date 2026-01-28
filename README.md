# Avalogica Capture Analysis MCP

**Version:** 0.1.0  
**License:** MIT

The **Avalogica Capture Analysis MCP** service is the backend stub (and future orchestrator) for Avalogica’s iOS **New Capture** feature (voice + text). Its job is to turn a completed voice recording into a structured analysis result that the app can map directly into a `CaptureArtifact`:

- `DimensionState` (EI / SN / FT / JP, plus MBTI guess + confidence)
- a small set of `EvidenceDraft` items (dimension, leansToward, confidence, excerpt, sourceType, agentType, timestamp)

In v1 (right now), this server can return a **hardcoded** `status="done"` response that matches the agreed `analysis.v1` JSON contract so the iOS app can be wired end-to-end before real transcription/acoustics/modeling are implemented.

---

## Features

- HTTP API for capture analysis (stubbed now; real pipeline later).
- Dual transports (STDIO and HTTP) with a `/health` route for readiness checks.
- TypeScript-first build pipeline with strict type checking.

---

## Prerequisites

- Node.js 18 or later

> Note: Google Cloud integration (signed uploads, Speech-to-Text, acoustic jobs, Vertex inference) will be added later. This repo starts with a minimal stub service.

---

## Installation

```bash
git clone https://github.com/mdwillman/avalogica-capture-analysis-mcp.git
cd avalogica-capture-analysis-mcp
npm install
```

---

## Configuration

Copy `.env.example` to `.env` and fill in any required values.

```bash
cp .env.example .env
```

Example:

```dotenv
# PORT=8080
# LOG_LEVEL=info
# Optional shared secret for simple request auth (recommended in non-local environments)
# CAPTURE_API_SHARED_SECRET=change-me
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

## HTTP API (Capture Analysis)

### `POST /v1/captures:init`
Creates a capture session and returns a `captureId`.

**Response (stub example):**

```json
{ "captureId": "<uuid>", "status": "processing" }
```

### `POST /v1/captures/{captureId}:analyze`
Runs analysis for the capture.

In the stub implementation, this returns a hardcoded `status="done"` payload that conforms to `analysis.v1`.

### `GET /v1/captures/{captureId}`
Fetches the latest status/result for a capture.

In the stub implementation, this returns the same hardcoded `status="done"` payload.

---

## Response Contract

All analysis responses are returned as structured JSON with:

- `quality` metrics (duration, SNR/clipping placeholders as needed)
- `transcript` (text + optional word timing)
- `acoustics` (summary + optional events)
- `inference.dimensionState` (matches the iOS `DimensionState` shape)
- `inference.evidence[]` (directly mappable to `EvidenceDraft` / `SignalEvidenceEntity`)

Contract version: `analysis.v1`.

---

## Roadmap (planned)

- Signed audio upload URLs (Google Cloud Storage)
- Transcription (Google Speech-to-Text)
- Acoustic feature extraction (batch job)
- Hybrid inference pipeline (deterministic features + calibrated model + evidence selection)
- Expanded per-axis analyzers and richer evidence linking

---

## License

MIT © Marshall D. Willman