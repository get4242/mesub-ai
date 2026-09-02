import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyLineWebhookSignature, normalizeLineWebhook } from "./webhook";

describe("LINE webhook boundary", () => {
  it("verifies the exact raw body and rejects tampering", () => {
    const body = '{"events":[]}';
    const signature = createHmac("sha256", "development-secret").update(body).digest("base64");
    expect(verifyLineWebhookSignature(body, signature, "development-secret")).toBe(true);
    expect(verifyLineWebhookSignature(body + " ", signature, "development-secret")).toBe(false);
  });

  it("normalizes only canonical event identity and allowlisted fields", () => {
    const body = JSON.stringify({ events: [{ webhookEventId: "event-1", type: "message", timestamp: 1, source: { type: "user", userId: "sensitive" }, message: { type: "text", id: "m1", text: "hello" }, deliveryContext: { isRedelivery: true } }] });
    expect(normalizeLineWebhook(body)).toEqual([{ eventId: "event-1", type: "message", timestamp: 1, isRedelivery: true, messageType: "text", messageId: "m1", text: "hello" }]);
    expect(JSON.stringify(normalizeLineWebhook(body))).not.toContain("sensitive");
  });
});
