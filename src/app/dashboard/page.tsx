import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
export default async function DashboardPage() {
  const context = await requireAgentContext();
  const client = await createClient();
  const [
    { data: notifications },
    { count: properties },
    { count: published },
    { count: leads },
  ] = await Promise.all([
    client
      .from("notifications")
      .select("id,kind,created_at,notification_deliveries(status,provider)")
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
    client
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId),
    client
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId)
      .eq("status", "published"),
    client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenantId),
  ]);
  return (
    <>
      <header className="agent-topbar">
        <h1>ภาพรวม</h1>
      </header>
      <main className="agent-content">
        <div className="page-head">
          <h1>สวัสดีค่ะ</h1>
          <p>นี่คือภาพรวมงานของคุณวันนี้</p>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">ทรัพย์ทั้งหมด</span>
            <b>{properties ?? 0}</b>
          </div>
          <div className="metric">
            <span className="muted">โควตาแผนฟรี</span>
            <b>{published ?? 0} / 3</b>
          </div>
          <div className="metric">
            <span className="muted">ลูกค้าที่สนใจ</span>
            <b>{leads ?? 0}</b>
          </div>
          <div className="metric">
            <span className="muted">การแจ้งเตือน</span>
            <b>{notifications?.length ?? 0}</b>
          </div>
        </div>
        <div className="dashboard-grid">
          <section className="card">
            <div className="section-head">
              <h2>สิ่งที่ควรทำต่อ</h2>
            </div>
            <div className="list">
              <Link className="list-item" href="/dashboard/properties/new">
                <b>เพิ่มทรัพย์รายการใหม่</b>
                <br />
                <span className="muted">เริ่มจากข้อมูลและรูปภาพที่คุณมี</span>
              </Link>
              <Link className="list-item" href="/dashboard/properties">
                <b>ตรวจสถานะทรัพย์</b>
                <br />
                <span className="muted">แก้ไข ให้ AI ช่วย หรือเผยแพร่</span>
              </Link>
            </div>
          </section>
          <section className="card">
            <div className="section-head">
              <h2>การแจ้งเตือนล่าสุด</h2>
            </div>
            {!notifications?.length ? (
              <div className="empty-state">ยังไม่มีการแจ้งเตือน</div>
            ) : (
              <ul className="list">
                {notifications.map((item) => (
                  <li className="list-item" key={item.id}>
                    <b>มีลูกค้าใหม่สนใจทรัพย์</b>
                    <br />
                    <span className="muted">
                      {new Date(item.created_at).toLocaleString("th-TH")} ·
                      อีเมล{" "}
                      {item.notification_deliveries[0]?.status ?? "queued"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
