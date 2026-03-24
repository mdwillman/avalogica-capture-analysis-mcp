declare module "@google/genai" {
  export const SchemaType: {
    STRING: unknown;
    NUMBER: unknown;
    BOOLEAN: unknown;
    OBJECT: unknown;
    ARRAY: unknown;
  };

  export interface GenerationConfig {
    temperature?: number;
    topP?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  }

  export interface SystemInstruction {
    role: string;
    parts: Array<{ text: string }>;
  }

  export interface GenerateContentContents {
    role: string;
    parts: Array<{ text: string }>;
  }

  export interface GenerateContentRequest {
    model: string;
    contents: GenerateContentContents[];
    generationConfig?: GenerationConfig;
    systemInstruction?: SystemInstruction;
  }

  export interface GenerateContentResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }

  export class GoogleGenAI {
    constructor(options: { project?: string; projectId?: string; location?: string; vertexai?: boolean });
    models: {
      generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>;
    };
  }
}
