"use client";

import { useState } from "react";
import {
  archivePropertyAction,
  requestPropertyConfirmationAction,
  returnPropertyToDraftAction,
  updatePropertyDraftAction,
} from "./actions";
import { propertyMutationMessage } from "./dashboard-model";
import {
  archivePropertyMediaAction,
  finalizePropertyMediaAction,
  reorderPropertyMediaAction,
  requestPropertyMediaUploadAction,
} from "@/features/media/actions";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Property = {
  id: string;
  version: number;
  status: string;
  title: string;
  description: string;
  province: string;
  district: string;
  subdistrict: string | null;
  price: number | string;
  land_area_sqm: number | string | null;
  building_area_sqm: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
};
type Media = {
  id: string;
  original_filename: string;
  position: number;
  status: string;
};

export function PropertyEditor({
  property,
  initialMedia,
}: {
  property: Property;
  initialMedia: Media[];
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState(initialMedia);

  async function save(formData: FormData) {
    setPending(true);
    setMessage("");
    const result = await updatePropertyDraftAction({
      propertyId: property.id,
      expectedVersion: property.version,
      title: formData.get("title"),
      description: formData.get("description"),
      province: formData.get("province"),
      district: formData.get("district"),
      subdistrict: formData.get("subdistrict") || undefined,
      price: formData.get("price"),
    });
    setPending(false);
    setMessage(
      result.ok
        ? "บันทึกแล้ว กรุณาโหลดหน้าเพื่อดูเวอร์ชันล่าสุด"
        : propertyMutationMessage(result.code),
    );
  }

  async function transition(
    next: "pending_confirmation" | "draft" | "archived",
  ) {
    setPending(true);
    const result =
      next === "pending_confirmation"
        ? await requestPropertyConfirmationAction(property.id, property.version)
        : next === "draft"
          ? await returnPropertyToDraftAction(property.id, property.version)
          : await archivePropertyAction(property.id, property.version);
    setPending(false);
    setMessage(
      result.ok ? "อัปเดตสถานะแล้ว" : propertyMutationMessage(result.code),
    );
  }

  async function upload(file: File) {
    setPending(true);
    setMessage(`กำลังอัปโหลด ${file.name}…`);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const bitmap = await createImageBitmap(file);
      const checksum = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      )
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      const request = await requestPropertyMediaUploadAction({
        propertyId: property.id,
        originalFilename: file.name,
        mimeType: file.type,
        byteSize: file.size,
        width: bitmap.width,
        height: bitmap.height,
        checksumSha256: checksum,
        signature: Array.from(bytes.slice(0, 16)),
      });
      bitmap.close();
      if (!request.ok) throw new Error(request.message);
      const supabase = createClient();
      const uploaded = await supabase.storage
        .from(request.data.bucketId)
        .uploadToSignedUrl(
          request.data.objectPath,
          request.data.uploadToken,
          file,
          { contentType: file.type, upsert: false },
        );
      if (uploaded.error) throw uploaded.error;
      const finalized = await finalizePropertyMediaAction(request.data.mediaId);
      if (!finalized.ok) throw new Error("อัปโหลดไม่สมบูรณ์");
      setMedia((rows) => [
        ...rows,
        {
          id: request.data.mediaId,
          original_filename: file.name,
          position: rows.length,
          status: "ready",
        },
      ]);
      setMessage(`อัปโหลด ${file.name} สำเร็จ`);
    } catch (error) {
      setMessage(
        `${file.name}: ${error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ"}`,
      );
    } finally {
      setPending(false);
    }
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setMedia(next);
    const result = await reorderPropertyMediaAction(
      property.id,
      next.map((row) => row.id),
    );
    if (!result.ok) {
      setMedia(media);
      setMessage("จัดลำดับรูปไม่สำเร็จ");
    }
  }

  async function archiveMedia(id: string) {
    const result = await archivePropertyMediaAction(id);
    if (result.ok) setMedia((rows) => rows.filter((row) => row.id !== id));
  }

  return (
    <>
      <p><Link href={`/dashboard/properties/${property.id}/ai`}>ให้ AI ช่วยจัดข้อมูล</Link></p>
      <form action={save} className="panel">
        <label htmlFor="title">ชื่อทรัพย์</label>
        <input id="title" name="title" defaultValue={property.title} required />
        <label htmlFor="description">รายละเอียด</label>
        <textarea
          id="description"
          name="description"
          defaultValue={property.description}
          required
        />
        <label htmlFor="province">จังหวัด</label>
        <input
          id="province"
          name="province"
          defaultValue={property.province}
          required
        />
        <label htmlFor="district">อำเภอ/เขต</label>
        <input
          id="district"
          name="district"
          defaultValue={property.district}
          required
        />
        <label htmlFor="subdistrict">ตำบล/แขวง</label>
        <input
          id="subdistrict"
          name="subdistrict"
          defaultValue={property.subdistrict ?? ""}
        />
        <label htmlFor="price">ราคา</label>
        <input
          id="price"
          name="price"
          defaultValue={String(property.price)}
          required
        />
        <button disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
        </button>
      </form>
      <div className="actions">
        {property.status === "draft" ? (
          <button
            disabled={pending}
            onClick={() => transition("pending_confirmation")}
          >
            ส่งตรวจยืนยัน
          </button>
        ) : null}
        {property.status === "pending_confirmation" ? (
          <button disabled={pending} onClick={() => transition("draft")}>
            กลับเป็นร่าง
          </button>
        ) : null}
        <button disabled={pending} onClick={() => transition("archived")}>
          เก็บเข้าคลัง
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
      <section id="media">
        <h2>รูปภาพ</h2>
        <label htmlFor="mediaFile">เพิ่มรูป JPEG, PNG หรือ WebP</label>
        <input
          id="mediaFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending || media.length >= 20}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <ol>
          {media.map((row, index) => (
            <li key={row.id}>
              {row.original_filename} ({row.status}){" "}
              <button onClick={() => move(index, -1)} disabled={index === 0}>
                เลื่อนขึ้น
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === media.length - 1}
              >
                เลื่อนลง
              </button>
              <button onClick={() => archiveMedia(row.id)}>นำออก</button>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
