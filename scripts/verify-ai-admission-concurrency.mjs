import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const project = JSON.parse(readFileSync(new URL("../supabase/project-role.json", import.meta.url), "utf8"));
if (project.role !== "promoted-production" || project.projectRef !== "ptfhybowvtywyyidcswu") {
  throw new Error("PROMOTED_PRODUCTION_TARGET_MISMATCH");
}
if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN_MISSING");

const cli = resolve("node_modules/supabase/dist/supabase.js");
const tempFiles = [];
const propertyIds = [
  "f2900000-0000-4000-8000-000000000001",
  "f2900000-0000-4000-8000-000000000002",
];

function sqlFile(name, sql) {
  const path = join(tmpdir(), `mesub-${name}-${process.pid}.sql`);
  writeFileSync(path, sql, { encoding: "utf8", mode: 0o600 });
  tempFiles.push(path);
  return path;
}

function args(file) {
  return [cli, "db", "query", "--linked", "--project-ref", project.projectRef, "--file", file];
}

function run(file, label) {
  const result = spawnSync(process.execPath, args(file), { env: process.env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label}_FAILED:${(result.stderr || result.stdout).slice(-2000)}`);
}

function runConcurrent(file) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args(file), { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`CONCURRENT_CALL_FAILED:${output.slice(-2000)}`)));
  });
}

const cleanup = sqlFile("ai-admission-cleanup", `
do $$
declare message_id bigint;
begin
  for message_id in
    select queue.msg_id
    from pgmq.q_mesub_ai_jobs queue
    join public.ai_runs run on run.id::text = queue.message->>'runId'
    where run.property_id in ('${propertyIds[0]}'::uuid, '${propertyIds[1]}'::uuid)
  loop
    perform pgmq.delete('mesub_ai_jobs', message_id);
  end loop;
end $$;
delete from public.properties where id in ('${propertyIds[0]}'::uuid, '${propertyIds[1]}'::uuid);
`);

const setup = sqlFile("ai-admission-setup", `
begin;
do $$ begin
  if (select queue_length from pgmq.metrics('mesub_ai_jobs')) <> 0 then
    raise exception 'AI_QUEUE_NOT_EMPTY_BEFORE_CONCURRENCY_TEST';
  end if;
  if (select count(*) from public.properties where id in ('${propertyIds[0]}'::uuid, '${propertyIds[1]}'::uuid)) <> 0 then
    raise exception 'AI_CONCURRENCY_FIXTURE_ALREADY_EXISTS';
  end if;
end $$;
with owners as (
  select row_number() over (order by membership.tenant_id) as ordinal,
    membership.tenant_id, membership.user_id, agent.id as agent_id
  from public.tenant_memberships membership
  join public.agent_profiles agent on agent.tenant_id=membership.tenant_id and agent.user_id=membership.user_id
  where membership.role='owner' and membership.status='active'
  order by membership.tenant_id limit 2
)
insert into public.properties (
  id, tenant_id, owner_agent_id, listing_type, property_type, title, description,
  province, district, price, land_area_sqm
)
select case ordinal when 1 then '${propertyIds[0]}'::uuid else '${propertyIds[1]}'::uuid end,
  tenant_id, agent_id, 'sale', 'land', 'Concurrency verification',
  'Temporary controlled fixture', 'กรุงเทพมหานคร', 'ทดสอบ', 1, 1
from owners;
do $$ begin
  if (select count(*) from public.properties where id in ('${propertyIds[0]}'::uuid, '${propertyIds[1]}'::uuid)) <> 2 then
    raise exception 'TWO_OWNER_TENANTS_REQUIRED';
  end if;
end $$;
commit;
`);

function admissionCall(idempotency, trace) {
  return sqlFile(`ai-admission-${idempotency.slice(-1)}`, `
begin;
set local role service_role;
set local "request.jwt.claims"='{"role":"service_role"}';
select * from public.admit_ai_run_server(
  (select tenant_id from public.properties where id='${propertyIds[0]}'::uuid),
  '${propertyIds[0]}'::uuid,
  (select membership.user_id from public.properties property
    join public.tenant_memberships membership on membership.tenant_id=property.tenant_id
    where property.id='${propertyIds[0]}'::uuid and membership.role='owner' and membership.status='active'
    order by membership.created_at limit 1),
  '${idempotency}'::uuid, '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction', '${trace}'::uuid,
  3, 1, 10
);
select pg_sleep(5);
commit;
`);
}

const verify = sqlFile("ai-admission-verify", `
do $$
declare run_count bigint; active_count bigint; queue_count bigint;
begin
  select count(*), count(*) filter (where state in ('queued','running'))
    into run_count, active_count from public.ai_runs where property_id='${propertyIds[0]}'::uuid;
  select count(*) into queue_count from pgmq.q_mesub_ai_jobs queue
    join public.ai_runs run on run.id::text=queue.message->>'runId'
    where run.property_id='${propertyIds[0]}'::uuid;
  if run_count <> 1 or active_count <> 1 or queue_count <> 1 then
    raise exception 'CONCURRENCY_ASSERTION_FAILED runs=% active=% queue=%', run_count, active_count, queue_count;
  end if;
end $$;
`);

const verifyCleanup = sqlFile("ai-admission-cleanup-verify", `
do $$
begin
  if exists (select 1 from public.properties where id in ('${propertyIds[0]}'::uuid, '${propertyIds[1]}'::uuid)) then
    raise exception 'PROPERTY_FIXTURE_RESIDUE';
  end if;
  if exists (select 1 from public.ai_runs where property_id in ('${propertyIds[0]}'::uuid, '${propertyIds[1]}'::uuid)) then
    raise exception 'AI_RUN_FIXTURE_RESIDUE';
  end if;
  if (select queue_length from pgmq.metrics('mesub_ai_jobs')) <> 0 then
    raise exception 'AI_QUEUE_RESIDUE';
  end if;
end $$;
`);

let succeeded = false;
try {
  run(cleanup, "PRE_CLEANUP");
  run(setup, "SETUP");
  await Promise.all([
    runConcurrent(admissionCall("f2910000-0000-4000-8000-000000000001", "f2920000-0000-4000-8000-000000000001")),
    runConcurrent(admissionCall("f2910000-0000-4000-8000-000000000002", "f2920000-0000-4000-8000-000000000002")),
  ]);
  run(verify, "VERIFY");
  succeeded = true;
} finally {
  run(cleanup, "CLEANUP");
  run(verifyCleanup, "CLEANUP_VERIFY");
  for (const file of tempFiles) rmSync(file, { force: true });
}

if (succeeded) console.log("AI_ADMISSION_CONCURRENCY_VERIFIED");
