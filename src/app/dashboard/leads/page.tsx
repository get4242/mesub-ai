import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";

export default async function LeadsPage() {
  const context = await requireAgentContext(); const client = await createClient();
  const { data } = await client.from("leads").select("id,name,email,phone,message,property_id,created_at").eq("tenant_id", context.tenantId).order("created_at", { ascending: false });
  return <section><h1>ลีดของคุณ</h1>{!data?.length ? <p>ยังไม่มีผู้สนใจติดต่อเข้ามา</p> : <ul>{data.map((lead) => <li className="panel" key={lead.id}><strong>{lead.name}</strong><p>{lead.message}</p><p>{lead.email ?? lead.phone}</p></li>)}</ul>}</section>;
}
