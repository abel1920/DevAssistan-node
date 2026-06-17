export type Role = "user" | "assistan";

export interface Message {
    role: Role;
    content: string
}

export interface ToolDefinition {
    name: string;
    description: string
    input_schema:
    {
        type: "object",
        properties: Record<string, unknown>
        required?: string[]
    }
}

export interface ToolResult {
    toolName: string;
    toolUseId: string;
    result: string;
    isError: boolean;
}

export interface Chunk {
    id: string;
    content: string;
    metadata: {
        source: string;
        heading: string;
        position: string;
        charCount: number;
    }
}

export interface RetrievedChunk extends Chunk {
    score: number
}

export interface SearchResult {
    chunk: Chunk;
    score: number // Mide similitu
}

//provedor del modelo
export type ModelProvide = "anthropic" | "openai"

export interface AppConfig {
    provider: ModelProvide;
    anthropicApiKey: string;
    openaiApiKey: string;
    anthropicModel: string;
    openaiModel:string;
    openaiEmbeddingModel:string;
    docsPath:string;
    dbPath:string;
    ragTopK:number;
}

export interface AgentResponse{
    text:string;
    toolsUsed:string;
    inputToken:number;
    outputToken:number;
}