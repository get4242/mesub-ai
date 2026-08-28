import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toPublicPropertyCard } from "@/features/properties/public-view-model";
import { LeadForm } from "@/features/leads/LeadForm";

async function getProperty(slug: string) {
  const client = await createClient();
  const { data } = await client.from("public_properties").select("id,slug,listing_type,property_type,title,description,province,district,subdistrict,price,currency,land_area_sqm,building_area_sqm,bedrooms,bathrooms,published_at").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const property = await getProperty((await params).slug);
  return property ? { title: `${property.title} | Mesub AI`, description: property.description.slice(0, 150), alternates: { canonical: `/properties/${property.slug}` } } : { title: "ไม่พบประกาศ | Mesub AI" };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const property = await getProperty((await params).slug);
  if (!property) notFound();
  const card = toPublicPropertyCard(property);
  return <main><p><Link href="/properties">← กลับไปหน้าค้นหา</Link></p><article className="panel"><p>{card.listingType} · {card.propertyType}</p><h1>{card.title}</h1><p>{card.location}</p><strong>{card.price}</strong><p>{property.description}</p><dl><dt>พื้นที่ดิน</dt><dd>{property.land_area_sqm ?? "ไม่ระบุ"}</dd><dt>พื้นที่อาคาร</dt><dd>{property.building_area_sqm ?? "ไม่ระบุ"}</dd><dt>ห้องนอน</dt><dd>{property.bedrooms ?? "ไม่ระบุ"}</dd><dt>ห้องน้ำ</dt><dd>{property.bathrooms ?? "ไม่ระบุ"}</dd></dl><a className="button" href={`/properties/${property.slug}#contact`}>สนใจประกาศนี้</a></article><section id="contact"><h2>ติดต่อเกี่ยวกับประกาศ</h2><LeadForm propertyId={property.id}/></section></main>;
}
