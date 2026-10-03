"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Media = { id: string; original_filename: string; status: string };

export function AgentPropertyGallery({
  media,
  title,
}: {
  media: Media[];
  title: string;
}) {
  const readyMedia = media.filter((item) => item.status === "ready");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!readyMedia.length) return;
      if (event.key === "ArrowRight")
        setActive((current) => (current + 1) % readyMedia.length);
      if (event.key === "ArrowLeft")
        setActive((current) => (current - 1 + readyMedia.length) % readyMedia.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [readyMedia.length]);

  if (!readyMedia.length) return null;
  const activeIndex = Math.min(active, readyMedia.length - 1);
  const item = readyMedia[activeIndex]!;

  return (
    <section className="property-slider agent-property-slider" aria-label={`รูปภาพ ${title}`}>
      <div className="property-slider-main">
        <Image
          src={`/api/agent-property-media/${item.id}`}
          alt={`รูปที่ ${activeIndex + 1} ของ ${title}`}
          width={1200}
          height={900}
          unoptimized
          priority
        />
        {readyMedia.length > 1 ? (
          <>
            <button
              className="property-slider-arrow previous"
              type="button"
              onClick={() =>
                setActive((current) =>
                  (current - 1 + readyMedia.length) % readyMedia.length,
                )
              }
              aria-label="ดูรูปก่อนหน้า"
            >
              ‹
            </button>
            <button
              className="property-slider-arrow next"
              type="button"
              onClick={() =>
                setActive((current) => (current + 1) % readyMedia.length)
              }
              aria-label="ดูรูปถัดไป"
            >
              ›
            </button>
          </>
        ) : null}
        <span className="property-slider-count">
          {activeIndex + 1} / {readyMedia.length}
        </span>
      </div>
      {readyMedia.length > 1 ? (
        <div className="property-slider-thumbnails" role="tablist" aria-label="เลือกรูปภาพ">
          {readyMedia.map((thumbnail, index) => (
            <button
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "selected" : ""}
              key={thumbnail.id}
              onClick={() => setActive(index)}
              aria-label={`เลือกรูปที่ ${index + 1}: ${thumbnail.original_filename}`}
            >
              <Image
                src={`/api/agent-property-media/${thumbnail.id}`}
                alt=""
                width={180}
                height={120}
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
