import Link from "next/link";
export default function DashboardPage() { return <section><h1>Agent Dashboard</h1><p>จัดการโปรไฟล์และร่างข้อมูลทรัพย์ของคุณ</p><Link className="button" href="/dashboard/properties/new">เพิ่มทรัพย์</Link></section>; }
