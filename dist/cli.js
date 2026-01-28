/**
 * Parses command-line arguments.
 *
 * Examples:
 *  - node dist/index.js --port 8080
 *  - node dist/index.js --stdio
 */
export function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
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
