import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AgentContextError, requireAgentContext } from "@/lib/auth/require-agent-context";
import { AgentShell } from "@/components/agent-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAgentContext();
  } catch (error) {
    // Do not turn an unavailable profile, database failure, or any other
    // dashboard error into a misleading login redirect. Only a missing
    // session belongs on the login page.
    if (error instanceof AgentContextError && error.code === "UNAUTHENTICATED") {
      redirect("/login?next=/dashboard");
    }

    throw error;
  }
  return <AgentShell>{children}</AgentShell>;
}
