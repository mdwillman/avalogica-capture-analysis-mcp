# Contributing to Avalogica Capture Analysis MCP

Thanks for contributing! This repo currently exists primarily to support the Avalogica iOS **New Personality Capture** feature by providing a backend **Capture Analysis Orchestrator**.

At the moment, the server ships as a **small, structured HTTP API** (plus MCP transports for internal/operator workflows). The public contract is the `analysis.v1` JSON response used by the app to populate a `CaptureArtifact`.

## How to contribute (current scope)

### 1) Keep the response contract stable

- Any change that affects the `analysis.v1` JSON shape must be versioned (e.g., `analysis.v2`) or made strictly backwards compatible.
- Prefer adding new optional fields over renaming/removing existing ones.

### 2) Run locally

```bash
npm install
npm run build
npm run start
```

Smoke tests:

```bash
curl -s http://localhost:8080/health
curl -s -X POST http://localhost:8080/v1/captures:init
curl -s -X POST http://localhost:8080/v1/captures/TEST:analyze
curl -s http://localhost:8080/v1/captures/TEST
```

If `CAPTURE_API_SHARED_SECRET` is set, include:

```bash
-H "X-Capture-Shared-Secret: <value>"
```

### 3) Code quality

- Keep changes small and well-scoped.
- Prefer deterministic feature extraction for explainability and calibration.
- Avoid committing local artifacts (macOS `.DS_Store`, editor settings, etc.).

### 4) Submodule workflow

This repo is typically used as a git submodule under `avalogica-ai/external_mcp_servers/`.

- Commit and push changes **inside this repo** first.
- Then update and commit the submodule pointer in the parent repo.

## Roadmap-friendly contributions

Examples of helpful next steps:

- Add request/response validation for the capture endpoints.
- Add persistence for `captureId` status (`processing` → `done`/`error`).
- Integrate Google Speech-to-Text (transcription) and an acoustic feature job.
- Add hybrid inference logic (deterministic features + calibrated model) while keeping `analysis.v1` stable.

---

This file is intentionally short for now and can be expanded as the service matures.