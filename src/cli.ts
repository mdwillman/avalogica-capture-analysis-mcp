/**
 * Command-line options interface
 */
export interface CliOptions {
  /** Optional port override for HTTP server */
  port?: number;
  /** Force STDIO transport mode */
  stdio?: boolean;
}

/**
 * Parses command-line arguments.
 *
 * Examples:
 *  - node dist/index.js --port 8080
 *  - node dist/index.js --stdio
 */
export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        if (i + 1 < args.length) {
          options.port = Number.parseInt(args[++i], 10);
        }
        break;
      case '--stdio':
        options.stdio = true;
        break;
      default:
        break;
    }
  }

  return options;
}