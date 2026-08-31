import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
export default async function LeadsPage() {
  const context = await requireAgentContext();
  const client = await createClient();
  const { data } = await client
    .from("leads")
    .select("id,name,email,phone,message,property_id,created_at")
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false });
  return (
    <>
      <header className="agent-topbar">
        <h1>ลูกค้าที่สนใจ</h1>
      </header>
      <main className="agent-content">
        <div className="page-head">
          <h1>ข้อมูลผู้สนใจ</h1>
          <p>ลูกค้าที่ส่งข้อมูลผ่านหน้าประกาศของคุณ</p>
        </div>
        <section className="card">
          {!data?.length ? (
            <div className="empty-state">ยังไม่มีผู้สนใจติดต่อเข้ามา</div>
          ) : (
            data.map((lead) => (
              <article className="lead-row" key={lead.id}>
                <div>
                  <b>{lead.name}</b>
                  <p className="muted">{lead.message}</p>
                </div>
                <div>
                  <b>ข้อมูลติดต่อ</b>
                  <p>{lead.email ?? lead.phone ?? "ไม่ระบุ"}</p>
                </div>
                <small className="muted">
                  {new Date(lead.created_at).toLocaleString("th-TH")}
                </small>
              </article>
            ))
          )}
        </section>
      </main>
    </>
  );
}
