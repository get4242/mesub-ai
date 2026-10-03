import { updateAgentProfileFormAction } from "@/features/agents/actions";
import { getOwnAgentProfile } from "@/features/agents/queries";
import { LineAccountCard } from "@/components/line-account-card";
import { createClient } from "@/lib/supabase/server";
import { changePasswordAction } from "@/features/auth/actions";
import { PasswordForm } from "@/features/auth/password-form";
export default async function ProfilePage() {
  const profile = await getOwnAgentProfile();
  const supabase = await createClient();
  const { data: link } = await supabase.from("line_identity_links").select("id").is("revoked_at", null).maybeSingle();
  const { data: notificationConsent } = await supabase.from("line_notification_consents").select("enabled").maybeSingle();
  const liffId = process.env.LINE_MINI_APP_LIFF_ID ?? null;
  return (
    <>
      <header className="agent-topbar">
        <h1>⚙ ตั้งค่า</h1>
      </header>
      <main className="agent-content profile-content">
        <form action={updateAgentProfileFormAction} className="property-form profile-form">
          <section className="form-section profile-card">
            <header>
              <div>
                <h2>ข้อมูลโปรไฟล์</h2>
                <span className="hint">แสดงบนเว็บไซต์ทรัพย์ของคุณ ให้ลูกค้าติดต่อได้โดยตรง</span>
              </div>
            </header>
            <div className="form-grid">
              <label className="field full">
                <span>ชื่อที่แสดง</span>
                <input
                  name="publicDisplayName"
                  defaultValue={profile.public_display_name}
                  required
                />
              </label>
              <label className="field">
                <span>โทรศัพท์สาธารณะ</span>
                <input
                  name="publicPhone"
                  defaultValue={profile.public_phone ?? ""}
                />
                <span>
                  <input
                    name="showPhone"
                    type="checkbox"
                    defaultChecked={profile.show_phone}
                  />{" "}
                  แสดงโทรศัพท์
                </span>
              </label>
              <label className="field">
                <span>อีเมลสาธารณะ</span>
                <input
                  name="publicEmail"
                  type="email"
                  defaultValue={profile.public_email ?? ""}
                />
                <span>
                  <input
                    name="showEmail"
                    type="checkbox"
                    defaultChecked={profile.show_email}
                  />{" "}
                  แสดงอีเมล
                </span>
              </label>
              <label className="field full">
                <span>แบรนด์</span>
                <input
                  name="brandName"
                  defaultValue={profile.brand_name ?? ""}
                />
              </label>
              <label className="field full">
                <span>แนะนำตัว</span>
                <textarea name="bio" defaultValue={profile.bio ?? ""} />
              </label>
            </div>
            <section className="profile-slug-card">
              <h3>🔗 เว็บส่วนตัว</h3>
              <p>ลิงก์นี้ใช้แชร์ให้ลูกค้าดูทรัพย์ของคุณ</p>
              <label className="field">
                <span>ชื่อสำหรับ URL</span>
                <input name="slug" defaultValue={profile.slug} required />
              </label>
              <a className="button-secondary" href={`/agents/${profile.slug}`} target="_blank" rel="noreferrer">เปิดเว็บของฉัน ↗</a>
            </section>
            <footer className="sticky-actions">
              <button>บันทึกโปรไฟล์</button>
            </footer>
          </section>
        </form>
        <section className="form-section">
          <header>
            <div>
              <h2>เปลี่ยนรหัสผ่าน</h2>
              <span className="hint">หลังเปลี่ยนสำเร็จ ระบบจะให้เข้าสู่ระบบใหม่</span>
            </div>
          </header>
          <PasswordForm mode="change" action={changePasswordAction} />
        </section>
        <LineAccountCard liffId={liffId} linked={Boolean(link)} notificationsEnabled={notificationConsent?.enabled === true} />
      </main>
    </>
  );
}
