"use client";

import { useMemo, useState } from "react";
import { intakeSubmitState } from "./ui-state";

type IntakeSubmit = (
  input: Record<string, unknown>,
) => Promise<{ ok: boolean }>;

export function AiIntakePanel({
  media,
  submit,
}: {
  media: Array<{ id: string; original_filename: string }>;
  submit: IntakeSubmit;
}) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const state = useMemo(
    () => intakeSubmitState(text, selected.length),
    [text, selected],
  );
  return (
    <section className="card">
      <span className="eyebrow">ผู้ช่วยจัดข้อมูลทรัพย์</span>
      <h2>เล่าข้อมูลทรัพย์ให้ AI ช่วยจัดระเบียบ</h2>
      <p className="muted">พิมพ์เหมือนคุยกับผู้ช่วย ไม่ต้องใช้คำศัพท์เฉพาะ</p>
      <label className="field" htmlFor="aiText">
        <span>ข้อมูลที่อยากให้ AI ช่วย</span>
        <textarea
          id="aiText"
          value={text}
          maxLength={12000}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <h3>เลือกรูปภาพประกอบ</h3>
      <div className="list">
        {media.map((item) => (
          <label className="list-item" key={item.id}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() =>
                setSelected((value) =>
                  value.includes(item.id)
                    ? value.filter((id) => id !== item.id)
                    : [...value, item.id],
                )
              }
            />{" "}
            {item.original_filename}
          </label>
        ))}
      </div>
      <p className="hint">{state.message}</p>
      <button
        disabled={state.disabled}
        onClick={async () => {
          setMessage("กำลังส่งข้อมูลให้ AI…");
          const result = await submit({
            agentText: text,
            mediaIds: selected,
            tasks: ["extraction"],
            idempotencyKey: crypto.randomUUID(),
          });
          setMessage(
            result.ok
              ? "รับข้อมูลแล้ว กำลังช่วยจัดข้อมูล"
              : "ส่งข้อมูลไม่สำเร็จ",
          );
        }}
      >
        ✦ ให้ AI ช่วยจัดข้อมูล
      </button>
      <p className="status-message" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
