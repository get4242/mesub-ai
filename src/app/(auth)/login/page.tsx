import { loginAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <AuthForm mode="login" action={loginAction} />
    </main>
  );
}
