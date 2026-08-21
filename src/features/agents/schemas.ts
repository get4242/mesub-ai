import { z } from "zod";

export const agentProfileUpdateSchema = z.object({
  publicDisplayName: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brandName: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  publicEmail: z.union([z.email(), z.literal("")]).optional(),
  publicPhone: z.string().trim().max(30).optional(),
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false)
}).strict();
