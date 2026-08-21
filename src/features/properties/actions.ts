"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { createPropertyDraft, updatePropertyDraft, type PropertyRepository, type PropertyMutationResult, type PropertyRecordVersion } from "./action-logic";

function toDatabaseFields(input: Record<string, unknown>) {
  const mapping: Record<string, string> = {
    listingType: "listing_type", propertyType: "property_type", addressLine: "address_line",
    landAreaSquareMetres: "land_area_sqm", buildingAreaSquareMetres: "building_area_sqm"
  };
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [mapping[key] ?? key, value]));
}

async function repository(): Promise<PropertyRepository> {
  const supabase = await createClient();
  return {
    async createDraft(input) {
      const { tenantId, ownerAgentId, ...fields } = input;
      const { data, error } = await supabase.from("properties").insert({ tenant_id: tenantId, owner_agent_id: ownerAgentId, ...toDatabaseFields(fields) }).select("id,version,critical_version").single();
      if (error) throw error;
      return { id: data.id, version: data.version, criticalVersion: data.critical_version };
    },
    async updateDraft(input) {
      const { tenantId, ownerAgentId, propertyId, expectedVersion, ...fields } = input;
      void ownerAgentId;
      const { data, error } = await supabase.from("properties").update(toDatabaseFields(fields)).eq("id", propertyId).eq("tenant_id", tenantId).eq("version", expectedVersion).select("id,version,critical_version").maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, version: data.version, criticalVersion: data.critical_version } : null;
    }
  };
}

export async function createPropertyDraftAction(input: unknown): Promise<PropertyMutationResult<PropertyRecordVersion>> {
  const result = await createPropertyDraft(input, await requireAgentContext(), await repository());
  if (result.ok) revalidatePath("/dashboard/properties");
  return result;
}

export async function updatePropertyDraftAction(input: unknown): Promise<PropertyMutationResult<PropertyRecordVersion>> {
  const result = await updatePropertyDraft(input, await requireAgentContext(), await repository());
  if (result.ok) revalidatePath("/dashboard/properties");
  return result;
}

async function transition(propertyId: string, expectedVersion: number, status: "draft" | "pending_confirmation" | "archived") {
  return updatePropertyDraftAction({ propertyId, expectedVersion, status });
}

export async function requestPropertyConfirmationAction(propertyId: string, expectedVersion: number) { return transition(propertyId, expectedVersion, "pending_confirmation"); }
export async function returnPropertyToDraftAction(propertyId: string, expectedVersion: number) { return transition(propertyId, expectedVersion, "draft"); }
export async function archivePropertyAction(propertyId: string, expectedVersion: number) { return transition(propertyId, expectedVersion, "archived"); }

function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || value === "" ? undefined : Number(value);
}

export async function createPropertyDraftFormAction(formData: FormData): Promise<void> {
  await createPropertyDraftAction({
    listingType: formData.get("listingType"), propertyType: formData.get("propertyType"),
    title: formData.get("title"), description: formData.get("description"), province: formData.get("province"),
    district: formData.get("district"), subdistrict: formData.get("subdistrict") || undefined,
    price: formData.get("price"), currency: "THB",
    landAreaSquareMetres: formData.get("landAreaSquareMetres") || undefined,
    buildingAreaSquareMetres: formData.get("buildingAreaSquareMetres") || undefined,
    bedrooms: optionalNumber(formData.get("bedrooms")), bathrooms: optionalNumber(formData.get("bathrooms"))
  });
}
