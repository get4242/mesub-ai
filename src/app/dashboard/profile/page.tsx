import { updateAgentProfileFormAction } from "@/features/agents/actions";
import { getOwnAgentProfile } from "@/features/agents/queries";
import { LineAccountCard } from "@/components/line-account-card";
import { createClient } from "@/lib/supabase/server";
export default async function ProfilePage() {
  const profile = await getOwnAgentProfile();
  const supabase = await createClient();
  const { data: link } = await supabase.from("line_identity_links").select("id").is("revoked_at", null).maybeSingle();
  const { data: notificationConsent } = await supabase.from("line_notification_consents").select("enabled").maybeSingle();
  const liffId = process.env.LINE_ENVIRONMENT === "production" ? null : (process.env.LINE_MINI_APP_LIFF_ID ?? null);
  return (
    <>
      <header className="agent-topbar">
        <h1>โปรไฟล์ของฉัน</h1>
      </header>
      <main className="agent-content">
        <div className="page-head">
          <h1>ข้อมูล Agent</h1>
          <p>เลือกข้อมูลที่ต้องการแสดงต่อสาธารณะ</p>
        </div>
        <form action={updateAgentProfileFormAction} className="property-form">
          <section className="form-section">
            <div className="form-grid">
              <label className="field">
                <span>ชื่อที่แสดง</span>
                <input
                  name="publicDisplayName"
                  defaultValue={profile.public_display_name}
                  required
                />
              </label>
              <label className="field">
                <span>ชื่อสำหรับ URL</span>
                <input name="slug" defaultValue={profile.slug} required />
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
            </div>
          </section>
          <footer className="sticky-actions">
            <button>บันทึกโปรไฟล์</button>
          </footer>
        </form>
        <LineAccountCard liffId={liffId} linked={Boolean(link)} notificationsEnabled={notificationConsent?.enabled === true} />
      </main>
    </>
  );
}
