"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, type AuthActionResult } from "./schemas";

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "กรุณาตรวจสอบอีเมลและรหัสผ่าน" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, code: "INVALID_CREDENTIALS", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return { ok: false, code: "EMAIL_UNVERIFIED", message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ" };
  }
  return { ok: true };
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "กรุณาตรวจสอบข้อมูลสมัครสมาชิก" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } }
  });
  if (error) return { ok: false, code: "AUTH_UNAVAILABLE", message: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่" };
  return { ok: true };
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
