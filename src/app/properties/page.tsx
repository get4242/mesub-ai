import { PublicShell } from "@/components/public-shell";
import { createClient } from "@/lib/supabase/server";
import { parsePublicPropertySearch } from "@/features/properties/public-search";
import { toPublicPropertyCard } from "@/features/properties/public-view-model";
import { PropertyCard } from "@/features/properties/property-card";
import { LeadForm } from "@/features/leads/LeadForm";
export const metadata = {
  title: "ค้นหาอสังหาริมทรัพย์",
  description: "ประกาศอสังหาริมทรัพย์ที่ผ่านการยืนยันจากตัวแทน",
};
export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  let search;
  try {
    search = parsePublicPropertySearch(
      Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [
          key,
          Array.isArray(value) ? value[0] : value,
        ]),
      ),
    );
  } catch {
    search = parsePublicPropertySearch({});
  }
  const client = await createClient();
  const { data, error } = await client.rpc("search_public_properties", {
    search_query: search.q ?? null,
    filter_province: search.province ?? null,
    filter_district: search.district ?? null,
    filter_listing_type: search.listingType ?? null,
    filter_property_type: search.propertyType ?? null,
    minimum_price: search.minPrice ?? null,
    maximum_price: search.maxPrice ?? null,
    sort_order: search.sort,
    page_number: search.page,
    page_size: search.pageSize,
  });
  const cards = (
    (data ?? []) as Parameters<typeof toPublicPropertyCard>[0][]
  ).map(toPublicPropertyCard);
  const ids = cards.map((card) => card.id);
  const { data: media } = ids.length
    ? await client
        .from("public_property_media")
        .select("media_id,property_id,position")
        .in("property_id", ids)
        .order("position")
    : { data: [] };
  const covers = new Map<string, string>();
  for (const item of media ?? [])
    if (!covers.has(item.property_id))
      covers.set(item.property_id, item.media_id);
  return (
    <PublicShell>
      <main className="public-main">
        <header className="page-head">
          <span className="eyebrow">ค้นหาทรัพย์</span>
          <h1>อสังหาริมทรัพย์ที่ตรงกับคุณ</h1>
          <p>ค้นหาจากทำเล ประเภท และช่วงราคาที่ต้องการ</p>
        </header>
        <form className="filter-card" role="search">
          <label className="field">
            <span>คำค้น</span>
            <input name="q" defaultValue={search.q} />
          </label>
          <label className="field">
            <span>จังหวัด</span>
            <input name="province" defaultValue={search.province} />
          </label>
          <label className="field">
            <span>ประเภทประกาศ</span>
            <select name="listingType" defaultValue={search.listingType ?? ""}>
              <option value="">ทั้งหมด</option>
              <option value="sale">ขาย</option>
              <option value="rent">เช่า</option>
            </select>
          </label>
          <label className="field">
            <span>ประเภททรัพย์</span>
            <select
              name="propertyType"
              defaultValue={search.propertyType ?? ""}
            >
              <option value="">ทั้งหมด</option>
              <option value="detached_house">บ้านเดี่ยว</option>
              <option value="townhouse">ทาวน์เฮาส์</option>
              <option value="condominium">คอนโด</option>
              <option value="land">ที่ดิน</option>
            </select>
          </label>
          <button>ค้นหา</button>
        </form>
        {error ? (
          <div className="empty-state" role="alert">
            ไม่สามารถโหลดประกาศได้ในขณะนี้ กรุณาลองใหม่
          </div>
        ) : cards.length === 0 ? (
          <div className="empty-state">
            <h2>ยังไม่พบทรัพย์ที่ตรงกับเงื่อนไข</h2>
            <p>ลองลดตัวกรองหรือค้นหาด้วยคำอื่น</p>
          </div>
        ) : (
          <div className="property-grid">
            {cards.map((card) => (
              <PropertyCard
                key={card.id}
                property={{ ...card, coverMediaId: covers.get(card.id) }}
              />
            ))}
          </div>
        )}
        <section className="section-block">
          <div className="section-head">
            <h2>ยังไม่พบทรัพย์ที่ต้องการ?</h2>
          </div>
          <div className="card">
            <LeadForm />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
