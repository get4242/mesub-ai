import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAgentContext } from "@/lib/auth/require-agent-context";
import { AgentShell } from "@/components/agent-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAgentContext();
  } catch {
    redirect("/login");
  }
  return <AgentShell>{children}</AgentShell>;
}
