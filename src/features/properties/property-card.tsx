import Image from "next/image";
import Link from "next/link";

export type PropertyCardData = {
  id: string;
  slug: string;
  title: string;
  location: string;
  listingType: string;
  propertyType: string;
  price: string;
  coverMediaId?: string;
};
export function PropertyCard({ property }: { property: PropertyCardData }) {
  return (
    <article className="property-card">
      {property.coverMediaId ? (
        <Image
          src={`/api/public-property-media/${property.coverMediaId}`}
          alt=""
          width={720}
          height={450}
        />
      ) : (
        <div className="property-fallback">MESUB PROPERTY</div>
      )}
      <div className="property-card-body">
        <span className="badge">
          {property.listingType === "sale" ? "ขาย" : "เช่า"} ·{" "}
          {property.propertyType}
        </span>
        <h2>
          <Link href={`/properties/${property.slug}`}>{property.title}</Link>
        </h2>
        <p className="muted">{property.location}</p>
        <strong className="price">{property.price}</strong>
      </div>
    </article>
  );
}
