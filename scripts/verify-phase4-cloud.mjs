import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "./assert-supabase-development.mjs";
const required = ["SUPABASE_DEV_URL", "SUPABASE_DEV_PUBLISHABLE_KEY", "SUPABASE_DEV_SECRET_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error("Missing required environment variables: " + missing.join(", "));
const admin = createClient(process.env.SUPABASE_DEV_URL, process.env.SUPABASE_DEV_SECRET_KEY, { auth: { persistSession: false } });
const fixture = randomUUID(); const users = []; const eventId = "phase4-event-" + fixture;
function assert(value, message) { if (!value) throw new Error(message); console.log("ok - " + message); }
async function createAgent(label) {
  const email = "phase4-" + label + "-" + fixture + "@example.com"; const password = "Phase4-" + randomUUID() + "!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Phase 4 " + label } });
  if (error) throw error; users.push(data.user.id);
  const client = createClient(process.env.SUPABASE_DEV_URL, process.env.SUPABASE_DEV_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password }); if (signInError) throw signInError;
  return { id: data.user.id, client };
}
async function cleanupUser(userId) {
  await admin.from("line_identity_links").delete().eq("user_id", userId);
  await admin.from("line_link_challenges").delete().eq("user_id", userId);
  const { data: tenants } = await admin.from("tenants").select("id").eq("created_by_user_id", userId);
  for (const tenant of tenants ?? []) { await admin.from("audit_logs").delete().eq("tenant_id", tenant.id); await admin.from("tenants").delete().eq("id", tenant.id); }
  await admin.auth.admin.deleteUser(userId);
}
try {
  const a = await createAgent("a"); const b = await createAgent("b");
  const insertion = await admin.from("line_identity_links").insert([
    { user_id: a.id, provider_id: "phase4-dev", environment: "development", subject_hash: "a".repeat(64), subject_ciphertext: "x".repeat(40), consent_version: "line-link-v1" },
    { user_id: b.id, provider_id: "phase4-dev", environment: "development", subject_hash: "b".repeat(64), subject_ciphertext: "y".repeat(40), consent_version: "line-link-v1" },
  ]); if (insertion.error) throw insertion.error;
  const ownA = await a.client.from("line_identity_links").select("user_id");
  assert(!ownA.error && ownA.data.length === 1 && ownA.data[0].user_id === a.id, "Tenant/User A reads only own LINE link");
  const ownB = await b.client.from("line_identity_links").select("user_id");
  assert(ownB.data?.length === 1 && ownB.data[0].user_id === b.id, "Tenant/User B reads only own LINE link");
  const anon = createClient(process.env.SUPABASE_DEV_URL, process.env.SUPABASE_DEV_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const anonRead = await anon.from("line_identity_links").select("id");
  assert(Boolean(anonRead.error), "anonymous cannot read LINE identity links");
  const args = { target_event_id: eventId, target_environment: "development", target_event_type: "message", target_timestamp_ms: Date.now(), target_payload: { eventId, type: "message" }, target_retention_until: new Date(Date.now() + 30 * 86400000).toISOString() };
  const first = await admin.rpc("accept_line_webhook_server", args); const duplicate = await admin.rpc("accept_line_webhook_server", args);
  assert(first.data === true && duplicate.data === false, "webhook event ID is accepted once and duplicate is idempotent");
  const rows = await admin.from("line_webhook_receipts").select("retention_until").eq("event_id", eventId);
  assert(rows.data?.length === 1, "one durable webhook receipt exists with retention metadata");
  const jobs = await admin.rpc("read_line_jobs_server", { visibility_timeout_seconds: 1, batch_size: 10 });
  const job = jobs.data?.find((entry) => entry.message?.eventId === eventId);
  assert(Boolean(job), "accepted webhook enqueues an ID-only durable job");
  if (job) await admin.rpc("archive_line_job_server", { message_id: job.message_id });
} finally {
  await admin.from("line_webhook_receipts").delete().eq("event_id", eventId);
  for (const userId of users.reverse()) await cleanupUser(userId);
}
console.log("Phase 4 Cloud Development integration verification passed; fixtures and queue message cleaned.");
