"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import s from "./preview.module.css";
import {
  addPreviewImage,
  movePreviewImage,
  PREVIEW_MEDIA_LIMIT,
  removePreviewImage,
  setPreviewCover,
} from "./preview-media";
import {
  createPropertyActions,
  createPropertySections,
  dashboardNavigation,
  propertyActions,
  type PreviewPropertyState,
} from "./preview-dashboard";

const homes = [
  {
    title: "บ้านวิวภูเขา ใกล้เมืองเชียงใหม่",
    type: "บ้านเดี่ยว",
    place: "เมืองเชียงใหม่, เชียงใหม่",
    price: "฿4,890,000",
    facts: "3 ห้องนอน · 2 ห้องน้ำ · 180 ตร.ม.",
    tone: "mountain",
  },
  {
    title: "คอนโดพร้อมอยู่ ใกล้นิมมาน",
    type: "คอนโด",
    place: "เมืองเชียงใหม่, เชียงใหม่",
    price: "฿2,650,000",
    facts: "1 ห้องนอน · 1 ห้องน้ำ · 42 ตร.ม.",
    tone: "condo",
  },
  {
    title: "ที่ดินบรรยากาศดี แม่ริม",
    type: "ที่ดิน",
    place: "แม่ริม, เชียงใหม่",
    price: "฿3,200,000",
    facts: "1 ไร่ · ถนนเข้าถึง",
    tone: "land",
  },
];

const galleryImages = Array.from(
  { length: 8 },
  (_, index) => `IMG_${String(index + 1).padStart(2, "0")}.jpg`,
);

function Brand() {
  return (
    <Link className={s.brand} href="/design-preview">
      <i>M</i>
      <span>
        Mesub <b>AI</b>
      </span>
    </Link>
  );
}
function PreviewBar() {
  return (
    <div className={s.previewBar}>
      <b>DESIGN PREVIEW</b>
      <span>ตัวอย่างหน้าตา · ไม่มีการบันทึกข้อมูล</span>
      <Link href="/">กลับเว็บไซต์ปัจจุบัน</Link>
    </div>
  );
}
function PublicHeader() {
  return (
    <header className={s.header}>
      <Brand />
      <nav>
        <Link href="/design-preview">หน้าหลัก</Link>
        <Link href="/design-preview/properties">ค้นหาทรัพย์</Link>
        <Link href="/design-preview/dashboard">สำหรับ Agent</Link>
      </nav>
      <Link className={s.outline} href="/design-preview/dashboard">
        เข้าสู่ระบบ Agent
      </Link>
    </header>
  );
}
function Visual({ tone, large = false }: { tone: string; large?: boolean }) {
  return (
    <div className={`${s.visual} ${s[tone]} ${large ? s.large : ""}`}>
      <small>MESUB PROPERTY</small>
      <div>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function DemoPhoto({
  index,
  large = false,
}: {
  index: number;
  large?: boolean;
}) {
  return (
    <div
      className={`${s.demoPhoto} ${s[`photo${index}`]} ${large ? s.demoPhotoLarge : ""}`}
    />
  );
}
function Card({ home }: { home: (typeof homes)[number] }) {
  return (
    <article className={s.card}>
      <Link href="/design-preview/properties/chiang-mai-mountain-view">
        <Visual tone={home.tone} />
      </Link>
      <div className={s.cardBody}>
        <span className={s.badge}>{home.type}</span>
        <button aria-label="บันทึกทรัพย์">♡</button>
        <h3>{home.title}</h3>
        <p>⌖ {home.place}</p>
        <small>{home.facts}</small>
        <strong>{home.price}</strong>
      </div>
    </article>
  );
}
function Footer() {
  return (
    <footer className={s.footer}>
      <Brand />
      <p>พื้นที่ที่ช่วยให้ Agent และผู้สนใจเชื่อมต่อกันง่ายขึ้น</p>
      <small>ข้อมูลทั้งหมดเป็นตัวอย่าง</small>
    </footer>
  );
}
function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className={s.section}>
      <em>{eyebrow}</em>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Home() {
  return (
    <>
      <PublicHeader />
      <main className={s.public}>
        <section className={s.hero}>
          <div>
            <em>ค้นหาบ้านที่ใช่ ง่ายกว่าที่เคย</em>
            <h1>
              พื้นที่ดี ๆ เริ่มต้นที่
              <br />
              <span>ความเข้าใจ</span>
            </h1>
            <p>
              ค้นหาอสังหาริมทรัพย์ที่ผ่านการยืนยันข้อมูล พร้อมติดต่อ Agent
              เจ้าของทรัพย์โดยตรง
            </p>
            <div className={s.searchBox}>
              <label>
                ทำเลที่สนใจ
                <input defaultValue="เชียงใหม่" />
              </label>
              <label>
                ประเภททรัพย์
                <select>
                  <option>ทุกประเภท</option>
                  <option>บ้านเดี่ยว</option>
                  <option>คอนโด</option>
                  <option>ที่ดิน</option>
                </select>
              </label>
              <Link className={s.primary} href="/design-preview/properties">
                ค้นหาทรัพย์
              </Link>
            </div>
            <div className={s.trust}>
              <span>✓ ข้อมูลผ่านการยืนยัน</span>
              <span>✓ ติดต่อ Agent โดยตรง</span>
              <span>✓ ใช้งานง่าย</span>
            </div>
          </div>
          <aside>
            <DemoPhoto index={0} large />
            <div className={s.float}>
              <small>ทรัพย์แนะนำ</small>
              <b>บ้านวิวภูเขา</b>
              <strong>฿4.89 ล้าน</strong>
            </div>
          </aside>
        </section>
        <Section title="เริ่มค้นหาจากประเภททรัพย์" eyebrow="เลือกในแบบของคุณ">
          <div className={s.types}>
            {[
              ["⌂", "บ้านเดี่ยว", "48 รายการ"],
              ["▥", "คอนโด", "36 รายการ"],
              ["⌁", "ที่ดิน", "25 รายการ"],
              ["▦", "อาคารพาณิชย์", "12 รายการ"],
            ].map((x) => (
              <Link href="/design-preview/properties" key={x[1]}>
                <i>{x[0]}</i>
                <b>{x[1]}</b>
                <small>{x[2]}</small>
              </Link>
            ))}
          </div>
        </Section>
        <Section title="ทรัพย์แนะนำ" eyebrow="คัดสรรเพื่อคุณ">
          <div className={s.grid}>
            {homes.map((x) => (
              <Card home={x} key={x.title} />
            ))}
          </div>
        </Section>
        <section className={s.agentCta}>
          <div>
            <em>สำหรับตัวแทนอสังหาริมทรัพย์</em>
            <h2>
              จัดการทรัพย์ง่ายขึ้น
              <br />
              ด้วยผู้ช่วย AI ที่เข้าใจงานคุณ
            </h2>
            <p>
              รวบรวมข้อมูล ตรวจความครบถ้วน และเตรียมประกาศในขั้นตอนที่เข้าใจง่าย
            </p>
            <Link href="/design-preview/dashboard">ดูตัวอย่างสำหรับ Agent</Link>
          </div>
          <aside>
            <b>3</b>
            <span>ทรัพย์ที่เผยแพร่ได้ในแผนฟรี</span>
            <b>AI</b>
            <span>ช่วยจัดข้อมูล ลดงานซ้ำ</span>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Search() {
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => homes.filter((x) => (x.title + x.place + x.type).includes(query)),
    [query],
  );
  return (
    <>
      <PublicHeader />
      <main className={s.listing}>
        <div className={s.pageIntro}>
          <em>ค้นหาทรัพย์</em>
          <h1>ค้นหาพื้นที่ที่เหมาะกับคุณ</h1>
          <p>เลือกทำเล ประเภท และช่วงราคาที่ตอบโจทย์</p>
        </div>
        <div className={s.filters}>
          <label>
            คำค้น
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ชื่อโครงการ ทำเล จังหวัด"
            />
          </label>
          <label>
            ประเภท
            <select>
              <option>ทุกประเภท</option>
              <option>บ้านเดี่ยว</option>
              <option>คอนโด</option>
              <option>ที่ดิน</option>
            </select>
          </label>
          <label>
            จังหวัด
            <select>
              <option>เชียงใหม่</option>
              <option>ทุกจังหวัด</option>
            </select>
          </label>
          <label>
            ช่วงราคา
            <select>
              <option>ทุกช่วงราคา</option>
              <option>ไม่เกิน 3 ล้านบาท</option>
            </select>
          </label>
          <button>ค้นหา</button>
        </div>
        <div className={s.resultsHead}>
          <b>พบ {shown.length} รายการ</b>
          <select aria-label="เรียงลำดับ">
            <option>แนะนำสำหรับคุณ</option>
            <option>ราคาน้อยไปมาก</option>
          </select>
        </div>
        <div className={s.grid}>
          {shown.map((x) => (
            <Card home={x} key={x.title} />
          ))}
        </div>
        {shown.length === 0 && (
          <div className={s.empty}>
            ไม่พบทรัพย์จากคำค้นนี้ ลองเปลี่ยนคำค้นอีกครั้ง
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function Detail() {
  const [sent, setSent] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }
  return (
    <>
      <PublicHeader />
      <main className={s.detail}>
        <div className={s.crumb}>หน้าหลัก / เชียงใหม่ / บ้านวิวภูเขา</div>
        <div className={s.gallery}>
          <button onClick={() => setLightbox(0)} aria-label="เปิดรูปหน้าบ้าน">
            <Visual tone="mountain" large />
          </button>
          <button
            onClick={() => setLightbox(1)}
            aria-label="เปิดรูปห้องนั่งเล่น"
          >
            <DemoPhoto index={1} />
          </button>
          <button onClick={() => setLightbox(2)} aria-label="เปิดรูปห้องนอน">
            <DemoPhoto index={2} />
          </button>
          <button className={s.allPhotos} onClick={() => setLightbox(0)}>
            ▦ ดูรูปทั้งหมด · {galleryImages.length} รูป
          </button>
        </div>
        <div className={s.detailGrid}>
          <article>
            <span className={s.badge}>บ้านเดี่ยว · ขาย</span>
            <h1>บ้านวิวภูเขา ใกล้เมืองเชียงใหม่</h1>
            <p className={s.location}>⌖ เมืองเชียงใหม่, เชียงใหม่</p>
            <strong className={s.bigPrice}>฿4,890,000</strong>
            <div className={s.keyFacts}>
              <div>
                <b>3</b>
                <span>ห้องนอน</span>
              </div>
              <div>
                <b>2</b>
                <span>ห้องน้ำ</span>
              </div>
              <div>
                <b>180</b>
                <span>ตร.ม. ใช้สอย</span>
              </div>
              <div>
                <b>65</b>
                <span>ตร.ว. ที่ดิน</span>
              </div>
            </div>
            <h2>รายละเอียดทรัพย์</h2>
            <p className={s.copy}>
              บ้านเดี่ยวบรรยากาศสงบ มองเห็นแนวเขา เดินทางเข้าเมืองสะดวก
              พื้นที่ใช้สอยจัดเป็นสัดส่วน
              เหมาะสำหรับครอบครัวที่ต้องการความเป็นส่วนตัว
            </p>
            <div className={s.privacy}>
              <b>ข้อมูลตำแหน่งแบบจำกัดการเปิดเผย</b>
              <span>
                แสดงเฉพาะอำเภอและจังหวัด
                ที่อยู่และพิกัดโดยละเอียดไม่แสดงต่อสาธารณะ
              </span>
            </div>
          </article>
          <aside className={s.contact}>
            <div className={s.agent}>
              <i>ม</i>
              <div>
                <small>Agent ผู้ดูแลทรัพย์</small>
                <b>มณีรัตน์ ใจดี</b>
                <span>Mesub Property Chiang Mai</span>
              </div>
            </div>
            <hr />
            <h3>สนใจทรัพย์นี้?</h3>
            <p>ฝากข้อมูลไว้ Agent จะติดต่อกลับ</p>
            {sent ? (
              <div className={s.success}>
                <b>✓ ส่งข้อมูลแล้ว</b>
                <span>นี่เป็นตัวอย่าง ไม่มีข้อมูลถูกบันทึก</span>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label>
                  ชื่อของคุณ
                  <input required placeholder="ชื่อ-นามสกุล" />
                </label>
                <label>
                  เบอร์โทรศัพท์
                  <input required placeholder="08X-XXX-XXXX" />
                </label>
                <label>
                  ข้อความ
                  <textarea defaultValue="สนใจทรัพย์นี้ ต้องการนัดชม" />
                </label>
                <label className={s.consent}>
                  <input type="checkbox" required />{" "}
                  ยินยอมให้ใช้ข้อมูลเพื่อติดต่อกลับ
                </label>
                <button className={s.primary}>ส่งความสนใจ</button>
              </form>
            )}
            <small className={s.safe}>
              ข้อมูลติดต่อของ Agent จะแสดงตามการอนุญาตเท่านั้น
            </small>
          </aside>
        </div>
      </main>
      <Footer />
      {lightbox !== null && (
        <div
          className={s.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="รูปภาพทรัพย์ทั้งหมด"
        >
          <button
            className={s.lightboxClose}
            onClick={() => setLightbox(null)}
            aria-label="ปิดรูปภาพ"
          >
            ×
          </button>
          <div className={s.lightboxImage}>
            <DemoPhoto index={lightbox} large />
          </div>
          <button
            onClick={() =>
              setLightbox(
                (lightbox - 1 + galleryImages.length) % galleryImages.length,
              )
            }
            aria-label="รูปก่อนหน้า"
          >
            ←
          </button>
          <b>
            {lightbox + 1} / {galleryImages.length}
          </b>
          <button
            onClick={() => setLightbox((lightbox + 1) % galleryImages.length)}
            aria-label="รูปถัดไป"
          >
            →
          </button>
          <div className={s.lightboxThumbs}>
            {galleryImages.map((image, index) => (
              <button
                className={index === lightbox ? s.selectedPhoto : ""}
                onClick={() => setLightbox(index)}
                key={image}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <small>
            Gallery รองรับได้สูงสุด {PREVIEW_MEDIA_LIMIT} รูปต่อ Property
          </small>
        </div>
      )}
    </>
  );
}

function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className={s.dash}>
      <aside className={s.sidebar}>
        <Brand />
        <Link
          className={s.sidebarPrimary}
          href="/design-preview/dashboard/properties/new"
        >
          <i>＋</i>
          <span>เพิ่มทรัพย์</span>
        </Link>
        <nav>
          {dashboardNavigation.map((item) => (
            <Link href={item.href} key={item.href}>
              <i>{item.icon}</i>
              {item.label}
            </Link>
          ))}
        </nav>
        <div>
          <b>แผนฟรี</b>
          <span>เผยแพร่แล้ว 1 จาก 3</span>
          <progress value="1" max="3" />
          <small>เหลืออีก 2 รายการ</small>
        </div>
        <Link href="/design-preview">ดูเว็บไซต์สาธารณะ ↗</Link>
      </aside>
      <main>
        <header>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <button className={s.bell}>
            ♢<i>2</i>
          </button>
          <span className={s.avatar}>ม</span>
        </header>
        {children}
      </main>
    </div>
  );
}
function Dashboard() {
  return (
    <DashboardShell
      title="สวัสดีค่ะ คุณมณีรัตน์"
      subtitle="นี่คือภาพรวมงานของคุณวันนี้"
    >
      <div className={s.dashBody}>
        <div className={s.quick}>
          <div>
            <i>▤</i>
            <span>ทรัพย์ทั้งหมด</span>
            <b>4</b>
            <small>1 เผยแพร่ · 3 ร่าง</small>
          </div>
          <div>
            <i>◉</i>
            <span>โควตาแผนฟรี</span>
            <b>1 / 3</b>
            <progress value="1" max="3" />
            <small>เหลืออีก 2 รายการ</small>
          </div>
          <div>
            <i>◎</i>
            <span>ลูกค้าที่สนใจ</span>
            <b>3</b>
            <small className={s.positive}>+2 รายการใหม่</small>
          </div>
          <div>
            <i>♢</i>
            <span>การแจ้งเตือน</span>
            <b>2</b>
            <small>ยังไม่ได้อ่าน</small>
          </div>
        </div>
        <div className={s.dashGrid}>
          <section className={s.panel}>
            <header>
              <h2>สิ่งที่ควรทำต่อ</h2>
            </header>
            <div className={s.tasks}>
              <Link href="/design-preview/dashboard/properties/demo/ai">
                <i>✦</i>
                <div>
                  <b>ตรวจคำแนะนำจาก AI</b>
                  <span>บ้านสวนสันกำแพง · 3 คำแนะนำ</span>
                </div>
                <strong>ตรวจเลย →</strong>
              </Link>
              <Link href="/design-preview/dashboard/properties">
                <i>✓</i>
                <div>
                  <b>ยืนยันข้อมูลก่อนเผยแพร่</b>
                  <span>คอนโดใกล้นิมมาน</span>
                </div>
                <strong>ไปที่ทรัพย์ →</strong>
              </Link>
            </div>
          </section>
          <section className={s.panel}>
            <header>
              <h2>ลูกค้าที่สนใจล่าสุด</h2>
              <Link href="/design-preview/dashboard/leads">ดูทั้งหมด</Link>
            </header>
            <LeadRows compact />
          </section>
        </div>
        <section className={s.panel}>
          <header>
            <h2>การแจ้งเตือน</h2>
          </header>
          <div className={s.notice}>
            <i>●</i>
            <div>
              <b>มีลูกค้าใหม่สนใจบ้านวิวภูเขา</b>
              <span>คุณอรทัย · 10 นาทีที่แล้ว · แจ้งเตือนอีเมลแล้ว</span>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

const managed = [
  {
    name: "บ้านวิวภูเขา ใกล้เมืองเชียงใหม่",
    status: "เผยแพร่แล้ว",
    tone: "published",
  },
  {
    name: "คอนโดพร้อมอยู่ ใกล้นิมมาน",
    status: "ยืนยันแล้ว",
    tone: "confirmed",
  },
  {
    name: "บ้านสวนสันกำแพง",
    status: "รอตรวจคำแนะนำ AI",
    tone: "ai",
  },
  {
    name: "ที่ดินบรรยากาศดี แม่ริม",
    status: "แบบร่าง",
    tone: "draft",
  },
] satisfies {
  name: string;
  status: string;
  tone: PreviewPropertyState;
}[];
function Properties() {
  return (
    <DashboardShell
      title="ทรัพย์ของฉัน"
      subtitle="จัดการข้อมูล รูปภาพ และการเผยแพร่ทรัพย์"
    >
      <div className={s.dashBody}>
        <div className={s.toolbar}>
          <div>
            <b>ทรัพย์ทั้งหมด 4 รายการ</b>
            <span>เผยแพร่แล้ว 1/3 รายการในแผนฟรี</span>
          </div>
          <button className={s.primary}>+ เพิ่มทรัพย์</button>
        </div>
        <div className={s.tabs}>
          <button>ทั้งหมด 4</button>
          <button>แบบร่าง 1</button>
          <button>รอยืนยัน 2</button>
          <button>เผยแพร่แล้ว 1</button>
        </div>
        <div className={s.propertyTable}>
          {managed.map((x, i) => (
            <article key={x.name}>
              <DemoPhoto index={i} />
              <div>
                <h3>{x.name}</h3>
                <span>เชียงใหม่ · อัปเดตล่าสุดวันนี้</span>
              </div>
              <span className={`${s.status} ${s[x.tone]}`}>{x.status}</span>
              <div className={s.rowActions}>
                {propertyActions(x.tone).map((action) => (
                  <Link
                    className={action.emphasis ? s.actionPrimary : ""}
                    href={action.href}
                    key={action.label}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function PropertyMediaEditor({
  images,
  setImages,
}: {
  images: string[];
  setImages: (images: string[]) => void;
}) {
  return (
    <section className={s.mediaEditor}>
      <button
        className={s.uploadCard}
        disabled={images.length >= PREVIEW_MEDIA_LIMIT}
        onClick={() =>
          setImages(addPreviewImage(images, `รูปใหม่ ${images.length + 1}`))
        }
        type="button"
      >
        <i>＋</i>
        <b>เพิ่มรูปภาพ</b>
        <span>เลือก JPG, PNG หรือ WebP</span>
        <small>สูงสุด {PREVIEW_MEDIA_LIMIT} รูปต่อทรัพย์</small>
      </button>
      {images.map((image, index) => (
        <article className={index === 0 ? s.coverPhoto : ""} key={image}>
          <DemoPhoto index={index} />
          {index === 0 && <b className={s.coverBadge}>ภาพปก</b>}
          <div>
            <strong>{image}</strong>
            <span>รูปที่ {index + 1}</span>
          </div>
          <footer>
            {index !== 0 && (
              <button
                onClick={() => setImages(setPreviewCover(images, image))}
                type="button"
              >
                ตั้งเป็นภาพปก
              </button>
            )}
            <button
              disabled={index === 0}
              onClick={() => setImages(movePreviewImage(images, index, -1))}
              aria-label="เลื่อนไปซ้าย"
              type="button"
            >
              ←
            </button>
            <button
              disabled={index === images.length - 1}
              onClick={() => setImages(movePreviewImage(images, index, 1))}
              aria-label="เลื่อนไปขวา"
              type="button"
            >
              →
            </button>
            <button
              className={s.deletePhoto}
              onClick={() => setImages(removePreviewImage(images, image))}
              type="button"
            >
              ลบ
            </button>
          </footer>
        </article>
      ))}
    </section>
  );
}

function CreateProperty({ editing = false }: { editing?: boolean }) {
  const [images, setImages] = useState(
    editing ? galleryImages : galleryImages.slice(0, 3),
  );
  return (
    <DashboardShell
      title={editing ? "แก้ไขข้อมูลทรัพย์" : "เพิ่มทรัพย์ใหม่"}
      subtitle={
        editing
          ? "บ้านวิวภูเขา ใกล้เมืองเชียงใหม่"
          : "กรอกเท่าที่คุณมี แล้วให้ AI ช่วยจัดข้อมูลต่อ"
      }
    >
      <div className={s.dashBody}>
        <div className={s.createIntro}>
          <Link href="/design-preview/dashboard/properties">
            ← กลับไปทรัพย์ของฉัน
          </Link>
          <div>
            <b>{editing ? "ปรับปรุงข้อมูลประกาศ" : "เริ่มสร้างประกาศใหม่"}</b>
            <span>
              {editing
                ? "ตรวจข้อมูลและรูปภาพให้เรียบร้อยก่อนบันทึก"
                : "ไม่ต้องกังวลหากข้อมูลยังไม่ครบ คุณบันทึกเป็นแบบร่างได้เสมอ"}
            </span>
          </div>
        </div>

        <form
          className={s.propertyForm}
          onSubmit={(event) => event.preventDefault()}
        >
          <section>
            <header>
              <i>1</i>
              <div>
                <h2>{createPropertySections[0]}</h2>
                <p>บอกก่อนว่าต้องการประกาศอะไร</p>
              </div>
            </header>
            <div className={s.formGrid}>
              <label>
                ประเภทประกาศ
                <select defaultValue="sale">
                  <option value="sale">ขาย</option>
                  <option value="rent">ให้เช่า</option>
                </select>
              </label>
              <label>
                ประเภททรัพย์
                <select defaultValue="detached_house">
                  <option value="detached_house">บ้านเดี่ยว</option>
                  <option value="townhouse">ทาวน์เฮาส์</option>
                  <option value="condominium">คอนโด</option>
                  <option value="land">ที่ดิน</option>
                </select>
              </label>
              <label className={s.fullField}>
                ชื่อทรัพย์
                <input
                  defaultValue="บ้านวิวภูเขา ใกล้เมืองเชียงใหม่"
                  placeholder="เช่น บ้านเดี่ยวพร้อมสวน ใกล้เมืองเชียงใหม่"
                />
              </label>
            </div>
          </section>

          <section>
            <header>
              <i>2</i>
              <div>
                <h2>{createPropertySections[1]}</h2>
                <p>กรอกข้อมูลที่ลูกค้าใช้ตัดสินใจค้นหาทรัพย์</p>
              </div>
            </header>
            <div className={s.formGrid}>
              <label>
                ราคา (บาท)
                <input defaultValue="4,890,000" inputMode="numeric" />
              </label>
              <label>
                จังหวัด
                <input defaultValue="เชียงใหม่" />
              </label>
              <label>
                อำเภอ / เขต
                <input defaultValue="เมืองเชียงใหม่" />
              </label>
              <label>
                ตำบล / แขวง
                <input placeholder="ระบุถ้ามี" />
              </label>
              <label>
                พื้นที่ใช้สอย (ตร.ม.)
                <input defaultValue="180" inputMode="decimal" />
              </label>
              <label>
                พื้นที่ดิน (ตร.ม.)
                <input defaultValue="320" inputMode="decimal" />
              </label>
              <label>
                ห้องนอน
                <input defaultValue="3" inputMode="numeric" />
              </label>
              <label>
                ห้องน้ำ
                <input defaultValue="2" inputMode="numeric" />
              </label>
            </div>
          </section>

          <section>
            <header>
              <i>3</i>
              <div>
                <h2>{createPropertySections[2]}</h2>
                <p>เล่าแบบที่คุณถนัด ไม่จำเป็นต้องเขียนเป็นภาษาประกาศ</p>
              </div>
            </header>
            <label className={s.descriptionField}>
              รายละเอียดที่คุณมี
              <textarea
                defaultValue="บ้านเดี่ยวบรรยากาศสงบ มองเห็นวิวภูเขา เดินทางเข้าเมืองสะดวก มีสวนรอบบ้าน พื้นที่นั่งเล่นกว้างและแสงธรรมชาติดี"
                placeholder="เช่น จุดเด่นของบ้าน การเดินทาง สถานที่ใกล้เคียง หรือข้อมูลจากเจ้าของ..."
              />
              <small>
                AI จะช่วยเรียบเรียงให้พร้อมสำหรับประกาศในขั้นตอนถัดไป
              </small>
            </label>
          </section>

          <section>
            <header>
              <i>4</i>
              <div>
                <h2>{createPropertySections[3]}</h2>
                <p>รูปแรกคือภาพปก คุณสามารถจัดลำดับหรือเปลี่ยนภาพปกได้</p>
              </div>
              <strong className={s.photoCount}>
                {images.length}/{PREVIEW_MEDIA_LIMIT} รูป
              </strong>
            </header>
            <PropertyMediaEditor images={images} setImages={setImages} />
          </section>

          <footer className={s.createActions}>
            <div>
              <b>พร้อมไปต่อหรือยัง?</b>
              <span>คุณยังกลับมาแก้ไขข้อมูลทั้งหมดได้ภายหลัง</span>
            </div>
            <button type="button">
              {editing ? "ยกเลิก" : createPropertyActions[1]}
            </button>
            {editing ? (
              <Link
                className={s.primary}
                href="/design-preview/dashboard/properties"
              >
                บันทึกการเปลี่ยนแปลง
              </Link>
            ) : (
              <Link
                className={s.primary}
                href="/design-preview/dashboard/properties/demo/ai"
              >
                ✦ {createPropertyActions[0]}
              </Link>
            )}
          </footer>
        </form>
      </div>
    </DashboardShell>
  );
}

function Ai() {
  const [step, setStep] = useState(1);
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  return (
    <DashboardShell title="AI ช่วยจัดข้อมูลทรัพย์" subtitle="บ้านสวนสันกำแพง">
      <div className={s.dashBody}>
        <div className={s.steps}>
          {["ส่งข้อมูลให้ AI", "ตรวจคำแนะนำ", "ยืนยันข้อมูล"].map((x, i) => (
            <div className={step >= i + 1 ? s.activeStep : ""} key={x}>
              <i>{step > i + 1 ? "✓" : i + 1}</i>
              <span>{x}</span>
            </div>
          ))}
        </div>
        {step === 1 && (
          <section className={s.aiPanel}>
            <div className={s.aiIntro}>
              <i>✦</i>
              <div>
                <h2>เล่าข้อมูลทรัพย์ให้ AI ช่วยจัดระเบียบ</h2>
                <p>พิมพ์เหมือนคุยกับผู้ช่วย ไม่ต้องใช้คำศัพท์เฉพาะ</p>
              </div>
            </div>
            <label>
              ข้อมูลที่อยากให้ AI ช่วย
              <textarea defaultValue="บ้านสวนสันกำแพง 3 ห้องนอน 2 ห้องน้ำ เจ้าของต้องการขาย 3.9 ล้านบาท บรรยากาศเงียบสงบ ใกล้ตลาด" />
            </label>
            <div className={s.attach}>
              <b>รูปภาพที่แนบ</b>
              <div>
                <span>รูปหน้าบ้าน.jpg</span>
                <span>รูปห้องนั่งเล่น.jpg</span>
              </div>
            </div>
            <button className={s.primary} onClick={() => setStep(2)}>
              ✦ ให้ AI ช่วยจัดข้อมูล
            </button>
            <small>
              AI จะเสนอข้อมูลให้คุณตรวจ
              ทุกการเปลี่ยนแปลงต้องได้รับการยอมรับจากคุณ
            </small>
          </section>
        )}
        {step === 2 && (
          <section className={s.aiPanel}>
            <div className={s.processing}>
              <i>✓</i>
              <div>
                <b>AI จัดข้อมูลเสร็จแล้ว</b>
                <span>พบ 3 คำแนะนำ กรุณาตรวจสอบก่อนยืนยัน</span>
              </div>
            </div>
            <h2>คำแนะนำสำหรับคุณ</h2>
            {[
              [
                0,
                "หัวข้อประกาศ",
                "บ้านสวนสันกำแพง บรรยากาศสงบ ใกล้ตลาด",
                "ปรับให้อ่านง่ายและบอกจุดเด่น",
              ],
              [1, "ราคา", "฿3,900,000", "พบจากข้อความที่คุณให้"],
              [
                2,
                "รายละเอียด",
                "บ้านเดี่ยว 3 ห้องนอน 2 ห้องน้ำ ในบรรยากาศเงียบสงบ เดินทางไปตลาดได้สะดวก",
                "เรียบเรียงจากข้อมูลของคุณ",
              ],
            ].map((x) => (
              <article className={s.suggestion} key={x[0]}>
                <div>
                  <span>{x[1]}</span>
                  <b>{x[2]}</b>
                  <small>{x[3]}</small>
                </div>
                {decisions[Number(x[0])] ? (
                  <strong
                    className={
                      decisions[Number(x[0])] === "รับคำแนะนำ"
                        ? s.accepted
                        : s.rejected
                    }
                  >
                    {decisions[Number(x[0])]}
                  </strong>
                ) : (
                  <aside>
                    <button
                      onClick={() =>
                        setDecisions({ ...decisions, [Number(x[0])]: "ไม่ใช้" })
                      }
                    >
                      ไม่ใช้
                    </button>
                    <button
                      onClick={() =>
                        setDecisions({
                          ...decisions,
                          [Number(x[0])]: "รับคำแนะนำ",
                        })
                      }
                    >
                      ✓ ใช้คำแนะนำ
                    </button>
                  </aside>
                )}
              </article>
            ))}
            <div className={s.aiFooter}>
              <span>ตรวจแล้ว {Object.keys(decisions).length} จาก 3 รายการ</span>
              <button
                className={s.primary}
                disabled={Object.keys(decisions).length < 3}
                onClick={() => setStep(3)}
              >
                ไปยืนยันข้อมูล
              </button>
            </div>
          </section>
        )}
        {step === 3 && (
          <section className={s.confirmPanel}>
            <i>✓</i>
            <h2>ข้อมูลพร้อมสำหรับการยืนยัน</h2>
            <p>
              คุณตรวจคำแนะนำครบแล้ว
              โปรดอ่านข้อมูลทรัพย์อีกครั้งก่อนยืนยันเวอร์ชันปัจจุบัน
            </p>
            <div>
              <span>สถานะข้อมูล</span>
              <b>ครบถ้วน พร้อมยืนยัน</b>
            </div>
            <button className={s.primary}>ยืนยันข้อมูลเวอร์ชันนี้</button>
            <small>หลังยืนยัน คุณสามารถกลับไปหน้าทรัพย์เพื่อเผยแพร่ได้</small>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function LeadRows({ compact = false }: { compact?: boolean }) {
  return (
    <div className={s.leadRows}>
      {[
        [
          "อ",
          "อรทัย วัฒนะ",
          "บ้านวิวภูเขา ใกล้เมืองเชียงใหม่",
          "081-XXX-4321",
          "10 นาที",
        ],
        [
          "น",
          "นนท์ สิริ",
          "คอนโดพร้อมอยู่ ใกล้นิมมาน",
          "nont@example.com",
          "2 ชั่วโมง",
        ],
        [
          "ก",
          "กมลชนก พรดี",
          "บ้านวิวภูเขา ใกล้เมืองเชียงใหม่",
          "089-XXX-8899",
          "เมื่อวาน",
        ],
      ]
        .slice(0, compact ? 2 : 3)
        .map((x) => (
          <article key={x[1]}>
            <i>{x[0]}</i>
            <div>
              <b>{x[1]}</b>
              <span>สนใจ: {x[2]}</span>
            </div>
            {!compact && <strong>{x[3]}</strong>}
            <small>{x[4]}</small>
            <button>ดูรายละเอียด</button>
          </article>
        ))}
    </div>
  );
}
function Leads() {
  return (
    <DashboardShell
      title="ลูกค้าที่สนใจ"
      subtitle="ข้อมูลผู้สนใจที่ส่งผ่านหน้าประกาศของคุณ"
    >
      <div className={s.dashBody}>
        <div className={s.toolbar}>
          <div>
            <b>ลูกค้าทั้งหมด 3 รายการ</b>
            <span>2 รายการใหม่วันนี้</span>
          </div>
          <input placeholder="ค้นหาชื่อหรือทรัพย์" />
        </div>
        <section className={s.panel}>
          <LeadRows />
        </section>
        <div className={s.future}>
          <b>Future Concept</b>
          <span>
            สถานะการติดตาม นัดหมาย และบันทึกการสนทนายังไม่ใช่ capability ใน
            Phase 0–3
          </span>
        </div>
      </div>
    </DashboardShell>
  );
}

function AgentProfile() {
  return (
    <DashboardShell
      title="โปรไฟล์ของฉัน"
      subtitle="ข้อมูล Agent ที่ใช้แสดงกับประกาศของคุณ"
    >
      <div className={s.dashBody}>
        <section className={s.panel}>
          <div className={s.profilePreview}>
            <span className={s.avatar}>ม</span>
            <div>
              <h2>มณีรัตน์ ใจดี</h2>
              <p>Agent อสังหาริมทรัพย์ · เชียงใหม่</p>
              <span>ข้อมูลติดต่อจะแสดงตามขอบเขตที่คุณอนุญาต</span>
            </div>
            <button className={s.primary}>แก้ไขโปรไฟล์</button>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

export function DesignPreview({ screen }: { screen: string }) {
  let content: ReactNode;
  if (screen === "home") content = <Home />;
  else if (screen === "properties") content = <Search />;
  else if (screen.startsWith("properties/")) content = <Detail />;
  else if (screen === "dashboard") content = <Dashboard />;
  else if (screen === "dashboard/properties") content = <Properties />;
  else if (screen === "dashboard/properties/new") content = <CreateProperty />;
  else if (screen.endsWith("/edit")) content = <CreateProperty editing />;
  else if (screen.endsWith("/ai")) content = <Ai />;
  else if (screen === "dashboard/profile") content = <AgentProfile />;
  else content = <Leads />;
  return (
    <div className={s.root}>
      <PreviewBar />
      {content}
    </div>
  );
}
