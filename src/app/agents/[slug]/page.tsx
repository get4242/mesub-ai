import { notFound } from "next/navigation";
import { toPublicAgentProfile } from "@/features/agents/public-disclosure";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicShell } from "@/components/public-shell";

export default async function PublicAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: row, error } = await supabase.from("agent_profiles").select("user_id,public_display_name,slug,brand_name,bio,public_email,public_phone,show_email,show_phone,verification_status").eq("slug", slug).maybeSingle();
  if (error || !row) notFound();
  const { data: identity } = await supabase.from("profiles").select("status").eq("user_id", row.user_id).maybeSingle();
  if (!identity || identity.status !== "active") notFound();
  const agent = toPublicAgentProfile(row);
  return (
    <PublicShell>
      <main className="public-main">
        <article className="card agent-public-profile">
          <span className="eyebrow">โปรไฟล์ Agent</span>
          <h1>{agent.displayName}</h1>
          {agent.brandName ? <p className="lead-copy">{agent.brandName}</p> : null}
          {agent.verified ? <span className="status-badge status-published">ยืนยันตัวตนแล้ว</span> : null}
          {agent.bio ? <p>{agent.bio}</p> : null}
          {agent.email || agent.phone ? (
            <div className="profile-contact-list" aria-label="ช่องทางติดต่อที่ Agent เปิดเผย">
              {agent.email ? <a className="button-secondary" href={`mailto:${agent.email}`}>อีเมล</a> : null}
              {agent.phone ? <a className="button" href={`tel:${agent.phone}`}>โทรหา Agent</a> : null}
            </div>
          ) : (
            <p className="muted">Agent ยังไม่ได้เปิดเผยช่องทางติดต่อสาธารณะ</p>
          )}
        </article>
      </main>
    </PublicShell>
  );
}
