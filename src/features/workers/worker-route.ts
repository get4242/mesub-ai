import { authorizeWorkerTrigger } from "./trigger-auth";

type WorkerSummary = { ai: number; lineWebhooks: number; lineNotifications: number; platformIntake: number };

export async function handleWorkerRequest(
  request: Request,
  dependencies: { configuredSecret: string; run(): Promise<WorkerSummary> },
): Promise<Response> {
  if (!authorizeWorkerTrigger(request.headers.get("authorization") ?? undefined, dependencies.configuredSecret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    return Response.json({ ok: true, summary: await dependencies.run() });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
