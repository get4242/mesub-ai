import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
export async function getAiRunsForProperty(propertyId: string) {
  const c = await requireAgentContext();
  const db = await createClient();
  const { data, error } = await db
    .from("ai_runs")
    .select("id,state,retryable,created_at,finished_at")
    .eq("tenant_id", c.tenantId)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
export async function listPropertySuggestions(propertyId: string) {
  const c = await requireAgentContext();
  const db = await createClient();
  const { data, error } = await db
    .from("ai_suggestions")
    .select(
      "id,field_key,proposed_value,confidence,confidence_unknown,validation_status,decision,ai_suggestion_sources(source_id)",
    )
    .eq("tenant_id", c.tenantId)
    .eq("property_id", propertyId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function getLatestConfirmation(propertyId: string) {
  const c = await requireAgentContext();
  const db = await createClient();
  const { data, error } = await db
    .from("property_confirmations")
    .select("critical_version,property_version,confirmed_at")
    .eq("tenant_id", c.tenantId)
    .eq("property_id", propertyId)
    .order("confirmed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
