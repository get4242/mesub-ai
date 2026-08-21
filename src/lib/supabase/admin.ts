import "server-only";

import { createClient } from "@supabase/supabase-js";
import { parsePublicEnv } from "@/config/env";

export function createAdminClient() {
  const env = parsePublicEnv(process.env);
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is required for server-only public disclosure queries");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
