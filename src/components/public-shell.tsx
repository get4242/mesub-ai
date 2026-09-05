import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <Image className="brand-logo" src="/brand/mesub-ai-logo.png" alt="Mesub AI" width={44} height={44} sizes="44px" />
      <span>
        Mesub <b>AI</b>
      </span>
    </Link>
  );
}
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav className="public-nav" aria-label="เมนูหลัก">
          <Link href="/">หน้าหลัก</Link>
          <Link href="/properties">ค้นหาทรัพย์</Link>
          <Link href="/dashboard">สำหรับ Agent</Link>
        </nav>
        <Link className="button-secondary" href="/login">
          เข้าสู่ระบบ Agent
        </Link>
      </header>
      {children}
      <footer className="public-footer">
        <Brand />
        <span>ค้นหาทรัพย์ที่ผ่านการยืนยันจาก Agent</span>
        <span>© Mesub AI</span>
      </footer>
    </div>
  );
}
