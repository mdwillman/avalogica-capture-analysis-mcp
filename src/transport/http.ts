import { createServer, IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createHash, randomUUID } from 'crypto';
import https from 'https';
import { createStandaloneServer } from '../server.js';
import { Config } from '../config.js';

/** Session storage for streamable HTTP connections */
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: any }>();

/**
 * Starts the HTTP transport server.
 * Routes:
 * - /mcp (MCP Streamable HTTP transport)
 * - /health (readiness)
 * - /v1/captures:* (Capture Analysis API - stubbed)
 */
export function startHttpTransport(config: Config): void {
  const httpServer = createServer();

  httpServer.on('request', async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

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
async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: Config
): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

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
async function createCaptureAnalysisSession(
  req: IncomingMessage,
  res: ServerResponse,
  _config: Config
): Promise<void> {
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
  } catch (_error) {
    res.statusCode = 500;
    res.end('Internal server error');
  }
}

/**
 * Capture Analysis: POST /v1/captures:init
 * Returns a new captureId and a signed GCS upload URL.
 */
async function handleCapturesInit(
  _req: IncomingMessage,
  res: ServerResponse,
  config: Config
): Promise<void> {
  if (!isAuthorizedCaptureRequest(_req, config)) {
    writeJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  const captureId = randomUUID();

  // Bucket can be supplied via env var in Cloud Run.
  const bucket =
    process.env.CAPTURE_AUDIO_BUCKET || (config as any).captureAudioBucket || '';
  if (!bucket) {
    writeJson(res, 500, {
      error: 'Missing CAPTURE_AUDIO_BUCKET configuration',
    });
    return;
  }

  // Allow client to suggest contentType/extension; default to typical iOS m4a.
  let contentType = 'audio/mp4';
  let extension = 'm4a';
  try {
    const body = await readJsonBody<{ contentType?: string; extension?: string }>(_req);
    if (body?.contentType) contentType = body.contentType;
    if (body?.extension) extension = body.extension;
  } catch {
    // ignore body parse errors for init; defaults are fine
  }

  const objectPath = `captures/${captureId}/audio.${extension}`;

  try {
    const expiresInSeconds = 10 * 60; // 10 minutes
    const { url, expiresAt } = await generateV4SignedPutUrl({
      bucket,
      objectPath,
      contentType,
      expiresInSeconds,
    });

    writeJson(res, 200, {
      captureId,
      status: 'initialized',
      upload: {
        method: 'PUT',
        url,
        headers: {
          'Content-Type': contentType,
        },
        objectPath,
        expiresAt,
      },
    });
  } catch (err: any) {
    writeJson(res, 500, {
      error: 'Failed to generate upload URL',
      details: String(err?.message || err),
    });
  }
}

/**
 * Capture Analysis: POST /v1/captures/{captureId}:analyze
 * Stub: returns a hardcoded CaptureArtifact payload (dimensionState + evidence).
 */
async function handleCapturesAnalyze(
  req: IncomingMessage,
  res: ServerResponse,
  config: Config,
  captureId: string
): Promise<void> {
  if (!isAuthorizedCaptureRequest(req, config)) {
    writeJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  // Parse body for future pipeline stages (e.g., objectPath, contentType, language).
  // For now, the stub ignores it, but parsing here helps validate client wiring.
  try {
    await readJsonBody<Record<string, unknown>>(req);
  } catch {
    // ignore
  }

  const payload = buildStubDoneResponse(captureId);
  writeJson(res, 200, payload);
}
// --- GCS Signed URL Helper Functions ---

async function readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      if (!chunks.length) return resolve(null);
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve(null);
      try {
        resolve(JSON.parse(raw) as T);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function iso8601BasicNow(): { requestTimestamp: string; datestamp: string } {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  const datestamp = `${yyyy}${mm}${dd}`;
  const requestTimestamp = `${datestamp}T${hh}${mi}${ss}Z`;
  return { requestTimestamp, datestamp };
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function encodePathForGcs(objectPath: string): string {
  // Encode each segment but keep '/' separators
  return objectPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function httpsJson<T>(
  options: https.RequestOptions,
  body?: any,
  extraHeaders?: Record<string, string>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(extraHeaders || {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const code = res.statusCode || 0;
          if (code < 200 || code >= 300) {
            return reject(new Error(`HTTP ${code}: ${raw}`));
          }
          try {
            resolve(JSON.parse(raw) as T);
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', reject);

    if (body !== undefined) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(payload);
    }
    req.end();
  });
}

async function fetchMetadata(path: string): Promise<string> {
  const res = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        host: 'metadata.google.internal',
        path: `/computeMetadata/v1/${path}`,
        method: 'GET',
        headers: {
          'Metadata-Flavor': 'Google',
        },
      },
      (r) => {
        const chunks: Buffer[] = [];
        r.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        r.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const code = r.statusCode || 0;
          if (code < 200 || code >= 300) {
            return reject(new Error(`Metadata HTTP ${code}: ${raw}`));
          }
          resolve(raw.trim());
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
  return res;
}

async function getAccessToken(): Promise<string> {
  // Cloud Run provides a metadata server token for the runtime service account.
  const raw = await fetchMetadata('instance/service-accounts/default/token');
  const parsed = JSON.parse(raw) as { access_token: string };
  return parsed.access_token;
}

async function getServiceAccountEmail(): Promise<string> {
  return await fetchMetadata('instance/service-accounts/default/email');
}

async function signBlobWithIamCredentials(
  serviceAccountEmail: string,
  bytesToSign: Buffer
): Promise<Buffer> {
  const token = await getAccessToken();

  const body = {
    payload: bytesToSign.toString('base64'),
  };

  const resp = await httpsJson<{ signedBlob: string }>(
    {
      host: 'iamcredentials.googleapis.com',
      path: `/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccountEmail)}:signBlob`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    body
  );

  return Buffer.from(resp.signedBlob, 'base64');
}

async function generateV4SignedPutUrl(args: {
  bucket: string;
  objectPath: string;
  contentType: string;
  expiresInSeconds: number;
}): Promise<{ url: string; expiresAt: string }> {
  const { bucket, objectPath, contentType, expiresInSeconds } = args;

  const serviceAccountEmail = await getServiceAccountEmail();
  const { requestTimestamp, datestamp } = iso8601BasicNow();

  const algorithm = 'GOOG4-RSA-SHA256';
  const host = 'storage.googleapis.com';
  const region = 'auto';
  const service = 'storage';
  const scope = `${datestamp}/${region}/${service}/goog4_request`;

  const credential = `${serviceAccountEmail}/${scope}`;

  const signedHeaders = 'content-type;host';
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;

  const canonicalQuery: Record<string, string> = {
    'X-Goog-Algorithm': algorithm,
    'X-Goog-Credential': credential,
    'X-Goog-Date': requestTimestamp,
    'X-Goog-Expires': String(expiresInSeconds),
    'X-Goog-SignedHeaders': signedHeaders,
  };

  const canonicalQueryString = Object.keys(canonicalQuery)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(canonicalQuery[k]!)}`)
    .join('&');

  const canonicalUri = `/${bucket}/${encodePathForGcs(objectPath)}`;

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    algorithm,
    requestTimestamp,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signatureBytes = await signBlobWithIamCredentials(
    serviceAccountEmail,
    Buffer.from(stringToSign, 'utf8')
  );
  const signatureHex = signatureBytes.toString('hex');

  const url = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signatureHex}`;

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return { url, expiresAt };
}

/**
 * Capture Analysis: GET /v1/captures/{captureId}
 * Stub: returns the same hardcoded CaptureArtifact payload (dimensionState + evidence).
 */
async function handleCapturesGet(
  req: IncomingMessage,
  res: ServerResponse,
  config: Config,
  captureId: string
): Promise<void> {
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
function isAuthorizedCaptureRequest(req: IncomingMessage, config: Config): boolean {
  if (!config.captureApiSharedSecret) return true;
  const header = req.headers['x-capture-shared-secret'];
  const value = Array.isArray(header) ? header[0] : header;
  return value === config.captureApiSharedSecret;
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Hardcoded analysis.v1 response.
 * Keep this centralized so we can swap it with real pipeline output later.
 */
function buildStubDoneResponse(captureId: string): unknown {
  const now = new Date().toISOString();

  // This shape is intentionally the stable iOS contract:
  // CaptureArtifact -> { dimensionState, evidence }
  return {
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
  };
}

/**
 * Handles health check endpoint.
 */
function handleHealthCheck(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'healthy',
      service: 'avalogica-capture-analysis-mcp',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Handles 404 Not Found responses.
 */
function handleNotFound(res: ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

/**
 * Logs server startup information.
 */
function logServerStart(config: Config): void {
  const displayUrl = config.isProduction ? `Port ${config.port}` : `http://localhost:${config.port}`;

  if (!config.isProduction) {
    console.log('Put this in your client config:');
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            'avalogica-capture-analysis-mcp': {
              url: `http://localhost:${config.port}/mcp`,
            },
          },
        },
        null,
        2
      )
    );
  }
}