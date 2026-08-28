import type { AiInputSnapshotV1 } from "./contracts";

type Context = { tenantId: string; agentProfileId: string };
type PropertyInput = Record<string, unknown> & { id: string; tenantId: string; version: number };
type MediaInput = { id: string; tenantId: string; propertyId: string; status: string; checksumSha256: string };
type SnapshotLimits = { maxTextCharacters: number; maxImages: number };

const propertyFields = [
  "id", "version", "criticalVersion", "listingType", "propertyType", "title", "description", "province", "district",
  "subdistrict", "addressLine", "latitude", "longitude", "price", "currency", "landAreaSquareMetres",
  "buildingAreaSquareMetres", "bedrooms", "bathrooms"
] as const;

export function buildAiInputSnapshot(
  context: Context,
  property: PropertyInput,
  media: MediaInput[],
  agentText: string,
  limits: SnapshotLimits = { maxTextCharacters: 12_000, maxImages: 10 }
): AiInputSnapshotV1 {
  if (property.tenantId !== context.tenantId || !Number.isInteger(property.version) || property.version < 1) {
    throw new Error("INVALID_PROPERTY");
  }
  if (media.some((item) => item.tenantId !== context.tenantId || item.propertyId !== property.id || item.status !== "ready")) {
    throw new Error("INVALID_MEDIA");
  }
  const text = agentText.trim();
  if (!text && media.length === 0) throw new Error("EMPTY_INPUT");
  if (text.length > limits.maxTextCharacters || media.length > limits.maxImages) throw new Error("LIMIT_REACHED");

  const safeProperty = Object.fromEntries(
    propertyFields.flatMap((field) => property[field] === undefined ? [] : [[field, property[field]]])
  ) as AiInputSnapshotV1["property"];

  return {
    schemaVersion: 1,
    tenantId: context.tenantId,
    agentProfileId: context.agentProfileId,
    property: safeProperty,
    media: media.map(({ id, checksumSha256 }) => ({ id, checksumSha256 })),
    agentText: text
  };
}
