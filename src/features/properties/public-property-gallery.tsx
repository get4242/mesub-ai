"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Media = { media_id: string; width: number; height: number };
export function PublicPropertyGallery({
  media,
  title,
}: {
  media: Media[];
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((active + 1) % media.length);
      if (event.key === "ArrowLeft")
        setActive((active - 1 + media.length) % media.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, media.length]);
  function close() {
    setActive(null);
    setTimeout(() => opener.current?.focus(), 0);
  }
  if (!media.length)
    return (
      <div className="property-fallback" style={{ minHeight: 320 }}>
        ยังไม่มีรูปภาพสำหรับประกาศนี้
      </div>
    );
  const shown = media.slice(0, 3);
  return (
    <>
      <div className="detail-gallery">
        {shown.map((item, index) => (
          <button
            className="gallery-button"
            key={item.media_id}
            ref={index === 0 ? opener : undefined}
            onClick={() => setActive(index)}
            aria-label={`เปิดรูปที่ ${index + 1} จาก ${media.length}`}
          >
            <Image
              src={`/api/public-property-media/${item.media_id}`}
              alt={index === 0 ? `ภาพปก ${title}` : ""}
              width={item.width}
              height={item.height}
            />
            {index === shown.length - 1 ? (
              <span className="button gallery-count">
                ดูรูปทั้งหมด · {media.length} รูป
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {active !== null ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`รูปภาพ ${title}`}
        >
          <button
            aria-label="รูปก่อนหน้า"
            onClick={() =>
              setActive((active - 1 + media.length) % media.length)
            }
          >
            ←
          </button>
          <Image
            src={`/api/public-property-media/${media[active]!.media_id}`}
            alt={`รูปที่ ${active + 1} ของ ${title}`}
            width={media[active]!.width}
            height={media[active]!.height}
          />
          <button
            aria-label="รูปถัดไป"
            onClick={() => setActive((active + 1) % media.length)}
          >
            →
          </button>
          <button
            className="lightbox-close"
            aria-label="ปิดแกลเลอรี"
            onClick={close}
          >
            ×
          </button>
          <b className="lightbox-count">
            {active + 1} / {media.length}
          </b>
        </div>
      ) : null}
    </>
  );
}
