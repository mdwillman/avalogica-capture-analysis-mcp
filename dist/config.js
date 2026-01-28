function parseLogLevel(value) {
    const normalized = (value ?? 'info').toLowerCase();
    switch (normalized) {
        case 'debug':
        case 'info':
        case 'warn':
        case 'error':
            return normalized;
        default:
            return 'info';
    }
}
export function loadConfig() {
    const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
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
