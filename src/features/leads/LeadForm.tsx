"use client";

import { useState, type FormEvent } from "react";

export function LeadForm({ propertyId }: { propertyId?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "accepted" | "error" | "rate_limited">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: propertyId ? "property" : "general", ...(propertyId ? { propertyId } : {}), name: form.get("name"), email: form.get("email") || undefined, phone: form.get("phone") || undefined, message: form.get("message"), consent: form.get("consent") === "on", consentVersion: "privacy-v1", idempotencyKey: crypto.randomUUID() }) });
    if (response.status === 202) { setStatus("accepted"); event.currentTarget.reset(); }
    else if (response.status === 429) setStatus("rate_limited");
    else setStatus("error");
  }
  return <form className="panel" onSubmit={submit}><label>ชื่อ<input name="name" required maxLength={120}/></label><label>อีเมล<input name="email" type="email" maxLength={254}/></label><label>โทรศัพท์<input name="phone" maxLength={40}/></label><label>ข้อความ<textarea name="message" required maxLength={2000}/></label><label><input name="consent" type="checkbox" required/> ยินยอมให้ใช้ข้อมูลเพื่อติดต่อกลับตามนโยบายความเป็นส่วนตัว</label><button disabled={status === "sending"} type="submit">{status === "sending" ? "กำลังส่ง…" : "ส่งข้อมูลติดต่อ"}</button><p aria-live="polite">{status === "accepted" ? "รับข้อมูลแล้ว เราจะส่งต่อให้ผู้รับผิดชอบ" : status === "rate_limited" ? "ส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง" : status === "error" ? "ส่งไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่" : ""}</p></form>;
}
