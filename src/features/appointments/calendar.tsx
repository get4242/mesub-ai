"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveAppointment, changeAppointment } from "./actions";
import { appointmentStatus, bangkokDate, bangkokDateTime, bangkokLocalToIso, calendarDays, type Appointment } from "./domain";

export function AppointmentCalendar({ month, appointments, properties }: {
  month: string; appointments: Appointment[]; properties: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [day, setDay] = useState(`${month}-01`);
  const [view, setView] = useState<"month" | "day">("month");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [requestKey, setRequestKey] = useState<string | null>(null);
  const days = calendarDays(month);
  const selected = day.startsWith(month) ? day : `${month}-01`;
  const shift = (amount: number) => {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    return `/dashboard/appointments?month=${date.toISOString().slice(0, 7)}`;
  };
  function run(task: () => Promise<{ ok: boolean; message: string }>, created = false) {
    startTransition(async () => {
      try {
        const result = await task();
        setMessage(result.message);
        if (result.ok) { if (created) setRequestKey(null); router.refresh(); }
      } catch { setMessage("บันทึกไม่สำเร็จ กรุณาลองใหม่"); }
    });
  }
  return <>
    <section className="card" aria-label="ปฏิทิน">
      <nav style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Link href={shift(-1)}>เดือนก่อน</Link><strong>{month}</strong><Link href={shift(1)}>เดือนถัดไป</Link>
        <button type="button" onClick={() => setView("month")} aria-pressed={view === "month"}>เดือน</button>
        <button type="button" onClick={() => setView("day")} aria-pressed={view === "day"}>วัน</button>
        <label>วันที่ <input type="date" value={selected} onChange={e => {
          setDay(e.target.value); if (e.target.value && !e.target.value.startsWith(month)) router.push(`/dashboard/appointments?month=${e.target.value.slice(0, 7)}`);
        }} /></label>
      </nav>
      {view === "month" && <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 16 }}>
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(label => <strong key={label} style={{ textAlign: "center" }}>{label}</strong>)}
        {days.map(date => {
          const count = appointments.filter(a => bangkokDate(a.starts_at) === date && a.status !== "cancelled").length;
          return <button key={date} type="button" aria-pressed={selected === date}
            aria-label={`${date} ${count} นัด`} style={{ minHeight: 64, opacity: date.startsWith(month) ? 1 : .5 }}
            onClick={() => { setDay(date); setView("day"); if (!date.startsWith(month)) router.push(`/dashboard/appointments?month=${date.slice(0, 7)}`); }}>
            {Number(date.slice(-2))}{count > 0 && <small style={{ display: "block" }}>{count} นัด</small>}
          </button>;
        })}
      </div>}
    </section>
    <p role="status" aria-live="polite">{message}</p>
    <section className="card"><h2>นัดวันที่ {selected}</h2>
      {!appointments.some(a => bangkokDate(a.starts_at) === selected) && <p>ไม่มีนัดหมายวันนี้</p>}
      {appointments.filter(a => bangkokDate(a.starts_at) === selected).map(item => <article key={item.id} style={{ padding: "16px 0", borderBottom: "1px solid #ddd" }}>
        <h3>{item.customer_name} · {appointmentStatus[item.status]}</h3>
        <p>{bangkokDateTime(item.starts_at)} – {bangkokDateTime(item.ends_at)}</p>
        <p><Link href={`/dashboard/properties/${item.property_id}/edit`}>{properties.find(p => p.id === item.property_id)?.title ?? "ดูทรัพย์"}</Link></p>
        <p>{item.customer_phone} {item.customer_email}</p><p>{item.notes}</p>
        {item.status !== "cancelled" && <>
          {item.status === "requested" && <button disabled={pending} onClick={() => run(() => changeAppointment({ id: item.id, version: item.version, action: "confirm" }))}>ยืนยันนัด</button>}
          <details><summary>เลื่อนนัด / ยกเลิกนัด</summary>
            <form onSubmit={event => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              try { const startsAt = bangkokLocalToIso(String(form.get("start"))); const endsAt = bangkokLocalToIso(String(form.get("end")));
                run(() => changeAppointment({ id: item.id, version: item.version, action: "reschedule", startsAt, endsAt }));
              } catch { setMessage("กรุณาระบุเวลาให้ถูกต้อง"); }
            }}>
              <label>เริ่ม <input required type="datetime-local" name="start" /></label>
              <label>สิ้นสุด <input required type="datetime-local" name="end" /></label>
              <button disabled={pending}>บันทึกเวลาใหม่</button>
            </form>
            <button disabled={pending} onClick={() => { if (window.confirm("ยกเลิกนัดหมายนี้ใช่หรือไม่?")) run(() => changeAppointment({ id: item.id, version: item.version, action: "cancel" })); }}>ยกเลิกนัดนี้</button>
          </details>
        </>}
      </article>)}
    </section>
    <section className="card"><h2>สร้างนัดหมาย</h2>
      <form onSubmit={event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        try {
          const key = requestKey ?? crypto.randomUUID(); setRequestKey(key);
          const input = { propertyId: String(form.get("property")), customerName: String(form.get("name")),
            customerPhone: String(form.get("phone")) || undefined, customerEmail: String(form.get("email")) || undefined,
            startsAt: bangkokLocalToIso(String(form.get("start"))), endsAt: bangkokLocalToIso(String(form.get("end"))),
            notes: String(form.get("notes")), idempotencyKey: key };
          run(() => saveAppointment(input), true);
        } catch { setMessage("กรุณาระบุเวลาให้ถูกต้อง"); }
      }} style={{ display: "grid", gap: 12, maxWidth: 640 }}>
        <label>ทรัพย์ <select name="property" required><option value="">เลือกทรัพย์</option>{properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>ชื่อลูกค้า <input name="name" required maxLength={120} /></label>
        <label>โทรศัพท์ <input name="phone" type="tel" maxLength={40} /></label>
        <label>อีเมล <input name="email" type="email" maxLength={254} /></label>
        <label>เริ่ม (เวลาประเทศไทย) <input name="start" type="datetime-local" required /></label>
        <label>สิ้นสุด <input name="end" type="datetime-local" required /></label>
        <label>หมายเหตุ <textarea name="notes" maxLength={2000} /></label>
        <button disabled={pending || !properties.length}>{pending ? "กำลังบันทึก…" : "สร้างนัดหมาย"}</button>
      </form>
    </section>
  </>;
}
