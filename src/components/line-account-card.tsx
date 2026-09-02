"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LiffApi = {
  init(input: { liffId: string }): Promise<void>;
  isInClient(): boolean;
  isLoggedIn(): boolean;
  login(input?: { redirectUri?: string }): void;
  getIDToken(): string | null;
};

declare global { interface Window { liff?: LiffApi } }

export function LineAccountCard({ liffId, linked, notificationsEnabled }: { liffId: string | null; linked: boolean; notificationsEnabled: boolean }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function initialize() {
    if (!liffId || !window.liff) return;
    try { await window.liff.init({ liffId }); setReady(true); }
    catch { setMessage("ไม่สามารถเปิดการเชื่อมต่อ LINE ได้ในขณะนี้"); }
  }

  async function link() {
    if (!window.liff || !liffId) return setMessage("กรุณาเปิดหน้านี้ผ่าน LINE MINI App");
    if (!window.liff.isLoggedIn()) return window.liff.login({ redirectUri: window.location.href });
    const idToken = window.liff.getIDToken();
    if (!idToken) return setMessage("กรุณาเข้าสู่ระบบ LINE อีกครั้ง");
    setBusy(true);
    try {
      const challengeResponse = await fetch("/api/line/auth/challenge", { method: "POST" });
      const challengeBody = await challengeResponse.json() as { challenge?: string; code?: string };
      if (!challengeResponse.ok || !challengeBody.challenge) throw new Error(challengeBody.code);
      const response = await fetch("/api/line/auth/link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, challenge: challengeBody.challenge, consent: true }),
      });
      if (!response.ok) throw new Error("LINK_FAILED");
      window.location.reload();
    } catch {
      setMessage("เชื่อมต่อไม่สำเร็จ กรุณาเข้าสู่ระบบ Mesub AI ใหม่แล้วลองอีกครั้ง");
    } finally { setBusy(false); }
  }

  async function unlink() {
    setBusy(true);
    const response = await fetch("/api/line/auth/unlink", { method: "POST" });
    if (response.ok) router.push("/login");
    else { setMessage("ยกเลิกการเชื่อมต่อไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่"); setBusy(false); }
  }

  async function setNotificationConsent(enabled: boolean) {
    setBusy(true);
    const response = await fetch("/api/line/notifications/consent", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }),
    });
    if (response.ok) router.refresh();
    else setMessage("บันทึกการตั้งค่าแจ้งเตือนไม่สำเร็จ");
    setBusy(false);
  }

  return (
    <section className="form-section line-account-card">
      {liffId ? <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="lazyOnload" onLoad={initialize} /> : null}
      <div>
        <span className="eyebrow">LINE MINI App</span>
        <h2>บัญชี LINE</h2>
        <p>{linked ? "เชื่อมต่อแล้ว คุณเปิด Mesub AI จาก LINE ได้" : "เชื่อมต่อแบบยืนยันตัวตน เพื่อเปิด Dashboard จาก LINE"}</p>
        <p className="muted">Mesub AI จะไม่เชื่อมบัญชีจากชื่อ อีเมล หรือ LINE user ID ที่ส่งจากหน้าเว็บ</p>
      </div>
      {linked ? (
        <div className="line-account-actions">
          <button className="button" type="button" disabled={busy} onClick={() => setNotificationConsent(!notificationsEnabled)}>
            {notificationsEnabled ? "ปิดการแจ้งเตือน LINE" : "เปิดการแจ้งเตือน LINE"}
          </button>
          <button className="button-secondary" type="button" disabled={busy} onClick={unlink}>ยกเลิกการเชื่อมต่อ</button>
        </div>
      ) : (
        <button className="button" type="button" disabled={busy || !liffId} aria-busy={busy || (!ready && Boolean(liffId))} onClick={link}>
          {busy ? "กำลังตรวจสอบ…" : "เชื่อมต่อ LINE"}
        </button>
      )}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
