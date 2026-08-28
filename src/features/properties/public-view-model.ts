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
};

export function toPublicPropertyCard(row: PublicProjectionRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: `${row.district}, ${row.province}`,
    listingType: row.listing_type,
    propertyType: row.property_type,
    price: new Intl.NumberFormat("th-TH", { style: "currency", currency: row.currency, maximumFractionDigits: 0 }).format(Number(row.price))
  };
}
