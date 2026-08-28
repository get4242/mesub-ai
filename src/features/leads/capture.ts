import { z } from "zod";

const commonShape = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(6).max(40).optional(),
  message: z.string().trim().min(1).max(2000),
  consent: z.literal(true),
  consentVersion: z.string().trim().min(1).max(40),
  idempotencyKey: z.string().trim().min(8).max(200)
};

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("property"), propertyId: z.string().uuid(), ...commonShape }),
  z.object({ kind: z.literal("general"), ...commonShape })
]).superRefine((value, context) => {
  if (!value.email && !value.phone) context.addIssue({ code: "custom", message: "CONTACT_REQUIRED" });
});

export type LeadCaptureInput = z.infer<typeof schema>;
export function parseLeadCapture(input: unknown): LeadCaptureInput { return schema.parse(input); }
