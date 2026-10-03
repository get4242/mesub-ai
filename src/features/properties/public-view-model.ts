type PublicProjectionRow = {
  id: string;
  slug: string;
  title: string;
  province: string;
  district: string;
  listing_type: string;
  property_type: string;
  price: number | string;
  currency: string;
  land_area_sqm?: number | string | null;
};

import { formatPropertyPrice } from "./price-display";

export function toPublicPropertyCard(row: PublicProjectionRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: `${row.district}, ${row.province}`,
    listingType: row.listing_type,
    propertyType: row.property_type,
    price: formatPropertyPrice(row)
  };
}
