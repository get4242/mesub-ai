"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type AuthActionResult
} from "./schemas";
import { passwordRecoveryRedirectUrl } from "./recovery-routing";

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
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const emailRedirectTo = origin ? new URL("/auth/callback", origin).toString() : undefined;
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo
    }
  });
  if (error) return { ok: false, code: "AUTH_UNAVAILABLE", message: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่" };
  return { ok: true };
}

export async function forgotPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "กรุณากรอกอีเมลให้ถูกต้อง" };

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "https://mesub-ai.vercel.app";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: passwordRecoveryRedirectUrl(origin)
  });
  if (error) return { ok: false, code: "AUTH_UNAVAILABLE", message: "ยังไม่สามารถส่งอีเมลได้ กรุณาลองใหม่ภายหลัง" };
  return { ok: true };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษรและตรงกัน" };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, code: "AUTH_UNAVAILABLE", message: "ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุ" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, code: "PASSWORD_UPDATE_FAILED", message: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์ใหม่" };
  await supabase.auth.signOut();
  return { ok: true };
}

export async function changePasswordAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษรและตรงกัน" };

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, code: "AUTH_UNAVAILABLE", message: "กรุณาเข้าสู่ระบบใหม่" };
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    current_password: parsed.data.currentPassword
  });
  if (error) return { ok: false, code: "PASSWORD_UPDATE_FAILED", message: "รหัสผ่านปัจจุบันไม่ถูกต้อง หรือไม่สามารถเปลี่ยนรหัสได้" };
  await supabase.auth.signOut();
  return { ok: true };
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
