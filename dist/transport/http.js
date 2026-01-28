import { createServer } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { createStandaloneServer } from '../server.js';
/** Session storage for streamable HTTP connections */
const sessions = new Map();
/**
 * Starts the HTTP transport server.
 * Routes:
 * - /mcp (MCP Streamable HTTP transport)
 * - /health (readiness)
 * - /v1/captures:* (Capture Analysis API - stubbed)
 */
export function startHttpTransport(config) {
    const httpServer = createServer();
    httpServer.on('request', async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        // Capture Analysis API (v1)
        if (url.pathname === '/v1/captures:init' && req.method === 'POST') {
            await handleCapturesInit(req, res, config);
            return;
        }
        // Match: /v1/captures/{captureId}:analyze
        const analyzeMatch = url.pathname.match(/^\/v1\/captures\/([^/]+):analyze$/);
        if (analyzeMatch && req.method === 'POST') {
            const captureId = analyzeMatch[1];
            await handleCapturesAnalyze(req, res, config, captureId);
            return;
        }
        // Match: /v1/captures/{captureId}
        const getMatch = url.pathname.match(/^\/v1\/captures\/([^/]+)$/);
        if (getMatch && req.method === 'GET') {
            const captureId = getMatch[1];
            await handleCapturesGet(req, res, config, captureId);
            return;
        }
        // MCP + health
        switch (url.pathname) {
            case '/mcp':
                await handleMcpRequest(req, res, config);
                break;
            case '/health':
                handleHealthCheck(res);
                break;
            default:
                handleNotFound(res);
        }
    });
    const host = config.isProduction ? '0.0.0.0' : 'localhost';
    httpServer.listen(config.port, host, () => {
        logServerStart(config);
    });
}
/**
 * Handles MCP protocol requests.
 */
async function handleMcpRequest(req, res, config) {
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
            res.statusCode = 404;
            res.end('Session not found');
            return;
        }
        return await session.transport.handleRequest(req, res);
    }
    if (req.method === 'POST') {
        await createCaptureAnalysisSession(req, res, config);
        return;
    }
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid request' }));
}
/**
 * Creates a new MCP session for HTTP transport.
 */
async function createCaptureAnalysisSession(req, res, _config) {
    const serverInstance = createStandaloneServer();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
            sessions.set(sessionId, { transport, server: serverInstance });
        },
    });
    transport.onclose = () => {
        if (transport.sessionId) {
            sessions.delete(transport.sessionId);
        }
    };
    try {
        await serverInstance.connect(transport);
        await transport.handleRequest(req, res);
    }
    catch (_error) {
        res.statusCode = 500;
        res.end('Internal server error');
    }
}
/**
 * Capture Analysis: POST /v1/captures:init
 * Stub: returns a new captureId.
 */
async function handleCapturesInit(_req, res, config) {
    if (!isAuthorizedCaptureRequest(_req, config)) {
        writeJson(res, 401, { error: 'Unauthorized' });
        return;
    }
    const captureId = randomUUID();
    writeJson(res, 200, {
        captureId,
        status: 'processing',
    });
}
/**
 * Capture Analysis: POST /v1/captures/{captureId}:analyze
 * Stub: returns a hardcoded analysis.v1 "done" payload.
 */
async function handleCapturesAnalyze(req, res, config, captureId) {
    if (!isAuthorizedCaptureRequest(req, config)) {
        writeJson(res, 401, { error: 'Unauthorized' });
        return;
    }
    const payload = buildStubDoneResponse(captureId);
    writeJson(res, 200, payload);
}
/**
 * Capture Analysis: GET /v1/captures/{captureId}
 * Stub: returns the same hardcoded "done" payload.
 */
async function handleCapturesGet(req, res, config, captureId) {
    if (!isAuthorizedCaptureRequest(req, config)) {
        writeJson(res, 401, { error: 'Unauthorized' });
        return;
    }
    const payload = buildStubDoneResponse(captureId);
    writeJson(res, 200, payload);
}
/**
 * Optional shared-secret auth for capture endpoints.
 * If CAPTURE_API_SHARED_SECRET is set, require header:
 *   X-Capture-Shared-Secret: <value>
 */
function isAuthorizedCaptureRequest(req, config) {
    if (!config.captureApiSharedSecret)
        return true;
    const header = req.headers['x-capture-shared-secret'];
    const value = Array.isArray(header) ? header[0] : header;
    return value === config.captureApiSharedSecret;
}
function writeJson(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}
/**
 * Hardcoded analysis.v1 response.
 * Keep this centralized so we can swap it with real pipeline output later.
 */
function buildStubDoneResponse(captureId) {
    const now = new Date().toISOString();
    return {
        captureId,
        status: 'done',
        version: 'analysis.v1',
        createdAt: now,
        input: {
            sourceType: 'audio',
            promptId: 'stub',
            language: 'en-US',
            audio: {
                durationMs: 12000,
                sampleRateHz: 48000,
                channels: 1,
                codec: 'aac',
                container: 'm4a',
            },
        },
        quality: {
            durationMs: 12000,
            snrDb: 18.0,
            clippingPercent: 0.0,
            speechActivityRatio: 0.7,
            transcriptConfidence: 0.9,
            warnings: [],
        },
        transcript: {
            text: 'Stub transcript: I enjoy exploring ideas and connecting with people.',
            words: [],
        },
        acoustics: {
            summary: {
                speechRateWpm: 140.0,
                pauseRatio: 0.2,
                meanPitchHz: 170.0,
                pitchIqrHz: 40.0,
                loudnessIqrDb: 6.0,
            },
            events: [],
        },
        inference: {
            dimensionState: {
                axes: {
                    EI: { leansToward: 'E', strength: 0.22, confidence: 0.58, updatedAt: now },
                    SN: { leansToward: 'N', strength: 0.18, confidence: 0.54, updatedAt: now },
                    FT: { leansToward: 'F', strength: 0.12, confidence: 0.52, updatedAt: now },
                    JP: { leansToward: 'P', strength: 0.08, confidence: 0.51, updatedAt: now },
                },
                mbtiGuess: 'ENFP',
                mbtiConfidence: 0.44,
                updatedAt: now,
            },
            evidence: [
                {
                    dimension: 'EI',
                    leansToward: 'E',
                    confidence: 0.62,
                    excerpt: '…connecting with people…',
                    sourceType: 'audio',
                    sourceSessionID: captureId,
                    agentType: 'hybrid.v1',
                    timestamp: now,
                },
                {
                    dimension: 'SN',
                    leansToward: 'N',
                    confidence: 0.58,
                    excerpt: '…exploring ideas…',
                    sourceType: 'audio',
                    sourceSessionID: captureId,
                    agentType: 'hybrid.v1',
                    timestamp: now,
                },
            ],
            notes: [
                {
                    type: 'quality',
                    message: 'Stub response. Real transcription/acoustic extraction will be added in a future step.',
                },
            ],
        },
    };
}
/**
 * Handles health check endpoint.
 */
function handleHealthCheck(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        service: 'avalogica-capture-analysis-mcp',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
    }));
}
/**
 * Handles 404 Not Found responses.
 */
function handleNotFound(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
}
/**
 * Logs server startup information.
 */
function logServerStart(config) {
    const displayUrl = config.isProduction ? `Port ${config.port}` : `http://localhost:${config.port}`;
    if (!config.isProduction) {
        console.log('Put this in your client config:');
        console.log(JSON.stringify({
            mcpServers: {
                'avalogica-capture-analysis-mcp': {
                    url: `http://localhost:${config.port}/mcp`,
                },
            },
        }, null, 2));
    }
}
