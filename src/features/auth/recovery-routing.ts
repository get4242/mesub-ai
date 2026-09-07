export function safeAuthNext(value: string | null) {
  if (value === "/reset-password") return value;
  return value?.startsWith("/dashboard") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export function passwordRecoveryRedirectUrl(origin: string) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", "/reset-password");
  return callback.toString();
}
