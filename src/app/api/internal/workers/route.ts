import { parseRuntimeEnvironment } from "@/config/runtime-environment";
import { createAdminClient } from "@/lib/supabase/admin";
import { runWorkerCycle, type WorkerAdmin } from "@/features/workers/runtime";
import { handleWorkerRequest } from "@/features/workers/worker-route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: Request) {
  let environment: ReturnType<typeof parseRuntimeEnvironment>;
  try {
    environment = parseRuntimeEnvironment(process.env);
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
  return handleWorkerRequest(request, {
    configuredSecret: environment.workerTriggerSecret,
    run: () => runWorkerCycle(createAdminClient() as unknown as WorkerAdmin, environment),
  });
}

export const GET = handle;
export const POST = handle;
