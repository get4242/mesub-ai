"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { publishProperty, type PublicationRepository } from "./publication";

export async function publishPropertyAction(input: unknown) {
  const context = await requireAgentContext();
  const client = await createClient();
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
