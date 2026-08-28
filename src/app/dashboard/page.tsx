import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";

export default async function DashboardPage() {
  const context = await requireAgentContext(); const client = await createClient();
  const { data } = await client.from("notifications").select("id,kind,created_at,notification_deliveries(status,provider)").eq("tenant_id", context.tenantId).order("created_at", { ascending: false }).limit(10);
  return <section><h1>Agent Dashboard</h1><p>จัดการโปรไฟล์ ทรัพย์ และลีดของคุณ</p><Link className="button" href="/dashboard/properties/new">เพิ่มทรัพย์</Link><h2>การแจ้งเตือน</h2>{!data?.length ? <p>ยังไม่มีการแจ้งเตือน</p> : <ul>{data.map((notification) => <li key={notification.id}>มีลีดใหม่ · {new Date(notification.created_at).toLocaleString("th-TH")} · อีเมล {notification.notification_deliveries[0]?.status ?? "queued"}</li>)}</ul>}</section>;
}
