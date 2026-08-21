import type { AgentContext } from "@/lib/auth/agent-context";
import { propertyDraftSchema, propertyUpdateSchema, type PropertyDraftInput, type PropertyUpdateInput } from "./schemas";

export type PropertyRecordVersion = { id: string; version: number; criticalVersion: number };
export type PropertyMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "INVALID_INPUT" | "NOT_FOUND" | "FORBIDDEN" | "VERSION_CONFLICT" | "INVALID_TRANSITION"; message: string };

export type PropertyRepository = {
  createDraft(input: PropertyDraftInput & { tenantId: string; ownerAgentId: string }): Promise<PropertyRecordVersion>;
  updateDraft(input: PropertyUpdateInput & { tenantId: string; ownerAgentId: string }): Promise<PropertyRecordVersion | null>;
};

export async function createPropertyDraft(input: unknown, context: AgentContext, repository: PropertyRepository): Promise<PropertyMutationResult<PropertyRecordVersion>> {
  const parsed = propertyDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "กรุณาตรวจสอบข้อมูลทรัพย์" };
  const data = await repository.createDraft({ ...parsed.data, tenantId: context.tenantId, ownerAgentId: context.agentProfileId });
  return { ok: true, data };
}

export async function updatePropertyDraft(input: unknown, context: AgentContext, repository: PropertyRepository): Promise<PropertyMutationResult<PropertyRecordVersion>> {
  const parsed = propertyUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "กรุณาตรวจสอบข้อมูลที่แก้ไข" };
  const data = await repository.updateDraft({ ...parsed.data, tenantId: context.tenantId, ownerAgentId: context.agentProfileId });
  if (!data) return { ok: false, code: "VERSION_CONFLICT", message: "มีข้อมูลเวอร์ชันใหม่กว่า กรุณาโหลดข้อมูลอีกครั้ง" };
  return { ok: true, data };
}
