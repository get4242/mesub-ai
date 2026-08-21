"use client";

import { createBrowserClient } from "@supabase/ssr";
import { parsePublicEnv } from "@/config/env";

export function createClient() {
  const env = parsePublicEnv(process.env);
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
