import { notFound } from "next/navigation";
import {
  getAgentProperty,
  listPropertyMedia,
} from "@/features/properties/queries";
import { PropertyEditor } from "@/features/properties/property-editor";
import { statusCopy, statusDescription } from "@/features/properties/ui-model";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, media] = await Promise.all([
    getAgentProperty(id),
    listPropertyMedia(id),
  ]);
  if (!property) notFound();
  return (
    <>
      <header className="agent-topbar">
        <h1>แก้ไขข้อมูลทรัพย์</h1>
      </header>
      <main className="agent-content">
        <div className="page-head">
          <h1>{property.title}</h1>
          <p>
            สถานะ: {statusCopy[property.status] ?? property.status} · {statusDescription[property.status] ?? ""}
          </p>
        </div>
        <PropertyEditor property={property} initialMedia={media} />
      </main>
    </>
  );
}
