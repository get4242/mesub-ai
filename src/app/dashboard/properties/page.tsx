import Link from "next/link";
import { listAgentProperties } from "@/features/properties/queries";
import { propertyListState } from "@/features/properties/dashboard-model";
import { publishPropertyFormAction } from "@/features/properties/publication-actions";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";

export default async function PropertiesPage() {
  const properties = await listAgentProperties(); const state = propertyListState(properties);
  const context = await requireAgentContext(); const client = await createClient();
  const [{ data: entitlement }, { count }] = await Promise.all([
    client.rpc("get_effective_entitlement", { target_tenant_id: context.tenantId }).single(),
    client.from("properties").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenantId).eq("status", "published")
  ]);
  const activePropertyLimit = (entitlement as { active_property_limit?: number } | null)?.active_property_limit ?? 3;
  return <section><h1>{state.title}</h1><p>เผยแพร่แล้ว {count ?? 0} / {activePropertyLimit}</p>{state.empty ? <p>เริ่มสร้างร่างข้อมูลทรัพย์และเพิ่มรูปภาพได้ที่นี่</p> : <ul>{properties.map((property) => <li key={property.id}><Link href={`/dashboard/properties/${property.id}/edit`}>{property.title}</Link> — {property.status}{property.status !== "published" && property.status !== "archived" ? <form action={publishPropertyFormAction}><input type="hidden" name="propertyId" value={property.id}/><input type="hidden" name="expectedVersion" value={property.version}/><input type="hidden" name="idempotencyKey" value={`publish:${property.id}:${property.version}`}/><button type="submit">เผยแพร่</button></form> : null}</li>)}</ul>}<Link className="button" href="/dashboard/properties/new">{state.actionLabel}</Link></section>;
}
