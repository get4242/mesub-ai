import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";

export async function listAgentProperties() {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").select("*").eq("tenant_id", context.tenantId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAgentProperty(propertyId: string) {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").select("*").eq("tenant_id", context.tenantId).eq("id", propertyId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPropertyMedia(propertyId: string) {
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { data, error } = await supabase.from("property_media").select("id,original_filename,position,status").eq("tenant_id", context.tenantId).eq("property_id", propertyId).neq("status", "archived").order("position");
  if (error) throw error;
  return data;
}

export async function listAgentReadyPropertyMedia(propertyIds: string[]) {
  const context = await requireAgentContext();
  if (!propertyIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_media")
    .select("id,property_id,position")
    .eq("tenant_id", context.tenantId)
    .eq("status", "ready")
    .in("property_id", propertyIds)
    .order("position");
  if (error) throw error;
  return data ?? [];
}
