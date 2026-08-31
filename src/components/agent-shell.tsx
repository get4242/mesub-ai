import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions";
import { AGENT_NAVIGATION } from "@/features/ui/design-contract";
import { Brand } from "./public-shell";

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
              <i aria-hidden>{item.icon}</i>
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
