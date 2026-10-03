import { notFound } from "next/navigation";
import {
  getAgentProperty,
  listPropertyMedia,
} from "@/features/properties/queries";
import { PropertyEditor } from "@/features/properties/property-editor";
import { statusCopy, statusDescription } from "@/features/properties/ui-model";
import { formatPropertyPrice } from "@/features/properties/price-display";
import { formatLandArea } from "@/features/properties/land-area-display";
import { AgentPropertyGallery } from "@/features/properties/agent-property-gallery";

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
  const cover = media.find((item) => item.status === "ready");
  return (
    <>
      <header className="agent-topbar">
        <h1>แก้ไขข้อมูลทรัพย์</h1>
      </header>
      <main className="agent-content">
        <section className="property-detail-summary">
          <AgentPropertyGallery media={media} title={property.title} />
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
        <PropertyEditor
          property={property}
          initialMedia={media}
          shareProperty={
            property.status === "published"
              ? {
                  liffId: process.env.LINE_MINI_APP_LIFF_ID ?? null,
                  property: {
                    title: property.title,
                    propertyType: property.property_type,
                    price: formatPropertyPrice(property),
                    location: `${property.district}, ${property.province}`,
                    url: `https://mesub-ai.vercel.app/properties/${property.id}`,
                    imageUrl: cover
                      ? `https://mesub-ai.vercel.app/api/public-property-media/${cover.id}`
                      : undefined,
                  },
                }
              : null
          }
        />
      </main>
    </>
  );
}
