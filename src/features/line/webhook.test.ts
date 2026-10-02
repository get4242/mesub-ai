import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyLineWebhookSignature, normalizeLineWebhook } from "./webhook";

describe("LINE webhook boundary", () => {
  it("stores only protected identity for direct messages and never for group messages", () => {
    const protect = (subject: string) => ({ subjectHash: `hash-${subject.length}`, destination: "encrypted" });
    const events = ["user", "group"].map((type, index) => ({
      webhookEventId: `event-${index}`, type: "message", timestamp: 1,
      source: { type, userId: "Uprivate" }, message: { type: "text", id: "m", text: "search" },
    }));
    const result = normalizeLineWebhook(JSON.stringify({ events }), protect);
    expect(result[0]).toMatchObject({ subjectHash: "hash-8", destination: "encrypted" });
    expect(result[1]).not.toHaveProperty("destination");
    expect(JSON.stringify(result)).not.toContain("Uprivate");
  });
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
