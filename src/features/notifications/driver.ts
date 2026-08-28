import { z } from "zod";

export const notificationJobSchema = z.object({
  notificationId: z.string().min(1),
  schemaVersion: z.literal(1)
}).strict();

export interface EmailDriver {
  deliver(input: { notificationId: string }): Promise<{ provider: string; receiptId: string }>;
}

export class FakeDevelopmentEmailDriver implements EmailDriver {
  async deliver(input: { notificationId: string }) {
    return { provider: "fake-development", receiptId: `fake:${input.notificationId}` };
  }
}
