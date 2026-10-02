export type AiProviderRequest = { model: string; task: "extraction" | "vision" | "content" | "fallback"; snapshot: unknown; timeoutMs: number; images?: Array<{ sourceId: string; dataUrl: string }> };
export type AiProviderResult = { output: unknown; usage: { inputTokens: number | null; outputTokens: number | null; measurementStatus: "measured" | "unknown" }; providerRequestId: string | null; resolvedModelId: string };
export interface AiProvider { generate(request: AiProviderRequest): Promise<AiProviderResult>; }
