import { z } from "zod";

export const lineNotificationJobSchema = z.object({
  notificationId: z.string().min(1),
  schemaVersion: z.literal(1),
}).strict();

export function canDeliverLineNotification(input: { activeLink: boolean; consent: boolean; sent: number; cap: number }) {
  return input.activeLink && input.consent && input.cap > 0 && input.sent < input.cap;
}

export interface LineNotificationDriver {
  deliver(input: { notificationId: string; destination?: string; message?: string }): Promise<{ provider: string; receiptId: string }>;
}

export function createFakeLineNotificationDriver(): LineNotificationDriver {
  return {
    async deliver({ notificationId }) {
      return { provider: "fake-line-development", receiptId: `fake-line:${notificationId}` };
    },
  };
}

export function createLineMessagingDriver(accessToken: string, request: typeof fetch = fetch): LineNotificationDriver {
  if (!accessToken) throw new Error("LINE_ACCESS_TOKEN_REQUIRED");
  return {
    async deliver({ destination, message }) {
      if (!destination || !message) throw new Error("LINE_DELIVERY_INPUT_INVALID");
      const response = await request("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: destination, messages: [{ type: "text", text: message.slice(0, 500) }] }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("LINE_DELIVERY_FAILED");
      return { provider: "line-messaging-api", receiptId: crypto.randomUUID() };
    },
  };
}
