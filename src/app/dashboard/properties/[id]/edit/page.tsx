import { notFound } from "next/navigation";
import { getAgentProperty, listPropertyMedia } from "@/features/properties/queries";
import { PropertyEditor } from "@/features/properties/property-editor";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [property, media] = await Promise.all([getAgentProperty(id), listPropertyMedia(id)]); if (!property) notFound();
  return <section><h1>แก้ไขร่าง: {property.title}</h1><p>สถานะ: {property.status} · เวอร์ชัน {property.version}</p><PropertyEditor property={property} initialMedia={media} /></section>;
}
