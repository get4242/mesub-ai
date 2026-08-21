export type AgentContext = {
  userId: string;
  tenantId: string;
  membershipId: string;
  agentProfileId: string;
};

export type AgentContextDataSource = {
  getAuthenticatedUser(): Promise<{ id: string; emailConfirmedAt: string | null } | null>;
  getActiveOwnerContext(userId: string): Promise<Omit<AgentContext, "userId"> | null>;
};

export type AgentContextErrorCode = "UNAUTHENTICATED" | "EMAIL_UNVERIFIED" | "AGENT_CONTEXT_UNAVAILABLE";

export class AgentContextError extends Error {
  readonly code: AgentContextErrorCode;

  constructor(code: AgentContextErrorCode) {
    super(code);
    this.name = "AgentContextError";
    this.code = code;
  }
}

export async function resolveAgentContext(source: AgentContextDataSource): Promise<AgentContext> {
  const user = await source.getAuthenticatedUser();
  if (!user) throw new AgentContextError("UNAUTHENTICATED");
  if (!user.emailConfirmedAt) throw new AgentContextError("EMAIL_UNVERIFIED");

  const ownership = await source.getActiveOwnerContext(user.id);
  if (!ownership) throw new AgentContextError("AGENT_CONTEXT_UNAVAILABLE");
  return { userId: user.id, ...ownership };
}
