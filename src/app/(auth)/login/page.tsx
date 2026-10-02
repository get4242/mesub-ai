import { loginAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { safeAuthNext } from "@/features/auth/recovery-routing";

type Props = {
  searchParams: Promise<{ signup?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { signup, next } = await searchParams;
  const notice = signup === "confirmed"
    ? "ลงทะเบียนสำเร็จ คุณเข้าสู่ระบบได้ทันที"
    : signup === "check-email"
      ? "ลงทะเบียนสำเร็จแล้ว กรุณาตรวจสอบ Inbox หรือ Spam และกดลิงก์ยืนยันอีเมลก่อนเข้าสู่ระบบ"
      : undefined;

  return (
    <main className="auth-shell">
      <AuthForm mode="login" action={loginAction} notice={notice} nextPath={safeAuthNext(next ?? null)} />
    </main>
  );
}
