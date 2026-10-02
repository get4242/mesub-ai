"use client";

import Link from "next/link";

export default function PropertyAiError({ reset }: { reset: () => void }) {
  return (
    <main className="agent-content">
      <section className="empty-state">
        <h1>ยังเปิดผู้ช่วย AI ไม่ได้</h1>
        <p>โปรดลองอีกครั้ง หรือตรวจข้อมูลทรัพย์และรูปภาพก่อนกลับมาใช้ AI</p>
        <div className="actions">
          <button onClick={reset}>ลองใหม่</button>
          <Link className="button-secondary" href="/dashboard/properties">
            กลับไปทรัพย์ของฉัน
          </Link>
        </div>
      </section>
    </main>
  );
}
