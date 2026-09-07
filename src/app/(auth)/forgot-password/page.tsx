import { Brand } from "@/components/public-shell";
import { forgotPasswordAction } from "@/features/auth/actions";
import { PasswordForm } from "@/features/auth/password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="auth-card">
      <Brand />
      <div className="panel">
        <h1>ลืมรหัสผ่าน</h1>
        <p>กรอกอีเมลที่ใช้สมัครเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
        <PasswordForm mode="forgot" action={forgotPasswordAction} />
      </div>
    </div>
  );
}
