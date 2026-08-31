import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mesub AI", template: "%s | Mesub AI" },
  description: "แพลตฟอร์มอสังหาริมทรัพย์สำหรับ Agent และผู้ค้นหาทรัพย์",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
