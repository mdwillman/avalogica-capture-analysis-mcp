// src/exaClient.ts
export class ExaClient {
    apiKey;
    fetchImpl;
    baseUrl = "https://api.exa.ai";
    constructor(apiKey = process.env.EXA_API_KEY, fetchImpl = fetch) {
        this.apiKey = apiKey;
        this.fetchImpl = fetchImpl;
    }
    /**
     * Generic POST wrapper for Exa's API.
     */
    async post(path, body) {
        const key = this.apiKey ?? process.env.EXA_API_KEY;
        if (!key) {
            throw new Error("Missing EXA_API_KEY environment variable.");
        }
        const url = `${this.baseUrl}${path}`;
        const response = await this.fetchImpl(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": key,
            },
            body: JSON.stringify(body),
        });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) {
            const errorBody = contentType.includes("application/json")
                ? JSON.stringify(await response.json(), null, 2)
                : await response.text();
            throw new Error(`Exa API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`);
        }
        if (!contentType.includes("application/json")) {
            throw new Error("Unexpected response format from Exa API.");
        }
        return (await response.json());
    }
}
