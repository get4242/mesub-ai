import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "./assert-supabase-development.mjs";

const required = ["SUPABASE_DEV_URL", "SUPABASE_DEV_PUBLISHABLE_KEY", "SUPABASE_DEV_SECRET_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

const admin = createClient(process.env.SUPABASE_DEV_URL, process.env.SUPABASE_DEV_SECRET_KEY, { auth: { persistSession: false } });
const email = `phase3-concurrency-${randomUUID()}@example.com`;
const password = `Phase3-${randomUUID()}!`;
let userId;

function assert(condition, message) { if (!condition) throw new Error(message); console.log(`ok - ${message}`); }

async function cleanupUser(targetUserId) {
  const { data: tenants, error: tenantLookupError } = await admin.from("tenants").select("id").eq("created_by_user_id", targetUserId);
  if (tenantLookupError) throw tenantLookupError;
  for (const tenant of tenants) {
    const { error: auditError } = await admin.from("audit_logs").delete().eq("tenant_id", tenant.id);
    if (auditError) throw auditError;
    const { error: tenantError } = await admin.from("tenants").delete().eq("id", tenant.id);
    if (tenantError) throw tenantError;
  }
  const { error: userError } = await admin.auth.admin.deleteUser(targetUserId);
  if (userError && !/not found/i.test(userError.message)) throw userError;
}

const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
for (const stale of existingUsers.users.filter((user) => /^phase3-concurrency-/i.test(user.email ?? ""))) await cleanupUser(stale.id);

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Phase 3 Concurrency" } });
  if (createError) throw createError; userId = created.user.id;
  const { data: agent, error: agentError } = await admin.from("agent_profiles").select("id,tenant_id").eq("user_id", userId).single();
  if (agentError) throw agentError;
  const propertyIds = Array.from({ length: 4 }, () => randomUUID());
  const rows = propertyIds.map((id, index) => ({ id, tenant_id: agent.tenant_id, owner_agent_id: agent.id, listing_type: "sale", property_type: "land", title: `Concurrency ${index + 1}`, description: "Quota concurrency verification", province: "เชียงใหม่", district: "เมืองเชียงใหม่", price: 1000000 + index, land_area_sqm: 100 }));
  const { error: propertyError } = await admin.from("properties").insert(rows); if (propertyError) throw propertyError;
  const { error: confirmationError } = await admin.from("property_confirmations").insert(propertyIds.map((propertyId) => ({ tenant_id: agent.tenant_id, property_id: propertyId, confirmed_by_user_id: userId, property_version: 1, critical_version: 1 })));
  if (confirmationError) throw confirmationError;
  const client = createClient(process.env.SUPABASE_DEV_URL, process.env.SUPABASE_DEV_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password }); if (signInError) throw signInError;
  const results = await Promise.all(propertyIds.map((propertyId, index) => client.rpc("publish_property", { target_property_id: propertyId, expected_property_version: 1, request_idempotency_key: `concurrency:${propertyId}:${index}` })));
  assert(results.every((result) => !result.error), "four concurrent publish RPCs complete with stable outcomes");
  const outcomes = results.map((result) => result.data?.outcome).sort();
  assert(outcomes.filter((outcome) => outcome === "published").length === 3, "exactly three concurrent publishes succeed");
  assert(outcomes.filter((outcome) => outcome === "quota_exceeded").length === 1, "concurrent fourth publish is quota blocked");
  const { data: states, error: stateError } = await admin.from("properties").select("status").in("id", propertyIds); if (stateError) throw stateError;
  assert(states.filter((row) => row.status === "published").length === 3 && states.filter((row) => row.status === "draft").length === 1, "canonical state preserves the blocked fourth draft");
} finally {
  if (userId) await cleanupUser(userId);
}

console.log("Phase 3 quota concurrency verification passed and fixtures were cleaned up.");
