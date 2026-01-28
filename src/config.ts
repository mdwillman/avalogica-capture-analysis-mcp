/**
 * Configuration interface for Avalogica Capture Analysis MCP
 */
export interface Config {
  /** Port number for HTTP server */
  port: number;

  /** Current environment mode */
  nodeEnv: 'development' | 'production';

  /** Convenience flag for production environment */
  isProduction: boolean;

  /** Log level for server output */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Optional shared secret for simple request auth on the capture HTTP API.
   * If set, clients must send: X-Capture-Shared-Secret: <value>
   */
  captureApiSharedSecret?: string;

  /** Future: used when we add GCS/Speech-to-Text/etc. */
  googleCloudProject?: string;
  googleCloudRegion?: string;
  gcsCaptureAudioBucket?: string;
}

function parseLogLevel(value: string | undefined): Config['logLevel'] {
  const normalized = (value ?? 'info').toLowerCase();

  switch (normalized) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return normalized as Config['logLevel'];
    default:
      return 'info';
  }
}

export function loadConfig(): Config {
  const nodeEnv =
    process.env.NODE_ENV === 'production' ? 'production' : 'development';

  const port = Number.parseInt(process.env.PORT || '8080', 10);

  const logLevel = parseLogLevel(process.env.LOG_LEVEL);

  const captureApiSharedSecret = process.env.CAPTURE_API_SHARED_SECRET || undefined;

  // Future (not used in stub yet)
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT || undefined;
  const googleCloudRegion = process.env.GOOGLE_CLOUD_REGION || undefined;
  const gcsCaptureAudioBucket = process.env.GCS_CAPTURE_AUDIO_BUCKET || undefined;

  return {
    port,
    nodeEnv,
    isProduction: nodeEnv === 'production',
    logLevel,
    captureApiSharedSecret,
    googleCloudProject,
    googleCloudRegion,
    gcsCaptureAudioBucket,
  };
}