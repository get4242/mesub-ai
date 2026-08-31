import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { createClient } from "@/lib/supabase/server";
import { toPublicPropertyCard } from "@/features/properties/public-view-model";
import { PublicPropertyGallery } from "@/features/properties/public-property-gallery";
import { LeadForm } from "@/features/leads/LeadForm";
async function getProperty(slug: string) {
  const client = await createClient();
  const { data } = await client
    .from("public_properties")
    .select(
      "id,slug,listing_type,property_type,title,description,province,district,subdistrict,price,currency,land_area_sqm,building_area_sqm,bedrooms,bathrooms,published_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  return data;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const property = await getProperty((await params).slug);
  return property
    ? {
        title: property.title,
        description: property.description.slice(0, 150),
        alternates: { canonical: `/properties/${property.slug}` },
      }
    : { title: "ไม่พบประกาศ" };
}
export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const property = await getProperty((await params).slug);
  if (!property) notFound();
  const client = await createClient();
  const { data: media } = await client
    .from("public_property_media")
    .select("media_id,width,height,position")
    .eq("property_id", property.id)
    .order("position");
  const card = toPublicPropertyCard(property);
  return (
    <PublicShell>
      <main className="public-main">
        <p>
          <Link className="text-link" href="/properties">
            ← กลับไปหน้าค้นหา
          </Link>
        </p>
        <PublicPropertyGallery media={media ?? []} title={property.title} />
        <div className="detail-layout">
          <article>
            <span className="badge">
              {card.listingType === "sale" ? "ขาย" : "เช่า"} ·{" "}
              {card.propertyType}
            </span>
            <h1>{card.title}</h1>
            <p className="muted">{card.location}</p>
            <strong className="price">{card.price}</strong>
            <div className="facts">
              <div>
                <b>{property.bedrooms ?? "—"}</b>
                <span>ห้องนอน</span>
              </div>
              <div>
                <b>{property.bathrooms ?? "—"}</b>
                <span>ห้องน้ำ</span>
              </div>
              <div>
                <b>{property.building_area_sqm ?? "—"}</b>
                <span>ตร.ม. ใช้สอย</span>
              </div>
              <div>
                <b>{property.land_area_sqm ?? "—"}</b>
                <span>ตร.ม. ที่ดิน</span>
              </div>
            </div>
            <h2>รายละเอียดทรัพย์</h2>
            <p>{property.description}</p>
            <div className="privacy-note">
              <b>ข้อมูลทำเลแบบจำกัดการเปิดเผย</b>
              <br />
              ประกาศนี้ไม่แสดงพิกัดที่แน่นอน ข้อมูลส่วนตัว หรือข้อมูลภายในของ
              Agent
            </div>
          </article>
          <aside className="card contact-card" id="contact">
            <h2>สนใจทรัพย์นี้</h2>
            <p className="muted">
              ฝากข้อมูลเพื่อให้ Agent ผู้รับผิดชอบติดต่อกลับ
            </p>
            <LeadForm propertyId={property.id} />
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
