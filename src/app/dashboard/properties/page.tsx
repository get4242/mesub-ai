import Link from "next/link";
import Image from "next/image";
import {
  listAgentProperties,
  listAgentReadyPropertyMedia,
} from "@/features/properties/queries";
import { publishPropertyFormAction } from "@/features/properties/publication-actions";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import {
  propertyUiActions,
  statusCopy,
  quotaCopy,
} from "@/features/properties/ui-model";
export default async function PropertiesPage() {
  const properties = await listAgentProperties();
  const context = await requireAgentContext();
  const client = await createClient();
  const [
    { data: entitlement },
    { count },
    { data: publicProperties },
    readyMedia,
    { count: leadCount },
    { count: appointmentCount },
  ] =
    await Promise.all([
      client
        .rpc("get_effective_entitlement", {
          target_tenant_id: context.tenantId,
        })
        .single(),
      client
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", context.tenantId)
        .eq("status", "published"),
      client.from("public_properties").select("id,slug"),
      listAgentReadyPropertyMedia(properties.map((property) => property.id)),
      client.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId),
      client.from("appointments").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId),
    ]);
  const limit =
    (entitlement as { active_property_limit?: number } | null)
      ?.active_property_limit ?? 3;
  const quota = quotaCopy(count ?? 0, limit);
  const covers = new Map<string, string>();
  for (const item of readyMedia)
    if (!covers.has(item.property_id))
      covers.set(item.property_id, item.id);
  const slugs = new Map(
    (publicProperties ?? []).map((property) => [property.id, property.slug]),
  );
  return (
    <>
      <header className="agent-hero">
        <p>สวัสดีค่ะ · จัดการประกาศของคุณได้ที่นี่</p>
        <h1>ทรัพย์ของฉัน</h1>
        <div className="agent-summary">
          <span><b>{count ?? 0}</b> เผยแพร่แล้ว</span>
          <span><b>{leadCount ?? 0}</b> ลูกค้าสนใจ</span>
          <span><b>{appointmentCount ?? 0}</b> นัดหมาย</span>
        </div>
      </header>
      <main className="agent-content properties-content">
        <div className="toolbar property-toolbar">
          <div>
            <h2>รายการทรัพย์ {properties.length} รายการ</h2>
            <p className="muted">
              {quota.label} · {quota.remaining}
            </p>
          </div>
          <Link className="button" href="/dashboard/properties/new">
            + เพิ่มทรัพย์
          </Link>
        </div>
        <div className="property-tools">
          <input aria-label="ค้นหาทรัพย์" placeholder="🔎 ค้นหาชื่อทรัพย์ / ทำเล" />
          <Link className="button-secondary" href="/dashboard/leads">☎ ลูกค้าที่สนใจ ({leadCount ?? 0})</Link>
          <Link className="button-secondary" href="/dashboard/appointments">📅 นัดหมาย</Link>
        </div>
        {!properties.length ? (
          <div className="empty-state">
            <h2>เพิ่มทรัพย์รายการแรก</h2>
            <p>กรอกข้อมูล เพิ่มรูป แล้วกดเผยแพร่เมื่อพร้อมได้ที่นี่</p>
            <Link className="button" href="/dashboard/properties/new">
              เพิ่มทรัพย์
            </Link>
          </div>
        ) : (
          <div className="property-list">
            {properties.map((property) => {
              const actions = propertyUiActions(
                property.status,
                false,
              );
              return (
                <article className="property-row property-listing-card" key={property.id}>
                  {covers.get(property.id) ? (
                    <Image
                      className="property-thumb"
                      src={`/api/agent-property-media/${covers.get(property.id)}`}
                      alt={`รูปภาพ ${property.title}`}
                      width={76}
                      height={62}
                      unoptimized
                    />
                  ) : (
                    <div className="property-thumb property-thumb-empty">ยังไม่มีรูป</div>
                  )}
                  <div>
                    <h3>{property.title}</h3>
                    <strong className="property-row-price">฿{Number(property.price).toLocaleString("th-TH")}</strong>
                    <p className="muted">📍 {property.district}, {property.province}</p>
                    <span className="muted">
                      อัปเดตล่าสุด{" "}
                      {new Date(property.updated_at).toLocaleDateString(
                        "th-TH",
                      )}
                    </span>
                  </div>
                  <span className={`status-badge status-${property.status}`}>
                    {statusCopy[property.status] ?? property.status}
                  </span>
                  <div className="row-actions">
                    {actions.includes("edit") ? (
                      <Link
                        className="button-secondary"
                        href={`/dashboard/properties/${property.id}/edit`}
                      >
                        แก้ไข
                      </Link>
                    ) : null}
                    {actions.includes("ai") ? (
                      <Link
                        className="button-secondary"
                        href={`/dashboard/properties/${property.id}/ai`}
                      >
                        ให้ AI ช่วย
                      </Link>
                    ) : null}
                    {actions.includes("view") ? (
                      <Link
                        className="button"
                        href={`/properties/${slugs.get(property.id) ?? property.id}`}
                      >
                        ดูประกาศ
                      </Link>
                    ) : null}
                    {actions.includes("view") ? (
                      <a
                        className="button-line"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`https://mesub-ai.vercel.app/properties/${slugs.get(property.id) ?? property.id}`)}`}
                      >
                        แชร์ LINE
                      </a>
                    ) : null}
                    {actions.includes("publish") ? (
                      <form action={publishPropertyFormAction}>
                        <input
                          type="hidden"
                          name="propertyId"
                          value={property.id}
                        />
                        <input
                          type="hidden"
                          name="expectedVersion"
                          value={property.version}
                        />
                        <input
                          type="hidden"
                          name="idempotencyKey"
                          value={`publish:${property.id}:${property.version}`}
                        />
                        <button>เผยแพร่</button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
