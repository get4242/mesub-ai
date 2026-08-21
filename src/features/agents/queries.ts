import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";

export async function getOwnAgentProfile() {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("agent_profiles").select("*").eq("id", context.agentProfileId).single();
  if (error) throw error;
  return data;
}
