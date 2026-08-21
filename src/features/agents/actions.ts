"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { agentProfileUpdateSchema } from "./schemas";

export async function updateAgentProfileAction(input: unknown) {
  const parsed = agentProfileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" };
  const context = await requireAgentContext();
  const supabase = await createClient();
  const { error } = await supabase.from("agent_profiles").update({
    public_display_name: parsed.data.publicDisplayName,
    slug: parsed.data.slug,
    brand_name: parsed.data.brandName || null,
    bio: parsed.data.bio || null,
    public_email: parsed.data.publicEmail || null,
    public_phone: parsed.data.publicPhone || null,
    show_email: parsed.data.showEmail,
    show_phone: parsed.data.showPhone
  }).eq("id", context.agentProfileId).eq("tenant_id", context.tenantId);
  if (error) return { ok: false as const, code: "UPDATE_FAILED" };
  revalidatePath("/dashboard/profile");
  return { ok: true as const };
}

export async function updateAgentProfileFormAction(formData: FormData): Promise<void> {
  await updateAgentProfileAction({
    publicDisplayName: formData.get("publicDisplayName"), slug: formData.get("slug"),
    brandName: formData.get("brandName") || undefined, bio: formData.get("bio") || undefined,
    publicEmail: formData.get("publicEmail") || undefined, publicPhone: formData.get("publicPhone") || undefined,
    showEmail: formData.get("showEmail") === "on", showPhone: formData.get("showPhone") === "on"
  });
}
