import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions";
import { AGENT_NAVIGATION } from "@/features/ui/design-contract";
import { Brand } from "./public-shell";

function NavIcon({ icon }: { icon: (typeof AGENT_NAVIGATION)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "home") return <svg viewBox="0 0 24 24" aria-hidden {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /><path d="M9 21v-7h6v7" /></svg>;
  if (icon === "properties") return <svg viewBox="0 0 24 24" aria-hidden {...common}><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6M9 10h.01M15 10h.01" /></svg>;
  if (icon === "leads") return <svg viewBox="0 0 24 24" aria-hidden {...common}><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 8M21 21v-2a6 6 0 0 0-3-5.2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
}

export function AgentShell({ children }: { children: ReactNode }) {
  return (
    <div className="agent-layout">
      <aside className="agent-sidebar">
        <Brand />
        <Link className="button sidebar-add" href="/dashboard/properties/new">
          + เพิ่มทรัพย์
        </Link>
        <nav aria-label="เมนู Agent">
          {AGENT_NAVIGATION.map((item) => (
            <Link href={item.href} key={item.href}>
              <i aria-hidden><NavIcon icon={item.icon} /></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <b>แผนฟรี</b>
            <span>สูงสุด 3 ทรัพย์ที่เผยแพร่</span>
          </div>
          <Link className="text-link" href="/">
            ดูเว็บไซต์สาธารณะ ↗
          </Link>
          <form action={logoutAction}>
            <button className="button-secondary">ออกจากระบบ</button>
          </form>
        </div>
      </aside>
      <div className="agent-main">{children}</div>
    </div>
  );
}
