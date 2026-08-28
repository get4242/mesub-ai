"use client";
import { useState } from "react";
import { retryAiRunAction } from "./actions";
import { runStatusCopy } from "./ui-state";
export function AiRunStatus({
  runId,
  state,
  retryable,
}: {
  runId: string;
  state: string;
  retryable: boolean;
}) {
  const [message, setMessage] = useState("");
  return (
    <section aria-live="polite">
      <h2>สถานะงาน AI</h2>
      <p>{runStatusCopy(state)}</p>
      {retryable ? (
        <button
          onClick={async () => {
            const result = await retryAiRunAction({ runId });
            setMessage(result.ok ? "ส่งงานใหม่แล้ว" : "ไม่สามารถลองใหม่ได้");
          }}
        >
          ลองใหม่
        </button>
      ) : null}
      <p>{message}</p>
    </section>
  );
}
