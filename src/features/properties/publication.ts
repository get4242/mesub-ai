import { z } from "zod";

const publicationInput = z.object({
  propertyId: z.string().min(1),
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(200)
});

type PublicationOutcome =
  | { outcome: "published" | "already_published"; propertyId: string; publishedCount: number; limit: number }
  | { outcome: "quota_exceeded" | "validation_failed" | "forbidden" | "conflict" };

export type PublicationRepository = {
  publish(input: {
    tenantId: string;
    userId: string;
    propertyId: string;
    expectedVersion: number;
    idempotencyKey: string;
  }): Promise<PublicationOutcome>;
};

export async function publishProperty(
  input: unknown,
  context: { tenantId: string; userId: string },
  repository: PublicationRepository
) {
  const parsed = publicationInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "INVALID_INPUT" };

  const result = await repository.publish({ ...context, ...parsed.data });
  if (result.outcome === "published" || result.outcome === "already_published") {
    return { ok: true as const, data: result };
  }
  return { ok: false as const, code: result.outcome.toUpperCase() };
}
