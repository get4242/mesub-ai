import { redirect } from "next/navigation";
import { Brand } from "@/components/public-shell";
import { resetPasswordAction } from "@/features/auth/actions";
import { PasswordForm } from "@/features/auth/password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?error=reset_session");

  return (
    <div className="auth-card">
      <Brand />
      <div className="panel">
        <h1>ตั้งรหัสผ่านใหม่</h1>
        <PasswordForm mode="reset" action={resetPasswordAction} />
      </div>
    </div>
  );
}
