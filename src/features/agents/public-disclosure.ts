type AgentProfileRow = Record<string, unknown> & {
  public_display_name: string;
  slug: string;
  brand_name?: string | null;
  bio?: string | null;
  public_email?: string | null;
  public_phone?: string | null;
  show_email: boolean;
  show_phone: boolean;
  verification_status: string;
};

export type PublicAgentProfile = {
  displayName: string;
  slug: string;
  brandName: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  verified: boolean;
};

export function toPublicAgentProfile(row: AgentProfileRow): PublicAgentProfile {
  return {
    displayName: row.public_display_name,
    slug: row.slug,
    brandName: row.brand_name ?? null,
    bio: row.bio ?? null,
    email: row.show_email ? row.public_email ?? null : null,
    phone: row.show_phone ? row.public_phone ?? null : null,
    verified: row.verification_status === "verified"
  };
}
