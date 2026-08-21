import { signupAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="auth-shell">
      <AuthForm mode="signup" action={signupAction} />
    </main>
  );
}
