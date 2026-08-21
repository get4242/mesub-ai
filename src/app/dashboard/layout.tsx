import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions";
import { requireAgentContext } from "@/lib/auth/require-agent-context";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  try { await requireAgentContext(); } catch { redirect("/login"); }
  return <div className="dashboard"><nav aria-label="เมนู Agent"><Link href="/dashboard">ภาพรวม</Link><Link href="/dashboard/profile">โปรไฟล์</Link><Link href="/dashboard/properties">ทรัพย์</Link><form action={logoutAction}><button>ออกจากระบบ</button></form></nav><main>{children}</main></div>;
}
