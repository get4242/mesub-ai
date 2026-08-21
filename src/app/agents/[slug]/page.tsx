import { notFound } from "next/navigation";
import { toPublicAgentProfile } from "@/features/agents/public-disclosure";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: row, error } = await supabase.from("agent_profiles").select("user_id,public_display_name,slug,brand_name,bio,public_email,public_phone,show_email,show_phone,verification_status").eq("slug", slug).maybeSingle();
  if (error || !row) notFound();
  const { data: identity } = await supabase.from("profiles").select("status").eq("user_id", row.user_id).maybeSingle();
  if (!identity || identity.status !== "active") notFound();
  const agent = toPublicAgentProfile(row);
  return <main><article className="panel"><h1>{agent.displayName}</h1>{agent.brandName ? <p>{agent.brandName}</p> : null}{agent.bio ? <p>{agent.bio}</p> : null}{agent.verified ? <p>ยืนยันตัวตนแล้ว</p> : null}{agent.email ? <a href={`mailto:${agent.email}`}>{agent.email}</a> : null}{agent.phone ? <a href={`tel:${agent.phone}`}>{agent.phone}</a> : null}</article></main>;
}
