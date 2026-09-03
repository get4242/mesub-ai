import { parseRuntimeEnvironment } from "@/config/runtime-environment";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeWorkerTrigger } from "@/features/workers/trigger-auth";
import { runWorkerCycle, type WorkerAdmin } from "@/features/workers/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let environment: ReturnType<typeof parseRuntimeEnvironment>;
  try {
    environment = parseRuntimeEnvironment(process.env);
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
  if (!authorizeWorkerTrigger(request.headers.get("authorization") ?? undefined, environment.workerTriggerSecret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const summary = await runWorkerCycle(createAdminClient() as unknown as WorkerAdmin, environment);
    return Response.json({ ok: true, summary });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
