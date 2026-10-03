"use client";

import Script from "next/script";
import { useState } from "react";

const propertyTypeLabel: Record<string, string> = {
  land: "ที่ดิน",
  detached_house: "บ้านเดี่ยว",
  townhouse: "ทาวน์เฮาส์",
  condominium: "คอนโด",
  commercial_building: "อาคารพาณิชย์",
  other: "อสังหาริมทรัพย์",
};

type ShareProperty = {
  title: string;
  propertyType: string;
  price: string;
  location: string;
  url: string;
  imageUrl?: string;
};

export function LineFlexShareButton({
  liffId,
  property,
}: {
  liffId: string | null;
  property: ShareProperty;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const linkShareUrl = `https://line.me/R/share?text=${encodeURIComponent(`${property.title} ${property.url}`)}`;

  async function initialize() {
    if (!liffId || !window.liff) return;
    try {
      await window.liff.init({ liffId });
      setReady(true);
    } catch {
      setMessage("เปิดการเชื่อมต่อ LINE ไม่สำเร็จ จึงแชร์เป็นลิงก์แทนได้");
    }
  }

  async function share() {
    setMessage("");
    if (!liffId || !window.liff || !ready || !window.liff.isInClient() || !window.liff.shareTargetPicker) {
      window.open(linkShareUrl, "_blank", "noopener,noreferrer");
      setMessage("หน้านี้ไม่ได้เปิดจาก LINE MINI App จึงแชร์เป็นลิงก์แทน");
      return;
    }
    if (!window.liff.isLoggedIn()) {
      window.liff.login({ redirectUri: window.location.href });
      return;
    }

    setBusy(true);
    try {
      const bubble = {
        type: "bubble",
        ...(property.imageUrl
          ? {
              hero: {
                type: "image",
                url: property.imageUrl,
                size: "full",
                aspectRatio: "20:13",
                aspectMode: "cover",
              },
            }
          : {}),
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: propertyTypeLabel[property.propertyType] ?? property.propertyType,
              size: "xs",
              color: "#17633F",
              weight: "bold",
            },
            {
              type: "text",
              text: property.title.slice(0, 200),
              weight: "bold",
              size: "lg",
              wrap: true,
              color: "#14352B",
            },
            { type: "separator", margin: "md", color: "#D9E7DF" },
            {
              type: "text",
              text: property.price,
              weight: "bold",
              size: "xl",
              color: "#075A35",
              margin: "md",
            },
            {
              type: "text",
              text: `📍 ${property.location}`,
              wrap: true,
              size: "sm",
              color: "#60726B",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#075A35",
              action: { type: "uri", label: "ดูรายละเอียด", uri: property.url },
            },
          ],
        },
      };
      await window.liff.shareTargetPicker([
        { type: "flex", altText: `${property.title} · ${property.price}`, contents: bubble },
      ]);
      setMessage("เลือกผู้รับแล้ว LINE จะส่งการ์ดทรัพย์แบบ Flex ให้ทันที");
    } catch {
      setMessage("ยังแชร์ Flex ไม่ได้ กรุณาตรวจว่า LINE MINI App ได้เปิดสิทธิ์การแชร์ข้อความแล้ว");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="line-flex-share">
      {liffId ? (
        <Script
          src="https://static.line-scdn.net/liff/edge/2/sdk.js"
          strategy="lazyOnload"
          onLoad={initialize}
        />
      ) : null}
      <button className="button-line" type="button" disabled={busy} onClick={share}>
        {busy ? "กำลังเปิด LINE…" : "แชร์ Flex ใน LINE"}
      </button>
      {message ? <p role="status" className="hint">{message}</p> : null}
    </div>
  );
}
