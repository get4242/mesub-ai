export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "mesub-ai",
      phase: "foundation"
    },
    {
      headers: { "Cache-Control": "no-store" }
    }
  );
}
