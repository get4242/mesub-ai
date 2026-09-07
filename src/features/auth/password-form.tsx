"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import type { AuthActionResult } from "./schemas";

type Props = {
  mode: "forgot" | "reset" | "change";
  action(formData: FormData): Promise<AuthActionResult>;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "กำลังดำเนินการ…" : label}</button>;
}

export function PasswordForm({ mode, action }: Props) {
  const router = useRouter();
  const [result, formAction] = useActionState<AuthActionResult | null, FormData>(
    async (_previous, formData) => action(formData),
    null
  );
  const forgot = mode === "forgot";
  const change = mode === "change";

  useEffect(() => {
    if (result?.ok && !forgot) router.replace("/login?password=updated");
  }, [forgot, result, router]);

  return (
    <form action={formAction} className="property-form">
      {forgot ? (
        <label className="field">
          <span>อีเมล</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
      ) : (
        <>
          {change ? (
            <label className="field">
              <span>รหัสผ่านปัจจุบัน</span>
              <input name="currentPassword" type="password" autoComplete="current-password" minLength={6} required />
            </label>
          ) : null}
          <label className="field">
            <span>รหัสผ่านใหม่</span>
            <input name="password" type="password" autoComplete="new-password" minLength={6} required />
            <span className="hint">รหัสผ่านอย่างน้อย 6 ตัวอักษร</span>
          </label>
          <label className="field">
            <span>ยืนยันรหัสผ่านใหม่</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required />
          </label>
        </>
      )}
      {result && !result.ok ? <p role="alert">{result.message}</p> : null}
      {result?.ok && forgot ? <p role="status">หากมีบัญชีนี้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปทางอีเมล</p> : null}
      <SubmitButton label={forgot ? "ส่งลิงก์ตั้งรหัสผ่าน" : "บันทึกรหัสผ่านใหม่"} />
      {forgot ? <p><Link className="text-link" href="/login">กลับหน้าเข้าสู่ระบบ</Link></p> : null}
    </form>
  );
}
