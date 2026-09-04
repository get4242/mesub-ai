import "./assert-supabase-development.mjs";
import { randomUUID } from "node:crypto";

const required = ["SUPABASE_DEV_PROJECT_REF", "SUPABASE_DEV_URL", "SUPABASE_DEV_PUBLISHABLE_KEY", "SUPABASE_DEV_SECRET_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
if (process.env.SUPABASE_TARGET_ENV !== "development") throw new Error("Phase 1 verification requires SUPABASE_TARGET_ENV=development");
if (!process.env.SUPABASE_DEV_URL.includes(process.env.SUPABASE_DEV_PROJECT_REF)) throw new Error("Development URL/project ref mismatch");
if (process.env.SUPABASE_PRODUCTION_PROJECT_REF === process.env.SUPABASE_DEV_PROJECT_REF) throw new Error("Refusing Production project");

const url = process.env.SUPABASE_DEV_URL;
const publicKey = process.env.SUPABASE_DEV_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_DEV_SECRET_KEY;
const users = [];
const objects = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`ok - ${message}`);
}

async function request(path, { key, token = key, method = "GET", body, headers = {} } = {}) {
  const json = body !== undefined && !(body instanceof Uint8Array);
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : json ? JSON.stringify(body) : body
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: response.ok, status: response.status, data, headers: response.headers };
}

async function rest(resource, options = {}) {
  const admin = options.admin === true;
  return request(`/rest/v1/${resource}`, { ...options, key: admin ? secretKey : publicKey, token: admin ? secretKey : options.token });
}

async function createUser(label) {
  const suffix = randomUUID();
  const email = `phase1-${label}-${suffix}@example.com`;
  const password = `Phase1-${suffix}-Aa9!`;
  const created = await request("/auth/v1/admin/users", { key: secretKey, method: "POST", body: { email, password, email_confirm: true, user_metadata: { display_name: `Phase 1 ${label}` } } });
  if (!created.ok) throw new Error(`Could not create ${label} test user: HTTP ${created.status}`);
  users.push(created.data.id);
  const signedIn = await request("/auth/v1/token?grant_type=password", { key: publicKey, method: "POST", body: { email, password } });
  if (!signedIn.ok) throw new Error(`Could not sign in ${label} test user`);
  const [tenant, agent] = await Promise.all([
    rest(`tenants?select=id&created_by_user_id=eq.${created.data.id}`, { admin: true }),
    rest(`agent_profiles?select=id,tenant_id&user_id=eq.${created.data.id}`, { admin: true })
  ]);
  assert(tenant.data?.length === 1 && agent.data?.length === 1, `${label} signup bootstraps one tenant and Agent Profile`);
  return { id: created.data.id, token: signedIn.data.access_token, tenantId: tenant.data[0].id, agentId: agent.data[0].id };
}

try {
  for (const table of ["agent_profiles", "properties", "property_media", "audit_logs"]) {
    const anonymous = await rest(`${table}?select=*`, { token: publicKey });
    assert(!anonymous.ok || anonymous.data?.length === 0, `anonymous cannot read canonical ${table}`);
  }

  const userA = await createUser("A");
  const userB = await createUser("B");
  let propertyAId;
  let propertyBId;

  const createA = await rest("properties?select=id,version,critical_version", { token: userA.token, method: "POST", headers: { Prefer: "return=representation" }, body: { tenant_id: userA.tenantId, owner_agent_id: userA.agentId, listing_type: "sale", property_type: "land", title: "Phase 1 A", description: "Private A", province: "เชียงใหม่", district: "เมืองเชียงใหม่", price: 2500000, land_area_sqm: 400 } });
  assert(createA.ok && createA.data?.[0]?.version === 1, "Tenant A creates its own Property draft");
  propertyAId = createA.data[0].id;

  const createB = await rest("properties?select=id", { token: userB.token, method: "POST", headers: { Prefer: "return=representation" }, body: { tenant_id: userB.tenantId, owner_agent_id: userB.agentId, listing_type: "rent", property_type: "land", title: "Phase 1 B", description: "Private B", province: "ลำพูน", district: "เมืองลำพูน", price: 12000, land_area_sqm: 200 } });
  assert(createB.ok, "Tenant B creates its own Property draft");
  propertyBId = createB.data[0].id;

  const crossRead = await rest(`properties?select=id&id=eq.${propertyBId}`, { token: userA.token });
  assert(crossRead.ok && crossRead.data.length === 0, "Tenant A cannot read Tenant B Property");
  const crossUpdate = await rest(`properties?id=eq.${propertyBId}`, { token: userA.token, method: "PATCH", headers: { Prefer: "return=representation" }, body: { title: "forbidden" } });
  assert(crossUpdate.ok && crossUpdate.data.length === 0, "Tenant A cannot update Tenant B Property");

  const nonCritical = await rest(`properties?id=eq.${propertyAId}&version=eq.1&select=version,critical_version`, { token: userA.token, method: "PATCH", headers: { Prefer: "return=representation" }, body: { description: "Updated description" } });
  assert(nonCritical.ok && nonCritical.data[0].version === 2 && nonCritical.data[0].critical_version === 1, "non-critical edit increments only general version");
  const critical = await rest(`properties?id=eq.${propertyAId}&version=eq.2&select=version,critical_version`, { token: userA.token, method: "PATCH", headers: { Prefer: "return=representation" }, body: { price: 2600000 } });
  assert(critical.ok && critical.data[0].version === 3 && critical.data[0].critical_version === 2, "critical edit increments both version counters");
  const stale = await rest(`properties?id=eq.${propertyAId}&version=eq.2&select=id`, { token: userA.token, method: "PATCH", headers: { Prefer: "return=representation" }, body: { title: "stale" } });
  assert(stale.ok && stale.data.length === 0, "stale optimistic write changes no row");
  const publish = await rest(`properties?id=eq.${propertyAId}`, { token: userA.token, method: "PATCH", body: { status: "published" } });
  assert(!publish.ok, "Phase 1 database rejects Published transition");

  const mediaId = randomUUID();
  const path = `${userA.tenantId}/${propertyAId}/${mediaId}/pixel.png`;
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nS8AAAAASUVORK5CYII=", "base64"));
  const media = await rest("property_media", { token: userA.token, method: "POST", body: { id: mediaId, tenant_id: userA.tenantId, property_id: propertyAId, bucket_id: "property-intake", object_path: path, original_filename: "pixel.png", mime_type: "image/png", byte_size: png.byteLength, width: 1, height: 1, checksum_sha256: "a".repeat(64), position: 0, status: "uploading" } });
  assert(media.ok, "Tenant A creates tenant-scoped media metadata");
  const ownReorder = await rest("rpc/reorder_property_media", { token: userA.token, method: "POST", body: { target_property_id: propertyAId, ordered_media_ids: [mediaId] } });
  assert(ownReorder.ok, "Tenant A can atomically reorder its Property media");
  const crossReorder = await rest("rpc/reorder_property_media", { token: userB.token, method: "POST", body: { target_property_id: propertyAId, ordered_media_ids: [mediaId] } });
  assert(!crossReorder.ok, "Tenant B cannot reorder Tenant A Property media");
  const upload = await request(`/storage/v1/object/property-intake/${path}`, { key: publicKey, token: userA.token, method: "POST", body: png, headers: { "Content-Type": "image/png", "x-upsert": "false" } });
  assert(upload.ok, "Tenant A uploads a non-upsert private object");
  objects.push({ bucket: "property-intake", path });
  const crossObject = await request(`/storage/v1/object/property-intake/${path}`, { key: publicKey, token: userB.token });
  assert(!crossObject.ok, "Tenant B cannot read Tenant A Storage object");

  const audit = await rest(`audit_logs?select=action,entity_id&entity_id=eq.${propertyAId}`, { admin: true });
  assert(audit.ok && audit.data.length >= 3, "Property mutations append audit records");
  console.log("Phase 1 Supabase Cloud integration verification passed.");
} finally {
  const cleanupFailures = [];
  for (const object of objects) {
    const deleted = await request(`/storage/v1/object/${object.bucket}/${object.path}`, { key: secretKey, method: "DELETE" });
    if (!deleted.ok && deleted.status !== 404) cleanupFailures.push(`storage:${object.path}`);
  }
  for (const userId of users) {
    const tenants = await rest(`tenants?select=id&created_by_user_id=eq.${userId}`, { admin: true });
    for (const tenant of tenants.data ?? []) {
      const auditsDeleted = await rest(`audit_logs?tenant_id=eq.${tenant.id}`, { admin: true, method: "DELETE" });
      const tenantDeleted = await rest(`tenants?id=eq.${tenant.id}`, { admin: true, method: "DELETE" });
      if (!auditsDeleted.ok) cleanupFailures.push(`audit:${tenant.id}`);
      if (!tenantDeleted.ok) cleanupFailures.push(`tenant:${tenant.id}`);
    }
    const userDeleted = await request(`/auth/v1/admin/users/${userId}`, { key: secretKey, method: "DELETE" });
    if (!userDeleted.ok && userDeleted.status !== 404) cleanupFailures.push(`user:${userId}`);
  }
  if (cleanupFailures.length) throw new Error(`Phase 1 cleanup failed: ${cleanupFailures.join(", ")}`);
  console.log("ok - Phase 1 test users, tenant rows and Storage objects were cleaned up");
}

const remainingUsers = await request("/auth/v1/admin/users?page=1&per_page=1000", { key: secretKey });
assert(
  remainingUsers.ok && !(remainingUsers.data?.users ?? []).some((user) => /^phase[01]-/i.test(user.email ?? "")),
  "no Phase 0/1 test Auth users remain"
);
const remainingProperties = await rest("properties?select=id,title&or=(title.ilike.Phase%201%25,title.ilike.Agent%20A%20land,title.ilike.Agent%20B%20land)", { admin: true });
assert(remainingProperties.ok && remainingProperties.data.length === 0, "no Phase 1 test Property rows remain");
const remainingObjects = await request("/storage/v1/object/list/property-intake", { key: secretKey, method: "POST", body: { prefix: "", limit: 1000 } });
assert(remainingObjects.ok && remainingObjects.data.length === 0, "no Property intake Storage objects remain");
