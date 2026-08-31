import { notFound } from "next/navigation";
import {
  getAgentProperty,
  listPropertyMedia,
} from "@/features/properties/queries";
import { AiIntakePanel } from "@/features/ai/ai-intake-panel";
import { AiRunStatus } from "@/features/ai/ai-run-status";
import { SuggestionReview } from "@/features/ai/suggestion-review";
import { ConfirmationPanel } from "@/features/ai/confirmation-panel";
import {
  confirmPropertyAction,
  startAiIntakeAction,
} from "@/features/ai/actions";
import {
  getAiRunsForProperty,
  listPropertySuggestions,
} from "@/features/ai/queries";
export default async function PropertyAiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [property, media, runs, suggestions] = await Promise.all([
    getAgentProperty(id),
    listPropertyMedia(id),
    getAiRunsForProperty(id),
    listPropertySuggestions(id),
  ]);
  if (!property) notFound();
  async function submit(input: Record<string, unknown>) {
    "use server";
    return startAiIntakeAction({
      ...input,
      propertyId: id,
      expectedVersion: property.version,
    });
  }
  async function confirm() {
    "use server";
    await confirmPropertyAction({
      propertyId: id,
      expectedVersion: property.version,
      expectedCriticalVersion: property.critical_version,
      reviewRunId: runs[0]?.id ?? null,
    });
  }
  return (
    <>
      <header className="agent-topbar">
        <h1>AI ช่วยจัดข้อมูลทรัพย์</h1>
      </header>
      <main className="agent-content">
        <div className="steps">
          <span className="active">1 · ส่งข้อมูลให้ AI</span>
          <span>2 · ตรวจคำแนะนำ</span>
          <span>3 · ยืนยันข้อมูล</span>
        </div>
        <div className="ai-workspace">
          <AiIntakePanel
            media={media.filter((row) => row.status === "ready")}
            submit={submit}
          />
          {runs[0] ? (
            <AiRunStatus
              runId={runs[0].id}
              state={runs[0].state}
              retryable={runs[0].retryable}
            />
          ) : null}
          <SuggestionReview
            propertyVersion={property.version}
            suggestions={suggestions.map((row) => ({
              id: row.id,
              fieldKey: row.field_key,
              value: row.proposed_value,
              confidence: row.confidence,
              decision: row.decision,
              sourceIds: (row.ai_suggestion_sources ?? []).map(
                (source: { source_id: string }) => source.source_id,
              ),
            }))}
          />
          <ConfirmationPanel
            blocked={suggestions.some(
              (row) =>
                row.validation_status === "invalid" &&
                row.decision === "pending",
            )}
            confirm={confirm}
          />
        </div>
      </main>
    </>
  );
}
