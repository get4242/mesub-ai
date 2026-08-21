import "server-only";

import { createClient } from "@/lib/supabase/server";
import { resolveAgentContext, type AgentContext } from "./agent-context";

export { AgentContextError } from "./agent-context";
export type { AgentContext, AgentContextDataSource, AgentContextErrorCode } from "./agent-context";

export async function requireAgentContext(): Promise<AgentContext> {
  const supabase = await createClient();
  return resolveAgentContext({
    async getAuthenticatedUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return { id: data.user.id, emailConfirmedAt: data.user.email_confirmed_at ?? null };
    },
    async getActiveOwnerContext(userId) {
      const { data: membership, error: membershipError } = await supabase
        .from("tenant_memberships")
        .select("id,tenant_id")
        .eq("user_id", userId)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle();
      if (membershipError || !membership) return null;

      const { data: agentProfile, error: profileError } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("tenant_id", membership.tenant_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError || !agentProfile) return null;

      return {
        tenantId: membership.tenant_id,
        membershipId: membership.id,
        agentProfileId: agentProfile.id
      };
    }
  });
}
