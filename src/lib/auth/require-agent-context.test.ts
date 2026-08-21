import { describe, expect, it } from "vitest";
import { AgentContextError, resolveAgentContext, type AgentContextDataSource } from "./agent-context";

function source(overrides: Partial<AgentContextDataSource> = {}): AgentContextDataSource {
  return {
    getAuthenticatedUser: async () => ({ id: "user-a", emailConfirmedAt: "2026-08-21T00:00:00Z" }),
    getActiveOwnerContext: async () => ({ tenantId: "tenant-a", membershipId: "membership-a", agentProfileId: "agent-a" }),
    ...overrides
  };
}

describe("resolveAgentContext", () => {
  it("rejects a missing authenticated session", async () => {
    await expect(resolveAgentContext(source({ getAuthenticatedUser: async () => null }))).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("rejects an email-unverified user", async () => {
    await expect(
      resolveAgentContext(source({ getAuthenticatedUser: async () => ({ id: "user-a", emailConfirmedAt: null }) }))
    ).rejects.toMatchObject({ code: "EMAIL_UNVERIFIED" });
  });

  it("rejects a user without one active owner membership and agent profile", async () => {
    await expect(resolveAgentContext(source({ getActiveOwnerContext: async () => null }))).rejects.toMatchObject({ code: "AGENT_CONTEXT_UNAVAILABLE" });
  });

  it("returns server-derived tenant and agent ownership context", async () => {
    await expect(resolveAgentContext(source())).resolves.toEqual({
      userId: "user-a",
      tenantId: "tenant-a",
      membershipId: "membership-a",
      agentProfileId: "agent-a"
    });
  });

  it("uses a stable typed authorization error", () => {
    expect(new AgentContextError("UNAUTHENTICATED")).toMatchObject({ name: "AgentContextError", code: "UNAUTHENTICATED" });
  });
});
