import { z } from "zod";

export const aiJobMessageSchema = z.object({ runId: z.string().min(1), tenantId: z.string().min(1), traceId: z.string().min(1), schemaVersion: z.number().int().positive() }).strict();
export type AiJobMessage = z.infer<typeof aiJobMessageSchema>;
export interface AiJobDispatcher { enqueue(message: AiJobMessage): Promise<{ accepted: true }>; }
