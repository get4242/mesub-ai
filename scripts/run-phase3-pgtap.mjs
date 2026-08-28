import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import "./assert-supabase-development.mjs";

const cli = resolve("node_modules/supabase/dist/supabase.js");
const result = spawnSync(
  process.execPath,
  [cli, "db", "query", "--linked", "--file", "supabase/tests/phase3_publish_public_web_test.sql"],
  { stdio: "inherit", env: process.env }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
