import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { createClient } from "@/lib/supabase/server";
import { toPublicPropertyCard } from "@/features/properties/public-view-model";
import { PropertyCard } from "@/features/properties/property-card";

export default async function HomePage() {
  const client = await createClient();
  const { data } = await client
    .from("public_properties")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(3);
  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
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
      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">MESUB AI · THAI PROPERTY PLATFORM</span>
            <h1>
              ค้นหาทรัพย์ที่ใช่
              <br />
              ได้อย่างมั่นใจ
            </h1>
            <p>
              รวมประกาศจาก Agent พร้อมข้อมูลที่ผ่านการตรวจและยืนยันก่อนเผยแพร่
            </p>
            <form className="search-panel" action="/properties">
              <input
                name="q"
                aria-label="ค้นหาทรัพย์"
                placeholder="ชื่อทรัพย์ ทำเล หรือคำที่ต้องการ"
              />
              <select name="listingType" aria-label="ประเภทประกาศ">
                <option value="">ขายหรือเช่า</option>
                <option value="sale">ขาย</option>
                <option value="rent">เช่า</option>
              </select>
              <button>ค้นหาทรัพย์</button>
            </form>
          </div>
          <div className="hero-art">MESUB PROPERTY</div>
        </section>
        <div className="public-main">
          <section className="section-block">
            <div className="section-head">
              <div>
                <span className="eyebrow">ทรัพย์แนะนำ</span>
                <h2>ประกาศล่าสุด</h2>
              </div>
              <Link className="text-link" href="/properties">
                ดูทรัพย์ทั้งหมด →
              </Link>
            </div>
            {rows.length ? (
              <div className="property-grid">
                {rows.map((row) => {
                  const card = toPublicPropertyCard(row);
                  return (
                    <PropertyCard
                      key={card.id}
                      property={{ ...card, coverMediaId: covers.get(card.id) }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <h2>ยังไม่มีประกาศที่เผยแพร่</h2>
                <p>เมื่อ Agent ยืนยันและเผยแพร่ทรัพย์แล้ว รายการจะแสดงที่นี่</p>
              </div>
            )}
          </section>
          <section className="section-block" aria-labelledby="property-types-heading">
            <div className="section-head">
              <div>
                <span className="eyebrow">เลือกตามประเภท</span>
                <h2 id="property-types-heading">ค้นหาทรัพย์แบบที่ต้องการ</h2>
              </div>
            </div>
            <div className="category-grid">
              {[
                ["detached_house", "บ้านเดี่ยว"],
                ["condominium", "คอนโด"],
                ["townhouse", "ทาวน์เฮาส์"],
                ["land", "ที่ดิน"],
              ].map(([value, label]) => (
                <Link className="category-card" href={`/properties?propertyType=${value}`} key={value}>
                  <span>{label}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
          <section className="card section-block">
            <span className="eyebrow">สำหรับ Agent</span>
            <h2>มีข้อมูลและรูปอยู่แล้ว ให้ AI ช่วยจัดทรัพย์ให้พร้อมประกาศ</h2>
            <p className="muted">
              เพิ่มข้อมูล ตรวจคำแนะนำ ยืนยัน และเผยแพร่จากพื้นที่ทำงานเดียว
            </p>
            <Link className="button" href="/signup">
              เริ่มต้นใช้งาน
            </Link>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
