import Link from "next/link";
import { createPropertyDraftFormAction } from "@/features/properties/actions";
export default function NewPropertyPage() {
  return (
    <>
      <header className="agent-topbar">
        <h1>เพิ่มทรัพย์ใหม่</h1>
      </header>
      <main className="agent-content">
        <div className="page-head">
          <Link className="text-link" href="/dashboard/properties">
            ← กลับไปทรัพย์ของฉัน
          </Link>
          <h1>เริ่มสร้างประกาศใหม่</h1>
          <p>กรอกเท่าที่คุณมี แล้วให้ AI ช่วยจัดข้อมูลต่อได้</p>
        </div>
        <form action={createPropertyDraftFormAction} className="property-form">
          <section className="form-section">
            <header>
              <i className="step-number">1</i>
              <div>
                <h2>ข้อมูลพื้นฐานของทรัพย์</h2>
                <span className="hint">บอกก่อนว่าต้องการประกาศอะไร</span>
              </div>
            </header>
            <div className="form-grid">
              <label className="field">
                <span>ประเภทประกาศ</span>
                <select name="listingType">
                  <option value="sale">ขาย</option>
                  <option value="rent">ให้เช่า</option>
                </select>
              </label>
              <label className="field">
                <span>ประเภททรัพย์</span>
                <select name="propertyType">
                  <option value="land">ที่ดิน</option>
                  <option value="detached_house">บ้านเดี่ยว</option>
                  <option value="townhouse">ทาวน์เฮาส์</option>
                  <option value="condominium">คอนโด</option>
                  <option value="commercial_building">อาคารพาณิชย์</option>
                  <option value="other">อื่น ๆ</option>
                </select>
              </label>
              <label className="field full">
                <span>ชื่อทรัพย์</span>
                <input
                  name="title"
                  required
                  placeholder="เช่น บ้านเดี่ยวพร้อมสวน ใกล้เมืองเชียงใหม่"
                />
              </label>
            </div>
          </section>
          <section className="form-section">
            <header>
              <i className="step-number">2</i>
              <div>
                <h2>ราคาและทำเล</h2>
                <span className="hint">ข้อมูลที่ลูกค้าใช้ค้นหาและตัดสินใจ</span>
              </div>
            </header>
            <div className="form-grid">
              <label className="field">
                <span>ราคา (บาท)</span>
                <input name="price" inputMode="decimal" required />
              </label>
              <label className="field">
                <span>จังหวัด</span>
                <input name="province" required />
              </label>
              <label className="field">
                <span>อำเภอ / เขต</span>
                <input name="district" required />
              </label>
              <label className="field">
                <span>ตำบล / แขวง</span>
                <input name="subdistrict" />
              </label>
              <label className="field">
                <span>พื้นที่ดิน (ตร.ม.)</span>
                <input name="landAreaSquareMetres" inputMode="decimal" />
              </label>
              <label className="field">
                <span>พื้นที่ใช้สอย (ตร.ม.)</span>
                <input name="buildingAreaSquareMetres" inputMode="decimal" />
              </label>
              <label className="field">
                <span>ห้องนอน</span>
                <input name="bedrooms" type="number" min="0" />
              </label>
              <label className="field">
                <span>ห้องน้ำ</span>
                <input name="bathrooms" type="number" min="0" />
              </label>
            </div>
          </section>
          <section className="form-section">
            <header>
              <i className="step-number">3</i>
              <div>
                <h2>รายละเอียดทรัพย์</h2>
                <span className="hint">
                  เล่าแบบที่คุณถนัด ไม่จำเป็นต้องเขียนเป็นภาษาประกาศ
                </span>
              </div>
            </header>
            <label className="field">
              <span>รายละเอียดที่คุณมี</span>
              <textarea
                name="description"
                required
                placeholder="จุดเด่น การเดินทาง สถานที่ใกล้เคียง หรือข้อมูลจากเจ้าของ…"
              />
            </label>
          </section>
          <section className="form-section">
            <header>
              <i className="step-number">4</i>
              <div>
                <h2>รูปภาพทรัพย์</h2>
                <span className="hint">
                  หลังบันทึกร่าง คุณเพิ่มรูปได้สูงสุด 20 รูป
                  เลือกภาพปกและจัดลำดับได้
                </span>
              </div>
            </header>
            <div className="empty-state">
              บันทึกร่างก่อน แล้วระบบจะเปิดพื้นที่จัดการรูปภาพให้คุณ
            </div>
          </section>
          <footer className="sticky-actions">
            <Link className="button-secondary" href="/dashboard/properties">
              ยกเลิก
            </Link>
            <button type="submit">บันทึกเป็นแบบร่าง</button>
          </footer>
        </form>
      </main>
    </>
  );
}
