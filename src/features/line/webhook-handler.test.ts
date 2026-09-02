import { describe, expect, it, vi } from "vitest";
import { handleLineWebhook } from "./webhook-handler";
import { createHmac } from "node:crypto";

describe("LINE webhook handler", () => {
  const body = JSON.stringify({
    events: [
      {
        webhookEventId: "event-1",
        type: "message",
        timestamp: 1,
        message: { type: "text", id: "m1", text: "hello" },
      },
    ],
  });
  const signature = createHmac("sha256", "secret")
    .update(body)
    .digest("base64");

  it("rejects invalid signatures before repository access", async () => {
    const accept = vi.fn();
    await expect(
      handleLineWebhook(
        body,
        "bad",
        { secret: "secret", environment: "development" },
        { accept },
      ),
    ).resolves.toEqual({ status: 401, outcome: "rejected" });
    expect(accept).not.toHaveBeenCalled();
  });

  it("accepts quickly with ID-only durable records and treats duplicate as success", async () => {
    const accept = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await expect(
      handleLineWebhook(
        body,
        signature,
        { secret: "secret", environment: "development" },
        { accept },
      ),
    ).resolves.toEqual({ status: 200, outcome: "accepted" });
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "event-1", eventType: "message" }),
    );
    expect(JSON.stringify(accept.mock.calls)).not.toContain("secret");
    await expect(
      handleLineWebhook(
        body,
        signature,
        { secret: "secret", environment: "development" },
        { accept },
      ),
    ).resolves.toEqual({ status: 200, outcome: "duplicate" });
  });
});
