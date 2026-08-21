import Link from "next/link";
import { listAgentProperties } from "@/features/properties/queries";
import { propertyListState } from "@/features/properties/dashboard-model";

export default async function PropertiesPage() {
  const properties = await listAgentProperties(); const state = propertyListState(properties);
  return <section><h1>{state.title}</h1>{state.empty ? <p>เริ่มสร้างร่างข้อมูลทรัพย์และเพิ่มรูปภาพได้ที่นี่</p> : <ul>{properties.map((property) => <li key={property.id}><Link href={`/dashboard/properties/${property.id}/edit`}>{property.title}</Link> — {property.status}</li>)}</ul>}<Link className="button" href="/dashboard/properties/new">{state.actionLabel}</Link></section>;
}
