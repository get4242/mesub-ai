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
  reorderPropertyMediaAction,
} from "@/features/media/actions";
import { resizeImageForUpload } from "@/features/media/browser-image";
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

  async function uploadOne(file: File) {
    try {
      setMessage(`กำลังปรับขนาด ${file.name}…`);
      const resized = await resizeImageForUpload(file);
      const formData = new FormData();
      formData.set("propertyId", property.id);
      formData.set("file", resized);
      const response = await fetch("/api/agent-property-media/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json() as {
        ok: boolean;
        message?: string;
        media?: Media;
      };
      if (!response.ok || !result.ok || !result.media) {
        throw new Error(result.message ?? "อัปโหลดไม่สำเร็จ");
      }
      setMedia((rows) => [
        ...rows,
        result.media!,
      ]);
      return true;
    } catch (error) {
      return error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ";
    }
  }

  async function upload(files: File[]) {
    const allowed = Math.max(0, 20 - media.length);
    const selected = files.slice(0, allowed);
    if (!selected.length) {
      setMessage("ทรัพย์นี้มีรูปครบ 20 รูปแล้ว");
      return;
    }
    setPending(true);
    const failures: string[] = [];
    let completed = 0;
    for (const [index, file] of selected.entries()) {
      setMessage(`กำลังอัปโหลด ${index + 1}/${selected.length}: ${file.name}…`);
      const result = await uploadOne(file);
      if (result === true) completed += 1;
      else failures.push(`${file.name}: ${result}`);
    }
    setPending(false);
    if (failures.length) {
      setMessage(`อัปโหลดสำเร็จ ${completed}/${selected.length} รูป — ${failures.join(" | ")}`);
    } else {
      setMessage(`อัปโหลดรูปสำเร็จ ${completed} รูป`);
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
      <form action={save} className="property-form">
        <section className="form-section">
          <header>
            <i className="step-number">1</i>
            <div>
              <h2>ข้อมูลพื้นฐานของทรัพย์</h2>
              <span className="hint">ชื่อที่ลูกค้าจะเห็นในประกาศ</span>
            </div>
          </header>
          <label className="field">
            <span>ชื่อทรัพย์</span>
            <input name="title" defaultValue={property.title} required />
          </label>
        </section>
        <section className="form-section">
          <header>
            <i className="step-number">2</i>
            <div>
              <h2>ราคาและทำเล</h2>
              <span className="hint">ตรวจข้อมูลสำคัญก่อนยืนยัน</span>
            </div>
          </header>
          <div className="form-grid">
            <label className="field">
              <span>ราคา</span>
              <input
                name="price"
                defaultValue={String(property.price)}
                required
              />
            </label>
            <label className="field">
              <span>จังหวัด</span>
              <input
                name="province"
                defaultValue={property.province}
                required
              />
            </label>
            <label className="field">
              <span>อำเภอ / เขต</span>
              <input
                name="district"
                defaultValue={property.district}
                required
              />
            </label>
            <label className="field">
              <span>ตำบล / แขวง</span>
              <input
                name="subdistrict"
                defaultValue={property.subdistrict ?? ""}
              />
            </label>
          </div>
        </section>
        <section className="form-section">
          <header>
            <i className="step-number">3</i>
            <div>
              <h2>รายละเอียดทรัพย์</h2>
              <span className="hint">แก้ไขข้อความตามข้อมูลที่คุณยืนยันได้</span>
            </div>
          </header>
          <label className="field">
            <span>รายละเอียด</span>
            <textarea
              name="description"
              defaultValue={property.description}
              required
            />
          </label>
        </section>
        <footer className="sticky-actions">
          <Link
            className="button-secondary"
            href={`/dashboard/properties/${property.id}/ai`}
          >
            ✦ ให้ AI ช่วยจัดข้อมูล
          </Link>
          <button disabled={pending}>
            {pending ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </footer>
      </form>
      <div className="actions">
        {property.status === "published" ? (
          <a
            className="button-line"
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`https://mesub-ai.vercel.app/properties/${property.id}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            แชร์ประกาศผ่าน LINE
          </a>
        ) : null}
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
          เก็บเข้าคลัง (ซ่อนทรัพย์)
        </button>
      </div>
      <p className="hint">แบบร่างยังไม่แสดงต่อสาธารณะ ส่วน “เก็บเข้าคลัง” คือซ่อนทรัพย์ไว้โดยไม่ลบข้อมูลหรือรูปภาพ</p>
      {message ? <p role="status">{message}</p> : null}
      <section className="form-section" id="media">
        <header>
          <i className="step-number">4</i>
          <div>
            <h2>รูปภาพทรัพย์</h2>
            <span className="hint">รูปแรกคือภาพปก · {media.length}/20 รูป</span>
          </div>
        </header>
        <label className="field" htmlFor="mediaFile">
          <span>เพิ่มรูปได้หลายรูป (JPEG, PNG หรือ WebP) — ระบบย่อรูปให้อัตโนมัติก่อนอัปโหลด</span>
          <input
            id="mediaFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={pending || media.length >= 20}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.currentTarget.value = "";
              if (files.length) void upload(files);
            }}
          />
        </label>
        <div className="media-grid">
          {media.map((row, index) => (
            <article
              className={`media-card ${index === 0 ? "cover" : ""}`}
              key={row.id}
            >
              {row.status === "ready" ? (
                <>
                  {/* Authenticated media cannot use the public image optimizer because it must keep the Agent session. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/agent-property-media/${row.id}`}
                    alt={index === 0 ? `ภาพปก ${row.original_filename}` : row.original_filename}
                  />
                </>
              ) : (
                <div className="media-placeholder">
                  อัปโหลดไม่สมบูรณ์<br />นำออกแล้วเลือกไฟล์นี้อีกครั้ง
                </div>
              )}
              <div className="media-meta">
                <b>{row.original_filename}</b>
                <span className="muted">{row.status === "ready" ? "พร้อมใช้" : "อัปโหลดไม่สมบูรณ์"}</span>
              </div>
              <div className="media-actions">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  เลื่อนขึ้น
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === media.length - 1}
                >
                  เลื่อนลง
                </button>
                <button type="button" onClick={() => archiveMedia(row.id)}>
                  นำออก
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
