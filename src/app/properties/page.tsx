import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parsePublicPropertySearch } from "@/features/properties/public-search";
import { toPublicPropertyCard } from "@/features/properties/public-view-model";
import { LeadForm } from "@/features/leads/LeadForm";

export const metadata = { title: "ค้นหาอสังหาริมทรัพย์ | Mesub AI", description: "ประกาศอสังหาริมทรัพย์ที่ผ่านการยืนยันจากตัวแทน" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  let search;
  try { search = parsePublicPropertySearch(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))); }
  catch { search = parsePublicPropertySearch({}); }
  const client = await createClient();
  const { data, error } = await client.rpc("search_public_properties", {
    search_query: search.q ?? null, filter_province: search.province ?? null, filter_district: search.district ?? null,
    filter_listing_type: search.listingType ?? null, filter_property_type: search.propertyType ?? null,
    minimum_price: search.minPrice ?? null, maximum_price: search.maxPrice ?? null, sort_order: search.sort,
    page_number: search.page, page_size: search.pageSize
  });
  const cards = ((data ?? []) as Parameters<typeof toPublicPropertyCard>[0][]).map(toPublicPropertyCard);
  return <main><header><p>Mesub AI</p><h1>ค้นหาอสังหาริมทรัพย์</h1></header>
    <form className="public-search" role="search"><label>คำค้น<input name="q" defaultValue={search.q}/></label><label>จังหวัด<input name="province" defaultValue={search.province}/></label><label>ประเภท<select name="listingType" defaultValue={search.listingType ?? ""}><option value="">ทั้งหมด</option><option value="sale">ขาย</option><option value="rent">เช่า</option></select></label><button type="submit">ค้นหา</button></form>
    {error ? <p role="alert">ไม่สามารถโหลดประกาศได้ในขณะนี้</p> : cards.length === 0 ? <p>ยังไม่พบประกาศที่ตรงกับเงื่อนไข</p> : <ul className="property-grid">{cards.map((card) => <li className="panel" key={card.id}><p>{card.listingType} · {card.propertyType}</p><h2><Link href={`/properties/${card.slug}`}>{card.title}</Link></h2><p>{card.location}</p><strong>{card.price}</strong></li>)}</ul>}<section><h2>สอบถามทั่วไป</h2><LeadForm/></section>
  </main>;
}
