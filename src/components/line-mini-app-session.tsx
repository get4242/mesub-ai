"use client";

import Script from "next/script";
import { useState } from "react";
import type { LiffApi } from "./line-account-card";

declare global { interface Window { liff?: LiffApi } }

function messageFor(code: string | undefined) {
  if (code === "LINE_ACCOUNT_NOT_LINKED") return "บัญชี LINE นี้ยังไม่เชื่อมกับ Mesub AI กรุณาเข้าสู่ระบบ Mesub AI แล้วเชื่อมต่อ LINE ที่หน้าโปรไฟล์ก่อน";
  if (code === "LINE_UNAVAILABLE") return "LINE ยังยืนยันตัวตนไม่สำเร็จ กรุณาลองอีกครั้ง";
  return "ไม่สามารถเปิด session จาก LINE ได้ กรุณาลองใหม่อีกครั้ง";
}

export function LineMiniAppSession({ liffId, returnTo }: { liffId: string | null; returnTo: string }) {
  const [message, setMessage] = useState("กำลังเตรียมการแชร์ผ่าน LINE…");

  async function start() {
    if (!liffId || !window.liff) {
      setMessage("ยังไม่ได้ตั้งค่า LINE MINI App สำหรับระบบนี้");
      return;
    }
    try {
      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return;
      }
      const idToken = window.liff.getIDToken();
      if (!idToken) {
        setMessage("กรุณาเข้าสู่ระบบ LINE อีกครั้ง");
        return;
      }
      const response = await fetch("/api/line/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, returnTo }),
      });
      const result = await response.json() as { ok?: boolean; code?: string; returnTo?: string };
      if (!response.ok || !result.ok) {
        setMessage(messageFor(result.code));
        return;
      }
      window.location.replace(result.returnTo ?? returnTo);
    } catch {
      setMessage("ไม่สามารถเปิด LINE MINI App ได้ กรุณาปิดแล้วลองกดแชร์อีกครั้ง");
    }
  }

  return (
    <main className="line-session-shell">
      <section className="line-session-card">
        <span className="eyebrow">MESUB AI · LINE MINI APP</span>
        <h1>กำลังเปิดการแชร์ Flex</h1>
        <p role="status">{message}</p>
        <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="afterInteractive" onLoad={start} />
        {message.includes("เชื่อม") ? <a className="button" href="/login?next=/dashboard/profile">เข้าสู่ระบบเพื่อเชื่อมต่อ LINE</a> : null}
      </section>
    </main>
  );
}
