import Link from "next/link";
import Image from "next/image";
import { listAgentProperties } from "@/features/properties/queries";
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
    { data: publicMedia },
    { data: publicProperties },
    { data: confirmations },
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
      client
        .from("public_property_media")
        .select("property_id,media_id,position")
        .order("position"),
      client.from("public_properties").select("id,slug"),
      client
        .from("property_confirmations")
        .select("property_id,critical_version")
        .eq("tenant_id", context.tenantId),
    ]);
  const limit =
    (entitlement as { active_property_limit?: number } | null)
      ?.active_property_limit ?? 3;
  const quota = quotaCopy(count ?? 0, limit);
  const covers = new Map<string, string>();
  for (const item of publicMedia ?? [])
    if (!covers.has(item.property_id))
      covers.set(item.property_id, item.media_id);
  const slugs = new Map(
    (publicProperties ?? []).map((property) => [property.id, property.slug]),
  );
  const confirmedVersions = new Set(
    (confirmations ?? []).map(
      (confirmation) =>
        `${confirmation.property_id}:${confirmation.critical_version}`,
    ),
  );
  return (
    <>
      <header className="agent-topbar">
        <h1>ทรัพย์ของฉัน</h1>
      </header>
      <main className="agent-content">
        <div className="toolbar">
          <div>
            <h2>ทรัพย์ทั้งหมด {properties.length} รายการ</h2>
            <p className="muted">
              {quota.label} · {quota.remaining}
            </p>
          </div>
          <Link className="button" href="/dashboard/properties/new">
            + เพิ่มทรัพย์
          </Link>
        </div>
        {!properties.length ? (
          <div className="empty-state">
            <h2>เพิ่มทรัพย์รายการแรก</h2>
            <p>เริ่มสร้างร่างข้อมูลทรัพย์และเพิ่มรูปภาพได้ที่นี่</p>
            <Link className="button" href="/dashboard/properties/new">
              เพิ่มทรัพย์
            </Link>
          </div>
        ) : (
          <div className="property-list">
            {properties.map((property) => {
              const actions = propertyUiActions(
                property.status,
                confirmedVersions.has(
                  `${property.id}:${property.critical_version}`,
                ),
              );
              return (
                <article className="property-row" key={property.id}>
                  {covers.get(property.id) ? (
                    <Image
                      className="property-thumb"
                      src={`/api/public-property-media/${covers.get(property.id)}`}
                      alt=""
                      width={180}
                      height={120}
                    />
                  ) : (
                    <div className="property-thumb" />
                  )}
                  <div>
                    <h3>{property.title}</h3>
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
