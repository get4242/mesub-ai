"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { publishProperty, type PublicationRepository } from "./publication";

export async function publishPropertyAction(input: unknown) {
  const context = await requireAgentContext();
  const client = await createClient();
  const propertyId = typeof input === "object" && input !== null
    ? (input as { propertyId?: unknown }).propertyId
    : null;
  const expectedVersion = typeof input === "object" && input !== null
    ? (input as { expectedVersion?: unknown }).expectedVersion
    : null;
  if (typeof propertyId !== "string" || !Number.isInteger(expectedVersion)) {
    return { ok: false as const, code: "INVALID_INPUT" as const };
  }
  const { data: property } = await client
    .from("properties")
    .select("id,status,version,critical_version")
    .eq("id", propertyId)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();
  if (!property || property.version !== expectedVersion) {
    return { ok: false as const, code: "CONFLICT" as const };
  }
  // Clicking “เผยแพร่” is the Agent's explicit approval. Keep the audit
  // confirmation required by Property Core, but do it in this one action.
  if (property.status !== "published") {
    const { error } = await client.rpc("confirm_property_current_version", {
      target_property_id: property.id,
      expected_property_version: property.version,
      expected_critical_version: property.critical_version,
      review_run_id: null,
    });
    if (error) return { ok: false as const, code: "VALIDATION_FAILED" as const };
  }
  const repository: PublicationRepository = {
    async publish(request) {
      const { data, error } = await client.rpc("publish_property", {
        target_property_id: request.propertyId,
        expected_property_version: request.expectedVersion,
        request_idempotency_key: request.idempotencyKey
      });
      if (error) return { outcome: "conflict" };
      return data as Awaited<ReturnType<PublicationRepository["publish"]>>;
    }
  };
  const result = await publishProperty(input, { tenantId: context.tenantId, userId: context.userId }, repository);
  revalidatePath("/dashboard/properties");
  revalidatePath("/properties");
  return result;
}

export async function publishPropertyFormAction(formData: FormData): Promise<void> {
  await publishPropertyAction({
    propertyId: formData.get("propertyId"),
    expectedVersion: Number(formData.get("expectedVersion")),
    idempotencyKey: formData.get("idempotencyKey")
  });
}
