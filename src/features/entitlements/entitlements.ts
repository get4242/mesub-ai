export const FREE_ACTIVE_PROPERTY_LIMIT = 3;

export type EffectiveEntitlement = {
  planCode: string;
  activePropertyLimit: number;
};

export function effectiveEntitlement(
  entitlement: EffectiveEntitlement = {
    planCode: "free",
    activePropertyLimit: FREE_ACTIVE_PROPERTY_LIMIT
  }
): EffectiveEntitlement {
  if (!Number.isSafeInteger(entitlement.activePropertyLimit) || entitlement.activePropertyLimit < 1) {
    throw new Error("INVALID_ACTIVE_PROPERTY_LIMIT");
  }

  return entitlement;
}

export function quotaSnapshot(publishedCount: number, entitlement: EffectiveEntitlement) {
  if (!Number.isSafeInteger(publishedCount) || publishedCount < 0) {
    throw new Error("INVALID_PUBLISHED_COUNT");
  }

  const remaining = Math.max(0, entitlement.activePropertyLimit - publishedCount);
  return {
    used: publishedCount,
    limit: entitlement.activePropertyLimit,
    remaining,
    canPublish: remaining > 0
  };
}
