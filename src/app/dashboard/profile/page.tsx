import { updateAgentProfileFormAction } from "@/features/agents/actions";
import { getOwnAgentProfile } from "@/features/agents/queries";

export default async function ProfilePage() {
  const profile = await getOwnAgentProfile();
  return <section><h1>โปรไฟล์ Agent</h1><form action={updateAgentProfileFormAction} className="panel"><label htmlFor="publicDisplayName">ชื่อที่แสดง</label><input id="publicDisplayName" name="publicDisplayName" defaultValue={profile.public_display_name} required /><label htmlFor="slug">Slug</label><input id="slug" name="slug" defaultValue={profile.slug} required /><label htmlFor="brandName">แบรนด์</label><input id="brandName" name="brandName" defaultValue={profile.brand_name ?? ""} /><label htmlFor="bio">แนะนำตัว</label><textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} /><label htmlFor="publicEmail">อีเมลสาธารณะ</label><input id="publicEmail" name="publicEmail" type="email" defaultValue={profile.public_email ?? ""} /><label><input name="showEmail" type="checkbox" defaultChecked={profile.show_email} /> แสดงอีเมล</label><label htmlFor="publicPhone">โทรศัพท์สาธารณะ</label><input id="publicPhone" name="publicPhone" defaultValue={profile.public_phone ?? ""} /><label><input name="showPhone" type="checkbox" defaultChecked={profile.show_phone} /> แสดงโทรศัพท์</label><button type="submit">บันทึกโปรไฟล์</button></form></section>;
}
