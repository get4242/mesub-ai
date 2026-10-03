import { notFound } from "next/navigation";
import Image from "next/image";
import {
  getAgentProperty,
  listPropertyMedia,
} from "@/features/properties/queries";
import { PropertyEditor } from "@/features/properties/property-editor";
import { statusCopy, statusDescription } from "@/features/properties/ui-model";
import { formatPropertyPrice } from "@/features/properties/price-display";
import { formatLandArea } from "@/features/properties/land-area-display";

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
        <section className="property-detail-summary">
          {media.length ? (
            <div className="property-detail-images">
              {media.slice(0, 3).map((item, index) => (
                <Image key={item.id} src={`/api/agent-property-media/${item.id}`} alt={index === 0 ? `ภาพหลัก ${property.title}` : ""} width={900} height={620} unoptimized />
              ))}
            </div>
          ) : null}
          <div className="property-detail-copy">
            <span className={`status-badge status-${property.status}`}>{statusCopy[property.status] ?? property.status}</span>
            <h1>{property.title}</h1>
            <strong>{formatPropertyPrice(property)}</strong>
            <div className="property-facts-summary">
              <span><b>ทำเล</b>{property.district}, {property.province}</span>
              <span><b>ที่ดิน</b>{formatLandArea(property.land_area_sqm)}</span>
              <span><b>รูปภาพ</b>{media.length} รูป</span>
            </div>
            <p>{statusDescription[property.status] ?? ""}</p>
          </div>
        </section>
        <PropertyEditor property={property} initialMedia={media} />
      </main>
    </>
  );
}
