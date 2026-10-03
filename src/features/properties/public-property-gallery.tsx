"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

type Media = { media_id: string; width: number; height: number };
export function PublicPropertyGallery({
  media,
  title,
}: {
  media: Media[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setActive((active + 1) % media.length);
      if (event.key === "ArrowLeft")
        setActive((active - 1 + media.length) % media.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, media.length]);
  if (!media.length)
    return (
      <div className="property-fallback" style={{ minHeight: 320 }}>
        ยังไม่มีรูปภาพสำหรับประกาศนี้
      </div>
    );
  const item = media[active]!;
  return (
    <section className="property-slider" aria-label={`รูปภาพ ${title}`}>
      <div className="property-slider-main">
        <Image
          src={`/api/public-property-media/${item.media_id}`}
          alt={`รูปที่ ${active + 1} ของ ${title}`}
          width={item.width}
          height={item.height}
          priority
        />
        {media.length > 1 ? (
          <>
            <button className="property-slider-arrow previous" type="button" onClick={() => setActive((active - 1 + media.length) % media.length)} aria-label="ดูรูปก่อนหน้า">‹</button>
            <button className="property-slider-arrow next" type="button" onClick={() => setActive((active + 1) % media.length)} aria-label="ดูรูปถัดไป">›</button>
          </>
        ) : null}
        <span className="property-slider-count">{active + 1} / {media.length}</span>
      </div>
      {media.length > 1 ? (
        <div className="property-slider-thumbnails" role="tablist" aria-label="เลือกรูปภาพ">
          {media.map((thumbnail, index) => (
            <button type="button" role="tab" aria-selected={index === active} className={index === active ? "selected" : ""} key={thumbnail.media_id} onClick={() => setActive(index)} aria-label={`เลือกรูปที่ ${index + 1}`}>
              <Image src={`/api/public-property-media/${thumbnail.media_id}`} alt="" width={thumbnail.width} height={thumbnail.height} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
