"use server";

import { revalidatePath } from "next/cache";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { createClient } from "@/lib/supabase/server";
import { appointmentInputSchema, appointmentChangeSchema, appointmentError } from "./domain";

export async function saveAppointment(input: unknown) {
  await requireAgentContext();
  const parsed = appointmentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "กรุณาตรวจข้อมูลนัด" };
  const client = await createClient();
  const { propertyId, idempotencyKey, ...fields } = parsed.data;
  const { error } = await client.rpc("create_appointment", {
    target_property: propertyId, target_input: fields, target_key: idempotencyKey,
  });
  if (error) return { ok: false, message: appointmentError(error.message) };
  revalidatePath("/dashboard/appointments");
  return { ok: true, message: "สร้างนัดแล้ว กรุณายืนยันนัดเพื่อเปิดการแจ้งเตือน" };
}

export async function changeAppointment(input: unknown) {
  await requireAgentContext();
  const parsed = appointmentChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "กรุณาตรวจข้อมูลนัด" };
  const client = await createClient();
  const value = parsed.data;
  const { error } = await client.rpc("change_appointment", {
    target_id: value.id, target_version: value.version, target_action: value.action,
    target_start: value.startsAt ?? null, target_end: value.endsAt ?? null,
    target_notes: value.notes ?? null,
  });
  if (error) return { ok: false, message: appointmentError(error.message) };
  revalidatePath("/dashboard/appointments");
  return { ok: true, message: "บันทึกการเปลี่ยนแปลงแล้ว" };
}
