import { randomUUID } from "node:crypto";

const required = ["SUPABASE_DEV_URL", "SUPABASE_DEV_PUBLISHABLE_KEY", "SUPABASE_DEV_SECRET_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

const url = process.env.SUPABASE_DEV_URL;
const publicKey = process.env.SUPABASE_DEV_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_DEV_SECRET_KEY;
const createdUserIds = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`ok - ${message}`);
}

async function request(path, { key, token = key, method = "GET", body, prefer } = {}) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}

async function signup(label) {
  const suffix = randomUUID();
  const email = `phase0-${label}-${suffix}@gmail.com`;
  const password = `Phase0-${suffix}-Aa9!`;
  const signupResult = await request("/auth/v1/admin/users", {
    key: secretKey,
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Phase 0 ${label}` },
    },
  });
  if (!signupResult.ok || !signupResult.data?.id) {
    const detail = signupResult.data?.msg ?? signupResult.data?.error_description ?? signupResult.data?.message ?? signupResult.data?.error ?? "unknown Auth error";
    throw new Error(`Signup failed for user ${label} (HTTP ${signupResult.status}): ${detail}`);
  }
  const id = signupResult.data.id;
  createdUserIds.push(id);

  const signIn = await request("/auth/v1/token?grant_type=password", {
    key: publicKey,
    method: "POST",
    body: { email, password },
  });
  if (!signIn.ok || !signIn.data?.access_token) {
    throw new Error(`Sign-in failed for user ${label} (HTTP ${signIn.status})`);
  }
  return { id, token: signIn.data.access_token };
}

async function rest(tableAndQuery, { token, method = "GET", body, admin = false, prefer } = {}) {
  return request(`/rest/v1/${tableAndQuery}`, {
    key: admin ? secretKey : publicKey,
    token: admin ? secretKey : token,
    method,
    body,
    prefer,
  });
}

try {
  const anonymousRead = await rest("profiles?select=user_id", { token: publicKey });
  assert(!anonymousRead.ok || anonymousRead.data?.length === 0, "anonymous cannot read profiles");

  const userA = await signup("A");
  const userB = await signup("B");

  for (const user of [userA, userB]) {
    const [profile, tenant, membership, agentProfile] = await Promise.all([
      rest(`profiles?select=user_id&user_id=eq.${user.id}`, { admin: true }),
      rest(`tenants?select=id,type,created_by_user_id&created_by_user_id=eq.${user.id}`, { admin: true }),
      rest(`tenant_memberships?select=tenant_id,user_id,role,status&user_id=eq.${user.id}`, { admin: true }),
      rest(`agent_profiles?select=id,tenant_id,user_id&user_id=eq.${user.id}`, { admin: true }),
    ]);
    assert(profile.ok && profile.data.length === 1, "signup creates exactly one profile");
    assert(tenant.ok && tenant.data.length === 1 && tenant.data[0].type === "personal", "signup creates exactly one personal tenant");
    assert(membership.ok && membership.data.length === 1 && membership.data[0].role === "owner" && membership.data[0].status === "active", "signup creates exactly one active owner membership");
    assert(agentProfile.ok && agentProfile.data.length === 1, "signup creates exactly one agent profile");
    user.tenantId = tenant.data[0].id;
    assert(agentProfile.data[0].tenant_id === user.tenantId, "agent profile belongs to the personal tenant");
  }

  const ownRows = await rest("tenants?select=id", { token: userA.token });
  assert(ownRows.ok && ownRows.data.length === 1 && ownRows.data[0].id === userA.tenantId, "authenticated user reads only their tenant");

  const crossRead = await rest(`tenants?select=id&id=eq.${userB.tenantId}`, { token: userA.token });
  assert(crossRead.ok && crossRead.data.length === 0, "cross-tenant read is isolated");

  const ownUpdate = await rest(`tenants?id=eq.${userA.tenantId}&select=id`, {
    token: userA.token, method: "PATCH", body: { name: "Phase 0 A Updated" }, prefer: "return=representation",
  });
  assert(ownUpdate.ok && ownUpdate.data.length === 1, "tenant owner can update their tenant");

  const crossUpdate = await rest(`tenants?id=eq.${userB.tenantId}&select=id`, {
    token: userA.token, method: "PATCH", body: { name: "Forbidden" }, prefer: "return=representation",
  });
  assert(crossUpdate.ok && crossUpdate.data.length === 0, "cross-tenant update is isolated");

  const elevatedProfile = await rest(`profiles?user_id=eq.${userA.id}`, {
    token: userA.token, method: "PATCH", body: { platform_role: "admin" },
  });
  assert(!elevatedProfile.ok, "authenticated user cannot elevate platform role");

  const membershipWrite = await rest(`tenant_memberships?user_id=eq.${userA.id}`, {
    token: userA.token, method: "PATCH", body: { user_id: userB.id },
  });
  assert(!membershipWrite.ok, "authenticated user cannot reassign membership");

  console.log("Phase 0 Supabase Cloud integration verification passed.");
} finally {
  for (const userId of createdUserIds) {
    const tenantCleanup = await rest(`tenants?created_by_user_id=eq.${userId}`, { admin: true, method: "DELETE" });
    if (!tenantCleanup.ok) console.error(`warning - could not delete test tenant for ${userId}`);
    const userCleanup = await request(`/auth/v1/admin/users/${userId}`, { key: secretKey, method: "DELETE" });
    if (!userCleanup.ok) console.error(`warning - could not delete test user ${userId}`);
  }
}
