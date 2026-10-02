"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { AuthActionResult } from "./schemas";
import { Brand } from "@/components/public-shell";

type Props = {
  mode: "login" | "signup";
  action(formData: FormData): Promise<AuthActionResult>;
  notice?: string;
  nextPath?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "กำลังดำเนินการ…" : label}</button>;
}

export function AuthForm({ mode, action, notice, nextPath = "/dashboard" }: Props) {
  const router = useRouter();
  const [result, formAction] = useActionState<AuthActionResult | null, FormData>(
    async (_previous, formData) => action(formData),
    null
  );
  const signup = mode === "signup";
  useEffect(() => {
    if (!result?.ok || signup) return;
    const redirect = window.setTimeout(() => router.replace(nextPath), 750);
    return () => window.clearTimeout(redirect);
  }, [nextPath, result, router, signup]);

  return (
    <div className="auth-card">
      <Brand />
      <form action={formAction} className="panel">
      <h1>{signup ? "สมัคร Agent" : "เข้าสู่ระบบ Agent"}</h1>
      {notice ? <p className="auth-notice" role="status" aria-live="polite">{notice}</p> : null}
      {signup ? (
        <div className="auth-field">
          <label htmlFor="displayName">ชื่อที่ใช้แสดง</label>
          <input id="displayName" name="displayName" maxLength={120} required />
        </div>
      ) : null}
      <div className="auth-field">
        <label htmlFor="email">อีเมล</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="auth-field">
        <label htmlFor="password">รหัสผ่าน</label>
        <input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={6} required />
        {signup ? <p className="auth-help">รหัสผ่านอย่างน้อย 6 ตัวอักษร</p> : null}
      </div>
      {!signup ? <p><Link className="text-link" href="/forgot-password">ลืมรหัสผ่าน?</Link></p> : null}
      {result && !result.ok ? <p role="alert">{result.message}</p> : null}
      {result?.ok ? <p role="status" aria-live="polite">{result.message}</p> : null}
      <SubmitButton label={signup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"} />
      <p>{signup ? "มีบัญชีแล้ว?" : "ยังไม่มีบัญชี?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</Link></p>
      </form>
    </div>
  );
}
