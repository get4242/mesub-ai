type PropertyRow = Record<string, unknown> & {
  id: string; title: string; description: string; province: string; district: string;
  listing_type: string; property_type: string; price: string; currency: string;
};

export type PublicPropertyDisclosure = {
  id: string; title: string; description: string; province: string; district: string;
  listingType: string; propertyType: string; price: string; currency: string;
};

export function toPublicPropertyDisclosure(row: PropertyRow): PublicPropertyDisclosure {
  return {
    id: row.id, title: row.title, description: row.description, province: row.province,
    district: row.district, listingType: row.listing_type, propertyType: row.property_type,
    price: row.price, currency: row.currency
  };
}
