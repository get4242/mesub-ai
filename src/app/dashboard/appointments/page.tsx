import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { AppointmentCalendar } from "@/features/appointments/calendar";
import { bangkokDate, calendarDays, type Appointment } from "@/features/appointments/domain";

export default async function AppointmentsPage({ searchParams }: {
  searchParams: Promise<{ month?: string }>;
}) {
  const context = await requireAgentContext();
  const params = await searchParams;
  const month = /^20\d{2}-(0[1-9]|1[0-2])$/.test(params.month ?? "")
    ? params.month! : bangkokDate(new Date()).slice(0, 7);
  const days = calendarDays(month);
  const end = new Date(`${days[41]}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const client = await createClient();
  const [appointments, properties] = await Promise.all([
    client.from("appointments")
      .select("id,property_id,customer_name,customer_phone,customer_email,starts_at,ends_at,status,notes,version")
      .eq("tenant_id", context.tenantId).gte("starts_at", `${days[0]}T00:00:00+07:00`)
      .lt("starts_at", end.toISOString()).order("starts_at").limit(1000),
    client.from("properties").select("id,title").eq("tenant_id", context.tenantId)
      .neq("status", "archived").order("title").limit(500),
  ]);
  return <>
    <header className="agent-topbar"><h1>นัดหมาย</h1></header>
    <main className="agent-content">
      <div className="page-head"><h1>ปฏิทินนัดหมาย</h1><p>เวลาประเทศไทย · แจ้งเตือนทาง LINE ก่อนนัดที่ยืนยันแล้ว 1 ชั่วโมง</p></div>
      {appointments.error || properties.error
        ? <p role="alert">โหลดข้อมูลนัดหมายไม่สำเร็จ กรุณาลองใหม่</p>
        : <AppointmentCalendar month={month} appointments={(appointments.data ?? []) as Appointment[]}
            properties={properties.data ?? []} />}
    </main>
  </>;
}
