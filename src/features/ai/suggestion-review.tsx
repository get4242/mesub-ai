"use client";
import { useState } from "react";
import { acceptAiSuggestionAction, rejectAiSuggestionAction } from "./actions";
import { suggestionGroups } from "./ui-state";
type Suggestion = {
  id: string;
  fieldKey: string;
  value: unknown;
  confidence: number | null;
  sourceIds: string[];
  decision?: string;
};
export function SuggestionReview({
  suggestions,
  propertyVersion,
}: {
  suggestions: Suggestion[];
  propertyVersion: number;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const groups = suggestionGroups(suggestions);
  async function decide(item: Suggestion, kind: "accept" | "reject") {
    setPending(item.id);
    const result =
      kind === "accept"
        ? await acceptAiSuggestionAction({
            suggestionId: item.id,
            expectedPropertyVersion: propertyVersion,
          })
        : await rejectAiSuggestionAction({ suggestionId: item.id });
    setMessage(
      result.ok
        ? "บันทึกการตัดสินใจแล้ว"
        : result.code === "VERSION_CONFLICT"
          ? "ข้อมูลทรัพย์มีเวอร์ชันใหม่กว่า กรุณาโหลดข้อมูลล่าสุดและตรวจอีกครั้ง"
          : "ไม่สามารถบันทึกได้",
    );
    setPending(null);
  }
  return (
    <section>
      <h2>ตรวจคำแนะนำ</h2>
      {(
        [
          ["ข้อมูลสำคัญ", groups.critical],
          ["เนื้อหา", groups.content],
        ] as const
      ).map(([title, items]) => (
        <div key={title}>
          <h3>{title}</h3>
          {items.map((s) => (
            <article key={s.id}>
              <strong>{s.fieldKey}</strong>
              <p>
                {s.value === null ? "AI ไม่พบหลักฐานเพียงพอ" : String(s.value)}
              </p>
              <details>
                <summary>แหล่งข้อมูล</summary>
                {s.sourceIds.length ? s.sourceIds.join(", ") : "ไม่มี"}
              </details>
              {!s.decision || s.decision === "pending" ? (
                <div>
                  <button
                    disabled={pending === s.id}
                    onClick={() => void decide(s, "accept")}
                  >
                    ยอมรับ
                  </button>
                  <button
                    disabled={pending === s.id}
                    onClick={() => void decide(s, "reject")}
                  >
                    ปฏิเสธ
                  </button>
                </div>
              ) : (
                <p>{s.decision}</p>
              )}
            </article>
          ))}
        </div>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
