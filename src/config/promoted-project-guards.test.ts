import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const promotedEnvironment = {
  ...process.env,
  SUPABASE_TARGET_ENV: "development",
  SUPABASE_DEV_PROJECT_REF: "ptfhybowvtywyyidcswu",
  SUPABASE_PRODUCTION_PROJECT_REF: "ptfhybowvtywyyidcswu",
  SUPABASE_DEV_URL: "https://ptfhybowvtywyyidcswu.supabase.co",
  SUPABASE_DEV_PUBLISHABLE_KEY: "placeholder",
  SUPABASE_DEV_SECRET_KEY: "placeholder",
};

describe("promoted Supabase project guards", () => {
  for (const script of [
    "scripts/verify-phase0-cloud.mjs",
    "scripts/verify-phase1-cloud.mjs",
    "scripts/verify-phase2-cloud.mjs",
    "scripts/verify-phase3-cloud.mjs",
    "scripts/verify-phase4-cloud.mjs",
  ]) {
    it(`rejects destructive Development regression entry point ${script}`, () => {
      const result = spawnSync(process.execPath, [script], {
        cwd: process.cwd(),
        env: promotedEnvironment,
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr + result.stdout).toContain("Refusing Development operation: project is promoted-production.");
    });
  }
});
